import { shiftWork } from "../../../engine/calendar"
import type { DemoState } from "../../../data/types"

/**
 * FB-3 (docs/feedback-fix/PLAN.md 5.2): the club buffer you can see working. Three named choices (the stored value is still draft.buffer);
 * a draft that holds another allowed value (2 or 7, e.g. from Settings) shows it as a fourth, chosen "Custom" choice.
 */
export const BUFFER_OPTIONS = [
  { id: "tight", days: 1, recommended: false },
  { id: "standard", days: 3, recommended: true },
  { id: "safe", days: 5, recommended: false },
] as const
export type BufferOptionId = (typeof BUFFER_OPTIONS)[number]["id"]
export const isNamedBuffer = (days: number) => BUFFER_OPTIONS.some(o => o.days === days)

/** The most steps the buffer block lists. */
export const MAX_BUFFER_ROWS = 3
export interface BufferRow { key: string; title: string; official: string; club: string; moved: "earlier" | "later" | null }

/** The steps of the planned event that have an ASU deadline, in ASU-deadline order, each keyed so the same step can be found in another plan. */
function asuSteps(preview: DemoState) {
  const seen = new Map<string, number>()
  return preview.nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => !!n.officialDeadline && !!n.clubDeadline)
    .sort((a, b) => a.n.officialDeadline!.localeCompare(b.n.officialDeadline!) || a.i - b.i)
    .map(({ n }) => {
      const base = n.stepKey ?? n.title
      const k = seen.get(base) ?? 0
      seen.set(base, k + 1)
      return { key: `${base}#${k}`, title: n.title, official: n.officialDeadline!, club: n.clubDeadline! }
    })
}

/**
 * Rows for the buffer block: the real steps of this event that have an ASU deadline (at most three), with both dates exactly as the rule
 * engine gave them in `preview`. `before` is the plan under the previous choice: a row whose club date differs from it is marked moved
 * earlier or later. Nothing here makes up a date.
 */
export function bufferRows(preview: DemoState | null, before: DemoState | null = null, max = MAX_BUFFER_ROWS): BufferRow[] {
  if (!preview) return []
  const old = new Map(before ? asuSteps(before).map(r => [r.key, r.club]) : [])
  return asuSteps(preview).slice(0, max).map(r => {
    const was = old.get(r.key)
    return { ...r, moved: !was || was === r.club ? null : r.club < was ? "earlier" : "later" }
  })
}

/**
 * Whether the buffer is what sets any listed row's club date: its club date is exactly "ASU deadline minus the buffer", the engine's own
 * rule (engine/schedule.ts: shiftWork(official, -buffer)). When no row is set by it, the plan already finishes earlier and nothing moves.
 */
export const bufferBinds = (rows: BufferRow[], buffer: number) => rows.some(r => r.club === shiftWork(r.official, -buffer))
