import type { Node } from "../data/types"
import type { NodePlan } from "../engine/schedule"
import { isBusinessDay } from "../engine/calendar"
import { officialLabel } from "../engine/taskDates"
import { addDays, fmtShort } from "./dates"

/**
 * FB-4 (docs/feedback-fix/PLAN.md §6.1): the interface shows one date, "Due", which is the club deadline.
 * The engine still computes the ASU deadline and the latest start; these sentences only word them for the
 * collapsed "Why this date" section. Every date here comes from the engine's plan. Nothing here makes up a date.
 */

/** The one date a person sees: the engine's club deadline. */
export const dueOf = (node: Pick<Node, "clubDeadline">, plan?: Pick<NodePlan, "club"> | null): string | null => plan?.club ?? node.clubDeadline ?? null

/** Overdue: an open task whose Due is before today. */
export const isLate = (node: Pick<Node, "status">, due: string | null, today: string) => node.status !== "done" && !!due && due < today

/** ASU working days after `from`, up to and including `to` (0 when `to` is not later). */
export function workingDaysBetween(from: string, to: string): number {
  let n = 0
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (isBusinessDay(d)) n++
  return n
}

const days = (n: number) => `${n} working day${n === 1 ? "" : "s"}`

/**
 * "ASU needs this by Apr 2. Your club finishes 3 working days earlier." Only for a step an ASU rule dates;
 * a hand-made task's fixed date is the person's own due date, not an ASU deadline, so it gets nothing.
 */
export function asuSentence(node: Pick<Node, "eventId" | "anchor">, plan: Pick<NodePlan, "official" | "club"> | null | undefined): string | null {
  if (!plan?.official || officialLabel(node) !== "ASU deadline") return null
  const asu = `ASU needs this by ${fmtShort(plan.official)}.`
  if (plan.club > plan.official) return `${asu} Your club's Due is after it.`
  const gap = workingDaysBetween(plan.club, plan.official)
  return gap > 0 ? `${asu} Your club finishes ${days(gap)} earlier.` : `${asu} Your club finishes the same day.`
}

/** Someone else's task: the owner's private planning preferences stay private, so no date and no buffer. */
export const OTHERS_REMINDER = "Reminder goes out a few working days before Due, allowing for effort and private planning preferences; skips ASU nonworking days."

/** When the reminder goes out (the engine's latest start). Only the owner sees the date and the reason. */
export function reminderSentence(node: Pick<Node, "ownerId">, plan: Pick<NodePlan, "latestStart" | "explain"> | null | undefined, viewerId: string): string {
  if (!plan?.latestStart || node.ownerId !== viewerId) return OTHERS_REMINDER
  return `Reminder goes out ${fmtShort(plan.latestStart)}.`
}
