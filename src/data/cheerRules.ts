import type { CheerCard } from "./types"

/**
 * Cheers rules (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2, amended by §8 for R1.1). Every number and word list the
 * model and the screens share lives here, so a decision changes in one place. Juanxi's decisions of 2026-11-26.
 */

/**
 * Points per recipient (R1.1): any whole number from POINTS_MIN up, at most what is left of the week's allowance. The − and +
 * buttons move in steps of POINTS_STEP. Juanxi's scale: about 100 points ≈ $1, so 5,000 ≈ $50.
 */
export const POINTS_MIN = 100
export const POINTS_STEP = 50
/** Where the form starts. */
export const POINTS_DEFAULT = 100
/** The R1 values, which older saves may hold; they stay valid and count as stored. */
export const LEGACY_POINTS: readonly number[] = [10, 25, 50, 100]
/** A guard for loaded and imported data only (a cheer above it is dropped as malformed); the allowance is the real limit. */
export const POINTS_SAVED_MAX = 100_000

/** The trophy picker, in display order. `thanks`, `star` and `teamwork` are the R1 card values and keep their emoji. */
export const CHEER_CARDS: readonly CheerCard[] = ["trophy", "star", "thanks", "teamwork", "rocket", "idea", "party", "heart"]
export const CHEER_CARD_EMOJI: Record<CheerCard, string> = {
  trophy: "🏆", star: "⭐", thanks: "🙌", teamwork: "🤝", rocket: "🚀", idea: "💡", party: "🎉", heart: "❤️",
}
/** Accessible names of the trophies (fixed words, so the research log can record which button was pressed). */
export const CHEER_CARD_NAME: Record<CheerCard, string> = {
  trophy: "Trophy", star: "Star", thanks: "Raised hands", teamwork: "Handshake", rocket: "Rocket", idea: "Light bulb", party: "Party", heart: "Heart",
}
export const CHEER_CARD_DEFAULT: CheerCard = "trophy"

/** The note is required: what they did and how it helped. Measured after trimming. */
export const NOTE_MIN = 10
export const NOTE_MAX = 280
export const MAX_RECIPIENTS = 5
/** "Let others know too (optional)": at most this many current officers besides the sender and recipients. */
export const MAX_CC = 5
/**
 * Weekly allowance, reset each Monday by the demo clock; unused points expire. Interim numbers (R1.1) until the points-system
 * research and Juanxi's decision: 1,000 a week for an officer, 2,500 for a president or vice president.
 */
export const ALLOWANCE_OFFICER = 1000
export const ALLOWANCE_LEAD = 2500
/** Received cards shown at once; more are counted ("N more on Team"). */
export const MAX_CARDS_AT_ONCE = 3
/** The president's weekly line shows Monday to Wednesday of the demo week (1 = Monday … 3 = Wednesday). */
export const WEEKLY_LINE_LAST_WEEKDAY = 3
