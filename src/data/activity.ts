import type { DemoState } from "./types"

/**
 * Live activity events (R0). STAGE A PLACEHOLDER: agent R0-M replaces this file (docs/feedback-fix/CHEERS_R0_CONTRACT.md §4).
 * Signature is frozen: return `next` itself when nothing new is recorded.
 */
export function withActivity(prev: DemoState, next: DemoState, action: { type: string }, actorId: string): DemoState {
  void prev; void action; void actorId
  return next
}
