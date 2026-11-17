import type { DemoState } from "../data/types"
import type { ReminderDelivery, ReminderRuntime } from "./contracts"
import { buildReminderFacts, buildReminderInput } from "./facts"
import { confirmReminderDelivery, createReminderRuntime, planReminders, runAutomaticReminders, transitionReminderRuntime } from "./engine"
import { runFollowupDay } from "../engine/followup"
import { addDays } from "../lib/dates"
import { isReminderRuntime } from "./runtime"

/** Opt-in only. Unknown saved runtime versions are preserved but never executed. */
export function remindersEnabled(s: DemoState): boolean {
  return isReminderRuntime(s.reminderRuntime)
}

const facts = (s: DemoState) => s.nodes.flatMap(n => {
  const f = buildReminderFacts(s, n.id)
  return f ? [f] : []
})
const withRuntime = (s: DemoState, r: ReminderRuntime): DemoState => r === s.reminderRuntime ? s : { ...s, reminderRuntime: r }

export function enableReminderPlan(s: DemoState): DemoState {
  if (s.reminderRuntime) return s
  const legacyUnresolvedNodeIds = [...new Set([...s.nudges.map(n => n.nodeId), ...s.protocolLog.filter(e => e.kind === "reminder" && e.recipientIds.length).map(e => e.nodeId)])]
  const initial = { ...createReminderRuntime(s.today), ...(legacyUnresolvedNodeIds.length ? { legacyUnresolvedNodeIds } : {}) }
  const runtime = transitionReminderRuntime({ today: s.today, actorId: s.viewerId, before: [], after: facts(s), runtime: initial })
  // An old case has no plan/assignment snapshot proving it still applies. Close it on explicit activation;
  // retain all past entries, then let the new schedule establish any future leader follow-up.
  const next = { ...s, reminderRuntime: runtime, silenceCases: s.silenceCases.map(c => c.closedOn ? c : { ...c, closedOn: s.today }) }
  return withRuntime(next, runAutomaticReminders(buildReminderInput(next, runtime)))
}

/** Run after a successful business action. Editing presentation does not create an owner response. */
export function afterReminderAction(before: DemoState, result: DemoState, actorId: string, updatedNodeIds: string[] = []): DemoState {
  if (!remindersEnabled(before) || !result.reminderRuntime || result === before) return result
  // Handoff and other business commands also change owners: every path gets a new assignment version.
  const old = new Map(before.nodes.map(n => [n.id, n]))
  let changedOwners = false
  const nodes = result.nodes.map(n => {
    const prior = old.get(n.id)
    if (!prior || prior.ownerId === n.ownerId || (n.ownerVersion ?? 0) > (prior.ownerVersion ?? 0)) return n
    changedOwners = true
    return { ...n, ownerVersion: (prior.ownerVersion ?? 0) + 1 }
  })
  let next = changedOwners ? { ...result, nodes } : result
  const beforeFacts = facts(before), afterFacts = facts(next)
  const byId = new Map(afterFacts.map(n => [n.nodeId, n]))
  const resetCases = new Set(beforeFacts.filter(n => {
    const after = byId.get(n.nodeId)
    return !after || n.planKey !== after.planKey || n.status !== after.status || updatedNodeIds.includes(n.nodeId)
  }).map(n => n.nodeId))
  if (next.silenceCases.some(c => !c.closedOn && resetCases.has(c.nodeId))) {
    next = { ...next, silenceCases: next.silenceCases.map(c => !c.closedOn && resetCases.has(c.nodeId) ? { ...c, closedOn: next.today } : c) }
  }
  const runtime = transitionReminderRuntime({ today: next.today, actorId, before: beforeFacts, after: afterFacts, runtime: next.reminderRuntime!, updatedNodeIds })
  next = withRuntime(next, runtime)
  return withRuntime(next, runAutomaticReminders(buildReminderInput(next, runtime)))
}

export function confirmPlannedReminder(s: DemoState, candidateId: string, via: ReminderDelivery["via"]): DemoState {
  if (!remindersEnabled(s)) return s
  return withRuntime(s, confirmReminderDelivery(buildReminderInput(s, s.reminderRuntime!), candidateId, via))
}

/** Compatibility for the old manual-confirm action: only a currently eligible owner candidate can be recorded. */
export function confirmLegacyPlannedReminder(s: DemoState, nodeId: string, via: "president" | "platypus" | undefined): DemoState {
  if (!remindersEnabled(s)) return s
  const q = planReminders(buildReminderInput(s, s.reminderRuntime!))
  const candidate = q.ready.find(c => c.nodeId === nodeId && c.reason !== "waiting_on")
  return candidate ? confirmPlannedReminder(s, candidate.id, via === "platypus" ? "platypus" : "manual") : s
}

export function advancePlannedClock(s: DemoState, days: number): DemoState {
  if (!Number.isInteger(days) || days < 1 || days > 30 || !remindersEnabled(s)) return s
  let next = s
  for (let i = 0; i < days; i++) {
    const prior = next
    next = runFollowupDay(prior, addDays(prior.today, 1))
    next = afterReminderAction(prior, next, prior.viewerId)
  }
  return next
}
