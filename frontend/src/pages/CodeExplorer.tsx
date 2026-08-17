import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MonacoEditor from '@monaco-editor/react'
import {
  ChevronRight, ChevronDown, FileCode, FolderOpen, Folder,
  Binary, Info, Bot, Network, Search, Sparkles, Code2, ArrowRight,
  Bug, FlaskConical, Link2, Zap
} from 'lucide-react'
import { api } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { FileTreeNode, FileContentData, CodebaseIntelligenceData } from '@/services/api'

// ── Language → Monaco language ID mapping ─────────────────────────────────
const LANGUAGE_MAP: Record<string, string> = {
  'TypeScript': 'typescript',
  'TypeScript (React)': 'typescript',
  'JavaScript': 'javascript',
  'JavaScript (React)': 'javascript',
  'Python': 'python',
  'HTML': 'html',
  'CSS': 'css',
  'SCSS': 'scss',
  'JSON': 'json',
  'JSON with Comments': 'json',
  'YAML': 'yaml',
  'Markdown': 'markdown',
  'Shell': 'shell',
  'Bash': 'shell',
  'PowerShell': 'powershell',
  'SQL': 'sql',
  'C': 'c',
  'C++': 'cpp',
  'C#': 'csharp',
  'Java': 'java',
  'Go': 'go',
  'Rust': 'rust',
  'Ruby': 'ruby',
  'PHP': 'php',
  'XML': 'xml',
  'Dockerfile': 'dockerfile',
}

function getMonacoLang(language: string): string {
  return LANGUAGE_MAP[language] ?? 'plaintext'
}

// ── Status badge ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  ADDED:       'bg-[#22C55E]/10 text-[#22C55E]',
  MODIFIED:    'bg-[#F59E0B]/10 text-[#F59E0B]',
  DELETED:     'bg-[#EF4444]/10 text-[#EF4444]',
  UNMODIFIED:  '',
}

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'UNMODIFIED') return null
  return (
    <span className={`ml-1.5 px-1 py-0.5 rounded text-[10px] font-mono uppercase ${STATUS_STYLES[status] ?? ''}`}>
      {status === 'ADDED' ? 'NEW' : status.slice(0, 3)}
    </span>
  )
}

// ── File Tree Node ───────────────────────────────────────────────────────────
function TreeNodeRow({
  node,
  depth,
  selectedFileId,
  onSelect,
  onContextMenu,
}: {
  node: FileTreeNode
  depth: number
  selectedFileId: string | null
  onSelect: (id: string) => void
  onContextMenu: (e: React.MouseEvent, path: string) => void
}) {
  const [open, setOpen] = useState(depth === 0)

  if (node.is_dir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1 px-2 py-1 rounded text-xs text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#0D1117] transition-colors text-left"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]/70" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]/70" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFileId={selectedFileId}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isSelected = node.id === selectedFileId
  return (
    <button
      onClick={() => node.id && onSelect(node.id)}
      onContextMenu={(e) => {
        e.preventDefault()
        if (node.id) onSelect(node.id)
        onContextMenu(e, node.path)
      }}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors text-left truncate ${
        isSelected
          ? 'bg-[#18A957]/10 text-[#F3F4F6] border-l-2 border-[#18A957]'
          : 'text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#0D1117]'
      }`}
      style={{ paddingLeft: `${isSelected ? 6 + depth * 14 : 8 + depth * 14}px` }}
    >
      <FileCode className="h-3.5 w-3.5 shrink-0 opacity-60" />
      <span className="truncate">{node.name}</span>
      <StatusBadge status={node.latest_scan_status} />
    </button>
  )
}

// ── Search filter helper ────────────────────────────────────────────────────
function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  return nodes
    .map((node) => {
      if (node.is_dir) {
        const filteredChildren = filterTree(node.children ?? [], query)
        if (filteredChildren.length > 0 || node.name.toLowerCase().includes(q)) {
          return { ...node, children: filteredChildren }
        }
        return null
      }
      return node.name.toLowerCase().includes(q) ? node : null
    })
    .filter(Boolean) as FileTreeNode[]
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  filePath: string
}

// ── Code Explorer ────────────────────────────────────────────────────────────
export default function CodeExplorer() {
  const { activeProject, selectedFileId, setSelectedFileId, fileTree, setFileTree, jumpToLine, setJumpToLine } = useProjectStore()
  const { uiSettings } = useSettingsStore()
  const navigate = useNavigate()
  const [fileContent, setFileContent] = useState<FileContentData | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)
  const [editor, setEditor] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [intelData, setIntelData] = useState<CodebaseIntelligenceData | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0, filePath: '' })

  // Global click listener to close context menu
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu.isOpen) {
        setContextMenu(prev => ({ ...prev, isOpen: false }))
      }
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [contextMenu.isOpen])

  // Load file tree when project changes
  useEffect(() => {
    if (!activeProject) return
    api.getFileTree(activeProject.id).then((res) => setFileTree(res.tree))
    api.getIntelligence(activeProject.id).then(setIntelData).catch(() => {})
  }, [activeProject, setFileTree])

  // Load file content when selection changes
  useEffect(() => {
    if (!activeProject || !selectedFileId) {
      setFileContent(null)
      return
    }
    setLoadingContent(true)
    api.getFileContent(activeProject.id, selectedFileId)
      .then(setFileContent)
      .catch(() => setFileContent(null))
      .finally(() => setLoadingContent(false))
  }, [activeProject, selectedFileId])

  // Handle jump to line
  useEffect(() => {
    if (editor && jumpToLine) {
      editor.revealLineInCenter(jumpToLine)
      editor.setPosition({ lineNumber: jumpToLine, column: 1 })
      editor.focus()
      // Clear after jump
      setJumpToLine(null)
    }
  }, [editor, jumpToLine, setJumpToLine])

  // Find intelligence node & connections for selected file
  const selectedNode = useMemo(() => {
    if (!intelData || !fileContent) return null
    const filename = fileContent.filename
    const relPath = fileContent.relative_path
    return intelData.graph.nodes.find(n => n.id === relPath || n.id === filename || n.path === relPath || n.name === filename)
  }, [intelData, fileContent])

  const outgoingDependencies = useMemo(() => {
    if (!intelData || !selectedNode) {
      return []
    }
    const links = intelData.graph.links.filter(l => l.source === selectedNode.id)
    return links.map(l => l.target.split('/').pop() || l.target)
  }, [intelData, selectedNode])

  const incomingReferencesCount = useMemo(() => {
    if (!intelData || !selectedNode) return 0
    return intelData.graph.links.filter(l => l.target === selectedNode.id).length
  }, [intelData, selectedNode])

  const relevanceScore = useMemo(() => {
    if (!selectedNode || !intelData) return 0
    if (selectedNode.indexed) {
      return Math.min(100, Math.max(10, Math.round(((selectedNode.functions.length + selectedNode.classes.length + selectedNode.chunks_count) / Math.max(1, intelData.metrics.total_chunks)) * 100 + 40)))
    }
    return 0
  }, [selectedNode, intelData])

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      filePath: path
    })
  }

  const dispatchAction = (actionPrompt: string) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
    navigate('/assistant', { state: { prefill: actionPrompt } })
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center font-mono">
        <p className="text-xs text-[#8B949E]">No project open.</p>
      </div>
    )
  }

  const filteredTree = filterTree(fileTree, searchQuery)

  return (
    <div className="flex h-full bg-[#0D1117] rounded-2xl border border-[#202832] overflow-hidden font-mono shadow-2xl relative">
      {/* ── LEFT: File Tree ── */}
      <div className="w-64 shrink-0 border-r border-[#202832] flex flex-col bg-[#0A0D12]">
        {/* Search */}
        <div className="p-2.5 border-b border-[#202832]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8B949E]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[#11161D] border border-[#202832] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F3F4F6] placeholder-[#8B949E]/40 focus:outline-none focus:border-[#18A957]"
            />
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredTree.length > 0 ? (
            filteredTree.map((node) => (
              <TreeNodeRow
                key={node.path}
                node={node}
                depth={0}
                selectedFileId={selectedFileId}
                onSelect={setSelectedFileId}
                onContextMenu={handleContextMenu}
              />
            ))
          ) : (
            <p className="text-xs text-[#8B949E]/50 p-2 text-center">No files found.</p>
          )}
        </div>
      </div>

      {/* ── CENTER: Editor / Empty State ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0D1117]">
        {/* Editor Tab Bar */}
        <div className="h-11 border-b border-[#202832] bg-[#11161D] flex items-center justify-between px-4">
          {fileContent ? (
            <>
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#18A957]" />
                <span className="text-xs font-semibold text-[#F3F4F6]">{fileContent.filename}</span>
                <span className="text-[10px] text-[#8B949E]">({fileContent.language})</span>
              </div>

              {/* Top Right "Ask NEXUS" & Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatchAction(`I have a question about ${fileContent.relative_path}: `)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#18A957]/15 hover:bg-[#18A957]/25 text-[#18A957] border border-[#18A957]/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Ask NEXUS
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setContextMenu({
                      isOpen: true,
                      x: e.clientX - 160,
                      y: e.clientY + 20,
                      filePath: fileContent.relative_path
                    })
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1117] hover:bg-[#161C24] text-[#F3F4F6] border border-[#202832] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#8B5CF6]" />
                  NEXUS Actions ▾
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-[#8B949E]/50">NEXUS Code Explorer</span>
          )}
        </div>

        {/* Editor / Empty State Body */}
        <div className="flex-1 overflow-hidden">
          {!selectedFileId && (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 relative overflow-hidden">
              {/* Subtle Glow */}
              <div className="pointer-events-none absolute w-96 h-96 rounded-full bg-[#18A957]/5 blur-3xl -z-0" />

              {/* Reactor Icon Badge */}
              <div className="relative mb-4 flex items-center justify-center">
                <div className="absolute h-20 w-20 rounded-full border border-dashed border-[#18A957]/30 animate-[spin_15s_linear_infinite]" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#18A957]/15 border border-[#18A957]/40 text-[#18A957] shadow-lg shadow-[#18A957]/20">
                  <span className="text-2xl font-bold animate-pulse">◉</span>
                </div>
              </div>

              {/* Title & Tagline */}
              <h2 className="text-sm font-black tracking-widest text-[#F3F4F6] uppercase mb-1">
                NEXUS CODE INTELLIGENCE
              </h2>
              <p className="text-xs font-bold text-[#18A957] tracking-wider uppercase mb-1">
                SELECT A FILE
              </p>
              <p className="text-[11px] text-[#8B949E] max-w-sm mb-6">
                or use AI to explore, search and refactor your codebase
              </p>

              {/* Interactive Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8 max-w-md">
                <button
                  onClick={() => navigate('/assistant')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#8B5CF6]/50 hover:bg-[#8B5CF6]/10 text-xs font-semibold text-[#8B5CF6] transition-all shadow-sm group cursor-pointer"
                >
                  <Bot className="h-4 w-4 text-[#8B5CF6] group-hover:scale-110 transition-transform" />
                  <span>Ask NEXUS</span>
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#3B82F6]/50 hover:bg-[#3B82F6]/10 text-xs font-semibold text-[#3B82F6] transition-all shadow-sm group cursor-pointer"
                >
                  <Network className="h-4 w-4 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                  <span>Code Map</span>
                </button>

                <button
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
                    window.dispatchEvent(event)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/50 hover:bg-[#18A957]/10 text-xs font-semibold text-[#18A957] transition-all shadow-sm group cursor-pointer"
                >
                  <Search className="h-4 w-4 text-[#18A957] group-hover:scale-110 transition-transform" />
                  <span>Search Code</span>
                </button>
              </div>

              {/* Project Quick Coverage Telemetry */}
              {activeProject && (
                <div className="pt-6 border-t border-[#202832]/60 flex items-center justify-center gap-6 text-[11px] text-[#8B949E]">
                  <div>
                    <strong className="text-[#F3F4F6] block">{activeProject.total_files.toLocaleString()}</strong>
                    <span>files indexed</span>
                  </div>
                  <span className="text-[#202832]">|</span>
                  <div>
                    <strong className="text-[#F3F4F6] block">{(intelData?.metrics.total_chunks ?? 0).toLocaleString()}</strong>
                    <span>chunks</span>
                  </div>
                  <span className="text-[#202832]">|</span>
                  <div>
                    <strong className="text-[#18A957] block font-bold">{intelData?.metrics.index_percentage ?? 0}%</strong>
                    <span>coverage</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedFileId && loadingContent && (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-[#8B949E] animate-pulse">Loading syntax & AST…</p>
            </div>
          )}

          {fileContent?.error && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Binary className="h-10 w-10 text-[#8B949E]/20 mb-3" />
              <p className="text-sm text-[#F3F4F6] mb-1">
                {fileContent.error === 'BINARY_FILE' ? 'Binary File' : 'Cannot Display'}
              </p>
              <p className="text-xs text-[#8B949E]">{fileContent.message}</p>
            </div>
          )}

          {fileContent?.content !== null && fileContent?.content !== undefined && !loadingContent && (
            <MonacoEditor
              height="100%"
              language={getMonacoLang(fileContent.language)}
              value={fileContent.content}
              theme="vs-dark"
              onMount={(ed) => setEditor(ed)}
              options={{
                readOnly: true,
                minimap: { enabled: uiSettings.minimap },
                fontSize: uiSettings.editorFontSize,
                tabSize: uiSettings.editorTabSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineNumbers: uiSettings.editorLineNumbers || 'on',
                scrollBeyondLastLine: false,
                wordWrap: uiSettings.wordWrap as any,
                renderLineHighlight: uiSettings.highlightActiveLine ? 'all' : 'none',
                renderWhitespace: 'none',
                padding: { top: 12 },
              }}
            />
          )}
        </div>
      </div>

      {/* ── RIGHT: AI Codebase Intelligence Details Panel ── */}
      <div className="w-64 shrink-0 border-l border-[#202832] flex flex-col bg-[#0A0D12]">
        <div className="px-3 py-2.5 border-b border-[#202832] flex items-center justify-between">
          <p className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#18A957]" /> DETAILS
          </p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18A957]/10 text-[#18A957] font-bold">
            AST
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {fileContent ? (
            <>
              {/* Filename & Header */}
              <div>
                <h3 className="text-xs font-black text-[#F3F4F6] uppercase tracking-wider break-all">
                  {fileContent.filename}
                </h3>
                <p className="text-[11px] text-[#8B949E] mt-0.5">
                  {fileContent.language} &bull; <strong className="text-[#F3F4F6] font-normal">{fileContent.lines_count} lines</strong>
                </p>
              </div>

              {/* STRUCTURE */}
              <div className="pt-3 border-t border-[#202832] space-y-2">
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider block">
                  STRUCTURE
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E]">Functions</span>
                    <span className="text-[#F3F4F6] font-bold">
                      {selectedNode ? selectedNode.functions.length : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E]">Classes</span>
                    <span className="text-[#F3F4F6] font-bold">
                      {selectedNode ? selectedNode.classes.length : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B949E]">AST Chunks</span>
                    <span className="text-[#18A957] font-bold">
                      {selectedNode ? selectedNode.chunks_count : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* DEPENDENCIES */}
              <div className="pt-3 border-t border-[#202832] space-y-2">
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider block">
                  DEPENDENCIES
                </span>
                <div className="space-y-1 text-xs">
                  {outgoingDependencies.map((dep, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[#8B949E] hover:text-[#F3F4F6] transition-colors">
                      <span className="text-[#3B82F6]">&rarr;</span>
                      <span className="truncate">{dep}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI & SEMANTIC RELEVANCE */}
              <div className="pt-3 border-t border-[#202832] space-y-2">
                <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider block">
                  AI INTELLIGENCE
                </span>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#8B949E]">Semantic relevance</span>
                    <span className="text-[#18A957] font-bold">{relevanceScore}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#161C24] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#18A957] to-[#22C55E] rounded-full"
                      style={{ width: `${relevanceScore}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#8B949E]">Referenced by</span>
                  <span className="text-[#F3F4F6] font-bold">{incomingReferencesCount} files</span>
                </div>
              </div>

              {/* AI ACTION BUTTONS */}
              <div className="pt-3 border-t border-[#202832] space-y-2">
                <button
                  onClick={() => dispatchAction(`I have a question about ${fileContent.relative_path}: `)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/30 text-xs font-bold text-[#8B5CF6] transition-colors shadow-sm cursor-pointer"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Ask NEXUS
                </button>

                <button
                  onClick={() => dispatchAction(`Explain the architecture, functions, and logic of file: ${fileContent.relative_path}`)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#11161D] hover:bg-[#161C24] border border-[#202832] text-xs font-semibold text-[#F3F4F6] transition-colors cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5 text-[#3B82F6]" />
                  Explain File
                </button>

                <button
                  onClick={() => dispatchAction(`Review ${fileContent.relative_path} for potential bugs, security vulnerabilities, edge cases, and code quality issues.`)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#11161D] hover:bg-[#161C24] border border-[#202832] text-xs font-semibold text-[#F3F4F6] transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-[#F59E0B]" />
                  Find Issues
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center px-2">
              <Info className="h-7 w-7 text-[#8B949E]/20 mb-2" />
              <p className="text-xs text-[#8B949E]/50">Select a file to inspect AST structure & AI intelligence</p>
            </div>
          )}
        </div>
      </div>

      {/* ── ⚡ FLOATING NEXUS ACTIONS CONTEXT MENU ── */}
      {contextMenu.isOpen && (
        <div
          className="fixed z-50 w-64 rounded-2xl border-2 border-[#202832] bg-[#0D1117]/95 backdrop-blur-xl shadow-2xl shadow-black/90 p-2 text-xs font-mono animate-in fade-in zoom-in-95 duration-150"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 340), left: Math.min(contextMenu.x, window.innerWidth - 270) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-[#202832] flex items-center justify-between mb-1">
            <span className="font-bold text-[#F3F4F6] tracking-wider uppercase flex items-center gap-1.5 text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-[#18A957]" /> NEXUS ACTIONS
            </span>
            <span className="text-[10px] text-[#8B949E] truncate max-w-[90px]">
              {contextMenu.filePath.split('/').pop()}
            </span>
          </div>

          <div className="space-y-0.5">
            <button
              onClick={() => dispatchAction(`Explain the architecture, structure and complete logic of file: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#18A957]/15 hover:text-[#18A957] text-[#F3F4F6] transition-colors text-left"
            >
              <Code2 className="h-3.5 w-3.5 text-[#18A957]" />
              <span>Explain file</span>
            </button>

            <button
              onClick={() => dispatchAction(`Analyze and explain the key functions and signatures in: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#3B82F6]/15 hover:text-[#3B82F6] text-[#F3F4F6] transition-colors text-left"
            >
              <Bot className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>Explain function</span>
            </button>

            <button
              onClick={() => dispatchAction(`Find all usages, call sites and imports of symbols from: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#06B6D4]/15 hover:text-[#06B6D4] text-[#F3F4F6] transition-colors text-left"
            >
              <Search className="h-3.5 w-3.5 text-[#06B6D4]" />
              <span>Find usages</span>
            </button>

            <button
              onClick={() => dispatchAction(`Find related code, shared dependencies and connected modules for: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#8B5CF6]/15 hover:text-[#8B5CF6] text-[#F3F4F6] transition-colors text-left"
            >
              <Link2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
              <span>Find related code</span>
            </button>

            <button
              onClick={() => dispatchAction(`Audit ${contextMenu.filePath} for potential bugs, edge cases, type issues and logic errors.`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-red-500/15 hover:text-red-400 text-[#F3F4F6] transition-colors text-left"
            >
              <Bug className="h-3.5 w-3.5 text-red-400" />
              <span>Find potential bugs</span>
            </button>

            <button
              onClick={() => dispatchAction(`Propose a clean, idiomatic refactoring plan and code edits for: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F59E0B]/15 hover:text-[#F59E0B] text-[#F3F4F6] transition-colors text-left"
            >
              <Zap className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span>Refactor</span>
            </button>

            <button
              onClick={() => dispatchAction(`Generate comprehensive automated unit tests and test fixtures for: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#10B981]/15 hover:text-[#10B981] text-[#F3F4F6] transition-colors text-left"
            >
              <FlaskConical className="h-3.5 w-3.5 text-[#10B981]" />
              <span>Generate tests</span>
            </button>

            <button
              onClick={() => dispatchAction(`Search all semantic vector references and similar AST patterns for: ${contextMenu.filePath}`)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-[#EC4899]/15 hover:text-[#EC4899] text-[#F3F4F6] transition-colors text-left"
            >
              <Network className="h-3.5 w-3.5 text-[#EC4899]" />
              <span>Search semantic references</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
