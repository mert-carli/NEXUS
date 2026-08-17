import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { SettingSection, SettingRow, ToggleSwitch, SelectBox, SaveStatus } from './SettingsUI'

export function GeneralSettings() {
  const { backendSettings, updateSetting } = useSettingsStore()
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
  const general = backendSettings.general || {}

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">General Settings</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure project workspace behavior, startup scanning, and notifications.</p>
        </div>
        <SaveStatus {...saveState} />
      </div>

      <SettingSection title="Project" description="Default workspace and startup behavior">
        <SettingRow
          title="Default Project"
          description="Project automatically opened when NEXUS starts."
        >
          <SelectBox
            value={general.DEFAULT_PROJECT || ''}
            onChange={(val: any) => handleUpdate('DEFAULT_PROJECT', val)}
            options={[{ label: 'Last opened project', value: '' }]}
          />
        </SettingRow>
        <SettingRow
          title="Auto Scan on Startup"
          description="Scan project automatically on startup to detect files and modified assets."
        >
          <ToggleSwitch
            checked={general.AUTO_SCAN_ON_STARTUP ?? true}
            onChange={(val: any) => handleUpdate('AUTO_SCAN_ON_STARTUP', val)}
          />
        </SettingRow>
        <SettingRow
          title="Incremental Scanning"
          description="Only changed files are re-analyzed using SHA256 hashes to minimize overhead."
        >
          <ToggleSwitch
            checked={general.INCREMENTAL_SCAN ?? true}
            onChange={(val: any) => handleUpdate('INCREMENTAL_SCAN', val)}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Notifications & Confirmations">
        <SettingRow
          title="Operation Notifications"
          description="Show toast notifications when scanning, indexing, testing or AI operations complete."
        >
          <ToggleSwitch
            checked={general.OPERATION_NOTIFICATIONS ?? true}
            onChange={(val: any) => handleUpdate('OPERATION_NOTIFICATIONS', val)}
          />
        </SettingRow>
        <SettingRow
          title="Confirm Destructive Actions"
          description="Ask for confirmation before index deletion, file rollback, or workspace reset."
        >
          <ToggleSwitch
            checked={general.CONFIRM_DESTRUCTIVE ?? true}
            onChange={(val: any) => handleUpdate('CONFIRM_DESTRUCTIVE', val)}
          />
        </SettingRow>
      </SettingSection>
    </div>
  )
}
