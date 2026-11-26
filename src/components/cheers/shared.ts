import type { Cheer, DemoState } from "../../data/types"
import { addDays, fmtShort, fromISO } from "../../lib/dates"

/**
 * Small helpers shared by the Cheers screens (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §5). Display only: every rule
 * (who may send, allowance, term totals, privacy) lives in src/data/cheers.ts.
 */

/** The Monday of the demo week that contains `iso`. */
export const mondayOf = (iso: string): string => addDays(iso, -((fromISO(iso).getDay() + 6) % 7))
export const fullName = (s: Pick<DemoState, "people">, id: string): string => s.people.find(p => p.id === id)?.name ?? "A former officer"
export const firstName = (name: string): string => name.split(" ")[0]
export const joinNames = (names: string[]): string => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`

/** Whether the viewer received this cheer ("in") or sent it ("out"). Nobody cheers themselves, so it is never both. */
export const directionOf = (c: Cheer, viewerId: string): "in" | "out" => c.fromId === viewerId ? "out" : "in"
/** The other side of a cheer, as the viewer sees it: the sender of a received cheer, the recipients of a sent one. */
export const otherIds = (c: Cheer, viewerId: string): string[] => directionOf(c, viewerId) === "out" ? c.toIds : [c.fromId]
export function otherLabel(s: Pick<DemoState, "people">, c: Cheer, viewerId: string): string {
  const ids = otherIds(c, viewerId)
  const first = firstName(fullName(s, ids[0]))
  return ids.length > 1 ? `${first} +${ids.length - 1}` : first
}
/** "+25" for a received cheer; "−50" for a sent one (points × recipients, what it cost the sender). */
export const pointsLabel = (c: Cheer, viewerId: string): string => directionOf(c, viewerId) === "out" ? `−${c.points * c.toIds.length}` : `+${c.points}`
/** "Today", a weekday earlier this week ("Thu"), or a date ("Oct 14"): short, so Team keeps within its word budget. */
export const dayLabel = (on: string, today: string): string => on === today ? "Today"
  : on < today && on >= mondayOf(today) ? fromISO(on).toLocaleDateString("en-US", { weekday: "short" }) : fmtShort(on)
export function taskLabel(s: Pick<DemoState, "nodes">, nodeId: string | undefined): string | null {
  if (!nodeId) return null
  return s.nodes.find(n => n.id === nodeId)?.title ?? null
}

/** A short status message in the shared toast (Layout listens), so it outlives the panel that sent it. */
export function toast(text: string) {
  window.dispatchEvent(new CustomEvent("platypus:toast", { detail: text }))
}
/**
 * Open Give points in the right rail from a surface that may render outside the rail's provider (Task Details also
 * renders on the standalone task page). Layout listens; with no Layout on screen nothing happens.
 */
export function openGiveCheer(detail: { toIds?: string[]; nodeId?: string }) {
  window.dispatchEvent(new CustomEvent("platypus:give-cheer", { detail }))
}
