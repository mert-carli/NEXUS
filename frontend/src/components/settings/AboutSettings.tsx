import { SettingSection, SettingRow } from './SettingsUI'

export function AboutSettings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">About NEXUS</h2>
          <p className="text-[#8B949E] text-xs mt-1">Platform architecture, runtime environment, and version details.</p>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 p-8 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-[#18A957] rounded-xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(24,169,87,0.25)]">
          <span className="text-[#0D1117] font-bold text-2xl font-mono">N</span>
        </div>
        <h3 className="text-[#F3F4F6] text-2xl font-bold tracking-tight mb-1">NEXUS</h3>
        <p className="text-[#18A957] text-xs font-semibold uppercase tracking-widest mb-3">
          Local-first AI Software Engineering Platform
        </p>
        <div className="text-[#8B949E] font-mono text-xs px-3 py-1 bg-[#202832] rounded-full">
          Version 0.1.0 (Alpha)
        </div>
      </div>

      <SettingSection title="Architecture & Technologies" description="Core stack components running locally">
        <SettingRow title="Frontend" description="React 18 + TypeScript + Vite + Tailwind CSS">
          <span className="text-[#18A957] text-xs font-mono">● Active</span>
        </SettingRow>
        <SettingRow title="Backend Engine" description="FastAPI + Python 3.12 + SQLAlchemy">
          <span className="text-[#18A957] text-xs font-mono">● Active</span>
        </SettingRow>
        <SettingRow title="Relational Database" description="SQLite (Local transactional storage)">
          <span className="text-[#18A957] text-xs font-mono">● Active</span>
        </SettingRow>
        <SettingRow title="Vector Database" description="ChromaDB (Local persistent vector store)">
          <span className="text-[#18A957] text-xs font-mono">● Active</span>
        </SettingRow>
        <SettingRow title="Local LLM Engine" description="Ollama (Local inference & streaming)">
          <span className="text-[#18A957] text-xs font-mono">● Active</span>
        </SettingRow>
        <SettingRow title="Code Editor" description="Monaco Editor (VS Code core)">
          <span className="text-[#18A957] text-xs font-mono">● Active</span>
        </SettingRow>
      </SettingSection>

      <SettingSection title="System Runtime" description="Local host environment specifications">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Python</div>
            <div className="text-xs text-[#F3F4F6] font-mono">3.12 / 3.11</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Database</div>
            <div className="text-xs text-[#F3F4F6] font-mono">SQLite 3</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Default Chat Model</div>
            <div className="text-xs text-[#F3F4F6] font-mono">qwen2.5-coder</div>
          </div>
          <div>
            <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Default Embeddings</div>
            <div className="text-xs text-[#F3F4F6] font-mono">nomic-embed-text</div>
          </div>
        </div>
      </SettingSection>
    </div>
  )
}
