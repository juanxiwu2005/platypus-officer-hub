import { TASK_DUE_CHOICES } from "../engine/taskDates"
import type { DemoState, Event, StepTemplate, Goal, OrgSettings, Person, Role, RoleFunction, WorkspaceConfig } from "./types"
import { MAX_DUTIES, MAX_ROLES, hasReportingLoop, orderRoles } from "./structure"
import type { CommandOp } from "../lib/commands"
import { sanitizeOps, validDate } from "../lib/commands"
import { canLead } from "./changeReview"
import { applySchedule } from "../engine/schedule"
import { buildEventNodes } from "../engine/playbooks"
import { MAX_STEPS, PHASE_LIST, checkWorkflow, describeWorkflow, withOwners } from "../engine/workflow"

export const ROLE_FUNCTIONS: { value: RoleFunction; label: string }[] = [
  { value: "president", label: "President" }, { value: "vice_president", label: "Vice president" },
  { value: "finance", label: "Finance" }, { value: "programs", label: "Programs" },
  { value: "marketing", label: "Marketing" }, { value: "outreach", label: "Outreach" },
  { value: "secretary", label: "Secretary" }, { value: "membership", label: "Membership" },
  { value: "advisor", label: "Advisor" },
]
export type ClubDraft = { name: string; mission: string; goals: Goal[]; roles: Role[]; people: Person[]; workspace: WorkspaceConfig }
export type ProfilePatch = Pick<Person, "name" | "email" | "phone" | "channels" | "remindAt" | "busyWeeks" | "careerGoal" | "interests" | "expectations" | "personalBufferDays" | "personalBufferEnabled" | "freeSlots" | "asuId">
/** How early the club finishes before the real deadline, in working days (Setup question). */
export const BUFFER_CHOICES = [1, 2, 3, 5, 7] as const
export type FirstEvent = Extract<CommandOp, { op: "create_event" }>
const nonempty = (s: unknown, max: number) => typeof s === "string" && !!s.trim() && s.trim().length <= max
export const webLink = (s: string) => { try { return ["http:", "https:"].includes(new URL(s).protocol) } catch { return false } }
export const minutes = (s: string): number => /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3)) : NaN

export function validateWorkspace(w: WorkspaceConfig): string | null {
  if (!w || !webLink(w.calendarUrl) || (w.driveLink && !webLink(w.driveLink))) return "Use an http or https calendar/folder link."
  if (!["email", "whatsapp"].includes(w.messaging) || typeof w.planningNotes !== "string" || w.planningNotes.length > 2000) return "Choose a messaging channel and keep planning notes under 2,000 characters."
  if (!Array.isArray(w.files) || w.files.length > 3 || w.files.reduce((sum, f) => sum + f.size, 0) > 1_000_000) return "Keep up to three planning files, at most 1 MB in total."
  if (w.files.some(f => !nonempty(f.id, 100) || !nonempty(f.name, 160) || !/\.(txt|md|csv|pdf|docx|xlsx)$/i.test(f.name) || !Number.isInteger(f.size) || f.size < 1 || f.size > 512_000 || (f.text !== undefined && (typeof f.text !== "string" || f.text.length > 60_000)) || typeof f.dataUrl !== "string" || !/^data:[^,]*;base64,[A-Za-z0-9+/=]+$/.test(f.dataUrl) || f.dataUrl.length > 700_000)) return "Use small .txt, .md, .csv, .pdf, .docx or .xlsx files (up to 512 KB each)."
  return null
}
/** A workflow is saved only if its steps are well formed and nothing in it breaks an ASU rule (the engine's check, not the AI's). */
export function validateWorkflow(steps: StepTemplate[], roles: Role[]): string | null {
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_STEPS) return `A workflow needs 1 to ${MAX_STEPS} steps.`
  if (new Set(steps.map(x => x.key)).size !== steps.length) return "Each step needs its own key."
  if (steps.some(x => !nonempty(x.key, 40) || !nonempty(x.title, 120) || typeof x.why !== "string" || x.why.length > 400 || !(PHASE_LIST as string[]).includes(x.phase) || !Number.isInteger(x.estDays) || x.estDays < 0 || x.estDays > 30 || !["light", "medium", "heavy"].includes(x.tier) || (x.dependsOn !== undefined && (!Array.isArray(x.dependsOn) || x.dependsOn.some(d => typeof d !== "string"))))) return "Give each step a title, a phase and 0 to 30 days of work."
  return checkWorkflow(steps, roles).find(i => i.level === "blocked")?.text ?? null
}

export function validateGoals(goals: Goal[]): string | null {
  if (!Array.isArray(goals) || goals.length < 2 || goals.length > 3 || new Set(goals.map(g => g.id)).size !== goals.length) return "Choose two or three semester goals."
  return goals.some(g => !nonempty(g.label, 100) || !nonempty(g.id, 80) || !nonempty(g.unit, 20) || !Number.isFinite(g.target) || g.target <= 0 || g.target > 1_000_000 || !Number.isFinite(g.current) || g.current < 0) ? "Give each goal a name, a positive target, and a nonnegative current value." : null
}
export function validateRoles(roles: Role[], people: Person[]): string | null {
  if (!Array.isArray(roles) || roles.length < 1 || roles.length > MAX_ROLES || new Set(roles.map(r => r.id)).size !== roles.length || new Set(roles.map(r => r.displayName.trim().toLowerCase())).size !== roles.length) return `Use up to ${MAX_ROLES} roles, each with a different title.`
  if (roles.filter(r => r.fn === "president").length !== 1 || roles.filter(r => r.fn === "president" && r.holderId).length !== 1) return "Keep one president with an assigned officer."
  if (roles.some(r => !nonempty(r.id, 80) || !nonempty(r.displayName, 60) || !ROLE_FUNCTIONS.some(f => f.value === r.fn) || (r.holderId && !people.some(p => p.id === r.holderId)))) return "Each role needs a title and a valid officer."
  if (new Set(roles.filter(r => r.holderId).map(r => r.holderId)).size !== roles.filter(r => r.holderId).length) return "Each officer holds one role in this demo."
  if (people.some(p => !roles.some(r => r.id === p.roleId && r.holderId === p.id))) return "Match every officer to their own role."
  if (roles.some(r => r.duties !== undefined && (typeof r.duties !== "string" || r.duties.length > MAX_DUTIES))) return `Keep each role's duties under ${MAX_DUTIES} characters.`
  if (roles.some(r => r.reportsToId && (r.reportsToId === r.id || !roles.some(x => x.id === r.reportsToId))) || hasReportingLoop(roles)) return "Each role reports to a different, existing role, with no loops."
  return null
}
export function validateProfile(p: ProfilePatch): string | null {
  if (!nonempty(p.name, 80) || !/^[^\s@]+@example\.org$/i.test(p.email)) return "Enter a fictional name and an example.org demo email."
  const phone = p.phone.replace(/[ ()+-]/g, "")
  if (phone && !/^(1)?[2-9]\d{2}55501\d{2}$/.test(phone)) return "Leave the number blank or use a fictional US 555-01xx number."
  if (p.asuId && !/^9999\d{6}$/.test(p.asuId)) return "Leave the ASU ID blank or use a fictional 10-digit one starting with 9999."
  if (!Array.isArray(p.channels) || !p.channels.length || new Set(p.channels).size !== p.channels.length || p.channels.some(c => !["whatsapp", "sms", "email"].includes(c)) || !["morning", "evening"].includes(p.remindAt)) return "Choose a preferred channel and morning/evening reminder time."
  if (!Array.isArray(p.busyWeeks) || p.busyWeeks.length > 20 || p.busyWeeks.some(d => !validDate(d) || new Date(d + "T12:00:00Z").getUTCDay() !== 1)) return "Choose valid busy weeks, beginning on Monday."
  if (![p.careerGoal, p.interests, p.expectations].every(v => typeof v === "string" && v.length <= 500)) return "Keep each profile note under 500 characters."
  if (!Number.isInteger(p.personalBufferDays) || p.personalBufferDays < 0 || p.personalBufferDays > 5 || typeof p.personalBufferEnabled !== "boolean") return "Personal buffer must be between zero and five working days."
  if (!Array.isArray(p.freeSlots) || p.freeSlots.length > 120 || p.freeSlots.some(f => !Number.isInteger(f.day) || f.day < 0 || f.day > 6 || !Number.isFinite(minutes(f.from)) || !Number.isFinite(minutes(f.to)) || minutes(f.to) <= minutes(f.from))) return "Each free slot needs a weekday and an end time later than its start."
  return null
}
export function validateClub(d: ClubDraft): string | null {
  if (!nonempty(d.name, 80) || typeof d.mission !== "string" || d.mission.length > 300) return "Enter a club name and keep the mission under 300 characters."
  if (!Array.isArray(d.people) || !d.people.length || d.people.length > MAX_ROLES || new Set(d.people.map(p => p.id)).size !== d.people.length || new Set(d.people.map(p => p.name.toLowerCase().trim())).size !== d.people.length) return "Use distinct fictional officers (a name can be used once)."
  for (const p of d.people) { const error = validateProfile(p); if (error) return error }
  return validateGoals(d.goals) ?? validateRoles(d.roles, d.people) ?? validateWorkspace(d.workspace)
}

export function validateDefaults(d: OrgSettings): string | null {
  const p = d.silenceProtocol
  if (!Number.isInteger(d.clubBufferBusinessDays) || d.clubBufferBusinessDays < 0 || d.clubBufferBusinessDays > 10) return "Club buffer must be zero to ten working days."
  if (!Array.isArray(p?.nudgeDays) || p.nudgeDays.length !== 2 || ![...p.nudgeDays, p.presidentDay, p.reassignDay, p.retroDay].every(n => Number.isInteger(n) && n >= 1 && n <= 30) || !(p.nudgeDays[0] < p.nudgeDays[1] && p.nudgeDays[1] < p.presidentDay && p.presidentDay < p.reassignDay && p.reassignDay < p.retroDay)) return "Follow-up days must increase: reminder 1, reminder 2, private check, temporary owner, recovery."
  if (!Number.isInteger(d.maxRemindersPerTask) || d.maxRemindersPerTask < 1 || d.maxRemindersPerTask > 3) return "Keep the reminder limit between one and three."
  if (d.sendMode !== "review" || d.quietHours.from !== "22:00" || d.quietHours.to !== "08:00") return "This demo keeps review-before-send and quiet hours from 10 pm to 8 am."
  if (d.taskDueDays !== undefined && !(TASK_DUE_CHOICES as readonly number[]).includes(d.taskDueDays)) return "Choose 3, 5 or 7 days for a usual task."
  if (d.eventCreators !== undefined && !["leads", "everyone", "chosen"].includes(d.eventCreators)) return "Choose who can create events."
  if (d.eventCreatorIds !== undefined && (!Array.isArray(d.eventCreatorIds) || d.eventCreatorIds.length > 20 || d.eventCreatorIds.some(id => typeof id !== "string"))) return "Choose officers from the list."
  return null
}

export function saveClubSettings(s: DemoState, d: ClubDraft, defaults: OrgSettings): DemoState {
  if (!canLead(s) || validateClub(d) || validateDefaults(defaults)) return s
  // This form edits club and role settings (titles, who reports to whom, duties); it cannot add or remove roles, move officers, or change another officer's private profile.
  if (d.roles.length !== s.roles.length || d.roles.some(r => !s.roles.some(old => old.id === r.id && old.holderId === r.holderId)) || d.people.some(p => !s.people.some(old => old.id === p.id && old.roleId === p.roleId))) return s
  const roles = orderRoles(d.roles.map(r => ({ ...r, displayName: r.displayName.trim() })))
  const nodes = s.nodes.map(n => {
    const oldRole = s.roles.find(r => r.holderId === n.ownerId)
    const nextRole = roles.find(r => r.id === oldRole?.id)
    return nextRole && n.fn === oldRole?.fn ? { ...n, fn: nextRole.fn } : n
  })
  const settings = { ...defaults, ...(defaults.eventCreatorIds ? { eventCreatorIds: defaults.eventCreatorIds.filter(id => s.people.some(p => p.id === id)) } : {}) }
  return applySchedule({ ...s, org: { ...s.org, name: d.name.trim(), mission: d.mission.trim(), goals: d.goals, workspace: d.workspace, settings }, roles, nodes })
}

/** The president edits the club's event workflow. It applies to events made from now on; events already made keep their steps. */
export function saveWorkflow(s: DemoState, steps: StepTemplate[]): DemoState {
  if (!canLead(s) || validateWorkflow(steps, s.roles)) return s
  const owned = withOwners(steps, s.roles)
  return { ...s, org: { ...s.org, eventWorkflow: { steps: owned, updatedOn: s.today, summary: describeWorkflow(owned) } } }
}
/** Back to the standard event workflow. */
export function resetWorkflow(s: DemoState): DemoState {
  if (!canLead(s)) return s
  const { eventWorkflow: _gone, ...org } = s.org
  return { ...s, org }
}

export function saveProfile(s: DemoState, personId: string, patch: ProfilePatch, invite?: string): DemoState {
  if ((personId !== s.viewerId && invite !== s.org.inviteCode) || validateProfile(patch) || !s.people.some(p => p.id === personId) || s.people.some(p => p.id !== personId && p.name.toLowerCase() === patch.name.trim().toLowerCase())) return s
  const clean: ProfilePatch = { asuId: patch.asuId ?? "", name: patch.name.trim(), email: patch.email.trim(), phone: patch.phone.trim(), channels: patch.channels, remindAt: patch.remindAt, busyWeeks: [...new Set(patch.busyWeeks)], careerGoal: patch.careerGoal, interests: patch.interests, expectations: patch.expectations, personalBufferDays: patch.personalBufferDays, personalBufferEnabled: patch.personalBufferEnabled, freeSlots: patch.freeSlots }
  return applySchedule({ ...s, people: s.people.map(p => p.id === personId ? { ...p, ...clean, setupCompletedOn: s.today } : p) })
}

export function completeSetup(s: DemoState, d: ClubDraft, rawEvent: unknown, eventDate: string, inviteCode: string, taskDueDays?: number, clubBufferBusinessDays?: number, workflow?: StepTemplate[]): DemoState {
  if (!canLead(s) || validateClub(d) || !validDate(eventDate) || eventDate < s.today || !/^[a-f0-9-]{36}$/i.test(inviteCode)) return s
  if (taskDueDays !== undefined && !(TASK_DUE_CHOICES as readonly number[]).includes(taskDueDays)) return s
  if (clubBufferBusinessDays !== undefined && !(BUFFER_CHOICES as readonly number[]).includes(clubBufferBusinessDays)) return s
  if (workflow && validateWorkflow(workflow, d.roles)) return s
  const op = sanitizeOps([rawEvent], s)[0]
  if (op?.op !== "create_event") return s
  const { op: _kind, ...fields } = op
  const id = `setup-event-${s.org.id}`
  const event: Event = { ...fields, id, date: eventDate, goalId: d.goals[0].id, playbookId: "seo-event" }
  const people = d.people.map(p => ({ ...p, name: p.name.trim() }))
  const roles = orderRoles(d.roles.map(r => ({ ...r, displayName: r.displayName.trim() })))
  const president = roles.find(r => r.fn === "president")!
  const steps = workflow ? withOwners(workflow, roles) : undefined
  return applySchedule({ ...s, viewerId: president.holderId!, org: { ...s.org, name: d.name.trim(), mission: d.mission.trim(), goals: d.goals.map(g => ({ ...g, current: 0 })), workspace: d.workspace, setupCompletedOn: s.today, inviteCode, ...(steps ? { eventWorkflow: { steps, updatedOn: s.today, summary: describeWorkflow(steps) } } : { eventWorkflow: undefined }), settings: { ...s.org.settings, ...(taskDueDays ? { taskDueDays } : {}), ...(clubBufferBusinessDays !== undefined ? { clubBufferBusinessDays } : {}) } }, roles, people, events: [event], nodes: buildEventNodes(event, roles, steps ? { steps } : {}).map(n => ({ ...n, assignedOn: s.today, ownerVersion: 0 })), nudges: [], contributions: [], contacts: [], organizations: [], interactions: [], funding: [], handoff: null, handoffRoles: [], feedback: [], changeSets: [], extensionRequests: [], notifications: [], silenceCases: [], protocolLog: [], officerGrants: [] })
}

export const clubDraft = (s: DemoState): ClubDraft => structuredClone({ name: s.org.name, mission: s.org.mission, goals: s.org.goals, roles: s.roles, people: s.people, workspace: s.org.workspace })
export const profilePatch = (p: Person): ProfilePatch => ({ name: p.name, email: p.email, phone: p.phone, channels: p.channels, remindAt: p.remindAt, busyWeeks: p.busyWeeks, careerGoal: p.careerGoal, interests: p.interests, expectations: p.expectations, personalBufferDays: p.personalBufferDays, personalBufferEnabled: p.personalBufferEnabled, freeSlots: p.freeSlots, asuId: p.asuId ?? "" })
