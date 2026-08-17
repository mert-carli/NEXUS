"""
RAG Service — Retrieval-Augmented Generation pipeline.

Flow:
  1. Embed the user query.
  2. Retrieve Top-K candidates from ChromaDB.
  3. Filter by similarity threshold.
  4. Deduplicate/merge overlapping chunks from the same file.
  5. Select Top-Context-K chunks.
  6. Build prompt with context.
  7. Stream LLM response.
  8. Return structured sources with scores.
"""
from typing import List, Dict, Any, AsyncGenerator, Tuple
import logging

from app.core.config import settings
from app.services.ollama_service import get_single_embedding, stream_chat
from app.services.vector_db import query_similar_chunks

logger = logging.getLogger(__name__)

# ── Source deduplication ───────────────────────────────────────────────────────

def _deduplicate_sources(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Merge overlapping chunks from the same file.
    Two chunks overlap if their line ranges intersect with < 30% separation.
    Keeps the highest-similarity chunk when merging.
    """
    if not chunks:
        return []

    # Group by file
    by_file: Dict[str, List[Dict[str, Any]]] = {}
    for c in chunks:
        fp = c["metadata"].get("relative_path", "unknown")
        by_file.setdefault(fp, []).append(c)

    deduplicated = []
    for file_path, file_chunks in by_file.items():
        # Sort by start_line
        sorted_chunks = sorted(file_chunks, key=lambda x: x["metadata"].get("start_line", 0))
        merged = [sorted_chunks[0]]

        for chunk in sorted_chunks[1:]:
            prev = merged[-1]
            prev_end = prev["metadata"].get("end_line", 0)
            cur_start = chunk["metadata"].get("start_line", 0)
            cur_end = chunk["metadata"].get("end_line", 0)

            # Overlap: current chunk starts before or closely after the previous ends
            overlap_threshold = 0.30 * (prev_end - prev["metadata"].get("start_line", 0) + 1)
            if cur_start <= prev_end + overlap_threshold:
                # Merge: extend end_line, keep highest similarity score
                if chunk["similarity_score"] > prev["similarity_score"]:
                    merged[-1] = {
                        **chunk,
                        "metadata": {
                            **chunk["metadata"],
                            "start_line": prev["metadata"].get("start_line", cur_start),
                            "end_line": max(prev_end, cur_end),
                        },
                    }
                else:
                    merged[-1]["metadata"]["end_line"] = max(prev_end, cur_end)
            else:
                merged.append(chunk)

        deduplicated.extend(merged)

    # Re-sort by similarity descending
    deduplicated.sort(key=lambda x: x["similarity_score"], reverse=True)
    return deduplicated


# ── Context builder ────────────────────────────────────────────────────────────

def _build_context_prompt(query: str, context_chunks: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Build the messages list for Ollama chat.
    Injects retrieved code chunks into the system context.
    """
    context_parts = []
    for i, chunk in enumerate(context_chunks, 1):
        meta = chunk["metadata"]
        path = meta.get("relative_path", "unknown")
        start = meta.get("start_line", "?")
        end = meta.get("end_line", "?")
        lang = meta.get("language", "")
        context_parts.append(
            f"[{i}] {path} (lines {start}–{end}, {lang}):\n```\n{chunk['content']}\n```"
        )

    context_text = "\n\n".join(context_parts)

    system_message = (
        "You are NEXUS, an expert local software engineering assistant integrated directly into the user's IDE.\n"
        "You DO have access to the user's project files. They are provided to you in the PROJECT CONTEXT below.\n"
        "NEVER say you do not have access to files or the file system. If the context is empty, simply state that no relevant files were found for the query.\n"
        "Answer the developer's question using ONLY the project source code provided below.\n"
        "Be precise and cite the file and line ranges when referencing code.\n"
        "Do NOT invent code or APIs that are not shown in the context.\n\n"
        "If the user asks you to write, fix, or modify code, you MUST propose the changes using the following strict XML format:\n"
        '<edit file="path/to/file.ext">\n'
        '<search>\n'
        'exact code to be replaced here...\n'
        '</search>\n'
        '<replace>\n'
        'new code to replace it with...\n'
        '</replace>\n'
        '</edit>\n'
        "You can output multiple <edit> blocks if needed. Always ensure the <search> block precisely matches the existing file content.\n\n"
        f"PROJECT CONTEXT:\n{context_text}"
    )

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": query},
    ]


# ── Main RAG pipeline ──────────────────────────────────────────────────────────

async def rag_query(
    project_id: str,
    query: str,
    embed_model: str | None = None,
    llm_model: str | None = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Full RAG pipeline as an async generator yielding SSE-style events:
      - {"type": "message_start"}
      - {"type": "token", "text": "..."}
      - {"type": "sources", "sources": [...]}
      - {"type": "message_end"}
    Raises RuntimeError if Ollama is unavailable.
    """
    # 1. Embed the query
    query_embedding = await get_single_embedding(query, model=embed_model)

    # 2. Retrieve Top-K candidates
    candidates = query_similar_chunks(
        project_id=project_id,
        query_embedding=query_embedding,
        top_k=settings.RAG_TOP_K,
    )

    # 3. Filter by similarity threshold
    filtered = [c for c in candidates if c["similarity_score"] >= settings.RAG_SIMILARITY_THRESHOLD]

    # 4. Deduplicate / merge overlapping chunks
    deduped = _deduplicate_sources(filtered)

    # 5. Take top Context-K
    context_chunks = deduped[:settings.RAG_CONTEXT_K]

    # 6. Build sources response (with scores)
    sources = [
        {
            "file_id": c["metadata"].get("file_id"),
            "relative_path": c["metadata"].get("relative_path"),
            "start_line": c["metadata"].get("start_line"),
            "end_line": c["metadata"].get("end_line"),
            "language": c["metadata"].get("language"),
            "similarity_score": c["similarity_score"],
        }
        for c in context_chunks
    ]

    # 7. Build prompt
    messages = _build_context_prompt(query, context_chunks)

    # 8. Stream response with real-time performance telemetry
    import time
    start_time = time.perf_counter()
    token_count = 0

    yield {"type": "message_start"}

    try:
        async for token in stream_chat(messages, model=llm_model):
            token_count += 1
            yield {"type": "token", "text": token}
    except Exception as e:
        yield {"type": "error", "message": str(e)}
        yield {"type": "message_end"}
        return

    elapsed = max(0.01, time.perf_counter() - start_time)
    prompt_tokens = sum(len(m.get("content", "")) for m in messages) // 4
    tok_per_sec = round(token_count / elapsed, 1) if token_count > 0 else 0.0

    yield {
        "type": "telemetry",
        "tokens_per_second": tok_per_sec,
        "eval_count": token_count,
        "prompt_eval_count": prompt_tokens,
        "total_tokens": prompt_tokens + token_count,
        "latency_ms": round(elapsed * 1000, 1),
        "total_duration_ms": round(elapsed * 1000, 1)
    }

    yield {"type": "sources", "sources": sources}
    yield {"type": "message_end"}
