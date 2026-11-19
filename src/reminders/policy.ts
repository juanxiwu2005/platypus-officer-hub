import { addDays } from "../lib/dates"
import type { ReminderCandidate, ReminderDelivery, WaitingRequest } from "./contracts"

export const FOLLOWUP_DAYS = 2
/**
 * Person digest (2026-11-19): one recipient's ready reminders on one day are ONE email.
 * At most this many tasks go into one email; the rest wait for the next email (listed in `upcoming` for tomorrow).
 */
export const DIGEST_TASK_CAP = 8
/**
 * Word budget of a digest body: greeting, intro and closing take at most 32 words, and each item at most 47
 * (number, title ≤12 words, activity ≤8, "Task due: <date>", reason line ≤18, "Open task: <url>").
 * The builder cuts to these sizes, so a rule-built digest always fits; the checker rejects anything longer.
 */
export const digestWordBudget = (items: number) => 40 + 48 * items
/** Weekly and daily limits count emails: a person digest is one email, an older single reminder is its own email. */
export const deliveryEmailKey = (value: Pick<ReminderDelivery, "id" | "digestId">) => value.digestId ?? value.id
/** Which `via` each sending choice allows (unchanged from confirmReminderDelivery). */
export const allowedReminderVia = (mode: string | null | undefined): ReminderDelivery["via"][] =>
  mode === "auto_email" ? ["automatic", "platypus"] : mode === "review_then_auto" ? ["platypus"] : ["manual"]
export const validReminderDay = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
/** Old acknowledgements receive a deterministic default without rewriting their history. */
export const expectedInputOn = (request: WaitingRequest) => request.expectedOn ?? addDays(request.respondedOn ?? request.createdOn, FOLLOWUP_DAYS)
export const isMilestone = (reason: string) => ["start", "due", "overdue"].includes(reason)
export const importantReminder = (value: Pick<ReminderCandidate, "reason" | "due">, on: string) => value.reason === "due" || value.reason === "overdue" || !!value.due && value.due < on
export const importantDelivery = (value: ReminderDelivery) => importantReminder(value, value.sentOn)
export const reminderPriority = (value: ReminderCandidate, today: string) => value.reason === "overdue" ? 0 : value.reason === "due" ? 1 : importantReminder(value, today) ? 2 : value.reason === "start" ? 3 : 4
export const compareReminders = (today: string) => (a: ReminderCandidate, b: ReminderCandidate) => reminderPriority(a, today) - reminderPriority(b, today)
  || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.scheduledOn.localeCompare(b.scheduledOn)
  || a.nodeId.localeCompare(b.nodeId) || a.recipientId.localeCompare(b.recipientId) || a.id.localeCompare(b.id)
