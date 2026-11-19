import { describe, expect, it } from "vitest"
import { seedDemo } from "../../data/seed"
import { getWorkflowTemplates } from "../../data/workflowTemplates"
import { ensureWorkflowPresetTeams } from "../../data/workflowTeamDefaults"
import type { StepTemplate } from "../../data/types"
import { buildTimeline, CARD_HEIGHT, CARD_WIDTH, TEAM_ROW_HEIGHT } from "./timeline"
import { segmentCrossesBox } from "./routing"

const task = (key: string, dependsOn: string[] = [], days = 7): StepTemplate => ({ key, title: key, fn: "programs", ownerRoleId: "r-events", phase: "prepare", estDays: 1, tier: "light", dependsOn, anchor: { kind: "target", days, unit: "calendar", label: "Target" }, why: "", source: "Test", custom: true })

describe("one compact task line per team", () => {
  it("normalizes a raw same-team fork into one row and aligns independent teams at the same first column", () => {
    const steps = [task("A", [], 30), task("B", ["A"]), task("C", ["A"]), task("Independent", [], 2)]
    const original = structuredClone(steps)
    const result = buildTimeline(seedDemo(undefined, "v2"), { steps, stepTeams: { A: "one", B: "one", C: "one", Independent: "two" } }, [{ id: "one", name: "One" }, { id: "two", name: "Two" }, { id: "empty", name: "Empty" }])
    expect(result.rows).toHaveLength(3)
    expect(result.rows.map(row => row.height)).toEqual([TEAM_ROW_HEIGHT, TEAM_ROW_HEIGHT, TEAM_ROW_HEIGHT])
    expect(new Set(result.rows[0].boxes.map(item => item.y)).size).toBe(1)
    expect(result.rows[0].boxes.map(item => item.col)).toEqual([0, 1, 2])
    expect(result.rows[1].boxes[0].col).toBe(0)
    expect(result.rows[2].boxes).toEqual([])
    expect(result.boxes.every(item => item.width === CARD_WIDTH && item.height === CARD_HEIGHT)).toBe(true)
    expect(result.ticks).toEqual([])
    expect(steps).toEqual(original)
  })

  it("keeps cross-team dependencies forward in the global column order", () => {
    const result = buildTimeline(seedDemo(undefined, "v2"), { steps: [task("A"), task("B", ["A"]), task("C", ["B"])], stepTeams: { A: "one", B: "two", C: "one" } }, [{ id: "one", name: "One" }, { id: "two", name: "Two" }])
    const by = new Map(result.boxes.map(item => [item.step.key, item]))
    expect(by.get("B")!.col).toBeGreaterThan(by.get("A")!.col)
    expect(by.get("C")!.col).toBeGreaterThan(by.get("B")!.col)
    expect(result.routes).toHaveLength(3)
  })

  it("draws all 46 standard tasks on four fixed rows with every dependency routed clear of cards", () => {
    const state = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
    const template = getWorkflowTemplates(state)[0].versions[0]
    const result = buildTimeline(state, { steps: template.steps, branches: template.branches, stepTeams: template.teamMap!.stepTeams }, state.org.workflowTeams!, "standard")
    expect(result.boxes).toHaveLength(46)
    expect(result.rows).toHaveLength(4)
    const expected = result.boxes.flatMap(item => item.step.dependsOn ?? []).length
    expect(result.routes).toHaveLength(expected)
    for (const row of result.rows) expect(new Set(row.boxes.map(item => item.y)).size).toBeLessThanOrEqual(1)
    for (const route of result.routes) for (let index = 1; index < route.points.length; index++) for (const item of result.boxes) expect(segmentCrossesBox(route.points[index - 1], route.points[index], { id: item.step.key, x: item.x, y: item.y, width: item.width, height: item.height })).toBe(false)
  })
})

it("does not present calendar-guard fallback numbers as trustworthy T labels", () => {
  const state = ensureWorkflowPresetTeams(seedDemo("2026-10-31", "v2"))
  const template = getWorkflowTemplates(state)[0].versions[0]
  const result = buildTimeline(state, { steps: template.steps, branches: template.branches, stepTeams: template.teamMap!.stepTeams }, state.org.workflowTeams!, "standard", "2026-12-12")
  expect(result.dateError).toContain("supported calendar")
  expect(result.boxes.every(box => box.dateUnavailable)).toBe(true)
})
