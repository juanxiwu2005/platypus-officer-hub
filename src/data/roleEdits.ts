import type { Person, Role } from "./types"
import { MAX_ROLES, newRole, rederiveFn, withBelow } from "./structure"

/**
 * The edits Settings → Roles & teams makes to the ClubSettings draft, shared by the contact list (RolesTable) and the chart's
 * inspector so both keep the same rules. Pure: the draft is saved by ClubSettings' autosave (saveClubSettings), with Undo.
 */
export type PersonPatch = Partial<Pick<Person, "name" | "email" | "phone" | "asuId">>

/** A renamed role works out its checklist function again (`reFn`); there is still only one president. */
export const patchRole = (roles: Role[], id: string, patch: Partial<Role>, reFn = false): Role[] =>
  roles.map(r => r.id === id ? (reFn ? rederiveFn(roles, { ...r, ...patch }) : { ...r, ...patch }) : r)
export const patchPerson = (people: Person[], id: string, patch: PersonPatch): Person[] => people.map(p => p.id === id ? { ...p, ...patch } : p)
/** ASU IDs are digits only (the input also caps them at 10). */
export const asuDigits = (value: string) => value.replace(/\D/g, "")
/** Roles this one may report to: never itself or a role below it, so the chain cannot loop. */
export const reportsToChoices = (roles: Role[], id: string): Role[] => { const below = withBelow(roles, id); return roles.filter(x => !below.has(x.id)) }
export const bossTitle = (roles: Role[], role: Role) => roles.find(x => x.id === role.reportsToId)?.displayName ?? "Nobody (top)"
export const holderOf = (people: Person[], role: Role) => people.find(p => p.id === role.holderId)
export const canAddRole = (roles: Role[]) => roles.length < MAX_ROLES
/** A new role reports to the president. */
export function addRole(roles: Role[]): { roles: Role[]; role: Role } {
  const role = newRole("New role", roles.find(r => r.fn === "president")?.id ?? null)
  return { roles: [...roles, role], role }
}
/** Only an open position that is not the president can be removed here; officers' roles are closed in Handoff. */
export const canRemoveRole = (role: Role, people: Person[]) => !holderOf(people, role) && role.fn !== "president"
export const removeRole = (roles: Role[], id: string): Role[] => roles.filter(x => x.id !== id)
export const allEmails = (roles: Role[], people: Person[]) => roles.map(r => holderOf(people, r)?.email ?? "").filter(Boolean).join(", ")
