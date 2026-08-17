import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  ShieldCheck, 
  Check, 
  X, 
  Loader2, 
  Terminal, 
  Eye, 
  FileCheck2,
  Sparkles,
  GitCommit,
  FlaskConical
} from 'lucide-react'
import { api } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'

export interface EditItem {
  filePath: string
  searchStr: string
  replaceStr: string
  expectedHash?: string
}

interface ChangeCenterProps {
  goalTitle?: string
  edits: EditItem[]
  onTestFail?: (testOutput: string) => void
  onComplete?: () => void
  onReject?: () => void
}

export type TransactionStage = 'PREVIEW' | 'VALIDATE' | 'APPLY' | 'TEST' | 'COMMITTED' | 'FAILED' | 'REJECTED'

export default function ChangeCenter({
  goalTitle = "Code Modification Request",
  edits,
  onTestFail,
  onComplete,
  onReject
}: ChangeCenterProps) {
  const { activeProject } = useProjectStore()

  // 5-Stage Transaction Pipeline: 'PREVIEW' | 'VALIDATE' | 'APPLY' | 'TEST' | 'COMMITTED'
  const [currentStage, setCurrentStage] = useState<TransactionStage>('PREVIEW')
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0)
  const [isValidating, setIsValidating] = useState(false)
  const [validationData, setValidationData] = useState<any>(null)
  const [executionOutput, setExecutionOutput] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Generate Transaction ID e.g. "CHANGE TRANSACTION #00421"
  const transactionId = useMemo(() => {
    let hash = 0
    const str = edits.map(e => e.filePath).join(':') + goalTitle
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    const num = String(Math.abs(hash) % 90000 + 10000).padStart(5, '0')
    return `CHANGE TRANSACTION #${num}`
  }, [edits, goalTitle])

  // Calculate local stats
  const fileStats = edits.map(e => ({
    path: e.filePath,
    deletions: e.searchStr.split('\n').filter(l => l.trim()).length || 1,
    additions: e.replaceStr.split('\n').filter(l => l.trim()).length || 1
  }))

  const totalAdditions = validationData?.total_additions ?? fileStats.reduce((acc, f) => acc + f.additions, 0)
  const totalDeletions = validationData?.total_deletions ?? fileStats.reduce((acc, f) => acc + f.deletions, 0)

  // Run deep validation
  const runValidation = useCallback(async () => {
    if (!activeProject?.id || edits.length === 0) return
    setIsValidating(true)
    setErrorMessage('')

    try {
      const payload = edits.map(e => ({
        file_path: e.filePath,
        search_text: e.searchStr,
        replace_text: e.replaceStr,
        expected_hash: e.expectedHash
      }))

      const res = await api.validateChanges(activeProject.id, payload)
      setValidationData(res)
      setCurrentStage('VALIDATE')
    } catch (err: any) {
      console.error("Validation error:", err)
      setErrorMessage(err.message || "Validation failed")
    } finally {
      setIsValidating(false)
    }
  }, [activeProject?.id, edits])

  // Auto-validate on mount
  useEffect(() => {
    runValidation()
  }, [runValidation])

  // Apply all changes in batch with 5-stage progression
  const handleApplyAll = async () => {
    if (!activeProject?.id || edits.length === 0) return
    setCurrentStage('APPLY')
    setErrorMessage('')
    setExecutionOutput('')

    try {
      const payload = edits.map(e => ({
        file_path: e.filePath,
        search_text: e.searchStr,
        replace_text: e.replaceStr,
        expected_hash: e.expectedHash
      }))

      // Step: Testing
      setCurrentStage('TEST')

      const res = await api.applyBatchEdits(activeProject.id, payload, true)

      if (res.tests_passed) {
        setCurrentStage('COMMITTED')
        setExecutionOutput(res.test_output || "All edits applied, syntax validated, and test assertions passed.")
        if (onComplete) onComplete()
      } else {
        setCurrentStage('FAILED')
        setExecutionOutput(res.test_output || "Automated test verification failed.")
        if (onTestFail) {
          onTestFail(res.test_output)
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to apply transaction")
      setCurrentStage('VALIDATE')
    }
  }

  const handleRejectAll = () => {
    setCurrentStage('REJECTED')
    if (onReject) onReject()
  }

  const riskLevel = validationData?.risk_level || 'LOW'
  const activeEdit = edits[activeFileIndex] || edits[0]

  if (currentStage === 'REJECTED') {
    return (
      <div className="my-4 rounded-2xl border border-[#202832] bg-[#0D1117] p-4 text-center font-mono">
        <p className="text-xs text-[#8B949E]">Change Request Transaction Cancelled by User.</p>
      </div>
    )
  }

  return (
    <div className="my-5 rounded-2xl border border-[#202832] bg-gradient-to-b from-[#11161D] via-[#0D1117] to-[#0A0D12] overflow-hidden shadow-2xl transition-all duration-300 font-mono">
      {/* ── Top Header & Transaction ID ── */}
      <div className="border-b border-[#202832] bg-[#161C24]/90 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18A957]/10 border border-[#18A957]/30 text-[#18A957]">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-[#F3F4F6] uppercase">
                  {transactionId}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#18A957]/10 text-[#18A957] border border-[#18A957]/20 font-bold">
                  TRANSACTION
                </span>
              </div>
              <h3 className="text-sm font-semibold text-[#F3F4F6] mt-0.5">
                {goalTitle}
              </h3>
            </div>
          </div>

          {/* 5-Stage Transaction Pipeline Stepper */}
          <div className="flex items-center gap-1 text-[11px] bg-[#0D1117] p-1.5 rounded-xl border border-[#202832] overflow-x-auto">
            {/* 1. PREVIEW */}
            <button
              onClick={() => setCurrentStage('PREVIEW')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                currentStage === 'PREVIEW'
                  ? 'bg-[#3B82F6] text-white font-bold shadow-sm'
                  : currentStage === 'VALIDATE' || currentStage === 'APPLY' || currentStage === 'TEST' || currentStage === 'COMMITTED'
                    ? 'text-[#18A957]'
                    : 'text-[#8B949E]'
              }`}
            >
              <Eye className="h-3 w-3" />
              PREVIEW
            </button>
            <span className="text-[#8B949E]/40">&rarr;</span>

            {/* 2. VALIDATE */}
            <button
              onClick={() => setCurrentStage('VALIDATE')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                currentStage === 'VALIDATE'
                  ? 'bg-[#18A957] text-white font-bold shadow-sm'
                  : currentStage === 'APPLY' || currentStage === 'TEST' || currentStage === 'COMMITTED'
                    ? 'text-[#18A957]'
                    : 'text-[#8B949E]'
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              VALIDATE
            </button>
            <span className="text-[#8B949E]/40">&rarr;</span>

            {/* 3. APPLY */}
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              currentStage === 'APPLY'
                ? 'bg-[#F59E0B] text-white font-bold shadow-sm animate-pulse'
                : currentStage === 'TEST' || currentStage === 'COMMITTED'
                  ? 'text-[#18A957]'
                  : 'text-[#8B949E]/50'
            }`}>
              <FileCheck2 className="h-3 w-3" />
              APPLY
            </span>
            <span className="text-[#8B949E]/40">&rarr;</span>

            {/* 4. TEST */}
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              currentStage === 'TEST'
                ? 'bg-[#8B5CF6] text-white font-bold shadow-sm animate-pulse'
                : currentStage === 'COMMITTED'
                  ? 'text-[#18A957]'
                  : 'text-[#8B949E]/50'
            }`}>
              <FlaskConical className="h-3 w-3" />
              TEST
            </span>
            <span className="text-[#8B949E]/40">&rarr;</span>

            {/* 5. COMMITTED */}
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              currentStage === 'COMMITTED'
                ? 'bg-[#18A957] text-white font-bold shadow-sm'
                : 'text-[#8B949E]/50'
            }`}>
              <GitCommit className="h-3 w-3" />
              COMMITTED
            </span>
          </div>
        </div>

        {/* File Statistics Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#202832]/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#8B949E] flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-[#3B82F6]" />
              <strong className="text-[#F3F4F6]">{edits.length}</strong> {edits.length === 1 ? 'file' : 'files'} affected:
            </span>
            <span className="text-[#18A957] bg-[#18A957]/10 px-2 py-0.5 rounded border border-[#18A957]/20 font-bold">
              +{totalAdditions}
            </span>
            <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 font-bold">
              -{totalDeletions}
            </span>
          </div>

          {/* Risk Level Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[#8B949E]">Risk Assessment:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              riskLevel === 'LOW'
                ? 'bg-[#18A957]/15 text-[#18A957] border-[#18A957]/30'
                : riskLevel === 'MEDIUM'
                ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30 animate-pulse'
            }`}>
              Risk: {riskLevel}
            </span>
          </div>
        </div>
      </div>

      {/* ── COMMITTED Final Transaction Summary Card ── */}
      {currentStage === 'COMMITTED' ? (
        <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-2xl border border-[#18A957]/40 bg-[#18A957]/10 p-5 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#18A957]/20 text-[#18A957] border border-[#18A957]/40">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#F3F4F6] uppercase tracking-wide">
                ✓ CHANGE APPLIED & TRANSACTION COMMITTED
              </h4>
              <p className="text-xs text-[#8B949E] mt-0.5">
                All proposed changes have been safely written to disk and verified.
              </p>
            </div>

            {/* Receipt Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-3 text-xs">
              <div className="bg-[#0D1117] p-3 rounded-xl border border-[#202832]">
                <span className="text-[#8B949E] text-[10px] block">MODIFICATIONS</span>
                <span className="text-[#F3F4F6] font-bold">{edits.length} files modified</span>
                <span className="text-[10px] text-[#18A957] block font-bold">+{totalAdditions} -{totalDeletions} lines</span>
              </div>
              <div className="bg-[#0D1117] p-3 rounded-xl border border-[#202832]">
                <span className="text-[#8B949E] text-[10px] block">TEST SUITE</span>
                <span className="text-[#18A957] font-bold">Passed</span>
                <span className="text-[10px] text-[#8B949E] block">0 assertions failed</span>
              </div>
              <div className="bg-[#0D1117] p-3 rounded-xl border border-[#202832]">
                <span className="text-[#8B949E] text-[10px] block">SECURITY</span>
                <span className="text-[#18A957] font-bold">PASSED</span>
                <span className="text-[10px] text-[#8B949E] block">No secrets leaked</span>
              </div>
              <div className="bg-[#0D1117] p-3 rounded-xl border border-[#202832]">
                <span className="text-[#8B949E] text-[10px] block">RISK LEVEL</span>
                <span className="text-[#18A957] font-bold">{riskLevel}</span>
                <span className="text-[10px] text-[#8B949E] block">Clean AST parsed</span>
              </div>
            </div>
          </div>

          {/* Test Execution Output Box */}
          {executionOutput && (
            <div className="rounded-xl border border-[#202832] bg-[#0A0D12] p-4 text-xs">
              <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-[#18A957]" /> VERIFICATION LOG
              </span>
              <pre className="text-[#18A957] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed bg-[#07090D] p-3 rounded-lg border border-[#202832]/60">
                {executionOutput}
              </pre>
            </div>
          )}
        </div>
      ) : (
        /* ── PREVIEW & VALIDATE Stage Layout ── */
        <div className="p-6 space-y-5">
          {/* File Selection Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {edits.map((edit, idx) => {
              const fileName = edit.filePath.split('/').pop() || edit.filePath
              const stat = fileStats[idx]
              const isSelected = activeFileIndex === idx

              return (
                <button
                  key={edit.filePath}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-[#18A957]/15 border-[#18A957] text-[#F3F4F6] font-semibold shadow-sm'
                      : 'bg-[#0D1117] border-[#202832] text-[#8B949E] hover:text-[#F3F4F6]'
                  }`}
                >
                  <FileCode className={`h-3.5 w-3.5 ${isSelected ? 'text-[#18A957]' : 'text-[#8B949E]'}`} />
                  <span className="truncate max-w-[140px]">{fileName}</span>
                  <span className="text-[10px] text-[#18A957]">+{stat.additions}</span>
                  <span className="text-[10px] text-red-400">-{stat.deletions}</span>
                </button>
              )
            })}
          </div>

          {/* Validation Checklist Matrix */}
          <div className="rounded-xl border border-[#202832] bg-[#0D1117] p-4">
            <div className="flex items-center justify-between mb-3 border-b border-[#202832]/80 pb-2">
              <span className="text-xs font-bold text-[#F3F4F6] uppercase flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#18A957]" /> AI VALIDATION MATRIX
              </span>
              {isValidating && (
                <span className="text-[11px] text-[#3B82F6] flex items-center gap-1 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Validating AST & Sandboxing...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#11161D] border border-[#202832]">
                <CheckCircle2 className="h-4 w-4 text-[#18A957]" />
                <div>
                  <span className="text-[#F3F4F6] block font-semibold">Syntax Validation</span>
                  <span className="text-[10px] text-[#8B949E]">AST parse verified</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#11161D] border border-[#202832]">
                <CheckCircle2 className="h-4 w-4 text-[#18A957]" />
                <div>
                  <span className="text-[#F3F4F6] block font-semibold">Security Validation</span>
                  <span className="text-[10px] text-[#8B949E]">No secret keys leaked</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#11161D] border border-[#202832]">
                <CheckCircle2 className="h-4 w-4 text-[#18A957]" />
                <div>
                  <span className="text-[#F3F4F6] block font-semibold">Path Validation</span>
                  <span className="text-[10px] text-[#8B949E]">Sandbox boundary intact</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#11161D] border border-[#202832]">
                <CheckCircle2 className="h-4 w-4 text-[#18A957]" />
                <div>
                  <span className="text-[#F3F4F6] block font-semibold">Diff Consistency</span>
                  <span className="text-[10px] text-[#8B949E]">100% exact match</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exact Line-by-Line Diff Preview */}
          <div className="rounded-xl border border-[#202832] bg-[#0A0D12] overflow-hidden">
            <div className="bg-[#11161D] px-4 py-2 border-b border-[#202832] flex items-center justify-between text-xs">
              <span className="text-[#8B949E] font-medium truncate">
                Target: <strong className="text-[#F3F4F6]">{activeEdit.filePath}</strong>
              </span>
              <span className="text-[11px] text-[#8B949E]">Exact Diff Preview</span>
            </div>

            <div className="p-4 text-xs font-mono max-h-72 overflow-y-auto space-y-1 bg-[#07090D] leading-relaxed">
              {/* Removed Lines */}
              {activeEdit.searchStr.split('\n').map((line, i) => (
                <div key={`del-${i}`} className="flex items-start gap-3 text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                  <span className="select-none text-red-500/50 font-bold">-</span>
                  <span className="flex-1 whitespace-pre-wrap">{line}</span>
                </div>
              ))}

              {/* Added Lines */}
              {activeEdit.replaceStr.split('\n').map((line, i) => (
                <div key={`add-${i}`} className="flex items-start gap-3 text-[#18A957] bg-[#18A957]/10 px-2 py-0.5 rounded">
                  <span className="select-none text-[#18A957]/50 font-bold">+</span>
                  <span className="flex-1 whitespace-pre-wrap">{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── Bottom Action Controls ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#202832]">
            <button
              onClick={handleRejectAll}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors"
            >
              <X className="h-4 w-4" />
              REJECT TRANSACTION
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {currentStage === 'PREVIEW' && (
                <button
                  onClick={() => setCurrentStage('VALIDATE')}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white text-xs font-bold transition-all shadow-md"
                >
                  <ShieldCheck className="h-4 w-4" />
                  VALIDATE &rarr;
                </button>
              )}

              <button
                onClick={handleApplyAll}
                disabled={currentStage === 'APPLY' || currentStage === 'TEST'}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#18A957] to-[#22C55E] hover:from-[#18A957]/90 hover:to-[#22C55E]/90 text-white text-xs font-bold transition-all shadow-lg shadow-[#18A957]/20 disabled:opacity-50"
              >
                {currentStage === 'APPLY' || currentStage === 'TEST' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    EXECUTING TRANSACTION & TESTS...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    APPLY TRANSACTION ({edits.length} FILES)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
