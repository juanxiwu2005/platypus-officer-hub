import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { getWorkflowTemplates } from "../src/data/workflowTemplates"
import { EVENT_STEPS } from "../src/engine/playbooks"
import { closeRail, noOverflow } from "./helpers"
import { addDays } from "../src/lib/dates"
import type { DemoState } from "../src/data/types"

const read = (page: import("@playwright/test").Page): Promise<DemoState> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline preset team acceptance" } }))
})

test("the original 46-step template opens fully grouped with four preset teams", async ({ page }, info) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/#/settings")
  const before = await read(page)
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const builder = page.getByTestId("workflow-builder")
  await expect(builder).toBeVisible()
  await expect(builder.locator('[data-testid^="workflow-task-"]')).toHaveCount(46)
  const saved = await read(page)
  expect(saved.org.workflowTeams?.map(team => team.name)).toEqual(["Club leadership", "Operations", "Marketing", "Finance"])
  // One lane per team branch: its pill names the team and counts its steps. Shared steps sit on the main line.
  const pills = builder.locator('[data-testid^="workflow-branch-pill-"]')
  const lanes = await pills.evaluateAll(elements => elements.map(element => ({ id: element.getAttribute("data-testid")!.replace("workflow-branch-pill-", ""), label: element.getAttribute("aria-label")! })))
  expect(lanes.length).toBeGreaterThan(0)
  expect(lanes.every(lane => /^.+ · \d+ steps?, edit branch$/.test(lane.label) && !lane.label.startsWith("Choose team"))).toBe(true)
  const laneTeam = new Map(lanes.map(lane => [lane.id, lane.label.split(" · ")[0]]))
  const dots = await builder.locator('[data-testid^="workflow-task-"]').evaluateAll(elements => elements.map(element => ({ key: element.getAttribute("data-testid")!.replace("workflow-task-", ""), branch: element.getAttribute("data-branch-id") })))
  // Every branch dot sits in a lane that shows its pill; the lane's step count matches its dots.
  for (const lane of lanes) expect(lane.label).toContain(`· ${dots.filter(dot => dot.branch === lane.id).length} step`)
  const maps = getWorkflowTemplates(saved)[0].versions[0].teamMap!.stepTeams
  for (const [key, count] of [["leadership", 1], ["operations", 25], ["marketing", 8], ["finance", 12]] as const) {
    const team = saved.org.workflowPresetTeamIds![key]!
    const name = saved.org.workflowTeams!.find(item => item.id === team)!.name
    expect(Object.values(maps).filter(id => id === team)).toHaveLength(count)
    // Each mapped step is shown either in one of this team's lanes or on the shared main line.
    const shown = dots.filter(dot => dot.branch ? laneTeam.get(dot.branch) === name : maps[dot.key] === team)
    expect(shown).toHaveLength(count)
    expect(shown.every(dot => maps[dot.key] === team)).toBe(true)
  }
  expect(saved.nodes).toEqual(before.nodes)
  expect(EVENT_STEPS).toHaveLength(46)
  await expect(builder.locator(".wfb-unassigned")).toHaveCount(0)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const axe = await new AxeBuilder({ page }).include("[data-testid='workflow-template-editor']").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(axe.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([])
  await page.screenshot({ path: info.outputPath("restored-default-teams.png"), fullPage: false })
  expect(errors).toEqual([])
})

test("arbitrary team names survive reload and the preset still creates grouped Plan tasks", async ({ page }) => {
  // Teams are renamed in Roles & teams (Workflow no longer has its own Teams panel).
  await page.goto("/#/settings?tab=roles")
  await closeRail(page)
  await expect(page.getByTestId("org-chart")).toBeVisible()
  const before = await read(page)
  const renamed = ["Board", "Event crew", "Storytelling", "Resources"]
  for (let i = 0; i < before.org.workflowTeams!.length; i++) {
    await page.locator(`[data-testid="team-zone"][data-team-id="${before.org.workflowTeams![i].id}"] button`).first().click()
    await page.getByTestId("roles-inspector").getByLabel("Team name", { exact: true }).fill(renamed[i])
  }
  await expect.poll(async () => (await read(page)).org.workflowTeams?.map(team => team.name)).toEqual(renamed)
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await expect(page.getByTestId("workflow-builder").locator('[data-testid^="workflow-task-"]')).toHaveCount(46)
  let saved = await read(page)
  expect(saved.org.workflowTeams?.map(team => team.id)).toEqual(before.org.workflowTeams?.map(team => team.id))
  expect(saved.org.workflowPresetTeamIds).toEqual(before.org.workflowPresetTeamIds)
  expect(saved.nodes).toEqual(before.nodes)
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form").last()
  await form.getByLabel("Event name", { exact: true }).fill("Renamed team preset event")
  await form.getByLabel("Date", { exact: true }).fill(addDays(saved.today, 150))
  // Option A (2026-11-28): Create event is the approval and makes the event at once; no Review changes step.
  await form.getByRole("button", { name: "Create event", exact: true }).click()
  await expect.poll(async () => (await read(page)).events.some(event => event.name === "Renamed team preset event")).toBe(true)
  await closeRail(page)
  saved = await read(page)
  const event = saved.events.find(event => event.name === "Renamed team preset event")!
  expect(event.workflowRun?.snapshot.teams.map(team => team.name)).toEqual(renamed)
  const tasks = saved.nodes.filter(node => node.eventId === event.id)
  expect(tasks.length).toBeGreaterThanOrEqual(31)
  expect(tasks.every(node => !!node.teamId)).toBe(true)
  expect(tasks.every(node => node.id === `${event.id}:${node.stepKey}`)).toBe(true)
  await expect(page.getByTestId("team-execution-lane")).toHaveCount(4)
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(tasks.length)
})
