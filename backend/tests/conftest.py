"""
conftest.py — Session-scoped in-memory DB that the app uses during tests.
The key: we must patch get_db BEFORE TestClient is constructed, and the
in-memory engine must be the one create_all() is called on.
"""
import pytest
import tempfile
import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# ── 1. Import models so SQLAlchemy metadata is populated ─────────────────────
import app.models.project  # noqa: F401
import app.models.file     # noqa: F401
import app.models.scan     # noqa: F401

from app.db.database import Base, get_db

# ── 2. Create a single in-memory engine for the whole test session ────────────
#      "cache=shared" lets multiple connections share the same in-memory DB.
TEST_DATABASE_URL = "sqlite:///file:memdb1?mode=memory&cache=shared&uri=true"

from sqlalchemy.pool import StaticPool

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False, "uri": True},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── 3. Import app and patch the dependency ────────────────────────────────────
from app.main import app  # noqa: E402
app.dependency_overrides[get_db] = override_get_db


# ── 4. Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def db_engine():
    """Create tables once for the whole test session."""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def reset_tables(db_engine):
    """Clear table data between tests (without dropping structure)."""
    yield
    db = TestingSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    finally:
        db.close()


@pytest.fixture(scope="session")
def client(db_engine):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def real_temp_project():
    """Creates a real temporary directory with some source files for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "main.py").write_text(
            "def main():\n    print('Hello NEXUS')\n\nmain()\n", encoding="utf-8"
        )
        (Path(tmpdir) / "README.md").write_text(
            "# Test Project\nThis is a test project.\n", encoding="utf-8"
        )
        (Path(tmpdir) / "config.json").write_text(
            '{"version": "1.0.0", "name": "test-project"}\n', encoding="utf-8"
        )
        src = Path(tmpdir) / "src"
        src.mkdir()
        (src / "utils.py").write_text("def add(a, b):\n    return a + b\n", encoding="utf-8")
        (src / "index.ts").write_text(
            "export const hello = () => console.log('hello');\n", encoding="utf-8"
        )
        yield tmpdir
