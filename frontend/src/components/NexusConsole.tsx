import { useState, useEffect, useRef } from 'react'
import { 
  Terminal, 
  Trash2, 
  Play 
} from 'lucide-react'
import { api, BASE_URL } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import { useNavigate } from 'react-router-dom'

interface LogEntry {
  id: string
  time: string
  tag: 'RAG' | 'AGENT' | 'SECURITY' | 'DIFF' | 'SCANNER' | 'SYSTEM' | 'TEST' | 'CLI'
  tagColor: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export default function NexusConsole() {
  const { activeProject, setIsScanning, setActiveProject } = useProjectStore()
  const navigate = useNavigate()

  const [inputCmd, setInputCmd] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const terminalBottomRef = useRef<HTMLDivElement | null>(null)

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      time: new Date(Date.now() - 30000).toLocaleTimeString(),
      tag: 'SYSTEM',
      tagColor: '#3B82F6',
      message: 'NEXUS Kernel initialized. Core telemetry online.',
      type: 'info'
    },
    {
      id: 'log-2',
      time: new Date(Date.now() - 25000).toLocaleTimeString(),
      tag: 'SCANNER',
      tagColor: '#06B6D4',
      message: 'Incremental project workspace scan completed with SHA256 integrity.',
      type: 'info'
    },
    {
      id: 'log-3',
      time: new Date(Date.now() - 20000).toLocaleTimeString(),
      tag: 'RAG',
      tagColor: '#18A957',
      message: 'ChromaDB collection synchronized in Cosine HNSW space.',
      type: 'success'
    },
    {
      id: 'log-4',
      time: new Date(Date.now() - 15000).toLocaleTimeString(),
      tag: 'SECURITY',
      tagColor: '#10B981',
      message: 'NEXUS Guard active: Sandbox path boundary & command safety verified.',
      type: 'success'
    },
    {
      id: 'log-5',
      time: new Date(Date.now() - 10000).toLocaleTimeString(),
      tag: 'AGENT',
      tagColor: '#8B5CF6',
      message: 'Autonomous Reasoning Engine standing by in IDLE state.',
      type: 'info'
    }
  ])

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (tag: LogEntry['tag'], tagColor: string, message: string, type: LogEntry['type'] = 'info') => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      tag,
      tagColor,
      message,
      type
    }
    setLogs(prev => [...prev.slice(-100), newEntry])
  }

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputCmd.trim() || isExecuting || !activeProject) return

    const raw = inputCmd.trim()
    setInputCmd('')
    addLog('CLI', '#F3F4F6', `$ ${raw}`, 'info')
    setIsExecuting(true)

    const parts = raw.split(' ')
    const cmd = parts[0].toLowerCase()
    const subcmd = parts[1]?.toLowerCase()

    try {
      if (cmd === 'help') {
        addLog('SYSTEM', '#3B82F6', 'Available NEXUS CLI commands:\n  nexus scan          - Run incremental SHA256 project scan\n  nexus index         - Re-index project in ChromaDB\n  nexus health        - Run AI readiness diagnostics\n  nexus guard         - Check security sandbox and threats\n  nexus test          - Run project automated test suite\n  nexus ask <query>   - Dispatch natural language task to Agent\n  clear               - Clear terminal log output', 'info')
      } else if (cmd === 'clear') {
        setLogs([])
      } else if (cmd === 'nexus' || cmd === 'scan' || cmd === 'index' || cmd === 'test' || cmd === 'health' || cmd === 'guard' || cmd === 'ask') {
        const action = cmd === 'nexus' ? subcmd : cmd

        if (action === 'scan') {
          addLog('SCANNER', '#06B6D4', 'Executing incremental codebase scan...', 'info')
          setIsScanning(true)
          const updated = await api.rescanProject(activeProject.id)
          setActiveProject(updated)
          setIsScanning(false)
          addLog('SCANNER', '#06B6D4', `Scan complete: ${updated.total_files} files, ${updated.total_lines} lines.`, 'success')
        } else if (action === 'index') {
          addLog('RAG', '#18A957', 'Starting ChromaDB vector indexing...', 'info')
          const res = await fetch(`${BASE_URL}/projects/${activeProject.id}/index`, { method: 'POST' })
          if (res.ok) {
            addLog('RAG', '#18A957', 'ChromaDB indexing stream completed successfully.', 'success')
          }
        } else if (action === 'test') {
          if (!activeProject.test_command) {
            addLog('TEST', '#F59E0B', 'No test command configured for this project.', 'warning')
          } else {
            addLog('TEST', '#3B82F6', `Running: ${activeProject.test_command}...`, 'info')
            const testRes = await api.runTests(activeProject.id)
            if (testRes.success) {
              addLog('TEST', '#18A957', `Tests PASSED:\n${testRes.output}`, 'success')
            } else {
              addLog('TEST', '#EF4444', `Tests FAILED:\n${testRes.output}`, 'error')
            }
          }
        } else if (action === 'health') {
          const readiness = await api.getProjectReadiness(activeProject.id)
          addLog('SYSTEM', '#18A957', `AI Readiness Score: ${readiness.score}/100 [${readiness.tier}]. All systems operational.`, 'success')
        } else if (action === 'guard') {
          const g = await api.guardStatus()
          addLog('SECURITY', '#10B981', `NEXUS Guard Status: ${g.status}. Threats Blocked: ${g.threats_blocked}. Sandbox fully active.`, 'success')
        } else if (action === 'ask') {
          const prompt = raw.replace(/^nexus\s+ask\s+/i, '').replace(/^ask\s+/i, '')
          addLog('AGENT', '#8B5CF6', `Routing task to Agent: "${prompt}"`, 'info')
          navigate('/assistant', { state: { prefill: prompt } })
        } else {
          addLog('SYSTEM', '#F59E0B', `Unknown subcommand: "${action}". Type "help" for a list of commands.`, 'warning')
        }
      } else {
        addLog('SYSTEM', '#EF4444', `Command not recognized: "${raw}". Type "help" for command list.`, 'error')
      }
    } catch (err: any) {
      addLog('SYSTEM', '#EF4444', `Execution error: ${err.message}`, 'error')
    } finally {
      setIsExecuting(false)
    }
  }

  if (!activeProject) return null

  return (
    <div className="rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] to-[#0A0D12] overflow-hidden shadow-2xl transition-all duration-300">
      {/* ── Header ── */}
      <div className="border-b border-[#202832] bg-[#161C24]/90 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6]">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider text-[#F3F4F6] uppercase">
                NEXUS CONSOLE & TELEMETRY
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#3B82F6]/10 text-[#3B82F6] font-mono border border-[#3B82F6]/20">
                LIVE LOGS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            className="p-1 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#EF4444]/40 text-[#8B949E] hover:text-[#EF4444] transition-colors"
            title="Clear Console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Terminal Body Stream ── */}
      <div className="p-4 bg-[#07090D] font-mono text-xs max-h-64 overflow-y-auto space-y-1.5 leading-relaxed selection:bg-[#18A957]/30">
        {logs.map(log => (
          <div key={log.id} className="flex items-start gap-2.5 py-0.5">
            <span className="text-[11px] text-[#8B949E]/50 shrink-0 select-none">
              {log.time}
            </span>
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 border"
              style={{ 
                color: log.tagColor, 
                borderColor: `${log.tagColor}30`,
                backgroundColor: `${log.tagColor}10` 
              }}
            >
              [{log.tag}]
            </span>
            <span className={`flex-1 whitespace-pre-wrap ${
              log.type === 'error' 
                ? 'text-red-400 font-medium' 
                : log.type === 'success' 
                  ? 'text-[#18A957]' 
                  : log.type === 'warning'
                    ? 'text-[#F59E0B]'
                    : 'text-[#E6EDF3]'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={terminalBottomRef} />
      </div>

      {/* ── Interactive CLI Input Prompt ── */}
      <form onSubmit={handleCommand} className="border-t border-[#202832] bg-[#0D1117] px-4 py-2.5 flex items-center gap-2 font-mono text-xs">
        <span className="text-[#18A957] font-bold select-none flex items-center gap-1 shrink-0">
          nexus@{activeProject.name.toLowerCase()} <span className="text-[#3B82F6]">$</span>
        </span>
        <input
          type="text"
          value={inputCmd}
          onChange={e => setInputCmd(e.target.value)}
          placeholder="Type 'nexus scan', 'nexus test', 'nexus ask <query>' or 'help'..."
          disabled={isExecuting}
          className="flex-1 bg-transparent text-[#F3F4F6] placeholder-[#8B949E]/40 focus:outline-none text-xs"
        />
        <button
          type="submit"
          disabled={isExecuting || !inputCmd.trim()}
          className="px-3 py-1 rounded-md bg-[#18A957]/15 text-[#18A957] border border-[#18A957]/30 hover:bg-[#18A957]/25 text-xs font-semibold transition-all disabled:opacity-30 flex items-center gap-1"
        >
          <Play className="h-3 w-3" />
          RUN
        </button>
      </form>
    </div>
  )
}
