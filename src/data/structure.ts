import type { Person, Role, RoleFunction } from "./types"

/**
 * Club structure (M4): who reports to whom, and what each role is for. There are no departments: work is shared out by
 * role, and the AI reads every role's duties when it does. Everything here is pure. Setup, Settings, the constitution reader,
 * the organization chart and the AI context all use these same helpers. Dates never appear here: the rule engine owns them.
 */
export const MAX_ROLES = 24
export const MAX_DUTIES = 400

/** Used when the constitution does not say what a role does. The president can edit every line. */
export const DUTY_TEMPLATES: Record<RoleFunction, string> = {
  president: "Leads the club, chairs officer meetings, approves plans and funding requests, and is the main contact for the university.",
  vice_president: "Supports the president, steps in when needed, and keeps the officers working together.",
  finance: "Keeps the budget, submits funding requests, collects receipts and reconciles spending.",
  programs: "Plans and runs events: venue, schedule, speakers and day-of logistics.",
  marketing: "Promotes events and the club: flyers, social posts and the member newsletter.",
  outreach: "Finds and keeps relationships with speakers, sponsors and partner clubs.",
  secretary: "Keeps minutes, the officer list and club records, and files university updates on time.",
  membership: "Recruits and keeps members, and tracks who comes to events.",
  advisor: "Advises the club and signs university forms. Does not take event tasks.",
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item"

/** The kind of club work a title talks about, if it says. */
function topicFn(t: string): RoleFunction | null {
  if (/financ|treasur|budget|fundrais/.test(t)) return "finance"
  if (/market|communic|publicity|social media|design|brand|media/.test(t)) return "marketing"
  if (/outreach|partner|sponsor|external|alumni|corporate|industry|relations/.test(t)) return "outreach"
  if (/record|secretar|admin|compliance/.test(t)) return "secretary"
  if (/member|recruit|engagement|culture/.test(t)) return "membership"
  if (/program|event|workshop|logistic|activit|professional development|operation/.test(t)) return "programs"
  return null
}

/**
 * Which checklist function a role works as, read from its title. Event steps still need an owner by kind of work
 * ("finance", "marketing"...), and this is how a role like "Vice President of Finance" gets the finance steps.
 * Leadership titles keep their own: "President", "Executive Vice President". The president can rename a role and the function follows.
 */
export function fnForRole(title: string): RoleFunction {
  const t = title.toLowerCase()
  if (/\b(advisor|adviser)\b/.test(t)) return "advisor"
  const topic = topicFn(t)
  if (/\b(vice[- ]?president|vp|evp)\b/.test(t)) return topic ?? (/\bof\b/.test(t) ? "programs" : "vice_president")
  if (/\bpresident\b/.test(t) && !/\b(past|former|associate|assistant|co)\b/.test(t) && !topic) return "president"
  return topic ?? "programs"
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
/** Heads first, advisors last. Event steps go to the first role with the right function, so the head should come first. */
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

export function newRole(title: string, reportsToId: string | null): Role {
  const fn = fnForRole(title)
  return { id: `r-${slug(title)}-${crypto.randomUUID().slice(0, 6)}`, displayName: title, fn, holderId: null, reportsToId, duties: DUTY_TEMPLATES[fn] }
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

/** Work out a role's checklist function again after its title changed. There can be only one president. */
export function rederiveFn(all: Role[], r: Role): Role {
  const fn = fnForRole(r.displayName)
  return { ...r, fn: fn === "president" && all.some(x => x.id !== r.id && x.fn === "president") ? "vice_president" : fn }
}
/** Roles that sit below this one in the chain, plus the role itself: a role cannot report to any of these. */
export function withBelow(roles: Role[], id: string): Set<string> {
  const out = new Set<string>([id]); let grew = true
  while (grew) { grew = false; for (const r of roles) if (r.reportsToId && out.has(r.reportsToId) && !out.has(r.id)) { out.add(r.id); grew = true } }
  return out
}

/**
 * A short label with the part that tells roles apart first: "Vice President of Outreach" → "Outreach (VP)". Long titles that
 * all start with "Vice President of" are hard to tell apart in a small list; the area is what matters.
 */
const LEAD_RE = /^(executive vice president|evp|vice president|vp|associate director|assistant director|director|chair|head|lead|manager|coordinator|associate|assistant)\s+(?:of|for)\s+(.+)$/i
const LEAD_ABBR: Record<string, string> = { "executive vice president": "EVP", evp: "EVP", "vice president": "VP", vp: "VP", "associate director": "Assoc. Dir.", "assistant director": "Asst. Dir.", director: "Dir.", chair: "Chair", head: "Head", lead: "Lead", manager: "Mgr.", coordinator: "Coord.", associate: "Assoc.", assistant: "Asst." }
export function roleShort(title: string): string {
  const m = LEAD_RE.exec(title.trim())
  return m ? `${m[2].trim()} (${LEAD_ABBR[m[1].toLowerCase()]})` : title.trim()
}
/** Short labels for a list of roles; if two would look the same, both keep their full title. */
export function roleLabels(roles: Role[]): Map<string, string> {
  const short = roles.map(r => [r.id, roleShort(r.displayName), r.displayName] as const)
  const count = new Map<string, number>()
  for (const [, label] of short) count.set(label.toLowerCase(), (count.get(label.toLowerCase()) ?? 0) + 1)
  return new Map(short.map(([id, label, full]) => [id, (count.get(label.toLowerCase()) ?? 0) > 1 ? full : label]))
}
