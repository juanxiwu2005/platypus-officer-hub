import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react"
import type { DemoState, Event, Node } from "./types"
import { SCHEMA_VERSION, seedDemo } from "./seed"
import { applySchedule, computeSchedule, type Schedule } from "../engine/schedule"

/**
 * Demo store (v1.0): all data lives in this browser only (plan §11, decision 3).
 * Each Phase 3 participant gets their own copy; "Reset demo" restores the seed.
 * Storage can be unavailable (private windows, blocked site data), so every access is guarded
 * and the app still works from memory.
 */
export const STORAGE_KEY = "platypus.v1.demo"

/** Fields a person may edit on a node. Dates are not here: only the club deadline override, which the engine then applies. */
export type NodePatch = Partial<Pick<Node, "ownerId" | "clubDeadlineOverride" | "estDays" | "approverRoleId" | "consultedRoleIds" | "informedRoleIds" | "why" | "draftLink">>
export type EventPatch = Partial<Pick<Event, "date" | "name" | "headcount">>

export type Action =
  | { type: "reset" }
  | { type: "setViewer"; viewerId: string }
  | { type: "setAi"; enabled: boolean }
  | { type: "replace"; state: DemoState }
  | { type: "updateNode"; id: string; patch: NodePatch }
  | { type: "updateEvent"; id: string; patch: EventPatch }

const NODE_FIELDS: (keyof NodePatch)[] = ["ownerId", "clubDeadlineOverride", "estDays", "approverRoleId", "consultedRoleIds", "informedRoleIds", "why", "draftLink"]
const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]])) as unknown as Partial<T>

function updateNode(state: DemoState, id: string, raw: NodePatch): DemoState {
  const patch = pick(raw, NODE_FIELDS)
  if (patch.estDays !== undefined) patch.estDays = Math.max(0, Math.min(30, Math.round(Number(patch.estDays) || 0)))
  return {
    ...state,
    nodes: state.nodes.map(n => {
      if (n.id !== id) return n
      const next: Node = { ...n, ...patch, lastUpdate: state.today }
      // Claim handshake (plan §4 mechanism 2): a new owner has to accept the task again.
      if ("ownerId" in patch && patch.ownerId !== n.ownerId && n.status !== "done") {
        next.status = "unclaimed"
        next.acceptedOn = null
      }
      return next
    }),
  }
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case "reset":
      return seedDemo()
    case "setViewer":
      return state.people.some(p => p.id === action.viewerId) ? { ...state, viewerId: action.viewerId } : state
    case "setAi":
      return { ...state, aiEnabled: action.enabled }
    case "replace":
      return applySchedule(action.state)
    case "updateNode":
      return state.nodes.some(n => n.id === action.id) ? applySchedule(updateNode(state, action.id, action.patch)) : state
    case "updateEvent": {
      const patch = pick(action.patch, ["date", "name", "headcount"])
      if (patch.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) return state
      return applySchedule({ ...state, events: state.events.map(e => (e.id === action.id ? { ...e, ...patch } : e)) })
    }
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

/** The engine's full result (dates, explanations, issues). Recomputed only when the state changes. */
export function useSchedule(): Schedule {
  const { state } = useStore()
  return useMemo(() => computeSchedule(state), [state])
}

/** Convenience selectors */
export function useViewer() {
  const { state } = useStore()
  const person = state.people.find(p => p.id === state.viewerId) ?? state.people[0]
  const role = state.roles.find(r => r.id === person.roleId)
  const canNudge = role?.fn === "president" || role?.fn === "vice_president"
  return { person, role, canNudge }
}
