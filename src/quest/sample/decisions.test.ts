import { describe, expect, it } from "vitest"
import { DOCUMENTS, REQUESTORS, decideAdvisor, decideHandoff, decidePromotion, decideRequestor, initialPromotion, type PromotionDraft } from "./decisions"

const pass = (rules: string[], message: string) => ({ passed: true, rules, failed: [] as string[], message })
const fail = (failed: string, message: string) => ({ passed: false, rules: [] as string[], failed: [failed], message })

describe("sample decisions", () => {
  it("passes rule 2.3 only for the eligible registered requestors", () => {
    const denied = fail("2.3", "The request cannot move. Use a registered officer account.")
    for (const person of REQUESTORS) {
      expect(decideRequestor(person.id)).toEqual(
        person.eligible ? pass(["2.3"], `${person.name} can start the room request.`) : denied,
      )
    }
    for (const id of [null, "", "morgan"]) expect(decideRequestor(id)).toEqual(denied)
  })

  it("passes rule 2.6 only for the full-shift advisor plan", () => {
    expect(decideAdvisor(0, 2)).toEqual(pass(["2.6"], "Dr. Lee is with the crew for the whole night."))
    const missed = fail("2.6", "Dr. Lee missed part of the night. Invite the whole shift.")
    for (const [start, end] of [[0, 1], [1, 2], [2, 0], [0.5, 2], [0, 2.5], [NaN, 2], [0, Infinity], [2 ** 53, 2]]) {
      expect(decideAdvisor(start, end)).toEqual(missed)
    }
  })

  it("passes rule 5.1 only with all three known documents", () => {
    const confirmed = pass(["5.1"], "Morgan has the confirmed event details.")
    expect(decideHandoff(DOCUMENTS)).toEqual(confirmed)
    expect(decideHandoff(["ritm", "room", "approval", "room"])).toEqual(confirmed)
    for (const documents of [[], ["approval"], ["approval", "ritm"], ["approval", "ritm", "poster"], ["approval", "ritm", "room", "unknown"]]) {
      expect(decideHandoff(documents)).toEqual(fail("5.1", "Morgan is waiting for the approval, number and room."))
    }
  })

  it("starts the promotion draft unready at 120 prints", () => {
    expect(initialPromotion()).toEqual({ namingFixed: false, markRemoved: false, printCount: 120, vendor: null, logoFlag: false, artworkAttached: false })
  })

  it("gates the promotion through rules 5.2, 5.3 and 5.4 in order", () => {
    const ready: PromotionDraft = { namingFixed: true, markRemoved: true, printCount: 100, vendor: "licensed", logoFlag: true, artworkAttached: true }
    const complete = pass(["5.2", "5.3", "5.4"], "The poster and merchandise folder are ready.")
    expect(decidePromotion(ready)).toEqual(complete)
    expect(decidePromotion({ ...ready, printCount: 0 })).toEqual(complete)
    const poster = fail("5.2", "The poster needs a name and mark fix.")
    expect(decidePromotion(initialPromotion())).toEqual(poster)
    expect(decidePromotion({ ...ready, namingFixed: false })).toEqual(poster)
    expect(decidePromotion({ ...ready, markRemoved: false })).toEqual(poster)
    const prints = fail("5.3", "The print order is outside the $500 limit.")
    expect(decidePromotion({ ...ready, printCount: 101 })).toEqual(prints)
    for (const printCount of [-1, 0.5, NaN, Infinity, 2 ** 53]) expect(decidePromotion({ ...ready, printCount })).toEqual(prints)
    const merchandise = fail("5.4", "The merchandise folder is not ready for review.")
    for (const draft of [
      { ...ready, vendor: "unverified" as const },
      { ...ready, vendor: null },
      { ...ready, logoFlag: false },
      { ...ready, artworkAttached: false },
    ]) {
      expect(decidePromotion(draft)).toEqual(merchandise)
    }
  })
})
