"""
Ollama Service — communicates with the local Ollama instance via the AI Provider Abstraction layer.

Handles:
- Health / connection check
- Batch embedding generation
- Streaming LLM chat completions

Maintains 100% backward compatibility with all existing callers.
"""
from typing import List, Dict, Any, AsyncGenerator, Optional

from app.core.config import settings
from app.services.ai_provider import get_ai_provider, OllamaProvider


def _get_provider(db_llm_model: Optional[str] = None, db_embed_model: Optional[str] = None) -> OllamaProvider:
    config = {}
    if db_llm_model:
        config["CHAT_MODEL"] = db_llm_model
    if db_embed_model:
        config["EMBEDDING_MODEL"] = db_embed_model
    provider = get_ai_provider("ollama", config=config)
    if isinstance(provider, OllamaProvider):
        return provider
    return OllamaProvider()


# ── Health ──────────────────────────────────────────────────────────────────────

async def check_ollama_health() -> Dict[str, Any]:
    """
    Checks if Ollama is reachable and returns available model tags.
    Returns {"status": "ok"|"error", "models": [...], "message": "..."}
    """
    provider = _get_provider()
    return await provider.check_health()


# ── Embeddings ──────────────────────────────────────────────────────────────────

async def get_embeddings_batch(
    texts: List[str],
    model: str | None = None,
    batch_size: int | None = None,
) -> List[List[float]]:
    """
    Generates embeddings for a list of texts using the configured Ollama embedding model.
    Processes in batches to avoid overwhelming the API.
    Returns a flat list of embedding vectors in the same order as input texts.
    Raises RuntimeError on failure.
    """
    provider = _get_provider(db_embed_model=model)
    return await provider.get_embeddings_batch(texts, model=model, batch_size=batch_size)


async def get_single_embedding(text: str, model: str | None = None) -> List[float]:
    """Get embedding for a single text string."""
    provider = _get_provider(db_embed_model=model)
    return await provider.get_single_embedding(text, model=model)


# ── Streaming Chat ─────────────────────────────────────────────────────────────

async def stream_chat(
    messages: List[Dict[str, str]],
    model: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Streams an Ollama chat response token by token.
    Each yielded value is a token string.
    Raises RuntimeError if the request fails.
    """
    provider = _get_provider(db_llm_model=model)
    async for token in provider.stream_chat(messages, model=model):
        yield token
