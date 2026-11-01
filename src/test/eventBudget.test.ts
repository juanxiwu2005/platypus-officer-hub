import { beforeEach, describe, expect, it } from "vitest"
import { canMoveTask } from "../data/board"
import { loadState, reducer, STORAGE_KEY } from "../data/store"
import { seedDemo } from "../data/seed"
import { budgetStepComplete, lineTotal } from "../engine/eventBudget"
import { fundingDecisionDate } from "../engine/schedule"

describe("Event Budget", () => {
  beforeEach(() => window.localStorage.clear())

  it("calculates each line and the finance flow from applicable line-item status", () => {
    let state = seedDemo(undefined, "v2")
    const eventId = "e-speaker"
    state = reducer(state, { type: "budgetLineUpdate", eventId, id: "e-speaker:budget:1", patch: { quantity: 2, pricePerUnit: 125, status: "finance_record" } })
    const line = state.events.find(event => event.id === eventId)!.budgetItems![0]
    expect(lineTotal(line)).toBe(250)
    expect(state.nodes.find(node => node.eventId === eventId && node.stepKey === "financeRecord")!.status).toBe("done")
    expect(state.nodes.find(node => node.eventId === eventId && node.stepKey === "foodCompliance")!.status).toBe("done")

    state = reducer(state, { type: "budgetLineUpdate", eventId, id: line.id, patch: { status: "not_started" } })
    expect(state.nodes.find(node => node.eventId === eventId && node.stepKey === "financeRecord")!.status).toBe("unclaimed")
    expect(state.nodes.find(node => node.eventId === eventId && node.stepKey === "foodCompliance")!.status).toBe("done")
  })

  it("allows every current officer to add, edit and remove a budget line", () => {
    const state = { ...seedDemo(undefined, "v2"), viewerId: "sam" }
    const added = reducer(state, { type: "budgetLineAdd", eventId: "e-speaker" })
    const line = added.events.find(event => event.id === "e-speaker")!.budgetItems!.at(-1)!
    const edited = reducer(added, { type: "budgetLineUpdate", eventId: "e-speaker", id: line.id, patch: { item: "Printing", quantity: 2 } })
    expect(edited.events.find(event => event.id === "e-speaker")!.budgetItems!.at(-1)).toMatchObject({ item: "Printing", quantity: 2 })
    expect(reducer(edited, { type: "budgetLineDelete", eventId: "e-speaker", id: line.id }).events.find(event => event.id === "e-speaker")!.budgetItems).toHaveLength(1)
  })

  it("requires Food Exception Permit only for food lines", () => {
    const general = { id: "general", item: "Signs", quantity: 1, pricePerUnit: 20, source: "none" as const, category: "general" as const, status: "not_started" as const }
    const food = { ...general, id: "food", category: "food" as const }
    expect(budgetStepComplete([general], "foodCompliance")).toBe(true)
    expect(budgetStepComplete([food], "foodCompliance")).toBe(false)
  })

  it("does not allow a finance flow task to be manually marked done", () => {
    const state = seedDemo(undefined, "v2")
    const node = state.nodes.find(item => item.eventId === "e-speaker" && item.stepKey === "financeRecord")!
    expect(canMoveTask(state, node, "done")).toMatch(/Event Budget/)
    expect(reducer(state, { type: "moveTask", nodeId: node.id, status: "done" }).nodes.find(item => item.id === node.id)!.status).not.toBe("done")
  })

  it("migrates v11 funding into Event Budget without deleting legacy funding", () => {
    const current = seedDemo(undefined, "v2")
    const legacy = { ...current, schemaVersion: 11, events: current.events.map(event => {
      const { budgetItems: _budgetItems, ...rest } = event
      return rest
    }) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    const migrated = loadState()
    expect(migrated.funding).toEqual(legacy.funding)
    const line = migrated.events.find(event => event.id === "e-night")!.budgetItems![0]
    expect(line).toMatchObject({ item: "Migrated funding request", quantity: 1, pricePerUnit: 2000, source: "usg", status: "budget_request" })
  })

  it("finds a funding decision from money semantics for both v2 and legacy graphs", () => {
    const v2 = seedDemo(undefined, "v2")
    expect(fundingDecisionDate(v2, "e-night")).toBe(v2.nodes.filter(node => node.eventId === "e-night" && node.phase === "money").map(node => node.officialDeadline).filter(Boolean).sort()[0] ?? null)
    const legacy = seedDemo(undefined, "legacy")
    expect(fundingDecisionDate(legacy, "e-night")).toBe("2026-11-04")
  })
})
