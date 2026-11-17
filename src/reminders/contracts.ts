import type { Channel, DemoState, NodeStatus, ReminderMode } from "../data/types"

/** Versioned, rule-only reminder runtime. No wall clock, AI calls or external sends. */
export interface ReminderPerson { id: string; name: string; email: string; active: boolean; lead: boolean; channel: Channel }
export interface TaskActionLink { label: string; url: string; explanation: string }
export interface ReminderTaskFacts {
  nodeId: string
  eventId: string | null
  eventName: string | null
  eventDate: string | null
  title: string
  requirement: string
  completionCriteria?: string | null
  importance: string
  ownerId: string | null
  ownerVersion: number
  status: NodeStatus
  due: string | null
  startOn: string | null
  waitingOn: string | null
  waitingOnPersonId: string | null
  actionLink: TaskActionLink | null
  source: string
  /** Only ownership and rule-engine dates: a title edit must not restart the plan. */
  planKey: string
}
export type ReminderReason = "start" | "due" | "overdue" | "waiting_on"
export interface ReminderUpdate {
  waitingRequestId?: string
  waitingResponse?: "acknowledged" | "provided"
  id: string
  sequence: number
  nodeId: string
  ownerId: string | null
  ownerVersion: number
  actorId: string
  on: string
  status: NodeStatus
  /** Only the actual owner's explicit task action is an owner reply. */
  ownerReply: boolean
}
export interface WaitingRequest {
  id: string
  nodeId: string
  ownerId: string
  ownerVersion: number
  recipientId: string | null
  waitingOn: string
  createdOn: string
  sequence: number
  closedOn: string | null
  closeReason?: "resolved" | "changed" | "reassigned" | "completed" | "unavailable"
  response?: "acknowledged" | "provided"
  respondedOn?: string
  responseBy?: string
}
export interface ReminderDelivery {
  message?: import("./accessContracts").ReminderMailSnapshot
  id: string
  candidateId: string
  nodeId: string
  recipientId: string
  ownerId: string
  ownerVersion: number
  planKey: string
  reason: ReminderReason
  scheduledOn: string
  sentOn: string
  sequence: number
  via: "manual" | "platypus" | "automatic"
  /** immutable historical snapshots; never filled from the next owner */
  recipientName: string
  taskTitle: string
  eventName: string | null
  due: string | null
  waitingRequestId?: string
  /** Demo outcomes are explicit, never a claim of external delivery. */
  outcome: "recorded_by_sender" | "simulated"
}
export interface ReminderRuntime {
  version: 1 | 2
  /** Earlier deliveries are preserved on upgrade; all later deliveries require a complete mail snapshot. */
  mailRequiredAfter?: number
  activatedOn: string
  sequence: number
  updates: ReminderUpdate[]
  deliveries: ReminderDelivery[]
  waitingRequests: WaitingRequest[]
  /** Old sends without recipient/assignment snapshots need review; never guess their ownership. */
  legacyUnresolvedNodeIds?: string[]
}
export interface ReminderInput {
  today: string
  mode: ReminderMode | null
  maxPerTask: number
  people: ReminderPerson[]
  tasks: ReminderTaskFacts[]
  runtime: ReminderRuntime
}
export interface ReminderCandidate {
  id: string
  nodeId: string
  ownerId: string
  ownerVersion: number
  recipientId: string
  planKey: string
  reason: ReminderReason
  scheduledOn: string
  due: string | null
  overdueDays: number
  /** A rule-written sentence; start date stays internal, due is the prominent date. */
  explanation: string
  waitingRequestId?: string
}
export interface BlockedReminder { nodeId: string; reason: "no_owner" | "unavailable_recipient" | "unresolved_waiting" | "task_limit" | "weekly_limit" | "already_sent_today" | "paused" | "legacy_history"; recipientId?: string }
export interface ReminderPlan { ready: ReminderCandidate[]; upcoming: ReminderCandidate[]; blocked: BlockedReminder[] }
export interface ReminderTransition {
  today: string
  actorId: string
  before: ReminderTaskFacts[]
  after: ReminderTaskFacts[]
  runtime: ReminderRuntime
  /** Explicit claim/reply/board actions, including a same-day same-status answer. */
  updatedNodeIds?: string[]
}

export type ReminderEnabledState = DemoState & { reminderRuntime: ReminderRuntime }
