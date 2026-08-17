import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Clock, 
  ShieldCheck, 
  Bot, 
  Database, 
  RefreshCw, 
  GitBranch, 
  Cpu, 
  Layers, 
  Sparkles 
} from 'lucide-react'
import { api, TimelineItem } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import { useAgentStore } from '@/store/agentStore'

type TimelineFilter = 'ALL' | 'AI' | 'RAG' | 'SECURITY' | 'GIT' | 'SYSTEM'

export default function ActivityTimeline() {
  const { activeProject } = useProjectStore()
  const { status: agentStatus, steps, activeQuery } = useAgentStore()
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<TimelineFilter>('ALL')

  const fetchTimeline = useCallback(async () => {
    if (!activeProject?.id) return
    setLoading(true)
    try {
      const res = await api.getTimeline(activeProject.id)
      setItems(res.timeline)
    } catch (err) {
      console.error("Failed to fetch activity timeline:", err)
    } finally {
      setLoading(false)
    }
  }, [activeProject?.id])

  useEffect(() => {
    fetchTimeline()
    const timer = setInterval(fetchTimeline, 25000)
    return () => clearInterval(timer)
  }, [fetchTimeline])

  // Merge live agent step if running
  const combinedItems = useMemo(() => {
    const list = [...items]
    if (agentStatus !== 'IDLE' && activeQuery) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const latestRunningStep = steps.find(s => s.status === 'running')
      const stepTitle = latestRunningStep ? latestRunningStep.title : 'Executing autonomous reasoning pipeline'

      list.unshift({
        id: 'live-agent-run',
        time: nowTime,
        category: 'ai',
        icon: 'agent',
        title: 'AGENT',
        detail: `${stepTitle} &bull; "${activeQuery}"`,
        status: 'running',
        badge: `● ${agentStatus}`
      })
    }
    return list
  }, [items, agentStatus, steps, activeQuery])

  if (!activeProject?.id) return null

  const getCategoryTheme = (category: TimelineItem['category'], status?: string) => {
    const isRunning = status === 'running'
    switch (category) {
      case 'ai':
        return {
          icon: <Bot className={`h-3.5 w-3.5 ${isRunning ? 'text-[#8B5CF6] animate-pulse' : 'text-[#8B5CF6]'}`} />,
          color: '#8B5CF6',
          label: 'AGENT',
          prefix: isRunning ? '●' : '✓'
        }
      case 'rag':
        return {
          icon: <Database className="h-3.5 w-3.5 text-[#3B82F6]" />,
          color: '#3B82F6',
          label: 'RAG',
          prefix: '✓'
        }
      case 'security':
        return {
          icon: <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />,
          color: '#10B981',
          label: 'SECURITY',
          prefix: '✓'
        }
      case 'index':
      case 'scan':
        return {
          icon: <Layers className="h-3.5 w-3.5 text-[#18A957]" />,
          color: '#18A957',
          label: 'INDEX',
          prefix: '✓'
        }
      case 'git':
        return {
          icon: <GitBranch className="h-3.5 w-3.5 text-[#F59E0B]" />,
          color: '#F59E0B',
          label: 'GIT',
          prefix: '✓'
        }
      case 'system':
        return {
          icon: <Cpu className="h-3.5 w-3.5 text-[#06B6D4]" />,
          color: '#06B6D4',
          label: 'SYSTEM',
          prefix: '✓'
        }
      default:
        return {
          icon: <Sparkles className="h-3.5 w-3.5 text-[#8B949E]" />,
          color: '#8B949E',
          label: 'LOG',
          prefix: '✓'
        }
    }
  }

  const filteredItems = combinedItems.filter(item => {
    if (filter === 'ALL') return true
    if (filter === 'AI') return item.category === 'ai'
    if (filter === 'RAG') return item.category === 'rag'
    if (filter === 'SECURITY') return item.category === 'security'
    if (filter === 'GIT') return item.category === 'git'
    if (filter === 'SYSTEM') return item.category === 'system' || item.category === 'index' || item.category === 'scan'
    return true
  })

  const filters: TimelineFilter[] = ['ALL', 'AI', 'RAG', 'SECURITY', 'GIT', 'SYSTEM']

  return (
    <div className="rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] via-[#0D1117] to-[#0A0D12] overflow-hidden shadow-2xl transition-all duration-300 font-mono">
      {/* ── Header ── */}
      <div className="border-b border-[#202832] bg-[#161C24]/90 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18A957]/10 border border-[#18A957]/30 text-[#18A957]">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-[#F3F4F6] uppercase flex items-center gap-1.5">
                ACTIVITY
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#18A957]/15 text-[#18A957] border border-[#18A957]/30 font-bold">
                SYSTEM MEMORY
              </span>
            </div>
            <p className="text-[11px] text-[#8B949E]">Continuous chronological event trail across AI, RAG & system core</p>
          </div>
        </div>

        {/* 6-Filter Bar & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0D1117] p-1 rounded-xl border border-[#202832] text-xs overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                  filter === f
                    ? 'bg-[#18A957]/20 text-[#18A957] border border-[#18A957]/40 shadow-sm'
                    : 'text-[#8B949E] hover:text-[#F3F4F6]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTimeline}
            disabled={loading}
            className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors disabled:opacity-50 shrink-0"
            title="Refresh Timeline"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#18A957]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Timeline Activity Stream (Clean Spec) ── */}
      <div className="p-6">
        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#202832]">
          {filteredItems.map((item, idx) => {
            const theme = getCategoryTheme(item.category, item.status)
            const isRunning = item.status === 'running'

            return (
              <div key={item.id || idx} className="relative flex items-start justify-between gap-4 text-xs group">
                {/* Node Ring Marker */}
                <div 
                  className={`absolute -left-6 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0D1117] border-2 shadow-sm transition-all group-hover:scale-110 ${
                    isRunning ? 'animate-pulse' : ''
                  }`}
                  style={{ borderColor: theme.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pl-1">
                  {/* Timestamp & Category Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#8B949E] shrink-0 font-bold">
                      {item.time}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className={`text-xs font-black tracking-wide flex items-center gap-1 uppercase`}
                        style={{ color: theme.color }}
                      >
                        <span>{theme.prefix}</span> {item.title || theme.label}
                      </span>
                    </div>
                  </div>

                  {/* Detail description */}
                  {item.detail && (
                    <p 
                      className="text-xs text-[#F3F4F6] mt-1 pl-11 leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: item.detail }}
                    />
                  )}
                </div>

                {/* Right Status Badge */}
                {item.badge && (
                  <span 
                    className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 border select-none"
                    style={{ 
                      color: theme.color, 
                      borderColor: `${theme.color}30`,
                      backgroundColor: `${theme.color}10` 
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
