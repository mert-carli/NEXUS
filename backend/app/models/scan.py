from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class ScanEvent(Base):
    __tablename__ = "scan_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    scanned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    added_count = Column(Integer, default=0)
    modified_count = Column(Integer, default=0)
    deleted_count = Column(Integer, default=0)
    unmodified_count = Column(Integer, default=0)
    total_files = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    summary = Column(Text, nullable=True)

    project = relationship("Project", back_populates="scan_events")
