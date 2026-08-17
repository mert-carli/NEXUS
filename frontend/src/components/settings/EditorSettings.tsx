import { useSettingsStore } from '@/store/settingsStore'
import { SettingSection, SettingRow, SelectBox, ToggleSwitch } from './SettingsUI'

export function EditorSettings() {
  const { uiSettings, updateUISetting } = useSettingsStore()

  const fontOptions = [
    { label: '12px', value: '12' },
    { label: '13px', value: '13' },
    { label: '14px (Default)', value: '14' },
    { label: '15px', value: '15' },
    { label: '16px', value: '16' },
    { label: '18px', value: '18' },
    { label: '20px', value: '20' },
  ]

  const tabOptions = [
    { label: '2 spaces', value: '2' },
    { label: '4 spaces', value: '4' },
  ]

  const wrapOptions = [
    { label: 'Off', value: 'off' },
    { label: 'On', value: 'on' },
    { label: 'Word Wrap Column', value: 'wordWrapColumn' },
    { label: 'Bounded', value: 'bounded' },
  ]

  const lineNumOptions = [
    { label: 'On', value: 'on' },
    { label: 'Off', value: 'off' },
    { label: 'Relative', value: 'relative' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#F3F4F6]">Editor</h2>
          <p className="text-[#8B949E] text-xs mt-1">Configure Monaco Editor preferences, typography, and code display.</p>
        </div>
      </div>

      <SettingSection title="Typography & Formatting" description="Font size, tab spacing, and line wrapping">
        <SettingRow
          title="Font Size"
          description="Monaco Editor font size in pixels."
        >
          <SelectBox
            value={String(uiSettings.editorFontSize)}
            onChange={(val: any) => updateUISetting('editorFontSize', Number(val))}
            options={fontOptions}
          />
        </SettingRow>
        <SettingRow
          title="Tab Size"
          description="Number of spaces per indentation level."
        >
          <SelectBox
            value={String(uiSettings.editorTabSize || 2)}
            onChange={(val: any) => updateUISetting('editorTabSize', Number(val))}
            options={tabOptions}
          />
        </SettingRow>
        <SettingRow
          title="Word Wrap"
          description="Controls how long code lines are wrapped."
        >
          <SelectBox
            value={uiSettings.wordWrap}
            onChange={(val: any) => updateUISetting('wordWrap', val)}
            options={wrapOptions}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="Visual Features" description="Minimap, active line highlights, and line numbers">
        <SettingRow
          title="Line Numbers"
          description="Display line numbers in editor gutter."
        >
          <SelectBox
            value={uiSettings.editorLineNumbers || 'on'}
            onChange={(val: any) => updateUISetting('editorLineNumbers', val)}
            options={lineNumOptions}
          />
        </SettingRow>
        <SettingRow
          title="Minimap"
          description="Show code outline minimap on the right margin."
        >
          <ToggleSwitch
            checked={uiSettings.minimap}
            onChange={(val: any) => updateUISetting('minimap', val)}
          />
        </SettingRow>
        <SettingRow
          title="Highlight Active Line"
          description="Highlight the currently focused editor line."
        >
          <ToggleSwitch
            checked={uiSettings.highlightActiveLine}
            onChange={(val: any) => updateUISetting('highlightActiveLine', val)}
          />
        </SettingRow>
      </SettingSection>

      {/* Live Preview */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E] mb-3">Editor Preview</h3>
        <div
          className="rounded-xl border border-[#202832] bg-[#0D1117] p-5 font-mono leading-relaxed text-[#c9d1d9] transition-all"
          style={{ fontSize: `${uiSettings.editorFontSize}px` }}
        >
          <div className="flex gap-4">
            {uiSettings.editorLineNumbers !== 'off' && (
              <div className="text-[#8B949E]/50 text-right select-none w-6 font-mono text-xs">
                1<br />2<br />3<br />4<br />5
              </div>
            )}
            <div className={`flex-1 ${uiSettings.highlightActiveLine ? 'bg-[#11161D]/50 -mx-2 px-2 rounded' : ''}`}>
              <span className="text-[#ff7b72]">import</span> {'{'} <span className="text-[#79c0ff]">nexus</span> {'}'} <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'@nexus/core'</span><br />
              <br />
              <span className="text-[#ff7b72]">export async function</span> <span className="text-[#d2a8ff]">startAgent</span>() {'{'}<br />
              &nbsp;&nbsp;<span className="text-[#ff7b72]">const</span> state = <span className="text-[#ff7b72]">await</span> nexus.<span className="text-[#79c0ff]">analyzeProject</span>()<br />
              &nbsp;&nbsp;<span className="text-[#ff7b72]">return</span> state.<span className="text-[#79c0ff]">isReady</span><br />
              {'}'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
