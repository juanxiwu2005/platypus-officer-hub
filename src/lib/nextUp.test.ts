import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { computeSchedule, type Issue, type NodePlan, type Schedule } from "../engine/schedule"
import { computeForecast, type Forecast, type ForecastColor } from "../engine/forecast"
import type { DemoState, Node } from "../data/types"
import { isAtRisk, nextUp } from "./nextUp"
import { nodeStop } from "./phases"

/** S3 "Next up": who acts next and what will be late, ranked from the engine's own schedule and forecast. */
const base = seedDemo("2026-10-22")
const template = base.nodes.find(n => n.eventId)!
const TODAY = "2026-11-01"

interface Spec { id: string; status?: Node["status"]; club: string; start: string; issue?: Issue["severity"]; color?: ForecastColor; eventId?: string }
function build(specs: Spec[]): { state: DemoState; sched: Schedule; forecast: Forecast } {
  const nodes = specs.map(s => ({ ...template, id: s.id, title: s.id, eventId: s.eventId ?? "ev", status: s.status ?? "accepted" }))
  const plan = (s: Spec): NodePlan => ({ id: s.id, official: null, club: s.club, latestStart: s.start, recommendedClub: s.club, explain: { official: null, club: "", latestStart: "" }, pushedBy: null, issues: s.issue ? [{ code: "x", severity: s.issue, text: "x" }] : [] })
  return {
    state: { ...base, today: TODAY, nodes },
    sched: { nodes: Object.fromEntries(specs.map(s => [s.id, plan(s)])), events: {} } as Schedule,
    forecast: { nodes: Object.fromEntries(specs.map(s => [s.id, { nodeId: s.id, probability: 1, color: s.color ?? "green", reasons: [], runs: 1000 }])), events: {} },
  }
}
const ids = (rows: ReturnType<typeof nextUp>) => rows.map(r => `${r.node.id}:${r.reason}`)

describe("nextUp ranking", () => {
  it("puts at-risk steps first, then watch, then steps due to start, each by club deadline", () => {
    const { state, sched, forecast } = build([
      { id: "start-late", club: "2026-11-20", start: "2026-11-01" },
      { id: "start-early", club: "2026-11-10", start: "2026-10-30" },
      { id: "watch", club: "2026-11-30", start: "2026-11-25", color: "yellow" },
      { id: "warn", club: "2026-11-05", start: "2026-11-25", issue: "warn" },
      { id: "red", club: "2026-12-01", start: "2026-11-25", color: "red" },
      { id: "error", club: "2026-11-15", start: "2026-11-25", issue: "error" },
      { id: "later", club: "2026-12-20", start: "2026-12-01" },
    ])
    expect(ids(nextUp(state, sched, forecast, "ev", 10))).toEqual(["error:risk", "red:risk", "warn:watch", "watch:watch", "start-early:start", "start-late:start"])
  })
  it("counts blocked and past-deadline steps as at risk, like the flow's red dots", () => {
    const { state, sched, forecast } = build([
      { id: "blocked", status: "blocked", club: "2026-12-01", start: "2026-11-20" },
      { id: "overdue", club: "2026-10-31", start: "2026-10-20" },
    ])
    expect(ids(nextUp(state, sched, forecast, "ev"))).toEqual(["overdue:risk", "blocked:risk"])
  })
  it("is one rule: a Stuck step with a green forecast and a step past its club deadline count in the head and show red", () => {
    const { state, sched, forecast } = build([
      { id: "stuck", status: "blocked", club: "2026-12-01", start: "2026-11-20", color: "green" },
      { id: "overdue", club: "2026-10-31", start: "2026-10-20", color: "green" },
      { id: "calm", club: "2026-12-10", start: "2026-12-01" },
      { id: "finished", status: "done", club: "2026-10-01", start: "2026-09-01", issue: "error", color: "red" },
    ])
    // The event head's "at risk" count (Events.tsx) and each flow dot's colour (the three flow charts) use isAtRisk.
    expect(state.nodes.filter(n => isAtRisk(state, sched, forecast, n)).map(n => n.id)).toEqual(["stuck", "overdue"])
    expect(Object.fromEntries(state.nodes.map(n => [n.id, nodeStop(n, state.today, isAtRisk(state, sched, forecast, n))])))
      .toMatchObject({ stuck: "risk", overdue: "risk", finished: "done" })
    expect(nodeStop(state.nodes[2], state.today, isAtRisk(state, sched, forecast, state.nodes[2]))).not.toBe("risk")
    expect(ids(nextUp(state, sched, forecast, "ev")).filter(r => r.endsWith(":risk"))).toEqual(["overdue:risk", "stuck:risk"])
  })
  it("leaves out finished steps, other events and info-only issues, and keeps at most five rows", () => {
    const { state, sched, forecast } = build([
      { id: "done", status: "done", club: "2026-10-01", start: "2026-09-01", issue: "error" },
      { id: "other", eventId: "ev2", club: "2026-10-01", start: "2026-09-01", color: "red" },
      { id: "info", club: "2026-12-01", start: "2026-11-20", issue: "info" },
      ...["a", "b", "c", "d", "e", "f"].map(id => ({ id, club: "2026-11-10", start: "2026-10-30" })),
    ])
    const rows = nextUp(state, sched, forecast, "ev")
    expect(rows).toHaveLength(5)
    expect(ids(rows)).toEqual(["a:start", "b:start", "c:start", "d:start", "e:start"])
    expect(rows[0].club).toBe("2026-11-10")
  })
  it("returns nothing when no step needs action", () => {
    const { state, sched, forecast } = build([{ id: "calm", club: "2026-12-10", start: "2026-12-01" }])
    expect(nextUp(state, sched, forecast, "ev")).toEqual([])
  })
  it("on the seed demo, every row comes from the engine's club deadline", () => {
    const sched = computeSchedule(base), forecast = computeForecast(base)
    const ev = base.events[0]
    const rows = nextUp(base, sched, forecast, ev.id)
    expect(rows.length).toBeLessThanOrEqual(5)
    for (const row of rows) {
      expect(row.node.eventId).toBe(ev.id)
      expect(row.node.status).not.toBe("done")
      expect(row.club).toBe(sched.nodes[row.node.id].club)
    }
  })

  it("leaves out the forecast of close steps until the event day, but keeps their other risk signs (Juanxi 2026-11-28)", () => {
    const { state: built, sched, forecast } = build([
      { id: "headcount", club: "2026-11-20", start: "2026-11-15", color: "red" },
      { id: "thanks", club: "2026-11-20", start: "2026-11-15", color: "yellow" },
      { id: "stuck", status: "blocked", club: "2026-11-20", start: "2026-11-15", color: "red" },
      { id: "promo", club: "2026-11-20", start: "2026-11-15", color: "red" },
    ])
    const event = { ...base.events[0], id: "ev", date: "2026-11-10" }
    const close = new Set(["headcount", "thanks", "stuck"])
    const state: DemoState = { ...built, events: [event], nodes: built.nodes.map(node => ({ ...node, phase: close.has(node.id) ? "close" : "prepare" })) }
    const at = (today: string) => ({ ...state, today })
    const risky = (today: string) => at(today).nodes.filter(node => isAtRisk(at(today), sched, forecast, node)).map(node => node.id)
    // Before the event: a red forecast still marks a preparation step, but not a close step; Stuck still counts.
    expect(risky("2026-11-01")).toEqual(["stuck", "promo"])
    expect(ids(nextUp(at("2026-11-01"), sched, forecast, "ev", 10))).toEqual(["promo:risk", "stuck:risk"])
    // From the event day on, the close steps' forecast counts again.
    expect(risky("2026-11-10")).toEqual(["headcount", "stuck", "promo"])
    expect(ids(nextUp(at("2026-11-10"), sched, forecast, "ev", 10))).toContain("thanks:watch")
  })
})
