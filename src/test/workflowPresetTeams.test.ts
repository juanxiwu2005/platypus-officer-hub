import { afterEach, describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { EVENT_STEPS } from "../engine/playbooks"
import { ensureWorkflowPresetTeams, presetWorkflowStepTeams, WORKFLOW_PRESET_TEAMS } from "../data/workflowTeamDefaults"
import { instantiateWorkflowTemplate, getWorkflowTemplates } from "../data/workflowTemplates"
import { loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { saveWorkflowTeams } from "../data/workflowTeamSettings"
import type { Event } from "../data/types"

afterEach(() => localStorage.clear())
const event: Event = { id: "preset-visit", name: "Fictional speaker event", date: "2027-04-12", type: "speaker", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: true, checks: { speaker: true }, goalId: null, playbookId: "seo-event" }

describe("restored standard workflow team defaults", () => {
  it("restores the original four groups and all 46 tasks without changing a task definition", () => {
    const before = seedDemo(undefined, "v2"), saved = ensureWorkflowPresetTeams(before)
    const maps = presetWorkflowStepTeams(saved, EVENT_STEPS)
    expect(saved.org.workflowTeams?.map(team => team.name)).toEqual(["Club leadership", "Operations", "Marketing", "Finance"])
    expect(Object.keys(maps)).toHaveLength(46)
    expect(WORKFLOW_PRESET_TEAMS.map(team => Object.values(maps).filter(id => id === team.id).length)).toEqual([1, 25, 8, 12])
    expect(maps.speakerPacket).toBe(maps.documentation)
    expect(maps.feedback).toBe("workflow-operations")
    expect(maps.content).toBe(maps.photoBackup)
    expect(maps.budget).toBe(maps.financeRecord)
    expect(saved.roles).toBe(before.roles)
    expect(saved.people).toBe(before.people)
    expect(saved.events).toBe(before.events)
    expect(saved.nodes).toBe(before.nodes)
    expect(ensureWorkflowPresetTeams(saved)).toBe(saved)
  })

  it("keeps IDs and task grouping when every preset team is renamed", () => {
    const state = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
    const map = presetWorkflowStepTeams(state, EVENT_STEPS)
    const renamed = saveWorkflowTeams(state, state.org.workflowTeams!.map((team, i) => ({ ...team, name: `Renamed ${i}` })), state.org.workflowRoleTeams!)
    expect(renamed).not.toBe(state)
    expect(ensureWorkflowPresetTeams(renamed)).toBe(renamed)
    expect(presetWorkflowStepTeams(renamed, EVENT_STEPS)).toEqual(map)
    expect(renamed.org.workflowTeams!.map(team => team.id)).toEqual(state.org.workflowTeams!.map(team => team.id))
    expect(saveWorkflowTeams(renamed, renamed.org.workflowTeams!.slice(1), {})).toBe(renamed)
  })

  it("reuses existing explicit role-to-team IDs without matching or replacing team names", () => {
    const state = seedDemo(undefined, "v2")
    const teams = WORKFLOW_PRESET_TEAMS.map((_, i) => ({ id: `existing-${i}`, name: `Custom ${i}` }))
    const roleTeams = Object.fromEntries(state.roles.filter(role => role.fn !== "advisor").map(role => [role.id, teams[WORKFLOW_PRESET_TEAMS.findIndex(preset => preset.functions.includes(role.fn))].id]))
    const saved = ensureWorkflowPresetTeams({ ...state, org: { ...state.org, workflowTeams: teams, workflowRoleTeams: roleTeams } })
    expect(saved.org.workflowTeams).toEqual(teams)
    expect(saved.org.workflowRoleTeams).toEqual(roleTeams)
    const explicit = { plan: "existing-2", speakerPacket: "" }
    const maps = presetWorkflowStepTeams(saved, EVENT_STEPS, explicit)
    expect(maps.plan).toBe("existing-2")
    expect(maps.speakerPacket).toBe("")
  })

  it("adopts the original named teams once and never creates duplicates after a rename", () => {
    const state = seedDemo(undefined, "v2")
    const teams = WORKFLOW_PRESET_TEAMS.map((preset, i) => ({ id: `original-${i}`, name: preset.name }))
    const adopted = ensureWorkflowPresetTeams({ ...state, org: { ...state.org, workflowTeams: teams } })
    expect(adopted.org.workflowTeams).toEqual(teams)
    const renamed = { ...adopted, org: { ...adopted.org, workflowTeams: teams.map((team, i) => ({ ...team, name: `Free label ${i}` })) } }
    expect(ensureWorkflowPresetTeams(renamed)).toBe(renamed)
    expect(Object.keys(presetWorkflowStepTeams(renamed, EVENT_STEPS))).toHaveLength(46)
  })

  it("loads v23 and creates a ready standard run without requiring team setup", () => {
    const old = seedDemo(undefined, "v2")
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old))
    const loaded = loadStateWithNotice()
    expect(loaded.notice).toBeNull()
    expect(loaded.state.schemaVersion).toBe(old.schemaVersion)
    expect(loaded.state.nodes).toEqual(old.nodes)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(old))
    const run = instantiateWorkflowTemplate(loaded.state, event, { templateId: "standard-event", templateVersion: 1 })
    expect(run.error).toBeUndefined()
    expect(run.event.workflowRun?.snapshot.teams).toHaveLength(4)
    expect(run.nodes.every(node => !!node.teamId)).toBe(true)
    expect(run.nodes.map(node => node.id)).toEqual(run.nodes.map(node => `${event.id}:${node.stepKey}`))
  })

  it("preserves saved versions, existing runs and their historical team snapshots", () => {
    const state = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
    const templates = getWorkflowTemplates(state)
    const run = instantiateWorkflowTemplate(state, event, { templateId: "standard-event" })
    const used = { ...state, org: { ...state.org, workflowTemplates: templates }, events: [...state.events, run.event], nodes: [...state.nodes, ...run.nodes] }
    const next = saveWorkflowTeams(used, used.org.workflowTeams!.map(team => ({ ...team, name: `${team.name} renamed` })), used.org.workflowRoleTeams!)
    expect(next.org.workflowTemplates).toBe(templates)
    expect(next.events).toBe(used.events)
    expect(next.nodes).toBe(used.nodes)
    expect(run.event.workflowRun!.snapshot.teams[0].name).toBe("Club leadership")
    expect(reducer(state, { type: "reset" }).org.workflowTeams).toHaveLength(4)
  })
})
