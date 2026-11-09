import type { DemoState, RoleTerm } from "./types"

/**
 * Keeps `roleTerms` in step with the rest of the state (Handoff stage 3). It runs after every action, so no reducer has to
 * remember to write terms, and it returns the SAME object when nothing needs to change (callers rely on that to detect refused actions).
 *
 *  - active   = the role's current holder (`Role.holderId`); a term whose person no longer holds the role becomes former.
 *  - incoming = the person an unfinished handoff has named (`RoleHandoff.incomingId`); when that person becomes the holder, the
 *               incoming term turns into the active one, otherwise it ends.
 *  - former   = anyone marked `leftOn` who has no former term yet.
 * A new person named for a role who is no longer named by any open handoff is removed (or, if they already own work, kept as a former officer).
 */
export function normalizeTerms(s: DemoState): DemoState {
  const first = s.roleTerms === undefined
  const noArchive = s.archivedRoles === undefined
  const old: RoleTerm[] = s.roleTerms ?? []
  const stamp = first ? null : s.today
  const holder = new Map(s.roles.map(r => [r.id, r.holderId]))
  const named = new Map<string, string>()
  for (const h of s.handoffRoles) if (!h.completed && h.incomingId && holder.has(h.roleId)) named.set(h.roleId, h.incomingId)
  const people = new Set(s.people.map(p => p.id))
  const seasonOf = (roleId: string, personId: string) => s.handoff && s.handoffRoles.some(h => h.roleId === roleId && h.incomingId === personId) ? s.handoff.id : null

  let changed = first || noArchive
  const terms: RoleTerm[] = []
  const has = (status: RoleTerm["status"], roleId: string, personId: string) => terms.some(t => t.status === status && t.roleId === roleId && t.personId === personId)
  const nextId = (roleId: string, personId: string) => `term:${roleId}:${personId}:${old.length + terms.length + 1}`

  for (const t of old) {
    if (t.status === "active") {
      if (holder.get(t.roleId) === t.personId) terms.push(t)
      else { terms.push({ ...t, status: "former", to: s.today }); changed = true }
    } else if (t.status === "incoming") {
      if (holder.get(t.roleId) === t.personId) { terms.push({ ...t, status: "active", from: s.today }); changed = true }
      else if (named.get(t.roleId) === t.personId && people.has(t.personId)) terms.push(t)
      else changed = true // no longer named: the term ends without ever having started
    } else terms.push(t)
  }
  for (const r of s.roles) {
    if (r.holderId && !has("active", r.id, r.holderId)) { terms.push({ id: nextId(r.id, r.holderId), roleId: r.id, personId: r.holderId, status: "active", from: stamp, to: null, handoffId: seasonOf(r.id, r.holderId) }); changed = true }
  }
  for (const [roleId, personId] of named) {
    if (holder.get(roleId) !== personId && !has("incoming", roleId, personId)) { terms.push({ id: nextId(roleId, personId), roleId, personId, status: "incoming", from: s.today, to: null, handoffId: s.handoff?.id ?? null }); changed = true }
  }
  // A named-for-a-role person nobody names any more.
  const stale = s.people.filter(p => p.incomingFor && !terms.some(t => t.status === "incoming" && t.personId === p.id))
  let people2 = s.people
  if (stale.length) {
    const owns = (id: string) => s.nodes.some(n => n.ownerId === id)
    people2 = s.people.flatMap(p => {
      if (!stale.includes(p)) return [p]
      if (!owns(p.id) && p.id !== s.viewerId) return []
      const { incomingFor: _gone, ...rest } = p
      return [{ ...rest, leftOn: s.today }]
    })
    changed = true
  }
  for (const p of people2) {
    if (p.leftOn && !terms.some(t => t.personId === p.id && t.status === "former")) { terms.push({ id: nextId(p.roleId, p.id), roleId: p.roleId, personId: p.id, status: "former", from: null, to: p.leftOn, handoffId: null }); changed = true }
  }

  return changed ? { ...s, roleTerms: terms, people: people2, archivedRoles: s.archivedRoles ?? [] } : s
}
