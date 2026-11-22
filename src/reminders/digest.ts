import type { Action } from "../data/store"
import type { DemoState } from "../data/types"
import { canLead } from "../data/permissions"
import type { DigestRecordResult, PreparedDigest, ReminderDigestGroup, ReminderDigestPlan, ReminderDigestSnapshot } from "./digestContracts"
import type { ReminderCandidate, ReminderDelivery } from "./contracts"
import type { TaskAccessGrant } from "./accessContracts"
import type { PreparedReminder, ReminderBatch } from "./deliveryContracts"
import { reminderBatchContext } from "./deliveryContracts"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { confirmReminderDigest, planReminders } from "./engine"
import { allowedReminderVia, importantReminder } from "./policy"
import { isReminderRuntime } from "./runtime"
import { buildReminderDigestMail, buildReminderMail } from "./mail"
import { validatedReminderMessage } from "./message"
import { makeTaskAccessGrant, taskAccessIssueValid, taskAccessToken, taskAccessUrl, usableTaskAccessGrant, verifyTaskAccessGrant } from "./taskAccess"

type Store = { getState: () => DemoState; tryDispatch: (a: Action) => boolean }
export type DigestVia = ReminderDelivery["via"]
/** The store action that records person digests (one action for any number of groups; each group all-or-nothing). */
export interface ReminderDigestBatch { via: DigestVia; context: ReminderBatch["context"]; digests: PreparedDigest[] }

const v2 = (s: DemoState): s is DemoState & { reminderRuntime: NonNullable<DemoState["reminderRuntime"]> } =>
  isReminderRuntime(s.reminderRuntime) && s.reminderRuntime.version === 2
const CHANGED = "This email changed. Please review the latest plan."

/**
 * Today's emails: the engine's ready list (already limit-checked per email) grouped by recipient in priority order.
 * Every group here can be recorded today as one email.
 */
export function planReminderDigests(state: DemoState): ReminderDigestPlan {
  if (!v2(state)) return { groups: [], blocked: [], upcoming: [] }
  const plan = planReminders(buildReminderInput(state, state.reminderRuntime))
  const people = new Map(reminderPeople(state).map(p => [p.id, p]))
  const order: string[] = [], byRecipient = new Map<string, ReminderCandidate[]>()
  for (const c of plan.ready) {
    if (!byRecipient.has(c.recipientId)) { byRecipient.set(c.recipientId, []); order.push(c.recipientId) }
    byRecipient.get(c.recipientId)!.push(c)
  }
  const groups: ReminderDigestGroup[] = order.map(recipientId => {
    const candidates = byRecipient.get(recipientId)!
    return { id: JSON.stringify(["digest", recipientId, state.today, ...candidates.map(c => c.id)]), recipientId,
      recipientName: people.get(recipientId)?.name ?? "Former member", candidates,
      important: candidates.some(c => importantReminder(c, state.today)) }
  })
  return { groups, blocked: plan.blocked, upcoming: plan.upcoming }
}

/** The combined email for a group, built only from saved facts and the given per-task entry URLs (same order). */
function digestFor(s: DemoState, group: ReminderDigestGroup, taskUrls: string[]): PreparedDigest["digest"] | null {
  if (!v2(s) || taskUrls.length !== group.candidates.length) return null
  const people = reminderPeople(s), recipient = people.find(p => p.id === group.recipientId)
  if (!recipient) return null
  const items = []
  for (const [index, candidate] of group.candidates.entries()) {
    const facts = buildReminderFacts(s, candidate.nodeId)
    if (!facts) return null
    const request = candidate.waitingRequestId ? s.reminderRuntime.waitingRequests.find(r => r.id === candidate.waitingRequestId) : undefined
    items.push({ facts, candidate, request, requesterName: people.find(p => p.id === facts.ownerId)?.name, taskUrl: taskUrls[index] })
  }
  const mail = buildReminderDigestMail({ today: s.today, recipient, items })
  if (!mail.checked) return null
  return { version: 1, groupId: group.id, recipientId: recipient.id, recipientName: recipient.name, intendedEmail: mail.intendedEmail,
    channel: "email", preparedOn: s.today, subject: mail.subject, body: mail.body, text: mail.text, taskUrls: mail.taskUrls,
    nodeIds: mail.nodeIds, wordCount: mail.wordCount, checked: true, source: "rules" }
}
const DIGEST_KEYS = ["version", "groupId", "recipientId", "recipientName", "intendedEmail", "channel", "preparedOn", "subject", "body", "text", "taskUrls", "nodeIds", "wordCount", "checked", "source"] as const
const canonical = (d: unknown) => {
  if (!d || typeof d !== "object") return null
  const value = d as Record<string, unknown>
  return Object.keys(value).length === DIGEST_KEYS.length ? JSON.stringify(DIGEST_KEYS.map(key => value[key])) : null
}

async function prepare(store: Store, groupId: string, origin: string, via: DigestVia, persist: boolean, isCurrent: () => boolean): Promise<PreparedDigest | { error: string }> {
  const start = store.getState()
  if (!v2(start)) return { error: "Enable the updated reminder plan first." }
  if (!allowedReminderVia(start.org.settings.reminderMode).includes(via)) return { error: "This sending choice does not match the club's reminder setting." }
  if (via !== "automatic" && !canLead(start)) return { error: "Only the president or vice president can prepare reminders." }
  const group = planReminderDigests(start).groups.find(g => g.id === groupId)
  if (!group) return { error: CHANGED }
  const grants: TaskAccessGrant[] = []
  try {
    for (const candidate of group.candidates) {
      const state = persist ? store.getState() : start
      const grant = await makeTaskAccessGrant(state, candidate.nodeId, candidate.waitingRequestId, via === "automatic")
      if (!isCurrent()) return { error: CHANGED }
      // Save the link before any draft is opened, so a manually sent email always points to a working task entry.
      if (persist && !usableTaskAccessGrant(store.getState(), taskAccessToken(grant))
        && !store.tryDispatch({ type: "issueTaskAccessGrant", grant })) return { error: "Could not save the task links in this browser. Restore saving and try again." }
      grants.push(grant)
    }
  } catch { return { error: "Could not prepare the task links for this email. Please try again." } }
  const state = persist ? store.getState() : start
  if (!v2(state) || !planReminderDigests(state).groups.some(g => g.id === groupId)) return { error: CHANGED }
  const known = new Set((state.taskAccessGrants ?? []).map(g => g?.id))
  const withGrants = { ...state, taskAccessGrants: [...(state.taskAccessGrants ?? []), ...grants.filter(g => !known.has(g.id))] }
  const people = reminderPeople(state), recipient = people.find(p => p.id === group.recipientId)
  const entries: PreparedReminder[] = []
  for (const [index, candidate] of group.candidates.entries()) {
    const grant = grants[index], facts = buildReminderFacts(state, candidate.nodeId)
    if (!facts || !recipient || !await verifyTaskAccessGrant(withGrants, taskAccessToken(grant))) return { error: "Could not prepare the task links for this email. Please try again." }
    const request = candidate.waitingRequestId ? state.reminderRuntime.waitingRequests.find(r => r.id === candidate.waitingRequestId) : undefined
    const mail = buildReminderMail({ today: state.today, facts, recipient, candidate, request, requesterName: people.find(p => p.id === facts.ownerId)?.name, taskUrl: taskAccessUrl(origin, grant, facts.eventId) })
    if (!mail.checked) return { error: "Review the task wording or details before preparing this email." }
    entries.push({ candidateId: candidate.id, grant, message: { ...mail, channel: "email", preparedOn: state.today, accessId: grant.id } })
  }
  if (!isCurrent()) return { error: CHANGED }
  const digest = digestFor(withGrants, group, entries.map(e => e.message.taskUrl))
  if (!digest) return { error: "Review the task wording or details before preparing this email." }
  return { groupId, recipientId: group.recipientId, entries, digest }
}

/**
 * Issue (and save) the task links for one group and build its per-task and combined email.
 * Links are saved now for "manual" and "platypus" (a lead is preparing it, so a Gmail draft or preview link works);
 * for "automatic" they are carried in the record action instead, because nobody is there to issue them.
 */
export async function prepareReminderDigest(store: Store, groupId: string, origin: string, via: DigestVia): Promise<PreparedDigest | { error: string }> {
  return prepare(store, groupId, origin, via, via !== "automatic", () => true)
}

function record(store: Store, prepared: PreparedDigest[], via: DigestVia, context: ReminderBatch["context"]): DigestRecordResult {
  const ids = [...new Set(prepared.map(p => p?.groupId).filter((id): id is string => typeof id === "string"))]
  if (!prepared.length) return { recordedGroupIds: [], failedGroupIds: [], error: "No emails are ready to record." }
  const before = store.getState()
  const previous = new Set(v2(before) ? (before.reminderRuntime.digests ?? []).map(d => d.id) : [])
  const saved = store.tryDispatch({ type: "recordReminderDigests", via, context, digests: prepared })
  const after = store.getState()
  const added = saved && v2(after) ? (after.reminderRuntime.digests ?? []).filter(d => !previous.has(d.id)) : []
  const recordedGroupIds = ids.filter(id => added.some(d => d.groupId === id))
  const failedGroupIds = ids.filter(id => !recordedGroupIds.includes(id))
  return { recordedGroupIds, failedGroupIds, error: !failedGroupIds.length ? null
    : saved ? "Some emails changed or reached a limit. Only the saved records are shown."
    : "These emails were not recorded. Check saving and the latest plan, then try again." }
}

/** Record prepared groups in one store action. Each group is all-or-nothing. */
export function recordReminderDigests(store: Store, prepared: PreparedDigest[], via: DigestVia): DigestRecordResult {
  return record(store, Array.isArray(prepared) ? prepared : [], via, reminderBatchContext(store.getState()))
}

/** Prepare and record several groups ("Send all", automatic mode): prepare everything first, then one dispatch. */
export async function sendReminderDigests(store: Store, groupIds: string[], origin: string, via: "platypus" | "automatic", isCurrent: () => boolean = () => true): Promise<DigestRecordResult> {
  const requested = [...new Set(groupIds)]
  const failed = (error: string): DigestRecordResult => ({ recordedGroupIds: [], failedGroupIds: requested, error })
  const state = store.getState()
  if (!v2(state)) return failed("Enable the updated reminder plan first.")
  const context = reminderBatchContext(state), prepared: PreparedDigest[] = []
  for (const groupId of requested.slice(0, 100)) {
    if (!isCurrent()) return failed("The reminder preparation changed. Please review the latest plan.")
    const result = await prepare(store, groupId, origin, via, false, isCurrent)
    if ("groupId" in result) prepared.push(result)
  }
  if (!isCurrent()) return failed("The reminder preparation changed. Please review the latest plan.")
  if (!prepared.length) return failed("These emails were not recorded. Check saving and the latest plan, then try again.")
  const result = record(store, prepared, via, context)
  const failedGroupIds = requested.filter(id => !result.recordedGroupIds.includes(id))
  return { recordedGroupIds: result.recordedGroupIds, failedGroupIds, error: failedGroupIds.length ? result.error ?? "Some emails changed or reached a limit. Only the saved records are shown." : null }
}

/**
 * Reducer for `recordReminderDigests`. Rechecks everything against the current state (context, mode and sender,
 * lead rights, each grant, each per-task message and the rebuilt combined email). Each group is all-or-nothing:
 * every task delivery is recorded with one shared digestId plus one saved digest, or nothing for that group.
 */
export function applyReminderDigests(s: DemoState, batch: ReminderDigestBatch): DemoState {
  if (!v2(s) || !batch || !Array.isArray(batch.digests)) return s
  if (JSON.stringify(batch.context) !== JSON.stringify(reminderBatchContext(s))) return s
  if (!allowedReminderVia(s.org.settings.reminderMode).includes(batch.via) || (batch.via !== "automatic" && !canLead(s))) return s
  if (s.taskAccessGrants !== undefined && !Array.isArray(s.taskAccessGrants)) return s
  let next: DemoState = s
  for (const prepared of batch.digests.slice(0, 100)) {
    try { next = recordGroup(next, prepared, batch.via) ?? next }
    catch { /* A stale or malformed group cannot abort or partly record the others. */ }
  }
  return next
}

function recordGroup(s: DemoState, prepared: PreparedDigest, via: DigestVia): DemoState | null {
  if (!v2(s) || !prepared || typeof prepared !== "object") return null
  const group = planReminderDigests(s).groups.find(g => g.id === prepared.groupId)
  if (!group || prepared.recipientId !== group.recipientId || !Array.isArray(prepared.entries) || prepared.entries.length !== group.candidates.length) return null
  let working: DemoState = s
  const messages = []
  for (const [index, candidate] of group.candidates.entries()) {
    const entry = prepared.entries[index]
    if (!entry || entry.candidateId !== candidate.id || !entry.grant) return null
    if (!usableTaskAccessGrant(working, taskAccessToken(entry.grant))) {
      if (!taskAccessIssueValid(working, entry.grant, via === "automatic") || working.taskAccessGrants?.some(g => g?.id === entry.grant.id)) return null
      working = { ...working, taskAccessGrants: [...(working.taskAccessGrants ?? []), entry.grant] }
    }
    const message = validatedReminderMessage(working, entry.message, candidate.nodeId, candidate.id)
    if (!message || message.channel !== "email" || message.accessId !== entry.grant.id) return null
    messages.push(message)
  }
  const expected = digestFor(working, group, messages.map(m => m.taskUrl))
  if (!expected || canonical(expected) === null || canonical(expected) !== canonical(prepared.digest)) return null
  if (!v2(working)) return null
  const confirmed = confirmReminderDigest(buildReminderInput(working, working.reminderRuntime), group.candidates.map(c => c.id), via, messages)
  if (!confirmed) return null
  const snapshot: ReminderDigestSnapshot = { ...expected, id: confirmed.digestId, sentOn: s.today, via }
  const runtime = { ...confirmed.runtime, digests: [...(confirmed.runtime.digests ?? []), snapshot] }
  return isReminderRuntime(runtime) ? { ...working, reminderRuntime: runtime } : null
}
