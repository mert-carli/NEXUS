"""
Vector DB Service — ChromaDB integration for NEXUS.

Responsibilities:
  - Manage one ChromaDB collection per project.
  - Deterministic chunk IDs: {project_id}:{file_id}:{chunk_index}
  - Incremental indexing: only re-embed changed/added files, delete removed ones.
  - Self-healing: clean up stale vectors whose files no longer exist in SQLite.
  - Safe state: update indexed_hash in SQLite ONLY after successful Chroma insertion.
"""
import hashlib
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, AsyncGenerator, Optional

import chromadb
from chromadb import PersistentClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.file import ProjectFile
from app.models.project import Project
from app.services.chunker import chunk_file_path, CodeChunk
from app.services.ollama_service import get_embeddings_batch

logger = logging.getLogger(__name__)


# ── Client singleton ──────────────────────────────────────────────────────────

_chroma_client: Optional[PersistentClient] = None


def get_chroma_client() -> PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = PersistentClient(path=settings.CHROMA_DB_PATH)
    return _chroma_client


def get_collection_name(project_id: str) -> str:
    return f"nexus_{project_id.replace('-', '_')}"


def get_or_create_collection(project_id: str) -> chromadb.Collection:
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=get_collection_name(project_id),
        metadata={"hnsw:space": "cosine"},
    )


def delete_project_index(project_id: str) -> None:
    """Remove the entire ChromaDB collection for a project."""
    try:
        client = get_chroma_client()
        client.delete_collection(get_collection_name(project_id))
    except Exception:
        pass  # Already deleted or never existed


# ── Vector IDs ─────────────────────────────────────────────────────────────────

def make_chunk_id(project_id: str, file_id: str, chunk_index: int) -> str:
    """Deterministic ID format: {project_id}:{file_id}:{chunk_index}"""
    return f"{project_id}:{file_id}:{chunk_index}"


# ── Delete file vectors ────────────────────────────────────────────────────────

def delete_file_vectors(project_id: str, file_id: str) -> None:
    """Remove all indexed chunks belonging to a specific file."""
    try:
        col = get_or_create_collection(project_id)
        col.delete(where={"file_id": {"$eq": file_id}})
    except Exception as e:
        logger.warning(f"Failed to delete vectors for file {file_id}: {e}")


# ── Self-healing cleanup ───────────────────────────────────────────────────────

def cleanup_stale_vectors(project_id: str, active_file_ids: set) -> int:
    """
    Removes vectors from ChromaDB for files that no longer exist in SQLite.
    Returns the number of collections cleaned.
    """
    try:
        col = get_or_create_collection(project_id)
        result = col.get(include=["metadatas"])
        stale_ids = [
            doc_id
            for doc_id, meta in zip(result["ids"], result["metadatas"])
            if meta.get("file_id") not in active_file_ids
        ]
        if stale_ids:
            col.delete(ids=stale_ids)
            return len(stale_ids)
    except Exception as e:
        logger.warning(f"Stale vector cleanup error for project {project_id}: {e}")
    return 0


# ── Incremental indexer (SSE generator) ───────────────────────────────────────

async def incremental_index_project(
    db: Session,
    project: Project,
    embed_model: str | None = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Incrementally indexes the project into ChromaDB.
    Yields SSE-style events: start, progress, error, complete.

    Indexing strategy:
      1. Identify files to index: binary files skipped, only source files.
      2. Self-healing: remove vectors for deleted files.
      3. For each file where indexed_hash != file_hash (or indexed_hash is null):
         a. Chunk the file.
         b. Batch embed chunks.
         c. Delete old vectors.
         d. Insert new vectors.
         e. ONLY THEN update indexed_hash in SQLite.
      4. Emit final complete event.
    """
    # --- Gather file state ---
    all_files: List[ProjectFile] = (
        db.query(ProjectFile)
        .filter(ProjectFile.project_id == project.id, ProjectFile.is_binary == False)
        .all()
    )

    active_file_ids = {f.id for f in all_files}
    files_to_index = [f for f in all_files if f.indexed_hash != f.file_hash]
    total = len(files_to_index)

    yield {
        "type": "start",
        "total_files": total,
        "already_indexed": len(all_files) - total,
    }

    if total == 0:
        # Nothing to do — update timestamp and complete
        project.last_indexed_at = datetime.now(timezone.utc)
        db.commit()
        yield {"type": "complete", "files_indexed": 0, "total_chunks": 0, "duration_ms": 0}
        return

    # --- Self-healing: remove vectors for files no longer in SQLite ---
    stale_removed = cleanup_stale_vectors(project.id, active_file_ids)
    if stale_removed:
        logger.info(f"Removed {stale_removed} stale chunk IDs for project {project.id}")

    # --- Index loop ---
    import time
    start_time = time.time()
    files_done = 0
    total_chunks = 0

    collection = get_or_create_collection(project.id)
    project_root = Path(project.path)

    for file_obj in files_to_index:
        abs_path = project_root / file_obj.relative_path

        try:
            # 1. Chunk the file
            if not abs_path.exists():
                # File was deleted between scan and index — clean up vectors
                delete_file_vectors(project.id, file_obj.id)
                continue

            chunks: List[CodeChunk] = chunk_file_path(abs_path)
            if not chunks:
                # Empty or unreadable — still mark as indexed to prevent repeat attempts
                file_obj.indexed_hash = file_obj.file_hash
                db.commit()
                files_done += 1
                yield {
                    "type": "progress",
                    "files_done": files_done,
                    "total_files": total,
                    "current_file": file_obj.relative_path,
                    "chunks_count": total_chunks,
                }
                continue

            # 2. Batch embed
            texts = [c.content for c in chunks]
            embeddings = await get_embeddings_batch(
                texts,
                model=embed_model,
                batch_size=settings.EMBEDDING_BATCH_SIZE,
            )

            # 3. Delete existing vectors for this file
            delete_file_vectors(project.id, file_obj.id)

            # 4. Insert new vectors
            ids = [make_chunk_id(project.id, file_obj.id, c.chunk_index) for c in chunks]
            metadatas = [
                {
                    "project_id": project.id,
                    "file_id": file_obj.id,
                    "relative_path": file_obj.relative_path,
                    "language": file_obj.language,
                    "start_line": c.start_line,
                    "end_line": c.end_line,
                    "chunk_index": c.chunk_index,
                    "content_hash": hashlib.sha256(c.content.encode()).hexdigest()[:16],
                }
                for c in chunks
            ]

            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )

            # 5. ONLY update indexed_hash after successful insertion
            file_obj.indexed_hash = file_obj.file_hash
            db.commit()

            files_done += 1
            total_chunks += len(chunks)

            elapsed = int((time.time() - start_time) * 1000)
            remaining_files = total - files_done
            avg_ms_per_file = (elapsed / files_done) if files_done > 0 else 0
            est_remaining_ms = int(avg_ms_per_file * remaining_files)

            yield {
                "type": "progress",
                "files_done": files_done,
                "total_files": total,
                "current_file": file_obj.relative_path,
                "chunks_count": total_chunks,
                "embeddings_count": total_chunks,
                "elapsed_ms": elapsed,
                "estimated_remaining_ms": est_remaining_ms,
            }

        except RuntimeError as e:
            # Embedding/Ollama failure — do NOT update indexed_hash
            yield {
                "type": "error",
                "code": "EMBEDDING_FAILED",
                "message": str(e),
                "file": file_obj.relative_path,
            }
            # Continue indexing remaining files; don't abort entire job
            continue
        except Exception as e:
            yield {
                "type": "error",
                "code": "INDEXING_ERROR",
                "message": f"Unexpected error indexing {file_obj.relative_path}: {e}",
                "file": file_obj.relative_path,
            }
            continue

    # --- Finalize ---
    project.last_indexed_at = datetime.now(timezone.utc)
    db.commit()

    duration_ms = int((time.time() - start_time) * 1000)
    yield {
        "type": "complete",
        "files_indexed": files_done,
        "total_chunks": total_chunks,
        "duration_ms": duration_ms,
    }


# ── Semantic query ─────────────────────────────────────────────────────────────

def query_similar_chunks(
    project_id: str,
    query_embedding: List[float],
    top_k: int | None = None,
) -> List[Dict[str, Any]]:
    """
    Query ChromaDB for the most similar chunks.
    Returns a list of results with metadata and similarity scores.
    """
    k = top_k or settings.RAG_TOP_K
    try:
        col = get_or_create_collection(project_id)
        result = col.query(
            query_embeddings=[query_embedding],
            n_results=min(k, col.count()),
            include=["documents", "metadatas", "distances"],
        )
        if not result or not result["ids"]:
            return []

        items = []
        for doc_id, doc, meta, dist in zip(
            result["ids"][0],
            result["documents"][0],
            result["metadatas"][0],
            result["distances"][0],
        ):
            # Cosine distance → similarity (1 - distance for cosine space)
            similarity = 1.0 - float(dist)
            items.append({
                "id": doc_id,
                "content": doc,
                "metadata": meta,
                "similarity_score": round(similarity, 4),
            })

        return items
    except Exception as e:
        logger.error(f"ChromaDB query failed for project {project_id}: {e}")
        return []
