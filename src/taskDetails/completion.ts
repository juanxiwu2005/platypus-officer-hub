import { useCallback, useSyncExternalStore } from "react"
import type { TaskAuthorization } from "./contracts"

/**
 * I3 (2026-11-27) put a one-click Mark done beside the status. Juanxi (2026-11-28): it repeated Submit & mark done and
 * did not match the primary button, so completing has one button again, under Details. TaskProgress still offers this
 * place beside the status, where TaskSubmission renders its Undo mark done through a portal after completion.
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
