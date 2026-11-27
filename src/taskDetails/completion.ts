import { useCallback, useSyncExternalStore } from "react"
import type { TaskAuthorization } from "./contracts"

/**
 * I3 (2026-11-27): one-click Mark done sits beside the status (TaskProgress), but completing keeps one path:
 * TaskSubmission's submit (saveTaskWork with submit: true) and its Undo mark done. TaskProgress only offers this
 * place, and TaskSubmission renders its Mark done or Undo there through a portal, so both share one permission check.
 */
const slots = new Map<string, HTMLElement>(), listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export const doneSlotKey = (nodeId: string, actorId: string, authorization?: TaskAuthorization) => JSON.stringify([nodeId, actorId, authorization?.kind ?? null, authorization?.token ?? null])

/** The ref for TaskProgress's place beside the status menu. */
export function useDoneSlotRef(key: string) {
  return useCallback((el: HTMLElement | null) => {
    if (el) slots.set(key, el)
    else slots.delete(key)
    emit()
  }, [key])
}
/** TaskSubmission reads the place, or null when the status menu is not shown (then it keeps Undo beside its own button). */
export function useDoneSlot(key: string): HTMLElement | null {
  return useSyncExternalStore(subscribe, () => slots.get(key) ?? null, () => null)
}
