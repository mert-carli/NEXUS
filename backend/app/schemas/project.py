from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, ConfigDict

class ProjectCreate(BaseModel):
    path: str

class ProjectUpdate(BaseModel):
    test_command: Optional[str] = None

class ScanEventResponse(BaseModel):
    id: str
    scanned_at: datetime
    added_count: int
    modified_count: int
    deleted_count: int
    unmodified_count: int
    total_files: int
    duration_ms: int
    summary: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProjectResponse(BaseModel):
    id: str
    name: str
    path: str
    created_at: datetime
    updated_at: datetime
    last_scanned_at: Optional[datetime] = None

    total_files: int
    source_files: int
    binary_files: int
    total_lines: int
    languages: Dict[str, int] = {}

    is_git_repo: bool
    git_branch: Optional[str] = None
    git_commit_hash: Optional[str] = None
    git_commit_message: Optional[str] = None
    git_is_dirty: bool
    git_modified_files_count: int

    latest_scan: Optional[ScanEventResponse] = None
    index_status: str = "NOT_INDEXED"
    test_command: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ProjectListItem(BaseModel):
    id: str
    name: str
    path: str
    total_files: int
    source_files: int
    total_lines: int
    last_scanned_at: Optional[datetime] = None
    git_branch: Optional[str] = None
    git_is_dirty: bool
    index_status: str = "NOT_INDEXED"
    test_command: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
