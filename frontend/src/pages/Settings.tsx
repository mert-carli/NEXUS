import { useState } from 'react'
import SettingsLayout from '@/components/settings/SettingsLayout'
import { GeneralSettings } from '@/components/settings/GeneralSettings'
import { AISettings } from '@/components/settings/AISettings'
import { RAGSettings } from '@/components/settings/RAGSettings'
import { AgentSettings } from '@/components/settings/AgentSettings'
import { ExecutionSettings } from '@/components/settings/ExecutionSettings'
import { SecuritySettings } from '@/components/settings/SecuritySettings'
import { GitSettings } from '@/components/settings/GitSettings'
import { EditorSettings } from '@/components/settings/EditorSettings'
import { AppearanceSettings } from '@/components/settings/AppearanceSettings'
import { AboutSettings } from '@/components/settings/AboutSettings'
import { useSettingsStore } from '@/store/settingsStore'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const { resetSettings } = useSettingsStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleReset = async () => {
    await resetSettings()
    setShowResetConfirm(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralSettings />
      case 'ai': return <AISettings />
      case 'rag': return <RAGSettings />
      case 'agent': return <AgentSettings />
      case 'execution': return <ExecutionSettings />
      case 'security': return <SecuritySettings />
      case 'git': return <GitSettings />
      case 'editor': return <EditorSettings />
      case 'appearance': return <AppearanceSettings />
      case 'about': return <AboutSettings />
      default: return <div>Select a category</div>
    }
  }

  return (
    <div className="p-4 h-full relative">
      <SettingsLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
        
        {/* Reset Settings Section at the bottom of every tab except about (or everywhere) */}
        <div className="mt-12 pt-8 border-t border-red-500/20">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <h3 className="text-red-400 font-medium text-lg mb-1">Danger Zone</h3>
            <p className="text-[#8B949E] text-sm mb-4">Restore NEXUS settings to their default values. This will not delete project files, Git history, or RAG data.</p>
            {showResetConfirm ? (
              <div className="flex gap-3 items-center">
                <span className="text-[#F3F4F6] text-sm mr-2">Are you absolutely sure?</span>
                <button onClick={handleReset} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors">Yes, Reset</button>
                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 bg-[#202832] hover:bg-[#30363d] text-[#F3F4F6] text-sm rounded-md transition-colors">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowResetConfirm(true)} className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm rounded-md transition-colors">
                Reset Settings
              </button>
            )}
          </div>
        </div>
      </SettingsLayout>
    </div>
  )
}
