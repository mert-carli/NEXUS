from pydantic import BaseModel, ConfigDict, Field
from typing import Any, Dict, List, Optional
from app.core.settings_registry import SETTING_DEFINITIONS

class SystemSettingsUpdate(BaseModel):
    model_config = ConfigDict(extra='allow')
    
    # We allow any key to be passed in, but we will validate them in the API layer against the REGISTRY.
    pass

class SettingsCategoryGroup(BaseModel):
    model_config = ConfigDict(extra='allow')

class SystemSettingsResponse(BaseModel):
    general: Dict[str, Any] = Field(default_factory=dict)
    ai: Dict[str, Any] = Field(default_factory=dict)
    rag: Dict[str, Any] = Field(default_factory=dict)
    agent: Dict[str, Any] = Field(default_factory=dict)
    execution: Dict[str, Any] = Field(default_factory=dict)
    security: Dict[str, Any] = Field(default_factory=dict)
    git: Dict[str, Any] = Field(default_factory=dict)

    # Legacy fields to avoid breaking old frontend
    OLLAMA_LLM_MODEL: str = ""
    OLLAMA_EMBED_MODEL: str = ""
    RAG_TOP_K: int = 8
    RAG_CONTEXT_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.70
    EMBEDDING_BATCH_SIZE: int = 32
    CHROMA_DB_PATH: str = ""

class SettingDefinitionSchema(BaseModel):
    key: str
    type: str
    default: Any
    category: str
    description: str
    security_level: str
    read_only: bool
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[List[str]] = None
