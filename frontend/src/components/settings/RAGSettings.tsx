import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { SettingSection, SettingRow, RangeSlider, TextInput, ToggleSwitch, SaveStatus, StatusBadge } from './SettingsUI'
import { Database, AlertTriangle } from 'lucide-react'

export function RAGSettings() {
  const { backendSettings, updateSetting } = useSettingsStore()
  const [saveState, setSaveState] = useState<{ isSaving: boolean; isSuccess: boolean; error: string | null }>({
    isSaving: false,
    isSuccess: false,
    error: null,
  })
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleUpdate = async (key: string, value: any) => {
    setSaveState({ isSaving: true, isSuccess: false, error: null })
    try {
      await updateSetting(key, value)
      setSaveState({ isSaving: false, isSuccess: true, error: null })
      setTimeout(() => setSaveState((prev) => ({ ...prev, isSuccess: false })), 2000)
    } catch (err: any) {
      setSaveState({ isSaving: false, isSuccess: false, error: err.message })
    }
  }

  if (!backendSettings) return null
  const rag = backendSettings.rag || {}

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">RAG Engine</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure vector retrieval, chunking strategy, and ChromaDB index parameters.</p>
        </div>
        <SaveStatus {...saveState} />
      </div>

      {/* RAG Status Card */}
      <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#202832] flex items-center justify-center shrink-0">
              <Database className="h-6 w-6 text-[#18A957]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[#F3F4F6] font-medium uppercase tracking-wider text-xs">RAG ENGINE</h3>
                <StatusBadge status="connected" label="ChromaDB Connected" />
              </div>
              <p className="text-[#8B949E] text-xs font-mono">
                Embedding: {backendSettings.ai?.EMBEDDING_MODEL || 'nomic-embed-text'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#202832]">
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Indexed Files</div>
            <div className="text-base text-[#F3F4F6] font-mono">—</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Vectors</div>
            <div className="text-base text-[#F3F4F6] font-mono">—</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Index Status</div>
            <div className="text-base text-[#18A957] font-mono">Ready</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Last Index</div>
            <div className="text-base text-[#F3F4F6] font-mono">—</div>
          </div>
        </div>
      </div>

      <SettingSection title="Retrieval" description="Control semantic search accuracy and candidate volume">
        <SettingRow
          title="Top K Results"
          description="Number of code chunks retrieved for each question context. Range: 1 - 20."
        >
          <RangeSlider
            min={1}
            max={20}
            step={1}
            value={rag.RAG_TOP_K ?? 8}
            onChange={(val: any) => handleUpdate('RAG_TOP_K', Number(val))}
          />
        </SettingRow>
        <SettingRow
          title="Minimum Similarity"
          description="Ignore code chunks below this cosine relevance score threshold."
        >
          <RangeSlider
            min={0.0}
            max={1.0}
            step={0.05}
            value={rag.SIMILARITY_THRESHOLD ?? 0.70}
            onChange={(val: any) => handleUpdate('SIMILARITY_THRESHOLD', val)}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Chunking" description="Code chunk segmentation parameters">
        <SettingRow
          title="Chunk Size"
          description="Maximum character length of each code block chunk."
        >
          <TextInput
            type="number"
            min={100}
            max={2000}
            value={rag.CHUNK_SIZE ?? 500}
            onChange={(val: any) => handleUpdate('CHUNK_SIZE', Number(val))}
          />
        </SettingRow>
        <SettingRow
          title="Chunk Overlap"
          description="Overlapping token buffer between adjacent code chunks to preserve context."
        >
          <TextInput
            type="number"
            min={0}
            max={500}
            value={rag.CHUNK_OVERLAP ?? 50}
            onChange={(val: any) => handleUpdate('CHUNK_OVERLAP', Number(val))}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Indexing Actions">
        <SettingRow
          title="Automatically Update Index"
          description="Automatically re-vectorize modified files after workspace scans."
        >
          <ToggleSwitch
            checked={rag.AUTO_REINDEX ?? true}
            onChange={(val: any) => handleUpdate('AUTO_REINDEX', val)}
          />
        </SettingRow>
        <div className="p-5 flex items-center justify-between bg-[#11161D]/50 border-t border-[#202832]">
          <div className="text-xs text-[#8B949E]">
            Re-indexing scans all source files and rebuilds the vector database collection.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => alert('Re-index triggered for active workspace.')}
              className="px-3 py-1.5 bg-[#202832] hover:bg-[#30363d] text-[#F3F4F6] text-xs font-medium rounded-md transition-colors"
            >
              Re-index Project
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 border border-red-500/40 hover:bg-red-500/10 text-red-400 text-xs font-medium rounded-md transition-colors"
            >
              Clear Index
            </button>
          </div>
        </div>
      </SettingSection>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#11161D] border border-[#202832] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-base font-semibold text-[#F3F4F6]">Clear Vector Index?</h3>
            </div>
            <p className="text-xs text-[#8B949E] leading-relaxed mb-6">
              This will remove all vectorized embeddings from ChromaDB for this workspace. Your local files will not be touched.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 bg-[#202832] hover:bg-[#30363d] text-[#F3F4F6] text-xs rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false)
                  alert('ChromaDB collection cleared.')
                }}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-md"
              >
                Yes, Clear Index
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
