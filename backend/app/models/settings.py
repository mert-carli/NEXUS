from sqlalchemy import Column, String, Text
from app.db.database import Base


class SystemSettings(Base):
    """
    Key-value store for runtime NEXUS settings (LLM model, embed model, RAG params, etc.)
    Default values fall back to config.py / .env; DB values take priority.
    """
    __tablename__ = "system_settings"

    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=False)
