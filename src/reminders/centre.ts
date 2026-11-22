import type { DemoState, NodeStatus, ReminderMode } from "../data/types"
import { canLead } from "../data/permissions"
import { forecastFor } from "../engine/forecast"
import { addDays, daysBetween, fmtLong } from "../lib/dates"
import { buildReminderFacts, buildReminderInput } from "./facts"
import { planReminders } from "./engine"
import { isReminderRuntime } from "./runtime"
import type { ReminderCandidate, ReminderDelivery, ReminderReason } from "./contracts"
import type { ReminderMailSnapshot } from "./accessContracts"
import { planReminderDigests } from "./digest"
import type { ReminderDigestGroup, ReminderDigestSnapshot } from "./digestContracts"

export type CentreRuntimeState = "active" | "legacy" | "invalid"
export interface CentreRow {
  id: string; nodeId: string; eventName: string | null; taskTitle: string
  recipientId: string | null; recipientName: string | null
  ownerId: string | null; ownerVersion: number | null; due: string | null
  reason: ReminderReason | null; explanation: string; risk: boolean; taskAvailable: boolean
  candidateId?: string; scheduledOn?: string; blockedReason?: string
  deliveryId?: string; sentOn?: string; via?: ReminderDelivery["via"] | "legacy"
  outcome?: ReminderDelivery["outcome"]; message?: ReminderMailSnapshot; digestId?: string
  reply?: string; days?: number; legacy?: boolean; sequence?: number
}
export interface ReminderCentre {
  runtimeState: CentreRuntimeState; mode: ReminderMode | null
  needsOk: CentreRow[]; thisWeek: CentreRow[]; sent: CentreRow[]
  replies: CentreRow[]; noReply: CentreRow[]; blocked: CentreRow[]
  approvableCandidateIds: string[]
}
export interface TaskReminderSummary {
  runtimeState: CentreRuntimeState; recipientId: string | null; recipientName: string | null
  explanation: string; blockedReason: string | null; canPrepare: boolean
  candidateId?: string; history: CentreRow[]
}
const BLOCKED = {
  no_owner: "Assign an owner before preparing a reminder.",
  unavailable_recipient: "Choose an available recipient with valid contact details.",
  unresolved_waiting: "Choose who this task is waiting on before preparing a follow-up.",
  task_limit: "This recipient has reached the reminder limit for this task.",
  weekly_limit: "This recipient has reached the weekly reminder limit.",
  weekly_reserved: "The remaining weekly slots are reserved for due and overdue reminders.",
  daily_limit: "This recipient has reached today's two-reminder limit.",
  daily_reserved: "Today's remaining slot is reserved for a due or overdue reminder.",
  already_sent_today: "A reminder for this task and recipient was already recorded today.",
  paused: "This task needs support. Ordinary reminders are paused.",
  legacy_history: "Review earlier reminders before enabling future reminders for this task.",
}
const STATUS: Record<NodeStatus, string> = {
  accepted: "Claimed", unclaimed: "Not claimed", in_progress: "Working on it",
  waiting: "Waiting on", blocked: "Stuck", done: "Done",
}
const name = (s: DemoState, id: string | null) => s.people.find(p => p.id === id)?.name ?? (id ? "Former member" : null)
const currentVersion = (s: DemoState) => isReminderRuntime(s.reminderRuntime) && Number(s.reminderRuntime.version) === 2
const runtimeState = (s: DemoState): CentreRuntimeState => currentVersion(s) ? "active"
  : s.reminderRuntime === undefined || isReminderRuntime(s.reminderRuntime) ? "legacy" : "invalid"
const newest = (a: CentreRow, b: CentreRow) => (b.sentOn ?? "").localeCompare(a.sentOn ?? "")
  || (b.sequence ?? 0) - (a.sequence ?? 0) || b.id.localeCompare(a.id)

/** Presentation only: an upcoming plan never becomes a sent fact. */
export function reminderCentre(state: DemoState): ReminderCentre {
  const status = runtimeState(state), mode = state.org.settings.reminderMode ?? null
  const forecast = forecastFor(state)
  const base = (nodeId: string): CentreRow => {
    const facts = buildReminderFacts(state, nodeId)
    return { id: nodeId, nodeId, eventName: facts?.eventName ?? null, taskTitle: facts?.title ?? "Earlier task",
      recipientId: facts?.ownerId ?? null, recipientName: name(state, facts?.ownerId ?? null),
      ownerId: facts?.ownerId ?? null, ownerVersion: facts?.ownerVersion ?? null, due: facts?.due ?? null,
      reason: null, explanation: "", risk: forecast.nodes[nodeId]?.color === "red", taskAvailable: !!facts }
  }
  const candidateRow = (c: ReminderCandidate): CentreRow => ({ ...base(c.nodeId), id: c.id, candidateId: c.id,
    recipientId: c.recipientId, recipientName: name(state, c.recipientId), reason: c.reason,
    explanation: c.explanation, scheduledOn: c.scheduledOn })
  const sent: CentreRow[] = []
  const runtime = isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime : null
  for (const d of runtime?.deliveries ?? []) sent.push({ ...base(d.nodeId), id: d.id, deliveryId: d.id,
    eventName: d.eventName, taskTitle: d.taskTitle, recipientId: d.recipientId, recipientName: d.recipientName,
    ownerId: d.ownerId, ownerVersion: d.ownerVersion, due: d.due, reason: d.reason,
    explanation: d.waitingRequestId ? "A request for help." : d.reason === "no_reply" ? "A follow-up after no reply." : "Recorded reminder.",
    sentOn: d.sentOn, scheduledOn: d.scheduledOn, via: d.via, outcome: d.outcome, message: d.message, sequence: d.sequence, digestId: d.digestId })
  for (const n of state.nudges) sent.push({ ...base(n.nodeId), id: `legacy:${n.id}`, legacy: true,
    eventName: null, taskTitle: n.message?.subject ?? "Earlier reminder", recipientId: n.message?.recipientId ?? null,
    recipientName: name(state, n.message?.recipientId ?? null), ownerId: null, ownerVersion: null, due: null,
    explanation: n.message ? "Earlier reminder · saved message" : "Earlier reminder · recipient not recorded",
    sentOn: n.sentOn, via: "legacy", message: n.message })
  for (const p of state.protocolLog.filter(p => p.kind === "reminder" && p.recipientIds.length)) sent.push({
    ...base(p.nodeId), id: `legacy:${p.id}`, legacy: true, eventName: null, taskTitle: "Earlier reminder",
    recipientId: null, recipientName: null, ownerId: null, ownerVersion: null, due: null,
    explanation: "Earlier reminder · recipient not recorded", sentOn: p.scheduledOn, via: "legacy",
  })
  const replies: CentreRow[] = [], noReply: CentreRow[] = []
  // A scope has its own recipient, assignment and (for a helper) waiting request.
  const latest = new Map<string, ReminderDelivery>()
  for (const d of runtime?.deliveries ?? []) {
    const key = JSON.stringify([d.nodeId, d.ownerId, d.ownerVersion, d.recipientId, d.waitingRequestId ?? null])
    if (!latest.has(key) || latest.get(key)!.sequence < d.sequence) latest.set(key, d)
  }
  for (const d of latest.values()) {
    const row = sent.find(x => x.deliveryId === d.id)!
    const ownerReply = runtime!.updates.filter(u => u.nodeId === d.nodeId && u.ownerId === d.ownerId
      && u.ownerVersion === d.ownerVersion && u.ownerReply && u.actorId === d.ownerId
      && u.sequence > d.sequence && u.on <= state.today).sort((a, b) => b.sequence - a.sequence)[0]
    const helperReply = d.waitingRequestId ? runtime!.updates.filter(u => u.waitingRequestId === d.waitingRequestId
      && u.actorId === d.recipientId && u.waitingResponse && u.sequence > d.sequence && u.on <= state.today).sort((a, b) => b.sequence - a.sequence)[0] : null
    const reply = d.waitingRequestId ? helperReply : ownerReply
    if (reply) {
      replies.push({ ...row, id: `reply:${reply.id}`, sequence: reply.sequence, reply: reply.waitingResponse === "provided" ? "Input provided"
        : reply.waitingResponse === "acknowledged" ? "I'll follow up" : STATUS[reply.status] })
      continue
    }
    const task = state.nodes.find(n => n.id === d.nodeId)
    const request = d.waitingRequestId ? runtime!.waitingRequests.find(w => w.id === d.waitingRequestId) : null
    const sameAssignment = task?.ownerId === d.ownerId && (task.ownerVersion ?? 0) === d.ownerVersion
    if (!sameAssignment || task?.status === "done" || (d.waitingRequestId && (!request || request.closedOn || request.respondedOn))) continue
    const days = daysBetween(d.sentOn, state.today)
    if (days >= 2) noReply.push({ ...row, id: `wait:${d.id}`, days })
  }
  const plan = status === "active" ? planReminders(buildReminderInput(state, runtime!)) : null
  const blocked = (plan?.blocked ?? []).map(b => {
    const row = base(b.nodeId)
    const recipientId = b.recipientId ?? (b.reason === "legacy_history" ? row.ownerId : null)
    return { ...row, id: `blocked:${b.nodeId}`, recipientId, recipientName: name(state, recipientId),
      explanation: BLOCKED[b.reason], blockedReason: b.reason }
  })
  const weekEnd = addDays(state.today, 7), future = new Map<string, CentreRow>()
  for (const c of plan?.upcoming ?? []) if (c.scheduledOn > state.today && c.scheduledOn <= weekEnd && !future.has(c.nodeId)) future.set(c.nodeId, candidateRow(c))
  const riskFirst = (a: CentreRow, b: CentreRow) => Number(b.risk) - Number(a.risk)
    || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.id.localeCompare(b.id)
  // The engine's priority order also governs the review batch; risk is explanatory, not a different send order.
  const needsOk = (plan?.ready ?? []).map(candidateRow)
  for (const row of noReply) {
    const ready = needsOk.find(x => x.nodeId === row.nodeId && x.recipientId === row.recipientId)
    const block = blocked.find(x => x.nodeId === row.nodeId)
    row.candidateId = ready?.candidateId
    const next = plan?.upcoming.filter(c => c.nodeId === row.nodeId && c.recipientId === row.recipientId).sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))[0]
    row.blockedReason = block?.explanation ?? (!ready ? next ? `Next check: ${fmtLong(next.scheduledOn)}. You can review the task now.` : "No further automatic follow-up is planned. Review the task to decide the next step." : undefined)
  }
  return { runtimeState: status, mode, needsOk, thisWeek: [...future.values()].sort(riskFirst), sent: sent.sort(newest),
    replies: replies.sort(newest), noReply: noReply.sort(riskFirst), blocked,
    approvableCandidateIds: mode === "review_then_auto" && canLead(state) ? needsOk.map(x => x.candidateId!) : [] }
}

export function taskReminderSummary(state: DemoState, nodeId: string): TaskReminderSummary {
  const centre = reminderCentre(state), node = state.nodes.find(n => n.id === nodeId)
  const candidate = centre.needsOk.find(x => x.nodeId === nodeId)
  const blocked = centre.blocked.find(x => x.nodeId === nodeId)
  const recipientId = candidate?.recipientId ?? (node?.status === "waiting" ? node.waitingOnPersonId ?? null : node?.ownerId ?? null)
  const request = isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime.waitingRequests.find(w => w.nodeId === nodeId
    && !w.closedOn && w.ownerId === node?.ownerId && w.ownerVersion === (node?.ownerVersion ?? 0)) : null
  const waitingReply = request?.response === "provided" ? "The requested input has been provided."
    : request?.response === "acknowledged" ? "The selected person has agreed to follow up. Input is still pending." : null
  let explanation = candidate?.explanation ?? blocked?.explanation ?? (node?.status === "done" ? "This task is complete. No reminder is needed."
    : node?.status === "in_progress" ? "Work has started. We will check for completion when due."
    : node?.status === "waiting" ? waitingReply ?? "Ordinary owner reminders are paused while waiting for input."
    : "No reminder is due yet for this task.")
  const blockedReason = centre.runtimeState === "invalid" ? "The saved reminder plan needs review before it can run."
    : centre.runtimeState === "legacy" ? "Enable updated reminders in the reminder centre."
    : !node ? "This task is unavailable." : blocked?.explanation ?? (!candidate ? explanation : null)
  if (centre.runtimeState !== "active") explanation = blockedReason!
  return { runtimeState: centre.runtimeState, recipientId, recipientName: name(state, recipientId), explanation,
    blockedReason, canPrepare: centre.runtimeState === "active" && !!candidate && canLead(state),
    candidateId: candidate?.candidateId, history: centre.sent.filter(x => x.nodeId === nodeId) }
}

/* ---- Person digests (concept F, 2026-11-19): one email per person per day. Presentation only. ---- */
export type ChipTone = "late" | "warn" | "info"
export interface DigestTaskLine { id: string; nodeId: string; title: string; chip: string | null; tone: ChipTone; risk: boolean }
export interface DigestPerson {
  recipientId: string; name: string; initials: string
  /** Today's unsent email for this person, or null when only a recorded email remains. */
  group: ReminderDigestGroup | null
  /** The email recorded for this person today, if any. */
  sent: ReminderDigestSnapshot | null
  tasks: DigestTaskLine[]
  /** Not-done tasks this person owns that are not in today's email. */
  otherOpen: number
}
export interface FixRow { id: string; nodeId: string; title: string; problem: string; tone: ChipTone; action: string; legacy: boolean; taskAvailable: boolean }
export interface DigestCentre {
  groups: ReminderDigestGroup[]
  /** Recorded today first, then today's emails in engine order. One entry per email. */
  people: DigestPerson[]
  tasks: number; sentToday: number; sentWeek: number
  fix: FixRow[]
  nextCheck: { on: string; count: number } | null
  /** Tasks held by a per-person email limit; they go out in that person's next email. */
  held: number
}
const FIX: Record<string, [string, string]> = {
  no_owner: ["No owner", "Assign"],
  unresolved_waiting: ["Pick who it waits on", "Choose person"],
  paused: ["Stuck", "Help"],
  unavailable_recipient: ["No valid email", "Review"],
  legacy_history: ["Check earlier reminders", "I checked · allow future reminders"],
  task_limit: ["Reminder limit reached", "Review"],
}
/** Not a problem to fix: the task was already in today's email, or it waits for this person's next email (email limits). */
const NOT_A_PROBLEM = new Set(["already_sent_today"])
const NEXT_EMAIL = new Set(["daily_limit", "daily_reserved", "weekly_limit", "weekly_reserved"])
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?"
export const firstName = (name: string) => name.split(/\s+/)[0] || name

/** One short reason per task line. Dates and day counts come from the rule engine's candidate. */
export function reasonChip(c: ReminderCandidate, today: string): { label: string; tone: ChipTone } {
  if (c.reason === "waiting_on" || c.reason === "waiting_followup") return { label: "Waiting on you", tone: "info" }
  if (c.reason === "no_reply") return { label: "Follow-up", tone: "info" }
  if (c.overdueDays > 0) return { label: `${c.overdueDays} day${c.overdueDays === 1 ? "" : "s"} overdue`, tone: "late" }
  if (c.reason === "overdue") return { label: "Overdue", tone: "late" }
  if (c.reason === "due") return { label: "Due today", tone: "warn" }
  return { label: c.scheduledOn < today ? "Start passed" : "Starts today", tone: "warn" }
}

export function openTasksOf(state: DemoState, personId: string) {
  return state.nodes.filter(n => n.ownerId === personId && n.status !== "done")
}

export function digestCentre(state: DemoState, centre: ReminderCentre = reminderCentre(state)): DigestCentre {
  const today = state.today
  const plan = centre.runtimeState === "active" ? planReminderDigests(state) : { groups: [], blocked: [], upcoming: [] }
  const runtime = isReminderRuntime(state.reminderRuntime) ? state.reminderRuntime : null
  const forecast = forecastFor(state)
  const sentToday = (runtime?.digests ?? []).filter(d => d.sentOn === today)
  const latestSent = new Map<string, ReminderDigestSnapshot>()
  for (const d of sentToday) latestSent.set(d.recipientId, d)
  const titleOf = (nodeId: string) => state.nodes.find(n => n.id === nodeId)?.title
  const person = (recipientId: string, fallback: string, group: ReminderDigestGroup | null): DigestPerson => {
    const name = state.people.find(p => p.id === recipientId)?.name ?? fallback
    const sent = latestSent.get(recipientId) ?? null
    const tasks: DigestTaskLine[] = group
      ? group.candidates.map(c => {
        const chip = reasonChip(c, today)
        return { id: c.id, nodeId: c.nodeId, title: titleOf(c.nodeId) ?? "Earlier task", chip: chip.label, tone: chip.tone, risk: forecast.nodes[c.nodeId]?.color === "red" }
      })
      : (sent?.nodeIds ?? []).map(nodeId => ({ id: `${sent!.id}:${nodeId}`, nodeId, chip: null, tone: "info" as const, risk: false,
        title: runtime?.deliveries.find(d => d.digestId === sent!.id && d.nodeId === nodeId)?.taskTitle ?? titleOf(nodeId) ?? "Earlier task" }))
    const inEmail = new Set(tasks.map(t => t.nodeId))
    return { recipientId, name, initials: initials(name), group, sent, tasks,
      otherOpen: openTasksOf(state, recipientId).filter(n => !inEmail.has(n.id)).length }
  }
  const grouped = new Set(plan.groups.map(g => g.recipientId))
  const people = [
    ...[...latestSent.values()].filter(d => !grouped.has(d.recipientId)).map(d => person(d.recipientId, d.recipientName, null)),
    ...plan.groups.map(g => person(g.recipientId, g.recipientName, g)),
  ]
  const held = new Set(centre.blocked.filter(b => NEXT_EMAIL.has(b.blockedReason ?? "")).map(b => b.nodeId)).size
  const fix = centre.blocked.filter(b => !NOT_A_PROBLEM.has(b.blockedReason ?? "") && !NEXT_EMAIL.has(b.blockedReason ?? "")).map(b => {
    const [problem, action] = FIX[b.blockedReason ?? ""] ?? ["Review this task", "Review task"]
    const tone: ChipTone = b.blockedReason === "paused" || b.blockedReason === "unavailable_recipient" ? "late" : "warn"
    return { id: b.id, nodeId: b.nodeId, title: b.taskTitle, problem, tone, action, legacy: b.blockedReason === "legacy_history", taskAvailable: b.taskAvailable }
  })
  // B3: a task already in today's email is not listed again as "coming up".
  const todayNodes = new Set(plan.groups.flatMap(g => g.candidates.map(c => c.nodeId)))
  const weekEnd = addDays(today, 7)
  const later = plan.upcoming.filter(c => c.scheduledOn > today && c.scheduledOn <= weekEnd && !todayNodes.has(c.nodeId))
  const on = later.map(c => c.scheduledOn).sort()[0]
  const weekStart = addDays(today, -6)
  const inWeek = (on?: string) => !!on && on >= weekStart && on <= today
  const sentWeek = (runtime?.digests ?? []).filter(d => inWeek(d.sentOn)).length
    + centre.sent.filter(x => !x.digestId && !x.legacy && inWeek(x.sentOn)).length
  return { groups: plan.groups, people, tasks: plan.groups.reduce((n, g) => n + g.candidates.length, 0), sentToday: sentToday.length, sentWeek, fix,
    nextCheck: on ? { on, count: new Set(later.map(c => c.nodeId)).size } : null, held }
}
