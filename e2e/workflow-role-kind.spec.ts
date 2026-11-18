import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

async function workflow(page: Page) {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await expect(page.getByTestId("flow-chart")).toBeVisible()
}
async function saved(page: Page, key: string) {
  return page.evaluate(stepKey => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return state.org.eventWorkflow?.steps.find((step: { key: string }) => step.key === stepKey) as { stepKind?: string; ownerRoleId?: string; dependsOn?: string[]; placement?: { branchId: string } } | undefined
  }, key)
}
async function details(page: Page, key: string) {
  await closeRail(page)
  await page.getByTestId(`flow-node-${key}`).click()
  if (test.info().project.name === "mobile") await page.getByTestId("flow-menu").getByRole("button", { name: "Open details" }).click()
  return page.getByTestId("workflow-step-panel")
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline workflow role check" } }))
})

test("changing Done by moves the template task into the role's branch and survives reload", async ({ page }) => {
  await workflow(page)
  let panel = await details(page, "contentCreation")
  await expect(panel.getByLabel("Step type", { exact: true })).toHaveValue("core")
  await panel.getByLabel("Done by", { exact: true }).selectOption("r-events")
  await expect.poll(async () => (await saved(page, "contentCreation"))?.placement?.branchId).toBe("event-lead")
  const moved = (await saved(page, "contentCreation"))!
  expect(moved.ownerRoleId).toBe("r-events")
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  panel = await details(page, "contentCreation")
  await expect(panel.getByLabel("Done by", { exact: true })).toHaveValue("r-events")
  await panel.getByLabel("Done by", { exact: true }).selectOption("r-mkt")
  await expect.poll(async () => (await saved(page, "contentCreation"))?.placement?.branchId).toBe("marketing")
  expect((await saved(page, "contentCreation"))?.dependsOn).toEqual(moved.dependsOn)
})

test("Step type is the first details setting and updates the saved category and chart", async ({ page }) => {
  await workflow(page)
  const panel = await details(page, "contentCreation")
  const first = panel.locator("input, select, textarea").first()
  await expect(first).toHaveAccessibleName("Step type")
  await panel.getByLabel("Step type", { exact: true }).selectOption("situation")
  await expect.poll(async () => (await saved(page, "contentCreation"))?.stepKind).toBe("situation")
  await closeRail(page)
  await expect(page.getByTestId("flow-node-contentCreation")).toHaveClass(/\bsituation\b/)
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const restored = await details(page, "contentCreation")
  await expect(restored.getByLabel("Step type", { exact: true })).toHaveValue("situation")
  await restored.getByLabel("Step type", { exact: true }).selectOption("core")
  await expect.poll(async () => (await saved(page, "contentCreation"))?.stepKind).toBe("core")
})

for (const { key, kind } of [{ key: "promotionItems", kind: "core" }, { key: "speakerPacket", kind: "situation" }]) {
  for (const where of ["before", "after"]) {
    test(`${where} a ${kind} step inherits its type and stays in that branch`, async ({ page }) => {
      await workflow(page)
      await closeRail(page)
      const anchor = page.getByTestId(`flow-node-${key}`)
      if (test.info().project.name === "mobile") await anchor.click(); else await anchor.click({ button: "right" })
      await page.getByTestId("flow-menu").getByRole("button", { name: `Add a step ${where} this one`, exact: true }).click()
      await expect.poll(async () => (await saved(page, "new-step"))?.stepKind).toBe(kind)
      expect((await saved(page, "new-step"))?.placement?.branchId).toBe(kind === "core" ? "marketing" : "speaker")
      await closeRail(page)
      await expect(page.getByTestId("flow-node-new-step")).toHaveClass(kind === "core" ? /\bbaseline\b/ : /\bsituation\b/)
      await page.getByTestId("flow-undo").click()
      await expect(page.getByTestId("flow-node-new-step")).toHaveCount(0)
    })
  }
}
