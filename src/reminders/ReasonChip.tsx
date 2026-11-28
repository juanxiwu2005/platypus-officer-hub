import { StatusPill } from "../components/ui"
import { Icons } from "../components/icons"
import type { NodeStatus } from "../data/types"

/**
 * R-S0 W2: the reminder page shows two kinds of words beside a task.
 * - A reminder reason ("5 days overdue", "No start update") is a fact about timing, not a status: one neutral chip.
 * - A problem that is a real task status uses the shared StatusPill with its fixed name and colour (AGENTS.md 6, S3).
 *   "No owner" is the Not claimed status; "Stuck" is the Stuck status.
 */
const STATUS_PROBLEM: Record<string, NodeStatus> = { "No owner": "unclaimed", Stuck: "blocked" }

export function ReasonChip({ label }: { label: string }) {
  return <span className="dg-chip" data-testid="rq-reason">{label}</span>
}

/** A Fix first problem: the status pill when the problem is a task status, otherwise the neutral reason chip. */
export function ProblemChip({ problem }: { problem: string }) {
  const status = STATUS_PROBLEM[problem]
  return status ? <StatusPill status={status} /> : <ReasonChip label={problem} />
}

/** The line icon at the start of a Fix first row (2026-11-28). Decorative: the chip beside it names the problem. */
const PROBLEM_ICON: Record<string, JSX.Element> = { "No owner": Icons.person, "Waiting on whom?": Icons.wait, Stuck: Icons.stuck, "No valid email": Icons.mail }
export const problemIcon = (problem: string) => PROBLEM_ICON[problem] ?? Icons.alert
