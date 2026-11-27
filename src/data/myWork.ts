import type { DemoState, Node } from "./types"
import { addDays, fromISO, toISO } from "../lib/dates"
import { canLead } from "./permissions"

/**
 * One source of truth for "my open work" (audit D1 + I1, 2026-11-27). The Plan badge in the navigation, the Tasks page's
 * "My tasks" view and the Team page's Workload row all read these selectors, so the numbers a person sees agree.
 * Pure and deterministic: the only date is the demo clock (`state.today`) or the `today` passed in.
 */

/** A two-week action horizon: overdue work and undated administrative tasks count, the rest of the semester's plan does not. */
export function isInActionHorizon(n: Node, today: string) {
  const through = addDays(today, 14)
  const dates = [n.latestStart, n.clubDeadline].filter((date): date is string => !!date)
  return !dates.length || dates.some(date => date <= through)
}

/** The Tasks page horizon: open work in the action horizon, plus work finished since Monday of last week. */
export function isInTaskHorizon(node: Node, today: string): boolean {
  if (node.status === "done") {
    const day = fromISO(today)
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7) - 7) // Monday of last week
    return (node.completedOn ?? node.lastUpdate ?? "") >= toISO(day)
  }
  return isInActionHorizon(node, today)
}

/** Mine: I own it, or a teammate is explicitly waiting on me for it (it sits in my To do; ownership stays with them). */
export const isMine = (n: Node, personId: string) => n.ownerId === personId || n.waitingOnPersonId === personId

/** An open task nobody owns yet ("Anyone (open)"). */
export const isUnclaimedOpen = (n: Node) => n.status === "unclaimed" && !n.ownerId

/** The president or vice president, who can assign open work, and so carries it in their own list until it has an owner. */
export const canAssignOpenWork = (s: DemoState, personId: string) => canLead({ ...s, viewerId: personId })

/** My unfinished tasks in the action horizon, including those a teammate is waiting on me for. */
export function myOpenWork(s: DemoState, personId: string, today = s.today): Node[] {
  return s.nodes.filter(n => n.status !== "done" && isMine(n, personId) && isInActionHorizon(n, today))
}

/** Unfinished tasks with no owner in the same horizon. */
export function unclaimedOpenWork(s: DemoState, today = s.today): Node[] {
  return s.nodes.filter(n => n.status !== "done" && isUnclaimedOpen(n) && isInActionHorizon(n, today))
}

/**
 * Does `n` belong in this person's "My tasks" view (open or recently finished)? Mine, plus, for someone who can assign it,
 * open work with no owner. Other officers find open work under "Team tasks", so it does not inflate their personal count.
 */
export function inMyTasks(s: DemoState, n: Node, personId: string, today = s.today, lead = canAssignOpenWork(s, personId)): boolean {
  return (isMine(n, personId) || (lead && isUnclaimedOpen(n))) && isInTaskHorizon(n, today)
}

/** The open rows of "My tasks": exactly what the Plan badge counts. */
export function myTaskListOpen(s: DemoState, personId: string, today = s.today): Node[] {
  const lead = canAssignOpenWork(s, personId)
  return s.nodes.filter(n => n.status !== "done" && inMyTasks(s, n, personId, today, lead))
}

/** The Plan badge number. */
export const myOpenWorkCount = (s: DemoState, personId: string, today = s.today) => myTaskListOpen(s, personId, today).length
