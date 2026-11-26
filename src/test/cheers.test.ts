import { describe, expect, it } from "vitest"
import type { ActivityEvent, Cheer, CheerCard, CheerPoints, DemoState } from "../data/types"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { loggedReducer, reducer } from "../data/store"
import {
  allowanceOf, canReceiveCheers, canSendCheers, cheerRecipients, cheersOf, givenThisTerm, receivedThisTerm, thankPromptFor, unseenFor,
  validateCheer, visibleCheers, weeklyLine, withSanitizedCheers, type CheerAction,
} from "../data/cheers"
import { sampleCheers } from "../data/cheerSeed"
import { cheerLink, cheerMail } from "../lib/cheerMail"
import { composeUrl } from "../lib/nudges"

/**
 * Cheers model (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §2 and §4). Every rule goes through the real exported reducer.
 * The v2 demo starts on Sat Oct 31, 2026 (week Mon Oct 26 – Sun Nov 1, Fall 2026) with four seeded cheers.
 */

/** The v2 demo without its seeded cheers, so counts start at zero. */
const blank = (): DemoState => ({ ...seedDemo(undefined, "v2"), cheers: undefined })
const as = (s: DemoState, viewerId: string): DemoState => ({ ...s, viewerId })
const on = (s: DemoState, today: string): DemoState => ({ ...s, today })
const cheer = (s: DemoState, action: CheerAction) => reducer(s, { type: "cheerAction", action })
const NOTE = "Room booked two weeks early, so the caterer could confirm."
const send = (toIds: string[], points: CheerPoints = 25, extra: Partial<Extract<CheerAction, { kind: "send" }>> = {}): Extract<CheerAction, { kind: "send" }> =>
  ({ kind: "send", toIds, points, note: NOTE, card: "thanks", ...extra })
/** Sends as `from`, then switches the viewer back. */
const sendAs = (s: DemoState, from: string, toIds: string[], points: CheerPoints = 25, extra: Partial<Extract<CheerAction, { kind: "send" }>> = {}) =>
  ({ ...cheer(as(s, from), send(toIds, points, extra)), viewerId: s.viewerId })
const last = (s: DemoState): Cheer => cheersOf(s).cheers.at(-1)!
/** Jordan (Events lead) as vice president. */
const withVp = (s: DemoState): DemoState => ({ ...s, roles: s.roles.map(r => r.id === "r-events" ? { ...r, fn: "vice_president" } : r) })
/** Riley, named as the next Treasurer but not an officer yet. */
const withIncoming = (s: DemoState): DemoState => ({ ...s, people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", email: "riley.example@example.org", incomingFor: "r-fin" }] })
const withFormer = (s: DemoState, id = "sam"): DemoState => ({ ...s, people: s.people.map(p => p.id === id ? { ...p, leftOn: "2026-10-01" } : p) })
const doneEvent = (seq: number, personId: string, day: string, facts: Record<string, number | boolean>): ActivityEvent =>
  ({ id: `act:${seq}`, seq, on: day, actorId: personId, kind: "task.done", personIds: [personId], nodeId: `t-x${seq}`, facts, source: "live" })

describe("Cheers: sending", () => {
  it("keeps SCHEMA_VERSION 23 and reads a save without cheers as empty", () => {
    expect(SCHEMA_VERSION).toBe(23)
    const s = blank()
    expect(cheersOf(s)).toEqual({ cheers: [] })
    expect(visibleCheers(s, "maya")).toEqual([])
    expect(allowanceOf(s, "maya")).toEqual({ total: 200, used: 0, left: 200 })
  })

  it("stores a trimmed note, the demo date, a ch-<n> id and one notice per recipient without the note", () => {
    const s = as(blank(), "maya")
    const next = cheer(s, send(["jordan", "sam"], 25, { note: `   ${NOTE}   `, nodeId: "e-night:venue", card: "star", email: true }))
    const c = last(next)
    expect(c).toEqual({ id: "ch-0", fromId: "maya", toIds: ["jordan", "sam"], points: 25, note: NOTE, nodeId: "e-night:venue", card: "star", on: "2026-10-31", email: true, seenBy: [] })
    const notices = next.notifications.filter(n => n.kind === "cheer")
    expect(notices).toEqual([
      { id: "cheer:ch-0:jordan", recipientId: "jordan", nodeId: "e-night:venue", kind: "cheer", text: "Maya sent you 25 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-0" },
      { id: "cheer:ch-0:sam", recipientId: "sam", nodeId: "e-night:venue", kind: "cheer", text: "Maya sent you 25 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-0" },
    ])
    for (const n of notices) expect(n.text).not.toContain("caterer")
    // The next id follows the highest counter in use.
    expect(last(cheer(next, send(["priya"]))).id).toBe("ch-1")
  })

  it("uses an empty notice nodeId for a cheer without a task, and leaves out email when it was not chosen", () => {
    const next = cheer(as(blank(), "maya"), send(["jordan"], 10))
    expect(last(next)).not.toHaveProperty("nodeId")
    expect(last(next)).not.toHaveProperty("email")
    expect(next.notifications.find(n => n.cheerId === last(next).id)?.nodeId).toBe("")
  })

  it("continues the seeded ids", () => {
    const s = as(seedDemo(undefined, "v2"), "maya")
    expect(last(cheer(s, send(["priya"]))).id).toBe("ch-5")
  })

  it("refuses notes outside 10–280 characters, measured after trimming", () => {
    const s = as(blank(), "maya")
    expect(validateCheer(s, "maya", send(["jordan"], 25, { note: "  short   " }))).toBe("Write at least 10 characters.")
    expect(cheer(s, send(["jordan"], 25, { note: "  short   " }))).toBe(s)
    expect(validateCheer(s, "maya", send(["jordan"], 25, { note: "x".repeat(281) }))).toBe("Keep it under 280 characters.")
    expect(cheer(s, send(["jordan"], 25, { note: "x".repeat(281) }))).toBe(s)
    expect(validateCheer(s, "maya", send(["jordan"], 25, { note: ` ${"x".repeat(280)} ` }))).toBeNull()
    expect(validateCheer(s, "maya", send(["jordan"], 25, { note: "x".repeat(10) }))).toBeNull()
  })

  it("accepts only 10, 25, 50 or 100 points and a known card", () => {
    const s = as(blank(), "maya")
    expect(validateCheer(s, "maya", send(["jordan"], 30 as CheerPoints))).toBe("Choose 10, 25, 50 or 100 points.")
    expect(cheer(s, send(["jordan"], 30 as CheerPoints))).toBe(s)
    expect(validateCheer(s, "maya", send(["jordan"], 25, { card: "gold" as CheerCard }))).toBe("Choose a card style.")
    for (const points of [10, 25, 50, 100] as const) expect(validateCheer(s, "maya", send(["jordan"], points))).toBeNull()
  })

  it("needs 1–5 distinct recipients who can receive, never the sender", () => {
    const s = withIncoming(as(blank(), "alex"))
    expect(validateCheer(s, "alex", send([]))).toBe("Choose who to cheer.")
    expect(validateCheer(s, "alex", send(["maya", "jordan", "sam", "priya", "riley", "maya"], 10))).toBeNull()
    const six = { ...s, people: [...s.people, { ...s.people[1], id: "casey", name: "Casey Example" }] }
    expect(validateCheer(six, "alex", send(["maya", "jordan", "sam", "priya", "riley", "casey"], 10))).toBe("Up to 5 people at a time.")
    expect(validateCheer(s, "alex", send(["alex"]))).toBe("You can't cheer yourself.")
    // The store's role-term upkeep refreshes this hand-made state, so compare the cheers.
    expect(cheersOf(cheer(s, send(["alex"]))).cheers).toEqual([])
    expect(validateCheer(s, "alex", send(["nobody"]))).toBe("Choose people on the team.")
    expect(validateCheer(withFormer(s), "alex", send(["sam"]))).toBe("Choose people on the team.")
    // Duplicates are stored once and charged once.
    const next = cheer(s, send(["maya", "maya", "jordan"], 25))
    expect(last(next).toIds).toEqual(["maya", "jordan"])
    expect(allowanceOf(next, "alex").used).toBe(50)
  })

  it("accepts a task of this club only", () => {
    const s = as(blank(), "maya")
    expect(validateCheer(s, "maya", send(["jordan"], 25, { nodeId: "t-nowhere" }))).toBe("Choose a task from this club.")
    expect(validateCheer(s, "maya", send(["jordan"], 25, { nodeId: "t-checkin" }))).toBeNull()
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

describe("Cheers: weekly allowance", () => {
  it("is 200 for an officer and 500 for the president or a vice president, counting points × recipients", () => {
    let s = blank()
    expect(allowanceOf(s, "maya").total).toBe(200)
    expect(allowanceOf(s, "alex").total).toBe(500)
    expect(allowanceOf(withVp(s), "jordan").total).toBe(500)
    s = sendAs(s, "maya", ["jordan", "sam", "priya"], 50)
    expect(allowanceOf(s, "maya")).toEqual({ total: 200, used: 150, left: 50 })
    expect(validateCheer(as(s, "maya"), "maya", send(["alex"], 100))).toBe("Only 50 points left this week.")
    const maya = as(s, "maya")
    expect(cheer(maya, send(["alex"], 100))).toBe(maya)
    s = sendAs(s, "maya", ["alex"], 50)
    expect(allowanceOf(s, "maya").left).toBe(0)
    expect(validateCheer(as(s, "maya"), "maya", send(["alex"], 10))).toBe("No points left this week.")
    // Receiving is unlimited and does not touch the receiver's allowance.
    expect(allowanceOf(s, "alex").used).toBe(0)
  })

  it("lets the president give up to 500 in a week", () => {
    let s = blank()
    s = sendAs(s, "alex", ["maya", "jordan", "sam", "priya"], 100)
    expect(allowanceOf(s, "alex").left).toBe(100)
    expect(validateCheer(as(s, "alex"), "alex", send(["maya"], 100))).toBeNull()
    s = sendAs(s, "alex", ["maya"], 100)
    expect(validateCheer(as(s, "alex"), "alex", send(["maya"], 10))).toBe("No points left this week.")
  })

  it("resets on Monday by the demo clock; unused points expire", () => {
    let s = sendAs(blank(), "maya", ["jordan", "sam"], 100)
    expect(allowanceOf(s, "maya").left).toBe(0)
    expect(allowanceOf(on(s, "2026-11-01"), "maya").left).toBe(0) // Sunday: same week
    // The lead moves the demo clock two days, to Monday Nov 2.
    const monday = reducer(s, { type: "advanceClock", days: 2 })
    expect(monday.today).toBe("2026-11-02")
    expect(allowanceOf(monday, "maya")).toEqual({ total: 200, used: 0, left: 200 })
    expect(allowanceOf(on(s, "2026-11-09"), "maya").left).toBe(200) // not carried over
  })

  it("does not count withdrawn cheers", () => {
    let s = sendAs(blank(), "maya", ["jordan"], 100)
    s = cheer(as(s, "maya"), { kind: "withdraw", id: last(s).id })
    expect(allowanceOf(s, "maya").used).toBe(0)
  })
})

describe("Cheers: term totals", () => {
  it("counts received points and given points × recipients in the term that contains today", () => {
    let s = blank()
    s = sendAs(s, "maya", ["jordan", "sam"], 25)
    s = sendAs(s, "alex", ["jordan"], 50)
    expect(receivedThisTerm(s, "jordan")).toBe(75)
    expect(receivedThisTerm(s, "sam")).toBe(25)
    expect(givenThisTerm(s, "maya")).toBe(50)
    expect(givenThisTerm(s, "alex")).toBe(50)
    expect(receivedThisTerm(s, "maya")).toBe(0)
  })

  it("leaves out cheers from an earlier term and uses the latest ended term between terms", () => {
    const fall = sendAs(blank(), "maya", ["jordan"], 25)
    // Winter break (between Fall 2026 and Spring 2027): still Fall 2026.
    expect(receivedThisTerm(on(fall, "2026-12-30"), "jordan")).toBe(25)
    // Spring 2027: the fall cheer no longer counts.
    const spring = sendAs(on(fall, "2027-01-20"), "maya", ["jordan"], 10)
    expect(receivedThisTerm(spring, "jordan")).toBe(10)
    expect(givenThisTerm(spring, "maya")).toBe(10)
    // Before any known term: everything.
    expect(receivedThisTerm(on(spring, "2026-01-05"), "jordan")).toBe(35)
  })

  it("does not count withdrawn cheers for anyone", () => {
    let s = sendAs(blank(), "maya", ["jordan"], 25)
    s = cheer(as(s, "maya"), { kind: "withdraw", id: last(s).id })
    expect(receivedThisTerm(s, "jordan")).toBe(0)
    expect(givenThisTerm(s, "maya")).toBe(0)
  })
})

describe("Cheers: privacy", () => {
  it("shows a cheer only to its sender and recipients, newest first", () => {
    let s = blank()
    s = sendAs(s, "maya", ["jordan"], 25)
    s = sendAs(on(s, "2026-11-02"), "alex", ["maya"], 50)
    s = sendAs(s, "sam", ["priya"], 10)
    expect(visibleCheers(s, "maya").map(c => [c.fromId, c.toIds])).toEqual([["alex", ["maya"]], ["maya", ["jordan"]]])
    expect(visibleCheers(s, "jordan").map(c => c.fromId)).toEqual(["maya"])
    // A third officer sees none of another pair's cheers.
    expect(visibleCheers(s, "priya").map(c => c.fromId)).toEqual(["sam"])
    expect(visibleCheers(s, "alex").every(c => c.fromId === "alex" || c.toIds.includes("alex"))).toBe(true)
  })

  it("orders cheers of the same day by when they were sent", () => {
    let s = blank()
    s = sendAs(s, "maya", ["jordan"], 10)
    s = sendAs(s, "alex", ["jordan"], 25)
    expect(visibleCheers(s, "jordan").map(c => c.fromId)).toEqual(["alex", "maya"])
    expect(unseenFor(s, "jordan").map(c => c.fromId)).toEqual(["maya", "alex"])
  })
})

describe("Cheers: withdraw", () => {
  it("lets the sender withdraw on the same demo date: hidden, uncounted, unread notices marked read", () => {
    let s = sendAs(blank(), "maya", ["jordan", "sam"], 25)
    const id = last(s).id
    s = { ...s, notifications: s.notifications.map(n => n.id === `cheer:${id}:sam` ? { ...n, read: true } : n) }
    const next = cheer(as(s, "maya"), { kind: "withdraw", id })
    expect(last(next).withdrawnOn).toBe("2026-10-31")
    expect(visibleCheers(next, "maya")).toEqual([])
    expect(visibleCheers(next, "jordan")).toEqual([])
    expect(unseenFor(next, "jordan")).toEqual([])
    expect(next.notifications.filter(n => n.cheerId === id).map(n => n.read)).toEqual([true, true])
    // Twice changes nothing.
    expect(cheer(next, { kind: "withdraw", id })).toBe(next)
  })

  it("refuses anyone but the sender, and the sender on a later day", () => {
    const s = sendAs(blank(), "maya", ["jordan"], 25)
    const id = last(s).id
    const jordan = as(s, "jordan")
    expect(cheer(jordan, { kind: "withdraw", id })).toBe(jordan)
    const alex = as(s, "alex")
    expect(cheer(alex, { kind: "withdraw", id })).toBe(alex)
    const tomorrow = as(on(s, "2026-11-01"), "maya")
    expect(cheer(tomorrow, { kind: "withdraw", id })).toBe(tomorrow)
    const unknown = as(s, "maya")
    expect(cheer(unknown, { kind: "withdraw", id: "ch-99" })).toBe(unknown)
  })
})

describe("Cheers: seen cards", () => {
  it("marks a recipient's card seen once and reads their matching notice only", () => {
    let s = sendAs(blank(), "maya", ["jordan", "sam"], 25)
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
    let s = sendAs(withIncoming(blank()), "maya", ["riley"], 25)
    const id = last(s).id
    s = cheer(as(s, "riley"), { kind: "markSeen", ids: [id] })
    expect(last(s).seenBy).toEqual(["riley"])
    expect(s.notifications.find(n => n.id === `cheer:${id}:riley`)?.read).toBe(true)
  })

  it("ignores ids that are not the viewer's received cheers", () => {
    const s = sendAs(blank(), "maya", ["jordan"], 25)
    const id = last(s).id
    for (const viewer of ["maya", "alex"]) {
      const v = as(s, viewer)
      expect(cheer(v, { kind: "markSeen", ids: [id, "ch-99"] })).toBe(v)
    }
  })
})

describe("Cheers: activity record", () => {
  it("records cheer.sent and cheer.withdrawn with IDs and numbers, never the note", () => {
    let s = as(blank(), "maya")
    s = cheer(s, send(["jordan", "sam"], 25, { nodeId: "e-night:venue", card: "star", email: true }))
    const id = last(s).id
    s = cheer(s, { kind: "withdraw", id })
    const events = (s.activity ?? []).filter(e => e.kind.startsWith("cheer."))
    expect(events.map(({ id: _id, seq: _seq, ...rest }) => rest)).toEqual([
      { on: "2026-10-31", actorId: "maya", kind: "cheer.sent", personIds: ["jordan", "sam"], nodeId: "e-night:venue", source: "live",
        facts: { cheerId: id, points: 25, recipients: 2, noteChars: NOTE.length, card: "star", email: true } },
      { on: "2026-10-31", actorId: "maya", kind: "cheer.withdrawn", personIds: ["jordan", "sam"], source: "live", facts: { cheerId: id } },
    ])
    expect(JSON.stringify(s.activity)).not.toContain("caterer")
  })

  it("records nothing for seen cards or a dismissed weekly line", () => {
    let s = sendAs(blank(), "maya", ["jordan"], 25)
    const count = (s.activity ?? []).length
    s = cheer(as(s, "jordan"), { kind: "markSeen", ids: [last(s).id] })
    s = cheer(as(on(s, "2026-11-02"), "alex"), { kind: "dismissWeeklyLine" })
    expect((s.activity ?? []).length).toBe(count)
  })

  it("keeps every part of the note out of the research log", () => {
    const note = "Zebra-quartz flyer shipped ahead of the Thursday meeting, really appreciated"
    let root = { app: as(blank(), "maya"), log: [] as import("../data/types").LogEntry[] }
    root = loggedReducer(root, { action: { type: "cheerAction", action: send(["jordan"], 50, { note, nodeId: "t-checkin" }) }, at: 1 })
    const id = last(root.app).id
    root = loggedReducer(root, { action: { type: "cheerAction", action: { kind: "withdraw", id } }, at: 2 })
    expect(cheersOf(root.app).cheers[0].note).toBe(note)
    expect(root.log).toHaveLength(2)
    expect(root.log[0].payload).toEqual({ kind: "send", recipients: 1, points: 50, noteLength: note.length, nodeId: "t-checkin", card: "thanks", email: false })
    const logged = JSON.stringify(root.log)
    for (const word of note.split(/\W+/).filter(w => w.length > 3)) expect(logged).not.toContain(word)
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

describe("Cheers: email draft", () => {
  const base = "https://club.example.org/app/#/team?x=1"
  it("writes the subject, greeting, task, note and card link, and no running total", () => {
    const s = sendAs(blank(), "maya", ["jordan"], 25, { nodeId: "e-night:venue" })
    const c = last(s)
    const mail = cheerMail(s, c, "jordan", base)
    expect(mail.url).toBe(`https://club.example.org/app/#/?cheer=${c.id}`)
    expect(mail.url).toBe(cheerLink(base, c.id))
    expect(mail.subject).toBe("⭐ Maya sent you 25 points")
    expect(mail.body).toBe(`Hi Jordan,\n\nMaya sent you 25 points for Book Room & Layout (Networking Night).\n\nWhy: “${NOTE}”\n\nSee your card:\n${mail.url}`)
    expect(mail.body).not.toMatch(/total|this term/i)
    expect(composeUrl("email", mail.body, mail.subject)).toContain(encodeURIComponent(mail.subject))
  })

  it("leaves out the task when there is none, and the event when the task has none", () => {
    const s = sendAs(blank(), "maya", ["jordan", "sam"], 10)
    expect(cheerMail(s, last(s), "sam", base).body.split("\n").slice(0, 3)).toEqual(["Hi Sam,", "", "Maya sent you 10 points."])
    const t = sendAs(blank(), "maya", ["jordan"], 10, { nodeId: "t-checkin" })
    expect(cheerMail(t, last(t), "jordan", base).body).toContain("Maya sent you 10 points for Record meeting attendance.\n")
  })

  it("stays within 80 words besides the note, however long the task name", () => {
    const longTitle = Array.from({ length: 120 }, (_, i) => `word${i}`).join(" ")
    let s = blank()
    s = { ...s, nodes: s.nodes.map(n => n.id === "e-night:venue" ? { ...n, title: longTitle } : n), events: s.events.map(e => e.id === "e-night" ? { ...e, name: longTitle } : e) }
    s = sendAs(s, "maya", ["jordan"], 25, { nodeId: "e-night:venue" })
    const { body } = cheerMail(s, last(s), "jordan", base)
    const words = (t: string) => t.split(/\s+/).filter(Boolean).length
    expect(words(body) - words(NOTE)).toBeLessThanOrEqual(80)
    expect(body).toContain(`Why: “${NOTE}”`)
  })
})

describe("Cheers: sanitizing loaded and imported data", () => {
  const good = (over: Partial<Cheer> = {}): Cheer => ({ id: "ch-1", fromId: "maya", toIds: ["jordan"], points: 25, note: NOTE, card: "thanks", on: "2026-10-30", seenBy: [], ...over })

  it("returns the same state when there is nothing to clean, the v2 seed included", () => {
    const seeded = seedDemo(undefined, "v2")
    expect(withSanitizedCheers(seeded)).toBe(seeded)
    const none = blank()
    expect(withSanitizedCheers(none)).toBe(none)
  })

  it("drops hostile or malformed cheers and keeps valid ones", () => {
    const hostile = [
      good(),
      good(), // duplicate id
      null, 42, "ch-x",
      good({ id: "ch-2", fromId: "nobody" }),
      good({ id: "ch-3", points: 1000 as CheerPoints }),
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
  it("gives Maya received and sent rows and an allowance in use, with nothing unseen for the president", () => {
    const s = seedDemo(undefined, "v2")
    expect(cheersOf(s)).toEqual(sampleCheers())
    const maya = visibleCheers(s, "maya")
    expect(maya.some(c => c.fromId === "maya")).toBe(true)
    expect(maya.filter(c => c.toIds.includes("maya")).length).toBeGreaterThanOrEqual(2)
    expect(allowanceOf(s, "maya")).toEqual({ total: 200, used: 25, left: 175 })
    expect(receivedThisTerm(s, "maya")).toBe(75)
    expect(unseenFor(s, "alex")).toEqual([])
    for (const c of cheersOf(s).cheers) expect(validateCheer(as(on(s, c.on), c.fromId), c.fromId, { kind: "send", toIds: c.toIds, points: c.points, note: c.note, nodeId: c.nodeId, card: c.card })).toBeNull()
  })

  it("leaves the legacy fixture without cheers", () => {
    expect(seedDemo().cheers).toBeUndefined()
  })
})
