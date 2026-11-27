import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"
import { openMenu, menuTrigger, readWorkflowState, savedWorkflow } from "./workflowLegacyHelpers"
import { dropSlots, moveToSlot, startDrag, type DropSlot } from "./workflowDrag"
import { getWorkflowTemplates } from "../src/data/workflowTemplates"

// Settings → Workflow: diamonds show every legal drop, the main line is adjustable, and the preset can be restored.
let errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline workflow main-line acceptance" } }))
})
test.afterEach(() => expect(errors).toEqual([]))

async function open(page: Page) {
  await page.goto("/#/settings")
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const builder = page.getByTestId("workflow-builder")
  await expect(builder.getByTestId("workflow-start")).toBeVisible()
  return builder
}
const preset = async (page: Page) => getWorkflowTemplates(await readWorkflowState(page)).find(item => item.id === "standard-event")!
const centre = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)
const nearest = (slots: DropSlot[], point: { x: number; y: number }) => [...slots].sort((a, b) => distance(a, point) - distance(b, point))[0]
/** The lane task closest to the main line, so the drag stays short on a phone. */
const innerLaneTask = (page: Page) => page.getByTestId("workflow-builder").evaluate(builder => {
  const track = builder.querySelector('[data-testid="workflow-main-track"]')!.getBoundingClientRect(), mainY = track.top + track.height / 2
  const tasks = [...builder.querySelectorAll<HTMLElement>(".wfx-task[data-branch-id]")]
  const dotY = (task: HTMLElement) => { const box = task.querySelector("i")!.getBoundingClientRect(); return box.top + box.height / 2 }
  const best = tasks.sort((a, b) => Math.abs(dotY(a) - mainY) - Math.abs(dotY(b) - mainY))[0]
  return { key: best.dataset.testid!.replace("workflow-task-", ""), branchId: best.dataset.branchId! }
})
const dotCentreY = async (page: Page, testId: string) => centre((await page.getByTestId(testId).locator("i").boundingBox())!).y
const mainTrackY = async (page: Page) => centre((await page.getByTestId("workflow-main-track").boundingBox())!).y

test("a dragged lane task shows diamonds, lands on the main line and Undo returns it", async ({ page, isMobile }) => {
  const builder = await open(page)
  const task = await innerLaneTask(page)
  const { input, source } = await startDrag(page, `workflow-task-${task.key}`, isMobile)
  const slots = await dropSlots(page)
  expect(slots.length).toBeGreaterThan(0)
  expect(slots.some(slot => slot.branchId === "__main__")).toBe(true)
  expect(slots.some(slot => slot.branchId !== "__main__")).toBe(true)
  await expect(builder.getByTestId("workflow-drop-slot").first()).toHaveAttribute("aria-hidden", "true")
  await moveToSlot(page, input, nearest(slots.filter(slot => slot.branchId === "__main__"), source))
  await input.up()
  await expect(builder.getByTestId("workflow-drop-slot")).toHaveCount(0)
  const moved = builder.getByTestId(`workflow-task-${task.key}`)
  await expect(moved).toHaveAttribute("data-station-id", task.key)
  expect(Math.abs(await dotCentreY(page, `workflow-task-${task.key}`) - await mainTrackY(page))).toBeLessThan(3)
  await expect.poll(async () => (await savedWorkflow(page) as { milestoneGraph?: { spine: string[] } }).milestoneGraph?.spine).toContain(task.key)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  await expect(moved).toHaveAttribute("data-branch-id", task.branchId)
  await expect.poll(async () => (await savedWorkflow(page) as { milestoneGraph?: { spine: string[] } }).milestoneGraph?.spine).not.toContain(task.key)
})

test("Check-in on the main line drags into a team branch through its diamond and Undo restores it", async ({ page, isMobile }) => {
  const builder = await open(page)
  const checkin = builder.getByTestId("workflow-task-checkin")
  await expect(checkin).toHaveAttribute("data-station-id", "checkin")
  const { input, source } = await startDrag(page, "workflow-task-checkin", isMobile)
  await expect(checkin).toHaveClass(/is-dragging/)
  const slot = nearest((await dropSlots(page)).filter(item => item.branchId !== "__main__"), source)
  await moveToSlot(page, input, slot)
  await expect(builder.getByTestId(`workflow-segment-${slot.branchId}`)).toHaveClass(/is-drop-target/)
  await input.up()
  await expect(checkin).toHaveAttribute("data-branch-id", slot.branchId)
  await expect(builder.getByRole("alert")).toHaveCount(0)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  await expect(checkin).toHaveAttribute("data-station-id", "checkin")
  expect(Math.abs(await dotCentreY(page, "workflow-task-checkin") - await mainTrackY(page))).toBeLessThan(3)
})

test("the preset can lose Check-in, save a version, restore the original preset and discard back to the saved version", async ({ page }) => {
  const builder = await open(page)
  const settings = page.getByTestId("workflow-settings")
  await builder.getByTestId("workflow-task-checkin").click()
  const details = page.getByTestId("workflow-builder-details")
  await expect(details).toContainText("Restore Platypus preset brings it back.")
  await details.getByRole("button", { name: "Delete task", exact: true }).click()
  await expect(builder.getByTestId("workflow-task-checkin")).toHaveCount(0)
  await closeRail(page)
  await settings.getByRole("button", { name: "Save version", exact: true }).click()
  await expect(settings.getByRole("status").filter({ hasText: "Version 2 saved" })).toBeVisible()
  expect((await preset(page)).versions.at(-1)!.steps.some(step => step.key === "checkin")).toBe(false)

  // Escape cancels the confirmation and focus returns to Versions.
  await openMenu(page, "Versions", "Restore Platypus preset")
  const restore = page.getByRole("dialog", { name: "Restore preset" })
  await expect(restore).toContainText("Restore the original Platypus preset? This replaces the current draft. Saved versions and activities are not changed. Save version to keep it.")
  await expect(restore.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
  const axe = await new AxeBuilder({ page }).include("[role='dialog']").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(axe.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([])
  await page.keyboard.press("Escape")
  await expect(restore).toHaveCount(0)
  await expect(menuTrigger(page, "Versions")).toBeFocused()
  await openMenu(page, "Versions", "Restore Platypus preset")
  await restore.getByRole("button", { name: "Restore preset", exact: true }).click()
  await expect(settings.getByRole("status").filter({ hasText: "Original preset restored" })).toBeVisible()
  await expect(builder.getByTestId("workflow-task-checkin")).toHaveAttribute("data-station-id", "checkin")
  await expect(builder.getByRole("button", { name: "Undo edit", exact: true })).toBeDisabled()
  await expect.poll(async () => (await preset(page)).draft?.steps.some(step => step.key === "checkin")).toBe(true)
  expect((await preset(page)).versions).toHaveLength(2)

  await openMenu(page, "Versions", "Discard draft")
  const discard = page.getByRole("dialog", { name: "Discard draft" })
  await expect(discard).toContainText("Discard this draft? The editor goes back to Version 2. Saved versions and activities are not changed.")
  await discard.getByRole("button", { name: "Discard draft", exact: true }).click()
  await expect(settings.getByRole("status").filter({ hasText: "Draft discarded" })).toBeVisible()
  await expect(builder.getByTestId("workflow-task-checkin")).toHaveCount(0)
  // Autosave must not write a draft back.
  await page.waitForTimeout(900)
  expect((await preset(page)).draft).toBeUndefined()
  await expect(settings.getByRole("list", { name: "Template status" })).not.toContainText("Draft")
  await menuTrigger(page, "Versions").click()
  await expect(settings.getByRole("menuitem", { name: "Discard draft", exact: true })).toBeDisabled()
  await page.keyboard.press("Escape")
})

test("dropping away from every diamond changes nothing and says so", async ({ page, isMobile }) => {
  const builder = await open(page)
  const task = await innerLaneTask(page)
  await expect.poll(async () => !!(await preset(page)).draft).toBe(true)
  const before = (await preset(page)).draft!.milestoneGraph
  const { input } = await startDrag(page, `workflow-task-${task.key}`, isMobile)
  const slots = await dropSlots(page)
  const frame = (await page.getByRole("region", { name: "Workflow main line and team branches", exact: true }).boundingBox())!
  // A point well inside the canvas and far from every diamond.
  let away: { x: number; y: number } | null = null
  for (let x = frame.x + 60; x < frame.x + frame.width - 60 && !away; x += 12) for (let y = frame.y + 80; y < frame.y + frame.height - 60; y += 12) {
    if (slots.every(slot => distance(slot, { x, y }) > 90)) { away = { x, y }; break }
  }
  expect(away).not.toBeNull()
  await input.move(away!.x, away!.y)
  await expect(builder.locator(".wfx-slot.is-near")).toHaveCount(0)
  await input.up()
  await expect(builder.getByTestId("workflow-drop-note")).toHaveText("Dropped away from a diamond, so nothing changed. Drop a step on a diamond.")
  await expect(builder.getByTestId(`workflow-task-${task.key}`)).toHaveAttribute("data-branch-id", task.branchId)
  await expect(builder.getByRole("button", { name: "Undo edit", exact: true })).toBeDisabled()
  expect((await preset(page)).draft!.milestoneGraph).toEqual(before)
})
