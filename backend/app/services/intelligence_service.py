import re
import os
from pathlib import Path
from typing import Dict, List, Any, Set, Tuple
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.file import ProjectFile
from app.services.chunker import chunk_file_path
from app.services.vector_db import get_or_create_collection

# Patterns for extracting functions and classes across common languages
PATTERNS = {
    "python": {
        "function": re.compile(r"^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(", re.MULTILINE),
        "class": re.compile(r"^\s*class\s+([a-zA-Z0-9_]+)\s*(?:\(.*\))?:", re.MULTILINE),
        "import": [
            re.compile(r"^\s*(?:from\s+([a-zA-Z0-9_.]+)\s+import)", re.MULTILINE),
            re.compile(r"^\s*(?:import\s+([a-zA-Z0-9_.]+))", re.MULTILINE),
        ]
    },
    "typescript": {
        "function": re.compile(r"(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>", re.MULTILINE),
        "class": re.compile(r"(?:export\s+)?(?:abstract\s+)?(?:class|interface|type)\s+([a-zA-Z0-9_]+)", re.MULTILINE),
        "import": [
            re.compile(r"""(?:import|from)\s+['"]([^'"]+)['"]""", re.MULTILINE),
            re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""", re.MULTILINE),
        ]
    },
    "javascript": {
        "function": re.compile(r"(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>", re.MULTILINE),
        "class": re.compile(r"(?:export\s+)?class\s+([a-zA-Z0-9_]+)", re.MULTILINE),
        "import": [
            re.compile(r"""(?:import|from)\s+['"]([^'"]+)['"]""", re.MULTILINE),
            re.compile(r"""require\s*\(\s*['"]([^'"]+)['"]\s*\)""", re.MULTILINE),
        ]
    },
    "go": {
        "function": re.compile(r"func\s+(?:\([^)]*\)\s+)?([a-zA-Z0-9_]+)\s*\(", re.MULTILINE),
        "class": re.compile(r"type\s+([a-zA-Z0-9_]+)\s+struct", re.MULTILINE),
        "import": [re.compile(r"""import\s+['"]([^'"]+)['"]""", re.MULTILINE)]
    },
    "rust": {
        "function": re.compile(r"(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)", re.MULTILINE),
        "class": re.compile(r"(?:pub\s+)?(?:struct|enum|trait)\s+([a-zA-Z0-9_]+)", re.MULTILINE),
        "import": [re.compile(r"use\s+([a-zA-Z0-9_:]+);", re.MULTILINE)]
    },
    "generic": {
        "function": re.compile(r"(?:function|def|fn|func)\s+([a-zA-Z0-9_]+)", re.MULTILINE),
        "class": re.compile(r"(?:class|interface|struct)\s+([a-zA-Z0-9_]+)", re.MULTILINE),
        "import": []
    }
}

LANGUAGE_COLORS = {
    "Python": "#3B82F6",
    "TypeScript": "#3178C6",
    "JavaScript": "#F7DF1E",
    "HTML": "#E34F26",
    "CSS": "#1572B6",
    "Go": "#00ADD8",
    "Rust": "#DEA584",
    "Java": "#B07219",
    "C++": "#F34B7D",
    "C": "#555555",
    "Shell": "#89E051",
    "JSON": "#292929",
    "Markdown": "#083FA1",
    "YAML": "#CB171E",
    "SQL": "#E38C00",
}

def analyze_file_symbols(file_path: Path, language: str) -> Dict[str, Any]:
    """Extract functions, classes, and imported targets from file content."""
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return {"functions": [], "classes": [], "raw_imports": []}

    lang_key = language.lower() if language.lower() in PATTERNS else "generic"
    patterns = PATTERNS[lang_key]

    functions = []
    for match in patterns["function"].finditer(content):
        name = next((g for g in match.groups() if g), None)
        if name and name not in functions and len(name) < 40:
            functions.append(name)

    classes = []
    for match in patterns["class"].finditer(content):
        name = next((g for g in match.groups() if g), None)
        if name and name not in classes and len(name) < 40:
            classes.append(name)

    raw_imports = []
    for imp_pattern in patterns.get("import", []):
        for match in imp_pattern.finditer(content):
            val = match.group(1).strip()
            if val:
                raw_imports.append(val)

    return {
        "functions": functions[:30],  # cap to avoid overload
        "classes": classes[:20],
        "raw_imports": raw_imports[:30]
    }


def get_codebase_intelligence(db: Session, project: Project) -> Dict[str, Any]:
    """Calculates comprehensive codebase metrics, symbol analysis, and interactive semantic graph."""
    project_root = Path(project.path)
    files = db.query(ProjectFile).filter(
        ProjectFile.project_id == project.id,
        ProjectFile.is_binary == False
    ).all()

    total_files_count = project.total_files or len(files)
    source_files_count = len(files)
    
    # Try querying ChromaDB collection count
    chroma_chunks_count = 0
    try:
        collection = get_or_create_collection(project.id)
        chroma_chunks_count = collection.count()
    except Exception:
        chroma_chunks_count = 0

    total_chunks = 0
    total_functions = 0
    total_classes = 0
    indexed_files_count = 0

    nodes = []
    path_to_id = {}
    file_symbol_data = {}

    for f in files:
        full_path = project_root / f.relative_path
        if f.indexed_hash:
            indexed_files_count += 1

        # File chunk count
        f_chunks = 0
        if full_path.exists():
            chunks = chunk_file_path(full_path)
            f_chunks = len(chunks)
            total_chunks += f_chunks
            
            # Analyze symbols & imports
            symbols = analyze_file_symbols(full_path, f.language)
            file_symbol_data[f.relative_path] = symbols
            total_functions += len(symbols["functions"])
            total_classes += len(symbols["classes"])
        else:
            file_symbol_data[f.relative_path] = {"functions": [], "classes": [], "raw_imports": []}

        node_id = f.id
        path_to_id[f.relative_path] = node_id
        # Also map without extension and basename for flexible import matching
        stem = Path(f.relative_path).stem
        path_to_id[stem] = node_id

        nodes.append({
            "id": node_id,
            "name": f.filename,
            "path": f.relative_path,
            "language": f.language,
            "lines": f.lines_count,
            "size_bytes": f.size_bytes,
            "chunks_count": f_chunks,
            "functions_count": len(file_symbol_data[f.relative_path]["functions"]),
            "classes_count": len(file_symbol_data[f.relative_path]["classes"]),
            "functions": file_symbol_data[f.relative_path]["functions"],
            "classes": file_symbol_data[f.relative_path]["classes"],
            "indexed": bool(f.indexed_hash),
            "color": LANGUAGE_COLORS.get(f.language, "#8B949E")
        })

    # If Chroma has more accurate indexed chunks count, use maximum
    if chroma_chunks_count > 0:
        total_chunks = max(total_chunks, chroma_chunks_count)

    # Build Links / Graph Edges based on imports and directory locality
    links = []
    link_set = set()

    for rel_path, sym_info in file_symbol_data.items():
        source_id = path_to_id.get(rel_path)
        if not source_id:
            continue

        raw_imps = sym_info["raw_imports"]
        for imp in raw_imps:
            # Check direct relative path match or stem match
            target_id = None
            clean_imp = imp.replace("@/", "").replace("./", "").replace("../", "")
            imp_stem = Path(clean_imp).stem

            if clean_imp in path_to_id:
                target_id = path_to_id[clean_imp]
            elif imp_stem in path_to_id:
                target_id = path_to_id[imp_stem]

            if target_id and target_id != source_id:
                link_key = f"{source_id}->{target_id}"
                if link_key not in link_set:
                    link_set.add(link_key)
                    links.append({
                        "source": source_id,
                        "target": target_id,
                        "relation": "import",
                        "weight": 2
                    })

    # Add sibling directory connections if graph is sparse
    if len(links) < len(nodes) * 0.8:
        dir_groups: Dict[str, List[str]] = {}
        for f in files:
            parent_dir = str(Path(f.relative_path).parent)
            dir_groups.setdefault(parent_dir, []).append(f.id)

        for group in dir_groups.values():
            for i in range(len(group) - 1):
                s, t = group[i], group[i+1]
                key = f"{s}->{t}"
                if key not in link_set and len(links) < 250:
                    link_set.add(key)
                    links.append({
                        "source": s,
                        "target": t,
                        "relation": "module_sibling",
                        "weight": 1
                    })

    # Calculate index percentage
    index_percent = 0
    if source_files_count > 0:
        index_percent = round((indexed_files_count / source_files_count) * 100)

    # Calculate Languages percentages
    raw_languages = {}
    import json
    if project.languages_json:
        try:
            raw_languages = json.loads(project.languages_json)
        except Exception:
            raw_languages = {}

    total_lang_files = sum(raw_languages.values()) or 1
    languages_list = []
    for lang, count in sorted(raw_languages.items(), key=lambda x: x[1], reverse=True):
        pct = round((count / total_lang_files) * 100)
        languages_list.append({
            "name": lang,
            "count": count,
            "percentage": pct,
            "color": LANGUAGE_COLORS.get(lang, "#8B949E")
        })

    return {
        "metrics": {
            "total_files": total_files_count,
            "source_files": source_files_count,
            "total_chunks": total_chunks,
            "total_functions": total_functions,
            "total_classes": total_classes,
            "index_percentage": index_percent,
            "indexed_files": indexed_files_count,
        },
        "languages": languages_list,
        "graph": {
            "nodes": nodes,
            "links": links
        }
    }
