import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react"
import type { DemoState } from "./types"
import { SCHEMA_VERSION, seedDemo } from "./seed"

/**
 * Demo store (v1.0): all data lives in this browser only (plan §11, decision 3).
 * Each Phase 3 participant gets their own copy; "Reset demo" restores the seed.
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded
 * and the app still works from memory.
 */
export const STORAGE_KEY = "platypus.v1.demo"

export type Action =
  | { type: "reset" }
  | { type: "setViewer"; viewerId: string }
  | { type: "setAi"; enabled: boolean }
  | { type: "replace"; state: DemoState }

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "reset":
      return seedDemo()
    case "setViewer":
      return state.people.some(p => p.id === action.viewerId) ? { ...state, viewerId: action.viewerId } : state
    case "setAi":
      return { ...state, aiEnabled: action.enabled }
    case "replace":
      return action.state
  }
}

export function loadState(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed && parsed.schemaVersion === SCHEMA_VERSION) return parsed
    }
  } catch {
    /* storage unavailable or corrupt: fall back to the seed */
  }
  return seedDemo()
}

export function saveState(state: DemoState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

interface StoreValue {
  state: DemoState
  dispatch: (a: Action) => void
  reset: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: DemoState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? null, s => s ?? loadState())
  useEffect(() => saveState(state), [state])
  const reset = useCallback(() => dispatch({ type: "reset" }), [])
  const value = useMemo(() => ({ state, dispatch, reset }), [state, reset])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext)
  if (!v) throw new Error("useStore must be used inside <StoreProvider>")
  return v
}

/** Convenience selectors */
export function useViewer() {
  const { state } = useStore()
  const person = state.people.find(p => p.id === state.viewerId) ?? state.people[0]
  const role = state.roles.find(r => r.id === person.roleId)
  const canNudge = role?.fn === "president" || role?.fn === "vice_president"
  return { person, role, canNudge }
}
