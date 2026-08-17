from fastapi import APIRouter
import httpx
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "ok", "message": "NEXUS API is running"}

@router.get("/health/ollama")
async def ollama_health_check():
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                return {"status": "ok", "models": models}
            else:
                return {"status": "error", "message": f"Ollama returned status code {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/health/chroma")
def chroma_health_check():
    try:
        from app.services.vector_db import get_chroma_client
        client = get_chroma_client()
        client.heartbeat()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

from app.services.security_validator import get_guard_status, log_threat

@router.get("/health/guard")
def guard_status_check():
    return get_guard_status()

@router.post("/health/guard/simulate")
def simulate_guard_threat():
    entry = log_threat(
        rule="Workspace Boundary Enforcement",
        severity="CRITICAL",
        reason="Attempted access outside project root.",
        target="../../system/config",
        details="NEXUS Guard intercepted and prevented unauthorized path traversal."
    )
    return {"status": "simulated", "threat": entry.model_dump()}

from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.project import Project
from app.services.vector_db import get_chroma_client
from app.api.v1.projects import calculate_index_status

@router.get("/health/project-readiness/{project_id}")
async def get_project_ai_readiness(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return {
            "score": 0,
            "status": "error",
            "message": "Project not found"
        }

    # 1. Backend check (20 pts)
    backend_online = True
    backend_score = 20

    # 2. Ollama check (25 pts)
    ollama_online = False
    ollama_models = []
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=3.0)
            if res.status_code == 200:
                ollama_online = True
                ollama_models = [m["name"] for m in res.json().get("models", [])]
    except Exception:
        ollama_online = False

    ollama_score = 25 if ollama_online else 0

    # 3. ChromaDB check (20 pts)
    chroma_online = False
    try:
        client = get_chroma_client()
        client.heartbeat()
        chroma_online = True
    except Exception:
        chroma_online = False

    chroma_score = 20 if chroma_online else 0

    # 4. Indexer check (20 pts)
    index_status = calculate_index_status(db, project.id, project.source_files)
    if index_status == "READY":
        index_score = 20
    elif index_status == "OUTDATED":
        index_score = 12
    else:
        index_score = 4

    # 5. Git check (15 pts)
    git_synced = project.is_git_repo and not project.git_is_dirty
    if git_synced:
        git_score = 15
    elif project.is_git_repo:
        git_score = 10
    else:
        git_score = 8

    total_score = backend_score + ollama_score + chroma_score + index_score + git_score

    tier = "OPTIMAL" if total_score >= 90 else "EXCELLENT" if total_score >= 75 else "ATTENTION NEEDED" if total_score >= 50 else "CRITICAL"

    return {
        "score": total_score,
        "max_score": 100,
        "tier": tier,
        "subsystems": {
            "backend": {"name": "Backend API", "status": "ONLINE" if backend_online else "OFFLINE", "score": backend_score, "max": 20},
            "ollama": {"name": "Ollama LLM", "status": "ONLINE" if ollama_online else "OFFLINE", "score": ollama_score, "max": 25, "models": ollama_models},
            "chroma": {"name": "ChromaDB", "status": "ONLINE" if chroma_online else "OFFLINE", "score": chroma_score, "max": 20},
            "git": {"name": "Git Status", "status": "SYNCED" if git_synced else "MODIFIED" if project.is_git_repo else "NO_GIT", "score": git_score, "max": 15, "branch": project.git_branch},
            "indexer": {"name": "Vector Indexer", "status": index_status, "score": index_score, "max": 20}
        },
        "last_scanned_at": project.last_scanned_at
    }
