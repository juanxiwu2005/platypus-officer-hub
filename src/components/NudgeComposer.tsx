import { lazy, Suspense } from "react"

const ReminderComposer = lazy(() => import("../reminders/ReminderComposer"))

/** Mail preparation is rule-only and loaded when a person opens a reminder. */
export function NudgeComposer(props: { nodeId: string; onClose: () => void }) {
  return <Suspense fallback={<p role="status">Preparing your reminder…</p>}><ReminderComposer {...props} /></Suspense>
}
