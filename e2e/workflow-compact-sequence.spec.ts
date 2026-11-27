import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { DemoState, WorkflowTemplate, WorkflowTemplateContent } from "../src/data/types"
import { getWorkflowTemplates } from "../src/data/workflowTemplates"
import { addDays } from "../src/lib/dates"
import { noOverflow } from "./helpers"
import { openMenu, waitForDraftSave } from "./workflowLegacyHelpers"
import { dragToSlot } from "./workflowDrag"

type Content = WorkflowTemplateContent
const read = (page: Page): Promise<DemoState> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
let errors: string[] = []

test.beforeEach(async ({ page }) => {
  errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline compact workflow acceptance" } }))
})
test.afterEach(() => expect(errors).toEqual([]))

async function closeRail(page: Page) {
  await page.getByRole("button", { name: "Hide side panel", exact: true }).evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()))
}

async function open(page: Page) {
  await page.goto("/#/settings")
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await expect(page.getByTestId("workflow-builder")).toBeVisible()
  return page.getByTestId("workflow-builder")
}

async function savedTemplate(page: Page, id: string): Promise<WorkflowTemplate> {
  return getWorkflowTemplates(await read(page)).find(template => template.id === id)!
}

async function draft(page: Page, id: string): Promise<Content> {
  const template = await savedTemplate(page, id)
  return template.draft ?? template.versions.at(-1)!
}

/** Independent reachability check: visual order must be backed by actual dependencies. */
function ancestors(steps: { key: string; dependsOn?: string[] }[], key: string, seen = new Set<string>()) {
  for (const dependency of steps.find(step => step.key === key)?.dependsOn ?? []) {
    if (seen.has(dependency)) continue
    seen.add(dependency)
    ancestors(steps, dependency, seen)
  }
  return seen
}

function teamOrder(content: Content, teamId: string) {
  if (content.milestoneGraph) return content.milestoneGraph.teamBranches.filter(branch => branch.teamId === teamId).flatMap(branch => branch.stepIds)
  const pending = content.steps.filter(step => content.teamMap?.stepTeams[step.key] === teamId)
  return [...pending].sort((a, b) => ancestors(content.steps, b.key).has(a.key) ? -1 : ancestors(content.steps, a.key).has(b.key) ? 1 : 0).map(step => step.key)
}

async function newTemplate(page: Page, name: string) {
  const builder = await open(page)
  await openMenu(page, "New workflow", "Blank workflow")
  await page.getByLabel("Workflow name", { exact: true }).fill(name)
  await waitForDraftSave(page)
  const template = getWorkflowTemplates(await read(page)).find(item => item.draft?.name === name)!
  return { builder, id: template.id }
}

async function addTasks(page: Page, titles: string[], teamId: string) {
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Quick entry", exact: true }).click()
  await builder.getByLabel("Task names", { exact: true }).fill(titles.join("\n"))
  await builder.getByRole("combobox", { name: "Assign team", exact: true }).selectOption(teamId)
  const state = await read(page)
  await builder.getByRole("combobox", { name: "Assign role", exact: true }).selectOption(state.roles.find(role => role.holderId === state.viewerId)!.id)
  await builder.getByRole("button", { name: "Add tasks", exact: true }).click()
  await waitForDraftSave(page)
}

async function publish(page: Page, id: string, version: number) {
  await closeRail(page)
  await page.getByRole("button", { name: "Save version", exact: true }).click()
  await expect.poll(async () => (await savedTemplate(page, id)).versions.at(-1)?.version).toBe(version)
  return (await savedTemplate(page, id)).versions.at(-1)!
}

async function createEvent(page: Page, name: string, templateId: string, version: number) {
  const definition = (await savedTemplate(page, templateId)).versions.find(item => item.version === version)!
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections", exact: true }).getByRole("link", { name: /^Plan/ }).click()
  // Plan opens Tasks first (batch 1); new events are made from the Events view.
  await page.getByRole("navigation", { name: "Plan" }).getByRole("link", { name: "Events" }).click()
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form").last()
  await form.getByLabel("Event name", { exact: true }).fill(name)
  await form.getByLabel("Date", { exact: true }).fill(addDays((await read(page)).today, 150))
  await form.getByRole("combobox", { name: "Workflow template", exact: true }).selectOption({ label: `${definition.name} · v${version}` })
  await form.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByTestId("change-item").last().getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await read(page)).events.some(event => event.name === name)).toBe(true)
  await closeRail(page)
  return (await read(page)).events.find(event => event.name === name)!
}

/** Drop the task on the diamond just before the target task in the same branch. */
async function dragBefore(page: Page, sourceKey: string, targetKey: string, touch: boolean) {
  await dragToSlot(page, `workflow-task-${sourceKey}`, slot => slot.targetId === targetKey && slot.before === "true", touch)
}

test("the default 46 tasks use four compact team containers without rewriting dependencies or historical activities", async ({ page }, info) => {
  await page.goto("/#/settings")
  const before = await read(page)
  const oldVersion = getWorkflowTemplates(before).find(template => template.id === "standard-event")!.versions[0]
  const builder = await open(page)
  const dots = builder.locator('[data-testid^="workflow-task-"]')
  await expect(dots).toHaveCount(46)
  await waitForDraftSave(page)
  await expect(builder.locator('[data-testid^="workflow-segment-"]')).toHaveCount((await draft(page, "standard-event")).milestoneGraph!.teamBranches.length)
  await expect(builder.locator(".wfb-task")).toHaveCount(0)
  for (const task of oldVersion.steps) await expect(builder.getByRole("button", { name: `Edit ${task.title}`, exact: true })).toHaveCount(1)
  await waitForDraftSave(page)
  await expect.poll(async () => (await draft(page, "standard-event")).teamExecution).toBe("dependencies")
  const authored = await draft(page, "standard-event")
  expect(authored.steps).toEqual(oldVersion.steps)
  await expect(builder.getByTestId("workflow-branch-track")).toHaveCount(authored.milestoneGraph!.teamBranches.length)
  // Dense teams continue inside their own container; the workflow no longer grows with effort windows.
  const dotWidths = await dots.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width))
  expect(dotWidths.every(width => width <= 104)).toBe(true)
  const full = oldVersion.steps.find(step => step.title.split(/\s+/).length > 2)!
  await builder.getByRole("button", { name: `Edit ${full.title}`, exact: true }).click()
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(full.title)
  await expect(page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true })).toHaveValue(full.why)
  await closeRail(page)
  const savedVersion = await publish(page, "standard-event", oldVersion.version + 1)
  expect(savedVersion.teamExecution).toBe("dependencies")
  expect((await savedTemplate(page, "standard-event")).versions[0]).toEqual(oldVersion)
  expect((await read(page)).nodes).toEqual(before.nodes)
  expect((await read(page)).events).toEqual(before.events)
  const event = await createEvent(page, "Dot standard event", "standard-event", savedVersion.version)
  const state = await read(page)
  const tasks = state.nodes.filter(node => node.eventId === event.id)
  expect(tasks.some(node => node.stepKey === "drone" || node.stepKey === "alcohol")).toBe(false)
  // The original graph's prerequisites still reference actual tasks in this run.
  expect(tasks.every(node => node.dependsOn.every(id => tasks.some(task => task.id === id)))).toBe(true)
  expect(state.nodes.filter(node => before.nodes.some(old => old.id === node.id))).toEqual(before.nodes)
  expect(state.events.filter(item => before.events.some(old => old.id === item.id))).toEqual(before.events)
  await open(page)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const axe = await new AxeBuilder({ page }).include("[data-testid='workflow-template-editor']").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(axe.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([])
  await builder.locator(".wfx-scroll").screenshot({ path: info.outputPath("dot-default-four-teams.png") })
})

test("independent teams keep parallel starting columns while their tasks remain compact and reusable", async ({ page }) => {
  const { builder, id } = await newTemplate(page, "Independent team starts")
  const state = await read(page)
  const operations = state.org.workflowPresetTeamIds!.operations!, marketing = state.org.workflowPresetTeamIds!.marketing!
  await addTasks(page, ["Confirm company visit transport"], operations)
  await addTasks(page, ["Publish volunteer outreach announcement"], marketing)
  const definition = await publish(page, id, 1)
  expect(definition.steps.every(step => !step.dependsOn?.length)).toBe(true)
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  const positions = await Promise.all(definition.steps.map(async step => {
    const element = builder.getByTestId(`workflow-task-${step.key}`)
    return { col: await element.getAttribute("data-col"), box: await element.boundingBox() }
  }))
  expect(positions[0].box!.x).toBe(positions[1].box!.x)
  expect(positions[0].box!.y).not.toBe(positions[1].box!.y)
  const event = await createEvent(page, "Independent team activity", id, 1)
  const tasks = (await read(page)).nodes.filter(node => node.eventId === event.id)
  expect(tasks).toHaveLength(2)
  expect(tasks.every(node => !node.dependsOn.length)).toBe(true)
  expect(new Set(tasks.map(node => node.teamId)).size).toBe(2)
  expect(tasks.map(node => node.title)).toEqual(definition.steps.map(step => step.title))
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(2)
})

test("real pointer reordering preserves IDs and dates, supports Undo, and only affects the next saved activity", async ({ page, isMobile }) => {
  const { builder, id } = await newTemplate(page, "Sequential task reorder")
  const team = (await read(page)).org.workflowPresetTeamIds!.operations!
  await addTasks(page, ["Prepare company visit checklist", "Confirm company transport details", "Send final participant briefing"], team)
  const version1 = await publish(page, id, 1)
  const originalKeys = version1.steps.map(step => step.key)
  const oldEvent = await createEvent(page, "First ordered activity", id, 1)
  const oldTasks = (await read(page)).nodes.filter(node => node.eventId === oldEvent.id)
  await open(page)
  await page.getByRole("combobox", { name: "Saved workflow", exact: true }).selectOption(id)
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  const source = originalKeys[2], target = originalKeys[1]
  const nextOrder = [originalKeys[0], source, target]
  await dragBefore(page, source, target, isMobile)
  await expect.poll(async () => teamOrder(await draft(page, id), team)).toEqual(nextOrder)
  let changed = await draft(page, id)
  for (const step of version1.steps) {
    const current = changed.steps.find(item => item.key === step.key)!
    expect({ title: current.title, anchor: current.anchor, timing: current.timing, estDays: current.estDays, ownerRoleId: current.ownerRoleId, cond: current.cond }).toEqual({ title: step.title, anchor: step.anchor, timing: step.timing, estDays: step.estDays, ownerRoleId: step.ownerRoleId, cond: step.cond })
  }
  expect(changed.teamMap).toEqual(version1.teamMap)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  await expect.poll(async () => teamOrder(await draft(page, id), team)).toEqual(originalKeys)
  await dragBefore(page, source, target, isMobile)
  await expect.poll(async () => teamOrder(await draft(page, id), team)).toEqual(nextOrder)
  const version2 = await publish(page, id, 2)
  expect((await savedTemplate(page, id)).versions[0]).toEqual(version1)
  expect((await read(page)).nodes.filter(node => node.eventId === oldEvent.id)).toEqual(oldTasks)
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await page.getByRole("combobox", { name: "Saved workflow", exact: true }).selectOption(id)
  changed = await draft(page, id)
  expect(teamOrder(changed, team)).toEqual(nextOrder)
  const nextEvent = await createEvent(page, "Second ordered activity", id, version2.version)
  const saved = await read(page)
  const tasks = saved.nodes.filter(node => node.eventId === nextEvent.id)
  const taskIds = new Map(tasks.map(node => [node.stepKey, node.id]))
  const actual = tasks.map(node => ({ key: node.id, dependsOn: node.dependsOn }))
  expect(ancestors(actual, taskIds.get(target)!).has(taskIds.get(source)!)).toBe(true)
  expect(tasks.every(node => oldTasks.every(old => old.id !== node.id))).toBe(true)
  expect(saved.nodes.filter(node => node.eventId === oldEvent.id)).toEqual(oldTasks)
})

test("reordering through a cross-team dependency loop is refused without changing the saved graph", async ({ page, isMobile }) => {
  const { builder, id } = await newTemplate(page, "Safe cross-team reorder")
  const state = await read(page)
  const operations = state.org.workflowPresetTeamIds!.operations!, marketing = state.org.workflowPresetTeamIds!.marketing!
  await addTasks(page, ["Agree partner visit", "Confirm partner arrival"], operations)
  await addTasks(page, ["Publish partner announcement"], marketing)
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  let current = await draft(page, id)
  const [a, c, b] = current.steps
  await builder.getByRole("button", { name: `Edit ${b.title}`, exact: true }).click()
  await page.getByRole("combobox", { name: "Add prerequisite", exact: true }).selectOption(a.key)
  await closeRail(page)
  await builder.getByRole("button", { name: `Edit ${c.title}`, exact: true }).click()
  await page.getByRole("combobox", { name: "Add prerequisite", exact: true }).selectOption(b.key)
  await closeRail(page)
  await waitForDraftSave(page)
  current = await draft(page, id)
  expect(ancestors(current.steps, c.key).has(b.key)).toBe(true)
  await dragBefore(page, c.key, a.key, isMobile)
  await expect(builder.getByRole("alert")).toContainText(/loop|cycle|cannot|keep/i)
  await waitForDraftSave(page)
  expect((await draft(page, id)).steps).toEqual(current.steps)
})

test("editing work effort keeps compact dot positions while preserving the engine-owned target", async ({ page }, info) => {
  const { builder, id } = await newTemplate(page, "Compact effort preview")
  const team = (await read(page)).org.workflowPresetTeamIds!.operations!
  await addTasks(page, ["Confirm room", "Share location"], team)
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  const original = await draft(page, id)
  const last = original.steps[1]
  const position = await builder.getByTestId(`workflow-task-${last.key}`).evaluate(element => (element as HTMLElement).style.left)
  await builder.getByRole("button", { name: `Edit ${last.title}`, exact: true }).click()
  await page.getByRole("spinbutton", { name: "Days of work", exact: true }).fill("12")
  await closeRail(page)
  await waitForDraftSave(page)
  const changed = await draft(page, id)
  expect(changed.steps.find(step => step.key === last.key)?.estDays).toBe(12)
  expect(changed.steps.find(step => step.key === last.key)?.anchor).toEqual(last.anchor)
  expect(await builder.getByTestId(`workflow-task-${last.key}`).evaluate(element => (element as HTMLElement).style.left)).toBe(position)
  await expect(builder.getByLabel("Preview target day", { exact: true })).toHaveCount(0)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: info.outputPath("dot-settings.png"), fullPage: true })
})
