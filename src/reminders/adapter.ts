import type { DemoState } from "../data/types"
import type { ReminderDelivery, ReminderRuntime } from "./contracts"
import { buildReminderFacts, buildReminderInput } from "./facts"
import { confirmReminderDelivery, createReminderRuntime, planReminders, transitionReminderRuntime } from "./engine"
import { runFollowupDay } from "../engine/followup"
import { addDays } from "../lib/dates"
import { isReminderRuntime } from "./runtime"
import type { ReminderMailSnapshot } from "./accessContracts"
import { validatedReminderMessage } from "./message"

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
  if (s.reminderRuntime !== undefined) return s
  const legacyUnresolvedNodeIds = [...new Set([...s.nudges.map(n => n.nodeId), ...s.protocolLog.filter(e => e.kind === "reminder" && e.recipientIds.length).map(e => e.nodeId)])]
  const initial: ReminderRuntime = { ...createReminderRuntime(s.today), version: 2, mailRequiredAfter: 0, ...(legacyUnresolvedNodeIds.length ? { legacyUnresolvedNodeIds } : {}) }
  // With no earlier facts no update entry is written, so the actor is never recorded; a fixed id keeps the result independent of the viewer.
  const runtime = transitionReminderRuntime({ today: s.today, actorId: "system:reminders", before: [], after: facts(s), runtime: initial })
  // An old silence case has no plan/assignment snapshot proving it still applies, so activation closes every open legacy case
  // (closedOn = today) while keeping its history. Since S2 (2026-11-22) activation also runs automatically on load, reset and import
  // (upgradeReminderPlan via withCurrentReminders in store.tsx), not only on an explicit lead action. The new schedule then
  // establishes any future leader follow-up.
  const next = { ...s, reminderRuntime: runtime, silenceCases: s.silenceCases.map(c => c.closedOn ? c : { ...c, closedOn: s.today }) }
  return next
}

/**
 * Brings a legacy reminder plan (none yet, or a valid version 1) to the current version, keeping every setting and all history.
 * Since S2 (2026-11-22) this runs automatically whenever state is loaded, reset or imported (`withCurrentReminders` in store.tsx);
 * it does not depend on the viewer. An invalid runtime is kept untouched for recovery. Idempotent: returns the same object when the
 * plan is already current.
 */
export function upgradeReminderPlan(s: DemoState): DemoState {
  if (s.reminderRuntime === undefined) return enableReminderPlan(s)
  if (!isReminderRuntime(s.reminderRuntime) || s.reminderRuntime.version !== 1) return s
  return { ...s, reminderRuntime: { ...s.reminderRuntime, version: 2, mailRequiredAfter: s.reminderRuntime.sequence } }
}

export function reviewLegacyReminder(s: DemoState, nodeId: string): DemoState {
  if (!isReminderRuntime(s.reminderRuntime) || s.reminderRuntime.version !== 2 || !s.reminderRuntime.legacyUnresolvedNodeIds?.includes(nodeId)) return s
  const n = s.nodes.find(n => n.id === nodeId)
  if (!n?.ownerId || !buildReminderInput(s, s.reminderRuntime).people.some(p => p.id === n.ownerId && p.active)) return s
  const sequence = s.reminderRuntime.sequence + 1
  return { ...s, reminderRuntime: { ...s.reminderRuntime, sequence,
    legacyUnresolvedNodeIds: s.reminderRuntime.legacyUnresolvedNodeIds.filter(id => id !== nodeId),
    updates: [...s.reminderRuntime.updates, { id: `reminder-review:${sequence}`, sequence, nodeId, ownerId: n.ownerId, ownerVersion: n.ownerVersion ?? 0, actorId: s.viewerId, on: s.today, status: n.status, ownerReply: false }],
  } }
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
  return next
}

export function confirmPlannedReminder(s: DemoState, candidateId: string, via: ReminderDelivery["via"], message?: ReminderMailSnapshot): DemoState {
  if (!remindersEnabled(s)) return s
  if (s.reminderRuntime!.version === 2 && !message) return s
  const candidate = planReminders(buildReminderInput(s, s.reminderRuntime!)).ready.find(c => c.id === candidateId)
  const snapshot = message && candidate ? validatedReminderMessage(s, message, candidate.nodeId, candidateId) : null
  if (message && !snapshot) return s
  const runtime = confirmReminderDelivery(buildReminderInput(s, s.reminderRuntime!), candidateId, via)
  if (runtime === s.reminderRuntime) return s
  return withRuntime(s, snapshot ? { ...runtime, deliveries: runtime.deliveries.map((d, i) => i === runtime.deliveries.length - 1 ? { ...d, message: snapshot } : d) } : runtime)
}

/** Compatibility for the old manual-confirm action: only a currently eligible owner candidate can be recorded. */
export function confirmLegacyPlannedReminder(s: DemoState, nodeId: string, via: "president" | "platypus" | undefined, message?: ReminderMailSnapshot): DemoState {
  if (!remindersEnabled(s)) return s
  const q = planReminders(buildReminderInput(s, s.reminderRuntime!))
  const candidate = q.ready.find(c => c.nodeId === nodeId && !c.waitingRequestId)
  return candidate ? confirmPlannedReminder(s, candidate.id, via === "platypus" ? "platypus" : "manual", message) : s
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
