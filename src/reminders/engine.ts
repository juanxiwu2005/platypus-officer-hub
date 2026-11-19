import { addDays, daysBetween } from "../lib/dates"
import { allowedReminderVia, compareReminders, deliveryEmailKey, DIGEST_TASK_CAP, expectedInputOn, FOLLOWUP_DAYS, importantDelivery, importantReminder, isMilestone } from "./policy"
import type { ReminderMailSnapshot } from "./accessContracts"
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
const rank: Record<ReminderReason, number> = { start: 0, no_reply: 0, due: 1, overdue: 2, waiting_on: 3, waiting_followup: 3 }
const candidateOrder = (a: ReminderCandidate, b: ReminderCandidate) => a.scheduledOn.localeCompare(b.scheduledOn)
  || a.nodeId.localeCompare(b.nodeId) || a.recipientId.localeCompare(b.recipientId) || a.id.localeCompare(b.id)

function explanation(reason: ReminderReason, today: string, scheduledOn: string, overdueDays: number) {
  if (scheduledOn > today) {
    if (reason === "start") return "We will check in at the planned start."
    if (reason === "due") return "We will check for completion when due."
    return "We will follow up if still incomplete."
  }
  if (reason === "start") return today === scheduledOn
    ? "Today is our planned start. Can we help?"
    : "The planned start has passed. Can we help?"
  if (overdueDays > 0) return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue. Can we help?`
  return "Due today; no completion update yet. Can we help?"
}

function taskCandidate(task: ReminderTaskFacts, reason: "start" | "due" | "overdue", scheduledOn: string, today: string): ReminderCandidate {
  const overdueDays = task.due ? Math.max(0, daysBetween(task.due, today)) : 0
  return {
    id: JSON.stringify(["reminder", task.planKey, reason]), nodeId: task.nodeId, ownerId: task.ownerId!,
    ownerVersion: task.ownerVersion, recipientId: task.ownerId!, planKey: task.planKey, reason,
    scheduledOn, due: task.due, overdueDays, explanation: explanation(reason, today, scheduledOn, overdueDays),
  }
}

/** Per-task limits: one reminder per task and person per day, and the configured reminders per task. */
function taskLimitReason(input: ReminderInput, candidate: ReminderCandidate): BlockedReminder["reason"] | null {
  const { deliveries } = input.runtime
  if (deliveries.some(delivery => delivery.nodeId === candidate.nodeId && delivery.recipientId === candidate.recipientId && delivery.sentOn === input.today)) return "already_sent_today"
  const rawLimit = Number.isFinite(input.maxPerTask) ? Math.floor(input.maxPerTask) : 3
  const taskLimit = Math.max(1, Math.min(3, rawLimit))
  const scoped = deliveries.filter(delivery => delivery.nodeId === candidate.nodeId && sameOwner(delivery, candidate)
    && delivery.recipientId === candidate.recipientId)
  if (candidate.reason === "no_reply" ? scoped.some(d => d.reason === "no_reply") || taskLimit < 3
    : (isMilestone(candidate.reason) ? new Set(scoped.filter(d => isMilestone(d.reason)).map(d => d.reason)).size
      : scoped.filter(d => !isMilestone(d.reason) && d.reason !== "no_reply").length) >= taskLimit) return "task_limit"
  return null
}

/**
 * Per-person limits count EMAILS, not tasks: a recorded digest (shared digestId) is one email, a delivery without
 * digestId is its own email, and an email is important when any task in it is. Today's ready tasks for this person are
 * evaluated as one more email, important when any of them is: at most 6 emails a week (2 kept for important ones)
 * and 2 a day (the second kept for an important one).
 */
function emailLimitReason(input: ReminderInput, recipientId: string, important: boolean): BlockedReminder["reason"] | null {
  const weekStart = addDays(input.today, -6)
  const emails = new Map<string, { important: boolean; today: boolean }>()
  for (const delivery of input.runtime.deliveries) {
    if (delivery.recipientId !== recipientId || delivery.sentOn < weekStart || delivery.sentOn > input.today) continue
    const key = deliveryEmailKey(delivery), prior = emails.get(key)
    emails.set(key, { important: !!prior?.important || importantDelivery(delivery), today: !!prior?.today || delivery.sentOn === input.today })
  }
  const week = [...emails.values()]
  if (week.length >= 6) return "weekly_limit"
  if (!important && week.filter(email => !email.important).length >= 4) return "weekly_reserved"
  const day = week.filter(email => email.today)
  if (day.length >= 2) return "daily_limit"
  if (!important && day.some(email => !email.important)) return "daily_reserved"
  return null
}

/** Derives candidates, never derives an already-sent fact. All historical sends live in runtime.deliveries. */
export function planReminders(input: ReminderInput): ReminderPlan {
  const ready: ReminderCandidate[] = [], upcoming: ReminderCandidate[] = [], blocked: BlockedReminder[] = [], pending: ReminderCandidate[] = []
  const people = new Map(input.people.map(person => [person.id, person]))
  const delivered = new Set(input.runtime.deliveries.map(delivery => delivery.candidateId))
  // Dates reject stale drafts, but never erase a milestone that was actually delivered in this assignment.
  const sent = (candidate: ReminderCandidate) => delivered.has(candidate.id) || (isMilestone(candidate.reason) || candidate.reason === "no_reply")
    && input.runtime.deliveries.some(d => d.nodeId === candidate.nodeId && sameOwner(d, candidate) && d.recipientId === candidate.recipientId && d.reason === candidate.reason)
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
      if (request?.response === "provided") continue
      if (!request?.recipientId || request.recipientId === task.ownerId) { blocked.push({ nodeId: task.nodeId, reason: "unresolved_waiting" }); continue }
      if (!canReceive(people.get(request.recipientId), true)) { blocked.push({ nodeId: task.nodeId, recipientId: request.recipientId, reason: "unavailable_recipient" }); continue }
      const ownerName = people.get(task.ownerId)!.name
      const first = input.runtime.deliveries.find(d => d.waitingRequestId === request.id && d.reason === "waiting_on")
      const promised = request.response === "acknowledged"
      const followup = promised || !!first
      const scheduledOn = promised ? expectedInputOn(request) : first ? addDays(first.sentOn, FOLLOWUP_DAYS) : request.createdOn
      candidates = [{
        id: JSON.stringify(followup ? ["reminder", "waiting_followup", request.id, promised ? "promised" : "unanswered"] : ["reminder", "waiting_on", request.id]),
        nodeId: task.nodeId, ownerId: task.ownerId, ownerVersion: task.ownerVersion, recipientId: request.recipientId,
        planKey: task.planKey, reason: followup ? "waiting_followup" : "waiting_on", scheduledOn,
        due: task.due, overdueDays: task.due ? Math.max(0, daysBetween(task.due, input.today)) : 0,
        explanation: promised ? `The planned input date is ${scheduledOn}; ${ownerName} is still waiting for your input.`
          : followup ? `${ownerName} has not received a reply to the request for help.` : `${ownerName} is waiting on your help with “${task.title}”. Thank you.`,
        waitingRequestId: request.id,
      }]
    } else {
      if (!canReceive(people.get(task.ownerId), input.mode === "auto_email" || input.mode === "review_then_auto")) { blocked.push({ nodeId: task.nodeId, recipientId: task.ownerId, reason: "unavailable_recipient" }); continue }
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
    const latest = ordered.filter(candidate => candidate.scheduledOn <= input.today).at(-1)
    let followup: ReminderCandidate | undefined
    if (task.status !== "waiting" && input.maxPerTask >= 3) {
      const last = input.runtime.deliveries.filter(d => d.nodeId === task.nodeId && sameOwner(d, task)
        && d.recipientId === task.ownerId && !d.waitingRequestId && d.sentOn <= input.today).sort((a, b) => b.sequence - a.sequence)[0]
      const replied = last && input.runtime.updates.some(u => u.nodeId === task.nodeId && sameOwner(u, task)
        && u.ownerReply && u.sequence > last.sequence && u.on <= input.today)
      if (last && last.planKey === task.planKey && !replied) {
        followup = { ...taskCandidate(task, "start", addDays(last.sentOn, FOLLOWUP_DAYS), input.today), reason: "no_reply",
          id: JSON.stringify(["reminder", task.planKey, "no_reply"]), explanation: "No reply is recorded since the last reminder. Could you share an update?" }
        if (sent(followup)) followup = undefined
      }
    }
    upcoming.push(...ordered.filter(candidate => candidate.scheduledOn > input.today && !sent(candidate)))
    if (followup && followup.scheduledOn > input.today && !ordered.some(c => c.scheduledOn === followup!.scheduledOn && !sent(c))) upcoming.push(followup)
    // A reached, unsent milestone wins over silence follow-up; never backfill an older stage.
    const selected = latest && !sent(latest) ? latest : followup && followup.scheduledOn <= input.today ? followup : undefined
    if (!selected) continue
    const held = taskLimitReason(input, selected)
    if (held) blocked.push({ nodeId: selected.nodeId, recipientId: selected.recipientId, reason: held })
    else pending.push(selected)
  }
  // One email per person today: the person's tasks pass or wait together, so the ready list is exactly what can be recorded.
  const byRecipient = new Map<string, ReminderCandidate[]>()
  for (const candidate of pending.sort(compareReminders(input.today))) {
    const list = byRecipient.get(candidate.recipientId) ?? []
    if (!list.length) byRecipient.set(candidate.recipientId, list)
    list.push(candidate)
  }
  const nextEmail = (candidate: ReminderCandidate): ReminderCandidate => ({ ...candidate, scheduledOn: addDays(input.today, 1), explanation: "We will include this in the next reminder email." })
  for (const [recipientId, list] of byRecipient) {
    // Tasks left over after today's digest reached the cap wait for tomorrow's email; they never become a second email today.
    const todays = new Map<string, number>()
    for (const d of input.runtime.deliveries) if (d.digestId && d.recipientId === recipientId && d.sentOn === input.today) todays.set(d.digestId, (todays.get(d.digestId) ?? 0) + 1)
    if ([...todays.values()].some(count => count >= DIGEST_TASK_CAP)) { upcoming.push(...list.map(nextEmail)); continue }
    const email = list.slice(0, DIGEST_TASK_CAP), overflow = list.slice(DIGEST_TASK_CAP)
    const held = emailLimitReason(input, recipientId, email.some(candidate => importantReminder(candidate, input.today)))
    if (held) { blocked.push(...list.map(candidate => ({ nodeId: candidate.nodeId, recipientId, reason: held }))); continue }
    ready.push(...email)
    // Beyond the cap, tasks are not dropped: they wait for this person's next email (tomorrow at the earliest).
    upcoming.push(...overflow.map(nextEmail))
  }
  return { ready: ready.sort(compareReminders(input.today)), upcoming: upcoming.sort(candidateOrder), blocked }
}

function deliveryFor(input: ReminderInput, candidate: ReminderCandidate, via: ReminderDelivery["via"], sequence: number, digestId?: string): ReminderDelivery {
  const task = input.tasks.find(value => value.nodeId === candidate.nodeId)!
  const recipient = input.people.find(person => person.id === candidate.recipientId)!
  return {
    id: `reminder-delivery:${sequence}`, candidateId: candidate.id, nodeId: candidate.nodeId, recipientId: candidate.recipientId,
    ownerId: candidate.ownerId, ownerVersion: candidate.ownerVersion, planKey: candidate.planKey, reason: candidate.reason,
    scheduledOn: candidate.scheduledOn, sentOn: input.today, sequence, via, recipientName: recipient.name,
    taskTitle: task.title, eventName: task.eventName, due: task.due,
    ...(candidate.waitingRequestId ? { waitingRequestId: candidate.waitingRequestId } : {}),
    outcome: via === "manual" ? "recorded_by_sender" : "simulated",
    ...(digestId ? { digestId } : {}),
  }
}

/** The caller owns business authorization. This function rechecks readiness, mode and all delivery limits. One delivery without digestId is one email. */
export function confirmReminderDelivery(input: ReminderInput, candidateId: string, via: ReminderDelivery["via"]): ReminderRuntime {
  if (!allowedReminderVia(input.mode).includes(via)) return input.runtime
  const candidate = planReminders(input).ready.find(value => value.id === candidateId)
  if (!candidate) return input.runtime
  const sequence = input.runtime.sequence + 1
  return { ...input.runtime, sequence, deliveries: [...input.runtime.deliveries, deliveryFor(input, candidate, via, sequence)] }
}

/**
 * Record one person digest: `candidateIds` must be exactly that person's ready candidates today, in plan order.
 * All deliveries share the digest id `reminder-digest:<sequence>`; anything else records nothing (null).
 * `messages` (one per candidate, same order) are attached unchanged; the caller validates them.
 */
export function confirmReminderDigest(input: ReminderInput, candidateIds: string[], via: ReminderDelivery["via"], messages?: ReminderMailSnapshot[]): { runtime: ReminderRuntime; digestId: string; deliveries: ReminderDelivery[] } | null {
  if (!allowedReminderVia(input.mode).includes(via) || !Array.isArray(candidateIds) || !candidateIds.length) return null
  if (messages && messages.length !== candidateIds.length) return null
  const ready = planReminders(input).ready
  const first = ready.find(candidate => candidate.id === candidateIds[0])
  if (!first) return null
  const group = ready.filter(candidate => candidate.recipientId === first.recipientId)
  if (group.length !== candidateIds.length || group.some((candidate, index) => candidate.id !== candidateIds[index])) return null
  const digestSequence = input.runtime.sequence + 1, digestId = `reminder-digest:${digestSequence}`
  const deliveries = group.map((candidate, index) => ({
    ...deliveryFor(input, candidate, via, digestSequence + 1 + index, digestId),
    ...(messages ? { message: messages[index] } : {}),
  }))
  return { digestId, deliveries, runtime: { ...input.runtime, sequence: digestSequence + group.length, deliveries: [...input.runtime.deliveries, ...deliveries] } }
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
