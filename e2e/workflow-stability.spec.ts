import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"
import { insertedKey, openWorkflow, openWorkflowStep, savedWorkflow, savedWorkflowStep } from "./workflowLegacyHelpers"

async function eventCoordinate(page: Page, key: string) {
  return page.getByTestId(`flow-node-${key}`).evaluate((element, mobile) => Number.parseFloat((element.parentElement as HTMLElement).style.getPropertyValue(mobile ? "--y" : "--x")), test.info().project.name === "mobile")
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", route => route.fulfill({ status: 503, json: { message: "Offline workflow test" } }))
})

// The new Settings timeline places tasks by dates. Reordering dependencies by keyboard
// remains a real-event metro operation, where that gesture still exists.
test("event workflow keyboard move changes visible order and saved dependencies", async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  await closeRail(page)
  await page.getByTestId("flow-edit-toggle").click()
  expect(await eventCoordinate(page, "promotionItems")).toBeGreaterThan(await eventCoordinate(page, "contentCreation"))
  const node = page.getByTestId("flow-node-promotionItems")
  await node.focus(); await node.press("Alt+ArrowLeft")
  await expect.poll(async () => await eventCoordinate(page, "promotionItems") < await eventCoordinate(page, "contentCreation")).toBe(true)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).nodes.find((node: { id: string }) => node.id === "e-speaker:contentCreation").dependsOn)).toContain("e-speaker:promotionItems")
  await page.reload()
  expect(await eventCoordinate(page, "promotionItems")).toBeLessThan(await eventCoordinate(page, "contentCreation"))
})

test("before the first speaker node keeps its branch and scope", async ({ page }) => {
  await openWorkflow(page)
  const keys = (await savedWorkflow(page)).steps.map(step => step.key)
  const panel = await openWorkflowStep(page, "partner")
  await panel.getByRole("button", { name: "Add before", exact: true }).click()
  const key = await insertedKey(page, keys)
  expect((await savedWorkflowStep(page, key))?.placement?.branchId).toBe("speaker")
  expect((await savedWorkflowStep(page, key))?.cond).toBe("externalGuest")
  expect((await savedWorkflowStep(page, "partner"))?.dependsOn).toContain(key)
})

test("workflow workdays reject empty and out of range drafts then persist an intentional edit", async ({ page }) => {
  await openWorkflow(page)
  const panel = await openWorkflowStep(page, "budget")
  const input = panel.getByLabel("Days of work")
  const initial = await input.inputValue()
  const previouslySaved = await savedWorkflowStep(page, "budget")
  await input.fill(""); await input.blur()
  await expect(panel.getByRole("alert")).toContainText("whole number")
  await page.waitForTimeout(650)
  expect((await savedWorkflowStep(page, "budget"))?.estDays).toBe(previouslySaved?.estDays)
  await input.fill("100")
  await expect(panel.getByRole("alert")).toBeVisible()
  expect(await input.inputValue()).toBe("100")
  expect(Number(initial)).toBeGreaterThan(0)
  await input.fill("10")
  await expect.poll(async () => (await savedWorkflowStep(page, "budget"))?.estDays).toBe(10)
  expect((await savedWorkflowStep(page, "budget"))?.startPolicy).toBe("effort")
  await page.reload(); await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const restoredPanel = await openWorkflowStep(page, "budget")
  await expect(restoredPanel.getByLabel("Days of work", { exact: true })).toHaveValue("10")
})

test("Full Check remains protected in the new details panel", async ({ page }) => {
  await openWorkflow(page)
  const panel = await openWorkflowStep(page, "finalcheck")
  await expect(panel.getByRole("button", { name: "Delete task", exact: true })).toBeDisabled()
  await closeRail(page)
  await expect(page.getByTestId("workflow-task-plan")).toBeVisible()
})

// Settings → Workflow now authors team branches in Details; the conditional business-branch dialog
// (WorkflowBranchDialog) is reached from an actual event's Edit flow, so its behaviour is checked there.
type PlanNode = { id: string; eventId: string; stepKey?: string; placement?: { branchId: string } }
type PlanBranch = { id: string; conditions?: string[] }
const planState = (page: Page): Promise<{ nodes: PlanNode[]; events: { id: string; workflowBranches?: PlanBranch[] }[] }> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
const planBranch = async (page: Page, branchId: string) => (await planState(page)).events.find(event => event.id === "e-speaker")?.workflowBranches?.find(branch => branch.id === branchId)
async function openBranchDialog(page: Page) {
  await page.goto("/#/events?event=e-speaker")
  await closeRail(page)
  await page.getByTestId("flow-edit-toggle").click()
  await page.getByTestId("flow-add-branch").click()
  return page.getByRole("dialog", { name: "Add branch", exact: true })
}
async function addedNode(page: Page, before: string[]) {
  await expect.poll(async () => (await planState(page)).nodes.filter(node => !before.includes(node.id)).length).toBe(1)
  return (await planState(page)).nodes.find(node => !before.includes(node.id))!
}

test("a new conditional branch and its first task undo together", async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  const keys = (await planState(page)).nodes.map(node => node.id)
  const dialog = await openBranchDialog(page)
  await dialog.getByLabel("Branch name").fill("Guest support")
  await dialog.getByRole("checkbox", { name: "External speaker, artist, or performer", exact: true }).check()
  await dialog.getByRole("checkbox", { name: "Travel or off-site participant trip", exact: true }).check()
  await expect(dialog).toContainText("All 2 selected items must be checked.")
  await dialog.getByLabel("Default role").selectOption("r-events")
  await dialog.getByLabel("First task").fill("Confirm guest arrival")
  await dialog.getByRole("button", { name: "Add branch", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const added = await addedNode(page, keys)
  const branchId = added.placement!.branchId
  expect((await planBranch(page, branchId))?.conditions).toEqual(["speaker", "travel"])
  await closeRail(page)
  await page.getByTestId("flow-undo").click()
  await expect.poll(async () => (await planState(page)).nodes.some(node => node.id === added.id)).toBe(false)
  expect(await planBranch(page, branchId)).toBeUndefined()
})

test("multiple branch requirements survive reload and apply to inserted steps in that branch", async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  const keys = (await planState(page)).nodes.map(node => node.id)
  const dialog = await openBranchDialog(page)
  await dialog.getByLabel("Branch name").fill("Speaker travel")
  await expect(dialog).toContainText("Leave all unchecked for every event.")
  await dialog.getByRole("checkbox", { name: "External speaker, artist, or performer", exact: true }).check()
  await dialog.getByRole("checkbox", { name: "Travel or off-site participant trip", exact: true }).check()
  await dialog.getByLabel("Default role").selectOption("r-events")
  await dialog.getByLabel("First task").fill("Confirm guest arrival")
  await dialog.getByRole("button", { name: "Add branch", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const added = await addedNode(page, keys)
  const branchId = added.placement!.branchId
  await page.reload()
  expect((await planBranch(page, branchId))?.conditions).toEqual(["speaker", "travel"])
  const before = (await planState(page)).nodes.map(node => node.id)
  await closeRail(page)
  await page.getByTestId("flow-edit-toggle").click()
  // Shift+F10 opens the step's actions on both screen sizes (double-click or tap are pointer-specific).
  await page.getByTestId(`flow-node-${added.stepKey ?? added.id}`).focus()
  await page.keyboard.press("Shift+F10")
  await page.getByTestId("flow-menu").getByRole("button", { name: "Add a step before this one", exact: true }).click()
  const inserted = await addedNode(page, before)
  expect(inserted.placement?.branchId).toBe(branchId)
  expect((await planBranch(page, branchId))?.conditions).toEqual(["speaker", "travel"])
})

test("branch requirements explain the rule and support keyboard selection on both screen sizes", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "dark" })
  const dialog = await openBranchDialog(page)
  const name = dialog.getByLabel("Branch name")
  await expect(name).toBeFocused()
  await name.press("Shift+Tab")
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
  await page.keyboard.press("Tab"); await expect(name).toBeFocused()
  await expect(dialog.getByRole("group", { name: "Include this branch when", exact: true })).toBeVisible()
  await expect(dialog.getByRole("checkbox")).toHaveCount(18)
  const speaker = dialog.getByRole("checkbox", { name: "External speaker, artist, or performer", exact: true })
  await speaker.focus(); await speaker.press("Space"); await expect(speaker).toBeChecked()
  await expect(dialog.getByRole("status")).toHaveText("1 selected item must be checked.")
  const rsvp = dialog.getByRole("checkbox", { name: "RSVP registration needed", exact: true })
  await rsvp.focus(); await rsvp.press("Space"); await expect(rsvp).toBeChecked()
  await expect(dialog.getByRole("status")).toHaveText("All 2 selected items must be checked.")
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  const a11y = await new AxeBuilder({ page }).include(".workflow-branch-dialog").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(a11y.violations).toEqual([])
  await page.screenshot({ path: info.outputPath("branch-conditions.png") })
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0)
})
