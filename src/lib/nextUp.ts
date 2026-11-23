import type { DemoState, Node } from "../data/types"
import type { Schedule } from "../engine/schedule"
import type { Forecast } from "../engine/forecast"
import { worstIssue } from "../pages/helpers"

/** Why a step is in the event's "Next up" strip, most urgent first. */
export type NextUpReason = "risk" | "watch" | "start"
export interface NextUpRow { node: Node; reason: NextUpReason; club: string }

const RANK: Record<NextUpReason, number> = { risk: 0, watch: 1, start: 2 }

/**
 * The event's unfinished steps that need someone now (S3). Ranked: at risk (the flow's red dot: a schedule error,
 * a red forecast, blocked, or past its club deadline), then a yellow forecast or schedule warning, then steps whose
 * engine latest start is today or earlier. Ties go to the earlier club deadline. Every date is the rule engine's.
 */
export function nextUp(state: DemoState, sched: Schedule, forecast: Forecast, eventId: string, limit = 5): NextUpRow[] {
  const rows: NextUpRow[] = []
  for (const node of state.nodes) {
    if (node.eventId !== eventId || node.status === "done") continue
    const plan = sched.nodes[node.id]
    if (!plan) continue
    const issue = worstIssue(plan.issues)?.severity
    const color = forecast.nodes[node.id]?.color
    const reason: NextUpReason | null = issue === "error" || color === "red" || node.status === "blocked" || plan.club < state.today ? "risk"
      : issue === "warn" || color === "yellow" ? "watch"
      : plan.latestStart <= state.today ? "start" : null
    if (reason) rows.push({ node, reason, club: plan.club })
  }
  return rows
    .sort((a, b) => RANK[a.reason] - RANK[b.reason] || a.club.localeCompare(b.club) || a.node.title.localeCompare(b.node.title))
    .slice(0, limit)
}
