import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { useProjectStore } from '@/store/projectStore'
import { SettingSection, SettingRow, SelectBox, TextInput, SaveStatus, StatusBadge } from './SettingsUI'
import { Terminal, ShieldAlert } from 'lucide-react'

export function ExecutionSettings() {
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

  const handleCommandToggle = async (cmd: string, checked: boolean) => {
    const current: string[] = backendSettings?.execution?.ALLOWED_COMMANDS || []
    const next = checked ? [...current, cmd] : current.filter((c: string) => c !== cmd)
    await handleUpdate('ALLOWED_COMMANDS', next)
  }

  if (!backendSettings) return null
  const execution = backendSettings.execution || {}
  const allowedCmds: string[] = execution.ALLOWED_COMMANDS || ['npm', 'npx', 'python', 'pytest', 'cargo', 'go']
  const registryCmds = ['npm', 'npx', 'python', 'pytest', 'cargo', 'go']

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">Code Execution</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure command sandbox policies, allowed tools, and process execution timeouts.</p>
        </div>
        <SaveStatus {...saveState} />
      </div>

      {/* Execution Status Card */}
      <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-lg bg-[#202832] flex items-center justify-center shrink-0">
            <Terminal className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[#F3F4F6] font-medium uppercase tracking-wider text-xs">COMMAND EXECUTION</h3>
              <StatusBadge status="restricted" label="Sandbox Restricted" />
            </div>
            <p className="text-[#8B949E] text-xs">Commands are strictly executed within the project directory sandbox.</p>
          </div>
        </div>

        {/* Security Warning */}
        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-2.5 mt-4">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            NEXUS does not allow unrestricted shell execution. Shell chaining (<code className="font-mono bg-black/30 px-1 py-0.5 rounded">&amp;&amp;</code>, <code className="font-mono bg-black/30 px-1 py-0.5 rounded">;</code>), pipes (<code className="font-mono bg-black/30 px-1 py-0.5 rounded">|</code>), and redirects (<code className="font-mono bg-black/30 px-1 py-0.5 rounded">&gt;</code>) are restricted by the backend execution policy.
          </p>
        </div>
      </div>

      <SettingSection title="Policies" description="Execution restrictions and timeouts">
        <SettingRow
          title="Execution Policy"
          description="Strict blocks unknown commands entirely. Balanced allows user-confirmed commands."
          isCritical={true}
        >
          <SelectBox
            value={execution.EXECUTION_POLICY || 'strict'}
            onChange={(val: any) => handleUpdate('EXECUTION_POLICY', val)}
            options={[
              { label: 'Strict (Enforced)', value: 'strict' },
              { label: 'Balanced', value: 'balanced' },
            ]}
          />
        </SettingRow>
        <SettingRow
          title="Command Timeout"
          description="Maximum execution time in seconds before terminating process (Range: 5–600s)."
        >
          <TextInput
            type="number"
            min={5}
            max={600}
            value={execution.COMMAND_TIMEOUT ?? 60}
            onChange={(val: any) => handleUpdate('COMMAND_TIMEOUT', Number(val))}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Allowed Commands" description="Only selected binaries from the backend registry can be invoked">
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          {registryCmds.map((cmd) => (
            <label
              key={cmd}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#11161D] border border-[#202832] text-[#F3F4F6] text-xs font-mono cursor-pointer hover:border-[#18A957]/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={allowedCmds.includes(cmd)}
                onChange={(e) => handleCommandToggle(cmd, e.target.checked)}
                className="rounded border-[#202832] bg-[#0D1117] text-[#18A957] focus:ring-[#18A957]"
              />
              {cmd}
            </label>
          ))}
        </div>
      </SettingSection>

      <SettingSection title="Project Commands" description="Configured commands for the active workspace">
        <SettingRow
          title="Test Command"
          description="Test runner command specified in project configuration."
        >
          <span className="text-xs font-mono text-[#F3F4F6] bg-[#11161D] px-3 py-1.5 rounded border border-[#202832]">
            {activeProject?.test_command || 'Not configured'}
          </span>
        </SettingRow>
        <SettingRow
          title="Build Command"
          description="Build script for compilation and bundle checks."
        >
          <span className="text-xs font-mono text-[#8B949E] bg-[#11161D] px-3 py-1.5 rounded border border-[#202832]">
            Not configured
          </span>
        </SettingRow>
      </SettingSection>
    </div>
  )
}
