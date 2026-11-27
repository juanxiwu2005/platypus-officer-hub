import type { CheerBook } from "./types"

/**
 * Fictional cheers for the v2 demo club (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §4; points on the R1.1 scale of §8), all in
 * the demo week of Sat Oct 31, 2026 (Monday Oct 26 to Sunday Nov 1) and in Fall 2026. Maya's Team card shows two received rows
 * (800 points this term), one sent row and 250 of her 1,000 points used. Every cheer was emailed (`email: true`, as every cheer is
 * since R1.1) and every card has been seen, so no received card opens on load for anyone, the president included.
 * Fields are in the canonical order of src/data/cheers.ts, so loading the seed leaves it unchanged.
 */
export const sampleCheers = (): CheerBook => ({
  cheers: [
    { id: "ch-1", fromId: "priya", toIds: ["maya"], points: 300, note: "You explained the budget lines at the meeting, so everyone knew what we could spend.", card: "thanks", on: "2026-10-27", email: true, seenBy: ["maya"] },
    { id: "ch-2", fromId: "sam", toIds: ["alex"], points: 200, note: "Thanks for reviewing the save-the-date draft the same evening I sent it.", card: "teamwork", on: "2026-10-28", email: true, seenBy: ["alex"] },
    { id: "ch-3", fromId: "alex", toIds: ["maya"], points: 500, note: "The quotes were attached and compared, so I approved them in one go.", nodeId: "e-founder:quotes", card: "star", on: "2026-10-29", email: true, seenBy: ["maya"] },
    { id: "ch-4", fromId: "maya", toIds: ["jordan"], points: 250, note: "Room booked two weeks early, so the caterer could confirm.", nodeId: "e-night:venue", card: "trophy", on: "2026-10-31", email: true, seenBy: ["jordan"] },
  ],
})
