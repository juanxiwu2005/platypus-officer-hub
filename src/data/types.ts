/**
 * Platypus data model (product plan v1.0, §11). v1.0 keeps all of this in the browser;
 * v1.5 moves the same shapes into Supabase. Dates are ISO strings "YYYY-MM-DD".
 * Rule: dates on nodes are computed by the rule engine (WP1), never written by AI.
 */

/** Canonical functions. Every club role maps to one, so playbooks and cross-club data line up. */
export type RoleFunction =
  | "president"
  | "vice_president"
  | "finance"
  | "programs"
  | "marketing"
  | "outreach"
  | "secretary"
  | "membership"

export type Channel = "whatsapp" | "sms" | "email"

export interface Goal {
  id: string
  label: string
  target: number
  current: number
  unit: string
}

export interface OrgSettings {
  /** Club deadline = official deadline minus this many business days (plan §4, mechanism 1). */
  clubBufferBusinessDays: number
  /** Silence protocol days (SEO Ghost Owner Protocol defaults). */
  silenceProtocol: { nudgeDays: number[]; presidentDay: number; reassignDay: number; retroDay: number }
  /** Max reminders per task (quick answer 1). */
  maxRemindersPerTask: number
  /** "review": AI drafts, a person sends. "auto": v1.5+, email only, internal only. */
  sendMode: "review" | "auto"
  quietHours: { from: string; to: string }
}

export interface Org {
  id: string
  name: string
  school: string
  mission: string
  goals: Goal[]
  settings: OrgSettings
}

export interface Role {
  id: string
  displayName: string
  fn: RoleFunction
  holderId: string | null
}

export interface Person {
  id: string
  name: string
  roleId: string
  email: string
  channels: Channel[]
  remindAt: "morning" | "evening"
  /** ISO dates of Mondays of busy weeks (exams, travel). */
  busyWeeks: string[]
  careerGoal: string
  interests: string
  /** Personal buffer in days. Visible only to the person and used only for scheduling (plan §9). */
  personalBufferDays: number
}

export type EventType = "speaker" | "social" | "workshop" | "meeting" | "fundraiser" | "offcampus"

export interface Event {
  id: string
  name: string
  date: string
  type: EventType
  headcount: number
  venue: "campus" | "offcampus"
  food: "none" | "dining" | "offsite" | "onsite"
  funding: "usg" | "college" | "dues" | "sponsor" | "none"
  speaker: boolean
  goalId: string | null
  playbookId: string
}

export type NodeStatus = "unclaimed" | "accepted" | "in_progress" | "waiting" | "blocked" | "done"
export type Tier = "light" | "medium" | "heavy"

/** Where a step sits in the SEO workflow (OA101 plan, OA102 prepare, OA201 money, then run and close). */
export type Phase = "plan" | "prepare" | "money" | "marketing" | "run" | "close"

/**
 * How the rule engine dates a node (WP1).
 * - rule: an ASU deadline `days` before the event (official deadline). Calendar-day results that land on a
 *   closed day move to the business day before.
 * - target: a club timing from the SEO playbook; positive = before the event, negative = after.
 * - fixed: a standalone task with explicit dates (not tied to an event).
 * Nodes with no anchor get their dates from the steps that depend on them.
 */
export type Anchor =
  | { kind: "rule"; ruleId: string; days: number; unit: "calendar" | "business" }
  | { kind: "target"; days: number; unit: "calendar" | "business"; label: string }
  | { kind: "fixed"; official: string | null; club: string }
  | { kind: "followup"; from: string; days: number; label: string }

/** A node is one step in an event flow, or a standalone task ("executable", plan §6). */
export interface Node {
  id: string
  title: string
  eventId: string | null
  /** Playbook step this node came from, e.g. "usg". Null for standalone tasks. */
  stepKey: string | null
  phase: Phase | null
  /** The canonical function that owns this step (swimlane when nobody owns it yet). */
  fn: RoleFunction
  /** R = one owner. A = approver. C = consulted. I = informed (role ids). */
  ownerId: string | null
  approverRoleId: string | null
  consultedRoleIds: string[]
  informedRoleIds: string[]
  dependsOn: string[]
  tier: Tier
  /** Working days of effort, used for the latest start date. */
  estDays: number
  anchor: Anchor | null
  /** A club deadline set by a person. Moves later steps if needed; never moves the official deadline. */
  clubDeadlineOverride: string | null
  /** The three deadlines below are written only by the rule engine (src/engine). */
  officialDeadline: string | null
  clubDeadline: string | null
  latestStart: string | null
  ruleIds: string[]
  /** unclaimed = sent but not yet accepted with “I've got it” (ownerId may be a proposed owner). */
  status: NodeStatus
  acceptedOn: string | null
  waitingOn: string | null
  draftLink: string | null
  why: string
  /** Where the step comes from, e.g. "OA101 step 20" or "SEO T-14 checklist". */
  source: string
  lastUpdate: string | null
  assignedOn?: string
  completedOn?: string
  recoveryFrom?: string
  ownerVersion?: number
}

export interface Nudge {
  id: string
  nodeId: string
  channel: Channel
  text: string
  sentBy: string
  sentOn: string
  response: NodeStatus | null
}

export interface Contribution {
  personId: string
  nodeId: string
  points: number
  onTime: boolean
  completedOn?: string
}

export interface ExtensionRequest {
  id: string
  nodeId: string
  ownerId: string
  requestedOn: string
  requestedDate: string
  previousDeadline: string | null
  draftLink: string
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  reviewedBy?: string
  reviewedOn?: string
}
export interface Notice {
  id: string
  recipientId: string
  nodeId: string
  kind: "ready" | "delay" | "approval" | "info" | "help" | "protocol" | "claim"
  text: string
  createdOn: string
  read: boolean
}
export interface SilenceCase {
  id: string
  nodeId: string
  ownerId: string
  startedOn: string
  closedOn: string | null
  temporaryOwnerId?: string
}
export interface ProtocolEntry {
  id: string
  caseId: string
  nodeId: string
  day: number
  scheduledOn: string
  recipientIds: string[]
  kind: "reminder" | "private_check" | "suggest_owner" | "recovery"
  text: string
  suggestedOwnerId?: string
  retroNodeId?: string
}
export interface OfficerGrant {
  id: string
  nodeId: string
  ownerId: string
  ownerVersion: number
  issuedOn: string
  expiresOn: string
  signature: string
  usedOn: string | null
}

export interface Contact {
  id: string
  name: string
  organization: string
  relation: string
  lastContact: string | null
  cadenceDays: number
  ownerRoleId: string
  eventIds: string[]
}

export type FundingStage =
  | "budget_request"
  | "budget_approved"
  | "purchase_request"
  | "purchase_approved"
  | "ordered_or_reimbursed"
  | "attendance_submitted"

export interface Funding {
  eventId: string
  source: Event["funding"]
  amount: number
  stage: FundingStage
  spendBy: string | null
}

export interface Rule {
  id: string
  category: "venue" | "food" | "money" | "marketing" | "compliance" | "transition"
  text: string
  limit: string
  sources: { label: string; url: string }[]
  checkedOn: string
  note?: string
}

export interface HandoffSeason {
  id: string
  from: string
  to: string
  roleIds: string[]
}

/** An AI-proposed change. Applied only after a person approves it (plan §8). */
export interface ChangeSet {
  id: string
  sentence: string
  ops: { op: string; [key: string]: unknown }[]
  status: "pending" | "applied" | "rejected"
  reviews?: ("pending" | "applied" | "rejected")[]
  source?: string
}

export interface DemoState {
  schemaVersion: number
  /** The date the demo treats as "today" (simulated clock, WP3). */
  today: string
  viewerId: string
  aiEnabled: boolean
  org: Org
  roles: Role[]
  people: Person[]
  events: Event[]
  nodes: Node[]
  nudges: Nudge[]
  contributions: Contribution[]
  contacts: Contact[]
  funding: Funding[]
  handoff: HandoffSeason | null
  changeSets: ChangeSet[]
  extensionRequests: ExtensionRequest[]
  notifications: Notice[]
  silenceCases: SilenceCase[]
  protocolLog: ProtocolEntry[]
  officerGrants: OfficerGrant[]
  /** Random per-browser demo signing key, generated at runtime; never an API/provider key. */
  demoLinkKey: string
}

