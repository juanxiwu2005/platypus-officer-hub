import type { DemoState, NodeStatus } from "../data/types"

export const STATUS_LABEL: Record<NodeStatus, { text: string; tone: "" | "good" | "warn" | "late" | "accent" }> = {
  unclaimed: { text: "No owner", tone: "late" },
  accepted: { text: "Claimed", tone: "" },
  in_progress: { text: "In progress", tone: "accent" },
  waiting: { text: "Waiting on someone", tone: "warn" },
  blocked: { text: "Stuck", tone: "late" },
  done: { text: "Done", tone: "good" },
}

export const personName = (s: DemoState, id: string | null) => s.people.find(p => p.id === id)?.name ?? "No owner"
export const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2)
export const roleName = (s: DemoState, roleId: string) => s.roles.find(r => r.id === roleId)?.displayName ?? roleId
