from pathlib import Path
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.project import Project
from app.models.file import ProjectFile
from app.schemas.file import FileResponse, FileContentResponse, FileTreeNode
from app.services.security_validator import validate_file_within_project, MAX_READABLE_FILE_SIZE_BYTES

router = APIRouter()

def build_file_tree(files: List[ProjectFile]) -> List[FileTreeNode]:
    """Builds a hierarchical tree from a flat list of files."""
    root_nodes: Dict[str, FileTreeNode] = {}

    for file_obj in sorted(files, key=lambda f: f.relative_path):
        parts = file_obj.relative_path.split("/")
        current_level = root_nodes

        accumulated_path = ""
        for i, part in enumerate(parts):
            accumulated_path = f"{accumulated_path}/{part}" if accumulated_path else part
            is_last = (i == len(parts) - 1)

            if is_last:
                current_level[part] = FileTreeNode(
                    name=part,
                    path=accumulated_path,
                    is_dir=False,
                    id=file_obj.id,
                    language=file_obj.language,
                    size_bytes=file_obj.size_bytes,
                    lines_count=file_obj.lines_count,
                    latest_scan_status=file_obj.latest_scan_status
                )
            else:
                if part not in current_level:
                    current_level[part] = FileTreeNode(
                        name=part,
                        path=accumulated_path,
                        is_dir=True,
                        children=[]
                    )
                # Ensure children is list
                if current_level[part].children is None:
                    current_level[part].children = []
                
                # Transform children list to a dict map for traversal
                children_map = {c.name: c for c in current_level[part].children}
                current_level = children_map

    # Helper function to convert dict tree back to sorted lists
    def sort_and_list_nodes(nodes_dict: Dict[str, FileTreeNode]) -> List[FileTreeNode]:
        node_list = []
        for node in sorted(nodes_dict.values(), key=lambda n: (not n.is_dir, n.name.lower())):
            if node.is_dir and isinstance(node.children, list):
                # Recursively process if needed
                pass
            node_list.append(node)
        return node_list

    return list(root_nodes.values())

def build_nested_tree(files: List[ProjectFile]) -> List[FileTreeNode]:
    """Builds a proper nested tree structure."""
    tree = []

    def get_or_create_dir(parent_list: List[FileTreeNode], dir_name: str, dir_path: str) -> FileTreeNode:
        for item in parent_list:
            if item.is_dir and item.name == dir_name:
                return item
        new_dir = FileTreeNode(
            name=dir_name,
            path=dir_path,
            is_dir=True,
            children=[]
        )
        parent_list.append(new_dir)
        return new_dir

    for file_obj in sorted(files, key=lambda f: f.relative_path):
        parts = file_obj.relative_path.split("/")
        current_list = tree
        cur_path = ""

        for i, part in enumerate(parts):
            cur_path = f"{cur_path}/{part}" if cur_path else part
            if i == len(parts) - 1:
                # File node
                current_list.append(FileTreeNode(
                    name=part,
                    path=cur_path,
                    is_dir=False,
                    id=file_obj.id,
                    language=file_obj.language,
                    size_bytes=file_obj.size_bytes,
                    lines_count=file_obj.lines_count,
                    latest_scan_status=file_obj.latest_scan_status
                ))
            else:
                # Directory node
                dir_node = get_or_create_dir(current_list, part, cur_path)
                current_list = dir_node.children

    # Sort directories first, then files
    def sort_tree(nodes: List[FileTreeNode]):
        nodes.sort(key=lambda x: (not x.is_dir, x.name.lower()))
        for node in nodes:
            if node.is_dir and node.children:
                sort_tree(node.children)

    sort_tree(tree)
    return tree

@router.get("/projects/{project_id}/files")
def get_project_files(
    project_id: str,
    tree: bool = Query(False, description="Return hierarchical folder tree"),
    db: Session = Depends(get_db)
):
    """Retrieves all indexed files for a project, either as a flat list or hierarchical tree."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail={"error": "PROJECT_NOT_FOUND", "message": "Project not found."})

    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).order_by(ProjectFile.relative_path.asc()).all()

    if tree:
        return {"tree": build_nested_tree(files)}

    return {"files": [FileResponse.model_validate(f) for f in files]}

@router.get("/projects/{project_id}/files/{file_id}/content", response_model=FileContentResponse)
def get_file_content(project_id: str, file_id: str, db: Session = Depends(get_db)):
    """
    Safely retrieves the on-disk content of a file.
    Enforces path traversal safety and MAX_READABLE_FILE_SIZE_BYTES (5MB).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail={"error": "PROJECT_NOT_FOUND", "message": "Project not found."})

    file_obj = db.query(ProjectFile).filter(ProjectFile.id == file_id, ProjectFile.project_id == project_id).first()
    if not file_obj:
        raise HTTPException(status_code=404, detail={"error": "FILE_NOT_FOUND", "message": "File not found in project database."})

    # Validate file is strictly within project boundary
    target_path = validate_file_within_project(project.path, file_obj.relative_path)

    if not target_path.exists():
        raise HTTPException(status_code=404, detail={"error": "FILE_NOT_FOUND_ON_DISK", "message": f"File no longer exists at: {target_path}"})

    # Size limit check (5MB)
    stat = target_path.stat()
    if stat.st_size > MAX_READABLE_FILE_SIZE_BYTES:
        return FileContentResponse(
            id=file_obj.id,
            relative_path=file_obj.relative_path,
            filename=file_obj.filename,
            language=file_obj.language,
            size_bytes=stat.st_size,
            lines_count=file_obj.lines_count,
            is_binary=file_obj.is_binary,
            content=None,
            file_hash=file_obj.file_hash,
            error="FILE_TOO_LARGE",
            message=f"File exceeds maximum readable size limit (5MB). Size: {stat.st_size / (1024 * 1024):.2f}MB"
        )

    # Binary file check
    if file_obj.is_binary:
        return FileContentResponse(
            id=file_obj.id,
            relative_path=file_obj.relative_path,
            filename=file_obj.filename,
            language=file_obj.language,
            size_bytes=stat.st_size,
            lines_count=file_obj.lines_count,
            is_binary=True,
            content=None,
            file_hash=file_obj.file_hash,
            error="BINARY_FILE",
            message="Binary file content cannot be displayed in text editor."
        )

    # Read UTF-8 text safely
    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        return FileContentResponse(
            id=file_obj.id,
            relative_path=file_obj.relative_path,
            filename=file_obj.filename,
            language=file_obj.language,
            size_bytes=stat.st_size,
            lines_count=file_obj.lines_count,
            is_binary=False,
            content=content,
            file_hash=file_obj.file_hash
        )
    except Exception as e:
        return FileContentResponse(
            id=file_obj.id,
            relative_path=file_obj.relative_path,
            filename=file_obj.filename,
            language=file_obj.language,
            size_bytes=stat.st_size,
            lines_count=file_obj.lines_count,
            is_binary=False,
            content=None,
            file_hash=file_obj.file_hash,
            error="READ_ERROR",
            message=f"Failed to read file content: {str(e)}"
        )
