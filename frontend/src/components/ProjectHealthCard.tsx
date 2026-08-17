import { useState, useEffect, useCallback } from 'react'
import { 
  Activity, 
  Server, 
  Cpu, 
  Database, 
  GitBranch, 
  Layers, 
  Clock, 
  RefreshCw 
} from 'lucide-react'
import { api, ProjectReadinessData } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'

export default function ProjectHealthCard() {
  const { activeProject } = useProjectStore()
  const [data, setData] = useState<ProjectReadinessData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    if (!activeProject?.id) return
    setLoading(true)
    try {
      const res = await api.getProjectReadiness(activeProject.id)
      setData(res)
    } catch (err) {
      console.error("Failed to fetch project readiness:", err)
    } finally {
      setLoading(false)
    }
  }, [activeProject?.id])

  useEffect(() => {
    fetchHealth()
    const timer = setInterval(fetchHealth, 25000)
    return () => clearInterval(timer)
  }, [fetchHealth])

  if (!activeProject?.id) return null

  const score = data ? data.score : 0
  const tier = data ? data.tier : (loading ? 'CHECKING' : 'OFFLINE')

  // Status mapping helper for color and badge
  const renderStatusBadge = (status?: string) => {
    if (!status) {
      if (loading) {
        return (
          <span className="flex items-center gap-1.5 text-[#8B949E] font-semibold text-[11px]">
            <span className="h-2 w-2 rounded-full bg-[#8B949E] animate-pulse" />
            CHECKING...
          </span>
        )
      }
      return (
        <span className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
          OFFLINE
        </span>
      )
    }

    const normalized = status.toUpperCase()
    const isOnline = normalized === 'ONLINE' || normalized === 'READY' || normalized === 'SYNCED'
    const isWarning = normalized === 'OUTDATED' || normalized === 'MODIFIED'
    
    if (isOnline) {
      return (
        <span className="flex items-center gap-1.5 text-[#18A957] font-semibold text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#18A957] animate-pulse" />
          {normalized}
        </span>
      )
    }

    if (isWarning) {
      return (
        <span className="flex items-center gap-1.5 text-[#F59E0B] font-semibold text-[11px]">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
          {normalized}
        </span>
      )
    }

    return (
      <span className="flex items-center gap-1.5 text-[#EF4444] font-semibold text-[11px]">
        <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
        {normalized}
      </span>
    )
  }

  // Relative time helper
  const formatTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return 'Not scanned yet'
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins === 1) return '1 minute ago'
      if (diffMins < 60) return `${diffMins} minutes ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours === 1) return '1 hour ago'
      return `${diffHours} hours ago`
    } catch {
      return 'Recently'
    }
  }

  return (
    <div className="rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] via-[#0D1117] to-[#0A0D12] overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#18A957]/30 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[#202832]/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18A957]/10 border border-[#18A957]/30 text-[#18A957]">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono tracking-wider text-[#F3F4F6] uppercase">
                PROJECT HEALTH & AI READINESS
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border font-semibold ${
                tier === 'OPTIMAL' || tier === 'EXCELLENT'
                  ? 'bg-[#18A957]/15 text-[#18A957] border-[#18A957]/30'
                  : tier === 'ATTENTION NEEDED'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                  : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
              }`}>
                {tier}
              </span>
            </div>
            <p className="text-[11px] text-[#8B949E]">Continuous Subsystem Diagnostic & AI Readiness Index</p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
          title="Run Diagnostics"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#18A957]' : ''}`} />
        </button>
      </div>

      {/* ── Main Layout: Radial Gauge Score + Subsystem Telemetry ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: AI Readiness Score Radial Ring */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-[#0D1117]/80 border border-[#202832] text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute w-44 h-44 rounded-full bg-[#18A957]/10 blur-3xl -z-0" />

          {/* Circular Score Visualizer */}
          <div className="relative flex items-center justify-center my-2">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 120 120">
              {/* Background Circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#202832"
                strokeWidth="8"
              />
              {/* Progress Glow Arc */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="url(#readiness-gradient)"
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 314} 314`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="readiness-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#18A957" />
                  <stop offset="70%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Score Numbers */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono text-[#F3F4F6] tracking-tight">
                {score}
              </span>
              <span className="text-xs font-mono text-[#8B949E] -mt-0.5">
                / 100
              </span>
            </div>
          </div>

          <span className="text-xs font-bold font-mono text-[#18A957] uppercase tracking-wider mt-1">
            AI Readiness Score
          </span>
          <p className="text-[10px] text-[#8B949E]/70 font-mono mt-0.5">
            {score >= 75 ? 'System fully primed for RAG reasoning' : 'Some subsystems require attention'}
          </p>

          {/* Last Scan Badge */}
          <div className="mt-4 pt-3 border-t border-[#202832]/80 w-full flex items-center justify-center gap-1.5 text-[11px] font-mono text-[#8B949E]">
            <Clock className="h-3 w-3 text-[#18A957]" />
            <span>Last scan: <strong className="text-[#F3F4F6]">{formatTimeAgo(data?.last_scanned_at)}</strong></span>
          </div>
        </div>

        {/* Right: Subsystem Checklist Grid */}
        <div className="md:col-span-7 space-y-2.5 font-mono text-xs">
          {/* Backend API */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <Server className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-[#F3F4F6] font-medium">Backend API</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(data?.subsystems?.backend?.status)}
            </div>
          </div>

          {/* Ollama Local LLM */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <Cpu className="h-4 w-4 text-[#8B5CF6]" />
              <span className="text-[#F3F4F6] font-medium">Ollama LLM Engine</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(data?.subsystems?.ollama?.status)}
            </div>
          </div>

          {/* ChromaDB Vector Store */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-[#06B6D4]" />
              <span className="text-[#F3F4F6] font-medium">ChromaDB Vector Store</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(data?.subsystems?.chroma?.status)}
            </div>
          </div>

          {/* Git Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <GitBranch className="h-4 w-4 text-[#F59E0B]" />
              <span className="text-[#F3F4F6] font-medium">Git Working Tree</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(data?.subsystems?.git?.status)}
            </div>
          </div>

          {/* Vector Indexer */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-[#18A957]" />
              <span className="text-[#F3F4F6] font-medium">AST Vector Indexer</span>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(data?.subsystems?.indexer?.status)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
