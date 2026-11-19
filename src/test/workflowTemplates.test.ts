import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import type { DemoState, Event, StepTemplate, WorkflowTemplateDraft } from "../data/types"
import { STANDARD_WORKFLOW_TEMPLATE_ID, duplicateWorkflowTemplate, findWorkflowTemplateVersion, getWorkflowTemplate, getWorkflowTemplates, instantiateWorkflowTemplate, newWorkflowTemplate, newWorkflowStepId, publishWorkflowTemplate, publishedWorkflowTemplates, saveWorkflowTemplateDraft, setDefaultWorkflowTemplate, workflowTemplateDraftError, workflowTemplatePublishError, workflowTemplateRunError } from "../data/workflowTemplates"
import { EVENT_STEPS, stepsFor } from "../engine/playbooks"
import { computeSchedule } from "../engine/schedule"

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
    expect(workflowTemplatePublishError(s, "blank")).toContain("1 to")
    expect(publishWorkflowTemplate(s, "blank")).toBe(s)
    expect(publishedWorkflowTemplates(s).some(template => template.id === "blank")).toBe(false)
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
