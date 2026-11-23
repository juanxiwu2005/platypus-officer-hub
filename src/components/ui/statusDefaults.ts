import type { NodeStatus } from "../../data/types"

/** The six fixed status words and colours (v1.1; fixed in S3, 2026-11-23). Kept free of React so the store can use them. Every colour keeps white text at WCAG AA contrast (4.5:1). */
export const STATUS_ORDER: NodeStatus[] = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"]
export const STATUS_DEFAULTS: Record<NodeStatus, { label: string; color: string }> = {
  unclaimed: { label: "Not claimed", color: "#5f6763" },
  accepted: { label: "To do", color: "#3a6fd8" },
  in_progress: { label: "Working on it", color: "#b25c00" },
  waiting: { label: "Waiting", color: "#8656cc" },
  blocked: { label: "Stuck", color: "#c0362f" },
  done: { label: "Done", color: "#237a42" },
}
