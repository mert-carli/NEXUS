import { useState } from 'react'
import { FolderOpen, X, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'

export default function OpenProjectModal() {
  const { setOpenProjectModalOpen, setActiveProject, setIsScanning } = useProjectStore()
  const [path, setPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleOpen() {
    if (!path.trim()) return
    setError(null)
    setLoading(true)
    setIsScanning(true)
    try {
      const project = await api.openProject(path.trim())
      setActiveProject(project)
      setOpenProjectModalOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to open project.')
    } finally {
      setLoading(false)
      setIsScanning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg mx-4 rounded-xl border border-[#202832] bg-[#11161D] shadow-2xl"
        style={{ boxShadow: '0 0 0 1px #202832, 0 25px 50px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#202832]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#18A957]/10 flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-[#18A957]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F3F4F6]">Open Local Project</h2>
              <p className="text-xs text-[#8B949E]">Enter the full path to your project directory</p>
            </div>
          </div>
          <button
            onClick={() => setOpenProjectModalOpen(false)}
            className="p-1.5 rounded-md text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#202832] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8B949E] mb-2 uppercase tracking-wider">
              Project Path
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
              placeholder="C:\Users\username\projects\my-app"
              className="w-full px-3 py-2.5 rounded-lg border border-[#202832] bg-[#080B0F] text-[#F3F4F6] placeholder-[#8B949E]/50 text-sm font-mono focus:outline-none focus:border-[#18A957]/50 focus:ring-1 focus:ring-[#18A957]/20 transition-all"
              disabled={loading}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-[#8B949E]/70">
              NEXUS will scan and index this directory locally. No files will be uploaded.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5">
              <AlertCircle className="h-4 w-4 text-[#EF4444] mt-0.5 shrink-0" />
              <p className="text-xs text-[#EF4444]">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-[#18A957]/20 bg-[#18A957]/5">
              <Loader2 className="h-4 w-4 text-[#18A957] animate-spin" />
              <div>
                <p className="text-xs font-medium text-[#18A957]">Scanning project…</p>
                <p className="text-xs text-[#8B949E]">Discovering files, detecting languages, computing hashes</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#202832]">
          <button
            onClick={() => setOpenProjectModalOpen(false)}
            className="px-4 py-2 text-sm text-[#8B949E] hover:text-[#F3F4F6] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleOpen}
            disabled={loading || !path.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#18A957] hover:bg-[#18A957]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</>
            ) : (
              <><FolderOpen className="h-4 w-4" /> Open Project</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
