import type { DemoState } from "./types"

/** The president or vice president, as the current viewer. Shared by every module that gates on "lead". */
export const canLead = (s: DemoState) => {
  const person = s.people.find(p => p.id === s.viewerId)
  const role = s.roles.find(r => r.id === person?.roleId)
  return role?.holderId === person?.id && (role?.fn === "president" || role?.fn === "vice_president")
}
