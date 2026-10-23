import type { NodeStatus } from "../../data/types"

/** Default status words and colours (v1.1). Kept free of React so the store can use them. */
export const STATUS_ORDER: NodeStatus[] = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"]
export const STATUS_DEFAULTS: Record<NodeStatus, { label: string; color: string }> = {
  unclaimed: { label: "Not claimed", color: "#7d8682" },
  accepted: { label: "To do", color: "#3a6fd8" },
  in_progress: { label: "Working on it", color: "#d97b06" },
  waiting: { label: "Waiting", color: "#8656cc" },
  blocked: { label: "Stuck", color: "#d23f37" },
  done: { label: "Done", color: "#2b9550" },
}
export const PALETTE = ["#7d8682", "#3a6fd8", "#d97b06", "#8656cc", "#d23f37", "#2b9550", "#0f8a8a", "#c2418d", "#a0791a", "#4a5568"]
