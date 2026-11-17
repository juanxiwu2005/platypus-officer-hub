import type { ReminderRuntime } from "./contracts"

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
  if (!object(value) || value.version !== 1 || !integer(value.sequence) || !day(value.activatedOn)) return false
  const sequence = value.sequence as number
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
    && oneOf(v.reason, "start|due|overdue|waiting_on") && oneOf(v.via, "manual|platypus|automatic")
    && v.outcome === (v.via === "manual" ? "recorded_by_sender" : "simulated")
    && (v.waitingRequestId === undefined || string(v.waitingRequestId))
    && (v.message === undefined || message(v.message)))) return false
  if (!Array.isArray(value.waitingRequests) || !value.waitingRequests.every(v => entry(v)
    && string(v.ownerId) && nullable(v.recipientId, string) && typeof v.waitingOn === "string"
    && day(v.createdOn) && nullable(v.closedOn, day)
    && (v.closeReason === undefined || oneOf(v.closeReason, "resolved|changed|reassigned|completed|unavailable"))
    && (v.response === undefined ? v.respondedOn === undefined && v.responseBy === undefined : oneOf(v.response, "acknowledged|provided") && day(v.respondedOn) && string(v.responseBy)))) return false
  return value.legacyUnresolvedNodeIds === undefined || (Array.isArray(value.legacyUnresolvedNodeIds) && value.legacyUnresolvedNodeIds.every(string))
}
