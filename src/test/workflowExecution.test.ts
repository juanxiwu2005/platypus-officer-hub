import { describe, expect, it } from "vitest"
import type { DemoState, StepTemplate, WorkflowTemplateVersion } from "../data/types"
import type { CommandOp } from "../lib/commands"
import { seedDemo } from "../data/seed"
import { newObjects, validateReview } from "../data/changeReview"
import { applySchedule } from "../engine/schedule"

const op: Extract<CommandOp, { op: "create_event" }> = { op: "create_event", name: "Company visit", type: "offcampus", headcount: 20, venue: "offcampus", food: "none", funding: "none", speaker: false, checks: {} }
const first = "169c3159-aadb-4ae7-84bb-c31db9e3e331"
const second = "561014aa-5e41-4b28-9f25-6e248c91e269"
const step = (key: string, title: string, dependsOn: string[] = []): StepTemplate => ({ key, title, dependsOn, ownerRoleId: "r-events", fn: "programs", phase: "prepare", tier: "light", estDays: 1, anchor: { kind: "target", days: 7, unit: "calendar", label: "Visit planning" }, why: "Confirm the arrangements with the host.", source: "Club workflow", custom: true, startPolicy: "effort" })
const version: WorkflowTemplateVersion = { version: 1, savedOn: "2026-11-18", name: "Company visit", kind: "custom", steps: [step(first, "Agree visit"), step(second, "Arrange transport", [first])], teamMap: { version: 1, workflowId: "tpl-visit", stepTeams: { [first]: "team-ops", [second]: "team-ops" } } }
const human = { date: "2027-04-16", workflowTemplateId: "tpl-visit", workflowTemplateVersion: 1 }
const base = (): DemoState => {
  const state = seedDemo(undefined, "v2")
  return { ...state, org: { ...state.org, workflowTemplates: [{ id: "tpl-visit", versions: [structuredClone(version)], updatedOn: state.today }], defaultWorkflowTemplateId: "tpl-visit", workflowTeams: [{ id: "team-ops", name: "Operations" }], workflowRoleTeams: { "r-events": "team-ops" } } }
}

describe("saved workflow → event execution", () => {
  it("generates only the selected custom tasks and remaps their dependencies to actual task IDs", () => {
    const state = base()
    expect(validateReview(state, op, human)).toBeNull()
    const created = newObjects(state, op, "visit-april", human)
    const nodes = created.nodes!.filter(node => node.eventId === "visit-april")
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toMatchObject({ id: `visit-april:${first}`, teamId: "team-ops", workflowSource: { runId: "visit-april", templateId: "tpl-visit", templateVersion: 1, templateStepId: first } })
    expect(nodes[1].dependsOn).toEqual([nodes[0].id])
    expect(created.events!.at(-1)!.workflowRun).toMatchObject({ id: "visit-april", templateId: "tpl-visit", templateVersion: 1, snapshot: { name: "Company visit", teams: [{ id: "team-ops", name: "Operations" }] } })
    expect(nodes.some(node => node.stepKey === "finalcheck")).toBe(false)
    expect(state.nodes.some(node => node.eventId === "visit-april")).toBe(false)
  })

  it("resolves the configured default template when an old caller does not send a selection", () => {
    const created = newObjects(base(), op, "default-visit", { date: human.date })
    expect(created.nodes!.filter(node => node.eventId === "default-visit")).toHaveLength(2)
    expect(created.events!.at(-1)!.workflowRun?.templateId).toBe("tpl-visit")
  })

  it("keeps two uses, dates, progress, and later template versions independent", () => {
    const initial = base()
    const april = newObjects(initial, op, "visit-april", human)
    const firstRun = applySchedule({ ...initial, ...april, nodes: april.nodes!.map(node => node.id === `visit-april:${first}` ? { ...node, status: "done", draftLink: "https://example.org/april-notes" } : node) })
    const nextVersion: WorkflowTemplateVersion = { ...structuredClone(version), version: 2, name: "Company visit, revised", steps: [step(first, "Agree revised visit")], teamMap: { version: 1, workflowId: "tpl-visit", stepTeams: { [first]: "team-ops" } } }
    const updated = { ...firstRun, org: { ...firstRun.org, workflowTemplates: [{ id: "tpl-visit", versions: [structuredClone(version), nextVersion], updatedOn: firstRun.today }] } }
    const may = newObjects(updated, op, "visit-may", { ...human, date: "2027-05-14", workflowTemplateVersion: 2 })
    const secondRun = applySchedule({ ...updated, ...may })
    const a = secondRun.nodes.find(node => node.id === `visit-april:${first}`)!
    const b = secondRun.nodes.find(node => node.id === `visit-may:${first}`)!
    expect(a).toMatchObject({ title: "Agree visit", status: "done", draftLink: "https://example.org/april-notes" })
    expect(b).toMatchObject({ title: "Agree revised visit", status: "accepted", draftLink: null })
    expect(a.clubDeadline).not.toBe(b.clubDeadline)
    expect(secondRun.events.find(event => event.id === "visit-april")!.workflowRun!.snapshot.steps).toHaveLength(2)
    expect(secondRun.events.find(event => event.id === "visit-may")!.workflowRun!.templateVersion).toBe(2)
    expect(new Set(secondRun.nodes.map(node => node.id)).size).toBe(secondRun.nodes.length)
  })

  it("does not duplicate or reset any work when the same creation request is replayed", () => {
    const state = base()
    const created = newObjects(state, op, "visit-april", human)
    const next = { ...state, ...created }
    expect(newObjects(next, op, "visit-april", human)).toEqual({})
    expect(newObjects(next, op, "visit-april", { ...human, workflowTemplateVersion: 2 })).toEqual({})
  })

  it("rejects missing, foreign, draft-only, or incomplete version choices without falling back", () => {
    const state = base()
    for (const choice of [{ workflowTemplateId: "foreign", workflowTemplateVersion: 1 }, { workflowTemplateId: "tpl-visit", workflowTemplateVersion: 2 }, { workflowTemplateId: "tpl-visit" }, { workflowTemplateVersion: 1 }]) {
      const selected = { date: human.date, ...choice }
      expect(validateReview(state, op, selected)).toMatch(/saved workflow version/)
      expect(newObjects(state, op, "invalid", selected)).toEqual({})
    }
    const draftOnly = { ...state, org: { ...state.org, workflowTemplates: [{ id: "tpl-visit", versions: [], draft: { ...structuredClone(version), baseVersion: 0 }, updatedOn: state.today }] } }
    expect(validateReview(draftOnly, op, human)).toMatch(/saved workflow version/)
  })

  it("revalidates the saved definition against current organization roles before approval", () => {
    const state = base()
    const missingRole = { ...state, roles: state.roles.filter(role => role.id !== "r-events") }
    expect(validateReview(missingRole, op, human)).toMatch(/existing owner role/)
    expect(newObjects(missingRole, op, "invalid", human)).toEqual({})
  })

  it("reports a removed organization team before approval instead of navigating to an absent event", () => {
    const state = base()
    const missingTeam = { ...state, org: { ...state.org, workflowTeams: [] } }
    expect(validateReview(missingTeam, op, human)).toMatch(/team/i)
    expect(newObjects(missingTeam, op, "invalid", human)).toEqual({})
  })

  it("keeps the selected immutable version even when a newer one is saved before approval", () => {
    const state = base()
    state.org.workflowTemplates![0].versions.push({ ...structuredClone(version), version: 2, steps: [step(first, "New task name")], teamMap: { version: 1, workflowId: "tpl-visit", stepTeams: { [first]: "team-ops" } } })
    const created = newObjects(state, op, "pinned", human)
    expect(created.events!.at(-1)!.workflowRun!.templateVersion).toBe(1)
    expect(created.nodes!.filter(node => node.eventId === "pinned").map(node => node.title)).toEqual(["Agree visit", "Arrange transport"])
  })
})
