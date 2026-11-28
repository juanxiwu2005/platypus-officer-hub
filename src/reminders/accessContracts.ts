import type { Channel } from "../data/types"
import type { ReminderCandidate, ReminderPerson, ReminderTaskFacts, WaitingRequest } from "./contracts"

/** A reusable, scoped local-demo task entry; separate from legacy one-use officer links. */
export interface TaskAccessGrant {
  version: 1
  id: string
  nodeId: string
  ownerId: string
  ownerVersion: number
  recipientId: string
  scope: "owner" | "waiting"
  waitingRequestId?: string
  issuedOn: string
  expiresOn: string
  signature: string
}
export interface TaskAccessUpdate {
  kind: "claim" | "todo" | "working" | "done" | "stuck" | "waiting" | "extension" | "acknowledge" | "provided"
  waitingOn?: string
  waitingOnPersonId?: string | null
  requestedDate?: string
  expectedOn?: string
  reason?: string
}
export interface ReminderMailInput {
  today: string
  facts: ReminderTaskFacts
  recipient: ReminderPerson
  taskUrl: string
  candidate?: ReminderCandidate | null
  request?: WaitingRequest | null
  requesterName?: string
  /** Who signs the email: the president or VP preparing it (reminderSenderName); none for automatic sending. */
  senderName?: string | null
}
export interface ReminderMail {
  subject: string
  /** Plain text, including exactly one task entry URL, no per-status URLs. */
  body: string
  text: string
  taskUrl: string
  recipientId: string
  intendedEmail: string | null
  wordCount: number
  checked: boolean
  source: "rules"
}
export interface ReminderMailSnapshot extends ReminderMail {
  channel: Channel
  preparedOn: string
  accessId: string
}
