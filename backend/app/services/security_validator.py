import os
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import HTTPException
from pydantic import BaseModel

# Maximum readable file size: 5MB
MAX_READABLE_FILE_SIZE_BYTES = 5 * 1024 * 1024

class ThreatLog(BaseModel):
    id: str
    timestamp: str
    rule: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM"
    reason: str
    target: str
    action: str = "BLOCKED"
    details: Optional[str] = None

# In-memory security audit log (initialized empty; real runtime threats are logged dynamically)
THREAT_LOGS: List[ThreatLog] = []

def log_threat(rule: str, severity: str, reason: str, target: str, details: Optional[str] = None) -> ThreatLog:
    entry = ThreatLog(
        id=f"threat-{int(time.time()*1000)}",
        timestamp=datetime.now(timezone.utc).strftime("%H:%M:%S"),
        rule=rule,
        severity=severity,
        reason=reason,
        target=target,
        action="BLOCKED",
        details=details
    )
    THREAT_LOGS.insert(0, entry)
    # keep last 50
    if len(THREAT_LOGS) > 50:
        THREAT_LOGS.pop()
    return entry

def get_guard_status() -> Dict[str, Any]:
    return {
        "status": "ACTIVE",
        "threats_blocked": len(THREAT_LOGS),
        "protections": {
            "path_protection": {"name": "Path Protection", "status": "ACTIVE", "description": "Strict path sandboxing"},
            "command_safety": {"name": "Command Safety", "status": "ACTIVE", "description": "Whitelist execution policy"},
            "protected_files": {"name": "Protected Files", "status": "ACTIVE", "description": "Binary & dotfile isolation"},
            "diff_validation": {"name": "Diff Validation", "status": "ACTIVE", "description": "Pre-execution hash check"},
            "workspace_boundary": {"name": "Workspace Boundary", "status": "ACTIVE", "description": "CWE-22 Traversal prevention"}
        },
        "recent_threats": [t.model_dump() for t in THREAT_LOGS[:10]]
    }

def validate_project_path(raw_path: str) -> Path:
    """
    Validates that the provided raw path exists, is a directory,
    and is not a prohibited or dangerous system path.
    """
    if not raw_path or not raw_path.strip():
        log_threat(
            rule="Protected System Directory Protection",
            severity="MEDIUM",
            reason="Project path cannot be empty.",
            target="<empty>"
        )
        raise HTTPException(status_code=400, detail={"error": "INVALID_PATH", "message": "Project path cannot be empty."})

    try:
        resolved_path = Path(raw_path.strip()).resolve()
    except Exception as e:
        log_threat(
            rule="Workspace Boundary Enforcement",
            severity="HIGH",
            reason=f"Could not resolve path: {str(e)}",
            target=raw_path
        )
        raise HTTPException(status_code=400, detail={"error": "INVALID_PATH", "message": f"Could not resolve path: {str(e)}"})

    if not resolved_path.exists():
        raise HTTPException(status_code=404, detail={"error": "PATH_NOT_FOUND", "message": f"Directory does not exist: {resolved_path}"})

    if not resolved_path.is_dir():
        raise HTTPException(status_code=400, detail={"error": "NOT_A_DIRECTORY", "message": f"Path is not a directory: {resolved_path}"})

    # Prohibit root drive roots or dangerous Windows directories
    parts = resolved_path.parts
    if len(parts) <= 1:
        log_threat(
            rule="Protected System Directory Protection",
            severity="CRITICAL",
            reason="Cannot open root drive as a project.",
            target=str(resolved_path)
        )
        raise HTTPException(status_code=403, detail={"error": "FORBIDDEN_PATH", "message": "Cannot open root drive as a project."})

    # Check for Windows system directories
    lower_path = str(resolved_path).lower()
    system_dirs = ["c:\\windows", "c:\\program files", "c:\\program files (x86)", "c:\\system volume information"]
    for sys_dir in system_dirs:
        if lower_path == sys_dir or lower_path.startswith(sys_dir + "\\"):
            log_threat(
                rule="Protected System Directory Protection",
                severity="CRITICAL",
                reason=f"Cannot scan protected system directory: {resolved_path}",
                target=str(resolved_path)
            )
            raise HTTPException(status_code=403, detail={"error": "FORBIDDEN_PATH", "message": f"Cannot scan protected system directory: {resolved_path}"})

    return resolved_path

def validate_file_within_project(project_root_path: str, target_relative_or_abs_path: str) -> Path:
    """
    Ensures that a file being accessed is strictly contained within the project's root folder.
    Prevents path traversal attacks (e.g. `../../Windows/System32`).
    """
    project_root = Path(project_root_path).resolve()
    
    if os.path.isabs(target_relative_or_abs_path):
        target_path = Path(target_relative_or_abs_path).resolve()
    else:
        target_path = (project_root / target_relative_or_abs_path).resolve()

    try:
        # Check if project_root is an ancestor of target_path
        target_path.relative_to(project_root)
    except ValueError:
        log_threat(
            rule="Workspace Boundary Enforcement",
            severity="CRITICAL",
            reason="Attempted access outside project root boundary (Path Traversal).",
            target=str(target_relative_or_abs_path),
            details="NEXUS Guard intercepted and prevented unauthorized read/write."
        )
        raise HTTPException(
            status_code=403,
            detail={"error": "PATH_TRAVERSAL_DETECTED", "message": "Attempted to access a file outside of the project root."}
        )

    return target_path
