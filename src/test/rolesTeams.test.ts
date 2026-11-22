import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { nextTeamName, saveWorkflowTeams, savableRoleTeams, teamDeleteBlock, teamNameError, teamStepCounts, withRoleTeam } from "../data/workflowTeamSettings"
import { addRole, canRemoveRole, reportsToChoices } from "../data/roleEdits"
import type { DemoState, WorkflowTemplate } from "../data/types"

const demo = (): DemoState => ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
const ids = { lead: "workflow-leadership", ops: "workflow-operations", mkt: "workflow-marketing", fin: "workflow-finance" }

describe("Roles & teams: step counts", () => {
  it("counts the default template's steps per team (preset grouping of Speaker series)", () => {
    expect(teamStepCounts(demo())).toEqual({ templateName: "Speaker series", counts: { [ids.lead]: 1, [ids.ops]: 25, [ids.mkt]: 8, [ids.fin]: 12 } })
  })
  it("uses the latest saved version of the default template before its draft", () => {
    const s = demo()
    const step = { key: "only", title: "Only task", why: "", source: "", phase: "plan", fn: "programs", estDays: 1, tier: "light" } as WorkflowTemplate["versions"][number]["steps"][number]
    const template: WorkflowTemplate = { id: "custom", updatedOn: s.today, versions: [{ version: 1, savedOn: s.today, name: "Mixer", kind: "custom", steps: [step], teamMap: { version: 1, workflowId: "custom", stepTeams: { only: ids.mkt } } }], draft: { baseVersion: 1, name: "Mixer draft", kind: "custom", steps: [step], teamMap: { version: 1, workflowId: "custom", stepTeams: { only: ids.fin } } } }
    const withCustom = { ...s, org: { ...s.org, workflowTemplates: [template], defaultWorkflowTemplateId: "custom" } }
    expect(teamStepCounts(withCustom)).toEqual({ templateName: "Mixer", counts: { [ids.mkt]: 1 } })
    expect(teamStepCounts({ ...withCustom, org: { ...withCustom.org, workflowTemplates: [{ ...template, versions: [] }] } })).toEqual({ templateName: "Mixer draft", counts: { [ids.fin]: 1 } })
  })
})

describe("Roles & teams: deleting a team", () => {
  it("is blocked while roles are in it, while workflow steps use it, and for preset teams", () => {
    const s = demo()
    expect(teamDeleteBlock(s, ids.ops)).toMatch(/^Roles are in this team/)
    const noRoles = { ...s, org: { ...s.org, workflowRoleTeams: Object.fromEntries(s.roles.map(r => [r.id, ""])) } }
    expect(teamDeleteBlock(noRoles, ids.ops)).toMatch(/^Workflow steps use this team/)
  })
  it("is allowed for a new team nobody uses, and the save keeps every other team and role", () => {
    const s = demo()
    const teams = [...s.org.workflowTeams!, { id: "spare", name: nextTeamName(s.org.workflowTeams!) }]
    const added = saveWorkflowTeams(s, teams, s.org.workflowRoleTeams!)
    expect(added.org.workflowTeams!.map(t => t.name)).toEqual(["Club leadership", "Operations", "Marketing", "Finance", "New team"])
    expect(teamDeleteBlock(added, "spare")).toBeNull()
    const gone = saveWorkflowTeams(added, s.org.workflowTeams!, added.org.workflowRoleTeams!)
    expect(gone.org.workflowTeams).toEqual(s.org.workflowTeams)
    // A team a draft branch points at (even with no steps yet) cannot be deleted.
    const branch = { ...added, org: { ...added.org, workflowTemplates: [{ id: "x", updatedOn: s.today, versions: [], draft: { baseVersion: 0, name: "X", kind: "custom" as const, steps: [], milestoneGraph: { version: 1 as const, eventDays: [], start: { title: "Start", details: "" }, done: { title: "Done", details: "" }, spine: [], teamBranches: [{ id: "b", teamId: "spare", fromId: "start", toId: "done", stepIds: [] }], taskAnchors: {} } } }] } }
    expect(teamDeleteBlock(branch, "spare")).toMatch(/^Workflow steps use this team/)
  })
  it("names new teams distinctly and checks renames", () => {
    expect(nextTeamName([{ id: "a", name: "New team" }, { id: "b", name: "new team 2" }])).toBe("New team 3")
    const teams = [{ id: "a", name: "Operations" }, { id: "b", name: "Finance" }]
    expect(teamNameError(teams, "a", " ")).toBe("Give the team a name.")
    expect(teamNameError(teams, "a", "finance")).toBe("Another team has this name.")
    expect(teamNameError(teams, "a", "x".repeat(81))).toMatch(/80/)
    expect(teamNameError(teams, "a", "Operations crew")).toBeNull()
  })
})

describe("Roles & teams: a role's team", () => {
  it("saves through saveWorkflowTeams with the teams unchanged, and Undo restores the map", () => {
    const s = demo()
    const next = withRoleTeam(s, "r-sec", ids.mkt)!
    expect(next.teams).toBe(s.org.workflowTeams)
    const moved = reducer(s, { type: "saveWorkflowTeams", ...next })
    expect(moved.org.workflowRoleTeams!["r-sec"]).toBe(ids.mkt)
    expect(moved.org.workflowTeams).toEqual(s.org.workflowTeams)
    expect(moved.roles).toBe(s.roles)
    const undone = reducer(moved, { type: "saveWorkflowTeams", teams: s.org.workflowTeams!, roleTeams: s.org.workflowRoleTeams! })
    expect(undone.org.workflowRoleTeams).toEqual(s.org.workflowRoleTeams)
    // "Not in a team" is stored explicitly, so the preset grouping does not put the role back.
    const out = reducer(s, { type: "saveWorkflowTeams", ...withRoleTeam(s, "r-sec", "")! })
    expect(ensureWorkflowPresetTeams(out).org.workflowRoleTeams!["r-sec"]).toBe("")
  })
  it("refuses advisors, unsaved roles and unknown teams, and drops stale map entries", () => {
    const s = demo()
    expect(withRoleTeam(s, "r-new", ids.ops)).toBeNull()
    expect(withRoleTeam(s, "r-sec", "nope")).toBeNull()
    const advisor = { ...s, roles: [...s.roles, { id: "r-adv", displayName: "Advisor", fn: "advisor" as const, holderId: null, reportsToId: null }] }
    expect(withRoleTeam(advisor, "r-adv", ids.ops)).toBeNull()
    expect(savableRoleTeams(advisor, s.org.workflowTeams!, { "r-adv": ids.ops, "r-closed": ids.ops, "r-sec": ids.fin })).toEqual({ "r-sec": ids.fin })
  })
})

describe("Roles & teams: role edits shared by the chart and the contact list", () => {
  it("keeps the RolesTable rules", () => {
    const s = demo()
    expect(reportsToChoices(s.roles, "r-pres").map(r => r.id)).toEqual([])
    expect(reportsToChoices(s.roles, "r-sec").map(r => r.id)).toEqual(s.roles.filter(r => r.id !== "r-sec").map(r => r.id))
    const { roles, role } = addRole(s.roles)
    expect(role).toMatchObject({ displayName: "New role", reportsToId: "r-pres", holderId: null })
    expect(roles).toHaveLength(s.roles.length + 1)
    expect(canRemoveRole(role, s.people)).toBe(true)
    expect(canRemoveRole(s.roles.find(r => r.id === "r-sec")!, s.people)).toBe(false)
    expect(canRemoveRole({ ...s.roles[0], holderId: null }, s.people)).toBe(false)
  })
})
