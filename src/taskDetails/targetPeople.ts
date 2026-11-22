import type { DemoState } from "../data/types"
import { isOfficer } from "../data/permissions"
import { leaders } from "../data/taskWorkflow"
import { targetImpact } from "./targetDates"

export function suggestedTargetPeople(s: DemoState, nodeId: string, date: string) {
  const affected = targetImpact(s, nodeId, date).affected, lead = new Set(leaders(s))
  return s.people.filter(p => isOfficer(p) && (lead.has(p.id) || affected.some(n => n.ownerId === p.id))).map(p => ({ person: p, lead: lead.has(p.id), tasks: affected.filter(n => n.ownerId === p.id) }))
}

