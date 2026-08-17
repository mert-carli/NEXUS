from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class SettingDefinition(BaseModel):
    key: str
    type: str  # "integer", "float", "boolean", "string", "enum", "array"
    default: Any
    category: str
    description: str
    security_level: str = "normal"  # "critical", "normal"
    read_only: bool = False
    
    # Validation
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[List[str]] = None

SETTING_DEFINITIONS: List[SettingDefinition] = [
    # General
    SettingDefinition(key="DEFAULT_PROJECT", type="string", default="", category="general", description="Last opened project path"),
    SettingDefinition(key="AUTO_SCAN_ON_STARTUP", type="boolean", default=True, category="general", description="Automatically scan project on startup"),
    SettingDefinition(key="INCREMENTAL_SCAN", type="boolean", default=True, category="general", description="Use incremental scanning with SHA256 hashes"),
    SettingDefinition(key="OPERATION_NOTIFICATIONS", type="boolean", default=True, category="general", description="Show notifications when operations complete"),
    SettingDefinition(key="CONFIRM_DESTRUCTIVE", type="boolean", default=True, category="general", description="Require confirmation for destructive actions"),
    
    # AI
    SettingDefinition(key="AI_PROVIDER", type="enum", default="ollama", category="ai", description="Active AI provider backend", options=["ollama", "gemini", "openai", "groq", "openrouter", "lmstudio"]),
    SettingDefinition(key="CHAT_MODEL", type="string", default="qwen2.5-coder", category="ai", description="Local Ollama model used for code reasoning and conversations"),
    SettingDefinition(key="EMBEDDING_MODEL", type="string", default="nomic-embed-text", category="ai", description="Used for semantic code search"),
    SettingDefinition(key="TEMPERATURE", type="float", default=0.2, category="ai", description="Controls response randomness / determinism", min=0.0, max=1.0),
    SettingDefinition(key="MAX_TOKENS", type="integer", default=4096, category="ai", description="LLM response token limit", min=256, max=32768),
    SettingDefinition(key="CONTEXT_WINDOW", type="integer", default=32768, category="ai", description="Model context window limit", min=2048, max=131072),
    SettingDefinition(key="GEMINI_API_KEY", type="string", default="", category="ai", description="User's private Gemini API key", security_level="critical"),
    SettingDefinition(key="OPENAI_API_KEY", type="string", default="", category="ai", description="User's private OpenAI API key", security_level="critical"),
    SettingDefinition(key="GROQ_API_KEY", type="string", default="", category="ai", description="User's private Groq API key", security_level="critical"),
    SettingDefinition(key="OPENROUTER_API_KEY", type="string", default="", category="ai", description="User's private OpenRouter API key", security_level="critical"),
    SettingDefinition(key="LMSTUDIO_BASE_URL", type="string", default="http://localhost:1234/v1", category="ai", description="LM Studio / vLLM local API base URL"),
    
    # RAG
    SettingDefinition(key="RAG_TOP_K", type="integer", default=8, category="rag", description="Number of code chunks retrieved for each query", min=1, max=20),
    SettingDefinition(key="CHUNK_SIZE", type="integer", default=500, category="rag", description="Code chunk size for vectorization", min=100, max=2000),
    SettingDefinition(key="CHUNK_OVERLAP", type="integer", default=50, category="rag", description="Code chunk overlap", min=0, max=500),
    SettingDefinition(key="SIMILARITY_THRESHOLD", type="float", default=0.70, category="rag", description="Minimum similarity relevance score", min=0.0, max=1.0),
    SettingDefinition(key="AUTO_REINDEX", type="boolean", default=True, category="rag", description="Automatically update index when files change"),
    
    # Agent
    SettingDefinition(key="AGENT_MODE", type="enum", default="ask_and_edit", category="agent", description="Agent operation mode", options=["disabled", "ask_and_edit", "full_agent"]),
    SettingDefinition(key="MAX_AGENT_ITERATIONS", type="integer", default=3, category="agent", description="Maximum number of Test -> Fix cycles", min=1, max=10),
    SettingDefinition(key="REQUIRE_APPROVAL", type="boolean", default=True, category="agent", description="Require user approval before applying changes", security_level="critical"),
    SettingDefinition(key="AUTO_TEST_AFTER_APPLY", type="boolean", default=False, category="agent", description="Automatically run tests after applying AI changes"),
    SettingDefinition(key="AUTO_FIX_FAILED_TESTS", type="boolean", default=False, category="agent", description="Allow Agent to propose fixes after failed tests"),
    SettingDefinition(key="REQUIRE_EXPLICIT_PLAN", type="boolean", default=True, category="agent", description="Require explicit Agent plan before edits"),
    SettingDefinition(key="AGENT_TIMEOUT", type="integer", default=120, category="agent", description="Timeout in seconds for agent actions", min=30, max=600),
    
    # Execution
    SettingDefinition(key="EXECUTION_POLICY", type="enum", default="strict", category="execution", description="Command execution policy", options=["strict", "balanced"], security_level="critical"),
    SettingDefinition(key="ALLOWED_COMMANDS", type="array", default=["npm", "npx", "python", "pytest", "cargo", "go"], category="execution", description="Allowed command list", options=["npm", "npx", "python", "pytest", "cargo", "go"], security_level="critical"),
    SettingDefinition(key="COMMAND_TIMEOUT", type="integer", default=60, category="execution", description="Maximum command execution time", min=5, max=600),
    
    # Security
    SettingDefinition(key="ENFORCE_PATH_SANDBOX", type="boolean", default=True, category="security", description="Enforce project root sandbox", security_level="critical"),
    SettingDefinition(key="VALIDATE_FILE_HASH", type="boolean", default=True, category="security", description="Validate file hash before applying AI changes", security_level="critical"),
    SettingDefinition(key="SCAN_FOR_SECRETS", type="boolean", default=True, category="security", description="Scan for potential secrets in source code"),
    
    # Git
    SettingDefinition(key="ENABLE_GIT", type="boolean", default=True, category="git", description="Enable Git integration"),
    SettingDefinition(key="AUTO_GIT_STATUS", type="boolean", default=True, category="git", description="Automatically refresh Git status"),
    SettingDefinition(key="REQUIRE_PUSH_CONFIRMATION", type="boolean", default=True, category="git", description="Require confirmation before push", security_level="critical"),
]

REGISTRY: Dict[str, SettingDefinition] = {s.key: s for s in SETTING_DEFINITIONS}
