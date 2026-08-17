from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # AI Model Config (overridable via UI/DB settings)
    OLLAMA_LLM_MODEL: str = "qwen2.5-coder"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # ChromaDB
    CHROMA_DB_PATH: str = "./chroma_db"

    # RAG tuning
    RAG_TOP_K: int = 8           # Candidates retrieved from ChromaDB
    RAG_CONTEXT_K: int = 5       # Max chunks injected into prompt
    RAG_SIMILARITY_THRESHOLD: float = 0.35  # Minimum similarity score
    EMBEDDING_BATCH_SIZE: int = 32

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
