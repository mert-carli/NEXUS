import os
import hashlib
import time
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.file import ProjectFile
from app.models.scan import ScanEvent
from app.services.languages import (
    IGNORED_DIRECTORIES,
    IGNORED_FILES,
    detect_language,
    is_binary_file
)
from app.services.git_service import get_git_info

def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file efficiently."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def count_lines(file_path: Path) -> int:
    """Counts non-empty lines in a text file with robust UTF-8 decoding."""
    try:
        count = 0
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            for _ in f:
                count += 1
        return count
    except Exception:
        return 0

def scan_project_directory(project_path: Path) -> List[Dict[str, Any]]:
    """
    Recursively scans the directory, respecting ignore rules.
    Returns a list of raw discovered file descriptors.
    """
    discovered_files = []

    for root, dirs, files in os.walk(project_path):
        # Filter directories in-place to avoid descending into ignored folders
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRECTORIES and not d.startswith(".")]

        for file_name in files:
            if file_name in IGNORED_FILES or file_name.startswith("."):
                # Exception: keep important dotfiles like .gitignore, .env.example
                if file_name not in {".gitignore", ".editorconfig", ".env.example"}:
                    continue

            full_path = Path(root) / file_name
            try:
                rel_path = str(full_path.relative_to(project_path)).replace("\\", "/")
                stat = full_path.stat()
                size_bytes = stat.st_size
                mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)

                binary = is_binary_file(full_path)
                language, lang_binary = detect_language(full_path)
                is_bin = binary or lang_binary

                file_hash = compute_sha256(full_path)
                lines = 0 if is_bin else count_lines(full_path)

                discovered_files.append({
                    "relative_path": rel_path,
                    "filename": file_name,
                    "extension": full_path.suffix.lower(),
                    "language": language,
                    "size_bytes": size_bytes,
                    "lines_count": lines,
                    "file_hash": file_hash,
                    "is_binary": is_bin,
                    "last_modified_at": mtime
                })
            except Exception as e:
                # Silently skip files that cannot be read/stat'd (permissions, locked files)
                continue

    return discovered_files

def execute_incremental_scan(db: Session, project: Project) -> ScanEvent:
    """
    Performs full or incremental scan on a project and updates database.
    Accurately computes ADDED, MODIFIED, DELETED, UNMODIFIED counts.
    """
    start_time = time.time()
    project_root = Path(project.path)

    # 1. Discover current on-disk files
    on_disk_files = scan_project_directory(project_root)
    on_disk_map = {f["relative_path"]: f for f in on_disk_files}

    # 2. Query existing DB files
    existing_db_files = db.query(ProjectFile).filter(ProjectFile.project_id == project.id).all()
    existing_db_map = {f.relative_path: f for f in existing_db_files}

    added_count = 0
    modified_count = 0
    unmodified_count = 0
    deleted_count = 0

    language_counts: Dict[str, int] = {}
    total_lines = 0
    source_files_count = 0
    binary_files_count = 0

    # 3. Check on-disk files against DB
    for rel_path, disk_info in on_disk_map.items():
        lang = disk_info["language"]
        language_counts[lang] = language_counts.get(lang, 0) + 1
        total_lines += disk_info["lines_count"]

        if disk_info["is_binary"]:
            binary_files_count += 1
        else:
            source_files_count += 1

        if rel_path in existing_db_map:
            db_file = existing_db_map[rel_path]
            if db_file.file_hash == disk_info["file_hash"]:
                # Unmodified
                db_file.latest_scan_status = "UNMODIFIED"
                unmodified_count += 1
            else:
                # Modified
                db_file.file_hash = disk_info["file_hash"]
                db_file.size_bytes = disk_info["size_bytes"]
                db_file.lines_count = disk_info["lines_count"]
                db_file.last_modified_at = disk_info["last_modified_at"]
                db_file.latest_scan_status = "MODIFIED"
                modified_count += 1
        else:
            # Newly Added
            new_file = ProjectFile(
                project_id=project.id,
                relative_path=rel_path,
                filename=disk_info["filename"],
                extension=disk_info["extension"],
                language=disk_info["language"],
                size_bytes=disk_info["size_bytes"],
                lines_count=disk_info["lines_count"],
                file_hash=disk_info["file_hash"],
                is_binary=disk_info["is_binary"],
                latest_scan_status="ADDED",
                last_modified_at=disk_info["last_modified_at"]
            )
            db.add(new_file)
            added_count += 1

    # 4. Check for deleted files (in DB but not on disk)
    for rel_path, db_file in existing_db_map.items():
        if rel_path not in on_disk_map:
            deleted_count += 1
            db.delete(db_file)

    # 5. Git Status Refresh
    git_info = get_git_info(project_root)
    project.is_git_repo = git_info["is_git_repo"]
    project.git_branch = git_info["git_branch"]
    project.git_commit_hash = git_info["git_commit_hash"]
    project.git_commit_message = git_info["git_commit_message"]
    project.git_is_dirty = git_info["git_is_dirty"]
    project.git_modified_files_count = git_info["git_modified_files_count"]

    # 6. Update Project Aggregate Stats
    project.total_files = len(on_disk_files)
    project.source_files = source_files_count
    project.binary_files = binary_files_count
    project.total_lines = total_lines
    project.languages_json = json.dumps(language_counts)
    project.last_scanned_at = datetime.now(timezone.utc)

    # 7. Create Scan Event Record
    duration_ms = int((time.time() - start_time) * 1000)
    summary_text = f"+{added_count} added, ~{modified_count} modified, -{deleted_count} deleted, ={unmodified_count} unchanged."
    
    scan_event = ScanEvent(
        project_id=project.id,
        added_count=added_count,
        modified_count=modified_count,
        deleted_count=deleted_count,
        unmodified_count=unmodified_count,
        total_files=len(on_disk_files),
        duration_ms=duration_ms,
        summary=summary_text
    )
    db.add(scan_event)

    db.commit()
    db.refresh(project)
    db.refresh(scan_event)

    return scan_event
