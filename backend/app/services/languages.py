from pathlib import Path
from typing import Tuple

# Directories to always ignore during project scanning
IGNORED_DIRECTORIES = {
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    "venv",
    ".venv",
    "env",
    ".env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "dist",
    "build",
    "out",
    "coverage",
    ".next",
    ".nuxt",
    ".turbo",
    ".parcel-cache",
    "target",
    "bin",
    "obj",
    ".idea",
    ".vscode",
    ".gemini",
    "vendor",
    "packages",
}

# Ignored specific file names
IGNORED_FILES = {
    ".DS_Store",
    "Thumbs.db",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "poetry.lock",
    "nexus.db",
    "nexus.db-journal",
}


# Extension to Language mapping
EXTENSION_LANGUAGE_MAP = {
    # JavaScript / TypeScript
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".mts": "TypeScript",
    ".cts": "TypeScript",
    
    # Python
    ".py": "Python",
    ".pyw": "Python",
    ".ipynb": "Jupyter Notebook",
    
    # Web & Styles
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "Sass",
    ".less": "Less",
    ".vue": "Vue",
    ".svelte": "Svelte",
    
    # Systems & Compiled
    ".c": "C",
    ".h": "C/C++ Header",
    ".cpp": "C++",
    ".cxx": "C++",
    ".cc": "C++",
    ".hpp": "C++ Header",
    ".cs": "C#",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".kts": "Kotlin",
    ".scala": "Scala",
    ".dart": "Dart",
    
    # Config & Data
    ".json": "JSON",
    ".jsonc": "JSON with Comments",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".xml": "XML",
    ".sql": "SQL",
    ".graphql": "GraphQL",
    ".gql": "GraphQL",
    ".proto": "Protocol Buffers",
    ".env.example": "Env Template",
    
    # Docs & Shell
    ".md": "Markdown",
    ".markdown": "Markdown",
    ".rst": "reStructuredText",
    ".txt": "Plain Text",
    ".sh": "Shell",
    ".bash": "Bash",
    ".zsh": "Zsh",
    ".ps1": "PowerShell",
    ".bat": "Batch",
    ".cmd": "Batch",
    ".dockerfile": "Dockerfile",
}

# Common special filenames
SPECIAL_FILENAME_MAP = {
    "Dockerfile": "Dockerfile",
    "docker-compose.yml": "Docker Compose",
    "docker-compose.yaml": "Docker Compose",
    "Makefile": "Makefile",
    "CMakeLists.txt": "CMake",
    ".gitignore": "Git Ignore",
    ".editorconfig": "EditorConfig",
    "README.md": "Markdown",
}

# Binary and media extensions
BINARY_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp", ".tiff", ".psd",
    # Audio / Video
    ".mp3", ".wav", ".ogg", ".mp4", ".mkv", ".avi", ".mov", ".webm",
    # Archives / Compressed
    ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz",
    # Executables / Libraries
    ".exe", ".dll", ".so", ".dylib", ".bin", ".iso", ".msi",
    # Fonts
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
    # Database / Models
    ".db", ".sqlite", ".sqlite3", ".onnx", ".pkl", ".h5", ".bin",
    # Documents
    ".pdf", ".docx", ".xlsx", ".pptx",
}

def detect_language(path: Path) -> Tuple[str, bool]:
    """
    Returns (language_name, is_binary).
    """
    filename = path.name
    ext = path.suffix.lower()

    if filename in SPECIAL_FILENAME_MAP:
        return SPECIAL_FILENAME_MAP[filename], False

    if ext in BINARY_EXTENSIONS:
        return "Binary / Asset", True

    if ext in EXTENSION_LANGUAGE_MAP:
        return EXTENSION_LANGUAGE_MAP[ext], False

    # Fallback inspection: check if file is plain text or binary
    return "Plain Text", False

def is_binary_file(file_path: Path) -> bool:
    """
    Heuristic check to test if a file is binary by reading the first 1024 bytes.
    """
    ext = file_path.suffix.lower()
    if ext in BINARY_EXTENSIONS:
        return True
    try:
        with open(file_path, "rb") as f:
            chunk = f.read(1024)
            if b"\x00" in chunk:
                return True
        return False
    except Exception:
        return True
