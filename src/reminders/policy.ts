import { addDays } from "../lib/dates"
import type { ReminderCandidate, ReminderDelivery, WaitingRequest } from "./contracts"

export const FOLLOWUP_DAYS = 2
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
