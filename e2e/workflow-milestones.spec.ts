import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { DemoState, StepTemplate, WorkflowMilestoneGraph, WorkflowTemplate } from "../src/data/types"
import { getWorkflowTemplates } from "../src/data/workflowTemplates"
import { noOverflow } from "./helpers"

const ID = "milestone-browser-fixture"
const read = (page: Page): Promise<DemoState> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
let errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline milestone workflow acceptance" } }))
})
test.afterEach(() => expect(errors).toEqual([]))
async function closeRail(page: Page) {
  await page.getByRole("button", { name: "Hide side panel", exact: true }).evaluateAll(buttons => buttons.forEach(button => (button as HTMLButtonElement).click()))
}
async function open(page: Page, id?: string) {
  await page.goto("/#/settings")
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  if (id) await page.getByRole("combobox", { name: "Saved workflow", exact: true }).selectOption(id)
  return page.getByTestId("workflow-builder")
}
async function current(page: Page) {
  const id = await page.getByRole("combobox", { name: "Saved workflow", exact: true }).inputValue()
  return getWorkflowTemplates(await read(page)).find(template => template.id === id)!
}
async function save(page: Page) {
  await closeRail(page)
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  return (await current(page)).draft!
}
async function publish(page: Page, count = 1) {
  await save(page)
  await page.getByRole("button", { name: "Save version", exact: true }).click()
  await expect.poll(async () => (await current(page)).versions.length).toBe(count)
  return await current(page)
}

/** A saved fictional draft supplies all three intervals, without bypassing any edit or publish operation under test. */
async function fixture(page: Page, includeEmpty = false) {
  await page.goto("/#/settings")
  const state = await read(page), team = state.org.workflowPresetTeamIds!.operations!, otherTeam = state.org.workflowPresetTeamIds!.marketing!
  const role = state.roles.find(role => role.holderId === state.viewerId)!
  const steps: StepTemplate[] = ["prepare", "shared", "between", "after"].map((key, index) => ({ key, title: ["Prepare venue", "Shared full check", "Between-day update", "Archive results"][index], fn: role.fn, ownerRoleId: role.id, phase: key === "after" ? "close" : "prepare", estDays: 1, tier: "light", dependsOn: [], why: `Fictional ${key} instructions.`, source: "Fictional browser fixture", custom: true, anchor: { kind: "target", days: 3, unit: "calendar", label: "Authored target" } }))
  const graph: WorkflowMilestoneGraph = {
    version: 1, start: { title: "Start", details: "Start together." }, done: { title: "Done", details: "Keep the records." },
    eventDays: [{ id: "__event__", title: "Day 1", offsetDays: 0, details: "Opening program." }, { id: "__event2__", title: "Day 2", offsetDays: 1, details: "Closing program." }],
    spine: ["__start__", "shared", "__event__", "__event2__", "__end__"],
    teamBranches: [{ id: "before-day", teamId: team, fromId: "__start__", toId: "shared", stepIds: ["prepare"] }, { id: "between-days", teamId: team, fromId: "__event__", toId: "__event2__", stepIds: ["between"] }, { id: "after-days", teamId: team, fromId: "__event2__", toId: "__end__", stepIds: ["after"] }, ...(includeEmpty ? [{ id: "empty-parallel", teamId: otherTeam, fromId: "__start__", toId: "shared", stepIds: [] }] : [])],
    taskAnchors: { prepare: { eventDayId: "__event__", offsetDays: -3 }, shared: { eventDayId: "__event__", offsetDays: -1 }, between: { eventDayId: "__event2__", offsetDays: -1 }, after: { eventDayId: "__event2__", offsetDays: 2 } },
  }
  const template: WorkflowTemplate = { id: ID, updatedOn: state.today, versions: [], draft: { name: "Two-day fixture", kind: "custom", teamExecution: "dependencies", steps, milestoneGraph: graph, teamMap: { version: 1, workflowId: ID, stepTeams: Object.fromEntries(steps.map(step => [step.key, team])) }, baseVersion: 0 } }
  await page.evaluate(({ state, template }) => {
    state.org.workflowTemplates = [...(state.org.workflowTemplates ?? []).filter(item => item.id !== template.id), template]
    localStorage.setItem("platypus.v1.demo", JSON.stringify(state))
  }, { state, template })
  await page.reload()
  const builder = await open(page, ID)
  await expect(builder.getByTestId("workflow-event-day-2")).toBeVisible()
  return { builder, before: state, team, otherTeam }
}

async function createEvent(page: Page, template: WorkflowTemplate, name: string, version = 1) {
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form").last()
  await form.getByLabel("Event name", { exact: true }).fill(name)
  await form.getByLabel("Date", { exact: true }).fill("2027-04-16")
  await form.getByRole("combobox", { name: "Workflow template", exact: true }).selectOption({ label: `${template.versions.find(item => item.version === version)!.name} · v${version}` })
  await form.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByTestId("change-item").last().getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await read(page)).events.some(event => event.name === name)).toBe(true)
  await closeRail(page)
  return (await read(page)).events.find(event => event.name === name)!
}

async function dragToBranch(page: Page, sourceKey: string, targetBranch: string, touch: boolean) {
  await closeRail(page)
  const source = page.getByTestId(`workflow-task-${sourceKey}`), target = page.getByTestId(`workflow-segment-${targetBranch}`)
  await source.scrollIntoViewIfNeeded()
  const [a, b] = await Promise.all([source.boundingBox(), target.boundingBox()])
  if (!a || !b) throw new Error("The task and destination branch must be rendered")
  const x = a.x + a.width / 2, y = a.y + 16
  const tx = Math.min(b.x + b.width - 28, Math.max(x, b.x + 40)), ty = b.y + b.height * 0.6
  if (touch) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (tx - x) * i / 10, y: y + (ty - y) * i / 10 }] })
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await cdp.detach()
  } else {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(tx, ty, { steps: 12 }); await page.mouse.up()
  }
}

test("only one-day and two-day workflows exist and every boundary, date and shared task edits in Details", async ({ page }) => {
  const builder = await open(page)
  await page.getByRole("button", { name: "New workflow", exact: true }).click()
  await page.getByLabel("Workflow name", { exact: true }).fill("Editable milestone stations")
  const length = builder.getByRole("combobox", { name: "Workflow length", exact: true })
  expect(await length.locator("option").allTextContents()).toEqual(["1-day event", "2-day event"])
  await length.selectOption({ label: "2-day event" })
  for (const [id, name] of [["workflow-start", "Preparation starts"], ["workflow-done", "Records complete"]]) {
    await builder.getByTestId(id).click()
    await page.getByLabel("Station name", { exact: true }).fill(name)
    await page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true }).fill(`${name} description`)
    await closeRail(page)
  }
  for (const [index, name] of [[1, "Opening day"], [2, "Closing day"]] as const) {
    await builder.getByTestId(`workflow-event-day-${index}`).click()
    await page.getByLabel("Event day name", { exact: true }).fill(name)
    await page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true }).fill(`${name} program`)
    if (index === 2) await page.getByLabel("Days after Day 1", { exact: true }).fill("3")
    await closeRail(page)
  }
  await builder.getByRole("button", { name: "Full check", exact: true }).click()
  await page.getByLabel("Task name", { exact: true }).fill("Shared readiness review")
  await page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true }).fill("Review the same materials together.")
  const saved = await save(page), id = (await current(page)).id
  expect(saved.milestoneGraph!.eventDays.map(day => [day.title, day.offsetDays, day.details])).toEqual([["Opening day", 0, "Opening day program"], ["Closing day", 3, "Closing day program"]])
  expect(saved.milestoneGraph!.start).toEqual({ title: "Preparation starts", details: "Preparation starts description" })
  expect(saved.milestoneGraph!.done).toEqual({ title: "Records complete", details: "Records complete description" })
  const shared = saved.steps.find(step => step.title === "Shared readiness review")!
  expect(saved.milestoneGraph!.spine).toContain(shared.key)
  await page.reload(); await open(page, id)
  await expect(builder.getByRole("button", { name: "Edit Closing day", exact: true })).toBeVisible()
  await builder.getByRole("button", { name: "Edit Shared readiness review", exact: true }).click()
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("Shared readiness review")
  await expect(page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true })).toHaveValue("Review the same materials together.")
})

test("branches choose existing teams and keep independent before, between-day and after-day junctions", async ({ page }) => {
  const { builder, before, otherTeam } = await fixture(page)
  await builder.getByRole("button", { name: "Add branch", exact: true }).click()
  await page.getByRole("combobox", { name: "Team", exact: true }).selectOption(otherTeam)
  await page.getByRole("combobox", { name: "Starts at", exact: true }).selectOption("__event__")
  await page.getByRole("combobox", { name: "Joins at", exact: true }).selectOption("__event2__")
  await page.getByRole("button", { name: "Add branch", exact: true }).last().click()
  let saved = await save(page)
  const branch = saved.milestoneGraph!.teamBranches.find(item => !["before-day", "between-days", "after-days"].includes(item.id))!
  expect(branch).toMatchObject({ teamId: otherTeam, fromId: "__event__", toId: "__event2__", stepIds: [] })
  expect((await read(page)).org.workflowTeams).toEqual(before.org.workflowTeams)
  const finance = before.org.workflowPresetTeamIds!.finance!
  await builder.getByRole("combobox", { name: `Team for ${branch.id}`, exact: true }).selectOption(finance)
  saved = await save(page)
  expect(saved.milestoneGraph!.teamBranches.find(item => item.id === branch.id)?.teamId).toBe(finance)
  expect(saved.milestoneGraph!.teamBranches.slice(0, 3).map(item => [item.fromId, item.toId])).toEqual([["__start__", "shared"], ["__event__", "__event2__"], ["__event2__", "__end__"]])
  expect((await read(page)).org.workflowTeams).toEqual(before.org.workflowTeams)
  expect((await read(page)).roles).toEqual(before.roles)
  await builder.getByTestId("workflow-task-prepare").click()
  await page.getByTestId("workflow-builder-details").getByRole("combobox", { name: "Team", exact: true }).selectOption(finance)
  saved = await save(page)
  expect(saved.milestoneGraph!.teamBranches.find(item => item.id === "before-day")?.teamId).toBe(finance)
  expect(saved.teamMap!.stepTeams.prepare).toBe(finance)
})

test("every real node keeps its identity through Details, cross-branch mouse or touch movement, Undo and reload", async ({ page, isMobile }) => {
  const { builder } = await fixture(page, true)
  for (const key of ["prepare", "shared", "between", "after"]) {
    await builder.getByTestId(`workflow-task-${key}`).click()
    await page.getByLabel("Task name", { exact: true }).fill(`Edited ${key}`)
    await page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true }).fill(`Saved ${key} instructions`)
    await closeRail(page)
  }
  const original = await save(page)
  await dragToBranch(page, "prepare", "empty-parallel", isMobile)
  await expect.poll(async () => (await current(page)).draft?.milestoneGraph?.teamBranches.find(branch => branch.id === "empty-parallel")?.stepIds).toEqual(["prepare"])
  const changed = await save(page)
  expect(changed.steps.map(step => ({ key: step.key, title: step.title, why: step.why, ownerRoleId: step.ownerRoleId, estDays: step.estDays }))).toEqual(original.steps.map(step => ({ key: step.key, title: step.title, why: step.why, ownerRoleId: step.ownerRoleId, estDays: step.estDays })))
  expect(changed.milestoneGraph!.taskAnchors).toEqual(original.milestoneGraph!.taskAnchors)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  expect((await save(page)).milestoneGraph).toEqual(original.milestoneGraph)
  await page.reload(); await open(page, ID)
  for (const key of ["prepare", "shared", "between", "after"]) {
    await builder.getByTestId(`workflow-task-${key}`).click()
    await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(`Edited ${key}`)
    await expect(page.getByTestId("workflow-builder-details").getByRole("textbox", { name: "Details", exact: true })).toHaveValue(`Saved ${key} instructions`)
    await closeRail(page)
  }
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("cleared branch teams remain unassigned through new tasks and role-team application stays consistent", async ({ page }) => {
  const { builder, before } = await fixture(page)
  await builder.getByRole("button", { name: "Edit branch before-day", exact: true }).click()
  await page.getByTestId("workflow-builder-details").getByRole("combobox", { name: "Team", exact: true }).selectOption("")
  let saved = await save(page)
  expect(saved.milestoneGraph!.teamBranches.find(branch => branch.id === "before-day")?.teamId).toBe("")
  expect(Object.hasOwn(saved.teamMap!.stepTeams, "prepare")).toBe(false)
  await builder.getByRole("button", { name: "Add task to branch before-day", exact: true }).click()
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue("New task")
  await expect(page.getByTestId("workflow-builder-details").getByRole("combobox", { name: "Team", exact: true })).toHaveValue("")
  saved = await save(page)
  const branch = saved.milestoneGraph!.teamBranches.find(branch => branch.id === "before-day")!
  expect(branch.stepIds).toHaveLength(2)
  expect(branch.stepIds.every(key => !Object.hasOwn(saved.teamMap!.stepTeams, key))).toBe(true)
  await page.getByRole("button", { name: "Apply role teams", exact: true }).click()
  saved = await save(page)
  for (const branch of saved.milestoneGraph!.teamBranches) for (const key of branch.stepIds) {
    if (branch.teamId) expect(saved.teamMap!.stepTeams[key]).toBe(branch.teamId)
    else expect(Object.hasOwn(saved.teamMap!.stepTeams, key)).toBe(false)
  }
  expect((await read(page)).org.workflowTeams).toEqual(before.org.workflowTeams)
  await page.reload(); await open(page, ID)
  expect((await save(page)).milestoneGraph).toEqual(saved.milestoneGraph)
})

test("saved two-day workflows open actual Plan tasks while day stations remain fixed, read-only dates", async ({ page }) => {
  const { before } = await fixture(page)
  const template = await publish(page)
  const event = await createEvent(page, template, "Milestone execution")
  let state = await read(page)
  const tasks = state.nodes.filter(node => node.eventId === event.id)
  expect(tasks).toHaveLength(4)
  expect(Object.fromEntries(tasks.map(node => [node.stepKey, node.clubDeadline]))).toEqual({ prepare: "2027-04-13", shared: "2027-04-15", between: "2027-04-16", after: "2027-04-19" })
  expect(tasks.some(node => ["__start__", "__end__", "__event__", "__event2__"].includes(node.stepKey ?? ""))).toBe(false)
  await expect(page.getByTestId("milestone-execution-chart")).toBeVisible()
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(4)
  await expect(page.getByTestId("flow-event-day-2")).toContainText("Apr 17")
  await page.getByTestId("flow-event-day-2").click()
  const station = page.getByTestId("execution-milestone-details")
  await expect(station).toContainText("fixed date")
  await expect(station).toContainText("not a task")
  await expect(station.getByRole("combobox", { name: "Task status", exact: true })).toHaveCount(0)
  await closeRail(page)
  const shared = tasks.find(node => node.stepKey === "shared")!
  await page.getByTestId("flow-node-shared").click()
  const detail = page.getByTestId("task-detail")
  await expect(detail.getByRole("heading", { name: "Shared full check", exact: true })).toBeVisible()
  await detail.getByRole("combobox", { name: "Task status", exact: true }).selectOption("in_progress")
  await closeRail(page)
  state = await read(page)
  expect(state.nodes.find(node => node.id === shared.id)?.status).toBe("in_progress")
  await expect(page.getByTestId("flow-event-day-2")).toContainText("Apr 17")
  await page.reload(); await closeRail(page)
  await page.getByTestId("flow-chart").scrollIntoViewIfNeeded()
  await expect(page.getByTestId("flow-node-shared")).toBeInViewport()
  await expect(page.getByTestId("flow-event-day-2")).toContainText("Apr 17")
  const reminders = before.reminderRuntime?.deliveries ?? []
  expect((state.reminderRuntime?.deliveries ?? []).filter(delivery => reminders.some(old => old.id === delivery.id))).toEqual(reminders)
  expect(state.nodes.filter(node => before.nodes.some(old => old.id === node.id))).toEqual(before.nodes)
  expect(state.events.filter(item => before.events.some(old => old.id === item.id))).toEqual(before.events)
})

test("one/two-day authoring and actual execution remain accessible in both themes and on narrow screens", async ({ page }, info) => {
  const { builder } = await fixture(page)
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme })
    await builder.getByTestId("workflow-event-day-1").focus()
    await builder.getByTestId("workflow-event-day-1").press("Enter")
    await expect(page.getByLabel("Event day name", { exact: true })).toBeVisible()
    await closeRail(page)
    expect(await noOverflow(page)).toBeLessThanOrEqual(1)
    const axe = await new AxeBuilder({ page }).include("[data-testid='workflow-template-editor']").withTags(["wcag2a", "wcag2aa"]).analyze()
    expect(axe.violations.filter(issue => ["serious", "critical"].includes(issue.impact ?? ""))).toEqual([])
    await page.screenshot({ path: info.outputPath(`milestone-editor-${colorScheme}.png`), fullPage: false })
    await builder.locator(".wfb-scroll").screenshot({ path: info.outputPath(`milestone-editor-${colorScheme}-canvas.png`) })
  }
  const template = await publish(page)
  await createEvent(page, template, "Readable two-day execution")
  const tones = await page.getByTestId("milestone-execution-branch").evaluateAll(branches => branches.map(branch => [...branch.classList].find(name => name.startsWith("wfm-tone-"))))
  expect(new Set(tones).size).toBe(1)
  const axe = await new AxeBuilder({ page }).include("[data-testid='milestone-execution-chart']").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(axe.violations.filter(issue => ["serious", "critical"].includes(issue.impact ?? ""))).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  await page.getByTestId("flow-chart").scrollIntoViewIfNeeded()
  await page.getByTestId("flow-chart").screenshot({ path: info.outputPath("milestone-plan-dark-canvas.png") })
  await page.screenshot({ path: info.outputPath("milestone-plan-dark.png"), fullPage: false })
})
