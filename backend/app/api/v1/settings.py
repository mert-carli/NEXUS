import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.settings import SystemSettings
from app.schemas.settings import SystemSettingsUpdate, SystemSettingsResponse, SettingDefinitionSchema
from app.core.config import settings as core_settings
from app.core.settings_registry import REGISTRY, SETTING_DEFINITIONS

router = APIRouter()

def _parse_value(val_str: str, typ: str) -> any:
    if typ == "integer":
        return int(val_str)
    elif typ == "float":
        return float(val_str)
    elif typ == "boolean":
        return val_str.lower() in ("true", "1", "yes")
    elif typ == "array":
        try:
            return json.loads(val_str)
        except:
            return []
    return val_str

def _serialize_value(val: any, typ: str) -> str:
    if typ == "boolean":
        return "true" if val else "false"
    elif typ == "array":
        return json.dumps(val)
    return str(val)

def get_current_settings(db: Session) -> SystemSettingsResponse:
    db_settings = db.query(SystemSettings).all()
    db_map = {s.key: s.value for s in db_settings}
    
    response_data = {
        "general": {},
        "ai": {},
        "rag": {},
        "agent": {},
        "execution": {},
        "security": {},
        "git": {}
    }
    
    # Process all settings from registry
    for definition in SETTING_DEFINITIONS:
        val_str = db_map.get(definition.key)
        if val_str is not None:
            val = _parse_value(val_str, definition.type)
        else:
            # Check core_settings as fallback for older keys, else use default
            if hasattr(core_settings, definition.key):
                val = getattr(core_settings, definition.key)
            else:
                val = definition.default
                
        if definition.category in response_data:
            response_data[definition.category][definition.key] = val
    
    # Fill in legacy fields to avoid breaking old UI temporarily
    resp = SystemSettingsResponse(**response_data)
    resp.OLLAMA_LLM_MODEL = response_data["ai"].get("CHAT_MODEL", core_settings.OLLAMA_LLM_MODEL)
    resp.OLLAMA_EMBED_MODEL = response_data["ai"].get("EMBEDDING_MODEL", core_settings.OLLAMA_EMBED_MODEL)
    resp.RAG_TOP_K = response_data["rag"].get("RAG_TOP_K", core_settings.RAG_TOP_K)
    resp.RAG_CONTEXT_K = response_data["rag"].get("RAG_CONTEXT_K", core_settings.RAG_CONTEXT_K)
    resp.RAG_SIMILARITY_THRESHOLD = response_data["rag"].get("SIMILARITY_THRESHOLD", core_settings.RAG_SIMILARITY_THRESHOLD)
    resp.EMBEDDING_BATCH_SIZE = response_data["rag"].get("EMBEDDING_BATCH_SIZE", core_settings.EMBEDDING_BATCH_SIZE)
    resp.CHROMA_DB_PATH = core_settings.CHROMA_DB_PATH
    
    return resp

@router.get("", response_model=SystemSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return get_current_settings(db)

@router.get("/definitions", response_model=List[SettingDefinitionSchema])
def get_settings_definitions():
    return SETTING_DEFINITIONS

@router.put("", response_model=SystemSettingsResponse)
def update_settings(update_data: SystemSettingsUpdate, db: Session = Depends(get_db)):
    updates = update_data.model_dump(exclude_unset=True)
    
    # Validate
    for key, value in updates.items():
        if key not in REGISTRY:
            # allow legacy keys temporarily by mapping them
            if key == "OLLAMA_LLM_MODEL": key = "CHAT_MODEL"
            elif key == "OLLAMA_EMBED_MODEL": key = "EMBEDDING_MODEL"
            else: continue
            
        definition = REGISTRY[key]
        
        # Validation checks
        if definition.type in ("integer", "float"):
            val_num = float(value)
            if definition.min is not None and val_num < definition.min:
                raise HTTPException(status_code=422, detail=f"{key} must be >= {definition.min}")
            if definition.max is not None and val_num > definition.max:
                raise HTTPException(status_code=422, detail=f"{key} must be <= {definition.max}")
        elif definition.type == "enum" and definition.options:
            if value not in definition.options:
                raise HTTPException(status_code=422, detail=f"{key} must be one of {definition.options}")
        elif definition.type == "array" and definition.options:
            # Subset validation (e.g., allowed commands)
            if not isinstance(value, list):
                raise HTTPException(status_code=422, detail=f"{key} must be a list")
            for item in value:
                if item not in definition.options:
                    raise HTTPException(status_code=422, detail=f"Invalid array item {item} for {key}")

        # Save to DB
        db_setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
        str_val = _serialize_value(value, definition.type)
        if db_setting:
            db_setting.value = str_val
        else:
            new_setting = SystemSettings(key=key, value=str_val)
            db.add(new_setting)
            
    db.commit()
    return get_current_settings(db)

@router.post("/reset", response_model=SystemSettingsResponse)
def reset_settings(db: Session = Depends(get_db)):
    # Delete all settings
    db.query(SystemSettings).delete()
    db.commit()
    return get_current_settings(db)
