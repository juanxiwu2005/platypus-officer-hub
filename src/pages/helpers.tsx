import type { DemoState } from "../data/types"
import type { Issue, Severity } from "../engine/schedule"

type Tone = "" | "good" | "warn" | "late" | "accent"

export const SEVERITY_TONE: Record<Severity, Tone> = { error: "late", warn: "warn", info: "" }
export const SEVERITY_RANK: Record<Severity, number> = { error: 0, warn: 1, info: 2 }

/** The most serious issue on a node, if any (ignores info). */
export function worstIssue(issues: Issue[] | undefined): Issue | null {
  const real = (issues ?? []).filter(i => i.severity !== "info")
  if (!real.length) return null
  return real.reduce((a, b) => (SEVERITY_RANK[b.severity] < SEVERITY_RANK[a.severity] ? b : a))
}

export const firstName = (s: DemoState, id: string | null) => s.people.find(p => p.id === id)?.name.split(" ")[0] ?? "No owner"
export const roleName = (s: DemoState, roleId: string | null) => s.roles.find(r => r.id === roleId)?.displayName ?? "—"
