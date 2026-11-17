import { addDays, daysBetween } from "../lib/dates"
import type {
  BlockedReminder, ReminderCandidate, ReminderDelivery, ReminderInput, ReminderPerson, ReminderPlan,
  ReminderReason, ReminderRuntime, ReminderTaskFacts, ReminderTransition, WaitingRequest,
} from "./contracts"

/** Rule-only state: activation records no invented historical messages. */
export function createReminderRuntime(today: string): ReminderRuntime {
  return { version: 1, activatedOn: today, sequence: 0, updates: [], deliveries: [], waitingRequests: [] }
}

const waitingText = (task: ReminderTaskFacts) => task.waitingOn?.trim() ?? ""
const sameOwner = (a: Pick<ReminderTaskFacts, "ownerId" | "ownerVersion">, b: Pick<ReminderTaskFacts, "ownerId" | "ownerVersion">) => a.ownerId === b.ownerId && a.ownerVersion === b.ownerVersion
const sameWaiting = (request: WaitingRequest, task: ReminderTaskFacts) => sameOwner(request, task)
  && request.recipientId === task.waitingOnPersonId && request.waitingOn === waitingText(task)

/** Append explicit status actions in their actual operation order, including actions on the same day. */
export function transitionReminderRuntime(input: ReminderTransition): ReminderRuntime {
  const { runtime, today, actorId } = input
  const before = new Map(input.before.map(task => [task.nodeId, task]))
  const after = new Map(input.after.map(task => [task.nodeId, task]))
  const explicit = new Set(input.updatedNodeIds ?? [])
  const oldLegacy = (runtime as ReminderRuntime & { legacyUnresolvedNodeIds?: string[] }).legacyUnresolvedNodeIds
  // A known new assignment separates future reminders from ambiguous legacy history. Edits and
  // status updates cannot do that; the old deliveries themselves are never assigned to the new owner.
  const legacy = oldLegacy?.filter(nodeId => {
    const old = before.get(nodeId), next = after.get(nodeId)
    return !(old && next?.ownerId && !sameOwner(old, next))
  })
  const legacyChanged = !!oldLegacy && legacy!.length !== oldLegacy.length
  let sequence = runtime.sequence
  let updates = runtime.updates
  for (const task of input.after) {
    const old = before.get(task.nodeId)
    const semanticChange = !!old && (!sameOwner(old, task) || old.status !== task.status
      || old.waitingOnPersonId !== task.waitingOnPersonId || waitingText(old) !== waitingText(task))
    if (!semanticChange && !explicit.has(task.nodeId)) continue
    sequence++
    updates = [...updates, {
      id: `reminder-update:${sequence}`, sequence, nodeId: task.nodeId, ownerId: task.ownerId,
      ownerVersion: task.ownerVersion, actorId, on: today, status: task.status,
      ownerReply: !!task.ownerId && actorId === task.ownerId && explicit.has(task.nodeId),
    }]
  }

  let requestsChanged = false
  let waitingRequests = runtime.waitingRequests.map(request => {
    if (request.closedOn) return request
    const task = after.get(request.nodeId)
    let closeReason: WaitingRequest["closeReason"]
    if (!task) closeReason = "unavailable"
    else if (task.status === "done") closeReason = "completed"
    else if (!sameOwner(request, task)) closeReason = "reassigned"
    else if (task.status !== "waiting") closeReason = "resolved"
    else if (!sameWaiting(request, task)) closeReason = "changed"
    if (!closeReason) return request
    requestsChanged = true
    sequence++
    return { ...request, closedOn: today, closeReason }
  })
  for (const task of input.after) {
    if (task.status !== "waiting" || !task.ownerId) continue
    if (waitingRequests.some(request => request.nodeId === task.nodeId && !request.closedOn && sameWaiting(request, task))) continue
    sequence++
    waitingRequests = [...waitingRequests, {
      id: `waiting-request:${task.nodeId}:${sequence}`, nodeId: task.nodeId, ownerId: task.ownerId,
      ownerVersion: task.ownerVersion, recipientId: task.waitingOnPersonId, waitingOn: waitingText(task),
      createdOn: today, sequence, closedOn: null,
    }]
    requestsChanged = true
  }
  return sequence === runtime.sequence && updates === runtime.updates && !requestsChanged && !legacyChanged
    ? runtime : { ...runtime, sequence, updates, waitingRequests, ...(legacyChanged ? { legacyUnresolvedNodeIds: legacy } : {}) }
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const canReceive = (person: ReminderPerson | undefined, emailOnly = false): person is ReminderPerson => !!person?.active
  && (!(emailOnly || person.channel === "email") || isEmail(person.email))
const rank: Record<ReminderReason, number> = { start: 0, due: 1, overdue: 2, waiting_on: 3 }
const candidateOrder = (a: ReminderCandidate, b: ReminderCandidate) => a.scheduledOn.localeCompare(b.scheduledOn)
  || a.nodeId.localeCompare(b.nodeId) || a.recipientId.localeCompare(b.recipientId) || a.id.localeCompare(b.id)

function explanation(reason: ReminderReason, today: string, scheduledOn: string, overdueDays: number) {
  if (scheduledOn > today) {
    if (reason === "start") return "We will check in when the planned start date arrives."
    if (reason === "due") return "We will check for a completion update on this task's due date."
    return "If this task is still incomplete, we will follow up after its due date."
  }
  if (reason === "start") return today === scheduledOn
    ? "Today is the planned start date for this task. Let us know if you need a hand."
    : "The planned start date has passed. Could you share where things stand so we can help?"
  if (overdueDays > 0) return `This task is ${overdueDays} day${overdueDays === 1 ? "" : "s"} past its due date. Could you share an update so we can work out the next step together?`
  return "This task is due today, and no completion is recorded yet. A quick update will help us stay in sync."
}

function taskCandidate(task: ReminderTaskFacts, reason: "start" | "due" | "overdue", scheduledOn: string, today: string): ReminderCandidate {
  const overdueDays = task.due ? Math.max(0, daysBetween(task.due, today)) : 0
  return {
    id: JSON.stringify(["reminder", task.planKey, reason]), nodeId: task.nodeId, ownerId: task.ownerId!,
    ownerVersion: task.ownerVersion, recipientId: task.ownerId!, planKey: task.planKey, reason,
    scheduledOn, due: task.due, overdueDays, explanation: explanation(reason, today, scheduledOn, overdueDays),
  }
}

function limitReason(input: ReminderInput, candidate: ReminderCandidate): BlockedReminder["reason"] | null {
  const { deliveries } = input.runtime
  if (deliveries.some(delivery => delivery.nodeId === candidate.nodeId && delivery.recipientId === candidate.recipientId && delivery.sentOn === input.today)) return "already_sent_today"
  const rawLimit = Number.isFinite(input.maxPerTask) ? Math.floor(input.maxPerTask) : 3
  const taskLimit = Math.max(1, Math.min(3, rawLimit))
  if (deliveries.filter(delivery => delivery.nodeId === candidate.nodeId && sameOwner(delivery, candidate)).length >= taskLimit) return "task_limit"
  const weekStart = addDays(input.today, -6)
  if (deliveries.filter(delivery => delivery.recipientId === candidate.recipientId && delivery.sentOn >= weekStart && delivery.sentOn <= input.today).length >= 6) return "weekly_limit"
  return null
}

/** Derives candidates, never derives an already-sent fact. All historical sends live in runtime.deliveries. */
export function planReminders(input: ReminderInput): ReminderPlan {
  const ready: ReminderCandidate[] = [], upcoming: ReminderCandidate[] = [], blocked: BlockedReminder[] = []
  const people = new Map(input.people.map(person => [person.id, person]))
  const delivered = new Set(input.runtime.deliveries.map(delivery => delivery.candidateId))
  // Additive migration marker: no recipient or assignment is inferred from ambiguous old history.
  const legacy = new Set((input.runtime as ReminderRuntime & { legacyUnresolvedNodeIds?: string[] }).legacyUnresolvedNodeIds ?? [])
  for (const task of input.tasks) {
    if (task.status === "done") continue
    if (legacy.has(task.nodeId)) { blocked.push({ nodeId: task.nodeId, reason: "legacy_history" as BlockedReminder["reason"] }); continue }
    if (!task.ownerId) { blocked.push({ nodeId: task.nodeId, reason: "no_owner" }); continue }
    if (!people.get(task.ownerId)?.active) { blocked.push({ nodeId: task.nodeId, recipientId: task.ownerId, reason: "unavailable_recipient" }); continue }
    if (task.status === "blocked") { blocked.push({ nodeId: task.nodeId, recipientId: task.ownerId, reason: "paused" }); continue }

    let candidates: ReminderCandidate[]
    if (task.status === "waiting") {
      const request = input.runtime.waitingRequests.find(value => value.nodeId === task.nodeId && !value.closedOn && sameWaiting(value, task))
      if (!request?.recipientId || request.recipientId === task.ownerId) { blocked.push({ nodeId: task.nodeId, reason: "unresolved_waiting" }); continue }
      if (!canReceive(people.get(request.recipientId), true)) { blocked.push({ nodeId: task.nodeId, recipientId: request.recipientId, reason: "unavailable_recipient" }); continue }
      const ownerName = people.get(task.ownerId)!.name
      candidates = [{
        id: JSON.stringify(["reminder", "waiting_on", request.id]), nodeId: task.nodeId, ownerId: task.ownerId,
        ownerVersion: task.ownerVersion, recipientId: request.recipientId, planKey: task.planKey, reason: "waiting_on",
        scheduledOn: request.createdOn, due: task.due, overdueDays: task.due ? Math.max(0, daysBetween(task.due, input.today)) : 0,
        explanation: `${ownerName} is waiting on your help with “${task.title}”. Open the task to see what is needed. Thank you for helping us move this forward.`,
        waitingRequestId: request.id,
      }]
    } else {
      if (!canReceive(people.get(task.ownerId))) { blocked.push({ nodeId: task.nodeId, recipientId: task.ownerId, reason: "unavailable_recipient" }); continue }
      candidates = []
      const hasStartReply = task.startOn && input.runtime.updates.some(update => update.nodeId === task.nodeId
        && sameOwner(update, task) && update.ownerReply && update.on >= task.startOn! && update.on <= input.today)
      if (task.startOn && task.status !== "in_progress" && !hasStartReply) candidates.push(taskCandidate(task, "start", task.startOn, input.today))
      if (task.due) {
        candidates.push(taskCandidate(task, "due", task.due, input.today))
        candidates.push(taskCandidate(task, "overdue", addDays(task.due, 3), input.today))
      }
    }

    // Collapse matching dates (due outranks start), then select the latest reached stage even if it was already sent.
    // Looking for an unsent stage first would incorrectly backfill an older start after sending the due reminder.
    const byDate = new Map<string, ReminderCandidate>()
    for (const candidate of candidates) {
      const prior = byDate.get(candidate.scheduledOn)
      if (!prior || rank[candidate.reason] > rank[prior.reason]) byDate.set(candidate.scheduledOn, candidate)
    }
    const ordered = [...byDate.values()].sort(candidateOrder)
    upcoming.push(...ordered.filter(candidate => candidate.scheduledOn > input.today && !delivered.has(candidate.id)))
    const latest = ordered.filter(candidate => candidate.scheduledOn <= input.today).at(-1)
    if (!latest || delivered.has(latest.id)) continue
    const held = limitReason(input, latest)
    if (held) blocked.push({ nodeId: latest.nodeId, recipientId: latest.recipientId, reason: held })
    else ready.push(latest)
  }
  return { ready: ready.sort(candidateOrder), upcoming: upcoming.sort(candidateOrder), blocked }
}

/** The caller owns business authorization. This function rechecks readiness, mode and all delivery limits. */
export function confirmReminderDelivery(input: ReminderInput, candidateId: string, via: ReminderDelivery["via"]): ReminderRuntime {
  const allowed = input.mode === "auto_email" ? ["automatic", "platypus"] : input.mode === "review_then_auto" ? ["platypus"] : ["manual"]
  if (!allowed.includes(via)) return input.runtime
  const candidate = planReminders(input).ready.find(value => value.id === candidateId)
  if (!candidate) return input.runtime
  const task = input.tasks.find(value => value.nodeId === candidate.nodeId)!
  const recipient = input.people.find(person => person.id === candidate.recipientId)!
  const sequence = input.runtime.sequence + 1
  const delivery: ReminderDelivery = {
    id: `reminder-delivery:${sequence}`, candidateId, nodeId: candidate.nodeId, recipientId: candidate.recipientId,
    ownerId: candidate.ownerId, ownerVersion: candidate.ownerVersion, planKey: candidate.planKey, reason: candidate.reason,
    scheduledOn: candidate.scheduledOn, sentOn: input.today, sequence, via, recipientName: recipient.name,
    taskTitle: task.title, eventName: task.eventName, due: task.due,
    ...(candidate.waitingRequestId ? { waitingRequestId: candidate.waitingRequestId } : {}),
    outcome: via === "manual" ? "recorded_by_sender" : "simulated",
  }
  return { ...input.runtime, sequence, deliveries: [...input.runtime.deliveries, delivery] }
}

/** Automatic demo deliveries are durable and individually rechecked, including aggregate batch limits. */
export function runAutomaticReminders(input: ReminderInput): ReminderRuntime {
  if (input.mode !== "auto_email") return input.runtime
  let runtime = input.runtime
  for (const candidate of planReminders(input).ready) {
    runtime = confirmReminderDelivery({ ...input, runtime }, candidate.id, "automatic")
  }
  return runtime
}
