import { describe, expect, it } from "vitest"
import type { Role, WorkflowTeam } from "../data/types"
import { TEAM_CHART, teamOrgChart, zoneLabel } from "./teamOrgChart"

const role = (id: string, reportsToId: string | null, fn: Role["fn"] = "programs"): Role => ({ id, displayName: id, fn, holderId: null, reportsToId })
const teams: WorkflowTeam[] = [{ id: "lead", name: "Club leadership" }, { id: "ops", name: "Operations" }, { id: "mkt", name: "Marketing" }, { id: "fin", name: "Finance" }]
// The demo club: president over four officers, given in an order that splits Operations.
const club = [role("pres", null, "president"), role("fin", "pres", "finance"), role("events", "pres"), role("mkt", "pres", "marketing"), role("sec", "pres", "secretary")]
const map = { pres: "lead", fin: "fin", events: "ops", mkt: "mkt", sec: "ops" }
const counts = { lead: 1, ops: 25, mkt: 8, fin: 12 }
const row = (chart: ReturnType<typeof teamOrgChart>, level: number) => chart.nodes.filter(n => n.level === level).sort((a, b) => a.x - b.x).map(n => n.id)
const overlaps = (chart: ReturnType<typeof teamOrgChart>) => chart.zones.some(a => chart.zones.some(b => a !== b && a.level === b.level && a.x < b.x + b.width && b.x < a.x + a.width))

describe("Roles & teams chart layout", () => {
  it("puts roles on levels from their reporting lines", () => {
    const chart = teamOrgChart([...club, role("helper", "events")], teams, map, counts)
    expect(chart.levels).toBe(3)
    expect(Object.fromEntries(chart.nodes.map(n => [n.id, n.level]))).toEqual({ pres: 0, fin: 1, events: 1, mkt: 1, sec: 1, helper: 2 })
    expect(chart.edges.filter(e => !e.kind).map(e => `${e.from}>${e.to}`).sort()).toEqual(["events>helper", "pres>events", "pres>fin", "pres>mkt", "pres>sec"])
    // Lines are orthogonal: down, across, down.
    expect(chart.edges.every(e => /^M[\d.]+ [\d.]+ V[\d.]+ H[\d.]+ V[\d.]+$/.test(e.d))).toBe(true)
    // Every card is inside the canvas.
    expect(chart.nodes.every(n => n.x >= 0 && n.x + TEAM_CHART.cardW <= chart.width && n.y + TEAM_CHART.cardH <= chart.height)).toBe(true)
  })

  it("orders siblings so a team's roles stand together, in team order, with no team last", () => {
    const chart = teamOrgChart([...club, role("extra", "pres")], teams, map, counts)
    expect(row(chart, 1)).toEqual(["events", "sec", "mkt", "fin", "extra"])
  })

  it("draws one zone per run of neighbouring roles of a team, with the step count", () => {
    const chart = teamOrgChart(club, teams, map, counts)
    expect(chart.zones.map(z => [z.teamId, z.roleIds, zoneLabel(z)])).toEqual([
      ["lead", ["pres"], "Club leadership · 1 step"],
      ["ops", ["events", "sec"], "Operations · 25 steps"],
      ["mkt", ["mkt"], "Marketing · 8 steps"],
      ["fin", ["fin"], "Finance · 12 steps"],
    ])
    expect(chart.zones.map(z => z.tone)).toEqual([0, 1, 2, 3])
    for (const z of chart.zones) for (const id of z.roleIds) {
      const n = chart.nodes.find(node => node.id === id)!
      expect(n.x).toBeGreaterThanOrEqual(z.x); expect(n.x + TEAM_CHART.cardW).toBeLessThanOrEqual(z.x + z.width)
      expect(n.y).toBeGreaterThan(z.y); expect(n.y + TEAM_CHART.cardH).toBeLessThanOrEqual(z.y + z.height)
    }
    expect(overlaps(chart)).toBe(false)
  })

  it("gives a team on two levels two zones in the same colour, and keeps zones apart", () => {
    const chart = teamOrgChart([...club, role("helper", "mkt"), role("writer", "mkt")], teams, { ...map, helper: "mkt", writer: "ops" }, counts)
    const mkt = chart.zones.filter(z => z.teamId === "mkt")
    expect(mkt.map(z => z.level)).toEqual([1, 2])
    expect(new Set(mkt.map(z => z.tone)).size).toBe(1)
    // Under Marketing lead the Operations role comes first (team order).
    expect(row(chart, 2)).toEqual(["writer", "helper"])
    expect(overlaps(chart)).toBe(false)
  })

  it("puts roles without a team, unknown teams and advisors in the Not in a team zone", () => {
    const chart = teamOrgChart([...club, role("new", "pres"), role("ghost", "pres"), role("adv", null, "advisor")], teams, { ...map, ghost: "deleted-team", adv: "ops" }, counts)
    const none = chart.zones.filter(z => z.teamId === null)
    expect(none.map(z => [z.level, z.roleIds, zoneLabel(z), z.steps, z.tone])).toEqual([[0, ["adv"], "Not in a team", null, null], [1, ["new", "ghost"], "Not in a team", null, null]])
    // The advisor stands beside the president with a dashed line.
    const advisory = chart.edges.find(e => e.kind === "advisory")!
    expect([advisory.from, advisory.to]).toEqual(["pres", "adv"])
    expect(overlaps(chart)).toBe(false)
  })

  it("makes a zone wide enough for its label, and counts missing teams as 0 steps", () => {
    const chart = teamOrgChart(club, teams, map, {})
    const lead = chart.zones.find(z => z.teamId === "lead")!
    expect(zoneLabel(lead)).toBe("Club leadership · 0 steps")
    expect(lead.width).toBeGreaterThan(TEAM_CHART.cardW + 2 * TEAM_CHART.pad)
  })

  it("survives loops in the reporting lines", () => {
    const chart = teamOrgChart([role("a", "b"), role("b", "a")], teams, {}, {})
    expect(chart.nodes.map(n => n.id).sort()).toEqual(["a", "b"])
  })
})
