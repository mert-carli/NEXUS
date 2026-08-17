from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    path = Column(String(1024), nullable=False, unique=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_scanned_at = Column(DateTime, nullable=True)
    last_indexed_at = Column(DateTime, nullable=True)

    # Aggregated Stats
    total_files = Column(Integer, default=0)
    source_files = Column(Integer, default=0)
    binary_files = Column(Integer, default=0)
    total_lines = Column(Integer, default=0)
    languages_json = Column(Text, default="{}")  # JSON string of { language: count }
    test_command = Column(String(255), nullable=True)

    # Git metadata
    is_git_repo = Column(Boolean, default=False)
    git_branch = Column(String(255), nullable=True)
    git_commit_hash = Column(String(64), nullable=True)
    git_commit_message = Column(Text, nullable=True)
    git_is_dirty = Column(Boolean, default=False)
    git_modified_files_count = Column(Integer, default=0)

    # Relationships
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    scan_events = relationship("ScanEvent", back_populates="project", cascade="all, delete-orphan", order_by="desc(ScanEvent.scanned_at)")
