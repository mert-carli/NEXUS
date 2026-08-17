import { useState, useEffect } from 'react'
import { 
  FolderPlus, 
  RefreshCw, 
  GitBranch, 
  Bot, 
  Activity, 
  Layers, 
  Network, 
  ArrowRight,
  Code2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, CodebaseIntelligenceData, ProjectReadinessData } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import { useAgentStore } from '@/store/agentStore'

import NexusAiCore from '@/components/NexusAiCore'
import CodebaseIntelligence from '@/components/CodebaseIntelligence'
import NexusGuard from '@/components/NexusGuard'
import ActivityTimeline from '@/components/ActivityTimeline'
import NexusConsole from '@/components/NexusConsole'

export default function Dashboard() {
  const { activeProject, setActiveProject, setOpenProjectModalOpen, setIsScanning } = useProjectStore()
  const { status: agentStatus, activeQuery } = useAgentStore()
  const navigate = useNavigate()

  const [rescanning, setRescanning] = useState(false)
  const [intelData, setIntelData] = useState<CodebaseIntelligenceData | null>(null)
  const [readinessData, setReadinessData] = useState<ProjectReadinessData | null>(null)
  const [showFullGraph, setShowFullGraph] = useState(false)

  // Fetch quick metrics on mount and poll
  useEffect(() => {
    const projectId = activeProject?.id
    if (!projectId) return
    api.getIntelligence(projectId).then(setIntelData).catch(() => {})
    api.getProjectReadiness(projectId).then(setReadinessData).catch(() => {})
    const timer = setInterval(() => {
      api.getProjectReadiness(projectId).then(setReadinessData).catch(() => {})
    }, 25000)
    return () => clearInterval(timer)
  }, [activeProject?.id])

  async function handleRescan() {
    if (!activeProject || rescanning) return
    setRescanning(true)
    setIsScanning(true)
    try {
      const updated = await api.rescanProject(activeProject.id)
      setActiveProject(updated)
      const [intel, readiness] = await Promise.allSettled([
        api.getIntelligence(activeProject.id),
        api.getProjectReadiness(activeProject.id)
      ])
      if (intel.status === 'fulfilled') setIntelData(intel.value)
      if (readiness.status === 'fulfilled') setReadinessData(readiness.value)
    } catch {
      // silent fail
    } finally {
      setRescanning(false)
      setIsScanning(false)
    }
  }

  // ── No project open ──────────────────────────────────────────────────────────
  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4 font-mono">
        <div className="h-24 w-24 mb-6">
          <img src="/Nexuxlogo.png" alt="NEXUS Logo" className="w-full h-full object-contain drop-shadow-xl" />
        </div>
        <h1 className="text-2xl font-bold text-[#F3F4F6] mb-2 tracking-wide">NEXUS COMMAND CENTER</h1>
        <p className="text-[#8B949E] text-xs mb-8 max-w-md leading-relaxed">
          Open a local codebase repository to activate the AI Core, ChromaDB vector indexing, and autonomous agent operations.
        </p>
        <button
          onClick={() => setOpenProjectModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#18A957] to-[#22C55E] hover:from-[#18A957]/90 hover:to-[#22C55E]/90 text-white text-xs font-bold transition-all shadow-lg shadow-[#18A957]/20"
        >
          <FolderPlus className="h-4 w-4" />
          OPEN LOCAL PROJECT
        </button>
        <div className="mt-10 text-[11px] text-[#8B949E]/50">
          ● 100% Local Intelligence &bull; Zero External Uploads &bull; Sandbox Protected
        </div>
      </div>
    )
  }

  const p = activeProject
  const totalFiles = intelData?.metrics.total_files ?? p.total_files
  const totalChunks = intelData?.metrics.total_chunks ?? 0
  const indexPercentage = intelData?.metrics.index_percentage ?? 0
  const healthScore = readinessData ? readinessData.score : 0
  const healthTier = readinessData ? readinessData.tier : 'CHECKING'

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-mono pb-12">
      {/* ── Top Project Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#0D1117] p-4 rounded-2xl border border-[#202832] shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-[#F3F4F6] truncate tracking-wide uppercase">
              {p.name}
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#18A957]/15 text-[#18A957] border border-[#18A957]/30 font-bold">
              ACTIVE WORKSPACE
            </span>
          </div>
          <p className="text-[11px] text-[#8B949E] mt-0.5 truncate select-all">{p.path}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {p.is_git_repo && p.git_branch && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#11161D] border border-[#202832] text-xs text-[#8B949E]">
              <GitBranch className="h-3.5 w-3.5 text-[#F59E0B]" />
              <span className="text-[#F3F4F6] font-semibold">{p.git_branch}</span>
              {p.git_is_dirty && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] ml-0.5 animate-pulse" title="Working tree has uncommitted changes" />
              )}
            </span>
          )}
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#202832] bg-[#11161D] hover:border-[#18A957]/40 text-xs text-[#8B949E] hover:text-[#F3F4F6] transition-all disabled:opacity-50 font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rescanning ? 'animate-spin text-[#18A957]' : ''}`} />
            {rescanning ? 'Scanning…' : 'Re-scan'}
          </button>
        </div>
      </div>

      {/* ── 🧠 NEXUS AI CORE (Hero Showcase & Dynamic Reactor) ── */}
      <NexusAiCore />

      {/* ── 🏛️ TRIAD TELEMETRY ROW (CODEBASE | AGENT | HEALTH) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. CODEBASE Pillar */}
        <div className="rounded-2xl border border-[#202832] bg-[#0D1117] p-5 flex flex-col justify-between transition-all hover:border-[#3B82F6]/40 shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8B949E] mb-3">
              <span className="font-bold tracking-wider text-[#F3F4F6] uppercase flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-[#3B82F6]" /> CODEBASE
              </span>
              <span className="text-[10px] text-[#3B82F6] font-bold">
                {indexPercentage}% INDEXED
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-[#F3F4F6]">{totalFiles.toLocaleString()}</span>
                <span className="text-xs text-[#8B949E]">files</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#8B949E]">{totalChunks.toLocaleString()}</span>
                <span className="text-xs text-[#8B949E]/70">AST chunks</span>
              </div>

              {/* Progress Index Bar */}
              <div className="h-1.5 w-full bg-[#161C24] rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] rounded-full transition-all duration-500"
                  style={{ width: `${indexPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowFullGraph(!showFullGraph)}
            className="w-full mt-2 pt-2.5 border-t border-[#202832] text-xs text-[#3B82F6] hover:text-[#60A5FA] font-semibold flex items-center justify-between transition-colors"
          >
            <span>{showFullGraph ? 'Hide Semantic Map' : 'Semantic Map Graph'}</span>
            <Network className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 2. AGENT Pillar */}
        <div className="rounded-2xl border border-[#202832] bg-[#0D1117] p-5 flex flex-col justify-between transition-all hover:border-[#8B5CF6]/40 shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8B949E] mb-3">
              <span className="font-bold tracking-wider text-[#F3F4F6] uppercase flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-[#8B5CF6]" /> AGENT
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                agentStatus === 'IDLE' 
                  ? 'bg-[#202832] text-[#8B949E] border-[#202832]'
                  : 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30 animate-pulse'
              }`}>
                ● {agentStatus}
              </span>
            </div>

            <div className="space-y-1.5 mb-3">
              <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block">Last Mission</span>
              <p className="text-xs text-[#F3F4F6] font-semibold truncate bg-[#11161D] p-2 rounded-xl border border-[#202832]">
                {activeQuery ? `&ldquo;${activeQuery}&rdquo;` : 'No active mission'}
              </p>
              <span className="text-[10px] text-[#8B949E]/70 block mt-1">
                Autonomous Reasoning &bull; AST Diff Generation
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/assistant')}
            className="w-full mt-2 pt-2.5 border-t border-[#202832] text-xs text-[#8B5CF6] hover:text-[#A78BFA] font-semibold flex items-center justify-between transition-colors"
          >
            <span>Open Mission Control</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 3. HEALTH & READINESS Pillar */}
        <div className="rounded-2xl border border-[#202832] bg-[#0D1117] p-5 flex flex-col justify-between transition-all hover:border-[#18A957]/40 shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-[#8B949E] mb-3">
              <span className="font-bold tracking-wider text-[#F3F4F6] uppercase flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-[#18A957]" /> HEALTH
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                healthTier === 'OPTIMAL' || healthTier === 'EXCELLENT'
                  ? 'bg-[#18A957]/15 text-[#18A957] border-[#18A957]/30'
                  : healthTier === 'ATTENTION NEEDED'
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                  : healthTier === 'CHECKING'
                  ? 'bg-[#8B949E]/15 text-[#8B949E] border-[#8B949E]/30'
                  : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
              }`}>
                {healthTier}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-2xl font-black text-[#F3F4F6]">{healthScore}</span>
                <span className="text-xs text-[#8B949E]"> / 100</span>
                <span className="text-[10px] text-[#18A957] block font-semibold mt-0.5">
                  AI Readiness Score
                </span>
              </div>

              {/* Subsystem mini LEDs */}
              <div className="space-y-1 text-[10px] text-[#8B949E] text-right">
                <div>Backend <span className={readinessData?.subsystems?.backend?.status === 'ONLINE' ? 'text-[#18A957]' : 'text-[#EF4444]'}>●</span></div>
                <div>Ollama <span className={readinessData?.subsystems?.ollama?.status === 'ONLINE' ? 'text-[#18A957]' : 'text-[#EF4444]'}>●</span></div>
                <div>ChromaDB <span className={readinessData?.subsystems?.chroma?.status === 'ONLINE' ? 'text-[#18A957]' : 'text-[#EF4444]'}>●</span></div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/code')}
            className="w-full mt-2 pt-2.5 border-t border-[#202832] text-xs text-[#18A957] hover:text-[#34D399] font-semibold flex items-center justify-between transition-colors"
          >
            <span>Inspect Explorer</span>
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── 🕸️ CODEBASE INTELLIGENCE & SEMANTIC MAP (Expandable / Inline) ── */}
      {showFullGraph && (
        <div className="animate-in fade-in duration-300">
          <CodebaseIntelligence />
        </div>
      )}

      {/* ── 📜 RECENT ACTIVITY & 🛡️ NEXUS GUARD (2-Column Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Activity Timeline */}
        <div className="lg:col-span-7">
          <ActivityTimeline />
        </div>

        {/* Right Column: Nexus Guard Security Shield */}
        <div className="lg:col-span-5">
          <NexusGuard />
        </div>
      </div>

      {/* ── 🖥️ NEXUS CONSOLE & TELEMETRY STREAM (Bottom Command Dock) ── */}
      <NexusConsole />
    </div>
  )
}
