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
  | "advisor"

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
  /** M2b (Juanxi, 2026-10-27): a new task is due this many days from today unless someone picks a date. Default 5. */
  taskDueDays?: number
  /** Who may create events: the president and VP (default), everyone, or the leads plus chosen officers. */
  eventCreators?: "leads" | "everyone" | "chosen"
  eventCreatorIds?: string[]
}

/** Which events a workflow step applies to. Names, not functions, so a workflow can be saved with the club. */
export type StepCond = "campus" | "offcampus" | "speaker" | "usgFood" | "usgSpeaker" | "offsite" | "dining" | "onsite" | "tbd" | "food"

/**
 * One step of an event workflow. A step has no dates of its own: an anchor (an ASU rule or a club timing) and links to other
 * steps; the rule engine (schedule.ts) turns those into deadlines. Both the standard workflow and a club's own are lists of these.
 */
export interface StepTemplate {
  key: string
  title: string
  fn: RoleFunction
  /** The specific role that does this step, once the club has chosen one. Otherwise the first role with the right function. */
  ownerRoleId?: string | null
  phase: Phase
  anchor?: Anchor
  estDays: number
  tier: Tier
  dependsOn?: string[]
  ruleIds?: string[]
  cond?: StepCond
  why: string
  source: string
  consulted?: RoleFunction[]
  informed?: RoleFunction[]
  /** Added by the club (not from the standard workflow). */
  custom?: boolean
}

/** The club's own event workflow, made in setup from its planning notes and files. New events are built from it. */
export interface EventWorkflow {
  steps: StepTemplate[]
  phaseOrder?: Phase[]
  updatedOn: string
  /** One line about where it came from, e.g. "Adapted from your planning notes and 1 file". */
  summary?: string
}

export interface Org {
  id: string
  name: string
  school: string
  mission: string
  goals: Goal[]
  settings: OrgSettings
  workspace: WorkspaceConfig
  setupCompletedOn: string | null
  inviteCode: string
  /** The club's own event workflow. Absent: the standard workflow is used. */
  eventWorkflow?: EventWorkflow
  /** Task board look (v1.1): renamed statuses, colours, custom tags and which fields cards show. Meanings never change. */
  board?: BoardSettings
}

export interface BoardTag { id: string; label: string; color: string }
export interface BoardSettings {
  labels?: Partial<Record<NodeStatus, string>>
  colors?: Partial<Record<NodeStatus, string>>
  tags?: BoardTag[]
  /** Card fields shown on the board. */
  fields?: ("owner" | "due" | "event" | "tags")[]
}

export interface PlanningFile {
  id: string
  name: string
  type: string
  size: number
  /** Local browser only; small fictional files, never sent to AI. */
  dataUrl: string
  /** Text read from the file in this browser (PDF, Word, text) so the AI can compare it with the standard workflow. Empty for other types. */
  text?: string
}
export interface WorkspaceConfig {
  calendarUrl: string
  messaging: "whatsapp" | "email"
  driveLink: string
  planningNotes: string
  files: PlanningFile[]
}
export interface FreeSlot { day: number; from: string; to: string }

export interface Role {
  id: string
  displayName: string
  fn: RoleFunction
  holderId: string | null
  /** Who this role reports to (another role id). Null at the top. */
  reportsToId?: string | null
  duties?: string
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
  personalBufferEnabled: boolean
  retainBufferAtHandoff?: boolean
  bufferHistoryFrom?: string
  phone: string
  /** Fictional ASU ID (10 digits starting 9999). Kept in this browser; never sent to AI. */
  asuId?: string
  expectations: string
  freeSlots: FreeSlot[]
  setupCompletedOn: string | null
}

export type EventType = "speaker" | "social" | "workshop" | "meeting" | "fundraiser" | "offcampus"

export interface Event {
  id: string
  name: string
  date: string
  type: EventType
  headcount: number
  venue: "campus" | "offcampus"
  /** "tbd": there will be food, but how it is provided is decided later (Juanxi, 2026-10-27: the form only asks yes/no). */
  food: "none" | "dining" | "offsite" | "onsite" | "tbd"
  funding: "usg" | "college" | "dues" | "sponsor" | "none"
  speaker: boolean
  goalId: string | null
  playbookId: string
  /** What the organizer wrote about the event in their own words (form "Details"); the event review reads it. */
  details?: string
  /** Order of the six phase groups in the step editor and in the progress dots (display only; no date depends on it). */
  phaseOrder?: Phase[]
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
  /** Board order inside a status column (v1.1). Lower comes first. */
  rank?: number
  /** Custom board tag ids (v1.1). */
  tags?: string[]
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
  spent?: number
  application?: import("../lib/preflight").ApplicationPackage
}

export interface Rule {
  id: string
  category: "venue" | "food" | "money" | "marketing" | "compliance" | "transition"
  text: string
  /** v1.1: at most 12 words for the Rules list; the full text shows on hover. */
  short?: string
  /** v1.1: the timing chip, e.g. "14 days". */
  timing?: string
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
  /** v1.2: small changes the assistant applied straight away. `before` holds the records it touched, for Undo. */
  auto?: boolean
  by?: string
  before?: { nodes: Node[]; contacts: Contact[] }
  notes?: string[]
  undone?: boolean
  /** Tasks this change created; Undo removes them. */
  createdIds?: string[]
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
  handoffRoles: RoleHandoff[]
  feedback: OutputReport[]
  changeSets: ChangeSet[]
  extensionRequests: ExtensionRequest[]
  notifications: Notice[]
  silenceCases: SilenceCase[]
  protocolLog: ProtocolEntry[]
  officerGrants: OfficerGrant[]
  /** Random per-browser demo signing key, generated at runtime; never an API/provider key. */
  demoLinkKey: string
}


export interface HandbookSource { id:string; kind:"task"|"interview"; text:string; nodeId?:string }
export interface HandbookEntry { sourceId:string; text:string }
export interface RoleHandoff { roleId:string; outgoingId:string|null; interview:string[]; entries:HandbookEntry[]; sources:HandbookSource[]; startDate?:string; fingerprint:string; source:string; model:string|null; confirmed:boolean; approved:boolean; checks:string[]; completed:boolean; reviewed:boolean; incomingId:string|null }
export interface OutputReport { id:string; outputId:string; text:string; reportedBy:string; on:string; resolved:boolean }

/**
 * One line of the interaction log (A7b): what a person did, in the order they did it.
 * This is the only place in the app that uses the real clock (`at`); every date shown in the interface
 * still comes from `DemoState.today`, the fixed demo clock.
 */
export interface LogEntry {
  /** 1, 2, 3 … never reused; gaps at the start mean the oldest entries were dropped at the 2,000-entry cap. */
  seq: number
  /** Real time the action was dispatched, milliseconds since 1970 (Date.now()). */
  at: number
  /** Id of the person the app was set to "View as" when the action ran. */
  actor: string
  /** The action type, e.g. "updateNode", "moveTask". */
  type: string
  /** The action's arguments, shortened (long text cut, secrets and bulky objects left out). */
  payload: unknown
  /** The fields' values before the action, only for actions that change something that already existed. */
  before?: unknown
  /** false = the app ignored the action (not allowed, invalid, or nothing to change). */
  applied: boolean
}
