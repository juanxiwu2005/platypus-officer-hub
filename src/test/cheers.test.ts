import { describe, expect, it } from "vitest"
import type { ActivityEvent, Cheer, CheerCard, CheerPoints, DemoState } from "../data/types"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { loggedReducer, reducer } from "../data/store"
import {
  allowanceOf, canReceiveCheers, canSendCheers, cheersOf, unseenFor, validateCheer, visibleCheers, withSanitizedCheers, type CheerAction,
} from "../data/cheers"
// Screen-only read helpers live apart so they stay out of the entry chunk (src/test/cheersBundle.test.ts).
import { ccCandidates, cheerRecipients, givenThisTerm, receivedThisTerm, thankPromptFor, weeklyLine } from "../data/cheerViews"
import { sampleCheers } from "../data/cheerSeed"
import { ALLOWANCE_LEAD, ALLOWANCE_OFFICER, CHEER_CARD_EMOJI, CHEER_CARDS, POINTS_MIN, POINTS_STEP } from "../data/cheerRules"
import { cheerLink, cheerMail } from "../lib/cheerMail"
import { composeUrl } from "../lib/nudges"
import { aiSnapshot } from "../lib/aiContext"

/**
 * Cheers model (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2 and §4; R1.1 amendments §8: points from 100, interim allowance
 * 1,000 / 2,500, trophies, no withdraw, automatic email, let others know). Every rule goes through the real exported reducer.
 * The v2 demo starts on Sat Oct 31, 2026 (week Mon Oct 26 – Sun Nov 1, Fall 2026) with four seeded cheers.
 */

/** The v2 demo without its seeded cheers, so counts start at zero. */
const blank = (): DemoState => ({ ...seedDemo(undefined, "v2"), cheers: undefined })
const as = (s: DemoState, viewerId: string): DemoState => ({ ...s, viewerId })
const on = (s: DemoState, today: string): DemoState => ({ ...s, today })
const cheer = (s: DemoState, action: CheerAction) => reducer(s, { type: "cheerAction", action })
const NOTE = "Room booked two weeks early, so the caterer could confirm."
const send = (toIds: string[], points: CheerPoints = 250, extra: Partial<Extract<CheerAction, { kind: "send" }>> = {}): Extract<CheerAction, { kind: "send" }> =>
  ({ kind: "send", toIds, points, note: NOTE, card: "thanks", ...extra })
/** Sends as `from`, then switches the viewer back. */
const sendAs = (s: DemoState, from: string, toIds: string[], points: CheerPoints = 250, extra: Partial<Extract<CheerAction, { kind: "send" }>> = {}) =>
  ({ ...cheer(as(s, from), send(toIds, points, extra)), viewerId: s.viewerId })
const last = (s: DemoState): Cheer => cheersOf(s).cheers.at(-1)!
/** Jordan (Events lead) as vice president. */
const withVp = (s: DemoState): DemoState => ({ ...s, roles: s.roles.map(r => r.id === "r-events" ? { ...r, fn: "vice_president" } : r) })
/** Riley, named as the next Treasurer but not an officer yet. */
const withIncoming = (s: DemoState): DemoState => ({ ...s, people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", email: "riley.example@example.org", incomingFor: "r-fin" }] })
const withFormer = (s: DemoState, id = "sam"): DemoState => ({ ...s, people: s.people.map(p => p.id === id ? { ...p, leftOn: "2026-10-01" } : p) })
const doneEvent = (seq: number, personId: string, day: string, facts: Record<string, number | boolean>): ActivityEvent =>
  ({ id: `act:${seq}`, seq, on: day, actorId: personId, kind: "task.done", personIds: [personId], nodeId: `t-x${seq}`, facts, source: "live" })
/** A save in which an R1 sender withdrew the cheer `id` (withdrawing itself is refused since R1.1, §8.7). */
const withdrawnInSave = (s: DemoState, id: string, day = s.today): DemoState =>
  ({ ...s, cheers: { ...cheersOf(s), cheers: cheersOf(s).cheers.map(c => c.id === id ? { ...c, withdrawnOn: day } : c) } })

describe("Cheers: sending", () => {
  it("keeps SCHEMA_VERSION 23 and reads a save without cheers as empty", () => {
    expect(SCHEMA_VERSION).toBe(23)
    const s = blank()
    expect(cheersOf(s)).toEqual({ cheers: [] })
    expect(visibleCheers(s, "maya")).toEqual([])
    expect(allowanceOf(s, "maya")).toEqual({ total: 1000, used: 0, left: 1000 })
  })

  it("stores a trimmed note, the demo date, a ch-<n> id, email: true and one notice per recipient without the note", () => {
    const s = as(blank(), "maya")
    const next = cheer(s, send(["jordan", "sam"], 300, { note: `   ${NOTE}   `, nodeId: "e-night:venue", card: "star" }))
    const c = last(next)
    expect(c).toEqual({ id: "ch-0", fromId: "maya", toIds: ["jordan", "sam"], points: 300, note: NOTE, nodeId: "e-night:venue", card: "star", on: "2026-10-31", email: true, seenBy: [] })
    const notices = next.notifications.filter(n => n.kind === "cheer")
    expect(notices).toEqual([
      { id: "cheer:ch-0:jordan", recipientId: "jordan", nodeId: "e-night:venue", kind: "cheer", text: "Maya sent you 300 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-0" },
      { id: "cheer:ch-0:sam", recipientId: "sam", nodeId: "e-night:venue", kind: "cheer", text: "Maya sent you 300 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-0" },
    ])
    for (const n of notices) expect(n.text).not.toContain("caterer")
    // The next id follows the highest counter in use.
    expect(last(cheer(next, send(["priya"]))).id).toBe("ch-1")
  })

  it("uses an empty notice nodeId for a cheer without a task", () => {
    const next = cheer(as(blank(), "maya"), send(["jordan"], 100))
    expect(last(next)).not.toHaveProperty("nodeId")
    expect(next.notifications.find(n => n.cheerId === last(next).id)?.nodeId).toBe("")
  })

  it("continues the seeded ids", () => {
    const s = as(seedDemo(undefined, "v2"), "maya")
    expect(last(cheer(s, send(["priya"]))).id).toBe("ch-5")
  })

  it("refuses notes outside 10–280 characters, measured after trimming", () => {
    const s = as(blank(), "maya")
    expect(validateCheer(s, "maya", send(["jordan"], 250, { note: "  short   " }))).toBe("Write at least 10 characters.")
    expect(cheer(s, send(["jordan"], 250, { note: "  short   " }))).toBe(s)
    expect(validateCheer(s, "maya", send(["jordan"], 250, { note: "x".repeat(281) }))).toBe("Keep it under 280 characters.")
    expect(cheer(s, send(["jordan"], 250, { note: "x".repeat(281) }))).toBe(s)
    expect(validateCheer(s, "maya", send(["jordan"], 250, { note: ` ${"x".repeat(280)} ` }))).toBeNull()
    expect(validateCheer(s, "maya", send(["jordan"], 250, { note: "x".repeat(10) }))).toBeNull()
  })

  it("needs 1–5 distinct recipients who can receive, never the sender", () => {
    const s = withIncoming(as(blank(), "alex"))
    expect(validateCheer(s, "alex", send([]))).toBe("Choose who to cheer.")
    expect(validateCheer(s, "alex", send(["maya", "jordan", "sam", "priya", "riley", "maya"], 100))).toBeNull()
    const six = { ...s, people: [...s.people, { ...s.people[1], id: "casey", name: "Casey Example" }] }
    expect(validateCheer(six, "alex", send(["maya", "jordan", "sam", "priya", "riley", "casey"], 100))).toBe("Up to 5 people at a time.")
    expect(validateCheer(s, "alex", send(["alex"]))).toBe("You can't cheer yourself.")
    // The store's role-term upkeep refreshes this hand-made state, so compare the cheers.
    expect(cheersOf(cheer(s, send(["alex"]))).cheers).toEqual([])
    expect(validateCheer(s, "alex", send(["nobody"]))).toBe("Choose people on the team.")
    expect(validateCheer(withFormer(s), "alex", send(["sam"]))).toBe("Choose people on the team.")
    // Duplicates are stored once and charged once.
    const next = cheer(s, send(["maya", "maya", "jordan"], 150))
    expect(last(next).toIds).toEqual(["maya", "jordan"])
    expect(allowanceOf(next, "alex").used).toBe(300)
  })

  it("accepts a task of this club only", () => {
    const s = as(blank(), "maya")
    expect(validateCheer(s, "maya", send(["jordan"], 250, { nodeId: "t-nowhere" }))).toBe("Choose a task from this club.")
    expect(validateCheer(s, "maya", send(["jordan"], 250, { nodeId: "t-checkin" }))).toBeNull()
  })

  it("lets current officers send, incoming officers only receive, and former officers do neither", () => {
    const s = withFormer(withIncoming(blank()))
    expect(canSendCheers(s, "maya")).toBe(true)
    expect(canSendCheers(s, "riley")).toBe(false)
    expect(canReceiveCheers(s, "riley")).toBe(true)
    expect(canSendCheers(s, "sam")).toBe(false)
    expect(canReceiveCheers(s, "sam")).toBe(false)
    expect(canSendCheers(s, "nobody")).toBe(false)
    const incoming = as(s, "riley")
    expect(validateCheer(incoming, "riley", send(["maya"]))).toBe("Only current officers can give points.")
    expect(cheersOf(cheer(incoming, send(["maya"]))).cheers).toEqual([])
    const former = as(s, "sam")
    expect(cheersOf(cheer(former, send(["maya"]))).cheers).toEqual([])
    // A current officer can cheer the incoming officer.
    expect(last(cheer(as(s, "maya"), send(["riley"]))).toIds).toEqual(["riley"])
  })

  it("lists recipients who can receive, without the sender, in name order", () => {
    const s = withFormer(withIncoming(blank()))
    expect(cheerRecipients(s, "maya").map(p => p.id)).toEqual(["alex", "jordan", "priya", "riley"])
  })
})

describe("Cheers: points (R1.1, §8.2)", () => {
  it("takes any whole number from 100 up, typed; the buttons' step is 50", () => {
    const s = as(blank(), "maya")
    expect(POINTS_MIN).toBe(100)
    expect(POINTS_STEP).toBe(50)
    for (const points of [100, 150, 130, 999, 1000]) expect(validateCheer(s, "maya", send(["jordan"], points)), String(points)).toBeNull()
    expect(last(cheer(s, send(["jordan"], 130))).points).toBe(130)
  })

  it("refuses fewer than 100 points, fractions and anything that is not a number", () => {
    const s = as(blank(), "maya")
    for (const points of [99, 50, 25, 10, 0, -100]) {
      expect(validateCheer(s, "maya", send(["jordan"], points)), String(points)).toBe("Give at least 100 points.")
      expect(cheer(s, send(["jordan"], points))).toBe(s)
    }
    for (const points of [150.5, Number.NaN, Number.POSITIVE_INFINITY, "200" as unknown as number, null as unknown as number]) {
      expect(validateCheer(s, "maya", send(["jordan"], points)), String(points)).toBe("Enter whole points.")
      expect(cheer(s, send(["jordan"], points))).toBe(s)
    }
  })

  it("allows at most what is left of the allowance, counting points × recipients", () => {
    const s = as(blank(), "maya")
    expect(validateCheer(s, "maya", send(["jordan"], 1000))).toBeNull()
    expect(validateCheer(s, "maya", send(["jordan"], 1001))).toBe("Only 1,000 points left this week.")
    expect(validateCheer(s, "maya", send(["jordan", "sam"], 550))).toBe("Only 1,000 points left this week.")
    expect(validateCheer(s, "maya", send(["jordan", "sam"], 500))).toBeNull()
  })
})

describe("Cheers: trophies (R1.1, §8.5)", () => {
  it("offers at least eight emoji, the R1 card values among them with their old emoji", () => {
    expect(CHEER_CARDS.length).toBeGreaterThanOrEqual(8)
    expect(CHEER_CARDS).toEqual(expect.arrayContaining(["thanks", "star", "teamwork"]))
    expect([CHEER_CARD_EMOJI.thanks, CHEER_CARD_EMOJI.star, CHEER_CARD_EMOJI.teamwork]).toEqual(["🙌", "⭐", "🤝"])
    expect(new Set(CHEER_CARDS.map(c => CHEER_CARD_EMOJI[c])).size).toBe(CHEER_CARDS.length)
    for (const e of ["🏆", "⭐", "🙌", "🤝", "🚀", "💡", "🎉", "❤️"]) expect(Object.values(CHEER_CARD_EMOJI)).toContain(e)
  })

  it("accepts every trophy, old card values included, and refuses an unknown one", () => {
    const s = as(blank(), "maya")
    for (const card of CHEER_CARDS) expect(validateCheer(s, "maya", send(["jordan"], 100, { card })), card).toBeNull()
    expect(validateCheer(s, "maya", send(["jordan"], 100, { card: "gold" as CheerCard }))).toBe("Choose a trophy.")
    expect(cheer(s, send(["jordan"], 100, { card: "gold" as CheerCard }))).toBe(s)
    expect(last(cheer(s, send(["jordan"], 100, { card: "rocket" }))).card).toBe("rocket")
  })
})

describe("Cheers: weekly allowance (interim, R1.1 §8.3)", () => {
  it("is 1,000 for an officer and 2,500 for the president or a vice president, counting points × recipients", () => {
    expect([ALLOWANCE_OFFICER, ALLOWANCE_LEAD]).toEqual([1000, 2500])
    let s = blank()
    expect(allowanceOf(s, "maya").total).toBe(1000)
    expect(allowanceOf(s, "alex").total).toBe(2500)
    expect(allowanceOf(withVp(s), "jordan").total).toBe(2500)
    s = sendAs(s, "maya", ["jordan", "sam", "priya"], 300)
    expect(allowanceOf(s, "maya")).toEqual({ total: 1000, used: 900, left: 100 })
    expect(validateCheer(as(s, "maya"), "maya", send(["alex"], 150))).toBe("Only 100 points left this week.")
    const maya = as(s, "maya")
    expect(cheer(maya, send(["alex"], 150))).toBe(maya)
    s = sendAs(s, "maya", ["alex"], 100)
    expect(allowanceOf(s, "maya").left).toBe(0)
    expect(validateCheer(as(s, "maya"), "maya", send(["alex"], 100))).toBe("No points left this week.")
    // Receiving is unlimited and does not touch the receiver's allowance.
    expect(allowanceOf(s, "alex").used).toBe(0)
  })

  it("lets the president give up to 2,500 in a week", () => {
    let s = blank()
    s = sendAs(s, "alex", ["maya", "jordan", "sam", "priya"], 500)
    expect(allowanceOf(s, "alex").left).toBe(500)
    expect(validateCheer(as(s, "alex"), "alex", send(["maya"], 500))).toBeNull()
    s = sendAs(s, "alex", ["maya"], 500)
    expect(validateCheer(as(s, "alex"), "alex", send(["maya"], 100))).toBe("No points left this week.")
  })

  it("resets on Monday by the demo clock; unused points expire", () => {
    let s = sendAs(blank(), "maya", ["jordan", "sam"], 500)
    expect(allowanceOf(s, "maya").left).toBe(0)
    expect(allowanceOf(on(s, "2026-11-01"), "maya").left).toBe(0) // Sunday: same week
    // The lead moves the demo clock two days, to Monday Nov 2.
    const monday = reducer(s, { type: "advanceClock", days: 2 })
    expect(monday.today).toBe("2026-11-02")
    expect(allowanceOf(monday, "maya")).toEqual({ total: 1000, used: 0, left: 1000 })
    expect(allowanceOf(on(s, "2026-11-09"), "maya").left).toBe(1000) // not carried over
  })

  it("counts older cheers with R1 values as stored, and not cheers an R1 sender withdrew", () => {
    let s = blank()
    s = { ...s, cheers: { cheers: [
      { id: "ch-1", fromId: "maya", toIds: ["jordan", "sam"], points: 25, note: NOTE, card: "thanks", on: "2026-10-27", seenBy: [] },
      { id: "ch-2", fromId: "maya", toIds: ["priya"], points: 100, note: NOTE, card: "star", on: "2026-10-28", seenBy: [], withdrawnOn: "2026-10-28" },
    ] } }
    expect(allowanceOf(s, "maya")).toEqual({ total: 1000, used: 50, left: 950 })
    expect(receivedThisTerm(s, "jordan")).toBe(25)
    expect(receivedThisTerm(s, "priya")).toBe(0)
  })
})

describe("Cheers: term totals", () => {
  it("counts received points and given points × recipients in the term that contains today", () => {
    let s = blank()
    s = sendAs(s, "maya", ["jordan", "sam"], 250)
    s = sendAs(s, "alex", ["jordan"], 500)
    expect(receivedThisTerm(s, "jordan")).toBe(750)
    expect(receivedThisTerm(s, "sam")).toBe(250)
    expect(givenThisTerm(s, "maya")).toBe(500)
    expect(givenThisTerm(s, "alex")).toBe(500)
    expect(receivedThisTerm(s, "maya")).toBe(0)
  })

  it("leaves out cheers from an earlier term and uses the latest ended term between terms", () => {
    const fall = sendAs(blank(), "maya", ["jordan"], 250)
    // Winter break (between Fall 2026 and Spring 2027): still Fall 2026.
    expect(receivedThisTerm(on(fall, "2026-12-30"), "jordan")).toBe(250)
    // Spring 2027: the fall cheer no longer counts.
    const spring = sendAs(on(fall, "2027-01-20"), "maya", ["jordan"], 100)
    expect(receivedThisTerm(spring, "jordan")).toBe(100)
    expect(givenThisTerm(spring, "maya")).toBe(100)
    // Before any known term: everything.
    expect(receivedThisTerm(on(spring, "2026-01-05"), "jordan")).toBe(350)
  })

  it("does not count withdrawn cheers in older saves for anyone", () => {
    let s = sendAs(blank(), "maya", ["jordan"], 250)
    s = withdrawnInSave(s, last(s).id)
    expect(receivedThisTerm(s, "jordan")).toBe(0)
    expect(givenThisTerm(s, "maya")).toBe(0)
    expect(allowanceOf(s, "maya").used).toBe(0)
  })
})

describe("Cheers: privacy", () => {
  it("shows a cheer only to its sender and recipients, newest first", () => {
    let s = blank()
    s = sendAs(s, "maya", ["jordan"], 250)
    s = sendAs(on(s, "2026-11-02"), "alex", ["maya"], 500)
    s = sendAs(s, "sam", ["priya"], 100)
    expect(visibleCheers(s, "maya").map(c => [c.fromId, c.toIds])).toEqual([["alex", ["maya"]], ["maya", ["jordan"]]])
    expect(visibleCheers(s, "jordan").map(c => c.fromId)).toEqual(["maya"])
    // A third officer sees none of another pair's cheers.
    expect(visibleCheers(s, "priya").map(c => c.fromId)).toEqual(["sam"])
    expect(visibleCheers(s, "alex").every(c => c.fromId === "alex" || c.toIds.includes("alex"))).toBe(true)
  })

  it("orders cheers of the same day by when they were sent", () => {
    let s = blank()
    s = sendAs(s, "maya", ["jordan"], 100)
    s = sendAs(s, "alex", ["jordan"], 250)
    expect(visibleCheers(s, "jordan").map(c => c.fromId)).toEqual(["alex", "maya"])
    expect(unseenFor(s, "jordan").map(c => c.fromId)).toEqual(["maya", "alex"])
  })
})

describe("Cheers: let others know (R1.1, §8.9)", () => {
  it("stores up to five current officers outside the cheer, deduplicated, and shows them the cheer", () => {
    const s = as(blank(), "maya")
    const next = cheer(s, send(["jordan"], 300, { ccIds: ["alex", "priya", "alex"] }))
    const c = last(next)
    expect(c).toEqual({ id: "ch-0", fromId: "maya", toIds: ["jordan"], ccIds: ["alex", "priya"], points: 300, note: NOTE, card: "thanks", on: "2026-10-31", email: true, seenBy: [] })
    expect(visibleCheers(next, "alex").map(x => x.id)).toEqual([c.id])
    expect(visibleCheers(next, "priya").map(x => x.id)).toEqual([c.id])
    // A fourth person, not in the cheer, sees nothing of it anywhere.
    expect(visibleCheers(next, "sam")).toEqual([])
    expect(next.notifications.filter(n => n.recipientId === "sam" && n.cheerId === c.id)).toEqual([])
    expect(JSON.stringify(next.notifications.filter(n => n.recipientId === "sam"))).not.toContain("caterer")
    // The AI context as anyone sees it never holds the note (a word only this note uses).
    const secret = cheer(s, send(["jordan"], 300, { ccIds: ["alex"], note: "The zebra-quartz banner was ready a day early." }))
    for (const viewer of ["sam", "alex", "jordan", "maya"]) expect(JSON.stringify(aiSnapshot(as(secret, viewer))), viewer).not.toContain("quartz")
  })

  it("sends each of them a notice with the note, which the sender chose to share; recipients' notices still carry no note", () => {
    const next = cheer(as(blank(), "maya"), send(["jordan", "sam"], 300, { ccIds: ["alex"], nodeId: "e-night:venue" }))
    const id = last(next).id
    const notices = next.notifications.filter(n => n.cheerId === id)
    expect(notices.map(n => [n.id, n.recipientId])).toEqual([[`cheer:${id}:jordan`, "jordan"], [`cheer:${id}:sam`, "sam"], [`cheer-cc:${id}:alex`, "alex"]])
    expect(notices.find(n => n.recipientId === "alex")).toEqual({ id: `cheer-cc:${id}:alex`, recipientId: "alex", nodeId: "e-night:venue", kind: "cheer", text: `Maya recognized Jordan and Sam: “${NOTE}”`, createdOn: "2026-10-31", read: false, cheerId: id })
    for (const n of notices.filter(x => x.recipientId !== "alex")) expect(n.text).toBe("Maya sent you 300 points.")
    // Cheer notices, these included, never reach the AI context.
    expect(JSON.stringify(aiSnapshot(as(next, "alex")).yourUpdates)).not.toContain("recognized")
  })

  it("does not charge or credit them, does not show them a received card, and does not let them mark one seen", () => {
    let s = cheer(as(blank(), "maya"), send(["jordan"], 300, { ccIds: ["alex"] }))
    const id = last(s).id
    expect(allowanceOf(s, "alex").used).toBe(0)
    expect(allowanceOf(s, "maya").used).toBe(300)
    expect(receivedThisTerm(s, "alex")).toBe(0)
    expect(givenThisTerm(s, "alex")).toBe(0)
    expect(unseenFor(s, "alex")).toEqual([])
    const alex = as(s, "alex")
    expect(cheer(alex, { kind: "markSeen", ids: [id] })).toBe(alex)
    s = cheer(as(s, "jordan"), { kind: "markSeen", ids: [id] })
    expect(last(s).seenBy).toEqual(["jordan"])
  })

  it("refuses the sender, a recipient, someone who is not a current officer, and more than five", () => {
    const s = withFormer(withIncoming(as(blank(), "maya")))
    expect(validateCheer(s, "maya", send(["jordan"], 100, { ccIds: ["maya"] }))).toBe("They are already in this cheer.")
    expect(validateCheer(s, "maya", send(["jordan"], 100, { ccIds: ["jordan"] }))).toBe("They are already in this cheer.")
    expect(validateCheer(s, "maya", send(["jordan"], 100, { ccIds: ["riley"] }))).toBe("Let current officers know.")
    expect(validateCheer(s, "maya", send(["jordan"], 100, { ccIds: ["sam"] }))).toBe("Let current officers know.")
    expect(validateCheer(s, "maya", send(["jordan"], 100, { ccIds: ["nobody"] }))).toBe("Let current officers know.")
    expect(cheersOf(cheer(s, send(["jordan"], 100, { ccIds: ["jordan"] }))).cheers).toEqual([])
    const many = { ...s, people: [...s.people, ...["c1", "c2", "c3", "c4"].map(id => ({ ...s.people.find(p => p.id === "priya")!, id, name: `${id.toUpperCase()} Example` }))] }
    expect(validateCheer(many, "maya", send(["jordan"], 100, { ccIds: ["alex", "priya", "c1", "c2", "c3", "c4"] }))).toBe("Let up to 5 others know.")
    expect(validateCheer(many, "maya", send(["jordan"], 100, { ccIds: ["alex", "priya", "c1", "c2", "c3"] }))).toBeNull()
    // Without anyone to let know, the field is left out of the saved cheer.
    expect(last(cheer(as(blank(), "maya"), send(["jordan"], 100, { ccIds: [] })))).not.toHaveProperty("ccIds")
  })

  it("suggests the president, the vice presidents and each recipient's team lead first, then the other current officers", () => {
    const s = withFormer(withIncoming(withVp(blank())))
    // Jordan is VP here; Priya reports to the president.
    expect(ccCandidates(s, "maya", ["priya"])).toMatchObject({ suggested: [{ id: "alex" }, { id: "jordan" }], others: [] })
    // A recipient whose role reports to the Events lead: that lead is suggested after the president.
    const nested = { ...blank(), roles: blank().roles.map(r => r.id === "r-mkt" ? { ...r, reportsToId: "r-events" } : r) }
    const c = ccCandidates(nested, "priya", ["sam"])
    expect(c.suggested.map(p => p.id)).toEqual(["alex", "jordan"])
    expect(c.others.map(p => p.id)).toEqual(["maya"])
    // Never the sender, a recipient, an incoming or a former officer.
    const all = ccCandidates(s, "maya", ["priya"])
    for (const id of ["maya", "priya", "riley", "sam"]) expect([...all.suggested, ...all.others].map(p => p.id)).not.toContain(id)
  })
})

describe("Cheers: no withdraw (R1.1, §8.7)", () => {
  it("the reducer refuses a withdrawal by anyone, on any day", () => {
    const s = sendAs(blank(), "maya", ["jordan"], 250)
    const id = last(s).id
    for (const viewer of ["maya", "jordan", "alex"]) {
      const v = as(s, viewer)
      expect(cheer(v, { kind: "withdraw", id })).toBe(v)
    }
    const unknown = as(s, "maya")
    expect(cheer(unknown, { kind: "withdraw", id: "ch-99" })).toBe(unknown)
    expect(last(s)).not.toHaveProperty("withdrawnOn")
  })

  it("still respects cheers withdrawn in older saves: hidden and counted for nobody", () => {
    let s = sendAs(blank(), "maya", ["jordan", "sam"], 250)
    const id = last(s).id
    s = withdrawnInSave(s, id, "2026-10-31")
    expect(visibleCheers(s, "maya")).toEqual([])
    expect(visibleCheers(s, "jordan")).toEqual([])
    expect(unseenFor(s, "jordan")).toEqual([])
    expect(allowanceOf(s, "maya").used).toBe(0)
    // Marking it seen changes nothing.
    const jordan = as(s, "jordan")
    expect(cheer(jordan, { kind: "markSeen", ids: [id] })).toBe(jordan)
    // It survives loading.
    expect(cheersOf(withSanitizedCheers(s)).cheers[0].withdrawnOn).toBe("2026-10-31")
  })
})

describe("Cheers: seen cards", () => {
  it("marks a recipient's card seen once and reads their matching notice only", () => {
    let s = sendAs(blank(), "maya", ["jordan", "sam"], 250)
    const id = last(s).id
    expect(unseenFor(s, "jordan").map(c => c.id)).toEqual([id])
    s = cheer(as(s, "jordan"), { kind: "markSeen", ids: [id] })
    expect(last(s).seenBy).toEqual(["jordan"])
    expect(unseenFor(s, "jordan")).toEqual([])
    expect(unseenFor(s, "sam").map(c => c.id)).toEqual([id])
    expect(s.notifications.find(n => n.id === `cheer:${id}:jordan`)?.read).toBe(true)
    expect(s.notifications.find(n => n.id === `cheer:${id}:sam`)?.read).toBe(false)
    expect(cheer(s, { kind: "markSeen", ids: [id] })).toBe(s)
  })

  it("lets an incoming officer mark their own card seen", () => {
    let s = sendAs(withIncoming(blank()), "maya", ["riley"], 250)
    const id = last(s).id
    s = cheer(as(s, "riley"), { kind: "markSeen", ids: [id] })
    expect(last(s).seenBy).toEqual(["riley"])
    expect(s.notifications.find(n => n.id === `cheer:${id}:riley`)?.read).toBe(true)
  })

  it("ignores ids that are not the viewer's received cheers", () => {
    const s = sendAs(blank(), "maya", ["jordan"], 250)
    const id = last(s).id
    for (const viewer of ["maya", "alex"]) {
      const v = as(s, viewer)
      expect(cheer(v, { kind: "markSeen", ids: [id, "ch-99"] })).toBe(v)
    }
  })
})

describe("Cheers: activity record", () => {
  it("records cheer.sent with IDs and numbers, never the note, and a refused withdrawal records nothing", () => {
    let s = as(blank(), "maya")
    s = cheer(s, send(["jordan", "sam"], 250, { nodeId: "e-night:venue", card: "star" }))
    const id = last(s).id
    s = cheer(s, { kind: "withdraw", id })
    const events = (s.activity ?? []).filter(e => e.kind.startsWith("cheer."))
    expect(events.map(({ id: _id, seq: _seq, ...rest }) => rest)).toEqual([
      { on: "2026-10-31", actorId: "maya", kind: "cheer.sent", personIds: ["jordan", "sam"], nodeId: "e-night:venue", source: "live",
        facts: { cheerId: id, points: 250, recipients: 2, noteChars: NOTE.length, card: "star", email: true } },
    ])
    expect(JSON.stringify(s.activity)).not.toContain("caterer")
  })

  it("adds how many people were let know, never who", () => {
    const s = cheer(as(blank(), "maya"), send(["jordan"], 300, { ccIds: ["alex", "priya"] }))
    const sent = (s.activity ?? []).find(e => e.kind === "cheer.sent")!
    expect(sent.facts).toEqual({ cheerId: last(s).id, points: 300, recipients: 1, noteChars: NOTE.length, card: "thanks", email: true, cc: 2 })
    expect(sent.personIds).toEqual(["jordan"])
    expect(JSON.stringify(sent)).not.toMatch(/alex|priya/)
  })

  it("records nothing for seen cards or a dismissed weekly line", () => {
    let s = sendAs(blank(), "maya", ["jordan"], 250)
    const count = (s.activity ?? []).length
    s = cheer(as(s, "jordan"), { kind: "markSeen", ids: [last(s).id] })
    s = cheer(as(on(s, "2026-11-02"), "alex"), { kind: "dismissWeeklyLine" })
    expect((s.activity ?? []).length).toBe(count)
  })

  it("keeps every part of the note, and who was let know, out of the research log", () => {
    const note = "Zebra-quartz flyer shipped ahead of the Thursday meeting, really appreciated"
    let root = { app: as(blank(), "maya"), log: [] as import("../data/types").LogEntry[] }
    root = loggedReducer(root, { action: { type: "cheerAction", action: send(["jordan"], 500, { note, nodeId: "t-checkin", ccIds: ["alex", "priya"] }) }, at: 1 })
    const id = last(root.app).id
    root = loggedReducer(root, { action: { type: "cheerAction", action: { kind: "withdraw", id } }, at: 2 })
    expect(cheersOf(root.app).cheers[0].note).toBe(note)
    expect(cheersOf(root.app).cheers[0]).not.toHaveProperty("withdrawnOn")
    // The refused withdrawal (R1.1, §8.7) is still logged, marked not applied.
    expect(root.log).toHaveLength(2)
    expect(root.log[1]).toMatchObject({ payload: { kind: "withdraw", id }, applied: false })
    expect(root.log[0].payload).toEqual({ kind: "send", recipients: 1, points: 500, noteLength: note.length, nodeId: "t-checkin", card: "thanks", email: true, cc: 2 })
    const logged = JSON.stringify(root.log)
    for (const word of note.split(/\W+/).filter(w => w.length > 3)) expect(logged).not.toContain(word)
    expect(logged).not.toMatch(/alex|priya|Alex|Priya/)
  })
})

describe("Cheers: weekly line", () => {
  /** Monday Nov 2: Jordan and Priya delivered with details this week, Sam without and then late with details, Maya last week. */
  const week = (today = "2026-11-02"): DemoState => ({ ...on(blank(), today), activity: [
    doneEvent(1, "maya", "2026-10-30", { detailsChars: 30, files: 0 }),
    doneEvent(2, "sam", "2026-11-02", { detailsChars: 0, files: 0 }),
    doneEvent(3, "priya", "2026-11-02", { detailsChars: 0, files: 1 }),
    doneEvent(4, "jordan", "2026-11-02", { detailsChars: 48, files: 0 }),
    doneEvent(5, "alex", "2026-11-02", { detailsChars: 48, files: 0 }),
    doneEvent(6, "sam", "2026-11-03", { detailsChars: 52, files: 1, onTime: false }),
  ] })

  it("shows the president, Monday to Wednesday, the others who delivered with details, in name order", () => {
    expect(weeklyLine(week(), "alex")).toEqual({ personIds: ["jordan", "priya"] })
    expect(weeklyLine(week("2026-11-04"), "alex")).toEqual({ personIds: ["jordan", "priya"] }) // Wednesday
    expect(weeklyLine(week("2026-11-05"), "alex")).toBeNull() // Thursday
    expect(weeklyLine(week("2026-11-08"), "alex")).toBeNull() // Sunday
    expect(weeklyLine(week("2026-11-09"), "alex")).toBeNull() // next Monday: nothing delivered yet
  })

  it("shows a vice president too, but no other officer", () => {
    expect(weeklyLine(withVp(week()), "jordan")).toEqual({ personIds: ["alex", "priya"] })
    expect(weeklyLine(week(), "maya")).toBeNull()
  })

  it("is null when nobody delivered with details, and leaves out people who cannot receive", () => {
    expect(weeklyLine({ ...week(), activity: [] }, "alex")).toBeNull()
    expect(weeklyLine(withFormer(week(), "jordan"), "alex")).toEqual({ personIds: ["priya"] })
  })

  it("shows at most five people", () => {
    const people = ["b", "c", "d", "e", "f", "g"].map(id => ({ ...blank().people[1], id, name: `${id.toUpperCase()} Example` }))
    const s = { ...on(blank(), "2026-11-02"), people: [...blank().people.filter(p => p.id === "alex"), ...people], activity: people.map((p, i) => doneEvent(i + 1, p.id, "2026-11-02", { detailsChars: 10, files: 0 })) }
    expect(weeklyLine(s, "alex")).toEqual({ personIds: ["b", "c", "d", "e", "f"] })
  })

  it("is dismissed for the rest of the week and returns the next Monday", () => {
    const s = as(week(), "alex")
    const dismissed = cheer(s, { kind: "dismissWeeklyLine" })
    expect(cheersOf(dismissed).weeklyLineDismissed).toEqual({ alex: "2026-11-02" })
    expect(weeklyLine(dismissed, "alex")).toBeNull()
    expect(weeklyLine(on(dismissed, "2026-11-03"), "alex")).toBeNull()
    expect(cheer(dismissed, { kind: "dismissWeeklyLine" })).toBe(dismissed)
    const next = { ...on(dismissed, "2026-11-09"), activity: [doneEvent(9, "sam", "2026-11-09", { detailsChars: 5, files: 0 })] }
    expect(weeklyLine(next, "alex")).toEqual({ personIds: ["sam"] })
    // Only a president or VP can dismiss it.
    const maya = as(week(), "maya")
    expect(cheer(maya, { kind: "dismissWeeklyLine" })).toBe(maya)
  })
})

describe("Cheers: thank prompt", () => {
  it("shows on a finished task to anyone who can send, except its owner", () => {
    const s = blank()
    expect(thankPromptFor(s, "alex", "t-checkin")).toEqual({ ownerId: "jordan" })
    expect(thankPromptFor(s, "jordan", "t-checkin")).toBeNull()
    expect(thankPromptFor(s, "alex", "t-agenda")).toBeNull() // not done
    expect(thankPromptFor(s, "alex", "t-photos")).toBeNull() // no owner
    expect(thankPromptFor(s, "alex", "t-nowhere")).toBeNull()
  })

  it("does not show to an incoming officer or for a former owner", () => {
    expect(thankPromptFor(withIncoming(blank()), "riley", "t-checkin")).toBeNull()
    expect(thankPromptFor(withFormer(blank(), "jordan"), "alex", "t-checkin")).toBeNull()
  })
})

describe("Cheers: the email the recipients get", () => {
  const base = "https://club.example.org/app/#/team?x=1"
  it("writes the subject, greeting, task, note and card link, and no running total", () => {
    const s = sendAs(blank(), "maya", ["jordan"], 300, { nodeId: "e-night:venue" })
    const c = last(s)
    const mail = cheerMail(s, c, "jordan", base)
    expect(mail.url).toBe(`https://club.example.org/app/#/?cheer=${c.id}`)
    expect(mail.url).toBe(cheerLink(base, c.id))
    expect(mail.subject).toBe("⭐ Maya sent you 300 points")
    expect(mail.body).toBe(`Hi Jordan,\n\nMaya sent you 300 points for Book Room & Layout (Networking Night).\n\nWhy: “${NOTE}”\n\nSee your card:\n${mail.url}`)
    expect(mail.body).not.toMatch(/total|this term/i)
    expect(composeUrl("email", mail.body, mail.subject)).toContain(encodeURIComponent(mail.subject))
  })

  it("is the same text whoever is let know: the people let know change nothing in it", () => {
    const plain = sendAs(blank(), "maya", ["jordan"], 300)
    const shared = sendAs(blank(), "maya", ["jordan"], 300, { ccIds: ["alex"] })
    expect(cheerMail(shared, last(shared), "jordan", base)).toEqual(cheerMail(plain, last(plain), "jordan", base))
    expect(last(shared).email).toBe(true)
  })

  it("the card link keeps only origin and path: a query before the # (a walkthrough's ?walk=1) is dropped", () => {
    expect(cheerLink("http://localhost:5173/?walk=1#/team", "ch-3")).toBe("http://localhost:5173/#/?cheer=ch-3")
    expect(cheerLink("https://club.example.org/app/index.html?walk=1&x=2#/tasks?node=n1", "ch-12")).toBe("https://club.example.org/app/index.html#/?cheer=ch-12")
    expect(cheerLink("https://club.example.org/app/?walk=1", "ch-0")).toBe("https://club.example.org/app/#/?cheer=ch-0")
    expect(cheerLink("https://club.example.org/app/", "ch-0")).toBe("https://club.example.org/app/#/?cheer=ch-0")
  })

  it("the Gmail draft can carry a To address; without one every existing draft address is unchanged", () => {
    expect(composeUrl("email", "Body text", "Subject")).toBe("https://mail.google.com/mail/?view=cm&fs=1&su=Subject&body=Body%20text")
    expect(composeUrl("whatsapp", "Body text", "Subject")).toBe("https://wa.me/?text=Body%20text")
    expect(composeUrl("sms", "Body text", "Subject")).toBe("sms:?body=Body%20text")
    const withTo = new URL(composeUrl("email", "Body text", "⭐ Maya sent you 25 points", "jordan.patel@example.org"))
    expect(withTo.searchParams.get("to")).toBe("jordan.patel@example.org")
    expect(withTo.searchParams.get("su")).toBe("⭐ Maya sent you 25 points")
    expect(withTo.searchParams.get("body")).toBe("Body text")
    expect(composeUrl("email", "Body text", "Subject", "")).toBe(composeUrl("email", "Body text", "Subject"))
    expect(composeUrl("sms", "Body text", "Subject", "jordan.patel@example.org")).toBe("sms:?body=Body%20text")
  })

  it("leaves out the task when there is none, and the event when the task has none", () => {
    const s = sendAs(blank(), "maya", ["jordan", "sam"], 100)
    expect(cheerMail(s, last(s), "sam", base).body.split("\n").slice(0, 3)).toEqual(["Hi Sam,", "", "Maya sent you 100 points."])
    const t = sendAs(blank(), "maya", ["jordan"], 100, { nodeId: "t-checkin" })
    expect(cheerMail(t, last(t), "jordan", base).body).toContain("Maya sent you 100 points for Record meeting attendance.\n")
  })

  it("stays within 80 words besides the note, however long the task name", () => {
    const longTitle = Array.from({ length: 120 }, (_, i) => `word${i}`).join(" ")
    let s = blank()
    s = { ...s, nodes: s.nodes.map(n => n.id === "e-night:venue" ? { ...n, title: longTitle } : n), events: s.events.map(e => e.id === "e-night" ? { ...e, name: longTitle } : e) }
    s = sendAs(s, "maya", ["jordan"], 250, { nodeId: "e-night:venue" })
    const { body } = cheerMail(s, last(s), "jordan", base)
    const words = (t: string) => t.split(/\s+/).filter(Boolean).length
    expect(words(body) - words(NOTE)).toBeLessThanOrEqual(80)
    expect(body).toContain(`Why: “${NOTE}”`)
  })
})

describe("Cheers: sanitizing loaded and imported data", () => {
  const good = (over: Partial<Cheer> = {}): Cheer => ({ id: "ch-1", fromId: "maya", toIds: ["jordan"], points: 250, note: NOTE, card: "thanks", on: "2026-10-30", seenBy: [], ...over })

  it("returns the same state when there is nothing to clean, the v2 seed included", () => {
    const seeded = seedDemo(undefined, "v2")
    expect(withSanitizedCheers(seeded)).toBe(seeded)
    const none = blank()
    expect(withSanitizedCheers(none)).toBe(none)
  })

  it("keeps an R1 save as it is: old points, old card values, email flags and withdrawals", () => {
    const r1 = [
      good({ id: "ch-1", points: 10, card: "thanks" }),
      good({ id: "ch-2", points: 25, card: "star", email: true }),
      good({ id: "ch-3", points: 50, card: "teamwork", withdrawnOn: "2026-10-30" }),
      good({ id: "ch-4", points: 100, card: "star", nodeId: "e-night:venue" }),
    ]
    const s = { ...blank(), cheers: { cheers: r1 } }
    expect(cheersOf(withSanitizedCheers(s)).cheers).toEqual(r1)
    expect(cheersOf(withSanitizedCheers(s)).cheers.map(c => CHEER_CARD_EMOJI[c.card])).toEqual(["🙌", "⭐", "🤝", "⭐"])
  })

  it("keeps new points and trophies, and cleans the people let know", () => {
    const s = { ...blank(), cheers: { cheers: [
      good({ id: "ch-1", points: 130, card: "rocket", ccIds: ["alex"] }),
      good({ id: "ch-2", points: 5000, card: "heart", ccIds: ["alex", "alex", "maya", "jordan", "ghost", 7 as unknown as string, "priya"] }),
      good({ id: "ch-3", ccIds: [] }),
      good({ id: "ch-4", ccIds: "alex" as unknown as string[] }),
      good({ id: "ch-5", toIds: ["jordan"], ccIds: ["alex", "priya", "sam", "c1", "c2", "c3", "c4"] }),
    ] } }
    const people = [...s.people, ...["c1", "c2", "c3", "c4"].map(id => ({ ...s.people.find(p => p.id === "priya")!, id, name: `${id} Example` }))]
    const clean = withSanitizedCheers({ ...s, people })
    expect(cheersOf(clean).cheers).toEqual([
      good({ id: "ch-1", points: 130, card: "rocket", ccIds: ["alex"] }),
      good({ id: "ch-2", points: 5000, card: "heart", ccIds: ["alex", "priya"] }),
      good({ id: "ch-3" }),
      good({ id: "ch-4" }),
      good({ id: "ch-5", ccIds: ["alex", "priya", "sam", "c1", "c2"] }),
    ])
    expect(withSanitizedCheers(clean)).toBe(clean)
  })

  it("drops hostile or malformed cheers and keeps valid ones", () => {
    const hostile = [
      good(),
      good(), // duplicate id
      null, 42, "ch-x",
      good({ id: "ch-2", fromId: "nobody" }),
      good({ id: "ch-3", points: 30 }), // neither an R1 value nor 100 or more
      good({ id: "ch-3a", points: 150.5 }),
      good({ id: "ch-3b", points: -100 }),
      good({ id: "ch-3c", points: 10 ** 9 }),
      good({ id: "ch-3d", points: "250" as unknown as number }),
      good({ id: "ch-4", card: "<script>" as CheerCard }),
      good({ id: "ch-5", note: "x".repeat(5000) }),
      good({ id: "ch-6", note: "short" }),
      good({ id: "ch-7", toIds: [] }),
      good({ id: "ch-8", toIds: ["jordan", "sam", "priya", "alex", "nobody", "x", "y"].slice(0, 6) as string[] }),
      good({ id: "ch-9", on: "yesterday" }),
      good({ id: "x".repeat(500) }),
      good({ id: "ch-10", toIds: ["maya", "jordan", "ghost"], seenBy: ["jordan", "sam", 7 as unknown as string], email: "yes" as unknown as boolean }),
      { ...good({ id: "ch-11" }), extra: "a".repeat(10000), note: `  ${NOTE}  ` },
      good({ id: "ch-12", toIds: ["jordan", "sam", "priya", "alex", "maya", "maya"] }),
    ]
    const s = { ...blank(), cheers: { cheers: hostile as unknown as Cheer[], weeklyLineDismissed: { alex: "2026-10-26", ghost: "2026-10-26", maya: "soon" } as Record<string, string> } }
    const clean = withSanitizedCheers(s)
    expect(clean).not.toBe(s)
    expect(cheersOf(clean).cheers).toEqual([
      good(),
      good({ id: "ch-8", toIds: ["jordan", "sam", "priya", "alex"] }),
      good({ id: "ch-10", toIds: ["jordan"], seenBy: ["jordan"] }),
      good({ id: "ch-11" }),
      good({ id: "ch-12", toIds: ["jordan", "sam", "priya", "alex"] }),
    ])
    expect(cheersOf(clean).weeklyLineDismissed).toEqual({ alex: "2026-10-26" })
    expect(withSanitizedCheers(clean)).toBe(clean)
  })

  it("read helpers and the reducer ignore unsanitized entries instead of throwing (a save the migration could not upgrade)", () => {
    const junk = [null, 42, "ch-x", {}, { id: "ch-7" }, { id: "ch-8", fromId: "maya", toIds: "jordan", seenBy: [], on: "2026-10-30", points: 25, note: NOTE }, { ...good({ id: "ch-9", fromId: "jordan", toIds: ["sam"] }), ccIds: "maya" }]
    const raw = { ...as(blank(), "maya"), cheers: { cheers: [...junk, good({ id: "ch-1", fromId: "jordan", toIds: ["maya"] }), good({ id: "ch-2", on: "2026-10-31" })] as unknown as Cheer[] } }
    expect(cheersOf(raw).cheers.map(c => c.id)).toEqual(["ch-9", "ch-1", "ch-2"])
    expect(cheersOf(raw)).toBe(cheersOf(raw))
    expect(visibleCheers(raw, "maya").map(c => c.id)).toEqual(["ch-2", "ch-1"])
    expect(unseenFor(raw, "maya").map(c => c.id)).toEqual(["ch-1"])
    expect(allowanceOf(raw, "maya")).toEqual({ total: 1000, used: 250, left: 750 })
    expect(receivedThisTerm(raw, "maya")).toBe(250)
    expect(givenThisTerm(raw, "maya")).toBe(250)
    expect(validateCheer(raw, "maya", send(["sam"]))).toBeNull()
    expect(() => weeklyLine(as(raw, "alex"), "alex")).not.toThrow()
    expect(cheerRecipients(raw, "maya").length).toBeGreaterThan(0)
    expect(thankPromptFor(raw, "maya", "t-checkin")).toEqual({ ownerId: "jordan" })
    // Every action goes through the reducer without throwing.
    const sent = cheer(raw, send(["sam"]))
    expect(last(sent)).toMatchObject({ id: "ch-10", toIds: ["sam"] })
    expect(cheer(raw, { kind: "withdraw", id: "ch-2" })).toBe(raw)
    expect(cheersOf(cheer(raw, { kind: "markSeen", ids: ["ch-1"] })).cheers.find(c => c.id === "ch-1")?.seenBy).toEqual(["maya"])
    expect(() => cheer(as(on(raw, "2026-11-02"), "alex"), { kind: "dismissWeeklyLine" })).not.toThrow()
    expect(cheer(raw, { kind: "withdraw", id: "ch-7" })).toBe(raw)
  })

  it("replaces a book that is not a book", () => {
    const s = { ...blank(), cheers: "everything" as unknown as DemoState["cheers"] }
    expect(withSanitizedCheers(s).cheers).toEqual({ cheers: [] })
  })

  it("cleans an imported file through the reducer", () => {
    const file = { ...blank(), cheers: { cheers: [good(), good({ id: "ch-2", note: "x".repeat(300) })] } }
    const next = reducer(blank(), { type: "replace", state: file })
    expect(cheersOf(next).cheers.map(c => c.id)).toEqual(["ch-1"])
  })
})

describe("Cheers: v2 seed", () => {
  it("gives Maya received and sent rows and an allowance in use on the new scale, with nothing unseen for the president", () => {
    const s = seedDemo(undefined, "v2")
    expect(cheersOf(s)).toEqual(sampleCheers())
    const maya = visibleCheers(s, "maya")
    expect(maya.some(c => c.fromId === "maya")).toBe(true)
    expect(maya.filter(c => c.toIds.includes("maya")).length).toBeGreaterThanOrEqual(2)
    expect(allowanceOf(s, "maya")).toEqual({ total: 1000, used: 250, left: 750 })
    expect(receivedThisTerm(s, "maya")).toBe(800)
    for (const viewer of ["alex", "maya", "jordan", "sam", "priya"]) expect(unseenFor(s, viewer), viewer).toEqual([])
    for (const c of cheersOf(s).cheers) {
      expect(c.points).toBeGreaterThanOrEqual(200)
      expect(c.points).toBeLessThanOrEqual(500)
      expect(c.email).toBe(true)
      expect(validateCheer(as(on(s, c.on), c.fromId), c.fromId, { kind: "send", toIds: c.toIds, points: c.points, note: c.note, nodeId: c.nodeId, card: c.card })).toBeNull()
    }
  })

  it("leaves the legacy fixture without cheers", () => {
    expect(seedDemo().cheers).toBeUndefined()
  })
})
