import { expect, test, type Page } from "@playwright/test"
import { closeRail, noOverflow } from "./helpers"
import { continueSetup, finishSetup, openSetup, savedSetupDraft, setupToConfirm } from "./setupHelpers"

import { insertedKey, openWorkflow, openWorkflowStep, readWorkflowState, savedWorkflow, savedWorkflowStep } from "./workflowLegacyHelpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})

test("setup uses the standard workflow and never requests planning-material AI", async ({ page }) => {
  let workflowCalls = 0
  await page.route("**/api/setup/workflow", r => { workflowCalls++; return r.fulfill({ status: 500, json: {} }) })
  await setupToConfirm(page)
  await expect(page.getByLabel("Planning notes (how your club runs events)")).toHaveCount(0)
  await expect(page.getByLabel("Fictional planning files", { exact: true })).toHaveCount(0)
  await finishSetup(page)
  const settings = await openWorkflow(page)
  await expect(settings.getByTestId("workflow-builder")).toBeVisible()
  expect(workflowCalls).toBe(0)
})

test("Settings workflow preserves school dependencies, Undo, manual owners, versions and persistence", async ({ page }) => {
  const settings = await openWorkflow(page)
  let panel = await openWorkflowStep(page, "budget")
  await panel.getByLabel("Task name", { exact: true }).fill("Club budget")
  await panel.getByLabel("Days of work").fill("4")
  await panel.getByLabel("Done by").selectOption("r-fin")
  await expect.poll(async () => (await savedWorkflowStep(page, "budget"))?.estDays).toBe(4)
  const keys = (await savedWorkflow(page)).steps.map(step => step.key)
  await panel.getByRole("button", { name: "Add next", exact: true }).click()
  const added = await insertedKey(page, keys)
  await expect(page.getByTestId("workflow-builder-details").getByLabel("Done by")).toHaveValue("r-fin")
  await closeRail(page)
  await settings.getByRole("button", { name: "Undo edit", exact: true }).click()
  await expect.poll(async () => !!(await savedWorkflowStep(page, added))).toBe(false)
  panel = await openWorkflowStep(page, "purchaseRequest")
  await expect(panel).toContainText("School rule deadlines and required prerequisites are protected")
  await expect(panel.getByRole("button", { name: "Delete task", exact: true })).toBeDisabled()
  // The school-rule prerequisite stays: removing it is refused with the rule, and the prerequisite remains listed.
  const requiredPreviousTask = panel.getByRole("button", { name: "Remove prerequisite Budget Approval", exact: true })
  await requiredPreviousTask.click()
  await expect(page.getByTestId("workflow-builder").getByRole("alert")).toContainText("must wait for “Budget Approval”")
  await expect(requiredPreviousTask).toBeVisible()
  await closeRail(page)
  expect((await savedWorkflowStep(page, "purchaseRequest"))?.dependsOn).toContain("budgetApproval")
  await settings.getByRole("button", { name: "Save version", exact: true }).click()
  await expect(settings.getByRole("status").filter({ hasText: "Version 2 saved" })).toBeVisible()
  const saved = await readWorkflowState(page)
  const standard = saved.org.workflowTemplates.find((item: { id: string }) => item.id === "standard-event")
  expect(standard.versions[0].steps.find((step: { key: string }) => step.key === "budget").title).not.toBe("Club budget")
  expect(standard.versions[1].steps.find((step: { key: string }) => step.key === "budget").title).toBe("Club budget")
  await page.reload()
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  panel = await openWorkflowStep(page, "budget")
  await expect(panel.getByLabel("Task name", { exact: true })).toHaveValue("Club budget")
  await expect(panel.getByLabel("Days of work")).toHaveValue("4")
  await expect(panel.getByLabel("Done by")).toHaveValue("r-fin")
  await closeRail(page)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("a signed-out constitution request is not retried, and reload retains the shared draft", async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  await page.route("**/api/setup/constitution", r => { bodies.push(r.request().postDataJSON()); return r.fulfill({ status: 401, contentType: "text/html", body: "<html><title>Login Redirect</title></html>" }) })
  await openSetup(page)
  await page.getByRole("button", { name: /Use sample/ }).click()
  await expect(page.getByRole("button", { name: "Try AI again", exact: true })).toBeVisible()
  expect(bodies).toHaveLength(1)
  expect(JSON.stringify(bodies)).not.toMatch(/personalBuffer|busyWeeks|dataUrl|careerGoal|phone|9999000|@example\.org/)
  await continueSetup(page)
  await page.getByRole("textbox", { name: "Mission", exact: true }).fill("Fictional restored mission")
  await continueSetup(page)
  await expect.poll(async () => (await savedSetupDraft(page))?.club.mission).toBe("Fictional restored mission")
  await page.reload()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Mission", exact: true })).toHaveValue("Fictional restored mission")
  expect(bodies).toHaveLength(1)
  await page.getByRole("button", { name: "Exit", exact: true }).click()
  await page.goto("/#/setup")
  await expect(page.getByLabel("Club name")).toHaveValue("")
})
