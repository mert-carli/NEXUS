import pytest
import hashlib
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.database import get_db, Base
from app.models.project import Project
from app.models.file import ProjectFile
from tests.conftest import TestingSessionLocal

@pytest.fixture
def mock_project_and_file(tmp_path: Path):
    db = TestingSessionLocal()
    
    # Create temp project root
    project_root = tmp_path / "test_proj"
    project_root.mkdir()
    
    # Create temp file
    file_path = project_root / "app.py"
    original_code = "def hello():\n    print('hi')\n"
    file_path.write_text(original_code, encoding="utf-8")
    
    file_hash = hashlib.sha256(original_code.encode("utf-8")).hexdigest()[:16]

    proj = Project(
        id="proj-123",
        name="Test Proj",
        path=str(project_root)
    )
    db.add(proj)
    
    proj_file = ProjectFile(
        id="file-123",
        project_id="proj-123",
        relative_path="app.py",
        filename="app.py",
        file_hash=file_hash,
        is_binary=False,
    )
    db.add(proj_file)
    db.commit()
    db.close()
    
    return "proj-123", "app.py", file_hash, file_path

def test_apply_edit_exact_match(client, mock_project_and_file):
    proj_id, rel_path, expected_hash, abs_path = mock_project_and_file
    
    payload = {
        "file_path": rel_path,
        "search_text": "print('hi')",
        "replace_text": "print('hello')",
        "expected_hash": expected_hash
    }
    
    resp = client.post(f"/api/v1/projects/{proj_id}/files/apply-edit", json=payload)
    assert resp.status_code == 200
    
    new_content = abs_path.read_text(encoding="utf-8")
    assert "print('hello')" in new_content

def test_apply_edit_hash_mismatch(client, mock_project_and_file):
    proj_id, rel_path, _, abs_path = mock_project_and_file
    
    payload = {
        "file_path": rel_path,
        "search_text": "print('hi')",
        "replace_text": "print('hello')",
        "expected_hash": "bad-hash"
    }
    
    resp = client.post(f"/api/v1/projects/{proj_id}/files/apply-edit", json=payload)
    assert resp.status_code == 409
    
def test_apply_edit_path_sandbox(client, mock_project_and_file):
    proj_id, rel_path, expected_hash, abs_path = mock_project_and_file
    
    payload = {
        "file_path": "../../../../etc/passwd",
        "search_text": "root",
        "replace_text": "hacked",
        "expected_hash": expected_hash
    }
    
    resp = client.post(f"/api/v1/projects/{proj_id}/files/apply-edit", json=payload)
    assert resp.status_code == 403
