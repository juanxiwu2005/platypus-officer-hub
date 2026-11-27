import type { DemoState, Person } from "../../data/types"
import { isOfficer } from "../../data/permissions"

/** The person the demo opens as: whoever holds the president role (the seed's Alex, or the founder after setup). */
export function defaultViewerId(s: Pick<DemoState, "roles" | "people">): string | undefined {
  return s.roles.find(r => r.fn === "president" && r.holderId)?.holderId ?? s.people[0]?.id
}

/** "Treasurer", or "incoming Treasurer" for someone taking a role over. */
export function viewerRole(s: Pick<DemoState, "roles">, p: Person): string {
  const role = s.roles.find(r => r.id === p.roleId)?.displayName ?? ""
  return p.incomingFor ? `incoming ${role}` : role
}

/** The people "View as" offers: officers, incoming officers, and whoever is being viewed now. */
export const viewAsPeople = (s: Pick<DemoState, "people" | "viewerId">): Person[] =>
  s.people.filter(p => isOfficer(p) || p.incomingFor || p.id === s.viewerId)
