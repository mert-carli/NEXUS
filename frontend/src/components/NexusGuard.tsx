import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  CheckCircle2, 
  X, 
  Terminal, 
  FolderLock, 
  RefreshCw, 
  Zap, 
  Eye,
  KeyRound,
  Layers
} from 'lucide-react'
import { api, GuardStatusData, GuardThreatItem } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'

export default function NexusGuard() {
  const { activeProject } = useProjectStore()
  const [guardData, setGuardData] = useState<GuardStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeBlockedModal, setActiveBlockedModal] = useState<GuardThreatItem | null>(null)
  const [securityToast, setSecurityToast] = useState<GuardThreatItem | null>(null)
  const [showLogDrawer, setShowLogDrawer] = useState(false)

  const fetchGuardStatus = async () => {
    setLoading(true)
    try {
      const data = await api.guardStatus()
      setGuardData(data)
    } catch (err) {
      console.error("Failed to fetch guard status:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGuardStatus()
    const timer = setInterval(fetchGuardStatus, 30000)
    return () => clearInterval(timer)
  }, [])

  const handleSimulate = async () => {
    try {
      const res = await api.simulateGuardThreat()
      setSecurityToast(res.threat)
      fetchGuardStatus()
      // Auto-hide toast after 8 seconds
      setTimeout(() => {
        setSecurityToast(null)
      }, 8000)
    } catch (err) {
      console.error("Simulation failed:", err)
    }
  }

  if (!activeProject) return null

  const threatsCount = String(guardData?.threats_blocked ?? 0).padStart(2, '0')
  const pathActive = guardData ? guardData.protections?.path_protection?.status === 'ACTIVE' : true
  const cmdActive = guardData ? guardData.protections?.command_safety?.status === 'ACTIVE' : true
  const secretsActive = guardData ? guardData.protections?.protected_files?.status === 'ACTIVE' : true
  const workspaceActive = guardData ? guardData.protections?.workspace_boundary?.status === 'ACTIVE' : true

  return (
    <>
      {/* ── Main NEXUS GUARD Titanium Card ── */}
      <div className="rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] via-[#0D1117] to-[#0A0D12] overflow-hidden shadow-2xl transition-all duration-300 hover:border-[#18A957]/30 font-mono">
        {/* Header */}
        <div className="border-b border-[#202832] bg-[#161C24]/90 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#18A957]/10 border border-[#18A957]/30 text-[#18A957]">
              <ShieldCheck className="h-5 w-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18A957] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#18A957]" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider text-[#F3F4F6] uppercase flex items-center gap-1.5">
                  NEXUS GUARD
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#18A957]/15 text-[#18A957] border border-[#18A957]/30 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18A957] animate-pulse" />
                  {guardData?.status || 'PROTECTED'}
                </span>
              </div>
              <p className="text-[11px] text-[#8B949E]">Continuous Sandbox Boundary, Secret Leak & Execution Guard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-semibold transition-colors"
              title="Trigger simulated security violation"
            >
              <Zap className="h-3.5 w-3.5" />
              Simulate Block
            </button>
            <button
              onClick={fetchGuardStatus}
              disabled={loading}
              className="p-1.5 rounded-lg border border-[#202832] bg-[#0D1117] hover:border-[#18A957]/40 text-[#8B949E] hover:text-[#F3F4F6] transition-colors disabled:opacity-50"
              title="Refresh Security Status"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-[#18A957]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Security Checklist Matrix */}
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3 text-xs">
            {/* Path */}
            <div className="flex-1 min-w-[150px] flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832]">
              <div className="flex items-center gap-2">
                <FolderLock className={`h-4 w-4 shrink-0 ${pathActive ? 'text-[#18A957]' : 'text-[#EF4444]'}`} />
                <span className="text-[#F3F4F6] font-bold whitespace-nowrap">Path</span>
              </div>
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${pathActive ? 'text-[#18A957]' : 'text-[#EF4444]'}`} />
            </div>

            {/* Commands */}
            <div className="flex-1 min-w-[150px] flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832]">
              <div className="flex items-center gap-2">
                <Terminal className={`h-4 w-4 shrink-0 ${cmdActive ? 'text-[#3B82F6]' : 'text-[#EF4444]'}`} />
                <span className="text-[#F3F4F6] font-bold whitespace-nowrap">Commands</span>
              </div>
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${cmdActive ? 'text-[#18A957]' : 'text-[#EF4444]'}`} />
            </div>

            {/* Secrets */}
            <div className="flex-1 min-w-[150px] flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832]">
              <div className="flex items-center gap-2">
                <KeyRound className={`h-4 w-4 shrink-0 ${secretsActive ? 'text-[#8B5CF6]' : 'text-[#EF4444]'}`} />
                <span className="text-[#F3F4F6] font-bold whitespace-nowrap">Secrets</span>
              </div>
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${secretsActive ? 'text-[#18A957]' : 'text-[#EF4444]'}`} />
            </div>

            {/* Workspace */}
            <div className="flex-1 min-w-[150px] flex items-center justify-between p-3 rounded-xl bg-[#0D1117] border border-[#202832]">
              <div className="flex items-center gap-2">
                <Layers className={`h-4 w-4 shrink-0 ${workspaceActive ? 'text-[#06B6D4]' : 'text-[#EF4444]'}`} />
                <span className="text-[#F3F4F6] font-bold whitespace-nowrap">Workspace</span>
              </div>
              <CheckCircle2 className={`h-4 w-4 shrink-0 ${workspaceActive ? 'text-[#18A957]' : 'text-[#EF4444]'}`} />
            </div>

            {/* Threats Blocked Counter */}
            <div className="flex-1 min-w-[160px] flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-[#11161D] border border-red-500/30">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-red-400 font-bold whitespace-nowrap">Threats blocked</span>
              </div>
              <button
                onClick={() => setShowLogDrawer(true)}
                className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-black text-xs hover:bg-red-500/30 transition-colors shrink-0"
                title="View Audit Logs"
              >
                {threatsCount}
              </button>
            </div>
          </div>

          {/* Quick Threat Incident Feed (Last Item Banner) */}
          {guardData && guardData.recent_threats.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold text-[11px] uppercase">LATEST INTERCEPTED THREAT:</span>
                    <span className="text-[10px] text-[#8B949E]">{guardData.recent_threats[0].timestamp}</span>
                  </div>
                  <p className="text-[#F3F4F6] truncate mt-0.5">
                    {guardData.recent_threats[0].reason} &rarr; <span className="text-red-300 font-semibold">{guardData.recent_threats[0].target}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveBlockedModal(guardData.recent_threats[0])}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
              >
                <Eye className="h-3 w-3" />
                VIEW DETAILS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Global Security Event Toast ── */}
      {securityToast && (
        <div className="fixed top-16 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300 font-mono">
          <div className="rounded-2xl border-2 border-red-500/60 bg-[#0D1117]/95 backdrop-blur-xl p-4 shadow-2xl shadow-red-500/20 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/20 text-red-400 shrink-0 border border-red-500/40">
                  <ShieldAlert className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-red-400 tracking-wider flex items-center gap-1.5 uppercase">
                    ⚠ SECURITY EVENT
                  </span>
                  <p className="text-[#F3F4F6] font-semibold mt-0.5">
                    {securityToast.reason}
                  </p>
                  <p className="text-[11px] text-red-300/90 font-mono mt-1 truncate bg-red-500/10 p-1.5 rounded border border-red-500/20">
                    Target: {securityToast.target}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSecurityToast(null)}
                className="text-[#8B949E] hover:text-[#F3F4F6] p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[#202832]">
              <button
                onClick={() => {
                  setActiveBlockedModal(securityToast)
                  setSecurityToast(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition-colors shadow-sm"
              >
                VIEW DETAILS &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ⚠ ACTION BLOCKED Interactive Modal ── */}
      {activeBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
          <div className="relative w-full max-w-lg rounded-2xl border-2 border-red-500/50 bg-[#0D1117] p-6 shadow-2xl shadow-red-500/20">
            {/* Red Pulse Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-[#202832]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/40 text-red-400">
                  <ShieldAlert className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-red-400 tracking-wide flex items-center gap-2">
                    ⚠ ACTION BLOCKED
                  </h3>
                  <p className="text-xs text-[#8B949E]">NEXUS Guard intercepted and prevented this operation.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveBlockedModal(null)}
                className="text-[#8B949E] hover:text-[#F3F4F6] p-1.5 rounded-lg hover:bg-[#202832] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Blocked Incident Details */}
            <div className="my-5 space-y-3.5 text-xs">
              <div className="rounded-xl bg-[#11161D] p-3 border border-[#202832]">
                <span className="text-[10px] uppercase text-[#8B949E] block mb-1">Reason</span>
                <p className="text-sm font-semibold text-[#F3F4F6]">
                  {activeBlockedModal.reason}
                </p>
              </div>

              <div className="rounded-xl bg-[#11161D] p-3 border border-[#202832]">
                <span className="text-[10px] uppercase text-[#8B949E] block mb-1">Target Resource</span>
                <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 break-all">
                  {activeBlockedModal.target}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#11161D] p-3 border border-[#202832]">
                  <span className="text-[10px] uppercase text-[#8B949E] block mb-0.5">Rule Violated</span>
                  <span className="text-xs font-semibold text-[#F3F4F6]">{activeBlockedModal.rule}</span>
                </div>
                <div className="rounded-xl bg-[#11161D] p-3 border border-[#202832]">
                  <span className="text-[10px] uppercase text-[#8B949E] block mb-0.5">Security Level</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    {activeBlockedModal.severity}
                  </span>
                </div>
              </div>

              {activeBlockedModal.details && (
                <div className="rounded-xl bg-[#11161D]/60 p-3 border border-[#202832]/60 text-[11px] text-[#8B949E]">
                  <span className="text-[10px] uppercase text-[#8B949E] block mb-0.5">Protection Mechanism</span>
                  {activeBlockedModal.details}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#202832]">
              <button
                onClick={() => {
                  setActiveBlockedModal(null)
                  setShowLogDrawer(true)
                }}
                className="px-4 py-2 rounded-xl border border-[#202832] bg-[#11161D] hover:border-[#18A957]/40 text-xs text-[#F3F4F6] font-semibold transition-colors"
              >
                VIEW FULL AUDIT LOG
              </button>
              <button
                onClick={() => setActiveBlockedModal(null)}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-lg shadow-red-500/20"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security Audit Log Drawer ── */}
      {showLogDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
          <div className="w-full max-w-md bg-[#0D1117] border-l border-[#202832] h-full flex flex-col justify-between p-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#202832]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#18A957]" />
                  <h3 className="text-sm font-bold text-[#F3F4F6] uppercase">NEXUS Security Audit Log</h3>
                </div>
                <button
                  onClick={() => setShowLogDrawer(false)}
                  className="text-[#8B949E] hover:text-[#F3F4F6] p-1 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
                {guardData?.recent_threats.map((threat) => (
                  <div
                    key={threat.id}
                    onClick={() => setActiveBlockedModal(threat)}
                    className="p-3 rounded-xl border border-[#202832] bg-[#11161D] hover:border-red-500/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-red-400 font-bold">{threat.action}</span>
                      <span className="text-[#8B949E]">{threat.timestamp}</span>
                    </div>
                    <p className="text-xs font-semibold text-[#F3F4F6]">{threat.reason}</p>
                    <p className="text-[11px] text-[#8B949E] truncate bg-[#0D1117] p-1.5 rounded border border-[#202832]/60">
                      {threat.target}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#202832]">
              <button
                onClick={() => setShowLogDrawer(false)}
                className="w-full py-2 rounded-xl bg-[#11161D] hover:bg-[#161C24] text-xs text-[#8B949E] hover:text-[#F3F4F6] font-semibold border border-[#202832] transition-colors"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
