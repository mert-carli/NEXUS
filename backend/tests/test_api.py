"""
All tests use the session-scoped `client` and `real_temp_project` fixtures
defined in conftest.py.
"""
import os
from pathlib import Path
from app.core.config import settings


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_check(client):
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ── Security & Path Validation ────────────────────────────────────────────────

def test_reject_empty_path(client):
    response = client.post(f"{settings.API_V1_STR}/projects", json={"path": ""})
    assert response.status_code == 400

def test_reject_nonexistent_path(client):
    response = client.post(f"{settings.API_V1_STR}/projects", json={"path": "C:\\this\\does\\not\\exist\\xyz123"})
    assert response.status_code == 404

def test_reject_root_path(client):
    response = client.post(f"{settings.API_V1_STR}/projects", json={"path": "C:\\"})
    assert response.status_code == 403

def test_reject_windows_system_dir(client):
    response = client.post(f"{settings.API_V1_STR}/projects", json={"path": "C:\\Windows"})
    assert response.status_code == 403

def test_reject_windows_system_dir_subdirectory(client):
    response = client.post(f"{settings.API_V1_STR}/projects", json={"path": "C:\\Windows\\System32"})
    assert response.status_code == 403


# ── Project Creation & Scanning ───────────────────────────────────────────────

def test_open_real_project(client, real_temp_project):
    response = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] is not None
    assert data["total_files"] >= 5
    assert data["source_files"] >= 4
    assert data["total_lines"] >= 5
    assert len(data["languages"]) >= 1

def test_open_same_project_twice(client, real_temp_project):
    r1 = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    r2 = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]

def test_list_projects(client, real_temp_project):
    client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    response = client.get(f"{settings.API_V1_STR}/projects")
    assert response.status_code == 200
    assert len(response.json()) >= 1

def test_get_project(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]
    response = client.get(f"{settings.API_V1_STR}/projects/{project_id}")
    assert response.status_code == 200
    assert response.json()["id"] == project_id

def test_get_nonexistent_project(client):
    response = client.get(f"{settings.API_V1_STR}/projects/nonexistent-id")
    assert response.status_code == 404


# ── Incremental Scan Diffs ────────────────────────────────────────────────────

def test_incremental_scan_added(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]

    (Path(real_temp_project) / "new_feature.py").write_text("# new feature\n", encoding="utf-8")

    rescan_resp = client.post(f"{settings.API_V1_STR}/projects/{project_id}/scan")
    assert rescan_resp.status_code == 200
    assert rescan_resp.json()["latest_scan"]["added_count"] >= 1

def test_incremental_scan_modified(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]

    (Path(real_temp_project) / "main.py").write_text(
        "# Modified\ndef main():\n    print('NEXUS modified')\n", encoding="utf-8"
    )

    rescan_resp = client.post(f"{settings.API_V1_STR}/projects/{project_id}/scan")
    assert rescan_resp.status_code == 200
    assert rescan_resp.json()["latest_scan"]["modified_count"] >= 1

def test_incremental_scan_deleted(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]

    os.remove(Path(real_temp_project) / "config.json")

    rescan_resp = client.post(f"{settings.API_V1_STR}/projects/{project_id}/scan")
    assert rescan_resp.status_code == 200
    assert rescan_resp.json()["latest_scan"]["deleted_count"] >= 1

def test_incremental_scan_unmodified(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]

    rescan_resp = client.post(f"{settings.API_V1_STR}/projects/{project_id}/scan")
    assert rescan_resp.status_code == 200
    scan = rescan_resp.json()["latest_scan"]
    assert scan["added_count"] == 0
    assert scan["modified_count"] == 0
    assert scan["deleted_count"] == 0
    assert scan["unmodified_count"] >= 5


# ── File Tree & Content ───────────────────────────────────────────────────────

def test_get_file_tree(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]
    response = client.get(f"{settings.API_V1_STR}/projects/{project_id}/files?tree=true")
    assert response.status_code == 200
    assert "tree" in response.json()

def test_get_flat_file_list(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]
    response = client.get(f"{settings.API_V1_STR}/projects/{project_id}/files")
    assert response.status_code == 200
    assert len(response.json()["files"]) >= 5

def test_get_file_content(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]

    files_resp = client.get(f"{settings.API_V1_STR}/projects/{project_id}/files")
    text_file = next(f for f in files_resp.json()["files"] if f["filename"] == "main.py")

    content_resp = client.get(
        f"{settings.API_V1_STR}/projects/{project_id}/files/{text_file['id']}/content"
    )
    assert content_resp.status_code == 200
    data = content_resp.json()
    assert data["content"] is not None
    assert "def main" in data["content"]
    assert data["error"] is None


# ── Delete Project ────────────────────────────────────────────────────────────

def test_delete_project(client, real_temp_project):
    create_resp = client.post(f"{settings.API_V1_STR}/projects", json={"path": real_temp_project})
    project_id = create_resp.json()["id"]
    delete_resp = client.delete(f"{settings.API_V1_STR}/projects/{project_id}")
    assert delete_resp.status_code == 200
    get_resp = client.get(f"{settings.API_V1_STR}/projects/{project_id}")
    assert get_resp.status_code == 404


# ── Settings API & Validation ─────────────────────────────────────────────────

def test_get_settings(client):
    response = client.get(f"{settings.API_V1_STR}/settings")
    assert response.status_code == 200
    data = response.json()
    assert "general" in data
    assert "ai" in data
    assert "rag" in data
    assert "agent" in data
    assert "execution" in data
    assert "security" in data
    assert "git" in data

def test_get_settings_definitions(client):
    response = client.get(f"{settings.API_V1_STR}/settings/definitions")
    assert response.status_code == 200
    defs = response.json()
    assert len(defs) >= 10
    keys = [d["key"] for d in defs]
    assert "MAX_AGENT_ITERATIONS" in keys
    assert "ENFORCE_PATH_SANDBOX" in keys

def test_update_settings_validation(client):
    # Valid update
    r1 = client.put(f"{settings.API_V1_STR}/settings", json={"MAX_AGENT_ITERATIONS": 5, "TEMPERATURE": 0.5})
    assert r1.status_code == 200
    assert r1.json()["agent"]["MAX_AGENT_ITERATIONS"] == 5
    assert r1.json()["ai"]["TEMPERATURE"] == 0.5

    # Invalid min/max validation
    r2 = client.put(f"{settings.API_V1_STR}/settings", json={"MAX_AGENT_ITERATIONS": 50})
    assert r2.status_code == 422

    # Invalid temperature validation
    r3 = client.put(f"{settings.API_V1_STR}/settings", json={"TEMPERATURE": 2.5})
    assert r3.status_code == 422

def test_reset_settings(client):
    # Set custom value
    client.put(f"{settings.API_V1_STR}/settings", json={"MAX_AGENT_ITERATIONS": 8})
    # Reset
    reset_resp = client.post(f"{settings.API_V1_STR}/settings/reset")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["agent"]["MAX_AGENT_ITERATIONS"] == 3

