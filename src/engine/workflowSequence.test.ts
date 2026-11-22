import { describe, expect, it } from "vitest"
import type { StepTemplate } from "../data/types"
import { seedDemo } from "../data/seed"
import { getWorkflowTemplates, instantiateWorkflowTemplate, publishWorkflowTemplate, saveWorkflowTemplateDraft } from "../data/workflowTemplates"
import { presetWorkflowStepTeams, ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import { orderedWorkflowSteps, sequenceTeamSteps, sequenceTeamStepsForDraft } from "./workflowSequence"
import { checkWorkflow } from "./workflow"
import { stepsFor } from "./playbooks"

const step = (key: string, dependsOn: string[] = []): StepTemplate => ({ key, title: key, fn: "programs", phase: "prepare", estDays: 1, tier: "light", why: "Instructions", source: "Test", dependsOn })

describe("sequential team authoring", () => {
  it("serializes a fork within one team while preserving every existing cross-team edge and task field", () => {
    const steps = [step("a"), step("b", ["a"]), step("c", ["a"]), step("handoff", ["b", "c"]), step("independent")]
    const before = structuredClone(steps)
    const map = { a: "ops", b: "ops", c: "ops", handoff: "marketing", independent: "finance" }
    const next = sequenceTeamSteps(steps, map)
    expect(next[2].dependsOn).toEqual(["b"])
    expect(next[3].dependsOn).toEqual(["b", "c"])
    expect(next[4].dependsOn).toEqual([])
    expect(next.map(({ dependsOn: _deps, ...rest }) => rest)).toEqual(steps.map(({ dependsOn: _deps, ...rest }) => rest))
    expect(steps).toEqual(before)
    expect(sequenceTeamSteps(next, map)).toEqual(next)
  })

  it("uses one global topological order to avoid cycles across interleaved teams", () => {
    const steps = [step("c", ["b"]), step("a"), step("b", ["a"])]
    const next = sequenceTeamSteps(steps, { a: "ops", c: "ops", b: "marketing" })
    expect(orderedWorkflowSteps(next).map(step => step.key)).toEqual(["a", "b", "c"])
    expect(next[0].dependsOn).toEqual(["b", "a"])
    const bad = [step("a", ["b"]), step("b", ["a"])]
    expect(sequenceTeamSteps(bad, { a: "ops", b: "ops" })).toEqual(bad)
    expect(orderedWorkflowSteps(bad)).toEqual(bad)
  })

  it("leaves unmapped tasks and dangling references visible to validation", () => {
    const steps = [step("unmapped"), step("mapped", ["missing", "unmapped"])]
    expect(sequenceTeamSteps(steps, { mapped: "ops" })).toEqual(steps)
  })

  it("saves the standard 46-task chain as a new version without changing legacy versions, activities or dates", () => {
    const state = ensureWorkflowPresetTeams(seedDemo(undefined, "v2"))
    const original = getWorkflowTemplates(state)[0].versions[0]
    const stepTeams = presetWorkflowStepTeams(state, original.steps)
    const next = sequenceTeamStepsForDraft(state, original.steps, stepTeams, original.branches, "standard")
    expect(next).toHaveLength(46)
    expect(checkWorkflow(next, state.roles).filter(issue => issue.level === "blocked")).toEqual([])
    const draft = { ...original, teamExecution: "sequential" as const, steps: original.steps, baseVersion: 1, teamMap: { version: 1 as const, workflowId: "standard-event", stepTeams } }
    const edited = saveWorkflowTemplateDraft(state, "standard-event", draft)
    expect(edited).not.toBe(state)
    const published = publishWorkflowTemplate(edited, "standard-event")
    const versions = getWorkflowTemplates(published)[0].versions
    expect(versions).toHaveLength(2)
    expect(versions[0]).toEqual(original)
    expect(versions[1]).toMatchObject({ teamExecution: "sequential", steps: next })
    expect(published.events).toBe(state.events)
    expect(published.nodes).toBe(state.nodes)
    const chosen = { ...state.events[0], id: "new-serial", workflowRun: undefined }
    const run = instantiateWorkflowTemplate(published, chosen, { templateId: "standard-event" })
    expect(run.error).toBeUndefined()
    expect(run.event.workflowRun?.snapshot.teamExecution).toBe("sequential")
    const applicable = stepsFor(chosen, next)
    for (const team of new Set(Object.values(stepTeams))) {
      const order = orderedWorkflowSteps(applicable).filter(step => stepTeams[step.key] === team)
      for (let i = 1; i < order.length; i++) {
        const node = run.nodes.find(node => node.stepKey === order[i].key)!
        const ancestors = (id: string, seen = new Set<string>()): Set<string> => {
          if (seen.has(id)) return seen
          seen.add(id)
          for (const parent of run.nodes.find(item => item.id === id)?.dependsOn ?? []) ancestors(parent, seen)
          return seen
        }
        expect(ancestors(node.id)).toContain(`new-serial:${order[i - 1].key}`)
      }
    }
  })
})
