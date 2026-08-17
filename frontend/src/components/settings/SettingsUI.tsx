import React from 'react'

interface SettingSectionProps {
  title: string
  children: React.ReactNode
  description?: string
}

export function SettingSection({ title, description, children }: SettingSectionProps) {
  return (
    <div className="bg-[#0D1117] border border-[#202832] rounded-xl mb-6 overflow-hidden">
      <div className="p-5 border-b border-[#202832] bg-[#11161D]">
        <h2 className="text-[#F3F4F6] font-medium text-base">{title}</h2>
        {description && <p className="text-[#8B949E] text-xs mt-1">{description}</p>}
      </div>
      <div className="divide-y divide-[#202832]">
        {children}
      </div>
    </div>
  )
}

interface SettingRowProps {
  title: string
  description: string
  children: React.ReactNode
  isCritical?: boolean
}

export function SettingRow({ title, description, children, isCritical }: SettingRowProps) {
  return (
    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#11161D]/30 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[#F3F4F6] font-medium text-sm">{title}</h3>
          {isCritical && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Security Critical
            </span>
          )}
        </div>
        <p className="text-[#8B949E] text-xs mt-1 max-w-xl">{description}</p>
      </div>
      <div className="flex-shrink-0 min-w-[180px] flex justify-end">
        {children}
      </div>
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  disabledReason?: string
}

export function ToggleSwitch({ checked, onChange, disabled, disabledReason }: ToggleSwitchProps) {
  return (
    <div className="flex items-center" title={disabledReason}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#18A957] focus:ring-offset-2 focus:ring-offset-[#0D1117] ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <span className="sr-only">Toggle setting</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute mx-auto h-4 w-8 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? 'bg-[#18A957]' : 'bg-[#202832]'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full border border-[#202832] bg-[#F3F4F6] shadow ring-0 transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-4 bg-white' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

interface SelectBoxProps {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  disabled?: boolean
}

export function SelectBox({ value, onChange, options, disabled }: SelectBoxProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="bg-[#11161D] border border-[#202832] text-[#F3F4F6] text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-[#18A957] disabled:opacity-50 w-full md:w-auto min-w-[150px]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

interface RangeSliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
}

export function RangeSlider({ value, onChange, min, max, step = 1 }: RangeSliderProps) {
  return (
    <div className="flex items-center gap-3 w-full md:w-[220px]">
      <span className="text-[#8B949E] text-xs w-6 text-right font-mono">{min}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 bg-[#202832] rounded-lg appearance-none cursor-pointer accent-[#18A957]"
      />
      <span className="text-[#8B949E] text-xs w-6 font-mono">{max}</span>
      <span className="text-[#F3F4F6] text-xs font-mono bg-[#11161D] px-2 py-0.5 rounded border border-[#202832] min-w-[48px] text-center">
        {step < 1 ? value.toFixed(2) : value}
      </span>
    </div>
  )
}

interface TextInputProps {
  value: string | number
  onChange: (value: string) => void
  disabled?: boolean
  type?: 'text' | 'number' | 'password'
  min?: number
  max?: number
  placeholder?: string
}

export function TextInput({ value, onChange, disabled, type = 'text', min, max, placeholder }: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={min}
      max={max}
      placeholder={placeholder}
      className="bg-[#11161D] border border-[#202832] text-[#F3F4F6] text-xs font-mono rounded-md px-3 py-1.5 focus:outline-none focus:border-[#18A957] disabled:opacity-50 w-full md:w-[200px]"
    />
  )
}

export function NumberInput({ value, onChange, min, max, disabled }: { value: number; onChange: (val: number) => void; min?: number; max?: number; disabled?: boolean }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[#11161D] border border-[#202832] text-[#F3F4F6] text-xs font-mono rounded-md px-3 py-1.5 focus:outline-none focus:border-[#18A957] disabled:opacity-50 w-24 text-right"
    />
  )
}

export function StatusBadge({ status, label }: { status: 'connected' | 'disconnected' | 'protected' | 'ready' | 'restricted'; label?: string }) {
  const configs = {
    connected: { bg: 'bg-[#18A957]/10 text-[#18A957] border-[#18A957]/20', dot: 'bg-[#18A957]', text: label || 'Connected' },
    ready: { bg: 'bg-[#18A957]/10 text-[#18A957] border-[#18A957]/20', dot: 'bg-[#18A957]', text: label || 'Ready' },
    protected: { bg: 'bg-[#18A957]/10 text-[#18A957] border-[#18A957]/20', dot: 'bg-[#18A957]', text: label || 'Protected' },
    restricted: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400', text: label || 'Restricted' },
    disconnected: { bg: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400', text: label || 'Disconnected' },
  }
  const cfg = configs[status] || configs.connected

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  )
}

export function SaveStatus({ isSaving, isSuccess, error }: { isSaving: boolean; isSuccess: boolean; error: string | null }) {
  if (error) return <span className="text-red-400 text-xs font-medium flex items-center gap-1">⚠ Failed to save</span>
  if (isSaving) return <span className="text-[#8B949E] text-xs font-mono animate-pulse">Changing...</span>
  if (isSuccess) return <span className="text-[#18A957] text-xs font-medium">✓ Saved</span>
  return null
}
