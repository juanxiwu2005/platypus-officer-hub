import type { Goal } from "../../../data/types"
import { validateGoals } from "../../../data/settings"
import { onboardingCopy } from "../../copy"

/** The three goals the Goals screen suggests. Fictional and general: any club can start from them. `step` is what the +/- buttons change by. */
export interface Suggestion { id: string; label: string; unit: string; target: number; step: number }
const items = onboardingCopy.founder.goals.items
export const SUGGESTIONS: readonly Suggestion[] = [
  { id: "goal-weekly-events", label: items.events.label, unit: items.events.unit, target: 1, step: 1 },
  { id: "goal-active-members", label: items.members.label, unit: items.members.unit, target: 40, step: 5 },
  { id: "goal-external-income", label: items.income.label, unit: items.income.unit, target: 500, step: 100 },
]
export const MIN_TARGET = 1
export const MAX_TARGET = 1_000_000
/** How many goals start switched on when the president has not chosen yet. */
export const DEFAULT_ON = 2

export interface GoalRow { id: string; on: boolean; label: string; unit: string; target: number; step: number }

export const clampTarget = (n: number) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(n)))

/** The rows to show: preserve editable suggested goals when reopening the screen. */
export function rowsFrom(goals: Goal[]): GoalRow[] {
  const mine = goals.filter(g => SUGGESTIONS.some(s => s.id === g.id))
  if (!mine.length) return SUGGESTIONS.map((s, i) => ({ id: s.id, on: i < DEFAULT_ON, label: s.label, unit: s.unit, target: s.target, step: s.step }))
  return SUGGESTIONS.map(s => {
    const g = mine.find(x => x.id === s.id)
    return { id: s.id, on: !!g, label: g?.label ?? s.label, unit: g?.unit ?? s.unit, target: g?.target ?? s.target, step: s.step }
  })
}

/** The goals that go into the draft: only the rows switched on, progress at zero (the club has not done anything yet). */
export function goalsFrom(rows: GoalRow[]): Goal[] {
  return rows.flatMap(r => r.on ? [{ id: r.id, label: r.label.trim(), unit: r.unit.trim(), target: r.target, current: 0 }] : [])
}

/** Goals are optional; when supplied, they use the same validation as the rest of the app. Mission is required. */
export function goalsError(rows: GoalRow[], mission: string): string | null {
  if (!mission.trim()) return onboardingCopy.founder.goals.missionRequired
  if (mission.length > 300) return onboardingCopy.founder.goals.missionLong
  return validateGoals(goalsFrom(rows))
}
