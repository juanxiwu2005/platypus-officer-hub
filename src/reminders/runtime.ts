import type { ReminderRuntime } from "./contracts"
import { digestWordBudget, DIGEST_TASK_CAP } from "./policy"

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const string = (v: unknown) => typeof v === "string" && v.length > 0
const integer = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0
const oneOf = (v: unknown, values: string) => typeof v === "string" && values.split("|").includes(v)
const day = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
  && Number.isFinite(Date.parse(`${v}T12:00:00Z`)) && new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v
const nullable = (v: unknown, check: (v: unknown) => boolean) => v === null || check(v)
const fields = (v: Record<string, unknown>, keys: string, check: (v: unknown) => boolean) => keys.split(" ").every(key => check(v[key]))
const status = (v: unknown) => oneOf(v, "unclaimed|accepted|in_progress|waiting|blocked|done")
const message = (v: unknown) => object(v) && fields(v, "subject body text taskUrl recipientId accessId", string)
  && v.source === "rules" && v.checked === true && integer(v.wordCount) && (v.wordCount as number) <= 100
  && oneOf(v.channel, "email|sms|whatsapp") && day(v.preparedOn) && nullable(v.intendedEmail, string)
  && v.text === `${v.subject}\n\n${v.body}`

/** A corrupt or newer saved ledger is retained for recovery, never partially executed or reset. */
export function isReminderRuntime(value: unknown): value is ReminderRuntime {
  if (!object(value) || ![1, 2].includes(value.version as number) || !integer(value.sequence) || !day(value.activatedOn)) return false
  const sequence = value.sequence as number
  if (value.version === 2 && (!integer(value.mailRequiredAfter) || (value.mailRequiredAfter as number) > sequence)) return false
  const ids = new Set<string>(), sequences = new Set<number>()
  const entry = (v: unknown): v is Record<string, unknown> => {
    if (!object(v) || !fields(v, "id nodeId", string) || !integer(v.sequence) || (v.sequence as number) < 1 || (v.sequence as number) > sequence) return false
    if (ids.has(v.id as string) || sequences.has(v.sequence as number)) return false
    ids.add(v.id as string); sequences.add(v.sequence as number)
    return integer(v.ownerVersion)
  }
  if (!Array.isArray(value.updates) || !value.updates.every(v => entry(v)
    && nullable(v.ownerId, string) && string(v.actorId) && day(v.on) && status(v.status) && typeof v.ownerReply === "boolean"
    && (v.waitingRequestId === undefined || string(v.waitingRequestId))
    && (v.waitingResponse === undefined || oneOf(v.waitingResponse, "acknowledged|provided")))) return false
  if (!Array.isArray(value.deliveries) || !value.deliveries.every(v => entry(v)
    && fields(v, "candidateId recipientId ownerId planKey recipientName taskTitle", string)
    && fields(v, "scheduledOn sentOn", day) && nullable(v.eventName, v => typeof v === "string") && nullable(v.due, day)
    && oneOf(v.reason, "start|due|overdue|waiting_on|no_reply|waiting_followup") && oneOf(v.via, "manual|platypus|automatic")
    && v.outcome === (v.via === "manual" ? "recorded_by_sender" : "simulated")
    && (v.waitingRequestId === undefined || string(v.waitingRequestId))
    && (v.digestId === undefined || string(v.digestId))
    && (v.message === undefined ? value.version !== 2 || (v.sequence as number) <= (value.mailRequiredAfter as number) : message(v.message)))) return false
  if (!Array.isArray(value.waitingRequests) || !value.waitingRequests.every(v => entry(v)
    && string(v.ownerId) && nullable(v.recipientId, string) && typeof v.waitingOn === "string"
    && day(v.createdOn) && nullable(v.closedOn, day)
    && (v.expectedOn === undefined || day(v.expectedOn) && oneOf(v.response, "acknowledged|provided"))
    && (v.closeReason === undefined || oneOf(v.closeReason, "resolved|changed|reassigned|completed|unavailable"))
    && (v.response === undefined ? v.respondedOn === undefined && v.responseBy === undefined : oneOf(v.response, "acknowledged|provided") && day(v.respondedOn) && string(v.responseBy)))) return false
  if (!(value.legacyUnresolvedNodeIds === undefined || (Array.isArray(value.legacyUnresolvedNodeIds) && value.legacyUnresolvedNodeIds.every(string)))) return false
  return digestsValid(value, sequence, sequences)
}

/**
 * Optional person digests (older ledgers have none). Each digest is a complete rule-written email whose id
 * `reminder-digest:<n>` uses a ledger sequence of its own; every delivery that names a digest must point to a saved one,
 * for the same person, day and sender, and the digest's tasks are exactly its deliveries in order.
 */
function digestsValid(value: Record<string, unknown>, sequence: number, sequences: Set<number>): boolean {
  const deliveries = value.deliveries as Record<string, unknown>[]
  if (value.digests === undefined) return deliveries.every(d => d.digestId === undefined)
  if (!Array.isArray(value.digests)) return false
  const byId = new Map<string, Record<string, unknown>>()
  for (const v of value.digests as unknown[]) {
    if (!object(v) || v.version !== 1 || !fields(v, "id groupId recipientId recipientName subject body text", string)) return false
    const match = /^reminder-digest:([1-9]\d*)$/.exec(v.id as string), n = match ? Number(match[1]) : NaN
    if (!Number.isSafeInteger(n) || n > sequence || sequences.has(n) || byId.has(v.id as string)) return false
    sequences.add(n)
    if (!oneOf(v.channel, "email|sms|whatsapp") || !fields(v, "preparedOn sentOn", day) || (v.preparedOn as string) > (v.sentOn as string)
      || !oneOf(v.via, "manual|platypus|automatic") || !nullable(v.intendedEmail, string) || v.source !== "rules" || v.checked !== true
      || v.text !== `${v.subject}\n\n${v.body}` || !Array.isArray(v.taskUrls) || !Array.isArray(v.nodeIds)) return false
    const count = (v.taskUrls as unknown[]).length
    if (count < 1 || count > DIGEST_TASK_CAP || (v.nodeIds as unknown[]).length !== count
      || !(v.taskUrls as unknown[]).every(string) || !(v.nodeIds as unknown[]).every(string)
      || !integer(v.wordCount) || (v.wordCount as number) > digestWordBudget(count)) return false
    byId.set(v.id as string, v)
  }
  const members = new Map<string, Record<string, unknown>[]>()
  for (const d of deliveries) {
    if (d.digestId === undefined) continue
    const digest = byId.get(d.digestId as string)
    if (!digest || d.recipientId !== digest.recipientId || d.sentOn !== digest.sentOn || d.via !== digest.via) return false
    members.set(digest.id as string, [...(members.get(digest.id as string) ?? []), d])
  }
  return [...byId.values()].every(digest => {
    const list = (members.get(digest.id as string) ?? []).sort((a, b) => (a.sequence as number) - (b.sequence as number))
    const nodeIds = digest.nodeIds as string[]
    return list.length === nodeIds.length && list.every((d, index) => d.nodeId === nodeIds[index])
  })
}
