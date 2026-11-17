import { useCallback, useEffect, useMemo, useState } from "react"
import type { Action } from "../data/store"
import type { DemoState } from "../data/types"
import { isReminderRuntime } from "./runtime"
import { planReminders } from "./engine"
import { buildReminderInput } from "./facts"

/** Local demonstration while the app is open; no timers, network mail or identity impersonation. */
export function useAutomaticReminders(state: DemoState, suspended: boolean, getState: () => DemoState, tryDispatch: (a: Action) => boolean) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(n => n + 1), [])
  useEffect(() => {
    let current = true
    if (suspended || state.org.settings.reminderMode !== "auto_email" || !isReminderRuntime(state.reminderRuntime) || state.reminderRuntime.version !== 2) { setBusy(false); setError(null); return }
    const ids = planReminders(buildReminderInput(state, state.reminderRuntime)).ready.map(c => c.id)
    if (!ids.length) { setBusy(false); setError(null); return }
    setBusy(true); setError(null)
    import("./delivery").then(({ sendReminderBatch }) => current ? sendReminderBatch({getState, tryDispatch}, ids, window.location.origin, "automatic", () => current) : null)
      .then(result => { if (current && result) setError(result.error) })
      .catch(() => { if (current) setError("Automatic reminders were not recorded. Please try again.") })
      .finally(() => { if (current) setBusy(false) })
    return () => { current = false }
  }, [state, suspended, getState, tryDispatch, attempt])
  return useMemo(() => ({ busy, error, retry }), [busy, error, retry])
}
