import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"
import { insertedKey, openWorkflow, openWorkflowStep, savedWorkflow, savedWorkflowStep } from "./workflowLegacyHelpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline workflow role check" } }))
})

// The legacy WorkflowPanel role→business-branch helper retains focused component
// and engine coverage. The new editor explicitly separates team, role and conditions.
test("changing Done by preserves the chosen team, business branch and prerequisites", async ({ page }) => {
  await openWorkflow(page)
  const before = (await savedWorkflowStep(page, "contentCreation"))!
  const team = (await savedWorkflow(page)).teamMap!.stepTeams.contentCreation
  let panel = await openWorkflowStep(page, "contentCreation")
  await expect(panel.getByRole("combobox", { name: "Step type", exact: true })).toHaveValue("core")
  await panel.getByRole("combobox", { name: "Done by", exact: true }).selectOption("r-events")
  await expect.poll(async () => (await savedWorkflowStep(page, "contentCreation"))?.ownerRoleId).toBe("r-events")
  const moved = (await savedWorkflowStep(page, "contentCreation"))!
  expect(moved.placement).toEqual(before.placement)
  expect(moved.cond).toBe(before.cond)
  expect(moved.dependsOn).toEqual(before.dependsOn)
  expect((await savedWorkflow(page)).teamMap!.stepTeams.contentCreation).toBe(team)
  await page.reload(); await page.getByRole("button", { name: "Workflow", exact: true }).click()
  panel = await openWorkflowStep(page, "contentCreation")
  await expect(panel.getByRole("combobox", { name: "Done by", exact: true })).toHaveValue("r-events")
  await panel.getByRole("combobox", { name: "Done by", exact: true }).selectOption("r-mkt")
  await expect.poll(async () => (await savedWorkflowStep(page, "contentCreation"))?.ownerRoleId).toBe("r-mkt")
  expect((await savedWorkflowStep(page, "contentCreation"))?.dependsOn).toEqual(moved.dependsOn)
})

test("Step type is the first details setting and updates the saved category and chart", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await openWorkflow(page)
  const panel = await openWorkflowStep(page, "contentCreation")
  await expect(panel.locator("input, select, textarea").first()).toHaveAccessibleName("Step type")
  await panel.getByRole("combobox", { name: "Step type", exact: true }).selectOption("situation")
  await expect.poll(async () => (await savedWorkflowStep(page, "contentCreation"))?.stepKind).toBe("situation")
  await closeRail(page)
  await expect(page.getByTestId("workflow-task-contentCreation")).toHaveClass(/\bis-situation\b/)
  await page.reload(); await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const restored = await openWorkflowStep(page, "contentCreation")
  await expect(restored.getByRole("combobox", { name: "Step type", exact: true })).toHaveValue("situation")
  expect(await restored.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
  const a11y = await new AxeBuilder({ page }).include('[data-testid="workflow-builder-details"]').withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(a11y.violations).toEqual([])
  await page.screenshot({ path: info.outputPath("workflow-step-type.png") })
  await restored.getByRole("combobox", { name: "Step type", exact: true }).selectOption("core")
  await expect.poll(async () => (await savedWorkflowStep(page, "contentCreation"))?.stepKind).toBe("core")
})

for (const { key, kind } of [{ key: "promotionItems", kind: "core" }, { key: "speakerPacket", kind: "situation" }]) {
  for (const where of ["before", "after"]) {
    test(`${where} a ${kind} step inherits its type, team and business branch`, async ({ page }) => {
      await openWorkflow(page)
      const before = (await savedWorkflow(page)).steps.map(step => step.key)
      const team = (await savedWorkflow(page)).teamMap!.stepTeams[key]
      const panel = await openWorkflowStep(page, key)
      await panel.getByRole("button", { name: where === "before" ? "Add before" : "Add next", exact: true }).click()
      const inserted = await insertedKey(page, before)
      expect((await savedWorkflowStep(page, inserted))?.stepKind).toBe(kind)
      expect((await savedWorkflowStep(page, inserted))?.placement?.branchId).toBe(kind === "core" ? "marketing" : "speaker")
      expect((await savedWorkflow(page)).teamMap!.stepTeams[inserted]).toBe(team)
      await closeRail(page)
      await expect(page.getByTestId(`workflow-task-${inserted}`)).toHaveClass(kind === "core" ? /\bis-core\b/ : /\bis-situation\b/)
      await page.getByRole("button", { name: "Undo edit", exact: true }).click()
      await expect.poll(async () => !!(await savedWorkflowStep(page, inserted))).toBe(false)
    })
  }
}
