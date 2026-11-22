import { beforeEach, describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { saveWorkflowTeams } from "../data/workflowTeamSettings"
import { getWorkflowTemplate, STANDARD_WORKFLOW_TEMPLATE_ID } from "../data/workflowTemplates"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"

const base = () => seedDemo(undefined, "v2")

describe("workflow library integration and team ownership", () => {
  beforeEach(() => localStorage.clear())

  it("keeps role/person records and existing event/task references untouched when grouping teams", () => {
    const state = base()
    const grouped = saveWorkflowTeams(state, [{ id: "operations", name: "Operations" }], { [state.roles[0].id]: "operations" })
    expect(grouped).not.toBe(state)
    expect(grouped.roles).toBe(state.roles)
    expect(grouped.people).toBe(state.people)
    expect(grouped.events).toBe(state.events)
    expect(grouped.nodes).toBe(state.nodes)
    expect(grouped.org.workflowRoleTeams?.[state.roles[0].id]).toBe("operations")
  })

  it("rejects invalid grouping and enforces lead permissions", () => {
    const state = base()
    expect(saveWorkflowTeams(state, [{ id: "a", name: "Team" }, { id: "a", name: "Second" }], {})).toBe(state)
    expect(saveWorkflowTeams(state, [{ id: "a", name: "Team" }], { missing: "a" })).toBe(state)
    expect(saveWorkflowTeams(state, [{ id: "a", name: "Team" }], { [state.roles[0].id]: "absent" })).toBe(state)
    const other = { ...state, viewerId: state.roles.find(role => !["president", "vp", "advisor"].includes(role.fn))!.holderId! }
    expect(saveWorkflowTeams(other, [{ id: "a", name: "Team" }], {})).toBe(other)
    expect(reducer(other, { type: "newWorkflowTemplate", id: "new", name: "New" })).toBe(other)
  })

  it("persists empty unfinished drafts without replacing legacy tasks or the schema", () => {
    const state = base()
    let saved = reducer(state, { type: "newWorkflowTemplate", id: "human-template", name: "Visit" })
    const draft = getWorkflowTemplate(saved, "human-template")!.draft!
    saved = reducer(saved, { type: "saveWorkflowTemplateDraft", id: "human-template", draft: { ...draft, name: "", steps: [] } })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadStateWithNotice()
    expect(loaded.notice).toBeNull()
    expect(loaded.state.schemaVersion).toBe(state.schemaVersion)
    expect(loaded.state.nodes).toEqual(state.nodes)
    expect(getWorkflowTemplate(loaded.state, "human-template")!.draft!.name).toBe("")
  })

  it("does not lose template choices when invalid operations are filtered out", () => {
    const state = base()
    const op = { op: "create_event", name: "Visit", type: "social", headcount: 20, venue: "campus", food: "none", funding: "none", speaker: false, checks: {} }
    const saved = reducer(state, { type: "draftChanges", changeSet: { id: "choice", sentence: "Visit", status: "pending", ops: [{ op: "invalid" }, op], workflowChoices: { 1: { templateId: "standard-event", templateVersion: 1 } } } })
    expect(saved.changeSets.at(-1)?.ops).toHaveLength(1)
    expect(saved.changeSets.at(-1)?.workflowChoices).toEqual({ 0: { templateId: "standard-event", templateVersion: 1 } })
  })

  it("does not approve an unavailable selected template", () => {
    const state = base()
    const op = { op: "create_event", name: "Visit", type: "social", headcount: 20, venue: "campus", food: "none", funding: "none", speaker: false, checks: {} }
    const pending = reducer(state, { type: "draftChanges", changeSet: { id: "missing", sentence: "Visit", status: "pending", ops: [op], workflowChoices: { 0: { templateId: "missing-template", templateVersion: 1 } } } })
    const reviewed = reducer(pending, { type: "reviewChange", id: "missing", index: 0, decision: "applied", human: { date: "2027-06-07" } })
    expect(reviewed).toBe(pending)
    expect(reviewed.events).toBe(state.events)
    expect(reviewed.changeSets.at(-1)?.status).toBe("pending")
  })

  it("discards a draft and restores the preset through the reducer, for leads only", () => {
    const lead = ensureWorkflowPresetTeams(base())
    const version = getWorkflowTemplate(lead, STANDARD_WORKFLOW_TEMPLATE_ID)!.versions[0]
    const restored = reducer(lead, { type: "restoreWorkflowPreset", id: STANDARD_WORKFLOW_TEMPLATE_ID })
    expect(getWorkflowTemplate(restored, STANDARD_WORKFLOW_TEMPLATE_ID)!.draft?.baseVersion).toBe(version.version)
    expect(restored.events).toBe(lead.events)
    expect(restored.nodes).toBe(lead.nodes)
    const discarded = reducer(restored, { type: "discardWorkflowTemplateDraft", id: STANDARD_WORKFLOW_TEMPLATE_ID })
    expect(getWorkflowTemplate(discarded, STANDARD_WORKFLOW_TEMPLATE_ID)!.draft).toBeUndefined()
    expect(getWorkflowTemplate(discarded, STANDARD_WORKFLOW_TEMPLATE_ID)!.versions).toEqual(getWorkflowTemplate(restored, STANDARD_WORKFLOW_TEMPLATE_ID)!.versions)
    const other = { ...restored, viewerId: restored.roles.find(role => !["president", "vp", "advisor"].includes(role.fn))!.holderId! }
    expect(reducer(other, { type: "discardWorkflowTemplateDraft", id: STANDARD_WORKFLOW_TEMPLATE_ID })).toBe(other)
    expect(reducer(other, { type: "restoreWorkflowPreset", id: STANDARD_WORKFLOW_TEMPLATE_ID })).toBe(other)
  })
})
