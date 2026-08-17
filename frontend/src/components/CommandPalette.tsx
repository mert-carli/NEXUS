import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Search, 
  Bot, 
  Settings, 
  ShieldCheck, 
  RefreshCw, 
  FolderOpen, 
  Play, 
  X, 
  FileCode, 
  FileDiff, 
  Terminal, 
  ArrowRight, 
  Sparkles,
  Zap,
  Code2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { api } from '@/services/api'

interface CommandItem {
  id: string
  title: string
  subtitle: string
  category: 'QUICK ACTIONS' | 'AI & AGENT' | 'SYSTEM & CLI' | 'NAVIGATION'
  icon: React.ReactNode
  shortcut?: string
  action: () => void
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const { activeProject, setOpenProjectModalOpen, setIsScanning, setActiveProject } = useProjectStore()

  // Toggle on Ctrl+K / Cmd+K or custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    const handleCustomOpen = () => setIsOpen(true)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleCustomOpen)
    }
  }, [isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  const quickActions: CommandItem[] = [
    {
      id: 'cmd-open-file',
      title: 'Open file',
      subtitle: 'Browse repository file hierarchy in explorer',
      category: 'QUICK ACTIONS',
      icon: <FileCode className="h-4 w-4 text-[#3B82F6]" />,
      shortcut: 'G F',
      action: () => {
        setIsOpen(false)
        navigate('/code')
      }
    },
    {
      id: 'cmd-search-code',
      title: 'Search codebase',
      subtitle: 'Perform instant search across all indexed files',
      category: 'QUICK ACTIONS',
      icon: <Search className="h-4 w-4 text-[#06B6D4]" />,
      shortcut: 'S',
      action: async () => {
        setIsOpen(false)
        navigate('/code')
      }
    },
    {
      id: 'cmd-ask-ai',
      title: 'Ask AI',
      subtitle: 'Ask a question or request architecture explanation',
      category: 'QUICK ACTIONS',
      icon: <Bot className="h-4 w-4 text-[#8B5CF6]" />,
      shortcut: '↵',
      action: () => {
        setIsOpen(false)
        navigate('/assistant')
      }
    },
    {
      id: 'cmd-start-agent',
      title: 'Start agent',
      subtitle: 'Launch autonomous planning & AST code modification',
      category: 'QUICK ACTIONS',
      icon: <Sparkles className="h-4 w-4 text-[#A78BFA]" />,
      shortcut: 'A',
      action: () => {
        setIsOpen(false)
        navigate('/assistant')
      }
    },
    {
      id: 'cmd-view-changes',
      title: 'View changes',
      subtitle: 'Inspect pending transaction diffs & AST validations',
      category: 'QUICK ACTIONS',
      icon: <FileDiff className="h-4 w-4 text-[#F59E0B]" />,
      shortcut: 'C',
      action: () => {
        setIsOpen(false)
        navigate('/assistant')
      }
    },
    {
      id: 'cmd-run-tests',
      title: 'Run tests',
      subtitle: 'Execute pytest or npm test assertions suite',
      category: 'QUICK ACTIONS',
      icon: <Play className="h-4 w-4 text-[#18A957]" />,
      shortcut: 'T',
      action: async () => {
        setIsOpen(false)
        if (activeProject) {
          await api.runTests(activeProject.id)
        }
      }
    },
    {
      id: 'cmd-open-console',
      title: 'Open console',
      subtitle: 'Inspect real-time system logs and interactive CLI',
      category: 'QUICK ACTIONS',
      icon: <Terminal className="h-4 w-4 text-[#10B981]" />,
      shortcut: '`',
      action: () => {
        setIsOpen(false)
        navigate('/dashboard')
        window.scrollTo({ top: 1200, behavior: 'smooth' })
      }
    },
    {
      id: 'cmd-scan-rescan',
      title: 'Rescan Codebase (SHA256)',
      subtitle: 'Incremental file tree and hash verification scan',
      category: 'SYSTEM & CLI',
      icon: <RefreshCw className="h-4 w-4 text-[#06B6D4]" />,
      action: async () => {
        setIsOpen(false)
        if (activeProject) {
          setIsScanning(true)
          const updated = await api.rescanProject(activeProject.id)
          setActiveProject(updated)
          setIsScanning(false)
        }
      }
    },
    {
      id: 'cmd-guard-status',
      title: 'NEXUS Guard Sandbox',
      subtitle: 'Review sandbox boundary & blocked threats',
      category: 'SYSTEM & CLI',
      icon: <ShieldCheck className="h-4 w-4 text-[#18A957]" />,
      action: () => {
        setIsOpen(false)
        navigate('/dashboard')
        window.scrollTo({ top: 750, behavior: 'smooth' })
      }
    },
    {
      id: 'cmd-switch-project',
      title: 'Switch project workspace',
      subtitle: 'Open another local repository',
      category: 'NAVIGATION',
      icon: <FolderOpen className="h-4 w-4 text-[#F59E0B]" />,
      action: () => {
        setIsOpen(false)
        setOpenProjectModalOpen(true)
      }
    },
    {
      id: 'cmd-settings-open',
      title: 'Settings & Model Configuration',
      subtitle: 'Configure Ollama models, parameters & security keys',
      category: 'NAVIGATION',
      icon: <Settings className="h-4 w-4 text-[#8B949E]" />,
      action: () => {
        setIsOpen(false)
        navigate('/settings')
      }
    }
  ]

  // Intelligent Classification of User Query
  const queryType = useMemo<'ACTION' | 'QUERY' | 'DEFAULT'>(() => {
    if (!search.trim()) return 'DEFAULT'
    const s = search.toLowerCase()
    const actionKeywords = ['refactor', 'fix', 'create', 'build', 'add', 'modify', 'update', 'test', 'implement', 'optimize', 'clean', 'change', 'debug', 'remove', 'delete']
    if (actionKeywords.some(kw => s.includes(kw))) {
      return 'ACTION'
    }
    const queryKeywords = ['find', 'search', 'where', 'how', 'show', 'list', 'explain', 'get', '.py', '.ts', '.js', '.json', 'function', 'class']
    if (queryKeywords.some(kw => s.includes(kw))) {
      return 'QUERY'
    }
    return 'DEFAULT'
  }, [search])

  const filteredCommands = quickActions.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (queryType === 'ACTION') {
        setIsOpen(false)
        navigate('/assistant', { state: { prefill: search.trim() } })
      } else if (queryType === 'QUERY') {
        setIsOpen(false)
        navigate('/assistant', { state: { prefill: `Search codebase: ${search.trim()}` } })
      } else if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      } else if (search.trim()) {
        setIsOpen(false)
        navigate('/assistant', { state: { prefill: search.trim() } })
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-mono">
      <div className="w-full max-w-xl rounded-2xl border border-[#202832] bg-[#0D1117] shadow-2xl shadow-black/90 overflow-hidden text-xs">
        {/* Top Search Input */}
        <div className="p-4 border-b border-[#202832] bg-[#11161D] space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] mb-1">
            <span className="font-bold text-[#F3F4F6] uppercase tracking-wider flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-[#18A957]" /> Search NEXUS
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#202832] text-[#8B949E] border border-[#202832]/60 select-none">
              ESC
            </span>
          </div>

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask NEXUS, start agent, or search codebase..."
              className="w-full bg-[#0D1117] border border-[#202832] focus:border-[#18A957] rounded-xl px-4 py-2.5 text-xs text-[#F3F4F6] placeholder-[#8B949E]/50 focus:outline-none shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 text-[#8B949E] hover:text-[#F3F4F6] p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Dynamic AI ACTION Card ── */}
        {queryType === 'ACTION' && search.trim() && (
          <div className="p-3 bg-gradient-to-r from-[#8B5CF6]/15 via-[#8B5CF6]/5 to-transparent border-b border-[#8B5CF6]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-[#8B5CF6]" /> AI ACTION / AGENT TASK
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#A78BFA] font-bold">
                AUTONOMOUS
              </span>
            </div>

            <p className="text-xs font-semibold text-[#F3F4F6] mb-3 break-words bg-[#0D1117] p-2.5 rounded-xl border border-[#202832]">
              &ldquo;{search}&rdquo;
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/assistant', { state: { prefill: search.trim() } })
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs font-bold transition-all shadow-md shadow-[#8B5CF6]/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Start Agent &rarr;
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/assistant', { state: { prefill: `Explain how to: ${search.trim()}` } })
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#11161D] hover:bg-[#161C24] border border-[#202832] text-[#F3F4F6] text-xs font-semibold transition-colors"
              >
                <Bot className="h-3.5 w-3.5 text-[#3B82F6]" />
                Ask Assistant
              </button>
            </div>
          </div>
        )}

        {/* ── Dynamic CODEBASE QUERY Card ── */}
        {queryType === 'QUERY' && search.trim() && (
          <div className="p-3 bg-gradient-to-r from-[#06B6D4]/15 via-[#06B6D4]/5 to-transparent border-b border-[#06B6D4]/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-[#06B6D4]" /> CODEBASE QUERY & SEMANTIC SEARCH
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#06B6D4]/20 text-[#06B6D4] font-bold">
                RAG INDEX
              </span>
            </div>

            <p className="text-xs font-semibold text-[#F3F4F6] mb-1.5 break-words">
              &ldquo;{search}&rdquo;
            </p>
            <p className="text-[11px] text-[#8B949E] mb-3">
              Searching ChromaDB HNSW semantic index & AST chunks...
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/assistant', { state: { prefill: `Search codebase and locate: ${search.trim()}` } })
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-white text-xs font-bold transition-all shadow-md shadow-[#06B6D4]/20"
              >
                <Search className="h-3.5 w-3.5" />
                Search & Retrieve &rarr;
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate('/code')
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#11161D] hover:bg-[#161C24] border border-[#202832] text-[#F3F4F6] text-xs font-semibold transition-colors"
              >
                <Code2 className="h-3.5 w-3.5 text-[#18A957]" />
                Jump to Explorer
              </button>
            </div>
          </div>
        )}

        {/* Command / Action List */}
        <div className="max-h-80 overflow-y-auto p-2.5 space-y-1">
          <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest px-2.5 py-1 block">
            {search.trim() ? 'MATCHING COMMANDS' : 'QUICK ACTIONS'}
          </span>

          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = selectedIndex === idx
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#18A957]/15 text-[#F3F4F6] border border-[#18A957]/30 shadow-sm'
                      : 'hover:bg-[#11161D] text-[#8B949E] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#07090D] border border-[#202832] shrink-0">
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#3B82F6] font-bold">&rarr;</span>
                        <span className={`font-semibold truncate ${isSelected ? 'text-[#F3F4F6]' : 'text-[#E6EDF3]'}`}>
                          {cmd.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#8B949E] block truncate ml-4">
                        {cmd.subtitle}
                      </span>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#11161D] text-[#8B949E] border border-[#202832] shrink-0">
                      {cmd.shortcut}
                    </span>
                  )}
                </div>
              )
            })
          ) : queryType === 'DEFAULT' ? (
            <div 
              onClick={() => {
                setIsOpen(false)
                navigate('/assistant', { state: { prefill: search.trim() } })
              }}
              className="p-4 text-center cursor-pointer rounded-xl bg-[#11161D] hover:bg-[#161C24] transition-colors border border-[#202832]"
            >
              <Bot className="h-6 w-6 text-[#8B5CF6] mx-auto mb-1.5 animate-pulse" />
              <p className="text-xs font-semibold text-[#F3F4F6]">
                Ask NEXUS Agent: &ldquo;{search}&rdquo;
              </p>
              <p className="text-[10px] text-[#8B949E] mt-0.5 flex items-center justify-center gap-1">
                <span>Press Enter to dispatch directly to agent</span>
                <ArrowRight className="h-3 w-3 text-[#8B5CF6]" />
              </p>
            </div>
          ) : null}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-[#202832] bg-[#0A0D12] flex items-center justify-between text-[10px] text-[#8B949E]/70">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; Navigate</span>
            <span>↵ Execute</span>
            <span>ESC Close</span>
          </div>
          <span>Navigation &bull; Search &bull; AI Interface</span>
        </div>
      </div>
    </div>
  )
}
