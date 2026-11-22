import { expect, it } from "vitest"
import type { DemoState, Event, Node } from "../data/types"
import { seedDemo } from "../data/seed"
import { computeForecast } from "../engine/forecast"

function world(sequential: boolean, calibrated: boolean): DemoState {
  const base = seedDemo("2027-02-01", "v2")
  const timing = calibrated ? { startDays: 30, dueDays: 14 } : undefined
  const anchor = { kind: "target" as const, days: 14, unit: "calendar" as const, label: "Fictional team target" }
  const step = { key: "work", title: "Confirm visit", fn: "president" as const, phase: "prepare" as const, estDays: 1, tier: "light" as const, dependsOn: [], anchor, ...(timing ? { timing } : {}), why: "Fictional work", source: "Forecast test" }
  const event: Event = { id: "forecast-sequence", name: "Fictional visit", date: "2027-02-16", type: "social", headcount: 20, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "custom", workflowRun: { id: "forecast-sequence", templateId: "forecast-template", templateVersion: 1, templateName: "Fictional workflow", snapshot: { name: "Fictional workflow", kind: "custom", version: 1, savedOn: base.today, steps: [step], ...(sequential ? { teamExecution: "sequential" } : {}), teams: [{ id: "ops", name: "Operations" }], teamMap: { version: 1, workflowId: "forecast-template", stepTeams: { work: "ops" } } } } }
  const task: Node = { ...step, id: "forecast-sequence:work", eventId: event.id, stepKey: step.key, teamId: "ops", ownerId: "alex", approverRoleId: null, consultedRoleIds: [], informedRoleIds: [], clubDeadlineOverride: null, officialDeadline: null, clubDeadline: null, latestStart: null, ruleIds: [], status: "accepted", acceptedOn: base.today, waitingOn: null, draftLink: null, lastUpdate: null }
  return { ...base, events: [event], nodes: [task], contributions: [], people: base.people.map(person => ({ ...person, personalBufferDays: 1, personalBufferEnabled: true, busyWeeks: [] })) }
}

it("uses equal workday and full-buffer assumptions for sequential tasks with retained timing or equivalent soft targets", () => {
  const retainedTiming = world(true, true), before = structuredClone(retainedTiming)
  const plainTarget = world(true, false)
  const legacy = world(false, true)
  const forecast = computeForecast(retainedTiming)
  expect(forecast).toEqual(computeForecast(plainTarget))
  // With a Tuesday deadline and Monday start, full effort + buffer no longer fits;
  // the legacy calibrated window still counts its inclusive day and embedded buffer.
  expect(forecast.nodes[retainedTiming.nodes[0].id].probability).toBe(0)
  expect(computeForecast(legacy).nodes[legacy.nodes[0].id].probability).toBe(1)
  expect(retainedTiming).toEqual(before)
})
