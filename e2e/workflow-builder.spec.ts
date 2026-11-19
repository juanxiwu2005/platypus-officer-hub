import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { DemoState, Event, Node, StepTemplate, WorkflowMilestoneGraph } from "../src/data/types"
import { addDays } from "../src/lib/dates"
import { computeSchedule } from "../src/engine/schedule"
import { noOverflow } from "./helpers"
import { openMenu } from "./workflowLegacyHelpers"

type Version = { name: string; version: number; steps: StepTemplate[]; milestoneGraph?: WorkflowMilestoneGraph; teamMap?: { stepTeams: Record<string, string> } }
type Template = { id: string; draft?: Omit<Version, "version">; versions: Version[] }
type RunEvent = Event & { workflowRun?: { id: string; templateId: string; templateVersion: number; snapshot: Version & { teams: { id: string; name: string }[] } } }
type RunNode = Node & { teamId?: string; workflowSource?: { runId: string; templateId: string; templateVersion: number; templateStepId: string } }
type Saved = DemoState & { org: DemoState["org"] & { workflowTemplates?: Template[]; workflowTeams?: { id: string; name: string }[] }; events: RunEvent[]; nodes: RunNode[] }

const read = (page: Page): Promise<Saved> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
const names = ["Agree visit", "Confirm transport", "Open sign-up", "Share briefing", "Thank host"]
let pageErrors: string[] = []

async function closeRail(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) >= 1200) return
  // Route changes may close the rail between a visibility check and a click. Query and close once, atomically.
  await page.getByRole("button", { name: "Hide side panel", exact: true }).evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()))
}

test.beforeEach(async ({ page }) => {
  pageErrors = []
  page.on("pageerror", error => pageErrors.push(error.message))
  // Every server boundary is offline: creating a human-authored workflow must need no model or mail service.
  await page.route("**/api/**", route => route.request().url().endsWith("/api/health")
    ? route.fulfill({ json: { ok: true, configured: false, provider: null, model: null } })
    : route.fulfill({ status: 503, json: { message: "Offline workflow acceptance" } }))
})
test.afterEach(() => expect(pageErrors).toEqual([]))

async function settings(page: Page) {
  await page.goto("/#/settings")
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  return page.getByTestId("workflow-template-editor")
}

async function templateByName(page: Page, name: string) {
  return (await read(page)).org.workflowTemplates!.find(template => (template.draft?.name ?? template.versions.at(-1)?.name) === name)!
}

async function createTemplate(page: Page, name: string, taskNames = names) {
  await settings(page)
  expect((await read(page)).org.workflowTeams?.length).toBeGreaterThan(0)
  await openMenu(page, "New workflow", "Blank workflow")
  await page.getByLabel("Workflow name", { exact: true }).fill(name)
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Quick entry", exact: true }).click()
  await builder.getByLabel("Task names", { exact: true }).fill(taskNames.join("\n"))
  const saved = await read(page)
  const role = saved.roles.find(role => role.holderId === saved.viewerId)!
  await builder.getByRole("combobox", { name: "Assign role", exact: true }).selectOption(role.id)
  await builder.getByRole("combobox", { name: "Assign team", exact: true }).selectOption(saved.org.workflowTeams![0].id)
  await builder.getByRole("button", { name: "Add tasks", exact: true }).click()
  await page.getByRole("button", { name: "Save version", exact: true }).click()
  await expect.poll(async () => (await templateByName(page, name))?.versions.length).toBe(1)
  return (await templateByName(page, name))
}

async function createEvent(page: Page, name: string, template: Template, version = 1, dateOffset = 90) {
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form").last()
  await form.getByLabel("Event name", { exact: true }).fill(name)
  await form.getByLabel("Date", { exact: true }).fill(addDays((await read(page)).today, dateOffset))
  const workflowName = template.versions.find(item => item.version === version)!.name
  await form.getByLabel("Workflow template", { exact: true }).selectOption({ label: `${workflowName} · v${version}` })
  await form.getByRole("button", { name: "Continue", exact: true }).click()
  const change = page.getByTestId("change-item").last()
  await expect(change.getByLabel("Workflow template", { exact: true }).locator("option:checked")).toHaveText(`${workflowName} · v${version}`)
  await change.getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await read(page)).events.find(event => event.name === name)?.workflowRun?.templateVersion).toBe(version)
  await closeRail(page)
  return (await read(page)).events.find(event => event.name === name)!
}

test("five manually entered tasks save, instantiate as Plan dots and reopen after refresh without AI", async ({ page }, info) => {
  const calls: string[] = []
  page.on("request", request => { if (/\/api\/(chat|setup\/workflow|nudge\/draft|event\/review)(?:\?|$)/.test(request.url())) calls.push(request.url()) })
  const template = await createTemplate(page, "Company visit")
  const version = template.versions[0]
  expect(version.steps.map(step => step.title)).toEqual(names)
  expect(new Set(version.steps.map(step => step.key)).size).toBe(5)
  const event = await createEvent(page, "April visit", template)
  let saved = await read(page)
  const tasks = saved.nodes.filter(node => node.eventId === event.id)
  expect(tasks.map(node => node.title)).toEqual(names)
  expect(tasks).toHaveLength(5) // A custom workflow must not acquire the 31 speaker-event lifecycle steps.
  expect(tasks.every(node => node.workflowSource?.templateId === template.id)).toBe(true)
  expect(tasks.every(node => node.dependsOn.every(id => tasks.some(other => other.id === id)))).toBe(true)
  expect(tasks.every(node => node.latestStart && node.clubDeadline)).toBe(true)
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(5)
  await expect(page.getByTestId("workflow-builder")).toHaveCount(0)
  await page.getByTestId("flow-chart").scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath("plan-task-dots.png"), fullPage: false })
  await page.getByTestId(`flow-node-${tasks[0].stepKey}`).click()
  const detail = page.getByTestId("task-detail")
  await expect(detail.getByRole("heading", { name: names[0], exact: true })).toBeVisible()
  await detail.getByLabel("Task status", { exact: true }).selectOption("in_progress")
  await expect.poll(async () => (await read(page)).nodes.find(node => node.id === tasks[0].id)?.status).toBe("in_progress")
  await page.reload()
  await closeRail(page)
  saved = await read(page)
  expect(saved.nodes.filter(node => node.eventId === event.id).map(node => node.id)).toEqual(tasks.map(node => node.id))
  expect(saved.nodes.find(node => node.id === tasks[0].id)?.status).toBe("in_progress")
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(5)
  expect(calls).toEqual([])
})

test("the default standard workflow still shows task dots before an organization configures teams", async ({ page }) => {
  await page.goto("/#/events")
  await closeRail(page)
  expect((await read(page)).org.workflowTeams).toHaveLength(4)
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form").last()
  await form.getByLabel("Event name", { exact: true }).fill("Standard workflow without team setup")
  await form.getByLabel("Date", { exact: true }).fill(addDays((await read(page)).today, 90))
  await expect(form.getByLabel("Workflow template", { exact: true }).locator("option:checked")).toHaveText("Speaker series · v1")
  await form.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByTestId("change-item").last().getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await read(page)).events.some(event => event.name === "Standard workflow without team setup")).toBe(true)
  await closeRail(page)
  const saved = await read(page)
  const event = saved.events.find(event => event.name === "Standard workflow without team setup")!
  const tasks = saved.nodes.filter(node => node.eventId === event.id)
  expect(tasks.length).toBeGreaterThanOrEqual(31)
  expect(tasks.every(node => node.id === `${event.id}:${node.stepKey}`)).toBe(true)
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(tasks.length)
  await expect(page.getByTestId("team-execution-chart")).toHaveCount(1)
  await expect(page.getByTestId("team-execution-lane")).toHaveCount(4)
})

test("a second template version creates independent tasks without rewriting an existing activity", async ({ page }) => {
  const template = await createTemplate(page, "Reusable visit")
  const first = await createEvent(page, "April reusable visit", template)
  const before = (await read(page)).nodes.filter(node => node.eventId === first.id)
  await page.getByTestId(`flow-node-${before[0].stepKey}`).click()
  const detail = page.getByTestId("task-detail")
  await detail.getByLabel("Task status", { exact: true }).selectOption("in_progress")
  await detail.getByTestId("task-submission").getByLabel("Details", { exact: true }).fill("Fictional April host confirmed the visit.")
  await detail.getByRole("button", { name: "Submit & mark done", exact: true }).click()
  await expect.poll(async () => (await read(page)).nodes.find(node => node.id === before[0].id)?.status).toBe("done")
  const firstSaved = (await read(page)).nodes.filter(node => node.eventId === first.id)
  await settings(page)
  await page.getByLabel("Saved workflow", { exact: true }).selectOption(template.id)
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  await builder.getByRole("button", { name: `Edit ${names[0]}`, exact: true }).click()
  await page.getByLabel("Task name", { exact: true }).fill("Agree host visit")
  await closeRail(page)
  await page.getByRole("button", { name: "Save version", exact: true }).click()
  await expect.poll(async () => (await templateByName(page, "Reusable visit"))?.versions.length).toBe(2)
  const updated = await templateByName(page, "Reusable visit")
  expect(updated.versions[0].steps[0].title).toBe(names[0])
  expect(updated.versions[1].steps[0].key).toBe(updated.versions[0].steps[0].key)
  const second = await createEvent(page, "May reusable visit", updated, 2)
  const saved = await read(page)
  const secondTasks = saved.nodes.filter(node => node.eventId === second.id)
  expect(secondTasks).toHaveLength(5)
  expect(secondTasks[0].title).toBe("Agree host visit")
  expect(secondTasks[0].status).toBe("accepted")
  expect(secondTasks[0].taskWork).toBeUndefined()
  expect(secondTasks.every(node => firstSaved.every(prior => prior.id !== node.id))).toBe(true)
  expect(saved.nodes.filter(node => node.eventId === first.id)).toEqual(firstSaved)
  expect(saved.events.find(event => event.id === first.id)?.workflowRun?.templateVersion).toBe(1)
  expect(saved.events.find(event => event.id === second.id)?.workflowRun?.templateVersion).toBe(2)
  await page.reload()
  expect((await read(page)).nodes.filter(node => node.eventId === first.id)).toEqual(firstSaved)
})

test("before and next insertion keep the selected task's team and type; Undo restores the graph", async ({ page }) => {
  const template = await createTemplate(page, "Insertion trial", names.slice(0, 2))
  const original = template.versions[0]
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  await builder.getByRole("button", { name: `Edit ${names[1]}`, exact: true }).click()
  await page.getByRole("combobox", { name: "Step type", exact: true }).selectOption("situation")
  await page.getByRole("button", { name: "Add before", exact: true }).click()
  await closeRail(page)
  await expect.poll(async () => (await templateByName(page, "Insertion trial")).draft?.steps.length).toBe(3)
  if ((page.viewportSize()?.width ?? 1280) < 1200) await expect(page.locator('[data-testid="rail"][data-state="open"]')).toHaveCount(0)
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  let draft = (await templateByName(page, "Insertion trial")).draft!
  let added = draft.steps.find(step => !original.steps.some(prior => prior.key === step.key))!
  expect(added.stepKind).toBe("situation")
  expect(added.ownerRoleId).toBe(original.steps[1].ownerRoleId)
  expect(draft.teamMap?.stepTeams[added.key]).toBe(original.teamMap?.stepTeams[original.steps[1].key])
  expect(draft.steps.find(step => step.key === original.steps[1].key)?.dependsOn).toContain(added.key)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  expect((await templateByName(page, "Insertion trial")).draft?.steps).toHaveLength(2)
  await builder.getByRole("button", { name: `Edit ${names[1]}`, exact: true }).click()
  await expect(page.getByRole("button", { name: "Add parallel", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Add next", exact: true }).click()
  await closeRail(page)
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  draft = (await templateByName(page, "Insertion trial")).draft!
  added = draft.steps.find(step => !original.steps.some(prior => prior.key === step.key))!
  const reference = draft.steps.find(step => step.key === original.steps[1].key)!
  expect(added.dependsOn).toContain(reference.key)
  expect(added.stepKind).toBe(reference.stepKind)
  expect(draft.teamMap?.stepTeams[added.key]).toBe(draft.teamMap?.stepTeams[reference.key])
})

test("dependency connections reject loops and double-clicking an arrow leaves the workflow intact", async ({ page }) => {
  const template = await createTemplate(page, "Safe connections", names.slice(0, 2))
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  await builder.getByRole("button", { name: `Edit ${names[1]}`, exact: true }).click()
  await page.getByTestId("workflow-builder-details").getByRole("button", { name: "Connect on canvas", exact: true }).click()
  await closeRail(page)
  await builder.getByRole("button", { name: `Edit ${names[0]}`, exact: true }).click()
  await expect(builder.getByRole("alert")).toHaveText("This dependency would create a loop.")
  await builder.getByRole("button", { name: "Cancel connection", exact: true }).click()
  const arrow = builder.getByTestId("workflow-branch-track").first()
  await expect(arrow).toHaveCount(1)
  // SVG arrows intentionally have no pointer actions. Dispatch the DOM event to guard against a future delegated handler.
  await arrow.dispatchEvent("dblclick")
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  const saved = await templateByName(page, "Safe connections")
  expect((saved.draft ?? saved.versions.at(-1)!).steps).toEqual(template.versions[0].steps)
  expect(await builder.getByTestId("workflow-branch-track").count()).toBe(1)
})

test("custom T0 and T+ targets remain valid work on and after the activity day", async ({ page }) => {
  const template = await createTemplate(page, "Visit day and follow-up", ["Host visit", "Thank host"])
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  for (const [title, offset] of [["Host visit", "0"], ["Thank host", "2"]]) {
    await builder.getByRole("button", { name: `Edit ${title}`, exact: true }).click()
    await page.getByLabel("Finish by (T±)", { exact: true }).fill(offset)
    await closeRail(page)
  }
  await page.getByRole("button", { name: "Save version", exact: true }).click()
  await expect.poll(async () => (await templateByName(page, "Visit day and follow-up"))?.versions.length).toBe(2)
  const updated = await templateByName(page, "Visit day and follow-up")
  let dateOffset = 90
  const today = (await read(page)).today
  // A Monday target keeps T+2 on a workday, so this checks event-relative policy rather than weekend adjustment.
  while (new Date(`${addDays(today, dateOffset)}T12:00:00Z`).getUTCDay() !== 1) dateOffset++
  const event = await createEvent(page, "Visit with follow-up", updated, 2, dateOffset)
  const saved = await read(page)
  const tasks = saved.nodes.filter(node => node.eventId === event.id)
  const schedule = computeSchedule(saved)
  expect(tasks.find(node => node.title === "Host visit")?.clubDeadline).toBe(event.date)
  expect(tasks.find(node => node.title === "Thank host")!.clubDeadline! > event.date).toBe(true)
  expect(tasks.flatMap(node => schedule.nodes[node.id].issues).filter(issue => issue.code === "after_event")).toEqual([])
  expect(template.versions[0].milestoneGraph?.taskAnchors).not.toEqual(updated.versions[1].milestoneGraph?.taskAnchors)
})

test("the two authoring views share saved IDs and support keyboard, dark mode and narrow screens", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "dark" })
  const template = await createTemplate(page, "Readable visit")
  const editor = page.getByTestId("workflow-template-editor")
  const builder = page.getByTestId("workflow-builder")
  const timeline = builder.getByRole("button", { name: "Flow", exact: true })
  await timeline.focus()
  await timeline.press("Enter")
  await expect(builder.getByRole("button", { name: `Edit ${names[0]}`, exact: true })).toBeVisible()
  await builder.getByRole("button", { name: `Edit ${names[0]}`, exact: true }).click()
  await page.getByLabel("Task name", { exact: true }).fill("Agree company visit")
  await closeRail(page)
  // Switching templates must flush the latest edit without requiring a manual save or a debounce delay.
  await page.getByLabel("Saved workflow", { exact: true }).selectOption("standard-event")
  await page.getByLabel("Saved workflow", { exact: true }).selectOption(template.id)
  await expect(builder.getByRole("button", { name: "Edit Agree company visit", exact: true })).toBeVisible()
  await builder.getByRole("button", { name: "Edit Agree company visit", exact: true }).click()
  await page.getByLabel("Task name", { exact: true }).fill("Agree final company visit")
  await closeRail(page)
  // Leaving Settings also flushes the draft; the actual activity records remain separate.
  await page.goto("/#/events")
  await settings(page)
  await page.getByLabel("Saved workflow", { exact: true }).selectOption(template.id)
  await expect(builder.getByRole("button", { name: "Edit Agree final company visit", exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await page.getByLabel("Saved workflow", { exact: true }).selectOption(template.id)
  await expect(builder.getByRole("button", { name: "Edit Agree final company visit", exact: true })).toBeVisible()
  expect((await templateByName(page, "Readable visit")).draft?.steps[0].key).toBe(template.versions[0].steps[0].key)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const accessibility = await new AxeBuilder({ page }).include("[data-testid='workflow-template-editor']").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(accessibility.violations.filter(violation => violation.impact === "serious" || violation.impact === "critical")).toEqual([])
  await expect(editor).toBeVisible()
  await page.screenshot({ path: info.outputPath("workflow-builder-dark.png"), fullPage: false })
  await builder.locator(".wfx-scroll").screenshot({ path: info.outputPath("workflow-timeline-dark.png") })
})

test("changing a target in Details preserves its task identity and dependencies after refresh", async ({ page, isMobile }, info) => {
  const template = await createTemplate(page, "Drag visit timeline")
  const original = template.versions[0]
  const last = original.steps[original.steps.length - 1]
  const builder = page.getByTestId("workflow-builder")
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  await closeRail(page)
  const beforeOffset = original.milestoneGraph?.taskAnchors[last.key].offsetDays
  expect(beforeOffset).toBeDefined()
  await builder.getByRole("button", { name: `Edit ${last.title}`, exact: true }).click()
  await page.getByLabel("Finish by (T±)", { exact: true }).fill(String(beforeOffset! + 3))
  await closeRail(page)
  await expect.poll(async () => {
    return (await templateByName(page, "Drag visit timeline")).draft?.milestoneGraph?.taskAnchors[last.key].offsetDays
  }).toBe(beforeOffset! + 3)
  const draft = (await templateByName(page, "Drag visit timeline")).draft!
  const moved = draft.steps.find(step => step.key === last.key)!
  expect({ key: moved.key, estDays: moved.estDays, ownerRoleId: moved.ownerRoleId, dependsOn: moved.dependsOn }).toEqual({ key: last.key, estDays: last.estDays, ownerRoleId: last.ownerRoleId, dependsOn: last.dependsOn })
  expect(draft.teamMap?.stepTeams).toEqual(original.teamMap?.stepTeams)
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await page.getByLabel("Saved workflow", { exact: true }).selectOption(template.id)
  const restored = (await templateByName(page, "Drag visit timeline")).draft!.steps.find(step => step.key === last.key)!
  expect(restored.anchor).toEqual(moved.anchor)
  expect((await templateByName(page, "Drag visit timeline")).draft!.milestoneGraph?.taskAnchors[last.key]).toEqual(draft.milestoneGraph?.taskAnchors[last.key])

  if (!isMobile) {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.getByRole("button", { name: "Hide side panel", exact: true }).evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()))
    await page.screenshot({ path: info.outputPath("workflow-editor-1440.png"), fullPage: true })
    await builder.locator(".wfx-scroll").screenshot({ path: info.outputPath("workflow-timeline-1440.png") })
    await page.getByRole("button", { name: "Save version", exact: true }).click()
    await expect.poll(async () => (await templateByName(page, "Drag visit timeline")).versions.length).toBe(2)
    await createEvent(page, "Wide company visit", await templateByName(page, "Drag visit timeline"), 2)
    await expect(page.getByTestId("flow-edit-toggle")).toHaveCount(0)
    await page.getByRole("button", { name: "Hide side panel", exact: true }).evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()))
    await page.getByTestId("flow-chart").scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath("plan-dots-1440.png"), fullPage: false })
  }
})
