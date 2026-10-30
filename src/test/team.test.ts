import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { availabilityGrid, calendarDraftUrl, cellKey, cellsToSlots, commonMeetingSlots, contributionBoard, mondayOf, slotsToCells, whoIsFree, workload } from "../engine/team"
import { validateProfile, profilePatch } from "../data/settings"
const base = () => seedDemo("2026-10-22")
describe("team workload and recognition", () => {
  it("keeps legacy contribution records while the board derives recognition from the completed steps", () => {
    const s = base(); for (const c of s.contributions) { const n = s.nodes.find(n => n.id === c.nodeId)!; expect(c.points).toBe(({ light: 1, medium: 2, heavy: 3 }[n.tier]) + (c.onTime ? 1 : 0)) }
  })
  it("weights estimated effort, urgency and dependency impact while excluding completed or far-future work", () => {
    const s = base(), template = s.nodes[0]; s.nodes = [1, 2, 3, 4].map(i => ({ ...template, id: String(i), ownerId: "maya", tier: "medium", status: "accepted", latestStart: i === 4 ? "2027-01-01" : "2026-10-23", clubDeadline: i === 4 ? "2027-01-04" : "2026-10-30" }))
    expect(workload(s, "maya")).toMatchObject({ band: "Focused", through: "2026-11-04" })
    s.nodes[0].estDays = 10; s.nodes[1].estDays = 8; s.nodes[1].tier = "heavy"; expect(workload(s, "maya").band).toBe("Needs support")
    s.nodes[0].status = "done"; s.nodes[1].status = "done"; s.nodes[2].status = "done"; expect(workload(s, "maya").band).toBe("Room to help")
  })
  it("deduplicates completed contributions, excludes future work and shares tied ranks", () => {
    const s = base(), n = s.nodes[0]; n.status = "done"
    const c = { personId: "alex", nodeId: n.id, points: 3, onTime: true, completedOn: s.today }
    s.contributions = [c, c, { ...c, personId: "maya" }, { ...c, personId: "jordan", completedOn: "2027-01-01" }, { ...c, nodeId: s.nodes.find(x => x.status !== "done")!.id, personId: "sam" }]
    const board = contributionBoard(s); expect(board.find(r => r.person.id === "alex")).toMatchObject({ rank: 1, impactLabel: "Meaningful", reliabilityLabel: "Consistently on track" }); expect(board.find(r => r.person.id === "maya")?.rank).toBe(1); expect(board.find(r => r.person.id === "jordan")?.impactLabel).toBe("Getting started")
  })
  it("never uses personal planning buffers as workload or contribution inputs", () => {
    const s = base(), w = workload(s, "maya"), c = contributionBoard(s); s.people[1].personalBufferDays = 5
    expect(workload(s, "maya")).toEqual(w); expect(contributionBoard(s).map(r => r.score)).toEqual(c.map(r => r.score))
  })
})
describe("self-reported meeting intersection", () => {
  it("returns three nonoverlapping Thursday slots shared by every attendee", () => {
    const s = base(); expect(commonMeetingSlots(s, s.people.map(p => p.id), s.today, 30).slots).toEqual([{ from: "18:30", to: "19:00" }, { from: "19:00", to: "19:30" }, { from: "19:30", to: "20:00" }])
  })
  it("joins adjacent availability and respects the requested duration", () => {
    const s = base(); s.people[0].freeSlots = [{ day: 4, from: "18:00", to: "18:30" }, { day: 4, from: "18:30", to: "19:00" }]
    expect(commonMeetingSlots(s, ["alex"], s.today, 60).slots).toEqual([{ from: "18:00", to: "19:00" }])
    expect(commonMeetingSlots(s, ["alex"], s.today, 90).slots).toHaveLength(0)
  })
  it("reports missing availability and no overlap without inferring calendar contents", () => {
    const s = base(); s.people[0].freeSlots = []; expect(commonMeetingSlots(s, ["alex"], s.today, 30).reason).toContain("has not shared")
    s.people[0].freeSlots = [{ day: 4, from: "08:00", to: "09:00" }]; expect(commonMeetingSlots(s, ["alex", "maya"], s.today, 30).reason).toContain("No shared time")
  })
  it.each(["2026-11-05", "2026-11-26", "2026-12-08", "2026-12-21"])("blocks busy weeks, holidays, finals or winter break: %s", date => {
    const s = base(); const r = commonMeetingSlots(s, s.people.map(p => p.id), date, 30); expect(r.slots).toHaveLength(0); expect(r.reason).toContain("No club meeting"); expect(r.reason).not.toContain("Sam")
  })
  it("rejects invalid dates, attendees and durations", () => {
    const s = base(); for (const [ids, date, duration] of [[[], s.today, 30], [["alex", "alex"], s.today, 30], [["missing"], s.today, 30], [["alex"], "2026-02-30", 30], [["alex"], "2026-10-21", 30], [["alex"], s.today, 45]] as [string[], string, number][]) expect(commonMeetingSlots(s, ids, date, duration).slots).toHaveLength(0)
  })
  it("makes an Arizona Calendar draft with no guests and normalizes busy weeks to Mondays", () => {
    const u = new URL(calendarDraftUrl("2026-10-22", "18:30", "19:00")); expect(u.searchParams.get("ctz")).toBe("America/Phoenix"); expect(u.searchParams.get("dates")).toBe("20261022T183000/20261022T190000"); expect(u.searchParams.has("add")).toBe(false)
    expect(mondayOf("2026-10-22")).toBe("2026-10-19"); expect(mondayOf("2026-10-25")).toBe("2026-10-19")
  })
})

describe("When2meet-style meeting grid", () => {
  it("counts how many chosen officers are free in each half hour", () => {
    const s = base(), g = availabilityGrid(s, s.people.map(p => p.id), s.today)
    const thu = g[0].slots, at = (h: number, m = 0) => thu.find(x => x.from === h * 60 + m)!.free
    expect(g).toHaveLength(7); expect(g[0].slots).toHaveLength(28)
    expect(at(17, 30)).toBe(0); expect(at(18)).toBe(4); expect(at(18, 30)).toBe(5); expect(at(19, 30)).toBe(5); expect(at(20)).toBe(0)
  })
  it("names who is free and who is not, and treats busy weeks as not free", () => {
    const s = base(), ids = s.people.map(p => p.id)
    const r = whoIsFree(s, ids, s.today, 18 * 60, 18 * 60 + 30)
    expect(r.free).toHaveLength(4); expect(r.busy.map(p => p.id)).toEqual([s.people[3].id])
    expect(whoIsFree(s, ids, "2026-12-08", 18 * 60 + 30, 19 * 60).free).toHaveLength(0)
    expect(whoIsFree(s, ["alex"], s.today, 18 * 60, 20 * 60 + 30).free).toHaveLength(0)
  })
  it("turns painted cells into merged weekly slots and back, keeping times outside the grid", () => {
    const cells = new Set([cellKey(4, 20), cellKey(4, 21), cellKey(4, 22), cellKey(1, 0)])
    const slots = cellsToSlots(cells, [{ day: 1, from: "06:00", to: "09:00" }, { day: 2, from: "22:00", to: "23:00" }])
    expect(slots).toEqual([{ day: 1, from: "06:00", to: "08:00" }, { day: 1, from: "08:00", to: "08:30" }, { day: 2, from: "22:00", to: "23:00" }, { day: 4, from: "18:00", to: "19:30" }])
    expect([...slotsToCells(slots)].sort()).toEqual([...cells].sort())
  })
  it("round-trips the seeded availability and keeps painted profiles valid", () => {
    const s = base(), me = s.people[0], again = cellsToSlots(slotsToCells(me.freeSlots), me.freeSlots)
    expect(again).toEqual([{ day: 1, from: "18:00", to: "20:00" }, { day: 4, from: "18:00", to: "20:00" }])
    const alternating = new Set(Array.from({ length: 7 }, (_, d) => Array.from({ length: 14 }, (_, j) => cellKey(d, j * 2))).flat())
    expect(validateProfile({ ...profilePatch(me), freeSlots: cellsToSlots(alternating, []) })).toBeNull()
  })
})
