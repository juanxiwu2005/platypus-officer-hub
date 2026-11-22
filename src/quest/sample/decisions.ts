/** Typed decision boundary for the "Mission: Speaker Night" complete sample. Pure functions; all people and dollar values are fictional practice data. */

export interface DecisionResult { passed: boolean; rules: string[]; failed: string[]; message: string }
export interface SampleRequestor { id: string; name: string; role: string; eligible: boolean }

const pass = (rules: string[], message: string): DecisionResult => ({ passed: true, rules, failed: [], message })
const fail = (failed: string, message: string): DecisionResult => ({ passed: false, rules: [], failed: [failed], message })

/** Fictional sample requestors: the game's registered accounts, not live authentication. */
export const REQUESTORS: readonly SampleRequestor[] = [
  { id: "riley", name: "Riley", role: "Events", eligible: true },
  { id: "alex", name: "Alex", role: "President", eligible: true },
  { id: "sam", name: "Sam", role: "Secretary", eligible: true },
  { id: "advisor", name: "Dr. Lee", role: "Advisor", eligible: false },
]

/** Rule 2.3: only registered elected officers may request Mazevo accounts. */
export function decideRequestor(id: string | null): DecisionResult {
  const requestor = REQUESTORS.find((person) => person.id === id)
  if (requestor === undefined || !requestor.eligible) return fail("2.3", "The request cannot move. Use a registered officer account.")
  return pass(["2.3"], `${requestor.name} can start the room request.`)
}

/** Rule 2.6: the advisor covers the whole shift. Indices: 0 Arrivals, 1 Talk, 2 Closing. */
export function decideAdvisor(start: number, end: number): DecisionResult {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start !== 0 || end !== 2) {
    return fail("2.6", "Dr. Lee missed part of the night. Invite the whole shift.")
  }
  return pass(["2.6"], "Dr. Lee is with the crew for the whole night.")
}

/** Rule 5.1 needs all three known documents. */
export const DOCUMENTS: readonly string[] = ["approval", "ritm", "room"]

/** Rule 5.1: all known documents present, no unknowns; duplicates add no credit. */
export function decideHandoff(documents: readonly string[]): DecisionResult {
  const present = new Set(documents)
  if (documents.some((document) => !DOCUMENTS.includes(document)) || !DOCUMENTS.every((document) => present.has(document))) {
    return fail("5.1", "Morgan is waiting for the approval, number and room.")
  }
  return pass(["5.1"], "Morgan has the confirmed event details.")
}

/** Fictional $5 per print; 120 prints start at $600 against the $500 cap. */
export interface PromotionDraft { namingFixed: boolean; markRemoved: boolean; printCount: number; vendor: "licensed" | "unverified" | null; logoFlag: boolean; artworkAttached: boolean }

export function initialPromotion(): PromotionDraft {
  return { namingFixed: false, markRemoved: false, printCount: 120, vendor: null, logoFlag: false, artworkAttached: false }
}

/** Validates rules 5.2, 5.3 and 5.4 in order. */
export function decidePromotion(draft: PromotionDraft): DecisionResult {
  if (!draft.namingFixed || !draft.markRemoved) return fail("5.2", "The poster needs a name and mark fix.")
  if (!Number.isSafeInteger(draft.printCount) || draft.printCount < 0 || draft.printCount > 100) return fail("5.3", "The print order is outside the $500 limit.")
  if (draft.vendor !== "licensed" || !draft.logoFlag || !draft.artworkAttached) return fail("5.4", "The merchandise folder is not ready for review.")
  return pass(["5.2", "5.3", "5.4"], "The poster and merchandise folder are ready.")
}
