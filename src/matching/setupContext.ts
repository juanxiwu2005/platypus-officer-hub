import type { DemoState } from "../data/types"

/** The existing invitation changes for each completed setup, even when the demo reuses names, IDs and date. */
export function matchingSetupContext(state: Pick<DemoState, "org" | "roles" | "people">, separate = ""): string {
  return JSON.stringify([state.org.id, state.org.name, state.org.setupCompletedOn, state.org.inviteCode,
    state.roles.map(r => r.id).sort(), state.people.map(p => [p.id, p.roleId, p.leftOn ?? null, p.incomingFor ?? null]).sort(), separate])
}
