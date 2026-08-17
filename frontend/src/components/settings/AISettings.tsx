import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { SettingSection, SettingRow, SelectBox, RangeSlider, TextInput, SaveStatus, StatusBadge } from './SettingsUI'
import { api, OllamaHealth } from '@/services/api'
import { Cpu, RefreshCw } from 'lucide-react'

export function AISettings() {
  const { backendSettings, updateSetting } = useSettingsStore()
  const [saveState, setSaveState] = useState<{ isSaving: boolean; isSuccess: boolean; error: string | null }>({
    isSaving: false,
    isSuccess: false,
    error: null,
  })

  const [health, setHealth] = useState<OllamaHealth | null>(null)
  const [checking, setChecking] = useState(false)

  const checkOllama = () => {
    setChecking(true)
    api.ollamaHealth()
      .then((res) => setHealth(res))
      .catch((err) => setHealth({ status: 'error', message: err.message }))
      .finally(() => setChecking(false))
  }

  useEffect(() => {
    checkOllama()
  }, [])

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
  const ai = backendSettings.ai || {}

  const availableModels = health?.models && health.models.length > 0 ? health.models : []
  
  const chatOptions = availableModels.length > 0
    ? availableModels.map((m) => ({ label: m, value: m }))
    : [{ label: ai.CHAT_MODEL || 'qwen2.5-coder (default)', value: ai.CHAT_MODEL || 'qwen2.5-coder' }]

  const embedOptions = availableModels.length > 0
    ? availableModels.map((m) => ({ label: m, value: m }))
    : [{ label: ai.EMBEDDING_MODEL || 'nomic-embed-text (default)', value: ai.EMBEDDING_MODEL || 'nomic-embed-text' }]

  const isChatInstalled = availableModels.includes(ai.CHAT_MODEL || 'qwen2.5-coder')
  const isEmbedInstalled = availableModels.includes(ai.EMBEDDING_MODEL || 'nomic-embed-text')

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">AI Models</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure local models used by NEXUS for code reasoning and vector search.</p>
        </div>
        <SaveStatus {...saveState} />
      </div>

      {/* Status Card */}
      <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-[#202832] flex items-center justify-center shrink-0">
            <Cpu className="h-6 w-6 text-[#18A957]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[#F3F4F6] font-medium uppercase tracking-wider text-xs">LOCAL AI ENGINE</h3>
              <StatusBadge
                status={health?.status === 'ok' ? 'connected' : 'disconnected'}
                label={health?.status === 'ok' ? 'Ollama Connected' : 'Not Connected'}
              />
            </div>
            <p className="text-[#8B949E] text-xs font-mono">Endpoint: http://localhost:11434</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={checkOllama}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202832] hover:bg-[#30363d] text-[#F3F4F6] text-xs rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {health?.status !== 'ok' && !checking && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400">
          Unable to connect to local Ollama server at <span className="font-mono">http://localhost:11434</span>. Ensure Ollama is running on your machine.
        </div>
      )}

      <SettingSection title="AI Engine & Models" description="Select your AI engine provider and configure model parameters">
        <SettingRow
          title="AI Provider"
          description="Choose between local Ollama engine or your own custom cloud AI account."
        >
          <SelectBox
            value={ai.AI_PROVIDER || 'ollama'}
            onChange={(val: any) => handleUpdate('AI_PROVIDER', val)}
            options={[
              { label: 'Ollama (Local Engine)', value: 'ollama' },
              { label: 'Google Gemini (Cloud)', value: 'gemini' },
              { label: 'OpenAI (Cloud)', value: 'openai' },
              { label: 'Groq (Cloud)', value: 'groq' },
              { label: 'OpenRouter (Cloud)', value: 'openrouter' },
              { label: 'LM Studio / vLLM (Local)', value: 'lmstudio' },
            ]}
          />
        </SettingRow>

        {ai.AI_PROVIDER === 'gemini' && (
          <SettingRow
            title="Gemini API Key"
            description="Your private Google Gemini API key. Stored locally, never shared."
          >
            <TextInput
              type="password"
              placeholder="AIzaSy..."
              value={ai.GEMINI_API_KEY || ''}
              onChange={(val: any) => handleUpdate('GEMINI_API_KEY', val)}
            />
          </SettingRow>
        )}

        {ai.AI_PROVIDER === 'openai' && (
          <SettingRow
            title="OpenAI API Key"
            description="Your private OpenAI API key. Stored locally, never shared."
          >
            <TextInput
              type="password"
              placeholder="sk-..."
              value={ai.OPENAI_API_KEY || ''}
              onChange={(val: any) => handleUpdate('OPENAI_API_KEY', val)}
            />
          </SettingRow>
        )}

        {ai.AI_PROVIDER === 'groq' && (
          <SettingRow
            title="Groq API Key"
            description="Your private Groq API key. Stored locally, never shared."
          >
            <TextInput
              type="password"
              placeholder="gsk_..."
              value={ai.GROQ_API_KEY || ''}
              onChange={(val: any) => handleUpdate('GROQ_API_KEY', val)}
            />
          </SettingRow>
        )}

        {ai.AI_PROVIDER === 'openrouter' && (
          <SettingRow
            title="OpenRouter API Key"
            description="Your private OpenRouter API key. Stored locally, never shared."
          >
            <TextInput
              type="password"
              placeholder="sk-or-..."
              value={ai.OPENROUTER_API_KEY || ''}
              onChange={(val: any) => handleUpdate('OPENROUTER_API_KEY', val)}
            />
          </SettingRow>
        )}

        {ai.AI_PROVIDER === 'lmstudio' && (
          <SettingRow
            title="Local Endpoint URL"
            description="Local HTTP API URL for LM Studio or vLLM server."
          >
            <TextInput
              type="text"
              placeholder="http://localhost:1234/v1"
              value={ai.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1'}
              onChange={(val: any) => handleUpdate('LMSTUDIO_BASE_URL', val)}
            />
          </SettingRow>
        )}

        <SettingRow
          title="Chat Model"
          description="Model used for code reasoning, conversation, and agent operations."
        >
          <div className="flex items-center gap-2">
            <SelectBox
              value={ai.CHAT_MODEL || 'qwen2.5-coder'}
              onChange={(val: any) => handleUpdate('CHAT_MODEL', val)}
              options={chatOptions}
            />
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${isChatInstalled ? 'bg-[#18A957]/10 text-[#18A957]' : 'bg-red-500/10 text-red-400'}`}>
              {isChatInstalled ? '● Installed' : '○ Not Installed'}
            </span>
          </div>
        </SettingRow>
        <SettingRow
          title="Embedding Model"
          description="Used by the RAG engine to create vector embeddings for semantic code retrieval."
        >
          <div className="flex items-center gap-2">
            <SelectBox
              value={ai.EMBEDDING_MODEL || 'nomic-embed-text'}
              onChange={(val: any) => handleUpdate('EMBEDDING_MODEL', val)}
              options={embedOptions}
            />
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${isEmbedInstalled ? 'bg-[#18A957]/10 text-[#18A957]' : 'bg-red-500/10 text-red-400'}`}>
              {isEmbedInstalled ? '● Installed' : '○ Not Installed'}
            </span>
          </div>
        </SettingRow>
      </SettingSection>

      <SettingSection title="AI Parameters" description="Inference parameters for deterministic code generation">
        <SettingRow
          title="Temperature"
          description="Controls response determinism (0.0 = strict & deterministic, 1.0 = creative)."
        >
          <RangeSlider
            min={0.0}
            max={1.0}
            step={0.05}
            value={ai.TEMPERATURE ?? 0.2}
            onChange={(val: any) => handleUpdate('TEMPERATURE', val)}
          />
        </SettingRow>
        <SettingRow
          title="Max Tokens"
          description="Maximum token length allowed in model response."
        >
          <TextInput
            type="number"
            min={256}
            max={32768}
            value={ai.MAX_TOKENS ?? 4096}
            onChange={(val: any) => handleUpdate('MAX_TOKENS', Number(val))}
          />
        </SettingRow>
        <SettingRow
          title="Context Window"
          description="Maximum context window size for code ingestion."
        >
          <TextInput
            type="number"
            min={2048}
            max={131072}
            value={ai.CONTEXT_WINDOW ?? 32768}
            onChange={(val: any) => handleUpdate('CONTEXT_WINDOW', Number(val))}
          />
        </SettingRow>
      </SettingSection>
    </div>
  )
}
