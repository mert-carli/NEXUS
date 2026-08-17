import json
import logging
from enum import Enum
from typing import AsyncGenerator, Dict, Any

from app.core.config import settings
from app.services.ollama_service import get_single_embedding, stream_chat
from app.services.vector_db import query_similar_chunks
from app.services.rag_service import _deduplicate_sources

logger = logging.getLogger(__name__)

class AgentState(str, Enum):
    IDLE = "IDLE"
    ANALYZING = "ANALYZING"
    PLANNING = "PLANNING"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    PROPOSING = "PROPOSING"
    APPLYING = "APPLYING"
    TESTING = "TESTING"
    FIXING = "FIXING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"

def _build_agent_prompt(query: str, context_chunks: list[dict]) -> list[dict]:
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
        "You are NEXUS, an expert local software engineering agent integrated directly into the user's IDE.\n"
        "You DO have access to the user's project files. They are provided to you in the PROJECT CONTEXT below.\n"
        "NEVER say you do not have access to files or the file system. If the context is empty, simply state that no relevant files were found for the query.\n"
        "Your task is to safely modify, debug, or refactor code based on the user's request and the provided context.\n"
        "Do NOT invent code or APIs that are not shown in the context.\n\n"
        "CRITICAL INSTRUCTION: You MUST follow a strict two-step process:\n"
        "1. First, output a detailed plan in JSON format enclosed within <plan>...</plan> tags.\n"
        "   The JSON must have 'goal' (string) and 'steps' (array of strings).\n"
        "2. Then, propose the code changes using the following strict XML format:\n"
        '<edit file="path/to/file.ext">\n'
        '<search>\n'
        'exact code to be replaced here...\n'
        '</search>\n'
        '<replace>\n'
        'new code to replace it with...\n'
        '</replace>\n'
        '</edit>\n\n'
        "You can output multiple <edit> blocks if needed. Always ensure the <search> block precisely matches the existing file content including leading whitespace.\n\n"
        f"PROJECT CONTEXT:\n{context_text}"
    )

    return [
        {"role": "system", "content": system_message},
        {"role": "user", "content": query},
    ]

async def agent_workflow(
    project_id: str,
    query: str,
    embed_model: str | None = None,
    llm_model: str | None = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    
    yield {"type": "state", "status": AgentState.ANALYZING.value}
    yield {"type": "step", "step_id": "understand", "title": "Understanding request", "status": "running"}

    # 1. RAG Retrieval
    query_embedding = await get_single_embedding(query, model=embed_model)
    yield {"type": "step", "step_id": "understand", "title": "Understanding request", "status": "done"}
    yield {"type": "step", "step_id": "search", "title": "Searching codebase & vector index", "status": "running"}

    candidates = query_similar_chunks(
        project_id=project_id,
        query_embedding=query_embedding,
        top_k=settings.RAG_TOP_K,
    )
    filtered = [c for c in candidates if c["similarity_score"] >= settings.RAG_SIMILARITY_THRESHOLD]
    context_chunks = _deduplicate_sources(filtered)[:settings.RAG_CONTEXT_K]

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

    yield {
        "type": "step", 
        "step_id": "retrieved", 
        "title": f"Retrieved {len(context_chunks)} relevant code chunks", 
        "status": "done",
        "detail": f"{len(sources)} related files matched"
    }

    yield {"type": "step", "step_id": "analyze", "title": "Analyzing architecture & context", "status": "running"}
    messages = _build_agent_prompt(query, context_chunks)
    yield {"type": "step", "step_id": "analyze", "title": "Context analyzed", "status": "done"}

    yield {"type": "state", "status": AgentState.PLANNING.value}
    yield {"type": "step", "step_id": "plan", "title": "Preparing modification plan", "status": "running"}
    yield {"type": "message_start"}

    # We will buffer the text to parse the plan JSON
    import time
    start_time = time.perf_counter()
    token_count = 0
    buffer = ""
    in_plan_tag = False
    plan_json_str = ""
    plan_parsed = False
    
    try:
        async for token in stream_chat(messages, model=llm_model):
            token_count += 1
            buffer += token
            
            # Parse logic
            if not plan_parsed:
                if "<plan>" in buffer and not in_plan_tag:
                    in_plan_tag = True
                    plan_start = buffer.find("<plan>") + len("<plan>")
                    plan_json_str = buffer[plan_start:]
                elif in_plan_tag:
                    plan_json_str += token
                    if "</plan>" in plan_json_str:
                        plan_end = plan_json_str.find("</plan>")
                        raw_json = plan_json_str[:plan_end].strip()
                        try:
                            plan_data = json.loads(raw_json)
                            yield {"type": "plan", "goal": plan_data.get("goal", ""), "steps": plan_data.get("steps", [])}
                            yield {
                                "type": "step", 
                                "step_id": "plan", 
                                "title": "Plan formulated", 
                                "status": "done", 
                                "detail": plan_data.get("goal")
                            }
                        except json.JSONDecodeError:
                            logger.error(f"Agent produced invalid plan JSON: {raw_json}")
                            yield {"type": "plan", "goal": "Invalid plan format", "steps": []}
                            yield {"type": "step", "step_id": "plan", "title": "Plan formulated", "status": "done"}
                        
                        plan_parsed = True
                        in_plan_tag = False
                        yield {"type": "state", "status": AgentState.PROPOSING.value}
                        yield {"type": "step", "step_id": "generate", "title": "Generating code changes", "status": "running"}
            
            yield {"type": "token", "text": token}
    except Exception as e:
        yield {"type": "error", "message": str(e)}
        yield {"type": "state", "status": AgentState.FAILED.value}
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

    yield {"type": "step", "step_id": "generate", "title": "Code changes generated", "status": "done"}
    yield {"type": "step", "step_id": "validate", "title": "Ready for verification & test run", "status": "pending"}
    yield {"type": "sources", "sources": sources}
    yield {"type": "state", "status": AgentState.WAITING_APPROVAL.value}
    yield {"type": "message_end"}
