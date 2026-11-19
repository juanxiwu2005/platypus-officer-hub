import type { DemoState } from "../data/types"
import { isOfficer } from "../data/permissions"
import type { TaskAccessGrant } from "./accessContracts"

/** Navigation never supplies a trusted actor. The optional grant remains scoped to its original task. */
export function planTaskPath(eventId: string, nodeId: string, access?: string, from?: string) {
  const params = new URLSearchParams({ event: eventId, node: nodeId })
  if (access) params.set("access", access)
  if (from) params.set("from", from)
  return `/events?${params}`
}

/** Mail contains only the canonical initial destination, with no action or arbitrary return URL. */
export function isPlanTaskHash(hash: string): boolean {
  if (!hash.startsWith("#/events?")) return false
  const params = new URLSearchParams(hash.slice(hash.indexOf("?") + 1))
  return [...params].length === 3 && ["event", "node", "access"].every(key => !!params.get(key))
    && [...params.keys()].every(key => ["event", "node", "access"].includes(key))
    && /^[\w.%~-]+$/.test(params.get("access")!)
}

export const hasPlanMember = (state: DemoState) => state.people.some(person => person.id === state.viewerId && isOfficer(person))

export function resolvePlanEntry(state: DemoState, params: URLSearchParams, grant?: TaskAccessGrant, checking = false) {
  const linked = params.has("node") || params.has("access") || params.has("from")
  const node = state.nodes.find(item => item.id === params.get("node"))
  const event = state.events.find(item => item.id === node?.eventId)
  const origin = state.nodes.find(item => item.id === (grant?.nodeId ?? params.get("from")))
  const hasAccess = params.has("access")
  const error = !linked || (hasAccess && checking) ? null
    : hasAccess && !grant ? "This task link is unavailable, expired, or the task has been reassigned. Ask your club lead for a fresh link."
    : hasAccess && !hasPlanMember(state) ? "Open this task in your current club workspace to view the event plan."
    : !node || !event || (params.has("event") && params.get("event") !== event.id)
      || (hasAccess && (!origin || origin.eventId !== event.id || (params.has("from") && params.get("from") !== origin.id)))
      || (params.has("from") && (!origin || origin.eventId !== event.id)) ? "This task is not available in this event. Choose a task from Plan."
    : null
  return { linked, node, event, origin, error, checking: hasAccess && checking, grant, readOnly: hasAccess && node?.id !== grant?.nodeId }
}
