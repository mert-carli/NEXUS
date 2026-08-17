export const BASE_URL = "http://127.0.0.1:8000/api/v1"

export interface ProjectCreate {
  path: string
}

export interface ScanEventData {
  id: string
  scanned_at: string
  added_count: number
  modified_count: number
  deleted_count: number
  unmodified_count: number
  total_files: number
  duration_ms: number
  summary: string | null
}

export interface ProjectData {
  id: string
  name: string
  path: string
  created_at: string
  updated_at: string
  last_scanned_at: string | null
  total_files: number
  source_files: number
  binary_files: number
  total_lines: number
  languages: Record<string, number>
  is_git_repo: boolean
  git_branch: string | null
  git_commit_hash: string | null
  git_commit_message: string | null
  git_is_dirty: boolean
  git_modified_files_count: number
  latest_scan: ScanEventData | null
  index_status?: string
  test_command?: string
}

export interface ProjectListItem {
  id: string
  name: string
  path: string
  total_files: number
  source_files: number
  total_lines: number
  last_scanned_at: string | null
  git_branch: string | null
  git_is_dirty: boolean
  test_command?: string
}

export interface FileData {
  id: string
  project_id: string
  relative_path: string
  filename: string
  extension: string
  language: string
  size_bytes: number
  lines_count: number
  file_hash: string
  is_binary: boolean
  latest_scan_status: "ADDED" | "MODIFIED" | "DELETED" | "UNMODIFIED"
  last_modified_at: string
}

export interface FileTreeNode {
  name: string
  path: string
  is_dir: boolean
  id?: string
  language?: string
  size_bytes?: number
  lines_count?: number
  latest_scan_status?: string
  children?: FileTreeNode[]
}

export interface FileContentData {
  id: string
  relative_path: string
  filename: string
  language: string
  size_bytes: number
  lines_count: number
  is_binary: boolean
  content: string | null
  file_hash: string
  error: string | null
  message: string | null
}

export interface SystemSettings {
  general: Record<string, any>
  ai: Record<string, any>
  rag: Record<string, any>
  agent: Record<string, any>
  execution: Record<string, any>
  security: Record<string, any>
  git: Record<string, any>
  
  // Legacy
  OLLAMA_LLM_MODEL?: string
  OLLAMA_EMBED_MODEL?: string
  RAG_TOP_K?: number
  RAG_CONTEXT_K?: number
  RAG_SIMILARITY_THRESHOLD?: number
  EMBEDDING_BATCH_SIZE?: number
  CHROMA_DB_PATH?: string
}

export interface SettingDefinition {
  key: string
  type: string
  default: any
  category: string
  description: string
  security_level: string
  read_only: boolean
  min?: number
  max?: number
  options?: string[]
}

export interface OllamaHealth {
  status: string
  models?: string[]
  message?: string
}

export interface IntelligenceNode {
  id: string
  name: string
  path: string
  language: string
  lines: number
  size_bytes: number
  chunks_count: number
  functions_count: number
  classes_count: number
  functions: string[]
  classes: string[]
  indexed: boolean
  color: string
}

export interface IntelligenceLink {
  source: string
  target: string
  relation: string
  weight: number
}

export interface IntelligenceLanguage {
  name: string
  count: number
  percentage: number
  color: string
}

export interface CodebaseIntelligenceData {
  metrics: {
    total_files: number
    source_files: number
    total_chunks: number
    total_functions: number
    total_classes: number
    index_percentage: number
    indexed_files: number
  }
  languages: IntelligenceLanguage[]
  graph: {
    nodes: IntelligenceNode[]
    links: IntelligenceLink[]
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (!res.ok) {
    let detail: { error?: string; message?: string } = {}
    try {
      const body = await res.json()
      detail = body.detail ?? body
    } catch {
      // ignore parse errors
    }
    const msg = detail.message ?? `HTTP ${res.status}: ${res.statusText}`
    throw new Error(msg)
  }

  return res.json()
}

export interface GuardThreatItem {
  id: string
  timestamp: string
  rule: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  reason: string
  target: string
  action: string
  details?: string
}

export interface GuardStatusData {
  status: 'ACTIVE' | 'DEGRADED' | 'DISABLED'
  threats_blocked: number
  protections: {
    path_protection: { name: string; status: string; description: string }
    command_safety: { name: string; status: string; description: string }
    protected_files: { name: string; status: string; description: string }
    diff_validation: { name: string; status: string; description: string }
    workspace_boundary: { name: string; status: string; description: string }
  }
  recent_threats: GuardThreatItem[]
}

export interface ProjectReadinessData {
  score: number
  max_score: number
  tier: 'OPTIMAL' | 'EXCELLENT' | 'ATTENTION NEEDED' | 'CRITICAL'
  subsystems: {
    backend: { name: string; status: string; score: number; max: number }
    ollama: { name: string; status: string; score: number; max: number; models?: string[] }
    chroma: { name: string; status: string; score: number; max: number }
    git: { name: string; status: string; score: number; max: number; branch?: string }
    indexer: { name: string; status: string; score: number; max: number }
  }
  last_scanned_at?: string | null
}

export interface TimelineItem {
  id: string
  time: string
  category: 'all' | 'ai' | 'rag' | 'security' | 'index' | 'scan' | 'git' | 'system'
  icon: string
  title: string
  detail?: string
  status?: 'running' | 'done' | 'pending' | 'failed'
  badge?: string
}

export interface ProjectTimelineData {
  project_id: string
  timeline: TimelineItem[]
}

export const api = {
  health: () => request<{ status: string; message: string }>("/health"),
  ollamaHealth: () => request<OllamaHealth>("/health/ollama"),
  chromaHealth: () => request<{ status: string; message?: string }>("/health/chroma"),
  guardStatus: () => request<GuardStatusData>("/health/guard"),
  simulateGuardThreat: () => request<{ status: string; threat: GuardThreatItem }>("/health/guard/simulate", { method: "POST" }),
  getProjectReadiness: (projectId: string) => request<ProjectReadinessData>(`/health/project-readiness/${projectId}`),
  getTimeline: (projectId: string) => request<ProjectTimelineData>(`/projects/${projectId}/timeline`),

  getSettings: () => request<SystemSettings>("/settings"),
  getSettingsDefinitions: () => request<SettingDefinition[]>("/settings/definitions"),
  updateSettings: (data: Record<string, any>) =>
    request<SystemSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  resetSettings: () => request<SystemSettings>("/settings/reset", { method: "POST" }),

  openProject: (path: string) =>
    request<ProjectData>("/projects", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  listProjects: () => request<ProjectListItem[]>("/projects"),

  getProject: (id: string) => request<ProjectData>(`/projects/${id}`),

  getIntelligence: (id: string) => request<CodebaseIntelligenceData>(`/projects/${id}/intelligence`),

  rescanProject: (id: string) =>
    request<ProjectData>(`/projects/${id}/scan`, { method: "POST" }),

  deleteProject: (id: string) =>
    request<{ status: string; message: string }>(`/projects/${id}`, {
      method: "DELETE",
    }),

  updateProject: (id: string, data: { test_command?: string }) =>
    request<ProjectData>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  runTests: (id: string) =>
    request<{ success: boolean; output: string; exit_code: number }>(`/projects/${id}/run-tests`, {
      method: "POST",
    }),

  // ── Files ──────────────────────────────────────────────────────────────────

  getFileTree: (projectId: string) =>
    request<{ tree: FileTreeNode[] }>(`/projects/${projectId}/files?tree=true`),

  getFiles: (projectId: string) =>
    request<{ files: FileData[] }>(`/projects/${projectId}/files`),

  getFileContent: (projectId: string, fileId: string) =>
    request<FileContentData>(`/projects/${projectId}/files/${fileId}/content`),

  applyEdit: (projectId: string, data: { file_path: string; search_text: string; replace_text: string; expected_hash: string }) =>
    request<{ status: string; message: string }>(`/projects/${projectId}/files/apply-edit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  validateChanges: (projectId: string, edits: { file_path: string; search_text: string; replace_text: string; expected_hash?: string }[]) =>
    request<{
      valid: boolean
      total_files: number
      total_additions: number
      total_deletions: number
      risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
      risk_reason: string
      validations: {
        file_path: string
        status: string
        additions: number
        deletions: number
        match_ratio: number
        syntax_valid: boolean
        path_valid: boolean
        security_clean: boolean
        warnings: string[]
      }[]
      checks: {
        syntax_validation: boolean
        security_validation: boolean
        path_validation: boolean
        diff_consistency: boolean
        tests_preview: boolean
      }
    }>(`/projects/${projectId}/files/validate-changes`, {
      method: "POST",
      body: JSON.stringify({ edits }),
    }),

  applyBatchEdits: (projectId: string, edits: { file_path: string; search_text: string; replace_text: string; expected_hash?: string }[], runTests: boolean = true) =>
    request<{
      status: string
      applied_count: number
      applied_files: string[]
      tests_run: boolean
      tests_passed: boolean
      test_output: string
    }>(`/projects/${projectId}/files/apply-batch-edits`, {
      method: "POST",
      body: JSON.stringify({ edits, run_tests_after: runTests }),
    }),
}
