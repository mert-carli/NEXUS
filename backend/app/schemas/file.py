from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class FileResponse(BaseModel):
    id: str
    project_id: str
    relative_path: str
    filename: str
    extension: str
    language: str
    size_bytes: int
    lines_count: int
    file_hash: str
    is_binary: bool
    latest_scan_status: str
    last_modified_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FileContentResponse(BaseModel):
    id: str
    relative_path: str
    filename: str
    language: str
    size_bytes: int
    lines_count: int
    is_binary: bool
    content: Optional[str] = None
    file_hash: str
    error: Optional[str] = None
    message: Optional[str] = None

class FileTreeNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    id: Optional[str] = None
    language: Optional[str] = None
    size_bytes: Optional[int] = None
    lines_count: Optional[int] = None
    latest_scan_status: Optional[str] = None
    children: Optional[List["FileTreeNode"]] = None

FileTreeNode.model_rebuild()
