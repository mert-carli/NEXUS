import { useState, useMemo } from 'react'
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  FileCode2,
  Rocket
} from 'lucide-react'
import { useAgentStore } from '@/store/agentStore'

interface MissionStepItem {
  id: string
  title: string
  subtitle: string
  status: 'pending' | 'running' | 'done' | 'failed'
}

const CANONICAL_STEPS: MissionStepItem[] = [
  { id: 'understand', title: 'UNDERSTAND', subtitle: 'Request interpreted & intent formulated', status: 'pending' },
  { id: 'retrieve', title: 'RETRIEVE', subtitle: 'Retrieving vector embeddings & AST chunks', status: 'pending' },
  { id: 'analyze', title: 'ANALYZE', subtitle: 'Analyzing dependency graph & AST syntax', status: 'pending' },
  { id: 'plan', title: 'PLAN', subtitle: 'Synthesizing modification strategy', status: 'pending' },
  { id: 'generate', title: 'GENERATE', subtitle: 'Producing surgical code diffs', status: 'pending' },
  { id: 'validate', title: 'VALIDATE', subtitle: 'CWE-22 sandbox & security checks', status: 'pending' },
  { id: 'test', title: 'TEST', subtitle: 'Automated test suite verification', status: 'pending' },
]

export default function AgentStatus() {
  const { status, plan, error, steps, activeQuery } = useAgentStore()
  const [isExpanded, setIsExpanded] = useState(true)

  // Early return condition stored in variable to avoid hook violation
  const shouldHide = status === "IDLE" && steps.length === 0 && !plan && !error && !activeQuery

  // Generate Mission Code ID e.g. "MISSION #0248"
  const missionCode = useMemo(() => {
    if (!activeQuery) return 'MISSION #0248'
    let hash = 0
    for (let i = 0; i < activeQuery.length; i++) {
      hash = (hash << 5) - hash + activeQuery.charCodeAt(i)
      hash |= 0
    }
    const num = String(Math.abs(hash) % 9000 + 1000).padStart(4, '0')
    return `MISSION #${num}`
  }, [activeQuery])

  // Extract Files in Scope
  const filesInScope = useMemo(() => {
    const textToScan = `${activeQuery || ''} ${plan?.goal || ''} ${plan?.steps.join(' ') || ''} ${steps.map(s => s.detail || '').join(' ')}`
    const matches = textToScan.match(/[a-zA-Z0-9_\-./]+\.(py|ts|tsx|js|jsx|go|rs|java|cpp|json|md)/g) || []
    const uniqueFiles = Array.from(new Set(matches)).slice(0, 5)

    if (uniqueFiles.length === 0) {
      return []
    }

    return uniqueFiles.map((f, idx) => ({
      name: f,
      state: idx === 0 && (status === 'ANALYZING' || status === 'PLANNING')
        ? 'ANALYZING'
        : idx === 0 && (status === 'PROPOSING' || status === 'APPLYING')
          ? 'MODIFYING'
          : status === 'SUCCESS'
            ? 'APPLIED'
            : 'PENDING'
    }))
  }, [activeQuery, plan, steps, status])

  // Map mission stages
  const mappedSteps: MissionStepItem[] = CANONICAL_STEPS.map((s, idx) => {
    const liveMatch = steps.find(ls => ls.id === s.id || ls.title.toLowerCase().includes(s.title.toLowerCase()))
    if (liveMatch) {
      return {
        ...s,
        status: liveMatch.status,
        subtitle: liveMatch.detail || s.subtitle
      }
    }

    if (status === 'ANALYZING') {
      if (idx === 0) return { ...s, status: 'done', subtitle: 'Request interpreted' }
      if (idx === 1) return { ...s, status: 'done', subtitle: '18 relevant chunks retrieved' }
      if (idx === 2) return { ...s, status: 'running', subtitle: 'Analyzing dependent modules...' }
    } else if (status === 'PLANNING') {
      if (idx <= 2) return { ...s, status: 'done' }
      if (idx === 3) return { ...s, status: 'running', subtitle: 'Preparing modification plan...' }
    } else if (status === 'PROPOSING' || status === 'APPLYING') {
      if (idx <= 3) return { ...s, status: 'done' }
      if (idx === 4) return { ...s, status: 'running', subtitle: 'Generating precise diffs...' }
    } else if (status === 'TESTING' || status === 'FIXING') {
      if (idx <= 4) return { ...s, status: 'done' }
      if (idx === 5 || idx === 6) return { ...s, status: 'running', subtitle: 'Running assertions...' }
    } else if (status === 'SUCCESS' || status === 'WAITING_APPROVAL') {
      return { ...s, status: 'done' }
    }
    return s
  })

  const completedCount = mappedSteps.filter(s => s.status === 'done').length
  const progressPercent = Math.round((completedCount / mappedSteps.length) * 100)

  if (shouldHide) {
    return null
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] via-[#0D1117] to-[#0A0D12] overflow-hidden shadow-2xl transition-all duration-300 font-mono">
      {/* ── Mission Header ── */}
      <div className="border-b border-[#202832] bg-[#161C24]/90 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6]">
            <Rocket className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#F3F4F6] uppercase">
                {missionCode}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                status === 'SUCCESS' || status === 'WAITING_APPROVAL'
                  ? 'bg-[#18A957]/15 text-[#18A957] border-[#18A957]/30'
                  : status === 'FAILED'
                  ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                  : 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30 animate-pulse'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status}
              </span>
            </div>
            {activeQuery && (
              <p className="text-xs text-[#E6EDF3] font-semibold mt-0.5">
                &ldquo;{activeQuery}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-[#8B949E]">Progress</span>
            <span className="text-xs font-bold text-[#18A957]">{progressPercent}%</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
            title={isExpanded ? 'Collapse Mission' : 'Expand Mission'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Mission Body ── */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ── STATUS Timeline Stream ── */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-black text-[#8B949E] uppercase tracking-widest mb-3">
              <span>STATUS</span>
              <span>{completedCount} / {mappedSteps.length} PHASES</span>
            </div>

            <div className="space-y-3.5 pl-2 border-l-2 border-[#202832] ml-2">
              {mappedSteps.map((step) => {
                const isDone = step.status === 'done'
                const isRunning = step.status === 'running'

                return (
                  <div key={step.id} className="relative pl-5 group">
                    {/* Status Symbol Indicator */}
                    <div className="absolute -left-[13px] top-0 flex items-center justify-center">
                      {isDone ? (
                        <span className="text-[#18A957] font-black text-xs">✓</span>
                      ) : isRunning ? (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B5CF6] opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#8B5CF6] text-[8px] font-black text-white items-center justify-center">
                            ●
                          </span>
                        </span>
                      ) : (
                        <span className="text-[#8B949E]/40 font-black text-xs">○</span>
                      )}
                    </div>

                    {/* Step Title & Subtitle */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black tracking-wider uppercase ${
                          isDone 
                            ? 'text-[#F3F4F6]' 
                            : isRunning 
                            ? 'text-[#8B5CF6]' 
                            : 'text-[#8B949E]/50'
                        }`}>
                          {step.title}
                        </span>
                        {isRunning && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] font-bold border border-[#8B5CF6]/30 animate-pulse">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {step.subtitle && (
                        <p className={`text-[11px] mt-0.5 ${isDone || isRunning ? 'text-[#8B949E]' : 'text-[#8B949E]/30'}`}>
                          {step.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── FILES Section ── */}
          {filesInScope.length > 0 && (
            <div className="pt-4 border-t border-[#202832]">
              <span className="text-[11px] font-black text-[#8B949E] uppercase tracking-widest block mb-3">
                FILES
              </span>
              <div className="space-y-2">
                {filesInScope.map((f) => (
                  <div key={f.name} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1117] border border-[#202832] text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className="h-4 w-4 text-[#3B82F6] shrink-0" />
                      <span className="text-[#F3F4F6] font-semibold truncate">{f.name}</span>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-black tracking-wider uppercase ${
                      f.state === 'ANALYZING'
                        ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 animate-pulse'
                        : f.state === 'MODIFYING'
                        ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 animate-pulse'
                        : f.state === 'APPLIED' || f.state === 'VERIFIED'
                        ? 'bg-[#18A957]/15 text-[#18A957] border border-[#18A957]/30'
                        : 'bg-[#202832]/60 text-[#8B949E] border border-[#202832]'
                    }`}>
                      {f.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Formulated Execution Plan Card ── */}
          {plan && (
            <div className="rounded-xl border border-[#202832] bg-[#0A0D12] p-4">
              <div className="flex items-center justify-between mb-3 border-b border-[#202832]/80 pb-2">
                <span className="text-xs font-bold text-[#8B5CF6] uppercase flex items-center gap-1.5">
                  <Rocket className="h-3.5 w-3.5" /> MISSION EXECUTION PLAN
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
                  {plan.steps.length} Steps
                </span>
              </div>

              {plan.goal && (
                <div className="mb-3">
                  <span className="text-[10px] uppercase text-[#8B949E] block mb-0.5">Objective</span>
                  <p className="text-xs text-[#F3F4F6] bg-[#11161D] p-2.5 rounded-lg border border-[#202832]">
                    {plan.goal}
                  </p>
                </div>
              )}

              {plan.steps.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase text-[#8B949E] block mb-1.5">Phase Breakdown</span>
                  <div className="space-y-1.5">
                    {plan.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#8B949E] bg-[#11161D]/60 p-2 rounded-lg border border-[#202832]/40">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#202832] text-[10px] text-[#F3F4F6] font-semibold">
                          {i + 1}
                        </span>
                        <span className="text-[#F3F4F6]/90">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
