import { create } from 'zustand'

export type AgentStatusType =
  | "IDLE"
  | "ANALYZING"
  | "PLANNING"
  | "WAITING_APPROVAL"
  | "PROPOSING"
  | "APPLYING"
  | "TESTING"
  | "FIXING"
  | "SUCCESS"
  | "FAILED"

export interface AgentOperationStep {
  id: string
  title: string
  status: 'pending' | 'running' | 'done' | 'failed'
  detail?: string
  timestamp?: number
}

export interface AgentPlan {
  goal: string
  steps: string[]
}

export interface LiveTelemetry {
  tokens_per_second: number
  eval_count: number
  prompt_eval_count: number
  total_tokens: number
  latency_ms: number
  total_duration_ms: number
}

interface AgentState {
  status: AgentStatusType
  plan: AgentPlan | null
  error: string | null
  steps: AgentOperationStep[]
  activeQuery: string | null
  telemetry: LiveTelemetry | null
  
  setStatus: (status: AgentStatusType) => void
  setPlan: (plan: AgentPlan | null) => void
  setError: (error: string | null) => void
  setActiveQuery: (query: string | null) => void
  setSteps: (steps: AgentOperationStep[]) => void
  upsertStep: (step: AgentOperationStep) => void
  setTelemetry: (telemetry: LiveTelemetry | null) => void
  reset: () => void
}

export const useAgentStore = create<AgentState>((set) => ({
  status: "IDLE",
  plan: null,
  error: null,
  steps: [],
  activeQuery: null,
  telemetry: null,
  
  setStatus: (status) => set({ status }),
  setPlan: (plan) => set({ plan }),
  setError: (error) => set({ error }),
  setActiveQuery: (query) => set({ activeQuery: query }),
  setSteps: (steps) => set({ steps }),
  setTelemetry: (telemetry) => set({ telemetry }),
  
  upsertStep: (newStep) => set((state) => {
    const existingIndex = state.steps.findIndex(s => s.id === newStep.id)
    if (existingIndex >= 0) {
      const updated = [...state.steps]
      updated[existingIndex] = { ...updated[existingIndex], ...newStep }
      return { steps: updated }
    } else {
      return { steps: [...state.steps, newStep] }
    }
  }),
  
  reset: () => set({ 
    status: "IDLE", 
    plan: null, 
    error: null, 
    steps: [],
    activeQuery: null,
    telemetry: null
  }),
}))
