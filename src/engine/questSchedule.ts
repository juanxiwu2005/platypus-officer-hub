import type { Event, StepTemplate } from "../data/types"
import { DEMO_TODAY } from "../data/seed"
import { addDays, daysBetween } from "../lib/dates"
import { buildEventNodes } from "./playbooks"
import { officialDeadline } from "./schedule"

export interface QuestDeadline { date: string; daysBefore: number; explanation: string }
export interface QuestClock {
  origin: string
  eventDate: string
  horizon: number
  slots: number[]
  dates: Record<number, string>
  deadlines: Record<"registry" | "room" | "ritm", QuestDeadline>
}
/** Fictional practice dates are produced inside the deterministic engine, never by the scene or AI. */
export function questSchedule(origin = DEMO_TODAY): QuestClock {
  const event: Event = { id: "quest-speaker-night", name: "Speaker Night", date: addDays(origin, 49), type: "social", headcount: 80, venue: "campus", food: "none", funding: "none", speaker: true, goalId: null, playbookId: "quest-reference" }
  // Quest uses the approved stricter handbook policy, independently of historical event templates.
  const policies = [{ key: "registry", rule: "R01", days: 30 }, { key: "room", rule: "R03", days: 16 }, { key: "ritm", rule: "R04", days: 14 }] as const
  const steps: StepTemplate[] = policies.map(p => ({ key: p.key, title: p.key, fn: "programs", phase: "prepare", anchor: { kind: "rule", ruleId: p.rule, days: p.days, unit: "calendar" }, estDays: 1, tier: "light", why: "Approved Quest reference policy", source: p.rule }))
  const nodes = buildEventNodes(event, [], { steps, mode: "custom", restoreMissingCore: false })
  const deadlines = Object.fromEntries(policies.map(p => {
    const node = nodes.find(item => item.stepKey === p.key)
    const value = node && officialDeadline(node, event)
    if (!value) throw new Error(`Missing Quest engine deadline: ${p.key}`)
    return [p.key, { date: value.date, daysBefore: daysBetween(value.date, event.date), explanation: value.why }]
  })) as QuestClock["deadlines"]
  const slots = [...new Set([49, 42, 35, 21, 7, 0, ...Object.values(deadlines).flatMap(d => [d.daysBefore, d.daysBefore - 1])])].filter(d => d >= 0 && d <= 49).sort((a, b) => b - a)
  return { origin, eventDate: event.date, horizon: 49, slots, dates: Object.fromEntries(slots.map(day => [day, addDays(event.date, -day)])), deadlines }
}
