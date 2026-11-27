import { lazy, Suspense } from "react"
import { useStore } from "../../data/store"
import { isLead } from "../../data/cheers"
import { WEEKLY_LINE_LAST_WEEKDAY } from "../../data/cheerRules"
import { fromISO } from "../../lib/dates"

const WeeklyLineStrip = lazy(() => import("./WeeklyLineStrip"))

/**
 * F7 (R1) on the Reminders home, which is in the entry chunk: only a cheap check runs here (the viewer holds the president
 * or VP role, and it is Monday to Wednesday of the demo week). The strip, its rules and the Cheers stylesheet load lazily
 * after that; `weeklyLine` there makes the full decision.
 */
export function WeeklyLine() {
  const { state } = useStore()
  const weekday = (fromISO(state.today).getDay() + 6) % 7 + 1 // 1 = Monday … 7 = Sunday
  if (weekday > WEEKLY_LINE_LAST_WEEKDAY || !isLead(state, state.viewerId)) return null
  return <Suspense fallback={null}><WeeklyLineStrip /></Suspense>
}
