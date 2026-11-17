import type { Person, Role } from "../../../data/types"
import { validateProfile, validateRoles, type ClubDraft } from "../../../data/settings"
import { MAX_DUTIES, MAX_ROLES, dropRole, fillEmails, newRole, orderRoles, presidentRole, rederiveFn, setHolder, withBelow } from "../../../data/structure"
import { structureFromRead, type ConstitutionRead } from "../../../lib/constitution"
import { onboardingCopy } from "../../copy"

/**
 * The Team screen edits the draft's roles and people as rows of two cells (Role, Person). Everything here is pure so it can be tested without a page.
 * No email, phone or ASU ID is asked: an email is made from the name when the screen is left (fillEmails), the rest are left blank for the officer.
 */
const c = onboardingCopy.founder.team

/** Rename a role. The president stays the president whatever the title says; other roles follow their title (it decides which event steps they get). */
export function renameRole(roles: Role[], id: string, title: string): Role[] {
  return roles.map(r => r.id !== id ? r : r.fn === "president" ? { ...r, displayName: title } : rederiveFn(roles, { ...r, displayName: title }))
}

/**
 * Set the name of the person in a role. An empty name makes the role an open position (the person is removed). A new name drops the old demo
 * email so a fresh one is made from the new name when the screen is left.
 */
export function setPersonName(roles: Role[], people: Person[], roleId: string, name: string): { roles: Role[]; people: Person[] } {
  if (!name.trim()) return setHolder(roles, people, roleId, { name: "", email: "", phone: "", asuId: "" })
  return setHolder(roles, people, roleId, { name, email: "" })
}

/** A depth-first display order: every role appears immediately after its parent and that parent's existing descendants. */
export function treeOrderRoles(roles: Role[]): Role[] {
  const source = orderRoles(roles)
  const known = new Set(source.map(r => r.id))
  const children = new Map<string, Role[]>()
  const roots: Role[] = []
  for (const role of source) {
    if (!role.reportsToId || !known.has(role.reportsToId)) roots.push(role)
    else children.set(role.reportsToId, [...(children.get(role.reportsToId) ?? []), role])
  }
  const out: Role[] = [], seen = new Set<string>()
  const visit = (role: Role) => {
    if (seen.has(role.id)) return
    seen.add(role.id); out.push(role)
    for (const child of children.get(role.id) ?? []) visit(child)
  }
  for (const root of roots) visit(root)
  for (const role of source) visit(role)
  return out
}

/** Change who a role reports to, then place its full subtree immediately after the new parent. */
export function setReportsTo(roles: Role[], id: string, bossId: string | null): Role[] {
  if (bossId && withBelow(roles, id).has(bossId)) return roles
  return treeOrderRoles(roles.map(r => r.id === id ? { ...r, reportsToId: bossId } : r))
}

export const setDuties = (roles: Role[], id: string, duties: string): Role[] => roles.map(r => r.id === id ? { ...r, duties: duties.slice(0, MAX_DUTIES) } : r)

/** The roles a role may report to: not itself and not anything below it (no loops). */
export const bossChoices = (roles: Role[], id: string): Role[] => { const below = withBelow(roles, id); return roles.filter(r => !below.has(r.id)) }

/** Depth in the reporting tree. Invalid or cyclic links safely render at the top level until the user fixes them. */
export function roleDepth(roles: Role[], id: string): number {
  const seen = new Set<string>()
  let depth = 0
  let role = roles.find(r => r.id === id)
  while (role?.reportsToId) {
    if (seen.has(role.id) || depth >= roles.length) return 0
    seen.add(role.id)
    const boss = roles.find(r => r.id === role!.reportsToId)
    if (!boss) return 0
    depth += 1
    role = boss
  }
  return depth
}

/** Add a role that reports to the president. Titles must differ, so "New role", "New role 2", ... */
export function addRole(roles: Role[]): { roles: Role[]; id: string } | null {
  if (roles.length >= MAX_ROLES) return null
  const taken = new Set(roles.map(r => r.displayName.trim().toLowerCase()))
  let title: string = c.newRole, n = 2
  while (taken.has(title.toLowerCase())) title = `${c.newRole} ${n++}`
  const role = newRole(title, presidentRole(roles)?.id ?? null)
  return { roles: treeOrderRoles([...roles, role]), id: role.id }
}

/** The president cannot be removed: the rest of the app needs one. */
export function removeRole(roles: Role[], people: Person[], id: string): { roles: Role[]; people: Person[] } {
  if (roles.find(r => r.id === id)?.fn === "president") return { roles, people }
  return dropRole(roles, people, id)
}

/** What stops Continue, and the people with their demo emails filled in. The messages come from the same rules the rest of the app uses. */
export function validateTeam(club: Pick<ClubDraft, "roles" | "people">): { error: string | null; people: Person[] } {
  const people = fillEmails(club.people)
  const error = validateRoles(club.roles, people)
    ?? people.map(p => validateProfile({ ...p, asuId: p.asuId ?? "" })).find(Boolean)
    ?? (new Set(people.map(p => p.name.trim().toLowerCase())).size !== people.length ? c.sameName : null)
  return { error: error ?? null, people }
}

/** Use the AI's reading of the constitution: same result as the classic setup page's "Use these suggestions". */
export function applyReading(club: ClubDraft, read: ConstitutionRead, missionTouched: boolean): ClubDraft {
  const built = structureFromRead(read, { roles: club.roles, people: club.people })
  return { ...club, roles: built.roles, people: built.people, mission: read.source === "ai" && read.mission && !missionTouched ? read.mission : club.mission }
}
