import type { DemoState, Department, Person, Role, RoleFunction } from "./types"

/**
 * Club structure (M4): departments, who reports to whom, and what each role is for.
 * Everything here is pure. Setup, Settings, the constitution reader and the AI context all use these same helpers,
 * so one change reaches every member. Dates never appear here: the rule engine still owns them.
 */
export const MAX_ROLES = 24
export const MAX_DEPARTMENTS = 12
export const MAX_DUTIES = 400

export const FUNCTION_LABELS: Record<RoleFunction, string> = {
  president: "Leadership", vice_president: "Leadership", finance: "Finance", programs: "Programs & events", marketing: "Marketing",
  outreach: "Outreach", secretary: "Records", membership: "Membership", advisor: "Advising",
}

/** Used when the constitution does not say what a department or role does. The president can edit every line. */
export const DUTY_TEMPLATES: Record<RoleFunction, string> = {
  president: "Leads the club, chairs officer meetings, approves plans and funding requests, and is the main contact for the university.",
  vice_president: "Supports the president, steps in when needed, and keeps the departments working together.",
  finance: "Keeps the budget, submits funding requests, collects receipts and reconciles spending.",
  programs: "Plans and runs events: venue, schedule, speakers and day-of logistics.",
  marketing: "Promotes events and the club: flyers, social posts and the member newsletter.",
  outreach: "Finds and keeps relationships with speakers, sponsors and partner clubs.",
  secretary: "Keeps minutes, the officer list and club records, and files university updates on time.",
  membership: "Recruits and keeps members, and tracks who comes to events.",
  advisor: "Advises the club and signs university forms. Does not take event tasks.",
}

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: "d-lead", name: "Leadership", fn: "president", duties: "Sets direction, approves plans and funding requests, and keeps officers on track." },
  { id: "d-programs", name: "Programs & Events", fn: "programs", duties: DUTY_TEMPLATES.programs },
  { id: "d-finance", name: "Finance", fn: "finance", duties: DUTY_TEMPLATES.finance },
  { id: "d-marketing", name: "Marketing", fn: "marketing", duties: DUTY_TEMPLATES.marketing },
  { id: "d-outreach", name: "Outreach & Partnerships", fn: "outreach", duties: DUTY_TEMPLATES.outreach },
  { id: "d-records", name: "Records & Membership", fn: "secretary", duties: DUTY_TEMPLATES.secretary },
]

/** What a department's "event work" can be. Advisors take no event tasks. */
export const DEPARTMENT_FUNCTIONS: { value: RoleFunction; label: string }[] = [
  { value: "president", label: "Leadership" }, { value: "programs", label: "Programs & events" }, { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" }, { value: "outreach", label: "Outreach" }, { value: "secretary", label: "Records" },
  { value: "membership", label: "Membership" }, { value: "advisor", label: "Advising (no event tasks)" },
]

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item"

/** Which checklist function a department name stands for. Keyword guess; the president can change it. */
export function fnForDepartment(name: string): RoleFunction {
  const t = name.toLowerCase()
  if (/advis/.test(t)) return "advisor"
  if (/financ|treasur|budget|fundrais/.test(t)) return "finance"
  if (/market|communic|publicity|social media|design|brand|media/.test(t)) return "marketing"
  if (/outreach|partner|sponsor|external|alumni|corporate|industry|relations/.test(t)) return "outreach"
  if (/record|secretar|admin|operation|compliance/.test(t)) return "secretary"
  if (/member|recruit|community|engagement|culture/.test(t)) return "membership"
  if (/leader|executive|board|president|governance/.test(t)) return "president"
  return "programs"
}

/** Which checklist function a role works as. Leadership titles keep their own; everyone else follows the department. */
export function fnForRole(title: string, dept?: Pick<Department, "fn">): RoleFunction {
  const t = title.toLowerCase()
  if (/\b(advisor|adviser)\b/.test(t)) return "advisor"
  const vice = /\b(vice[- ]?president|vp|evp)\b/.test(t)
  const leadDept = !dept || dept.fn === "president" || dept.fn === "vice_president"
  if (vice) return leadDept ? "vice_president" : dept!.fn
  if (/\bpresident\b/.test(t) && !/\b(past|former|associate|assistant|co)\b/.test(t) && leadDept) return "president"
  return dept?.fn === "president" ? "vice_president" : dept?.fn ?? "programs"
}

/** Departments for a save made before departments existed: one per function the roles already use. */
export function departmentsOf(s: Pick<DemoState, "org" | "roles">): Department[] {
  if (s.org.departments?.length) return s.org.departments
  const used = new Set<RoleFunction>(s.roles.map(r => r.fn === "vice_president" ? "president" : r.fn))
  const list = DEFAULT_DEPARTMENTS.filter(d => used.has(d.fn) || d.fn === "president")
  const missing = s.roles.filter(r => !list.some(d => d.fn === (r.fn === "vice_president" ? "president" : r.fn)) && !(r.fn === "membership" && list.some(d => d.fn === "secretary")))
  return [...list, ...missing.map(r => ({ id: `d-${r.fn}`, name: FUNCTION_LABELS[r.fn], fn: r.fn, duties: DUTY_TEMPLATES[r.fn] }))]
}

export function roleDepartment(depts: Department[], role: Pick<Role, "departmentId" | "fn">): Department | undefined {
  return depts.find(d => d.id === role.departmentId) ?? depts.find(d => d.fn === role.fn) ?? (role.fn === "vice_president" ? depts.find(d => d.fn === "president") : role.fn === "membership" ? depts.find(d => d.fn === "secretary") : undefined)
}

export const dutiesOf = (role: Pick<Role, "duties" | "fn">) => role.duties?.trim() || DUTY_TEMPLATES[role.fn]

/** Number of reporting steps above a role. Stops at a loop so bad data cannot hang the page. */
export function depthOf(roles: Role[], id: string): number {
  let depth = 0, cur = roles.find(r => r.id === id)
  const seen = new Set<string>()
  while (cur?.reportsToId && !seen.has(cur.id)) { seen.add(cur.id); depth++; cur = roles.find(r => r.id === cur!.reportsToId) }
  return depth
}
export function hasReportingLoop(roles: Role[]): boolean {
  return roles.some(r => {
    const seen = new Set<string>([r.id]); let cur = roles.find(x => x.id === r.reportsToId)
    while (cur) { if (seen.has(cur.id)) return true; seen.add(cur.id); cur = roles.find(x => x.id === cur!.reportsToId) }
    return false
  })
}
/** Heads first. Event steps go to the first role with the right function, so the department head should come first. */
export function orderRoles(roles: Role[]): Role[] {
  return roles.map((r, i) => ({ r, i, d: depthOf(roles, r.id) + (r.fn === "advisor" ? 100 : 0) })).sort((a, b) => a.d - b.d || a.i - b.i).map(x => x.r)
}

export function blankPerson(id: string, roleId: string, name = "", template?: Person): Person {
  return {
    id, name, roleId, email: "", channels: template?.channels ?? ["email"], remindAt: template?.remindAt ?? "morning", busyWeeks: [], careerGoal: "", interests: "",
    personalBufferDays: 1, personalBufferEnabled: true, phone: "", asuId: "", expectations: "", freeSlots: [], setupCompletedOn: null,
  }
}
export const demoEmail = (name: string) => `${slug(name).replace(/-/g, ".") || "officer"}@example.org`

/** Setup rows hold one role and, when someone is named, that officer. This edits the pair as one. */
export function setHolder(roles: Role[], people: Person[], roleId: string, patch: Partial<Pick<Person, "name" | "email" | "phone" | "asuId">>): { roles: Role[]; people: Person[] } {
  const role = roles.find(r => r.id === roleId)
  if (!role) return { roles, people }
  const current = people.find(p => p.id === role.holderId)
  const next = { ...(current ?? blankPerson(crypto.randomUUID(), roleId, "", people[0])), ...patch, roleId }
  if (!next.name.trim() && !next.email && !next.phone && !next.asuId) {
    return { roles: roles.map(r => r.id === roleId ? { ...r, holderId: null } : r), people: people.filter(p => p.id !== current?.id) }
  }
  return {
    roles: roles.map(r => r.id === roleId ? { ...r, holderId: next.id } : r),
    people: current ? people.map(p => p.id === current.id ? next : p) : [...people, next],
  }
}
/** Give a named officer a demo address when they have none, so the form does not stop on a field nobody cares about. */
export const fillEmails = (people: Person[]): Person[] => people.map(p => p.name.trim() && !p.email.trim() ? { ...p, email: demoEmail(p.name) } : p)

export function newRole(depts: Department[], title: string, departmentId: string | null, reportsToId: string | null): Role {
  const dept = depts.find(d => d.id === departmentId)
  return { id: `r-${slug(title)}-${crypto.randomUUID().slice(0, 6)}`, displayName: title, fn: fnForRole(title, dept), holderId: null, departmentId, reportsToId, duties: DUTY_TEMPLATES[fnForRole(title, dept)] }
}
export const presidentRole = (roles: Role[]) => roles.find(r => r.fn === "president")

/** Remove a role. People under it move up to its boss; its officer is dropped (their tasks are handled by the caller). */
export function dropRole(roles: Role[], people: Person[], roleId: string): { roles: Role[]; people: Person[] } {
  const gone = roles.find(r => r.id === roleId)
  if (!gone) return { roles, people }
  return {
    roles: roles.filter(r => r.id !== roleId).map(r => r.reportsToId === roleId ? { ...r, reportsToId: gone.reportsToId ?? null } : r),
    people: people.filter(p => p.id !== gone.holderId),
  }
}

/** Work out a role's checklist function again after its title or department changed. There can be only one president. */
export function rederiveFn(all: Role[], r: Role, depts: Department[]): Role {
  const fn = fnForRole(r.displayName, depts.find(d => d.id === r.departmentId))
  return { ...r, fn: fn === "president" && all.some(x => x.id !== r.id && x.fn === "president") ? "vice_president" : fn }
}
/** Roles that sit below this one in the chain, plus the role itself: a role cannot report to any of these. */
export function withBelow(roles: Role[], id: string): Set<string> {
  const out = new Set<string>([id]); let grew = true
  while (grew) { grew = false; for (const r of roles) if (r.reportsToId && out.has(r.reportsToId) && !out.has(r.id)) { out.add(r.id); grew = true } }
  return out
}
