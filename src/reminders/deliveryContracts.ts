import type { ReminderMailSnapshot, TaskAccessGrant } from "./accessContracts"
import type { DemoState } from "../data/types"

export interface PreparedReminder { candidateId: string; grant: TaskAccessGrant; message: ReminderMailSnapshot }
export interface ReminderBatch {
  via: "platypus" | "automatic"
  context: { orgId: string; inviteCode: string; demoLinkKey: string }
  entries: PreparedReminder[]
}
export const reminderBatchContext = (s: DemoState): ReminderBatch["context"] => ({ orgId: s.org.id, inviteCode: s.org.inviteCode, demoLinkKey: s.demoLinkKey })
