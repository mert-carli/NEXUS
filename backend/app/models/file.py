from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    relative_path = Column(String(1024), nullable=False)
    filename = Column(String(255), nullable=False)
    extension = Column(String(64), nullable=False, default="")
    language = Column(String(64), nullable=False, default="Plain Text")
    size_bytes = Column(Integer, default=0)
    lines_count = Column(Integer, default=0)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    is_binary = Column(Boolean, default=False)
    latest_scan_status = Column(String(32), default="UNMODIFIED")  # ADDED, MODIFIED, UNMODIFIED, DELETED
    indexed_hash = Column(String(64), nullable=True)  # SHA-256 hash at time of last AI indexing
    last_modified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="files")
