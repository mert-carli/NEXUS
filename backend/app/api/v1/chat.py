import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.models.project import Project
from app.services.vector_db import incremental_index_project
from app.services.rag_service import rag_query
from app.services.agent_service import agent_workflow
from app.api.v1.projects import calculate_index_status

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    is_agentic: bool = False

@router.post("/{project_id}/index")
async def start_indexing(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail={"error": "PROJECT_NOT_FOUND", "message": "Project not found."})

    from app.api.v1.settings import get_current_settings
    settings_obj = get_current_settings(db)
    embed_model = getattr(settings_obj, "OLLAMA_EMBED_MODEL", None) or settings_obj.ai.get("EMBEDDING_MODEL")

    async def event_generator():
        try:
            async for event in incremental_index_project(db, project, embed_model):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/{project_id}/chat")
async def chat_with_project(project_id: str, payload: ChatRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail={"error": "PROJECT_NOT_FOUND", "message": "Project not found."})

    status = calculate_index_status(db, project.id, project.source_files)
    if status != "READY":
        raise HTTPException(status_code=400, detail={"error": "INDEX_NOT_READY", "message": "Project is not fully indexed."})

    from app.api.v1.settings import get_current_settings
    settings_obj = get_current_settings(db)
    embed_model = getattr(settings_obj, "OLLAMA_EMBED_MODEL", None) or settings_obj.ai.get("EMBEDDING_MODEL")
    llm_model = getattr(settings_obj, "OLLAMA_LLM_MODEL", None) or settings_obj.ai.get("CHAT_MODEL")

    async def chat_generator():
        try:
            if payload.is_agentic:
                generator = agent_workflow(
                    project_id=project.id,
                    query=payload.query,
                    embed_model=embed_model,
                    llm_model=llm_model
                )
            else:
                generator = rag_query(
                    project_id=project.id,
                    query=payload.query,
                    embed_model=embed_model,
                    llm_model=llm_model
                )
            async for event in generator:
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(chat_generator(), media_type="text/event-stream")
