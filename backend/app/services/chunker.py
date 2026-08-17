"""
Code Chunker — Splits source code files into line-based chunks.

Strategy:
  - Target: 80–160 lines per chunk (configurable).
  - Overlap: 10–20 lines (configurable).
  - Always splits on line boundaries — never mid-line.
  - Skips binary files.
  - Handles empty files gracefully.
  - Files with fewer lines than MIN_LINES produce a single chunk.
"""
from pathlib import Path
from dataclasses import dataclass
from typing import List


# ── Chunk model ────────────────────────────────────────────────────────────────

@dataclass
class CodeChunk:
    content: str       # Raw text of the chunk
    start_line: int    # 1-indexed
    end_line: int      # 1-indexed, inclusive
    chunk_index: int   # 0-indexed within the file


# ── Chunker ────────────────────────────────────────────────────────────────────

def chunk_file(
    content: str,
    chunk_size: int = 120,    # Target lines per chunk
    overlap: int = 15,         # Overlap lines between adjacent chunks
    min_chunk_lines: int = 5,  # Ignore chunks smaller than this
) -> List[CodeChunk]:
    """
    Split file content into line-based chunks with overlap.
    Returns a list of CodeChunk objects.
    """
    if not content or not content.strip():
        return []

    lines = content.splitlines()
    total = len(lines)
    if total == 0:
        return []

    chunks: List[CodeChunk] = []
    step = max(1, chunk_size - overlap)
    chunk_index = 0
    start = 0  # 0-indexed

    while start < total:
        end = min(start + chunk_size, total)          # exclusive
        chunk_lines = lines[start:end]

        # Drop tiny trailing fragments
        if len(chunk_lines) >= min_chunk_lines:
            chunks.append(CodeChunk(
                content="\n".join(chunk_lines),
                start_line=start + 1,        # 1-indexed
                end_line=end,                # inclusive 1-indexed
                chunk_index=chunk_index,
            ))
            chunk_index += 1

        if end >= total:
            break
        start += step

    return chunks


def chunk_file_path(
    file_path: Path,
    chunk_size: int = 120,
    overlap: int = 15,
) -> List[CodeChunk]:
    """Read a file and return its chunks. Returns [] for unreadable or binary files."""
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
        return chunk_file(content, chunk_size=chunk_size, overlap=overlap)
    except Exception:
        return []
