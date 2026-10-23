import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { buildNudge, composeUrl, messageText, nudgeBlocked, nudgeCheck, STATUS_ACTIONS } from "../lib/nudges"
import { eventStrip, weeklyStars } from "../lib/today"

const s = seedDemo()
const n = s.nodes.find(n => n.id === "t-news")!
describe("reminder guardrails", () => {
  it("checks every seeded task under 100 words with the required five sections and <=3 steps", () => {
    for (const node of s.nodes) {
      const d = buildNudge(s, node)
      expect(d.checked, node.id).toBe(true)
      expect(nudgeCheck(d.subject, d.body).ok, node.id).toBe(true)
      expect(d.wordCount).toBeLessThanOrEqual(100)
    }
  })
  it.each(["Is it done yet?", "ASAP", "This should only take an hour", "Just use AI", "URGENT", "@everyone"])("rewrites unsafe input: %s", phrase => {
    const d = buildNudge(s, { ...n, title: phrase }, phrase)
    expect(d.checked).toBe(true)
    expect(d.subject + d.body).not.toContain(phrase)
  })
  it("rechecks provider text and ignores suggested dates or an oversized meaning line", () => {
    const d = buildNudge(s, n, "We must finish by 2099-12-31")
    expect(d.body).not.toContain("2099")
    expect(buildNudge(s, n, "we ".repeat(500)).wordCount).toBeLessThanOrEqual(100)
  })
  it("stale first line asks for confirmation; a fresh task does not", () => {
    expect(buildNudge(s, n).body.split("\n")[0]).toContain("If already done, tell us here")
    expect(buildNudge(s, { ...n, lastUpdate: s.today }).body).not.toContain("If already done")
  })
  it("uses current engine dates and real downstream tasks", () => {
    const node = s.nodes.find(n => n.id === "e-night:usg")!
    const d = buildNudge(s, node)
    expect(d.body).toContain("Oct 30")
    expect(d.body).toContain("Nov 4")
    expect(d.body).toContain("7 pm")
    const changed = reducer(s, { type: "updateNode", id: node.id, patch: { clubDeadlineOverride: "2026-11-02" } })
    expect(buildNudge(changed, changed.nodes.find(n => n.id === node.id)!).body).toContain("Nov 2")
  })
  it("builds all three encoded draft links with no recipient and four task status links", () => {
    const draft = buildNudge(s, n)
    const msg = messageText(draft, "https://demo.example.org", n.id)
    STATUS_ACTIONS.forEach(a => expect(msg).toContain(`reply=${a.key}`))
    for (const channel of ["whatsapp", "sms", "email"] as const) {
      const url = composeUrl(channel, msg, draft.subject)
      expect(decodeURIComponent(url)).toContain(draft.body)
      expect(url).not.toContain("to=")
    }
  })
  it("does not send on opening; explicit confirmation is role-checked and capped at three", () => {
    const action = { type: "confirmNudgeSent", nodeId: n.id, channel: "whatsapp", text: "A reviewed demo reminder" } as const
    const officer = { ...s, viewerId: "sam" }
    expect(reducer(officer, action)).toBe(officer)
    expect(s.nudges).toHaveLength(0)
    const three = reducer(reducer(reducer(s, action), action), action)
    expect(three.nudges).toHaveLength(3)
    expect(reducer(three, action)).toBe(three)
    expect(nudgeBlocked(s, { ...n, status: "done" })).toMatch(/complete/)
    expect(nudgeBlocked(s, { ...n, ownerId: null })).toMatch(/owner/)
    expect(nudgeBlocked({ ...three, nudges: [{ ...three.nudges[0], response: "waiting" }] }, n)).toMatch(/replied/)
  })
  it("stops after a newer task update", () => {
    const newer = { ...s, today: "2026-10-24", nudges: [{ id: "x", nodeId: n.id, channel: "email" as const, text: "x", sentBy: "alex", sentOn: "2026-10-22", response: null }] }
    expect(nudgeBlocked(newer, { ...n, lastUpdate: "2026-10-23" })).toMatch(/newer update/)
  })
})

describe("Today summaries", () => {
  it("shows exactly the current unfinished step and next two in dependency order", () => {
    const nodes = s.nodes.filter(n => n.eventId === "e-night")
    const strip = eventStrip(nodes)
    expect(strip).toHaveLength(3)
    expect(strip.every(n => n.status !== "done")).toBe(true)
    expect(strip.every(n => n.phase !== "close")).toBe(true)
    expect(strip[0].stepKey).toBe("flyer")
    expect(eventStrip(nodes.map(n => ({ ...n, status: "done" })))).toEqual([])
  })
  it("counts existing completed-task points in the demo week, shows ties, excludes stale/future and deduplicates", () => {
    expect(weeklyStars(s)).toHaveLength(3)
    const duplicate = { ...s, contributions: [...s.contributions, s.contributions[0]] }
    expect(weeklyStars(duplicate).map(x => x.points)).toEqual([1, 1, 1])
    expect(weeklyStars({ ...s, today: "2026-11-02" })).toEqual([])
    expect(weeklyStars({ ...s, today: "2026-10-19" })).toEqual([])
  })
})
