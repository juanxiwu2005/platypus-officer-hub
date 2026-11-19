import type { DemoState } from "../data/types"
import { isOfficer } from "../data/permissions"
import type { TaskAccessGrant } from "./accessContracts"

/** Navigation never supplies a trusted actor. The optional grant remains scoped to its original task. */
export function planTaskPath(eventId: string | null | undefined, nodeId: string, access?: string, from?: string) {
  const params = new URLSearchParams()
  if (eventId) params.set("event", eventId)
  params.set("node", nodeId)
  if (access) params.set("access", access)
  if (from) params.set("from", from)
  return `${eventId ? "/events" : "/tasks"}?${params}`
}

/** Mail contains only the canonical initial destination, with no action or arbitrary return URL. */
export function isPlanTaskHash(hash: string): boolean {
  const event = hash.startsWith("#/events?"), tasks = hash.startsWith("#/tasks?")
  if (!event && !tasks) return false
  const params = new URLSearchParams(hash.slice(hash.indexOf("?") + 1))
  const keys = event ? ["event", "node", "access"] : ["node", "access"]
  return [...params].length === keys.length && keys.every(key => !!params.get(key))
    && [...params.keys()].every(key => keys.includes(key))
    && /^[\w.%~-]+$/.test(params.get("access")!)
}

export const hasPlanMember = (state: DemoState) => state.people.some(person => person.id === state.viewerId && isOfficer(person))

export function resolvePlanEntry(state: DemoState, params: URLSearchParams, grant?: TaskAccessGrant, checking = false, surface: "events" | "tasks" = "events") {
  const linked = params.has("node") || params.has("access") || params.has("from")
  const node = state.nodes.find(item => item.id === params.get("node"))
  const event = state.events.find(item => item.id === node?.eventId)
  const origin = state.nodes.find(item => item.id === (grant?.nodeId ?? params.get("from")))
  const hasAccess = params.has("access")
  let error: string | null = null
  if (linked && !(hasAccess && checking)) {
    if (hasAccess && !grant) error = "This task link is unavailable, expired, or the task has been reassigned. Ask your club lead for a fresh link."
    else if (hasAccess && !hasPlanMember(state)) error = "Open this task in your current club workspace to view Plan."
    else if (!node || (hasAccess && !origin) || (params.has("from") && (!origin || (grant && params.get("from") !== origin.id)))
      || (surface === "events" && (!event || (params.has("event") && params.get("event") !== event.id) || (origin && origin.eventId !== event.id)))
      || (surface === "tasks" && params.has("event"))) error = surface === "events" ? "This task is not available in this event. Choose a task from Plan." : "This task is not available. Choose a task from Plan."
  }
  return { linked, node, event, origin, error, checking: hasAccess && checking, grant, readOnly: hasAccess && node?.id !== grant?.nodeId }
}
