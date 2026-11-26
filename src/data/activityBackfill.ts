import type { ActivityEvent, DemoState } from "./types"

/**
 * Backfill and sanitizing of the activity record (R0). STAGE A PLACEHOLDER: agent R0-P replaces this file
 * (docs/feedback-fix/CHEERS_R0_CONTRACT.md §5). Signatures are frozen: return the same object when nothing changes.
 */
export function withActivityBackfill(s: DemoState): DemoState {
  return s
}

export function sanitizeActivity(raw: unknown): ActivityEvent[] {
  return Array.isArray(raw) ? (raw as ActivityEvent[]) : []
}
