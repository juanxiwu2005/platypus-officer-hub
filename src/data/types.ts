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
  /** Withdrawn prototype setting: retained for lossless export, ignored by runtime. */
  matchingMode?: "legacy" | "responsibilities"
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
  /**
   * Phase 3 (P3-H, Juanxi 2026-11-08): how the president said reminders should reach officers, asked on the walkthrough's Reminders screen.
   * Recorded for the study only: it changes no behaviour, and nothing in the app ever sends email (sendMode stays "review").
   * Absent when the screen was skipped (or setup ran on the classic page). Old saved data without it stays valid.
   */
  reminderMode?: ReminderMode
}
/** The three answers on the walkthrough's Reminders screen, in the order shown (fixed). */
export type ReminderMode = "auto_email" | "review_then_self" | "review_then_auto"

/** Which events a workflow step applies to. Names, not functions, so a workflow can be saved with the club. */
export type EventCheck = "funding" | "food" | "externalFood" | "onsiteFood" | "speaker" | "partner" | "travel" | "parking" | "advisor" | "access" | "safety" | "outdoor" | "alcohol" | "drone" | "media" | "prize" | "schoolApproval" | "content" | "rsvp"
/** Confirmed intake facts. Absent means this is a pre-v1.0 workflow record; legacy facts are used as a safe fallback. */
export type EventChecks = Partial<Record<EventCheck, boolean>>
export type StepCond = "campus" | "offcampus" | "speaker" | "externalGuest" | "usgFood" | "usgSpeaker" | "offsite" | "dining" | "onsite" | "tbd" | "food" | EventCheck | "large"

/** Saved graph membership; order only breaks ties between independent steps. */
export interface WorkflowPlacement { branchId: string; order: number }
/** A step's authored category. Event intake predicates remain separate in cond/branch conditions. */
export type WorkflowStepKind = "core" | "situation"
export interface WorkflowBranch {
  id: string
  title: string
  order: number
  side: "before_event" | "after_event"
  /** All selected event requirements must match. An explicit empty list means every event. */
  conditions?: StepCond[]
  /** Legacy single requirement, used only when conditions is absent. */
  condition?: StepCond
  /** Prefer one role/team per branch. TODO: replace role-routing fallback with the future explicit team/role map. */
  defaultRoleId?: string | null
}

/**
 * One step of an event workflow. A step has no dates of its own: an anchor (an ASU rule or a club timing) and links to other
 * steps; the rule engine (schedule.ts) turns those into deadlines. Both the standard workflow and a club's own are lists of these.
 */
export interface StepTemplate {
  stepKind?: WorkflowStepKind
  placement?: WorkflowPlacement
  /** Missing preserves the calibrated defaults; an explicit effort edit opts in. */
  startPolicy?: "window" | "effort"
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
  /** Calibrated club timing (FB-6). Present: the step is "calibrated" and the rule engine dates it from these offsets. */
  timing?: StepTiming
}

/**
 * Calibrated timing of a step (FB-6, from the owner's event timing table): whole days counted from the event day,
 * positive before the event and negative after it. `startDays` opens the step's window (the latest start, which is
 * the day its reminder goes out); `dueDays` is its club deadline. Never a date: the rule engine turns these into dates.
 */
export interface StepTiming {
  startDays: number
  dueDays: number
  /** Calendar days by default; business days skip weekends and ASU holidays. */
  unit?: "calendar" | "business"
}

/** The club's own event workflow, made in setup from its planning notes and files. New events are built from it. */
export interface EventWorkflow {
  steps: StepTemplate[]
  branches?: WorkflowBranch[]
  phaseOrder?: Phase[]
  updatedOn: string
  /** One line about where it came from, e.g. "Adapted from your planning notes and 1 file". */
  summary?: string
}

export interface Org {
  /** Archived responsibility workspace identity; not an account or permission. */
  matchingWorkspaceId?: string
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
  /** Earlier titles and the date each stopped being used (Handoff stage 6); set when a role is renamed. */
  formerNames?: { name: string; until: string }[]
  /** The day of the latest rename: more renames that day (typing, Undo) do not add earlier titles. */
  renamedOn?: string
  /** The president's answers to the three starter questions of a new role (ROLE_START_PROMPTS), in order. */
  startNotes?: string[]
}

/** A role the club closed: gone from every role list, but its name, history and where its work went are kept (Juanxi, D-6a: close, never delete). */
export interface ArchivedRole extends Role {
  archivedOn: string
  /** The role that took over its work. */
  closedInto: string | null
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
  /**
   * The date this person handed their role over (Handoff → Finish role handoff). From then on they are a former officer:
   * still in the club's records (tasks they did, contributions, interactions), but no longer in officer lists, pickers,
   * validation or what the AI may assign to. `roleId` keeps the role they last held. Absent: a current officer.
   */
  leftOn?: string | null
  /**
   * A new person named as the next holder of this role before the handoff is finished (Handoff stage 3). They exist, can be
   * viewed as, and can read the handbook and the open tasks, but are not an officer yet: no role rights, not in officer lists.
   * Finishing the handoff removes this field. Absent: not waiting for a role.
   */
  incomingFor?: string
  phone: string
  /** Fictional ASU ID (10 digits starting 9999). Kept in this browser; never sent to AI. */
  asuId?: string
  expectations: string
  /** Date-specific half-hour availability overrides. */
  availabilityOverrides?: Record<string, boolean>
  /** Prior weekly templates stay available to the scheduling engine for dates before a later change. */
  weeklyAvailabilityHistory?: { startsOn: string; freeSlots: FreeSlot[] }[]
  /** The current weekly template, effective from the newest availability-history date onward. */
  freeSlots: FreeSlot[]
  setupCompletedOn: string | null
}

export type EventType = "speaker" | "social" | "workshop" | "meeting" | "fundraiser" | "offcampus"

export interface Event {
  /** Snapshot for this event; later template edits must never change its graph. */
  workflowBranches?: WorkflowBranch[]
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
  /** Situation-based answers from the event intake. They decide which yellow workflow nodes exist. */
  checks?: EventChecks
  goalId: string | null
  playbookId: string
  /** What the organizer wrote about the event in their own words (form "Details"); the event review reads it. */
  details?: string
  /** Order of the six phase groups in the step editor and in the progress dots (display only; no date depends on it). */
  phaseOrder?: Phase[]
  /** Event Budget is the sole user-facing source for line-item funding progress. */
  budgetItems?: BudgetLineItem[]
}

export type BudgetCategory = "general" | "food" | "speaker" | "travel"
export type BudgetSource = "usg" | "college" | "organization" | "sponsor" | "none"
export type BudgetItemStatus = "not_started" | "food_exception_permit" | "quote_gather" | "budget_request" | "budget_approval" | "purchase_request" | "purchase_approval" | "order_placed" | "invoice" | "attendance_submit" | "paid_reimbursed" | "finance_record"
export interface BudgetLineItem { id: string; item: string; quantity: number; pricePerUnit: number; source: BudgetSource; status: BudgetItemStatus; category: BudgetCategory }

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
  stepKind?: WorkflowStepKind
  placement?: WorkflowPlacement
  startPolicy?: "window" | "effort"
  /** Creation scope, retained for graph editing; existing event tasks are never filtered on read. */
  cond?: StepCond
  /** Actual task overrides and work only; workflow templates remain independent. */
  externalLinks?: import("../taskDetails/contracts").TaskExternalLink[]
  taskWork?: import("../taskDetails/contracts").TaskWork
  /** Optional human-authored instructions; reminder facts never invent missing details. */
  instructions?: string
  completionCriteria?: string
  /** Archived responsibility metadata: preserve without interpreting or applying it. */
  matching?: unknown
  id: string
  title: string
  eventId: string | null
  /** Playbook step this node came from, e.g. "budgetRequest". Null for standalone tasks. */
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
  /** The teammate a waiting task needs; unlike waitingOn text, this drives their To do and Update notice. */
  waitingOnPersonId?: string | null
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
  /** Calibrated timing copied from the workflow step (FB-6). Absent on hand-made tasks and on steps built before FB-6. */
  timing?: StepTiming
}

export interface Nudge {
  message?: import("../reminders/accessContracts").ReminderMailSnapshot
  id: string
  nodeId: string
  channel: Channel
  text: string
  sentBy: string
  sentOn: string
  response: NodeStatus | null
  /** FB-8: who sent it in the demo. "president" = a lead opened the draft and sent it; "platypus" = a lead approved and Platypus would send it (demo: nothing is sent). Absent on reminders recorded before FB-8. */
  via?: NudgeVia
}
export type NudgeVia = "president" | "platypus"

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
  requestedBy?: string
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

/** Where a contact sits in the relationship (CRM board columns). */
export type RelationStage = "cold" | "warm" | "active" | "dormant"
/** "all" = every member; "leads" = president, vice president and the owning role only. */
export type ContactVisibility = "all" | "leads"
export type PreferredChannel = "" | "email" | "phone" | "text" | "instagram" | "linkedin" | "in_person"
export type InteractionKind = "email" | "call" | "meeting" | "event" | "other"

/** A company, campus office, club or agency. One organization can have many contacts. */
export interface Organization {
  id: string
  name: string
  type: string
  website: string
  email: string
  phone: string
  address: string
  tags: string[]
  notes: string
  createdBy: string | null
}

/** A person the club works with. Owned by a role, so it stays with the role at handoff. */
export interface Contact {
  id: string
  name: string
  title: string
  organizationId: string | null
  /** Type: Vendor, Guest speaker, Sponsor, Partner club, Campus office... */
  relation: string
  email: string
  phone: string
  /** LinkedIn or Instagram handle or link. */
  social: string
  preferredChannel: PreferredChannel
  tags: string[]
  stage: RelationStage
  /** How the club met them. */
  source: string
  /** The member who introduced them, if any. */
  introducedById: string | null
  visibility: ContactVisibility
  lastContact: string | null
  cadenceDays: number
  ownerRoleId: string
  eventIds: string[]
  createdBy: string | null
}

/** One entry in the shared timeline: who talked to whom, what happened, what comes next. */
export interface Interaction {
  id: string
  contactId: string | null
  organizationId: string | null
  date: string
  kind: InteractionKind
  byId: string
  summary: string
  outcome: string
  nextStep: string
  nextDue: string | null
  nextDone: boolean
  eventId: string | null
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

/** incoming = named as the next holder, not in the role yet; active = holds the role now; former = held it before. */
export type TermStatus = "incoming" | "active" | "former"
/**
 * One person's time in one role (Handoff stage 3). `Role.holderId` is still the quick answer to "who holds it now";
 * the terms keep the history that answer loses, and `normalizeTerms` (src/data/roleTerms.ts) keeps both in step after every action.
 * `from` is null for a term that began before records were kept.
 */
export interface RoleTerm {
  id: string
  roleId: string
  personId: string
  status: TermStatus
  from: string | null
  to: string | null
  /** The handoff season that started or ended this term, when there was one. */
  handoffId: string | null
}

export interface HandoffSeason {
  id: string
  from: string
  to: string
  roleIds: string[]
  /** Started for one role ("Hand over this role"), not for the whole club: roles added or missing later do not join it. Pressing "Start handoff season" makes it a full season. */
  partial?: boolean
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
  taskAccessGrants?: import("../reminders/accessContracts").TaskAccessGrant[]
  /** Versioned rule reminders; legacy saves require an explicit upgrade to complete-mail delivery. */
  reminderRuntime?: import("../reminders/contracts").ReminderRuntime
  /** Archived prototype snapshots: retained verbatim for export and future explicit recovery. */
  matching?: unknown
  matchingContext?: unknown
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
  organizations: Organization[]
  interactions: Interaction[]
  funding: Funding[]
  handoff: HandoffSeason | null
  handoffRoles: RoleHandoff[]
  /** Earlier rounds of role handoffs, kept when a role is handed over again or a new season starts (never erased). Optional: absent in older saves. */
  handoffHistory?: (RoleHandoff & { season: string | null })[]
  /** Who held which role, and when (Handoff stage 3). Maintained by normalizeTerms. */
  roleTerms: RoleTerm[]
  /** Roles the club closed (Handoff stage 6). */
  archivedRoles: ArchivedRole[]
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


export interface HandbookSource { id:string; kind:"task"|"interview"|"deadline"|"step"|"contact"|"lesson"; text:string; nodeId?:string }
export interface HandbookEntry { sourceId:string; text:string }
export interface RoleHandoff { roleId:string; outgoingId:string|null; interview:string[]; entries:HandbookEntry[]; sources:HandbookSource[]; startDate?:string; fingerprint:string; source:string; model:string|null; confirmed:boolean; approved:boolean; checks:string[]; completed:boolean; reviewed:boolean; incomingId:string|null; completedOn?:string|null; questions?:HandoffQuestion[]; reading?:Record<string,"got"|"unclear">; readBack?:ReadBack|null; shadowNodeId?:string|null; reviews?:HandoffReview[] }
/** A question for the outgoing officer (Handoff stage 5). "gap" questions come from holes in the role's records; "unclear" ones from the new officer's reading. Answers become interview lines. */
export interface HandoffQuestion { id:string; text:string; kind:"gap"|"unclear"; status:"open"|"answered"|"skipped"; answer:string }
/** The new officer's own words on three fixed questions, and which answers the handbook does not seem to cover. Nothing here is a score. */
export interface ReadBack { answers:string[]; flags:{flagged:boolean;resolved:boolean}[] }
/** The new officer's check-in at day 7 or day 30: three 1–5 answers and what the handbook lacked. Seen by the president and the new officer only. */
export interface HandoffReview { day:7|30; on:string; clarity:number; confidence:number; welcome:number; missing:string; accepted:boolean }
export interface OutputReport { id:string; outputId:string; text:string; reportedBy:string; on:string; resolved:boolean }

/**
 * One line of the interaction log (A7b): what a person did, in the order they did it.
 * This is the only place in the app that uses the real clock (`at`); every date shown in the interface
 * still comes from `DemoState.today`, the fixed demo clock.
 */
export interface LogEntry {
  /** 1, 2, 3 … never reused within a study session (it starts again at 1 when a new session begins); gaps at the start mean the oldest entries were dropped at the 2,000-entry cap. */
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
  /** The study session it was written in (src/lib/studySession.ts); missing when no session had begun in this browser. */
  session?: string
}
