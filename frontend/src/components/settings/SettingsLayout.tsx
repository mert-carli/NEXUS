import React, { useState, useEffect } from 'react'
import { Settings, Cpu, Database, Bot, Terminal, Shield, GitBranch, LayoutTemplate, Palette, Info } from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { api } from '@/services/api'

interface SettingsLayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'ai', label: 'AI / Models', icon: Cpu },
  { id: 'rag', label: 'RAG', icon: Database },
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'execution', label: 'Execution', icon: Terminal },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'editor', label: 'Editor', icon: LayoutTemplate },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'about', label: 'About', icon: Info },
]

export default function SettingsLayout({ children, activeTab, setActiveTab }: SettingsLayoutProps) {
  const { loadSettings, isLoading, error } = useSettingsStore()
  
  const [ollamaStatus, setOllamaStatus] = useState<string>('Checking...')
  
  useEffect(() => {
    loadSettings()
    
    // Check ollama health
    api.ollamaHealth()
      .then(res => setOllamaStatus(res.status === 'ok' ? 'Connected' : 'Disconnected'))
      .catch(() => setOllamaStatus('Disconnected'))
  }, [loadSettings])

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] bg-[#0D1117] rounded-xl border border-[#202832] overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#202832] bg-[#11161D] flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-[#F3F4F6] flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#18A957]" />
            Settings
          </h1>
          <p className="text-sm text-[#8B949E] mt-1">Configure NEXUS AI, Agent, RAG, security and developer experience.</p>
        </div>
        
        {/* System Status Indicators */}
        <div className="flex gap-6 text-xs font-medium">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[#8B949E] uppercase text-[10px]">OLLAMA</span>
            <div className="flex items-center gap-1.5 text-[#F3F4F6]">
               <span className={`h-2 w-2 rounded-full ${ollamaStatus === 'Connected' ? 'bg-[#18A957]' : 'bg-red-500'}`}></span>
               {ollamaStatus}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[#8B949E] uppercase text-[10px]">RAG / CHROMA</span>
            <div className="flex items-center gap-1.5 text-[#F3F4F6]">
               <span className="h-2 w-2 rounded-full bg-[#18A957]"></span>
               Connected
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[#202832] bg-[#11161D]/50 p-4 overflow-y-auto shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-[#18A957]/10 text-[#18A957] font-medium' 
                      : 'text-[#8B949E] hover:text-[#F3F4F6] hover:bg-[#202832]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-[#8B949E]">
              Loading settings...
            </div>
          ) : error ? (
             <div className="absolute inset-0 flex items-center justify-center text-red-400">
              Error loading settings: {error}
            </div>
          ) : (
            <div className="max-w-3xl">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
