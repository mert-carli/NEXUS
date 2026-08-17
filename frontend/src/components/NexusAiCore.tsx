import { useState, useEffect, useCallback } from 'react'
import { 
  Sparkles, 
  Cpu, 
  Settings as SettingsIcon, 
  RefreshCw, 
  Gauge, 
  Sliders,
  Layers,
  Zap,
  ShieldCheck,
  Bot,
  Database,
  CheckCircle2
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api, OllamaHealth, BASE_URL } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import { useAgentStore } from '@/store/agentStore'
import { useSettingsStore } from '@/store/settingsStore'

export type PulseOverrideMode = 'AUTO' | 'RAG' | 'AGENT' | 'CODE' | 'SECURITY' | 'APPLY'

export default function NexusAiCore() {
  const { activeProject, setActiveProject, isScanning, setIsScanning } = useProjectStore()
  const { status: agentStatus, telemetry } = useAgentStore()
  const { backendSettings, loadSettings } = useSettingsStore()
  const navigate = useNavigate()

  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [quickQuery, setQuickQuery] = useState('')
  const [pulseMode, setPulseMode] = useState<PulseOverrideMode>('AUTO')

  // Fetch settings & ollama health
  const checkOllama = useCallback(async () => {
    setIsCheckingHealth(true)
    try {
      const res = await api.ollamaHealth()
      setOllamaHealth(res)
    } catch {
      setOllamaHealth({ status: 'error', message: 'Ollama is not responding' })
    } finally {
      setIsCheckingHealth(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    checkOllama()
    const timer = setInterval(checkOllama, 30000)
    return () => clearInterval(timer)
  }, [loadSettings, checkOllama])

  const isOnline = ollamaHealth?.status === 'ok'
  const chatModel = backendSettings?.ai?.CHAT_MODEL || backendSettings?.OLLAMA_LLM_MODEL || 'qwen2.5-coder:14b'
  const embedModel = backendSettings?.ai?.EMBEDDING_MODEL || backendSettings?.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
  const temperature = backendSettings?.ai?.TEMPERATURE ?? 0.2
  const maxTokens = backendSettings?.ai?.MAX_TOKENS ?? 4096

  // Calculate live pulse characteristics
  const getPulseConfig = () => {
    const effectiveMode = pulseMode === 'AUTO' 
      ? (isScanning 
          ? 'RAG' 
          : agentStatus === 'ANALYZING' || agentStatus === 'PLANNING' 
            ? 'AGENT' 
            : agentStatus === 'PROPOSING' || agentStatus === 'FIXING'
              ? 'CODE'
              : agentStatus === 'APPLYING' || agentStatus === 'SUCCESS'
                ? 'APPLY'
                : agentStatus === 'FAILED'
                  ? 'SECURITY'
                  : 'IDLE')
      : pulseMode

    switch (effectiveMode) {
      case 'RAG':
        return {
          label: 'RAG SEARCH IN PROGRESS',
          sub: 'Searching Codebase & Vector Chunks',
          orbText: 'RAG',
          color: '#06B6D4',
          secondary: '#3B82F6',
          bgGradient: 'from-[#06B6D4]/30 via-[#3B82F6]/10 to-[#0D1117]',
          glow: 'rgba(6, 182, 212, 0.25)',
          pulseSpeed: 'animate-ping',
          spinSpeed: 'animate-[spin_6s_linear_infinite]'
        }
      case 'AGENT':
        return {
          label: 'AGENT REASONING & PLANNING',
          sub: 'Autonomous Multi-Step Logic Pipeline',
          orbText: 'AGENT',
          color: '#8B5CF6',
          secondary: '#A855F7',
          bgGradient: 'from-[#8B5CF6]/30 via-[#A855F7]/10 to-[#0D1117]',
          glow: 'rgba(139, 92, 246, 0.25)',
          pulseSpeed: 'animate-pulse',
          spinSpeed: 'animate-[spin_8s_linear_infinite]'
        }
      case 'CODE':
        return {
          label: 'CODE SYNTHESIS & DIFF GEN',
          sub: 'Generating Precision Code Modifications',
          orbText: 'DIFF',
          color: '#F59E0B',
          secondary: '#EAB308',
          bgGradient: 'from-[#F59E0B]/30 via-[#EAB308]/10 to-[#0D1117]',
          glow: 'rgba(245, 158, 11, 0.25)',
          pulseSpeed: 'animate-bounce',
          spinSpeed: 'animate-[spin_10s_linear_infinite]'
        }
      case 'SECURITY':
        return {
          label: 'SECURITY GUARD INTERCEPTION',
          sub: 'Path Sandboxing & Threat Interceptor',
          orbText: 'GUARD',
          color: '#EF4444',
          secondary: '#DC2626',
          bgGradient: 'from-[#EF4444]/30 via-[#DC2626]/10 to-[#0D1117]',
          glow: 'rgba(239, 68, 68, 0.35)',
          pulseSpeed: 'animate-ping',
          spinSpeed: 'animate-[spin_4s_linear_infinite]'
        }
      case 'APPLY':
        return {
          label: 'APPLYING & TEST VERIFICATION',
          sub: 'Atomic Write & Automated Test Runner',
          orbText: 'APPLY',
          color: '#10B981',
          secondary: '#22C55E',
          bgGradient: 'from-[#10B981]/30 via-[#22C55E]/10 to-[#0D1117]',
          glow: 'rgba(16, 185, 129, 0.3)',
          pulseSpeed: 'animate-pulse',
          spinSpeed: 'animate-[spin_12s_linear_infinite]'
        }
      default:
        return {
          label: isOnline ? 'AI CORE ONLINE' : 'AI CORE OFFLINE',
          sub: isOnline ? 'Local Intelligence Engine Ready' : 'Ollama Service Disconnected',
          orbText: 'NEXUS',
          color: isOnline ? '#18A957' : '#EF4444',
          secondary: isOnline ? '#22C55E' : '#DC2626',
          bgGradient: isOnline 
            ? 'from-[#18A957]/30 via-[#18A957]/10 to-[#0D1117]' 
            : 'from-[#EF4444]/30 via-[#EF4444]/10 to-[#0D1117]',
          glow: isOnline ? 'rgba(24, 169, 87, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          pulseSpeed: isOnline ? 'animate-pulse' : '',
          spinSpeed: 'animate-[spin_20s_linear_infinite]'
        }
    }
  }

  const pulse = getPulseConfig()

  // Calculate approximate context utilization
  const totalTokens = activeProject ? Math.round(activeProject.total_lines * 5.5) : 0
  const contextMax = 32768
  const contextPercent = totalTokens > 0 ? Math.min(100, Math.round((totalTokens / contextMax) * 100)) : 0

  const handleIndexProject = async () => {
    if (!activeProject || isIndexing) return
    setIsIndexing(true)
    setIsScanning(true)
    try {
      const response = await fetch(`${BASE_URL}/projects/${activeProject.id}/index`, {
        method: 'POST'
      })
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          if (text.includes('"type": "done"')) {
            const updated = await api.getProject(activeProject.id)
            setActiveProject(updated)
            break
          }
        }
      }
    } catch (err) {
      console.error("Index error:", err)
    } finally {
      setIsIndexing(false)
      setIsScanning(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] via-[#0D1117] to-[#0A0D12] p-6 shadow-2xl transition-all duration-500 hover:border-[#18A957]/30 font-mono">
      {/* Background Cyber Ambient Dynamic Glow */}
      <div 
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full blur-[110px] opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${pulse.color} 0%, transparent 70%)`
        }}
      />

      {/* Top Header / Core Identifier */}
      <div className="flex items-center justify-between border-b border-[#202832]/80 pb-4">
        <div className="flex items-center gap-3">
          <div 
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-500"
            style={{ 
              backgroundColor: `${pulse.color}15`,
              borderColor: `${pulse.color}40`,
              color: pulse.color
            }}
          >
            <Cpu className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`} style={{ backgroundColor: pulse.color }} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5`} style={{ backgroundColor: pulse.color }} />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wider text-[#F3F4F6] uppercase flex items-center gap-1.5">
                NEXUS AI CORE
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18A957]/10 text-[#18A957] border border-[#18A957]/20">
                PULSE v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#8B949E]">Dynamic Reactor & Multi-State Reasoning Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkOllama}
            disabled={isCheckingHealth}
            title="Refresh AI Status"
            className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? 'animate-spin text-[#18A957]' : ''}`} />
          </button>
          <Link
            to="/settings"
            title="AI Settings"
            className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Main NEXUS Pulse Centerpiece ── */}
      <div className="py-7 flex flex-col items-center justify-center text-center">
        {/* Holographic Pulse Center Reactor */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Outer Wave Rings */}
          <div 
            className={`absolute h-36 w-36 rounded-full border border-dashed ${pulse.spinSpeed} transition-all duration-700`}
            style={{ borderColor: `${pulse.color}30` }}
          />
          <div 
            className={`absolute h-28 w-28 rounded-full border opacity-40 ${pulse.pulseSpeed} transition-all duration-700`}
            style={{ borderColor: `${pulse.color}40` }}
          />
          <div 
            className="absolute h-20 w-20 rounded-full border border-dotted opacity-60 animate-[spin_15s_linear_infinite]"
            style={{ borderColor: `${pulse.color}60` }}
          />
          
          {/* Central Reactor Frame:
              ╭──────────────╮
              │      ◉       │
              │    NEXUS     │
              ╰──────────────╯
          */}
          <div 
            className={`relative flex flex-col items-center justify-center h-20 w-24 rounded-2xl border-2 bg-gradient-to-br ${pulse.bgGradient} shadow-2xl transition-all duration-500 backdrop-blur-md`}
            style={{ 
              borderColor: pulse.color,
              boxShadow: `0 0 25px ${pulse.glow}`
            }}
          >
            <span className="text-xl leading-none select-none animate-pulse" style={{ color: pulse.color }}>
              ◉
            </span>
            <span className="text-[11px] font-black tracking-widest uppercase mt-1" style={{ color: pulse.color }}>
              {pulse.orbText}
            </span>
          </div>
        </div>

        {/* Dynamic Status Title */}
        <div className="flex flex-col items-center gap-1 mb-5">
          <span 
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase border transition-all duration-500 shadow-sm"
            style={{
              backgroundColor: `${pulse.color}15`,
              borderColor: `${pulse.color}40`,
              color: pulse.color
            }}
          >
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: pulse.color }} />
            {pulse.label}
          </span>
          <span className="text-[11px] text-[#8B949E]">
            {pulse.sub}
          </span>
        </div>

        {/* Interactive Pulse Mode Selector Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-5 max-w-lg">
          <button
            onClick={() => setPulseMode('AUTO')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              pulseMode === 'AUTO' 
                ? 'bg-[#18A957]/20 border-[#18A957] text-[#18A957]' 
                : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#F3F4F6]'
            }`}
          >
            ● Live Auto
          </button>
          <button
            onClick={() => setPulseMode('RAG')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              pulseMode === 'RAG' 
                ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#06B6D4]' 
                : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#06B6D4]'
            }`}
          >
            <Database className="h-3 w-3 inline mr-1" />
            RAG Pulse
          </button>
          <button
            onClick={() => setPulseMode('AGENT')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              pulseMode === 'AGENT' 
                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#8B5CF6]' 
                : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#8B5CF6]'
            }`}
          >
            <Bot className="h-3 w-3 inline mr-1" />
            Agent Pulse
          </button>
          <button
            onClick={() => setPulseMode('CODE')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              pulseMode === 'CODE' 
                ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]' 
                : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#F59E0B]'
            }`}
          >
            <Zap className="h-3 w-3 inline mr-1" />
            Code Gen Pulse
          </button>
          <button
            onClick={() => setPulseMode('SECURITY')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              pulseMode === 'SECURITY' 
                ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]' 
                : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#EF4444]'
            }`}
          >
            <ShieldCheck className="h-3 w-3 inline mr-1" />
            Guard Warning
          </button>
          <button
            onClick={() => setPulseMode('APPLY')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
              pulseMode === 'APPLY' 
                ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]' 
                : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#10B981]'
            }`}
          >
            <CheckCircle2 className="h-3 w-3 inline mr-1" />
            Apply Pulse
          </button>
        </div>

        {/* Live System Telemetry HUD Chip */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4 text-[11px] font-mono max-w-xl">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1117] border border-[#202832]">
            <span className={`h-1.5 w-1.5 rounded-full ${telemetry?.tokens_per_second ? 'bg-[#18A957] animate-pulse' : 'bg-[#8B949E]'}`} />
            <span className="text-[#8B949E]">INFERENCE:</span>
            <span className="text-[#F3F4F6] font-bold">
              {telemetry?.tokens_per_second ? `${telemetry.tokens_per_second} tok/s` : 'IDLE'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1117] border border-[#202832]">
            <span className="text-[#8B949E]">TOKENS:</span>
            <span className="text-[#18A957] font-bold">
              {telemetry?.total_tokens ? `${telemetry.total_tokens.toLocaleString()} / 32,768` : (totalTokens > 0 ? `${totalTokens.toLocaleString()} / 32,768` : '0 / 32,768')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1117] border border-[#202832]">
            <span className="text-[#8B949E]">LATENCY:</span>
            <span className="text-[#3B82F6] font-bold">
              {telemetry?.latency_ms ? `${telemetry.latency_ms}ms` : 'IDLE'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#0D1117] border border-[#202832]">
            <span className="text-[#8B949E]">SANDBOX:</span>
            <span className="text-[#10B981] font-bold">ACTIVE (CWE-22)</span>
          </div>
        </div>

        {/* Active Model Name Block */}
        <div className="w-full max-w-md bg-[#0D1117]/80 border border-[#202832] rounded-xl p-3.5 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[#8B949E] uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#18A957]" /> ACTIVE LLM MODEL
            </span>
            <span className="text-[#8B949E]/70">Ollama Local</span>
          </div>
          <div className="text-base font-semibold text-[#F3F4F6] tracking-tight flex items-center justify-between">
            <span className="truncate" title={chatModel}>{chatModel}</span>
            <span className={`text-xs px-2 py-0.5 rounded border font-normal ${
              isCheckingHealth 
                ? 'bg-[#8B949E]/10 text-[#8B949E] border-[#8B949E]/20' 
                : isOnline 
                ? 'bg-[#18A957]/10 text-[#18A957] border-[#18A957]/20' 
                : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
            }`}>
              {isCheckingHealth ? 'CHECKING...' : isOnline ? 'READY' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Quick Dispatch Prompt Input */}
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            if (!quickQuery.trim()) return
            navigate('/assistant', { state: { prefill: quickQuery.trim() } })
          }} 
          className="w-full max-w-md mt-3.5 flex items-center gap-2"
        >
          <input
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Ask NEXUS about your code, search or propose a refactor..."
            className="flex-1 rounded-xl border border-[#202832] bg-[#07090D] px-4 py-2.5 text-xs text-[#F3F4F6] placeholder-[#8B949E]/50 focus:border-[#18A957]/50 focus:outline-none shadow-inner"
          />
          <button
            type="submit"
            disabled={!quickQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#18A957] to-[#22C55E] hover:from-[#18A957]/90 hover:to-[#22C55E]/90 text-white text-xs font-semibold transition-all disabled:opacity-40 shadow-sm"
          >
            Ask &rarr;
          </button>
        </form>
      </div>

      {/* Grid of Core Telemetry Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {/* Context Utilization */}
        <div className="bg-[#0D1117] border border-[#202832] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8B949E] font-medium flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-[#3B82F6]" /> CONTEXT
            </span>
            <span className="text-xs font-semibold text-[#3B82F6]">{contextPercent}%</span>
          </div>
          <div className="h-2 w-full bg-[#161C24] rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] rounded-full transition-all duration-500"
              style={{ width: `${contextPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#8B949E]/70">
            <span>{totalTokens.toLocaleString()} tokens</span>
            <span>32k window</span>
          </div>
        </div>

        {/* RAG Knowledge State */}
        <div className="bg-[#0D1117] border border-[#202832] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#8B949E] font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#18A957]" /> RAG ENGINE
            </span>
            <span className={`text-xs font-semibold ${activeProject?.index_status === 'READY' ? 'text-[#18A957]' : 'text-[#F59E0B]'}`}>
              {activeProject ? (activeProject.index_status || 'NOT_INDEXED') : 'NO PROJECT'}
            </span>
          </div>
          <p className="text-[11px] text-[#8B949E] truncate mb-2">
            Model: <strong className="text-[#F3F4F6]">{embedModel}</strong>
          </p>
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#202832]/60">
            <span className="text-[#8B949E]/70">{activeProject ? `${activeProject.source_files} source files` : '0 files'}</span>
            <button
              onClick={handleIndexProject}
              disabled={isIndexing}
              className="text-[#18A957] hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              {isIndexing ? 'Indexing…' : 'Re-index'}
            </button>
          </div>
        </div>

        {/* Agent Operational State */}
        <div className="bg-[#0D1117] border border-[#202832] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#8B949E] font-medium flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-[#8B5CF6]" /> AGENT STATE
            </span>
            <span className="text-xs font-semibold text-[#8B5CF6]">
              {agentStatus}
            </span>
          </div>
          <p className="text-[11px] text-[#8B949E] mb-2">
            Temp: <strong className="text-[#F3F4F6]">{temperature}</strong> | Max Tokens: <strong className="text-[#F3F4F6]">{maxTokens}</strong>
          </p>
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#202832]/60 text-[#8B949E]/70">
            <span>Execution: Strict</span>
            <span className="text-[#18A957]">● Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
