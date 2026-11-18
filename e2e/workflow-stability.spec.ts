import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

async function workflow(page: Page) {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await expect(page.getByTestId("flow-chart")).toBeVisible()
}
async function openStep(page: Page, key: string) {
  await closeRail(page)
  await page.getByTestId(`flow-node-${key}`).click()
  if (test.info().project.name === "mobile") await page.getByTestId("flow-menu").getByRole("button", { name: "Open details" }).click()
  return page.getByTestId("workflow-step-panel")
}
async function savedStep(page: Page, key: string) {
  return page.evaluate(stepKey => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return state.org.eventWorkflow?.steps.find((step: { key: string }) => step.key === stepKey) as { estDays: number; startPolicy?: string; cond?: string; dependsOn?: string[]; placement?: { branchId: string; order: number } } | undefined
  }, key)
}
async function coordinate(page: Page, key: string) {
  return page.getByTestId(`flow-node-${key}`).evaluate((element, mobile) => Number.parseFloat((element.parentElement as HTMLElement).style.getPropertyValue(mobile ? "--y" : "--x")), test.info().project.name === "mobile")
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", route => route.fulfill({ status: 503, json: { message: "Offline workflow test" } }))
})

test("workflow move changes the visible order as well as its saved dependencies", async ({ page }) => {
  await workflow(page)
  expect(await coordinate(page, "promotionItems")).toBeGreaterThan(await coordinate(page, "contentCreation"))
  const node = page.getByTestId("flow-node-promotionItems")
  await node.focus()
  await node.press("Alt+ArrowLeft")
  await expect.poll(async () => await coordinate(page, "promotionItems") < await coordinate(page, "contentCreation")).toBe(true)
  await expect.poll(async () => (await savedStep(page, "contentCreation"))?.dependsOn).toContain("promotionItems")
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  expect(await coordinate(page, "promotionItems")).toBeLessThan(await coordinate(page, "contentCreation"))
})

test("before the first speaker node keeps its branch and scope", async ({ page }) => {
  await workflow(page)
  const anchor = page.getByTestId("flow-node-partner")
  if (test.info().project.name === "mobile") await anchor.click(); else await anchor.click({ button: "right" })
  await page.getByTestId("flow-menu").getByRole("button", { name: "Add a step before this one", exact: true }).click()
  await expect.poll(async () => (await savedStep(page, "new-step"))?.placement?.branchId).toBe("speaker")
  expect((await savedStep(page, "new-step"))?.cond).toBe("externalGuest")
  await closeRail(page)
  expect(await coordinate(page, "new-step")).toBeLessThan(await coordinate(page, "partner"))
})

test("workflow workdays reject empty and out of range drafts then persist an intentional edit", async ({ page }) => {
  await workflow(page)
  const panel = await openStep(page, "budget")
  const input = panel.getByLabel("Days of work")
  const initial = await input.inputValue()
  const previouslySaved = await savedStep(page, "budget")
  await input.fill("")
  await input.blur()
  await expect(panel.getByRole("alert")).toContainText("whole number")
  await page.waitForTimeout(650)
  expect((await savedStep(page, "budget"))?.estDays).toBe(previouslySaved?.estDays)
  await input.fill("100")
  await expect(panel.getByRole("alert")).toBeVisible()
  expect(await input.inputValue()).toBe("100")
  expect(Number(initial)).toBeGreaterThan(0)
  await input.fill("10")
  await expect.poll(async () => (await savedStep(page, "budget"))?.estDays).toBe(10)
  expect((await savedStep(page, "budget"))?.startPolicy).toBe("effort")
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await openStep(page, "budget")
  await expect(page.getByLabel("Days of work")).toHaveValue("10")
})

test("Full Check stays protected in its existing details panel", async ({ page }) => {
  await workflow(page)
  const panel = await openStep(page, "finalcheck")
  await expect(panel.getByRole("button", { name: "Delete this step", exact: true })).toBeDisabled()
  await closeRail(page)
  await expect(page.getByTestId("flow-node-plan")).toBeVisible()
})

test("a new conditional branch and its first task undo together", async ({ page }) => {
  await workflow(page)
  await page.getByRole("button", { name: "Add branch", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: "Add branch", exact: true })
  await dialog.getByLabel("Branch name").fill("Guest support")
  await dialog.getByLabel("Applies to").selectOption("externalGuest")
  await dialog.getByLabel("Default role").selectOption("r-events")
  await dialog.getByLabel("First task").fill("Confirm guest arrival")
  await dialog.getByRole("button", { name: "Add branch", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(async () => (await savedStep(page, "new-step"))?.placement?.branchId).toBeTruthy()
  const branchId = (await savedStep(page, "new-step"))!.placement!.branchId
  expect(await page.evaluate(id => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return state.org.eventWorkflow.branches.find((branch: { id: string }) => branch.id === id)?.condition
  }, branchId)).toBe("externalGuest")
  await closeRail(page)
  await page.getByTestId("flow-undo").click()
  await expect(page.getByTestId("flow-node-new-step")).toHaveCount(0)
  await expect.poll(() => page.evaluate(id => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return state.org.eventWorkflow?.branches?.some((branch: { id: string }) => branch.id === id) ?? false
  }, branchId)).toBe(false)
})
