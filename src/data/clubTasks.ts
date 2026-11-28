import type { DemoState, Event, Node } from "./types"
import { placementOf, resolveBranches } from "../engine/workflowBranches"
import { fmtShort } from "../lib/dates"

/**
 * Club tasks and event tasks (Juanxi, 2026-11-28). An event task is a step of an event's workflow; only the president or VP edits
 * that workflow. Everything made on the Tasks page is a club task. Its maker may link it to an upcoming event: it then also sits at
 * the end of its owner's branch, before the event day, in that event's flow, and keeps its own due date.
 */
export const isClubTask = (n: Pick<Node, "eventId" | "clubTask">) => !n.eventId || !!n.clubTask
export const taskKind = (n: Pick<Node, "eventId" | "clubTask">): "club" | "event" => isClubTask(n) ? "club" : "event"

/** Events a new club task may link to: those still ahead, soonest first. */
export const linkableEvents = (s: DemoState): Event[] => s.events.filter(e => e.date > s.today).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))

export interface LinkBranch { branchId: string; title: string; order: number; teamId?: string; how: "owner" | "role" | "default" }
/**
 * Where a linked club task goes in the event's flow: the before-event branch where its owner has the most steps in this event
 * (ties: the earlier branch), else the branch whose default role is theirs, else the Event lead branch. It goes after the last
 * step there. A team-track event also gets the owner's team the same way.
 */
export function linkBranch(s: DemoState, event: Event, ownerId: string | null): LinkBranch | null {
  const steps = s.nodes.filter(n => n.eventId === event.id)
  const before = resolveBranches(steps, event.workflowBranches).filter(b => b.side === "before_event" && b.id !== "main")
  if (!before.length) return null
  const roleId = s.people.find(p => p.id === ownerId)?.roleId
  const count = (b: { id: string }) => steps.filter(n => !n.clubTask && n.ownerId && n.ownerId === ownerId && placementOf(n).branchId === b.id).length
  const owned = before.filter(b => count(b) > 0).sort((a, b) => count(b) - count(a) || a.order - b.order)[0]
  const byRole = roleId ? before.find(b => b.defaultRoleId === roleId) : undefined
  const branch = owned ?? byRole ?? before.find(b => b.id === "event-lead") ?? before[0]
  const order = Math.max(-1, ...steps.filter(n => placementOf(n).branchId === branch.id).map(n => placementOf(n).order)) + 1
  const teams = new Map<string, number>()
  for (const n of steps) if (n.teamId && ownerId && n.ownerId === ownerId) teams.set(n.teamId, (teams.get(n.teamId) ?? 0) + 1)
  const teamId = [...teams].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? (roleId && event.workflowRun ? s.org.workflowRoleTeams?.[roleId] : undefined)
  return { branchId: branch.id, title: branch.title, order, ...(teamId ? { teamId } : {}), how: owned ? "owner" : byRole ? "role" : "default" }
}

/** Why a club task cannot link to this event with this due date, or null. A linked task is due before the event day. */
export function linkError(s: DemoState, eventId: string, due: string): string | null {
  const event = linkableEvents(s).find(e => e.id === eventId)
  if (!event) return "Pick an upcoming event."
  return due < event.date ? null : `Pick a due date before ${event.name} on ${fmtShort(event.date)}.`
}
