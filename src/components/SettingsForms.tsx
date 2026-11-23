import type { DemoState } from "../data/types"
import { dutiesOf } from "../data/structure"

/** What a member's role is, in the club's own words: who it reports to and its duties. Everyone sees the same text the president set. */
export function RoleCard({ state, personId }: { state: DemoState; personId: string }) {
  const person = state.people.find(p => p.id === personId)
  const role = state.roles.find(r => r.id === person?.roleId)
  if (!role) return null
  const boss = state.roles.find(r => r.id === role.reportsToId)
  return <section className="role-card" data-testid="role-card" aria-label="Your role">
    <p><b>{role.displayName}</b>{boss ? ` · reports to ${boss.displayName}` : ""}</p>
    <p className="small muted">{dutiesOf(role)}</p>
  </section>
}
