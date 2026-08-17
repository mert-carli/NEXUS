import { useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { SettingSection, SettingRow, SelectBox, TextInput, ToggleSwitch, SaveStatus, StatusBadge } from './SettingsUI'
import { Bot } from 'lucide-react'

export function AgentSettings() {
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
  const agent = backendSettings.agent || {}

  const workflowSteps = [
    { label: 'ANALYZE', active: true },
    { label: 'PLAN', active: true },
    { label: 'PROPOSE', active: true },
    { label: 'APPROVAL', active: true },
    { label: 'APPLY', active: true },
    { label: 'TEST', active: true },
    { label: 'SUCCESS / FIX', active: true },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">Agent Settings</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure autonomous workflow, iteration limits, and plan verification policies.</p>
        </div>
        <SaveStatus {...saveState} />
      </div>

      {/* Status Card */}
      <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-lg bg-[#202832] flex items-center justify-center shrink-0">
            <Bot className="h-6 w-6 text-[#18A957]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[#F3F4F6] font-medium uppercase tracking-wider text-xs">AGENT ENGINE</h3>
              <StatusBadge status="ready" label="Ready" />
            </div>
            <p className="text-[#8B949E] text-xs">Planning → Propose → Apply → Test → Fix</p>
          </div>
        </div>

        {/* Workflow State Machine Visualization */}
        <div className="pt-4 border-t border-[#202832]">
          <div className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-2">Execution State Machine</div>
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {workflowSteps.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded bg-[#11161D] border border-[#202832] text-xs font-mono text-[#F3F4F6]">
                  {step.label}
                </span>
                {idx < workflowSteps.length - 1 && (
                  <span className="text-[#8B949E]/40 font-mono text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SettingSection title="Agent Mode & Iterations">
        <SettingRow
          title="Agent Mode"
          description="Control autonomous agent capabilities in code modification."
        >
          <SelectBox
            value={agent.AGENT_MODE || 'ask_and_edit'}
            onChange={(val: any) => handleUpdate('AGENT_MODE', val)}
            options={[
              { label: 'Ask + Edit', value: 'ask_and_edit' },
              { label: 'Disabled', value: 'disabled' },
              { label: 'Full Agent (Not available in current version)', value: 'full_agent' },
            ]}
          />
        </SettingRow>
        <SettingRow
          title="Maximum Agent Iterations"
          description="Maximum number of Test → Fix cycles before halting. Allowed range: 1–10."
        >
          <TextInput
            type="number"
            min={1}
            max={10}
            value={agent.MAX_AGENT_ITERATIONS ?? 3}
            onChange={(val: any) => handleUpdate('MAX_AGENT_ITERATIONS', Number(val))}
          />
        </SettingRow>
        <SettingRow
          title="Agent Timeout"
          description="Maximum execution timeout in seconds per agent step."
        >
          <TextInput
            type="number"
            min={30}
            max={600}
            value={agent.AGENT_TIMEOUT ?? 120}
            onChange={(val: any) => handleUpdate('AGENT_TIMEOUT', Number(val))}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Planning & Safety Policies">
        <SettingRow
          title="Explicit Planning"
          description="Agent must generate an explicit execution plan before proposing modifications."
        >
          <ToggleSwitch
            checked={agent.REQUIRE_EXPLICIT_PLAN ?? true}
            onChange={(val: any) => handleUpdate('REQUIRE_EXPLICIT_PLAN', val)}
          />
        </SettingRow>
        <SettingRow
          title="Approval Requirement"
          description="Require explicit user approval before applying any code modification to disk."
          isCritical={true}
        >
          <ToggleSwitch
            checked={true}
            disabled={true}
            disabledReason="Security Critical: Modification approval cannot be disabled."
            onChange={() => {}}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Autonomous Testing & Fixing">
        <SettingRow
          title="Run Tests After Applying Changes"
          description="Automatically execute project test command upon user accepting an edit."
        >
          <ToggleSwitch
            checked={agent.AUTO_TEST_AFTER_APPLY ?? false}
            onChange={(val: any) => handleUpdate('AUTO_TEST_AFTER_APPLY', val)}
          />
        </SettingRow>
        <SettingRow
          title="Allow Agent to Propose Fixes on Failed Tests"
          description="Failed test output is fed back into Agent loop to propose corrective diffs."
        >
          <ToggleSwitch
            checked={agent.AUTO_FIX_FAILED_TESTS ?? false}
            onChange={(val: any) => handleUpdate('AUTO_FIX_FAILED_TESTS', val)}
          />
        </SettingRow>
      </SettingSection>
    </div>
  )
}
