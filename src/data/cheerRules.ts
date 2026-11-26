import type { CheerCard, CheerPoints } from "./types"

/**
 * Cheers rules (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2). Owned by the main agent so the model and interface agents
 * use the same numbers. Juanxi's decisions of 2026-11-26.
 */
export const CHEER_POINTS: readonly CheerPoints[] = [10, 25, 50, 100]
export const CHEER_CARDS: readonly CheerCard[] = ["thanks", "star", "teamwork"]
export const CHEER_CARD_EMOJI: Record<CheerCard, string> = { thanks: "🙌", star: "⭐", teamwork: "🤝" }
/** The note is required: what they did and why it helped. Measured after trimming. */
export const NOTE_MIN = 10
export const NOTE_MAX = 280
export const MAX_RECIPIENTS = 5
/** Weekly allowance, reset each Monday by the demo clock; unused points expire. */
export const ALLOWANCE_OFFICER = 200
export const ALLOWANCE_LEAD = 500
/** Received cards shown at once; more are counted ("N more on Team"). */
export const MAX_CARDS_AT_ONCE = 3
/** The president's weekly line shows Monday to Wednesday of the demo week (1 = Monday … 3 = Wednesday). */
export const WEEKLY_LINE_LAST_WEEKDAY = 3
/** Quick starts that put a phrase into the note; they never replace writing it. */
export const QUICK_STARTS = ["Delivered on time", "Clear details", "Helped me out", "Great teamwork"] as const
