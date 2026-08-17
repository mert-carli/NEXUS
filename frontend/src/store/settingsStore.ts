import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, SystemSettings, SettingDefinition } from '@/services/api'

export interface UISettings {
  theme: 'dark' | 'light' | 'system'
  accentColor: 'nexus' | 'blue' | 'purple' | 'amber'
  editorFontSize: number
  editorTabSize: number
  editorLineNumbers: 'on' | 'off' | 'relative'
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded'
  minimap: boolean
  highlightActiveLine: boolean
  density: 'compact' | 'comfortable' | 'spacious'
  animations: boolean
}

interface SettingsState {
  // Backend Settings
  backendSettings: SystemSettings | null
  definitions: SettingDefinition[]
  isLoading: boolean
  error: string | null
  
  // UI Settings (Persisted to localStorage)
  uiSettings: UISettings
  
  // Actions
  loadSettings: () => Promise<void>
  updateSetting: (key: string, value: any) => Promise<void>
  updateMultipleSettings: (updates: Record<string, any>) => Promise<void>
  resetSettings: () => Promise<void>
  
  // UI Actions
  updateUISetting: <K extends keyof UISettings>(key: K, value: UISettings[K]) => void
}

const defaultUISettings: UISettings = {
  theme: 'dark',
  accentColor: 'nexus',
  editorFontSize: 14,
  editorTabSize: 2,
  editorLineNumbers: 'on',
  wordWrap: 'on',
  minimap: true,
  highlightActiveLine: true,
  density: 'comfortable',
  animations: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      backendSettings: null,
      definitions: [],
      isLoading: false,
      error: null,
      
      uiSettings: defaultUISettings,
      
      loadSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const [settings, defs] = await Promise.all([
            api.getSettings(),
            api.getSettingsDefinitions()
          ])
          set({ backendSettings: settings, definitions: defs, isLoading: false })
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
        }
      },
      
      updateSetting: async (key: string, value: any) => {
        set({ error: null })
        try {
          const newSettings = await api.updateSettings({ [key]: value })
          set({ backendSettings: newSettings })
        } catch (err: any) {
          set({ error: err.message })
          throw err
        }
      },
      
      updateMultipleSettings: async (updates: Record<string, any>) => {
        set({ error: null })
        try {
          const newSettings = await api.updateSettings(updates)
          set({ backendSettings: newSettings })
        } catch (err: any) {
          set({ error: err.message })
          throw err
        }
      },
      
      resetSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const newSettings = await api.resetSettings()
          set({ backendSettings: newSettings, isLoading: false })
        } catch (err: any) {
          set({ error: err.message, isLoading: false })
          throw err
        }
      },
      
      updateUISetting: (key, value) => {
        set((state) => ({
          uiSettings: {
            ...state.uiSettings,
            [key]: value
          }
        }))
      }
    }),
    {
      name: 'nexus-settings',
      partialize: (state) => ({ uiSettings: state.uiSettings })
    }
  )
)
