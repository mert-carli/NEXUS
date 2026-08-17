import { useEffect, useState, useCallback } from 'react'
import { 
  FolderOpen, 
  Activity, 
  RefreshCw, 
  Cpu,
  Search
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { useAgentStore } from '@/store/agentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { api, GuardStatusData, OllamaHealth } from '@/services/api'

export default function Topbar() {
  const { activeProject, isScanning, setOpenProjectModalOpen } = useProjectStore()
  const { status: agentStatus } = useAgentStore()
  const { backendSettings, loadSettings } = useSettingsStore()

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [ollamaData, setOllamaData] = useState<OllamaHealth | null>(null)
  const [chromaOnline, setChromaOnline] = useState<boolean | null>(null)
  const [guardData, setGuardData] = useState<GuardStatusData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const pollSystemHealth = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [bRes, oRes, cRes, gRes] = await Promise.allSettled([
        api.health(),
        api.ollamaHealth(),
        api.chromaHealth(),
        api.guardStatus()
      ])

      setBackendOnline(bRes.status === 'fulfilled' && bRes.value.status === 'ok')
      setOllamaData(oRes.status === 'fulfilled' ? oRes.value : { status: 'error' })
      setChromaOnline(cRes.status === 'fulfilled' && cRes.value.status === 'ok')
      setGuardData(gRes.status === 'fulfilled' ? gRes.value : null)
    } catch (err) {
      console.error("Health check error:", err)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    pollSystemHealth()
    const timer = setInterval(pollSystemHealth, 20000)
    return () => clearInterval(timer)
  }, [loadSettings, pollSystemHealth])

  const isOllamaOnline = ollamaData?.status === 'ok'
  const isAiCoreOnline = Boolean(backendOnline && isOllamaOnline)
  const isChromaReady = Boolean(chromaOnline)
  const ragStatus = activeProject ? (activeProject.index_status || 'NOT_INDEXED') : 'IDLE'
  const gitStatus = activeProject?.is_git_repo 
    ? (activeProject.git_is_dirty ? 'MODIFIED' : 'SYNCED')
    : (activeProject ? 'NO_GIT' : 'IDLE')
  const guardStatus = guardData?.status || 'ACTIVE'
  const activeModel = backendSettings?.ai?.CHAT_MODEL || backendSettings?.OLLAMA_LLM_MODEL || 'qwen2.5-coder:14b'

  return (
    <header className="h-14 border-b border-[#202832] bg-[#090C10] px-4 flex items-center justify-between shrink-0 font-mono text-xs z-30 select-none">
      {/* ── Left: Project Quick Selector ── */}
      <div className="flex items-center gap-3 min-w-0">
        {activeProject ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setOpenProjectModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-[#F3F4F6] transition-colors truncate max-w-[180px] sm:max-w-xs px-2 py-1 rounded-lg bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/40"
              title={activeProject.path}
            >
              <FolderOpen className="h-3.5 w-3.5 text-[#18A957] shrink-0" />
              <span className="truncate">{activeProject.name}</span>
            </button>
            {isScanning && (
              <span className="flex items-center gap-1 text-[10px] text-[#18A957] bg-[#18A957]/10 px-2 py-0.5 rounded-full border border-[#18A957]/20 animate-pulse">
                <Activity className="h-2.5 w-2.5" />
                Scanning…
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={() => setOpenProjectModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-[#F3F4F6] px-2.5 py-1 rounded-lg border border-dashed border-[#202832] hover:border-[#18A957]/40"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Open Project</span>
          </button>
        )}
      </div>

      {/* ── Center: NASA-SPEC Live Telemetry HUD Bar ── */}
      <div className="hidden lg:flex items-center gap-3.5 bg-[#0D1117]/90 px-4 py-1.5 rounded-xl border border-[#202832] shadow-inner text-[11px]">
        {/* AI CORE */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isAiCoreOnline ? 'bg-[#18A957] animate-pulse' : (backendOnline === null || ollamaData === null) ? 'bg-[#8B949E]' : 'bg-[#EF4444]'}`} />
          <span className="text-[#8B949E]">AI CORE</span>
          <span className={`font-semibold ${isAiCoreOnline ? 'text-[#18A957]' : (backendOnline === null || ollamaData === null) ? 'text-[#8B949E]' : 'text-[#EF4444]'}`}>
            {(backendOnline === null || ollamaData === null) ? 'CHECKING...' : isAiCoreOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <span className="text-[#202832]">|</span>

        {/* OLLAMA */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isOllamaOnline ? 'bg-[#18A957]' : ollamaData === null ? 'bg-[#8B949E]' : 'bg-[#EF4444]'}`} />
          <span className="text-[#8B949E]">OLLAMA</span>
          <span className={`font-semibold ${isOllamaOnline ? 'text-[#18A957]' : ollamaData === null ? 'text-[#8B949E]' : 'text-[#EF4444]'}`}>
            {ollamaData === null ? 'CHECKING...' : isOllamaOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <span className="text-[#202832]">|</span>

        {/* RAG */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${ragStatus === 'READY' ? 'bg-[#18A957]' : 'bg-[#F59E0B]'}`} />
          <span className="text-[#8B949E]">RAG</span>
          <span className={`font-semibold ${ragStatus === 'READY' ? 'text-[#18A957]' : 'text-[#F59E0B]'}`}>
            {ragStatus}
          </span>
        </div>

        <span className="text-[#202832]">|</span>

        {/* CHROMA */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isChromaReady ? 'bg-[#18A957]' : 'bg-[#EF4444]'}`} />
          <span className="text-[#8B949E]">CHROMA</span>
          <span className={`font-semibold ${isChromaReady ? 'text-[#18A957]' : 'text-[#EF4444]'}`}>
            {chromaOnline === null ? 'CHECKING...' : isChromaReady ? 'READY' : 'OFFLINE'}
          </span>
        </div>

        <span className="text-[#202832]">|</span>

        {/* AGENT */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${
            agentStatus === 'IDLE' ? 'bg-[#8B949E]' : agentStatus === 'SUCCESS' ? 'bg-[#18A957]' : 'bg-[#8B5CF6] animate-pulse'
          }`} />
          <span className="text-[#8B949E]">AGENT</span>
          <span className={`font-semibold ${
            agentStatus === 'IDLE' ? 'text-[#8B949E]' : agentStatus === 'SUCCESS' ? 'text-[#18A957]' : 'text-[#8B5CF6]'
          }`}>
            {agentStatus}
          </span>
        </div>

        <span className="text-[#202832]">|</span>

        {/* GIT */}
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${gitStatus === 'SYNCED' ? 'bg-[#18A957]' : 'bg-[#F59E0B]'}`} />
          <span className="text-[#8B949E]">GIT</span>
          <span className={`font-semibold ${gitStatus === 'SYNCED' ? 'text-[#18A957]' : 'text-[#F59E0B]'}`}>
            {gitStatus}
          </span>
        </div>

        <span className="text-[#202832]">|</span>

        {/* GUARD */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#18A957] text-[10px]">🛡</span>
          <span className="text-[#8B949E]">GUARD</span>
          <span className="text-[#18A957] font-semibold">{guardStatus}</span>
        </div>
      </div>

      {/* ── Right: Active Model Badge & Quick Controls ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Search Command Palette Trigger Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0D1117] border border-[#202832] hover:border-[#18A957]/50 text-[#8B949E] hover:text-[#F3F4F6] transition-all shadow-sm group cursor-pointer"
          title="Open Command Palette (Ctrl+K)"
        >
          <Search className="h-3 w-3 text-[#18A957] group-hover:scale-110 transition-transform" />
          <span className="text-[11px]">Search NEXUS...</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#161C24] text-[#8B949E] border border-[#202832] font-mono font-semibold">
            Ctrl K
          </span>
        </button>

        {/* Model Badge */}
        <div 
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1117] border border-[#202832] text-[#F3F4F6] font-semibold text-[11px] shadow-sm"
          title={`Active Ollama Model: ${activeModel}`}
        >
          <Cpu className="h-3 w-3 text-[#18A957]" />
          <span className="truncate max-w-[130px] sm:max-w-[160px]">{activeModel}</span>
        </div>

        {/* Manual Poll Trigger */}
        <button
          onClick={pollSystemHealth}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors disabled:opacity-50"
          title="Refresh All System HUD Statuses"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#18A957]' : ''}`} />
        </button>

        {/* Settings Gear */}
        <Link
          to="/settings"
          className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
          title="System Settings"
        >
          <span className="text-xs">⚙</span>
        </Link>
      </div>
    </header>
  )
}
