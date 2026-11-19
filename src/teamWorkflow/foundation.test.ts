import { describe, expect, it } from "vitest"
import { EVENT_STEPS } from "../engine/playbooks"
import { addDirectReport, addRole, addTeam, managerChoices, renameRole, renameTeam, setRoleManager, setRoleTeam, setTeamLead, teamRoleRows, validateDirectory } from "./directory"
import { assignStepsToTeam, compileTeamLanes, emptyTeamMap } from "./lanes"
import { directoryFromLegacy, teamMapFromExplicitOwners } from "./legacyAdapter"
import { exampleDirectory, exampleEventMap } from "./examples"
import type { Change, WorkflowTeamMap } from "./contracts"

const unwrap = <T>(r: Change<T>): T => { if (!r.ok) throw new Error(JSON.stringify(r.issues)); return r.value }
const workflowId = "example:general-event"

describe("team directory independent of job titles and reporting lines", () => {
  it("adds a role without a team, creates an empty team, then explicitly moves the role", () => {
    const start = exampleDirectory()
    const withRole = unwrap(addRole(start, { id: "specialist", title: "Finance Treasurer 2", teamId: null, reportsToRoleId: "evp", personId: null }))
    expect(withRole.teams).toHaveLength(5)
    const withTeam = unwrap(addTeam(withRole, { id: "custom", name: "Field Research", leadRoleId: null }))
    expect(withTeam.roles.filter(r => r.teamId === "custom")).toHaveLength(0)
    const moved = unwrap(setRoleTeam(withTeam, "specialist", "finance"))
    expect(moved.roles.find(r => r.id === "specialist")).toMatchObject({ teamId: "finance", reportsToRoleId: "evp" })
    expect(start.roles).toHaveLength(7)
  })
  it("renames a job and a team without inferring new groups or rewriting members/IDs", () => {
    const start = exampleDirectory(), renamed = unwrap(renameTeam(unwrap(renameRole(start, "associate", "Lab Coordinator")), "finance", "Research Grants"))
    expect(renamed.teams).toHaveLength(5)
    expect(renamed.roles.find(r => r.id === "associate")).toMatchObject({ teamId: "finance", personId: "chris", reportsToRoleId: "treasurer" })
    expect(renamed.people).toEqual(start.people)
    expect(compileTeamLanes(workflowId, EVENT_STEPS, renamed, exampleEventMap(EVENT_STEPS)).lanes[1].team.name).toBe("Research Grants")
  })
  it("adds and re-parents a lower level without changing team membership", () => {
    const d = unwrap(addDirectReport(exampleDirectory(), "assistant", { id: "intern", title: "Finance Intern" }))
    expect(d.roles.find(r => r.id === "intern")).toMatchObject({ teamId: "finance", reportsToRoleId: "assistant", personId: null })
    expect(teamRoleRows(d, "finance").map(x => [x.role.id, x.depth])).toEqual([["treasurer", 0], ["associate", 1], ["assistant", 2], ["intern", 3]])
    const changed = unwrap(setRoleManager(d, "intern", "evp"))
    expect(changed.roles.find(r => r.id === "intern")).toMatchObject({ teamId: "finance", reportsToRoleId: "evp" })
  })
  it.each(["treasurer", "associate", "assistant"])("rejects reporting loops through %s", managerId => {
    expect(setRoleManager(exampleDirectory(), "treasurer", managerId).ok).toBe(false)
    expect(managerChoices(exampleDirectory(), "treasurer").map(r => r.id)).not.toContain(managerId)
  })
  it("detects loops across team boundaries and keeps source untouched", () => {
    const d = exampleDirectory(), before = structuredClone(d)
    expect(setRoleManager(d, "president", "assistant").ok).toBe(false)
    expect(d).toEqual(before)
    expect(setRoleManager(d, "assistant", "marketing-lead").ok).toBe(true)
  })
  it("leaves a visible lead vacancy when a lead moves; does not choose a fallback", () => {
    const d = unwrap(setRoleTeam(exampleDirectory(), "treasurer", "operations"))
    expect(d.teams.find(t => t.id === "finance")!.leadRoleId).toBeNull()
    expect(d.roles.find(r => r.id === "associate")!.reportsToRoleId).toBe("treasurer")
    expect(setTeamLead(d, "finance", "secretary").ok).toBe(false)
    expect(setTeamLead(d, "finance", "associate").ok).toBe(true)
  })
  it("rejects duplicate IDs and dangling references", () => {
    const d = exampleDirectory()
    expect(addTeam(d, { ...d.teams[0] }).ok).toBe(false)
    expect(setRoleTeam(d, "missing", "finance").ok).toBe(false)
    expect(setRoleTeam(d, "assistant", "missing").ok).toBe(false)
    expect(setRoleManager(d, "assistant", "missing").ok).toBe(false)
    expect(validateDirectory({ ...d, people: [] }).some(i => i.code === "unknown-person")).toBe(true)
  })
})

describe("exactly one lane per team, across all workflow phases and branches", () => {
  it("keeps all 46 original tasks once, all dependency edges and all immutable task details", () => {
    const d = exampleDirectory(), before = structuredClone(EVENT_STEPS), mapping = exampleEventMap(EVENT_STEPS)
    const r = compileTeamLanes(workflowId, EVENT_STEPS, d, mapping)
    expect(EVENT_STEPS).toHaveLength(46)
    expect(r.ready).toBe(true)
    expect(r.lanes).toHaveLength(5)
    expect(new Set(r.lanes.flatMap(l => l.steps.map(s => s.key))).size).toBe(46)
    expect(r.lanes.flatMap(l => l.steps)).toHaveLength(46)
    expect(r.links).toHaveLength(EVENT_STEPS.reduce((n, s) => n + (s.dependsOn?.length ?? 0), 0))
    for (const lane of r.lanes) for (const step of lane.steps) expect(step).toBe(EVENT_STEPS.find(s => s.key === step.key))
    expect(EVENT_STEPS).toEqual(before)
    expect(r.lanes.find(l => l.team.id === "community")!.steps).toHaveLength(0)
    const finance = r.lanes.filter(l => l.team.id === "finance")
    expect(finance).toHaveLength(1)
    expect(finance[0].steps.map(s => s.key)).toEqual(expect.arrayContaining(["budget", "purchaseRequest", "invoice", "financeRecord"]))
    expect(r.lanes.find(l => l.team.id === "operations")!.steps).toHaveLength(25)
  })
  it("produces seven lanes for seven teams, including teams without members/tasks", () => {
    let d = exampleDirectory()
    for (const id of ["research", "alumni"]) d = unwrap(addTeam(d, { id, name: id, leadRoleId: null }))
    const r = compileTeamLanes(workflowId, EVENT_STEPS, d, exampleEventMap(EVENT_STEPS))
    expect(r.ready).toBe(true); expect(r.lanes).toHaveLength(7)
    expect(r.lanes.map(l => l.row)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
  it("reassigns an arbitrary selected range atomically, without calling old branch routing", () => {
    const d = exampleDirectory(), m = exampleEventMap(EVENT_STEPS), before = structuredClone(EVENT_STEPS)
    const updated = unwrap(assignStepsToTeam(workflowId, EVENT_STEPS, d, m, ["venue", "photoBackup", "venue"], "finance"))
    expect(updated.stepTeams.venue).toBe("finance"); expect(updated.stepTeams.photoBackup).toBe("finance")
    expect(m.stepTeams.venue).toBe("operations")
    expect(compileTeamLanes(workflowId, EVENT_STEPS, d, updated).lanes).toHaveLength(5)
    expect(EVENT_STEPS).toEqual(before)
    expect(assignStepsToTeam(workflowId, EVENT_STEPS, d, m, ["venue", "missing"], "finance").ok).toBe(false)
  })
  it("blocks unassigned/deleted-team tasks and shows issues without inventing another lane", () => {
    const d = exampleDirectory(), r = compileTeamLanes(workflowId, EVENT_STEPS, d, emptyTeamMap(workflowId))
    expect(r.ready).toBe(false); expect(r.unassignedStepIds).toHaveLength(46); expect(r.lanes).toHaveLength(5)
    const m = exampleEventMap(EVENT_STEPS); m.stepTeams.venue = "removed-team"
    expect(compileTeamLanes(workflowId, EVENT_STEPS, d, m).unassignedStepIds).toEqual(["venue"])
  })
  it("keeps workflow maps scoped to a template ID, including when task keys repeat", () => {
    const d = exampleDirectory(), m = exampleEventMap(EVENT_STEPS)
    expect(compileTeamLanes("another-workflow", EVENT_STEPS, d, m).ready).toBe(false)
    expect(assignStepsToTeam("another-workflow", EVENT_STEPS, d, m, ["plan"], "finance").ok).toBe(false)
    expect(assignStepsToTeam(workflowId, EVENT_STEPS, d, m, [], "finance").ok).toBe(false)
    expect(assignStepsToTeam(workflowId, EVENT_STEPS, d, m, ["plan"], "unknown").ok).toBe(false)
  })
  it("rejects stale task mappings, duplicate keys and dependency problems", () => {
    const d = exampleDirectory(), mapping: WorkflowTeamMap = { version: 1, workflowId: "custom", stepTeams: { a: "finance", b: "operations" } }
    expect(compileTeamLanes("custom", [{ key: "a" }], d, mapping).issues.some(i => i.code === "stale-assignment")).toBe(true)
    expect(compileTeamLanes("custom", [{ key: "a" }, { key: "a" }], d, mapping).issues.some(i => i.code === "duplicate-step")).toBe(true)
    expect(compileTeamLanes("custom", [{ key: "a", dependsOn: ["missing"] }], d, mapping).ready).toBe(false)
    expect(compileTeamLanes("custom", [{ key: "a", dependsOn: ["b"] }, { key: "b", dependsOn: ["a"] }], d, mapping).issues.some(i => i.code === "dependency-cycle")).toBe(true)
  })
  it("supports arbitrary custom names and prototype-like task keys", () => {
    const d = unwrap(renameTeam(exampleDirectory(), "community", "Robotics Lab"))
    const r = compileTeamLanes("lab", [{ key: "__proto__" }], d, { version: 1, workflowId: "lab", stepTeams: Object.fromEntries([["__proto__", "community"]]) })
    expect(r.ready).toBe(true); expect(r.lanes[4].steps).toHaveLength(1)
  })
})

describe("explicit compatibility adapter", () => {
  it("retains constitution/manual roles, contacts and reportsTo while requiring supplied membership", () => {
    const result = unwrap(directoryFromLegacy([{ id: "lab", name: "Robotics Lab", leadRoleId: null }], [{ id: "custom", displayName: "Flight Systems", holderId: "pilot", reportsToId: null }], [{ id: "pilot", name: "Taylor Example", email: "taylor@example.org" }], { custom: "lab" }))
    expect(result.roles[0]).toEqual({ id: "custom", title: "Flight Systems", teamId: "lab", personId: "pilot", reportsToRoleId: null })
    expect(result.people[0].email).toBe("taylor@example.org")
  })
  it("does not choose a person or a team via fn, title or role list order", () => {
    const d = exampleDirectory()
    const r = teamMapFromExplicitOwners("custom", [{ key: "a", ownerRoleId: "associate" }, { key: "b" }, { key: "c", ownerRoleId: "gone" }], d)
    expect(r.mapping.stepTeams).toEqual({ a: "finance" }); expect(r.unresolvedStepIds).toEqual(["b", "c"])
  })
})
