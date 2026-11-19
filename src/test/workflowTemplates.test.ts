import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import type { DemoState, Event, StepTemplate, WorkflowTemplateDraft } from "../data/types"
import { STANDARD_WORKFLOW_TEMPLATE_ID, discardWorkflowTemplateDraft, originalWorkflowPreset, restoreWorkflowPreset, duplicateWorkflowTemplate, findWorkflowTemplateVersion, getWorkflowTemplate, getWorkflowTemplates, instantiateWorkflowTemplate, newWorkflowTemplate, newWorkflowStepId, publishWorkflowTemplate, publishedWorkflowTemplates, saveWorkflowTemplateDraft, setDefaultWorkflowTemplate, workflowTemplateDraftError, workflowTemplatePublishError, workflowTemplateRunError } from "../data/workflowTemplates"
import { EVENT_STEPS, stepsFor } from "../engine/playbooks"
import { computeSchedule } from "../engine/schedule"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { deleteBuilderStep } from "../components/workflowBuilder/model"
import { syncMilestoneSnapshot } from "../components/workflowBuilder/milestoneCommands"

const first = "a1b2c3d4-1111-4444-8888-111111111111", second = "a1b2c3d4-2222-4444-8888-222222222222", third = "a1b2c3d4-3333-4444-8888-333333333333"
const step = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: "Arrange transport", fn: "programs", ownerRoleId: "r-programs", phase: "prepare", estDays: 2, tier: "light", why: "Confirm seats and pickup.", source: "Created by the club", custom: true, startPolicy: "effort", anchor: { kind: "target", days: 7, unit: "calendar", label: "Club target" }, dependsOn })
const event = (id = "visit-april"): Event => ({ id, name: "Company visit", date: "2027-04-10", type: "offcampus", headcount: 20, venue: "offcampus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "custom" })
const base = (): DemoState => {
  const s = seedDemo(undefined, "v2")
  const role = s.roles.find(item => item.fn === "programs")!
  return { ...s, viewerId: s.roles.find(item => item.fn === "president")!.holderId!, org: { ...s.org, workflowTeams: [{ id: "ops", name: "Operations" }, { id: "empty", name: "Partnerships" }], workflowRoleTeams: { [role.id]: "ops" } } }
}
function draft(s: DemoState, steps: StepTemplate[] = [step(first), step(second, [first])]): WorkflowTemplateDraft {
  const ownerRoleId = s.roles.find(role => role.fn === "programs")!.id
  return { name: "Company visit", kind: "custom", baseVersion: 0, steps: steps.map(item => ({ ...item, ownerRoleId })), teamMap: { version: 1, workflowId: "visit-template", stepTeams: Object.fromEntries(steps.map(item => [item.key, "ops"])) } }
}
function published(steps?: StepTemplate[]): DemoState {
  let s = base()
  s = newWorkflowTemplate(s, "visit-template", "Company visit")
  s = saveWorkflowTemplateDraft(s, "visit-template", draft(s, steps))
  return publishWorkflowTemplate(s, "visit-template")
}

describe("workflow template identities and versions", () => {
  it("projects the legacy standard without changing state, old nodes or schema", () => {
    const s = base(), before = structuredClone(s)
    expect(getWorkflowTemplates(s)[0].id).toBe(STANDARD_WORKFLOW_TEMPLATE_ID)
    expect(publishedWorkflowTemplates(s)[0]).toMatchObject({ name: "Speaker series", version: 1 })
    expect(s).toEqual(before)
    expect(s.org.workflowTemplates).toBeUndefined()
  })
  it("supports blank drafts but does not publish or offer them for event creation", () => {
    const s = newWorkflowTemplate(base(), "blank", "Volunteer")
    expect(getWorkflowTemplate(s, "blank")?.draft?.steps).toEqual([])
    expect(getWorkflowTemplate(s, "blank")?.draft?.teamExecution).toBe("dependencies")
    expect(workflowTemplatePublishError(s, "blank")).toContain("1 to")
    expect(publishWorkflowTemplate(s, "blank")).toBe(s)
    expect(publishedWorkflowTemplates(s).some(template => template.id === "blank")).toBe(false)
  })
  it("saves explicit dependencies without manufacturing a sequential chain after a team reassignment", () => {
    const s = newWorkflowTemplate(base(), "visit-template", "Company visit")
    const content = { ...draft(s, [step(first), step(second), step(third, [first])]), teamExecution: "dependencies" as const }
    const saved = saveWorkflowTemplateDraft(s, "visit-template", content)
    expect(getWorkflowTemplate(saved, "visit-template")?.draft?.steps).toEqual(content.steps)
    const reassigned = { ...content, teamMap: { ...content.teamMap!, stepTeams: { [first]: "ops", [second]: "ops", [third]: "empty" } } }
    const moved = saveWorkflowTemplateDraft(saved, "visit-template", reassigned)
    expect(getWorkflowTemplate(moved, "visit-template")?.draft?.steps).toEqual(content.steps)
    expect(getWorkflowTemplate(moved, "visit-template")?.draft?.teamMap?.stepTeams[third]).toBe("empty")
    expect(workflowTemplatePublishError(moved, "visit-template")).toBeNull()
    expect(findWorkflowTemplateVersion(publishWorkflowTemplate(moved, "visit-template"), "visit-template")?.teamExecution).toBe("dependencies")
  })
  it("keeps sequential saved versions and existing runs intact when the next draft uses explicit dependencies", () => {
    const s = newWorkflowTemplate(base(), "visit-template", "Company visit")
    const original = publishWorkflowTemplate(saveWorkflowTemplateDraft(s, "visit-template", { ...draft(s), teamExecution: "sequential" }), "visit-template")
    const version = findWorkflowTemplateVersion(original, "visit-template", 1)!
    const run = instantiateWorkflowTemplate(original, event(), { templateId: "visit-template", templateVersion: 1 })
    expect(run.error).toBeUndefined()
    const running = { ...original, events: [...original.events, run.event], nodes: [...original.nodes, ...run.nodes] }
    const changed = saveWorkflowTemplateDraft(running, "visit-template", { ...draft(running), baseVersion: 1, teamExecution: "dependencies" })
    const next = publishWorkflowTemplate(changed, "visit-template")
    expect(findWorkflowTemplateVersion(next, "visit-template", 1)).toEqual(version)
    expect(findWorkflowTemplateVersion(next, "visit-template", 2)?.teamExecution).toBe("dependencies")
    expect(next.events).toBe(running.events)
    expect(next.nodes).toBe(running.nodes)
    expect(next.events.find(item => item.id === run.event.id)?.workflowRun?.snapshot.teamExecution).toBe("sequential")
  })
  it("allows repeated Event day tasks with independent stable IDs and one unchanged activity date", () => {
    const s = newWorkflowTemplate(base(), "visit-template", "Two sessions")
    const milestones = [first, second].map(key => ({ ...step(key), title: "Event day", estDays: 0, anchor: { kind: "target" as const, days: 0, unit: "calendar" as const, label: "Event day milestone" } }))
    const saved = publishWorkflowTemplate(saveWorkflowTemplateDraft(s, "visit-template", { ...draft(s, milestones), teamExecution: "dependencies" }), "visit-template")
    const result = instantiateWorkflowTemplate(saved, event(), { templateId: "visit-template" })
    expect(result.error).toBeUndefined()
    expect(result.event.date).toBe(event().date)
    expect(result.nodes).toHaveLength(2)
    expect(result.nodes.map(node => node.title)).toEqual(["Event day", "Event day"])
    expect(new Set(result.nodes.map(node => node.id)).size).toBe(2)
    expect(result.nodes.every(node => node.anchor?.kind === "target" && node.anchor.days === 0)).toBe(true)
  })
  it("publishes immutable versions and keeps renamed/repositioned task identity", () => {
    const s = published()
    const old = findWorkflowTemplateVersion(s, "visit-template", 1)!
    const nextDraft = { ...draft(s), baseVersion: 1, steps: old.steps.map(item => item.key === first ? { ...item, title: "Book the bus", placement: { branchId: "main", order: 80 } } : item) }
    const edited = saveWorkflowTemplateDraft(s, "visit-template", nextDraft)
    expect(findWorkflowTemplateVersion(edited, "visit-template", 1)).toEqual(old)
    const saved = publishWorkflowTemplate(edited, "visit-template")
    expect(findWorkflowTemplateVersion(saved, "visit-template")?.version).toBe(2)
    expect(findWorkflowTemplateVersion(saved, "visit-template")?.steps[0]).toMatchObject({ key: first, title: "Book the bus" })
    expect(findWorkflowTemplateVersion(saved, "visit-template", 1)).toEqual(old)
    expect(publishWorkflowTemplate(saved, "visit-template")).toBe(saved)
  })
  it("does not create a duplicate version when saving unchanged content", () => {
    const s = published(), version = findWorkflowTemplateVersion(s, "visit-template")!
    const edited = saveWorkflowTemplateDraft(s, "visit-template", { ...version, baseVersion: 1 })
    expect(getWorkflowTemplate(publishWorkflowTemplate(edited, "visit-template"), "visit-template")?.versions).toHaveLength(1)
  })
  it("requires explicit valid teams at publish, including teams with no tasks in snapshots", () => {
    const s = newWorkflowTemplate(base(), "visit-template", "Company visit")
    const ungrouped = saveWorkflowTemplateDraft(s, "visit-template", { ...draft(s), teamMap: undefined })
    expect(workflowTemplatePublishError(ungrouped, "visit-template")).toContain("team")
    const invalid = saveWorkflowTemplateDraft(s, "visit-template", { ...draft(s), teamMap: { version: 1, workflowId: "visit-template", stepTeams: { [first]: "missing", [second]: "ops" } } })
    expect(workflowTemplatePublishError(invalid, "visit-template")).toContain("team")
  })
  it("copies a custom template with new step IDs and remaps dependencies/team references", () => {
    const s = published(), ids = [third, "a1b2c3d4-4444-4444-8888-444444444444"]
    const copy = duplicateWorkflowTemplate(s, "visit-template", "visit-copy", "Copy", () => ids.shift()!)
    const original = findWorkflowTemplateVersion(copy, "visit-template")!, cloned = getWorkflowTemplate(copy, "visit-copy")!
    expect(cloned.draft?.steps[0].key).toBe(third)
    expect(cloned.draft?.steps[1].dependsOn).toEqual([third])
    expect(cloned.draft?.teamMap?.stepTeams).toEqual({ [third]: "ops", "a1b2c3d4-4444-4444-8888-444444444444": "ops" })
    expect(cloned.draft?.teamMap?.workflowId).toBe("visit-copy")
    expect(cloned.copiedFrom).toEqual({ templateId: "visit-template", templateVersion: 1 })
    expect(original.steps[0].key).toBe(first)
  })
  it("preserves school semantic keys when copying a standard template", () => {
    const copied = duplicateWorkflowTemplate(base(), STANDARD_WORKFLOW_TEMPLATE_ID, "speaker-copy", "Speaker copy")
    expect(getWorkflowTemplate(copied, "speaker-copy")?.draft?.steps.map(item => item.key)).toEqual(EVENT_STEPS.map(item => item.key))
    expect(getWorkflowTemplate(copied, "speaker-copy")?.draft?.kind).toBe("standard")
  })
  it("keeps the current published default until another published template is chosen", () => {
    const s = newWorkflowTemplate(published(), "blank", "Blank")
    expect(setDefaultWorkflowTemplate(s, "blank")).toBe(s)
    expect(setDefaultWorkflowTemplate(s, "visit-template").org.defaultWorkflowTemplateId).toBe("visit-template")
  })
  it("rejects stale draft bases and non-lead writes", () => {
    const s = published()
    expect(saveWorkflowTemplateDraft(s, "visit-template", draft(s))).toBe(s)
    const member = { ...s, viewerId: s.roles.find(role => role.fn === "programs")!.holderId! }
    expect(newWorkflowTemplate(member, "denied", "Denied")).toBe(member)
    expect(duplicateWorkflowTemplate(member, "visit-template", "denied", "Denied")).toBe(member)
    expect(setDefaultWorkflowTemplate(member, "visit-template")).toBe(member)
    expect(workflowTemplatePublishError(member, "visit-template")).toContain("president")
  })
  it("validates real dependencies, dates and owner references for custom flows", () => {
    const s = base(), d = draft(s)
    expect(workflowTemplateDraftError(d, s.roles, true)).toBeNull()
    expect(workflowTemplateDraftError({ ...d, steps: [step(first, [second]), step(second, [first])] }, s.roles, true)).toBeTruthy()
    expect(workflowTemplateDraftError({ ...d, steps: [step(first, ["missing"])] }, s.roles, true)).toBeTruthy()
    expect(workflowTemplateDraftError({ ...d, steps: [{ ...d.steps[0], estDays: 1.5 }] }, s.roles, true)).toContain("workdays")
    expect(workflowTemplateDraftError({ ...d, steps: [{ ...d.steps[0], ownerRoleId: "removed" }] }, s.roles, true)).toContain("owner")
    expect(workflowTemplateDraftError({ ...d, steps: [{ ...d.steps[0], key: "run:ambiguous" }] }, s.roles, true)).toContain("ID")
    expect(workflowTemplateDraftError({ ...d, steps: [{ ...d.steps[0], anchor: { kind: "fixed", official: null, club: "2027-04-10" } }] }, s.roles, true)).toContain("relative")
  })
  it("does not allow changing a saved template's policy kind or dropping its school steps", () => {
    const s = base(), standard = findWorkflowTemplateVersion(s, STANDARD_WORKFLOW_TEMPLATE_ID)!
    expect(workflowTemplateDraftError({ ...standard, steps: standard.steps.filter(item => item.key !== "registry") }, s.roles, true)).toBeTruthy()
    expect(saveWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID, { ...standard, baseVersion: 1, kind: "custom" })).toBe(s)
  })
  it("generates opaque step IDs that fit legacy key constraints", () => {
    const a = newWorkflowStepId(), b = newWorkflowStepId()
    expect(a).not.toBe(b)
    expect(a.length).toBeLessThanOrEqual(40)
    expect(a).toMatch(/^[a-zA-Z0-9_-]+$/)
  })
  it("allows inserting a task before a school task while retaining its transitive prerequisites", () => {
    const s = base(), standard = findWorkflowTemplateVersion(s, STANDARD_WORKFLOW_TEMPLATE_ID)!
    const school = standard.steps.find(item => item.key === "registry")!
    const originalParents = school.dependsOn ?? []
    expect(originalParents.length).toBeGreaterThan(0)
    const inserted = { ...step(first, originalParents), ownerRoleId: standard.steps[0].ownerRoleId, phase: school.phase, placement: school.placement }
    const steps = [...standard.steps.map(item => item.key === school.key ? { ...item, dependsOn: [first] } : item), inserted]
    const d: WorkflowTemplateDraft = { ...standard, baseVersion: 1, steps, teamMap: { version: 1, workflowId: STANDARD_WORKFLOW_TEMPLATE_ID, stepTeams: Object.fromEntries(steps.map(item => [item.key, "ops"])) } }
    const edited = saveWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID, d)
    expect(edited).not.toBe(s)
    expect(workflowTemplatePublishError(edited, STANDARD_WORKFLOW_TEMPLATE_ID)).toBeNull()
    const saved = publishWorkflowTemplate(edited, STANDARD_WORKFLOW_TEMPLATE_ID)
    expect(findWorkflowTemplateVersion(saved, STANDARD_WORKFLOW_TEMPLATE_ID)?.version).toBe(2)
    expect(saved.org.eventWorkflow?.steps.find(item => item.key === school.key)?.dependsOn).toEqual([first])
  })
  it("lets Undo remove a draft-only insert before a school task without requiring it forever", () => {
    const s = base(), original = findWorkflowTemplateVersion(s, STANDARD_WORKFLOW_TEMPLATE_ID)!
    const school = original.steps.find(item => item.key === "registry")!
    const inserted = { ...step(first, school.dependsOn), ownerRoleId: school.ownerRoleId, phase: school.phase, placement: school.placement }
    const steps = [...original.steps.map(item => item.key === school.key ? { ...item, dependsOn: [first] } : item), inserted]
    const changed: WorkflowTemplateDraft = { ...original, baseVersion: 1, steps }
    const edited = saveWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID, changed)
    expect(getWorkflowTemplate(edited, STANDARD_WORKFLOW_TEMPLATE_ID)?.draft?.steps.some(item => item.key === first)).toBe(true)
    const undone = saveWorkflowTemplateDraft(edited, STANDARD_WORKFLOW_TEMPLATE_ID, { ...original, baseVersion: 1 })
    expect(undone).not.toBe(edited)
    expect(getWorkflowTemplate(undone, STANDARD_WORKFLOW_TEMPLATE_ID)?.draft?.steps).toEqual(original.steps)
  })
})

describe("template execution snapshots", () => {
  it("generates exactly the custom tasks, rewires edges and leaves all progress fresh", () => {
    const s = published(), result = instantiateWorkflowTemplate(s, event(), { templateId: "visit-template", templateVersion: 1 })
    expect(result.error).toBeUndefined()
    expect(result.nodes).toHaveLength(2)
    expect(result.nodes[1].dependsOn).toEqual([`${event().id}:${first}`])
    expect(result.nodes[0]).toMatchObject({ id: `${event().id}:${first}`, teamId: "ops", workflowSource: { runId: event().id, templateId: "visit-template", templateVersion: 1, templateStepId: first }, status: "accepted", acceptedOn: s.today })
    expect(result.nodes.every(node => !node.taskWork && !node.completedOn && node.draftLink === null)).toBe(true)
    expect(result.event.workflowRun?.snapshot.teams).toHaveLength(2)
    const scheduled = computeSchedule({ ...s, events: [...s.events, result.event], nodes: [...s.nodes, ...result.nodes] })
    expect(scheduled.nodes[result.nodes[0].id].club).toBeTruthy()
  })
  it("isolates activities and keeps event snapshots when the template changes", () => {
    const s = published(), a = instantiateWorkflowTemplate(s, event(), { templateId: "visit-template", templateVersion: 1 })
    let running = { ...s, events: [...s.events, a.event], nodes: [...s.nodes, ...a.nodes] }
    const old = findWorkflowTemplateVersion(running, "visit-template", 1)!
    running = publishWorkflowTemplate(saveWorkflowTemplateDraft(running, "visit-template", { ...old, name: "New version", baseVersion: 1, steps: old.steps.map(item => ({ ...item, title: "Updated work" })) }), "visit-template")
    const b = instantiateWorkflowTemplate(running, event("visit-may"), { templateId: "visit-template" })
    expect(b.event.workflowRun?.templateVersion).toBe(2)
    expect(b.nodes[0].id).not.toBe(a.nodes[0].id)
    expect(running.events.find(item => item.id === a.event.id)?.workflowRun?.snapshot.steps[0].title).toBe("Arrange transport")
    expect(a.event.workflowRun?.snapshot.name).toBe("Company visit")
  })
  it("returns an existing run on retries, without restoring or duplicating its tasks", () => {
    const s = published(), a = instantiateWorkflowTemplate(s, event(), { templateId: "visit-template", templateVersion: 1 })
    const running = { ...s, events: [...s.events, a.event], nodes: [...s.nodes, ...a.nodes.map(node => ({ ...node, status: "done" as const }))] }
    const retry = instantiateWorkflowTemplate(running, event(), { templateId: "visit-template", templateVersion: 1 })
    expect(retry).toEqual({ event: a.event, nodes: [] })
    expect(running.nodes.find(node => node.id === a.nodes[0].id)?.status).toBe("done")
    expect(instantiateWorkflowTemplate(running, event(), { templateId: STANDARD_WORKFLOW_TEMPLATE_ID }).error).toBeTruthy()
    expect(instantiateWorkflowTemplate(running, event("another"), { templateId: "visit-template", runId: event().id }).error).toBeTruthy()
  })
  it("keeps legacy standard lifecycle protections and task IDs", () => {
    const s = base(), e = event("standard-new"), result = instantiateWorkflowTemplate(s, e, { templateId: STANDARD_WORKFLOW_TEMPLATE_ID })
    expect(result.error).toBeUndefined()
    expect(result.nodes.some(node => node.id === "standard-new:plan")).toBe(true)
    expect(result.nodes).toHaveLength(stepsFor(e).length)
    expect(result.event.workflowRun?.templateId).toBe(STANDARD_WORKFLOW_TEMPLATE_ID)
    expect(s.nodes.some(node => node.eventId === "standard-new")).toBe(false)
  })
  it("never replaces a vacant explicit role with a different person of the same function", () => {
    const s = published(), role = s.roles.find(item => item.fn === "programs")!
    const vacant = { ...s, roles: [...s.roles.map(item => item.id === role.id ? { ...item, holderId: null } : item), { ...role, id: "other-programs", holderId: "other-person" }] }
    const result = instantiateWorkflowTemplate(vacant, event(), { templateId: "visit-template" })
    expect(result.nodes[0]).toMatchObject({ ownerId: null, status: "unclaimed" })
  })
  it("passes dependencies through excluded optional tasks without a dangling edge", () => {
    const s = published([step(first), { ...step(second, [first]), cond: "speaker" }, step(third, [second])])
    const result = instantiateWorkflowTemplate(s, event(), { templateId: "visit-template" })
    expect(result.nodes.map(node => node.stepKey)).toEqual([first, third])
    expect(result.nodes[1].dependsOn).toEqual([`${event().id}:${first}`])
  })
  it("refuses missing execution teams instead of silently dropping the published grouping", () => {
    const s = published()
    const missing = { ...s, org: { ...s.org, workflowTeams: [{ id: "empty", name: "Other" }] } }
    expect(instantiateWorkflowTemplate(missing, event(), { templateId: "visit-template" }).error).toContain("team")
    expect(workflowTemplateRunError(missing, findWorkflowTemplateVersion(s, "visit-template")!)).toContain("team")
  })
})

describe("restoring the preset and discarding drafts", () => {
  const lead = (): DemoState => {
    const s = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
    return { ...s, viewerId: s.roles.find(item => item.fn === "president")!.holderId! }
  }
  const member = (s: DemoState): DemoState => ({ ...s, viewerId: s.people.find(person => !s.roles.some(role => role.holderId === person.id && ["president", "vice_president"].includes(role.fn)))!.id })
  /** The preset without Check-in, edited the way the Settings builder does it. */
  const withoutCheckin = (s: DemoState): WorkflowTemplateDraft => {
    const preset = originalWorkflowPreset(s, 1)
    const before = { steps: preset.steps, stepTeams: preset.teamMap!.stepTeams, milestoneGraph: preset.milestoneGraph }
    const next = syncMilestoneSnapshot(before, deleteBuilderStep(before, "checkin"))
    return { ...preset, steps: next.steps, teamMap: { ...preset.teamMap!, stepTeams: next.stepTeams }, milestoneGraph: next.milestoneGraph }
  }

  it("lets the preset drop an organization core step, save a version and still create a dated activity", () => {
    let s = lead()
    const edited = withoutCheckin(s)
    expect(edited.milestoneGraph!.spine).not.toContain("checkin")
    expect(edited.milestoneGraph!.teamBranches.every(branch => branch.fromId !== "checkin" && branch.toId !== "checkin")).toBe(true)
    expect(workflowTemplateDraftError(edited, s.roles, true)).toBeNull()
    s = saveWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID, edited)
    expect(workflowTemplatePublishError(s, STANDARD_WORKFLOW_TEMPLATE_ID)).toBeNull()
    s = publishWorkflowTemplate(s, STANDARD_WORKFLOW_TEMPLATE_ID)
    const version = findWorkflowTemplateVersion(s, STANDARD_WORKFLOW_TEMPLATE_ID)!
    expect(version.version).toBe(2)
    expect(version.steps.some(item => item.key === "checkin")).toBe(false)
    const e: Event = { ...event("no-checkin"), type: "speaker", speaker: true, playbookId: "seo-event" }
    const result = instantiateWorkflowTemplate(s, e, { templateId: STANDARD_WORKFLOW_TEMPLATE_ID, templateVersion: 2 })
    expect(result.error).toBeUndefined()
    expect(result.nodes.some(node => node.stepKey === "checkin")).toBe(false)
    expect(result.nodes.some(node => node.stepKey === "headcount")).toBe(true)
    // Dates come only from the rule engine.
    expect(result.nodes.every(node => node.clubDeadline === null && node.officialDeadline === null)).toBe(true)
    const scheduled = computeSchedule({ ...s, events: [...s.events, result.event], nodes: [...s.nodes, ...result.nodes] })
    for (const node of result.nodes) expect(scheduled.nodes[node.id]?.club).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Version 1 still has Check-in.
    expect(findWorkflowTemplateVersion(s, STANDARD_WORKFLOW_TEMPLATE_ID, 1)!.steps.some(item => item.key === "checkin")).toBe(true)
  })

  it("restores the original preset as a draft on top of the latest version, leaving versions and activities alone", () => {
    let s = lead()
    s = publishWorkflowTemplate(saveWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID, withoutCheckin(s)), STANDARD_WORKFLOW_TEMPLATE_ID)
    const versions = structuredClone(getWorkflowTemplate(s, STANDARD_WORKFLOW_TEMPLATE_ID)!.versions), events = s.events, nodes = s.nodes
    expect(versions).toHaveLength(2)
    const restored = restoreWorkflowPreset(s, STANDARD_WORKFLOW_TEMPLATE_ID)
    const template = getWorkflowTemplate(restored, STANDARD_WORKFLOW_TEMPLATE_ID)!
    expect(template.versions).toEqual(versions)
    expect(template.draft?.baseVersion).toBe(2)
    expect(template.draft?.steps.map(item => item.key)).toEqual(EVENT_STEPS.map(item => item.key))
    expect(template.draft?.milestoneGraph?.spine).toContain("checkin")
    expect(template.draft?.teamMap?.stepTeams.checkin).toBeTruthy()
    expect(restored.events).toBe(events)
    expect(restored.nodes).toBe(nodes)
    expect(workflowTemplatePublishError(restored, STANDARD_WORKFLOW_TEMPLATE_ID)).toBeNull()
    const saved = publishWorkflowTemplate(restored, STANDARD_WORKFLOW_TEMPLATE_ID)
    expect(findWorkflowTemplateVersion(saved, STANDARD_WORKFLOW_TEMPLATE_ID)!.version).toBe(3)
    // Only the preset, only a lead, and an unchanged draft is not rewritten.
    const custom = newWorkflowTemplate(s, "visit-template", "Company visit")
    expect(restoreWorkflowPreset(custom, "visit-template")).toBe(custom)
    const viewer = member(s)
    expect(restoreWorkflowPreset(viewer, STANDARD_WORKFLOW_TEMPLATE_ID)).toBe(viewer)
    expect(restoreWorkflowPreset(restored, STANDARD_WORKFLOW_TEMPLATE_ID)).toBe(restored)
  })

  it("discards a draft back to the latest saved version only when one exists", () => {
    let s = lead()
    s = saveWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID, withoutCheckin(s))
    expect(getWorkflowTemplate(s, STANDARD_WORKFLOW_TEMPLATE_ID)!.draft).toBeTruthy()
    const discarded = discardWorkflowTemplateDraft(s, STANDARD_WORKFLOW_TEMPLATE_ID)
    const template = getWorkflowTemplate(discarded, STANDARD_WORKFLOW_TEMPLATE_ID)!
    expect(template.draft).toBeUndefined()
    expect(template.versions).toEqual(getWorkflowTemplate(s, STANDARD_WORKFLOW_TEMPLATE_ID)!.versions)
    expect(findWorkflowTemplateVersion(discarded, STANDARD_WORKFLOW_TEMPLATE_ID)!.steps.some(item => item.key === "checkin")).toBe(true)
    expect(discardWorkflowTemplateDraft(discarded, STANDARD_WORKFLOW_TEMPLATE_ID)).toBe(discarded)
    // A template that was never saved keeps its only draft.
    const blank = newWorkflowTemplate(s, "blank", "Volunteer")
    expect(discardWorkflowTemplateDraft(blank, "blank")).toBe(blank)
    const viewer = member(s)
    expect(discardWorkflowTemplateDraft(viewer, STANDARD_WORKFLOW_TEMPLATE_ID)).toBe(viewer)
  })
})
