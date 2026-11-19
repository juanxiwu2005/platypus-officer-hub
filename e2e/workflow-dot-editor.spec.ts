import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { DemoState, WorkflowTemplate } from "../src/data/types"
import { getWorkflowTemplates } from "../src/data/workflowTemplates"
import { addDays } from "../src/lib/dates"
import { noOverflow } from "./helpers"

const read = (page: Page): Promise<DemoState> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
let errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline dot editor acceptance" } }))
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
async function current(page: Page): Promise<WorkflowTemplate> {
  const id = await page.getByRole("combobox", { name: "Saved workflow", exact: true }).inputValue()
  return getWorkflowTemplates(await read(page)).find(template => template.id === id)!
}
async function save(page: Page) {
  await closeRail(page)
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  return (await current(page)).draft!
}
async function empty(page: Page, name: string) {
  const builder = await open(page)
  await page.getByRole("button", { name: "New workflow", exact: true }).click()
  await page.getByLabel("Workflow name", { exact: true }).fill(name)
  await save(page)
  return builder
}

/** Use browser input, including real touch pointer events on the mobile project. */
async function moveToTeam(page: Page, sourceKey: string, targetTeamId: string, touch: boolean) {
  await closeRail(page)
  const source = page.getByTestId(`workflow-task-${sourceKey}`)
  const lane = page.getByTestId(`workflow-team-${targetTeamId}`)
  await page.getByTestId("workflow-builder").locator(".wfb-scroll").scrollIntoViewIfNeeded()
  await source.scrollIntoViewIfNeeded()
  const [a, b] = await Promise.all([source.boundingBox(), lane.boundingBox()])
  if (!a || !b) throw new Error("Task and destination branch must both be rendered")
  const x = a.x + a.width / 2, y = a.y + a.height / 2
  // Stay in the destination's task area, away from its team-name and Add task controls.
  const targetX = Math.min(b.x + b.width - 45, Math.max(x, b.x + 170))
  const targetY = b.y + b.height * 0.65
  if (touch) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
    for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (targetX - x) * i / 8, y: y + (targetY - y) * i / 8 }] })
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(targetX, targetY, { steps: 10 })
    await page.mouse.up()
  }
}

async function publish(page: Page) {
  await closeRail(page)
  await page.getByRole("button", { name: "Save version", exact: true }).click()
  await expect.poll(async () => (await current(page)).versions.length).toBe(1)
  return await current(page)
}

async function eventFromTemplate(page: Page, template: WorkflowTemplate, name: string) {
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form").last()
  await form.getByLabel("Event name", { exact: true }).fill(name)
  await form.getByLabel("Date", { exact: true }).fill(addDays((await read(page)).today, 90))
  await form.getByRole("combobox", { name: "Workflow template", exact: true }).selectOption({ label: `${template.versions[0].name} · v1` })
  await form.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByTestId("change-item").last().getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await read(page)).events.some(event => event.name === name)).toBe(true)
  await closeRail(page)
  return (await read(page)).events.find(event => event.name === name)!
}

test("a blank workflow has fixed endpoints; one click adds an empty team branch and then its first task", async ({ page }) => {
  const builder = await empty(page, "Empty dot workflow")
  await expect(builder.getByTestId("workflow-start")).toBeVisible()
  await expect(builder.getByTestId("workflow-done")).toBeVisible()
  await expect(builder.locator('[data-testid^="workflow-task-"]')).toHaveCount(0)
  await expect(builder.getByRole("button", { name: "Start", exact: true })).toHaveCount(0)
  await expect(builder.getByRole("button", { name: "Done", exact: true })).toHaveCount(0)
  const before = await read(page)
  const oldBranches = before.org.workflowTeams!
  await builder.getByRole("button", { name: "Add branch", exact: true }).click()
  await expect.poll(async () => (await read(page)).org.workflowTeams?.length).toBe(oldBranches.length + 1)
  const addedTeam = (await read(page)).org.workflowTeams!.find(team => !oldBranches.some(old => old.id === team.id))!
  await expect(builder.getByTestId(`workflow-team-${addedTeam.id}`)).toBeVisible()
  await expect(page.getByRole("dialog", { name: "Add branch", exact: true })).toHaveCount(0)
  expect((await save(page)).steps).toEqual([])
  await builder.getByRole("button", { name: "+ Task", exact: true }).click()
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("New task")
  const added = await save(page)
  expect(added.steps).toHaveLength(1)
  expect(added.teamMap?.stepTeams[added.steps[0].key]).toBe(addedTeam.id)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  expect((await save(page)).steps).toHaveLength(0)
  // Team identity is organizational; renaming the branch preserves that same ID after reload.
  await page.getByRole("button", { name: "Teams", exact: true }).click()
  await page.getByLabel(`Team name: ${addedTeam.name}`, { exact: true }).fill("Guest care")
  await page.getByRole("button", { name: "Save teams", exact: true }).click()
  await expect.poll(async () => (await read(page)).org.workflowTeams?.find(team => team.id === addedTeam.id)?.name).toBe("Guest care")
  const templateId = (await current(page)).id
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await page.getByRole("combobox", { name: "Saved workflow", exact: true }).selectOption(templateId)
  await expect(builder.getByTestId(`workflow-team-${addedTeam.id}`)).toContainText("Guest care")
  expect((await read(page)).nodes).toEqual(before.nodes)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("Event day and Full check presets are repeatable independent tasks, not reserved endpoints", async ({ page }) => {
  const builder = await empty(page, "Two event days")
  const before = await read(page)
  await builder.getByRole("button", { name: "Event day", exact: true }).click()
  await closeRail(page)
  await builder.getByRole("button", { name: "Event day", exact: true }).click()
  await closeRail(page)
  await builder.getByRole("button", { name: "Full check", exact: true }).click()
  let draft = await save(page)
  expect(draft.steps.map(step => step.title)).toEqual(["Event day", "Event day", "Full check"])
  expect(new Set(draft.steps.map(step => step.key)).size).toBe(3)
  expect(draft.steps.every(step => !["__start__", "__event__", "__end__", "finalcheck"].includes(step.key))).toBe(true)
  expect(draft.steps.filter(step => step.title === "Event day").every(step => step.anchor?.kind === "target" && step.anchor.days === 0)).toBe(true)
  // Each duplicate can be edited independently before saving a reusable version.
  const second = draft.steps[1]
  await builder.getByTestId(`workflow-task-${second.key}`).click()
  await page.getByLabel("Finish by (T±)", { exact: true }).fill("1")
  draft = await save(page)
  expect(draft.steps[0].anchor?.kind === "target" && draft.steps[0].anchor.days).toBe(0)
  expect(draft.steps[1].anchor?.kind === "target" && draft.steps[1].anchor.days).toBe(-1)
  const template = await publish(page)
  expect(template.versions[0].teamExecution).toBe("dependencies")
  const event = await eventFromTemplate(page, template, "Two-day fictional event")
  const state = await read(page)
  const tasks = state.nodes.filter(node => node.eventId === event.id)
  expect(tasks).toHaveLength(3)
  expect(tasks.filter(node => node.title === "Event day")).toHaveLength(2)
  expect(tasks.every(node => template.versions[0].steps.some(step => step.key === node.stepKey))).toBe(true)
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(3)
  expect(state.events.filter(event => before.events.some(old => old.id === event.id))).toEqual(before.events)
  expect(state.nodes.filter(node => before.nodes.some(old => old.id === node.id))).toEqual(before.nodes)
})

test("mouse and touch can move a node to an empty team without changing its task facts and Undo restores it", async ({ page, isMobile }) => {
  const builder = await empty(page, "Move dots between teams")
  const teams = (await read(page)).org.workflowTeams!
  await builder.getByRole("button", { name: "Quick entry", exact: true }).click()
  await builder.getByLabel("Task names", { exact: true }).fill("Confirm host\nShare briefing")
  await builder.getByRole("combobox", { name: "Assign team", exact: true }).selectOption(teams[0].id)
  const state = await read(page)
  await builder.getByRole("combobox", { name: "Assign role", exact: true }).selectOption(state.roles.find(role => role.holderId === state.viewerId)!.id)
  await builder.getByRole("button", { name: "Add tasks", exact: true }).click()
  await builder.getByRole("button", { name: "Flow", exact: true }).click()
  const original = await save(page)
  const moved = original.steps[1]
  await moveToTeam(page, moved.key, teams[1].id, isMobile)
  await expect.poll(async () => (await current(page)).draft?.teamMap?.stepTeams[moved.key]).toBe(teams[1].id)
  let changed = await save(page)
  expect(changed.steps).toEqual(original.steps)
  await expect(builder.getByTestId(`workflow-task-${moved.key}`)).toHaveAttribute("data-team-id", teams[1].id)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  changed = await save(page)
  expect(changed).toEqual(original)
  // The keyboard-accessible Team control offers the same map-only reassignment.
  await builder.getByRole("button", { name: `Edit ${moved.title}`, exact: true }).click()
  await page.getByRole("combobox", { name: "Team", exact: true }).selectOption(teams[1].id)
  changed = await save(page)
  expect(changed.steps).toEqual(original.steps)
  expect(changed.teamMap?.stepTeams[moved.key]).toBe(teams[1].id)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("the dense preset remains readable in light and dark mode with accessible task buttons and no page overflow", async ({ page }, info) => {
  const builder = await open(page)
  await expect(builder.locator('[data-testid^="workflow-task-"]')).toHaveCount(46)
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.reload()
    await page.getByRole("button", { name: "Workflow", exact: true }).click()
    await closeRail(page)
    await expect(builder.getByTestId("workflow-start")).toBeVisible()
    await page.screenshot({ path: info.outputPath(`workflow-dots-${scheme}-overview.png`), fullPage: false })
    const first = builder.getByRole("button", { name: /^Edit / }).first()
    await first.focus()
    await first.press("Enter")
    await expect(page.getByTestId("workflow-builder-details")).toBeVisible()
    await page.screenshot({ path: info.outputPath(`workflow-dots-${scheme}-details.png`), fullPage: false })
    await closeRail(page)
    expect(await noOverflow(page)).toBeLessThanOrEqual(1)
    const axe = await new AxeBuilder({ page }).include("[data-testid='workflow-template-editor']").withTags(["wcag2a", "wcag2aa"]).analyze()
    expect(axe.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([])
    await builder.locator(".wfb-scroll").screenshot({ path: info.outputPath(`workflow-dots-${scheme}.png`) })
  }
})
