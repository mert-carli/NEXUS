import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useProjectStore } from '@/store/projectStore'
import { SettingSection, SettingRow, ToggleSwitch, SaveStatus, StatusBadge } from './SettingsUI'
import { GitBranch } from 'lucide-react'

export function GitSettings() {
  const { backendSettings, updateSetting } = useSettingsStore()
  const { activeProject } = useProjectStore()
  const [saveState, setSaveState] = useState<{ isSaving: boolean; isSuccess: boolean; error: string | null }>({
    isSaving: false,
    isSuccess: false,
    error: null,
  })

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
  const git = backendSettings.git || {}

  const isGitRepo = activeProject?.is_git_repo ?? false
  const branch = activeProject?.git_branch || '—'
  const commit = activeProject?.git_commit_hash ? activeProject.git_commit_hash.slice(0, 7) : '—'
  const isDirty = activeProject?.git_is_dirty

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">Git Integration</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure Git status tracking, branch awareness, and push confirmation.</p>
        </div>
        <SaveStatus {...saveState} />
      </div>

      {/* Git Status Card */}
      <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-lg bg-[#202832] flex items-center justify-center shrink-0">
            <GitBranch className="h-6 w-6 text-[#18A957]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[#F3F4F6] font-medium uppercase tracking-wider text-xs">GIT INTEGRATION</h3>
              <StatusBadge
                status={isGitRepo ? 'connected' : 'disconnected'}
                label={isGitRepo ? 'Repository Detected' : 'No Git repository detected'}
              />
            </div>
            <p className="text-[#8B949E] text-xs font-mono">
              {activeProject ? activeProject.name : 'No project open'}
            </p>
          </div>
        </div>

        {isGitRepo ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-[#202832]">
            <div>
              <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Current Branch</div>
              <div className="text-xs text-[#F3F4F6] font-mono">{branch}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Latest Commit</div>
              <div className="text-xs text-[#F3F4F6] font-mono">{commit}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Working Tree</div>
              <div className={`text-xs font-mono ${isDirty ? 'text-amber-400' : 'text-[#18A957]'}`}>
                {isDirty ? 'Modified' : 'Clean'}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-[#202832] text-xs text-[#8B949E]">
            Open a Git repository or initialize Git in your workspace to enable branch intelligence.
          </div>
        )}
      </div>

      <SettingSection title="Preferences" description="Git behavior and auto-detection">
        <SettingRow
          title="Enable Git Integration"
          description="Allow NEXUS to inspect repository status, branches, and commit metadata."
        >
          <ToggleSwitch
            checked={git.ENABLE_GIT ?? true}
            onChange={(val: any) => handleUpdate('ENABLE_GIT', val)}
          />
        </SettingRow>
        <SettingRow
          title="Auto Refresh Git Status"
          description="Automatically check for file modifications and dirty working tree states."
        >
          <ToggleSwitch
            checked={git.AUTO_GIT_STATUS ?? true}
            onChange={(val: any) => handleUpdate('AUTO_GIT_STATUS', val)}
          />
        </SettingRow>
        <SettingRow
          title="Push Protection"
          description="Require explicit user confirmation before executing git push commands."
          isCritical={true}
        >
          <ToggleSwitch
            checked={true}
            disabled={true}
            disabledReason="Security Critical: Push confirmation protection cannot be disabled."
            onChange={() => {}}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="AI Git Capabilities">
        <SettingRow
          title="AI Commit Message"
          description="Automatically generate structured conventional commit messages from staged diff."
        >
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#202832] text-[#8B949E] uppercase font-mono">
            Not available in current version
          </span>
        </SettingRow>
        <SettingRow
          title="AI Code Review"
          description="Analyze staged changes for potential bugs and style violations before committing."
        >
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#202832] text-[#8B949E] uppercase font-mono">
            Not available in current version
          </span>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
