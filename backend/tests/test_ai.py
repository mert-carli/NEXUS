import pytest
from app.services.chunker import chunk_file
from app.services.chunker import chunk_file
from app.services.vector_db import make_chunk_id

def test_chunker_basic():
    # Create 100 lines
    text = "\n".join([f"Line {i}" for i in range(100)])
    
    chunks = chunk_file(text, chunk_size=50, overlap=10)
    
    # Chunk 1: 0 to 49
    # Chunk 2: 40 to 89
    # Chunk 3: 80 to 99
    assert len(chunks) == 3
    assert chunks[0].start_line == 1
    assert chunks[0].end_line == 50
    assert chunks[1].start_line == 41
    assert chunks[1].end_line == 90
    assert chunks[2].start_line == 81
    assert chunks[2].end_line == 100

def test_chunk_id_generation():
    cid = make_chunk_id("proj1", "file1", 5)
    assert cid == "proj1:file1:5"
