import { useSettingsStore } from '@/store/settingsStore'
import { SettingSection, SettingRow, SelectBox, ToggleSwitch } from './SettingsUI'

export function AppearanceSettings() {
  const { uiSettings, updateUISetting } = useSettingsStore()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">Appearance</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure NEXUS theme, brand accent color, and interface density.</p>
        </div>
      </div>

      <SettingSection title="Theme Preferences" description="Visual styling and color accents">
        <SettingRow title="Theme" description="Select application color scheme.">
          <SelectBox
            value={uiSettings.theme}
            onChange={(val: any) => updateUISetting('theme', val)}
            options={[
              { label: 'NEXUS Dark (Default)', value: 'dark' },
              { label: 'Light', value: 'light' },
              { label: 'System', value: 'system' },
            ]}
          />
        </SettingRow>
        <SettingRow title="Accent Color" description="Primary interface highlight and focus color.">
          <SelectBox
            value={uiSettings.accentColor}
            onChange={(val: any) => updateUISetting('accentColor', val)}
            options={[
              { label: 'NEXUS Green (Default)', value: 'nexus' },
              { label: 'Blue', value: 'blue' },
              { label: 'Purple', value: 'purple' },
              { label: 'Amber', value: 'amber' },
            ]}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Layout & Dynamics" description="Component spacing and micro-animations">
        <SettingRow title="Interface Density" description="Padding and sizing across sidebar and cards.">
          <SelectBox
            value={uiSettings.density}
            onChange={(val: any) => updateUISetting('density', val)}
            options={[
              { label: 'Compact', value: 'compact' },
              { label: 'Comfortable (Default)', value: 'comfortable' },
              { label: 'Spacious', value: 'spacious' },
            ]}
          />
        </SettingRow>
        <SettingRow title="Interface Animations" description="Smooth transitions and micro-interaction effects.">
          <ToggleSwitch
            checked={uiSettings.animations ?? true}
            onChange={(val: any) => updateUISetting('animations', val)}
          />
        </SettingRow>
      </SettingSection>
    </div>
  )
}
