import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft } from "../data/settings"
import type { Role } from "../data/types"
import { BESIDE, orgChart } from "../engine/orgChart"
import { addAdvisor } from "../onboarding/founder/team/rows"

// FB-2 (PLAN 4.3): the advisor stands on the president's level, right beside it, joined by a dashed line; it is not part of the reporting chain.
const roles = () => clubDraft(seedDemo("2026-10-22")).roles
const role = (id: string, fn: Role["fn"], reportsToId: string | null, displayName = id): Role => ({ id, displayName, fn, holderId: null, reportsToId })
const withAdvisors = (n: number) => { let r = roles(); for (let i = 0; i < n; i++) r = addAdvisor(r)!.roles; return r }

describe("FB-2 · the advisor in the organization chart", () => {
  it("sits on the president's level in the next column to the right, with a dashed edge and no reporting line", () => {
    const r = withAdvisors(1)
    const chart = orgChart(r)
    const pres = chart.nodes.find(n => n.id === "r-pres")!, adv = chart.nodes.find(n => n.title === "Advisor")!
    expect(adv).toMatchObject({ level: pres.level, col: pres.col + BESIDE, advisor: true })
    expect(chart.edges.filter(e => e.to === adv.id)).toEqual([{ from: "r-pres", to: adv.id, kind: "advisory" }])
    expect(chart.edges.some(e => e.from === adv.id)).toBe(false)
    // No card overlaps another on the same level, and the chart is wide enough for the advisor.
    for (const level of new Set(chart.nodes.map(n => n.level))) {
      const cols = chart.nodes.filter(n => n.level === level).map(n => n.col).sort((a, b) => a - b)
      cols.slice(1).forEach((c, i) => expect(c - cols[i]).toBeGreaterThanOrEqual(1))
    }
    expect(chart.columns).toBeGreaterThanOrEqual(Math.max(...chart.nodes.map(n => n.col)) + 1)
    expect(chart.nodes).toHaveLength(r.length)
  })
  it("several advisors go one after another to the right of the president", () => {
    const chart = orgChart(withAdvisors(3))
    const pres = chart.nodes.find(n => n.id === "r-pres")!
    const advisors = chart.nodes.filter(n => n.advisor)
    expect(advisors.map(n => n.col)).toEqual([pres.col + BESIDE, pres.col + BESIDE + 1, pres.col + BESIDE + 2])
    expect(advisors.every(n => n.level === pres.level)).toBe(true)
    expect(chart.edges.filter(e => e.kind === "advisory")).toHaveLength(3)
  })
  it("goes to the left when a box on the president's level is in the way on the right, and every column stays 0 or more", () => {
    const chart = orgChart([role("p", "president", null), role("loose", "programs", null), role("a", "advisor", null)])
    const at = (id: string) => chart.nodes.find(n => n.id === id)!
    expect(at("a").col).toBe(at("p").col - BESIDE)
    expect(at("a").level).toBe(at("p").level)
    expect(Math.min(...chart.nodes.map(n => n.col))).toBe(0)
    expect(chart.columns).toBe(2 + BESIDE)
  })
  it("an advisor who reports to someone stays in the chain; without a president nothing breaks and the advisor is still shown", () => {
    const inChain = orgChart([role("p", "president", null), role("a", "advisor", "p")])
    expect(inChain.edges).toEqual([{ from: "p", to: "a" }])
    expect(inChain.nodes.find(n => n.id === "a")!.level).toBe(1)
    const noPresident = orgChart([role("v", "vice_president", null), role("a", "advisor", null)])
    expect(noPresident.nodes.map(n => n.id).sort()).toEqual(["a", "v"])
    expect(noPresident.edges).toEqual([])
    expect(orgChart([role("a", "advisor", null)]).nodes).toHaveLength(1)
  })
})
