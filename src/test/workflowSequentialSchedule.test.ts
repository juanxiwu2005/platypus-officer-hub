import { describe, expect, it } from "vitest"
import type { DemoState, Event, Node, StepTemplate } from "../data/types"
import { seedDemo } from "../data/seed"
import { getWorkflowTemplates, instantiateWorkflowTemplate, publishWorkflowTemplate, saveWorkflowTemplateDraft } from "../data/workflowTemplates"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { applySchedule, computeSchedule } from "../engine/schedule"
import { sequenceTeamSteps } from "../engine/workflowSequence"
import { stepsAsNodes } from "../engine/workflow"

const EVENT: Event = { id: "sequential", name: "Fictional team workflow", date: "2027-04-16", type: "speaker", headcount: 80, venue: "campus", food: "offsite", funding: "usg", speaker: true, checks: {}, goalId: null, playbookId: "workflow-editor-custom" }
const node = (key: string, patch: Partial<Node> = {}): Node => ({
  id: `sequential:${key}`, title: key, eventId: EVENT.id, stepKey: key, phase: "prepare", fn: "president", ownerId: "alex", approverRoleId: null, consultedRoleIds: [], informedRoleIds: [],
  dependsOn: [], tier: "light", estDays: 2, timing: { startDays: 65, dueDays: 60 }, anchor: null, clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [],
  status: "accepted", acceptedOn: "2027-01-04", waitingOn: null, draftLink: null, why: "Fictional instructions", source: "Sequential schedule test", lastUpdate: null, teamId: "ops", ...patch,
})

function world(nodes: Node[], sequential = true, buffer = 1): DemoState {
  const base = seedDemo("2027-01-04", "v2")
  const steps: StepTemplate[] = nodes.map(n => ({ key: n.stepKey!, title: n.title, phase: n.phase ?? "prepare", fn: n.fn, estDays: n.estDays, tier: n.tier, dependsOn: n.dependsOn.map(id => nodes.find(parent => parent.id === id)!.stepKey!), ...(n.anchor ? { anchor: n.anchor } : {}), ...(n.timing ? { timing: { ...n.timing } } : {}), why: n.why, source: n.source }))
  const event: Event = { ...EVENT, workflowRun: { id: EVENT.id, templateId: "test-template", templateName: "Fictional workflow", templateVersion: 1, snapshot: { name: "Fictional workflow", kind: "custom", version: 1, savedOn: base.today, steps, ...(sequential ? { teamExecution: "sequential" } : {}), teams: [{ id: "ops", name: "Operations" }, { id: "marketing", name: "Marketing" }], teamMap: { version: 1, workflowId: "test-template", stepTeams: Object.fromEntries(nodes.map(n => [n.stepKey!, n.teamId!])) } } } }
  return { ...base, events: [event], nodes, contributions: [], people: base.people.map(person => ({ ...person, personalBufferDays: buffer, personalBufferEnabled: true, busyWeeks: [] })) }
}

function expectFinishToStart(state: DemoState) {
  const plan = computeSchedule(state)
  for (const task of state.nodes) for (const parentId of task.dependsOn) {
    const parent = state.nodes.find(node => node.id === parentId)
    if (parent && parent.status !== "done") expect(plan.nodes[task.id].latestStart > plan.nodes[parent.id].club, `${parent.title} → ${task.title}`).toBe(true)
  }
  return plan
}

describe("version-scoped sequential workflow scheduling", () => {
  it("retains legacy calibrated windows and overlapping finish-order semantics without the new flag", () => {
    const a = node("a"), b = node("b", { timing: { startDays: 60, dueDays: 58 }, dependsOn: [a.id] })
    const old = world([a, b], false), before = structuredClone(old)
    const plan = computeSchedule(old)
    expect([plan.nodes[b.id].latestStart, plan.nodes[b.id].club]).toEqual(["2027-02-15", "2027-02-17"])
    expect(plan.nodes[b.id].latestStart <= plan.nodes[a.id].club).toBe(true)
    expect(computeSchedule({ ...old, events: [{ ...old.events[0], workflowRun: undefined }] })).toEqual(plan)
    expect(old).toEqual(before)
  })

  it("starts early enough for real work instead of retaining overlapping calibrated windows", () => {
    const a = node("a"), b = node("b", { timing: { startDays: 60, dueDays: 58 }, dependsOn: [a.id] })
    const state = world([a, b]), original = structuredClone(state)
    const plan = expectFinishToStart(state)
    expect(plan.nodes[a.id].club < "2027-02-15").toBe(true)
    expect(plan.nodes[b.id].club).toBe("2027-02-17")
    expect(plan.nodes[a.id].issues.map(issue => issue.code)).not.toContain("effort_window")
    expect(state).toEqual(original)
    const dated = applySchedule(state)
    expect(dated.nodes.map(({ officialDeadline: _official, clubDeadline: _club, latestStart: _start, ...rest }) => rest)).toEqual(original.nodes.map(({ officialDeadline: _official, clubDeadline: _club, latestStart: _start, ...rest }) => rest))
  })

  it("allows disconnected teams to work at the same time and treats cross-team handoffs as finish-to-start", () => {
    const a = node("a"), b = node("b", { dependsOn: [a.id], timing: { startDays: 60, dueDays: 58 } })
    const c = node("c", { teamId: "marketing" }), d = node("d", { dependsOn: [c.id], teamId: "marketing", timing: { startDays: 60, dueDays: 58 } })
    const plan = expectFinishToStart(world([a, b, c, d]))
    expect(plan.nodes[a.id].latestStart).toBe(plan.nodes[c.id].latestStart)
    expect(plan.nodes[b.id].latestStart).toBe(plan.nodes[d.id].latestStart)
    expectFinishToStart(world([a, { ...b, teamId: "marketing" }]))
  })

  it("keeps official deadlines and flags a real human override that leaves insufficient time", () => {
    const a = node("a", { timing: { startDays: 10, dueDays: 1 } })
    const b = node("school", { timing: { startDays: 30, dueDays: 7 }, anchor: { kind: "rule", ruleId: "R09", days: 10, unit: "business" }, ruleIds: ["R09"], dependsOn: [a.id] })
    const plan = expectFinishToStart(world([a, b]))
    expect(plan.nodes[b.id].official).toBe("2027-04-02")
    expect(plan.nodes[b.id].club <= plan.nodes[b.id].official!).toBe(true)
    expect(plan.nodes[b.id].issues.map(issue => issue.code)).not.toContain("official_missed")
    const late = computeSchedule(world([{ ...a, clubDeadlineOverride: "2027-04-14" }, b]))
    expect(late.nodes[b.id].official).toBe(plan.nodes[b.id].official)
    expect(late.nodes[b.id].issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["official_missed", "effort_window", "pushed"]))
    expect(b.anchor).toEqual({ kind: "rule", ruleId: "R09", days: 10, unit: "business" })
  })

  it("preserves event-day headcount and the after-event floor without inventing zero effort", () => {
    const headcount = node("headcount", { estDays: 0, phase: "close", timing: { startDays: 0, dueDays: 0 } })
    const thankyou = node("thankyou", { estDays: 1, phase: "close", timing: { startDays: -1, dueDays: -1 }, dependsOn: [headcount.id] })
    const zero = expectFinishToStart(world([headcount, thankyou], true, 0))
    expect([zero.nodes[headcount.id].latestStart, zero.nodes[headcount.id].club]).toEqual([EVENT.date, EVENT.date])
    expect(zero.nodes[thankyou.id].latestStart > EVENT.date).toBe(true)
    const realEffort = computeSchedule(world([{ ...headcount, estDays: 1 }], true, 1))
    expect(realEffort.nodes[headcount.id].latestStart).toBe(EVENT.date)
    expect(realEffort.nodes[headcount.id].club > EVENT.date).toBe(true)
    expect(realEffort.nodes[headcount.id].issues.map(issue => issue.code)).toContain("effort_window")
  })

  it("plans all 46 standard preview tasks early enough while keeping original rules and task definitions", () => {
    const base = ensureWorkflowPresetTeams(seedDemo("2026-10-31", "v2"))
    const original = getWorkflowTemplates(base)[0].versions[0]
    const stepTeams = original.teamMap!.stepTeams
    const steps = sequenceTeamSteps(original.steps, stepTeams)
    const nodes = stepsAsNodes(steps, EVENT.id).map((n, index) => ({ ...n, teamId: stepTeams[n.stepKey!], ...(steps[index].timing ? { timing: { ...steps[index].timing! } } : {}) }))
    const event: Event = { ...EVENT, playbookId: "workflow-editor-standard", workflowRun: { id: EVENT.id, templateId: "standard-event", templateName: original.name, templateVersion: 0, snapshot: { ...original, teamExecution: "sequential", steps, teams: base.org.workflowTeams! } } }
    const state = { ...base, events: [event], nodes, people: [] }, before = structuredClone(state)
    const plan = expectFinishToStart(state)
    expect(nodes).toHaveLength(46)
    const early = nodes.filter(task => task.phase !== "close")
    expect(early.every(task => plan.nodes[task.id].club < EVENT.date)).toBe(true)
    expect(nodes.flatMap(task => plan.nodes[task.id].issues).filter(issue => issue.code === "official_missed")).toEqual([])
    expect(nodes.filter(task => task.phase === "close").every(task => plan.nodes[task.id].latestStart >= EVENT.date)).toBe(true)
    expect(state).toEqual(before)
  })

  it("applies the new scheduling contract only to newly instantiated sequential versions", () => {
    const base = ensureWorkflowPresetTeams(seedDemo("2026-10-31", "v2")), original = getWorkflowTemplates(base)[0].versions[0]
    const edited = saveWorkflowTemplateDraft(base, "standard-event", { ...original, teamExecution: "sequential", baseVersion: 1 })
    const saved = publishWorkflowTemplate(edited, "standard-event")
    expect(getWorkflowTemplates(saved)[0].versions[0]).toEqual(original)
    const run = instantiateWorkflowTemplate(saved, { ...EVENT, id: "new-sequence" }, { templateId: "standard-event", templateVersion: 2 })
    expect(run.error).toBeUndefined()
    expect(run.event.workflowRun?.snapshot.teamExecution).toBe("sequential")
    expectFinishToStart({ ...saved, events: [run.event], nodes: run.nodes })
    expect(saved.events).toBe(base.events)
    expect(saved.nodes).toBe(base.nodes)
    expect(computeSchedule(saved).nodes).toEqual(computeSchedule(base).nodes)
  })
})
