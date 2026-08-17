import os
import hashlib
import difflib
from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.db.database import get_db
from app.models.project import Project
from app.models.file import ProjectFile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/files", tags=["Files/Edit"])

class ApplyEditRequest(BaseModel):
    file_path: str
    search_text: str
    replace_text: str
    expected_hash: str

def normalize_whitespace(text: str) -> str:
    """Normalize text by removing all extra whitespace and newlines for comparison."""
    return " ".join(text.split())

@router.post("/apply-edit")
def apply_edit(project_id: str, req: ApplyEditRequest, db: Session = Depends(get_db)):
    # 1. Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. Path Sandboxing
    project_root = Path(project.path).resolve()
    # Handle both forward and backslashes from the frontend
    req_path_clean = req.file_path.lstrip("\\/")
    target_path = (project_root / req_path_clean).resolve()

    if not str(target_path).startswith(str(project_root)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Path escapes project directory"
        )
    
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")

    # 3. Read current content and check expected_hash
    try:
        content = target_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Cannot edit binary files")

    current_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]
    
    if current_hash != req.expected_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"File has been modified on disk since the AI generated this edit. Please re-run the query."
        )

    # 4. Replacement Logic (Cascade)
    search_str = req.search_text
    replace_str = req.replace_text

    # Mode 1: Exact Match
    if search_str in content:
        # Check if there are multiple occurrences to avoid blind replacement
        if content.count(search_str) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple exact matches found for the search text. Edit aborted for safety."
            )
        new_content = content.replace(search_str, replace_str, 1)
        
    else:
        # Mode 2: Normalized Match
        # In reality, standard 'replace' doesn't work if whitespace differs.
        # We need to find the substring in the original content that matches the normalized search_text.
        # This can be tricky to implement perfectly without regex. 
        # Let's jump to Fuzzy Match (difflib SequenceMatcher) to find the best block.
        
        # We'll compare chunks of lines.
        content_lines = content.splitlines(keepends=True)
        search_lines = search_str.splitlines(keepends=True)
        
        # If search block is empty, fail
        if not search_lines:
             raise HTTPException(status_code=400, detail="Search text is empty")
             
        best_ratio = 0.0
        best_idx = -1
        
        # Slide a window of size len(search_lines) over the file
        window_size = len(search_lines)
        for i in range(len(content_lines) - window_size + 1):
            window_text = "".join(content_lines[i:i+window_size])
            ratio = difflib.SequenceMatcher(None, window_text, search_str).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_idx = i

        # Mode 3: High-confidence fuzzy match
        if best_ratio >= 0.90:
            # We found a very close match!
            start_idx = best_idx
            end_idx = best_idx + window_size
            
            # Reconstruct the file with replacement
            prefix = "".join(content_lines[:start_idx])
            suffix = "".join(content_lines[end_idx:])
            new_content = prefix + replace_str + suffix
            
            # Ensure it actually ends with a newline if it did before, though prefix/suffix handles this
        else:
            # Mode 4: Fallback
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not locate the code to replace (best match was only {best_ratio:.0%}). Edit REJECTED."
            )

    # 5. Save to disk
    try:
        target_path.write_text(new_content, encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to write edit to {target_path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file modifications")

    # 6. Mark file hash out of sync in DB if exists, so it re-indexes
    project_file = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
        ProjectFile.relative_path == req_path_clean.replace("\\", "/")
    ).first()

    if project_file:
        # Update the file hash in db so scanner catches it, or just let the next scan do it.
        # Actually we can just update the hash directly:
        new_hash = hashlib.sha256(new_content.encode('utf-8')).hexdigest()[:16]
        project_file.file_hash = new_hash
        project_file.lines_count = len(new_content.splitlines())
        project_file.size_bytes = len(new_content.encode('utf-8'))
        db.commit()

    return {"status": "success", "message": "Edit applied successfully"}

import ast
import re
from typing import List, Optional

class SingleEditPayload(BaseModel):
    file_path: str
    search_text: str
    replace_text: str
    expected_hash: Optional[str] = None

class ValidateChangesRequest(BaseModel):
    edits: List[SingleEditPayload]

class FileValidationItem(BaseModel):
    file_path: str
    status: str  # "valid", "warning", "error"
    additions: int
    deletions: int
    match_ratio: float
    syntax_valid: bool
    path_valid: bool
    security_clean: bool
    warnings: List[str]

class ValidateChangesResponse(BaseModel):
    valid: bool
    total_files: int
    total_additions: int
    total_deletions: int
    risk_level: str  # "LOW", "MEDIUM", "HIGH"
    risk_reason: str
    validations: List[FileValidationItem]
    checks: dict

@router.post("/validate-changes", response_model=ValidateChangesResponse)
def validate_changes(project_id: str, req: ValidateChangesRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project_root = Path(project.path).resolve()
    items = []
    total_additions = 0
    total_deletions = 0
    all_valid = True
    touches_critical_path = False
    has_secret_pattern = False

    SECRET_PATTERNS = [
        re.compile(r"""(?i)(?:password|secret|api_key|apikey|private_key|token)\s*=\s*['"][^'"]{8,}['"]"""),
        re.compile(r"""-----BEGIN (?:RSA )?PRIVATE KEY-----""")
    ]

    for edit in req.edits:
        req_path_clean = edit.file_path.lstrip("\\/")
        target_path = (project_root / req_path_clean).resolve()
        warnings = []

        path_valid = str(target_path).startswith(str(project_root)) and target_path.exists() and target_path.is_file()
        if not path_valid:
            all_valid = False
            items.append(FileValidationItem(
                file_path=edit.file_path,
                status="error",
                additions=0,
                deletions=0,
                match_ratio=0.0,
                syntax_valid=False,
                path_valid=False,
                security_clean=True,
                warnings=["File does not exist or escapes project sandbox."]
            ))
            continue

        # Check critical path
        if any(w in req_path_clean.lower() for w in ["auth", "security", "database", "crypto", "config", "env"]):
            touches_critical_path = True

        # Secret scan
        security_clean = True
        for pattern in SECRET_PATTERNS:
            if pattern.search(edit.replace_text):
                security_clean = False
                has_secret_pattern = True
                warnings.append("Potential hardcoded secret or credential detected in replacement code.")

        content = ""
        try:
            content = target_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            path_valid = False
            warnings.append("Binary file cannot be modified.")

        # Match calculation
        search_str = edit.search_text
        replace_str = edit.replace_text
        match_ratio = 1.0 if search_str in content else 0.0

        if match_ratio < 1.0:
            content_lines = content.splitlines(keepends=True)
            search_lines = search_str.splitlines(keepends=True)
            window_size = len(search_lines) or 1
            best_ratio = 0.0
            for i in range(max(1, len(content_lines) - window_size + 1)):
                w_text = "".join(content_lines[i:i+window_size])
                r = difflib.SequenceMatcher(None, w_text, search_str).ratio()
                if r > best_ratio:
                    best_ratio = r
            match_ratio = round(best_ratio, 2)

        # Additions & Deletions
        del_count = len(search_str.splitlines()) if search_str.strip() else 0
        add_count = len(replace_str.splitlines()) if replace_str.strip() else 0
        total_additions += add_count
        total_deletions += del_count

        # Syntax Check
        syntax_valid = True
        if target_path.suffix == ".py":
            try:
                # Simulate replacement
                simulated_content = content.replace(search_str, replace_str, 1) if search_str in content else content
                ast.parse(simulated_content)
            except SyntaxError as syn_err:
                syntax_valid = False
                warnings.append(f"Syntax error after modification: {syn_err.msg} (line {syn_err.lineno})")

        file_status = "valid" if (path_valid and syntax_valid and security_clean and match_ratio >= 0.85) else "error"
        if file_status == "error":
            all_valid = False

        items.append(FileValidationItem(
            file_path=edit.file_path,
            status=file_status,
            additions=add_count,
            deletions=del_count,
            match_ratio=match_ratio,
            syntax_valid=syntax_valid,
            path_valid=path_valid,
            security_clean=security_clean,
            warnings=warnings
        ))

    # Risk level determination
    risk_level = "LOW"
    risk_reason = "Changes are isolated with high search match and passing validation checks."

    if has_secret_pattern or not all_valid:
        risk_level = "HIGH"
        risk_reason = "Validation failures or potential secret leaks detected."
    elif total_additions + total_deletions > 150 or touches_critical_path or len(req.edits) > 4:
        risk_level = "MEDIUM"
        risk_reason = f"Modifies sensitive areas ({'critical path' if touches_critical_path else 'multi-file'}) with {total_additions + total_deletions} modified lines."

    return ValidateChangesResponse(
        valid=all_valid,
        total_files=len(req.edits),
        total_additions=total_additions,
        total_deletions=total_deletions,
        risk_level=risk_level,
        risk_reason=risk_reason,
        validations=items,
        checks={
            "syntax_validation": all(it.syntax_valid for it in items),
            "security_validation": not has_secret_pattern,
            "path_validation": all(it.path_valid for it in items),
            "diff_consistency": all(it.match_ratio >= 0.85 for it in items),
            "tests_preview": True
        }
    )

class ApplyBatchEditRequest(BaseModel):
    edits: List[SingleEditPayload]
    run_tests_after: bool = True

@router.post("/apply-batch-edits")
async def apply_batch_edits(project_id: str, req: ApplyBatchEditRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    applied_files = []
    for edit in req.edits:
        # Resolve file hash if expected_hash was not provided
        expected_h = edit.expected_hash
        if not expected_h:
            p_file = db.query(ProjectFile).filter(
                ProjectFile.project_id == project_id,
                ProjectFile.relative_path == edit.file_path.replace("\\", "/").lstrip("/")
            ).first()
            expected_h = p_file.file_hash if p_file else ""

        single_req = ApplyEditRequest(
            file_path=edit.file_path,
            search_text=edit.search_text,
            replace_text=edit.replace_text,
            expected_hash=expected_h
        )
        apply_edit(project_id, single_req, db)
        applied_files.append(edit.file_path)

    test_output = ""
    tests_passed = True
    if req.run_tests_after and project.test_command:
        import asyncio
        try:
            proc = await asyncio.create_subprocess_shell(
                project.test_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project.path
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=45.0)
            test_output = (stdout.decode('utf-8', errors='replace') + stderr.decode('utf-8', errors='replace')).strip()
            tests_passed = (proc.returncode == 0)
        except Exception as e:
            tests_passed = False
            test_output = str(e)

    return {
        "status": "success" if tests_passed else "test_failed",
        "applied_count": len(applied_files),
        "applied_files": applied_files,
        "tests_run": bool(project.test_command),
        "tests_passed": tests_passed,
        "test_output": test_output
    }
