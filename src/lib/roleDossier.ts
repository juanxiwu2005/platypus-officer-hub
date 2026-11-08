import type { Contact, DemoState, HandbookSource, Node, Role, StepTemplate } from "../data/types"
import { canSeeContact } from "../data/crm"
import { orgSteps } from "../engine/playbooks"
import { handoffDates } from "../engine/schedule"
import { addDays } from "./dates"

/**
 * A role's dossier (Handoff stage 4): what the club's own records say about the role, in four blocks, worked out by plain code
 * (no AI) at any time, not only in handoff season. Every row names the record it comes from, so a handbook line can always be traced.
 *  - calendar : the role's deadlines in the first 30 days and the steps it owns in every event
 *  - inFlight : open work (the outgoing officer's tasks; unowned tasks of the role's function)
 *  - people   : contacts the role owns, when they were last spoken to, what is next
 *  - lessons  : extension requests and their reasons, tasks that went quiet, work that finished late
 * Dates come from the rule engine and the club's records; nothing here writes a date.
 */
export type DossierBlock = "calendar" | "inFlight" | "people" | "lessons"
export interface DossierRow {
  /** The handbook source id for this row (task:…, deadline:…, step:…, contact:…, lesson:…). */
  id: string
  block: DossierBlock
  text: string
  nodeId?: string
  contactId?: string
  /** The record is missing something the next officer will need (no reason given, never contacted, no purpose recorded). */
  gap?: boolean
}
export interface Dossier {
  roleId: string
  blocks: Record<DossierBlock, DossierRow[]>
  gaps: number
}
export const DOSSIER_BLOCKS: { key: DossierBlock; label: string }[] = [
  { key: "calendar", label: "Calendar" }, { key: "inFlight", label: "In flight" }, { key: "people", label: "People" }, { key: "lessons", label: "Lessons" },
]

/** The person whose work this dossier describes: the outgoing officer of the open handoff, else the role's current holder. */
export const dossierOwner = (s: DemoState, roleId: string): string | null =>
  s.handoffRoles.find(r => r.roleId === roleId)?.outgoingId ?? s.roles.find(r => r.id === roleId)?.holderId ?? null

/** The role's own tasks: the person's, plus tasks nobody owns that belong to the role's function. */
export function roleTasks(s: DemoState, role: Role, who: string | null): Node[] {
  return s.nodes.filter(n => (!!who && n.ownerId === who) || (!n.ownerId && n.fn === role.fn))
}
/** One task as a handbook line. Unchanged since stage 1 so existing handbooks keep their wording. */
export const taskText = (n: Node) => `Task: ${n.title}. Purpose: ${n.why || "No purpose recorded"}. Recorded status: ${n.status}.`

const FIRST_DAYS = 30
const earliest = (n: Node) => [n.clubDeadline, n.officialDeadline].filter((d): d is string => !!d).sort()[0] ?? null

function anchorText(step: StepTemplate): string {
  const a = step.anchor
  if (!a) return ""
  if (a.kind === "rule") return `${a.days} ${a.unit} days before the event (ASU ${a.ruleId}). `
  if (a.kind === "target") return `${a.label}. `
  return ""
}

function contactText(s: DemoState, c: Contact): string {
  const org = s.organizations.find(o => o.id === c.organizationId)
  const next = s.interactions.filter(i => i.contactId === c.id && !i.nextDone && i.nextStep).sort((a, b) => b.date.localeCompare(a.date))[0]
  // No email, phone or handle: a handbook line is meant for the next officer to find the person, and may be sent to the AI.
  return `Contact: ${c.name}${c.title ? `, ${c.title}` : ""}${org ? ` at ${org.name}` : ""}. ${[c.relation, c.stage].filter(Boolean).join(", ")}. ${c.lastContact ? `Last spoken to ${c.lastContact}.` : "Never contacted."}${next ? ` Next step: ${next.nextStep}${next.nextDue ? ` (due ${next.nextDue})` : ""}.` : ""}`
}

/**
 * `publicOnly` leaves out contacts marked "leads only", so the rows do not depend on who is looking. Handbooks (and so the AI)
 * use it; the dossier page shows the viewer everything they are allowed to see.
 */
export function roleDossier(s: DemoState, roleId: string, { publicOnly = false }: { publicOnly?: boolean } = {}): Dossier {
  const blocks: Record<DossierBlock, DossierRow[]> = { calendar: [], inFlight: [], people: [], lessons: [] }
  const role = s.roles.find(r => r.id === roleId)
  if (!role) return { roleId, blocks, gaps: 0 }
  const who = dossierOwner(s, roleId)
  const tasks = roleTasks(s, role, who)
  const open = tasks.filter(n => n.status !== "done")
  const title = (id: string) => s.nodes.find(n => n.id === id)?.title ?? "a task"

  // The first 30 days from the handoff start (or today, with no handoff yet).
  const start = s.handoffRoles.find(r => r.roleId === roleId)?.startDate ?? s.handoff?.from ?? s.today
  const end = handoffDates(start).review
  for (const n of open.filter(x => earliest(x) && earliest(x)! <= end).sort((a, b) => earliest(a)!.localeCompare(earliest(b)!))) {
    blocks.calendar.push({ id: `deadline:${n.id}`, block: "calendar", nodeId: n.id, text: `Deadline: ${n.title}. Club deadline ${n.clubDeadline ?? "not set"}${n.officialDeadline ? `; official deadline ${n.officialDeadline}` : ""}${n.ruleIds.length ? ` (${n.ruleIds.join(", ")})` : ""}.` })
  }
  const steps = orgSteps(s).filter(st => st.ownerRoleId ? st.ownerRoleId === roleId : st.fn === role.fn).slice(0, 8)
  for (const st of steps) blocks.calendar.push({ id: `step:${st.key}`, block: "calendar", text: `Standing step in every event: ${st.title}. ${anchorText(st)}Why: ${st.why.slice(0, 160)}` })

  for (const n of open) blocks.inFlight.push({ id: `task:${n.id}`, block: "inFlight", nodeId: n.id, text: taskText(n), gap: !n.why })

  for (const c of s.contacts.filter(x => x.ownerRoleId === roleId && (publicOnly ? x.visibility === "all" : canSeeContact(s, x)))) {
    blocks.people.push({ id: `contact:${c.id}`, block: "people", contactId: c.id, text: contactText(s, c), gap: !c.lastContact })
  }

  if (who) {
    for (const r of s.extensionRequests.filter(x => x.ownerId === who)) {
      blocks.lessons.push({ id: `lesson:ext:${r.id}`, block: "lessons", nodeId: r.nodeId, text: `Extension asked on "${title(r.nodeId)}" (${r.status}): ${r.reason.trim() || "no reason recorded"}.`, gap: !r.reason.trim() })
    }
    for (const c of s.silenceCases.filter(x => x.ownerId === who)) {
      blocks.lessons.push({ id: `lesson:quiet:${c.id}`, block: "lessons", nodeId: c.nodeId, text: `"${title(c.nodeId)}" went quiet and ${c.closedOn ? `was closed on ${c.closedOn}` : "is still open"}.` })
    }
    for (const c of s.contributions.filter(x => x.personId === who && !x.onTime)) {
      blocks.lessons.push({ id: `lesson:late:${c.nodeId}`, block: "lessons", nodeId: c.nodeId, text: `"${title(c.nodeId)}" was finished late.` })
    }
  }
  const gaps = Object.values(blocks).flat().filter(r => r.gap).length
  return { roleId, blocks, gaps }
}

/** Handbook sources made from the dossier, apart from the tasks (those are added by handbookSources). Same for every viewer. */
export function dossierSources(s: DemoState, roleId: string): HandbookSource[] {
  const d = roleDossier(s, roleId, { publicOnly: true })
  const kindOf = (id: string): HandbookSource["kind"] => id.startsWith("deadline:") ? "deadline" : id.startsWith("step:") ? "step" : id.startsWith("contact:") ? "contact" : "lesson"
  return [...d.blocks.calendar, ...d.blocks.people, ...d.blocks.lessons].map(r => ({ id: r.id, kind: kindOf(r.id), text: r.text, ...(r.nodeId ? { nodeId: r.nodeId } : {}) }))
}

export type RiskLevel = "high" | "medium" | "low"
export interface HandoffRisk { level: RiskLevel; score: number; reasons: string[] }
/**
 * How risky it is to hand this role over, by simple counts (no AI), so the president can look at the worst first. Points:
 * half a point per open task (at most 6, so one busy role does not drown the rest), 3 per ASU deadline in the next 30 days,
 * 2 per overdue task, 1 per waiting or blocked task, 2 when the holder has not updated anything for over two weeks, and 1 per gap in the record.
 * High from 10 points (or two ASU deadlines), medium from 6. The hover card shows the three biggest reasons.
 */
export function handoffRisk(s: DemoState, roleId: string): HandoffRisk {
  const role = s.roles.find(r => r.id === roleId)
  if (!role) return { level: "low", score: 0, reasons: [] }
  const who = dossierOwner(s, roleId)
  const open = roleTasks(s, role, who).filter(n => n.status !== "done")
  const horizon = addDays(s.today, FIRST_DAYS)
  const hard = open.filter(n => n.officialDeadline && n.officialDeadline >= s.today && n.officialDeadline <= horizon).length
  const overdue = open.filter(n => n.clubDeadline && n.clubDeadline < s.today).length
  const stuck = open.filter(n => n.status === "waiting" || n.status === "blocked").length
  const updates = open.map(n => n.lastUpdate).filter((d): d is string => !!d).sort()
  const quietDays = updates.length ? Math.round((Date.parse(s.today) - Date.parse(updates[updates.length - 1])) / 86_400_000) : 0
  const quiet = quietDays > 14
  const gaps = roleDossier(s, roleId).gaps + (s.handoffRoles.find(r => r.roleId === roleId)?.interview.length ? 0 : 1)
  const parts: [number, string][] = [
    [Math.min(open.length, 12) / 2, `${open.length} open task${open.length === 1 ? "" : "s"}`],
    ...(hard ? [[3 * hard, `${hard} ASU deadline${hard === 1 ? "" : "s"} within 30 days`] as [number, string]] : []),
    ...(overdue ? [[2 * overdue, `${overdue} overdue`] as [number, string]] : []),
    ...(stuck ? [[stuck, `${stuck} waiting or stuck`] as [number, string]] : []),
    ...(quiet ? [[2, `No update for ${quietDays} days`] as [number, string]] : []),
    ...(gaps ? [[gaps, `${gaps} gap${gaps === 1 ? "" : "s"} in the record`] as [number, string]] : []),
  ]
  const score = Math.round(parts.reduce((n, [p]) => n + p, 0) * 10) / 10
  const level: RiskLevel = hard >= 2 || score >= 10 ? "high" : score >= 6 ? "medium" : "low"
  return { level, score, reasons: [...parts].sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, text]) => text) }
}
