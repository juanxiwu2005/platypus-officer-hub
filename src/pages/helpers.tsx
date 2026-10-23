import type { DemoState, Node, NodeStatus } from "../data/types"
import type { Issue, Severity } from "../engine/schedule"

type Tone = "" | "good" | "warn" | "late" | "accent"

export const STATUS_LABEL: Record<NodeStatus, { text: string; tone: Tone }> = {
  unclaimed: { text: "No owner", tone: "late" },
  accepted: { text: "Claimed", tone: "" },
  in_progress: { text: "In progress", tone: "accent" },
  waiting: { text: "Waiting on someone", tone: "warn" },
  blocked: { text: "Stuck", tone: "late" },
  done: { text: "Done", tone: "good" },
}

/** Status text for a node; an unclaimed node with a proposed owner reads "Not claimed yet". */
export function statusOf(n: Node): { text: string; tone: Tone } {
  if (n.status === "unclaimed" && n.ownerId) return { text: "Not claimed yet", tone: "warn" }
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
