import type { DemoState, Node, NodeStatus } from "../data/types"
import type { Issue, Severity } from "../engine/schedule"

type Tone = "" | "good" | "warn" | "late" | "accent"

export const STATUS_LABEL: Record<NodeStatus, { text: string; tone: Tone }> = {
  unclaimed: { text: "Not claimed", tone: "" },
  accepted: { text: "To do", tone: "accent" },
  in_progress: { text: "Working on it", tone: "warn" },
  waiting: { text: "Waiting", tone: "warn" },
  blocked: { text: "Stuck", tone: "late" },
  done: { text: "Done", tone: "good" },
}

/** Default status words (v1.1). The board's custom labels are applied by <StatusPill>. */
export function statusOf(n: Node): { text: string; tone: Tone } {
  return STATUS_LABEL[n.status]
}

/** CSS status class: an unclaimed step with a proposed owner is "proposed" (amber), with no owner "unclaimed" (red). */
export const statusClass = (n: Node) => `st-${n.status === "unclaimed" && n.ownerId ? "proposed" : n.status}`

export const SEVERITY_TONE: Record<Severity, Tone> = { error: "late", warn: "warn", info: "" }
export const SEVERITY_RANK: Record<Severity, number> = { error: 0, warn: 1, info: 2 }

/** The most serious issue on a node, if any (ignores info). */
export function worstIssue(issues: Issue[] | undefined): Issue | null {
  const real = (issues ?? []).filter(i => i.severity !== "info")
  if (!real.length) return null
  return real.reduce((a, b) => (SEVERITY_RANK[b.severity] < SEVERITY_RANK[a.severity] ? b : a))
}

export const personName = (s: DemoState, id: string | null) => s.people.find(p => p.id === id)?.name ?? "No owner"
export const firstName = (s: DemoState, id: string | null) => s.people.find(p => p.id === id)?.name.split(" ")[0] ?? "No owner"
export const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2)
export const roleName = (s: DemoState, roleId: string | null) => s.roles.find(r => r.id === roleId)?.displayName ?? "—"
