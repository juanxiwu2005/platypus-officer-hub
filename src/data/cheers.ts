import type { Cheer, CheerBook, CheerCard, CheerPoints, DemoState, Person } from "./types"

/**
 * Cheers model (R1). STAGE A PLACEHOLDER: agent R1-M replaces the bodies (docs/feedback-fix/CHEERS_R1_CONTRACT.md §4).
 * Every exported name and signature here is frozen; the interface agent builds against them.
 */
export type CheerAction =
  | { kind: "send"; toIds: string[]; points: CheerPoints; note: string; nodeId?: string; card: CheerCard; email?: boolean }
  | { kind: "withdraw"; id: string }
  | { kind: "markSeen"; ids: string[] }
  | { kind: "dismissWeeklyLine" }

const EMPTY: CheerBook = { cheers: [] }

/** The reducer case. Returns `state` itself when the action is refused or changes nothing. */
export function changeCheers(state: DemoState, action: CheerAction, actorId: string): DemoState {
  void action; void actorId
  return state
}
export const cheersOf = (s: DemoState): CheerBook => s.cheers ?? EMPTY
/** Cheers the person sent or received, not withdrawn, newest first. Nobody else's cheers are ever returned. */
export const visibleCheers = (s: DemoState, personId: string): Cheer[] => cheersOf(s).cheers.filter(c => !c.withdrawnOn && (c.fromId === personId || c.toIds.includes(personId))).slice().reverse()
export const allowanceOf = (s: DemoState, personId: string): { total: number; used: number; left: number } => { void s; void personId; return { total: 200, used: 0, left: 200 } }
export const receivedThisTerm = (s: DemoState, personId: string): number => { void s; void personId; return 0 }
export const givenThisTerm = (s: DemoState, personId: string): number => { void s; void personId; return 0 }
/** Received cheers the person has not seen yet, oldest first. */
export const unseenFor = (s: DemoState, personId: string): Cheer[] => cheersOf(s).cheers.filter(c => !c.withdrawnOn && c.toIds.includes(personId) && !c.seenBy.includes(personId))
export const canSendCheers = (s: DemoState, personId: string): boolean => { void s; void personId; return true }
export const canReceiveCheers = (s: DemoState, personId: string): boolean => { void s; void personId; return true }
/** People the sender may cheer, in display order. */
export const cheerRecipients = (s: DemoState, fromId: string): Person[] => s.people.filter(p => p.id !== fromId)
/** Why a send would be refused (shown under the form), or null when it is allowed. */
export const validateCheer = (s: DemoState, fromId: string, input: Extract<CheerAction, { kind: "send" }>): string | null => { void s; void fromId; return input.note.trim().length < 10 ? "Write at least 10 characters." : null }
/** The president/VP weekly line, or null when it should not show. */
export const weeklyLine = (s: DemoState, viewerId: string): { personIds: string[] } | null => { void s; void viewerId; return null }
/** The "Say thanks?" prompt on a finished task, or null. */
export const thankPromptFor = (s: DemoState, viewerId: string, nodeId: string): { ownerId: string } | null => { void s; void viewerId; void nodeId; return null }
/** Clean the cheers of a loaded or imported state (drop malformed cheers, cap fields). Returns `s` itself when nothing changes. */
export function withSanitizedCheers(s: DemoState): DemoState {
  return s
}
