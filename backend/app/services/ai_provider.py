"""
NEXUS AI Provider Abstraction Layer.

Defines the generic BaseAIProvider interface and implementations.
Ollama is the default, fully local AI provider.
Future providers (Gemini, OpenAI, Groq, OpenRouter, LM Studio) can plug in
by extending BaseAIProvider with user-supplied credentials.
"""
from abc import ABC, abstractmethod
import json
import logging
import httpx
from typing import List, Dict, Any, AsyncGenerator, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseAIProvider(ABC):
    """
    Abstract interface for AI inference and embedding providers.
    All providers must implement health check, batch embeddings, and streaming chat.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier for this provider (e.g. 'ollama', 'gemini')."""
        pass

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """
        Checks provider availability and returns status.
        Returns {"status": "ok"|"error", "models": [...], "message": "..."}
        """
        pass

    @abstractmethod
    async def get_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: Optional[int] = None,
    ) -> List[List[float]]:
        """
        Generates embeddings for a batch of text chunks.
        Returns a list of embedding vectors.
        """
        pass

    async def get_single_embedding(
        self,
        text: str,
        model: Optional[str] = None,
    ) -> List[float]:
        """Convenience method to get embedding for a single text string."""
        results = await self.get_embeddings_batch([text], model=model, batch_size=1)
        if not results:
            raise RuntimeError("Provider returned empty embedding result.")
        return results[0]

    @abstractmethod
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """
        Streams chat completion tokens one by one.
        Yields individual token strings.
        """
        pass


class OllamaProvider(BaseAIProvider):
    """
    Default Local AI Provider communicating with local Ollama instance.
    Zero external dependencies, 100% private and offline-capable.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        default_llm_model: Optional[str] = None,
        default_embed_model: Optional[str] = None,
    ):
        self._base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self._default_llm_model = default_llm_model or settings.OLLAMA_LLM_MODEL
        self._default_embed_model = default_embed_model or settings.OLLAMA_EMBED_MODEL

    @property
    def provider_name(self) -> str:
        return "ollama"

    def _url(self, path: str) -> str:
        return f"{self._base_url}{path}"

    async def _resolve_model_name(self, requested_model: str, client: httpx.AsyncClient) -> str:
        """
        Resolves model name against available tags in Ollama.
        If 'qwen2.5-coder' is requested and 'qwen2.5-coder:latest' exists, matches it seamlessly.
        """
        try:
            resp = await client.get(self._url("/api/tags"), timeout=5.0)
            if resp.status_code == 200:
                tags = [m["name"] for m in resp.json().get("models", [])]
                if requested_model in tags:
                    return requested_model
                # Try matching without / with tag
                for tag in tags:
                    tag_base = tag.split(":")[0]
                    if tag_base == requested_model or tag == f"{requested_model}:latest":
                        return tag
                # If requested model has base match
                req_base = requested_model.split(":")[0]
                for tag in tags:
                    if tag.startswith(req_base):
                        return tag
        except Exception:
            pass
        return requested_model

    async def check_health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(self._url("/api/tags"))
                resp.raise_for_status()
                data = resp.json()
                models = [m["name"] for m in data.get("models", [])]
                return {"status": "ok", "models": models, "message": "Ollama is running."}
        except httpx.ConnectError:
            return {"status": "error", "models": [], "message": f"Cannot connect to Ollama at {self._base_url}"}
        except Exception as e:
            return {"status": "error", "models": [], "message": str(e)}

    async def get_embeddings_batch(
        self,
        texts: List[str],
        model: Optional[str] = None,
        batch_size: Optional[int] = None,
    ) -> List[List[float]]:
        if not texts:
            return []

        raw_model = model or self._default_embed_model
        bs = batch_size or settings.EMBEDDING_BATCH_SIZE
        all_embeddings: List[List[float]] = []

        async with httpx.AsyncClient(timeout=120.0) as client:
            active_model = await self._resolve_model_name(raw_model, client)
            for i in range(0, len(texts), bs):
                batch = texts[i : i + bs]
                try:
                    resp = await client.post(
                        self._url("/api/embed"),
                        json={"model": active_model, "input": batch},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    embeddings = data.get("embeddings", [])
                    if len(embeddings) != len(batch):
                        raise RuntimeError(
                            f"Embedding count mismatch: sent {len(batch)}, received {len(embeddings)}"
                        )
                    all_embeddings.extend(embeddings)
                except httpx.HTTPStatusError as e:
                    err_msg = e.response.text if hasattr(e.response, "text") else str(e)
                    raise RuntimeError(f"Ollama embedding request failed (HTTP {e.response.status_code}): {err_msg}") from e
                except httpx.ConnectError:
                    raise RuntimeError(f"Cannot connect to Ollama at {self._base_url}")

        return all_embeddings

    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        raw_model = model or self._default_llm_model

        async with httpx.AsyncClient(timeout=300.0) as client:
            active_model = await self._resolve_model_name(raw_model, client)
            payload = {
                "model": active_model,
                "messages": messages,
                "stream": True,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens
                }
            }

            try:
                async with client.stream(
                    "POST",
                    self._url("/api/chat"),
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        err_body = await response.aread()
                        err_text = err_body.decode("utf-8", errors="ignore")
                        raise RuntimeError(f"Ollama chat error (HTTP {response.status_code}): {err_text}")

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            chunk = json.loads(line)
                            token = chunk.get("message", {}).get("content", "")
                            if token:
                                yield token
                            if chunk.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
            except httpx.ConnectError:
                raise RuntimeError(f"Cannot connect to Ollama at {self._base_url}. Please ensure Ollama is running.")


# ── Provider Factory & Registry ────────────────────────────────────────────────

_DEFAULT_PROVIDER = OllamaProvider()


def get_ai_provider(
    provider_name: str = "ollama",
    config: Optional[Dict[str, Any]] = None,
) -> BaseAIProvider:
    """
    Factory to retrieve an AI provider instance.
    Ollama is the default provider.
    Future cloud providers (Gemini, OpenAI, Groq, OpenRouter, LM Studio)
    will be instantiated here with user-specific credentials without hardcoded keys.
    """
    normalized = (provider_name or "ollama").lower().strip()
    config = config or {}

    if normalized == "ollama":
        base_url = config.get("OLLAMA_BASE_URL") or settings.OLLAMA_BASE_URL
        llm_model = config.get("CHAT_MODEL") or config.get("OLLAMA_LLM_MODEL") or settings.OLLAMA_LLM_MODEL
        embed_model = config.get("EMBEDDING_MODEL") or config.get("OLLAMA_EMBED_MODEL") or settings.OLLAMA_EMBED_MODEL
        return OllamaProvider(
            base_url=base_url,
            default_llm_model=llm_model,
            default_embed_model=embed_model,
        )

    # If an unconfigured cloud provider is requested, raise explicit error with no silent fallback
    raise ValueError(
        f"Provider '{provider_name}' is not configured. Please select 'ollama' or configure provider credentials in Settings."
    )
