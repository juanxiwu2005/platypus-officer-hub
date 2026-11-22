import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"
import { insertedKey, openWorkflow, openWorkflowStep, savedWorkflow, savedWorkflowStep } from "./workflowLegacyHelpers"

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline workflow check" } }))
})

test("inserting before shared Full Check keeps its team without a branch prompt", async ({ page }) => {
  await openWorkflow(page)
  const before = await savedWorkflow(page)
  const keys = before.steps.map(step => step.key)
  const reference = before.steps.find(step => step.key === "finalcheck")!
  const panel = await openWorkflowStep(page, "finalcheck")
  await expect(panel.getByRole("combobox", { name: "Insertion branch", exact: true })).toHaveCount(0)
  await panel.getByRole("button", { name: "Add before", exact: true }).click()
  const key = await insertedKey(page, keys)
  const step = (await savedWorkflowStep(page, key))!
  expect(step.placement?.branchId).toBe(reference.placement?.branchId ?? "main")
  expect(step.cond).toBe(reference.cond)
  expect((await savedWorkflow(page)).teamMap?.stepTeams[key]).toBe(before.teamMap?.stepTeams.finalcheck)
  expect((await savedWorkflowStep(page, "finalcheck"))?.dependsOn).toContain(key)
})

test("a mixed-scope template line has no double-click or double-tap action", async ({ page }) => {
  await openWorkflow(page)
  const before = await saved(page)
  // Settings draws team branch lines (no separate dependency arrows); they carry no pointer actions.
  const line = page.getByTestId("workflow-branch-track").first()
  await line.scrollIntoViewIfNeeded()
  const point = await line.evaluate(element => {
    const path = element as SVGPathElement
    const at = path.getPointAtLength(path.getTotalLength() / 2)
    const point = new DOMPoint(at.x, at.y).matrixTransform(path.getScreenCTM()!)
    return { x: point.x, y: point.y }
  })
  if (test.info().project.name === "mobile") { await page.touchscreen.tap(point.x, point.y); await page.touchscreen.tap(point.x, point.y) }
  else await page.mouse.dblclick(point.x, point.y)
  await expect(page.getByTestId("flow-menu")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Undo edit", exact: true })).toBeDisabled()
  expect(await saved(page)).toEqual(before)
})

test("an old event without Full Check keeps all its other tasks visible", async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  await page.getByTestId("flow-node-finalcheck").waitFor()
  const expected = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    s.nodes = s.nodes.filter((n: { id: string }) => n.id !== "e-speaker:finalcheck")
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
    return s.nodes.filter((n: { eventId: string }) => n.eventId === "e-speaker").length
  })
  await page.reload()
  await expect(page.locator('[data-testid^="flow-node-"]')).toHaveCount(expected)
  await expect(page.getByTestId("flow-node-plan")).toHaveCount(1)
  await expect(page.getByTestId("flow-node-finalcheck")).toHaveCount(0)
  expect((await saved(page)).nodes.some((n: { id: string }) => n.id === "e-speaker:finalcheck")).toBe(false)
})

test("an actual event adds and undoes a complete branch snapshot", async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  const before = await saved(page)
  const beforeIds = before.nodes.map((n: { id: string }) => n.id)
  await closeRail(page)
  await page.getByTestId("flow-edit-toggle").click()
  await page.getByTestId("flow-add-branch").click()
  const dialog = page.getByRole("dialog", { name: "Add branch", exact: true })
  await dialog.getByLabel("Branch name").fill("Guest support")
  await dialog.getByLabel("First task").fill("Confirm arrival")
  await dialog.getByRole("button", { name: "Add branch", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect.poll(async () => (await saved(page)).nodes.filter((n: { id: string }) => !beforeIds.includes(n.id)).length).toBe(1)
  const added = (await saved(page)).nodes.find((n: { id: string }) => !beforeIds.includes(n.id))
  const branchId = added.placement.branchId
  expect((await saved(page)).events.find((e: { id: string }) => e.id === "e-speaker").workflowBranches.some((b: { id: string }) => b.id === branchId)).toBe(true)
  await closeRail(page)
  await page.getByTestId("flow-undo").click()
  await expect.poll(async () => (await saved(page)).nodes.some((n: { id: string }) => n.id === added.id)).toBe(false)
  expect((await saved(page)).events.find((e: { id: string }) => e.id === "e-speaker").workflowBranches.some((b: { id: string }) => b.id === branchId)).toBe(false)
})

test("pointer movement updates the real screen order", async ({ page }) => {
  test.skip(test.info().project.name === "mobile", "Desktop pointer gesture; mobile keyboard order is covered separately.")
  // The legacy Plan retains its existing pointer-reordering behavior independently
  // of the new compact Settings sequence editor.
  await page.goto("/#/events?event=e-speaker")
  await closeRail(page)
  await page.getByTestId("flow-edit-toggle").click()
  const task = page.getByTestId("flow-node-promotionItems")
  await task.scrollIntoViewIfNeeded()
  const a = await page.getByTestId("flow-node-marketingNeeds").boundingBox()
  const b = await page.getByTestId("flow-node-contentCreation").boundingBox()
  const from = await task.boundingBox()
  expect(a && b && from).toBeTruthy()
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
  await page.mouse.down()
  await page.mouse.move((a!.x + a!.width / 2 + b!.x + b!.width / 2) / 2, a!.y + a!.height / 2, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => page.evaluate(() => {
    const pos = (key: string) => parseFloat((document.querySelector(`[data-testid="flow-node-${key}"]`)!.parentElement as HTMLElement).style.getPropertyValue("--x"))
    return pos("promotionItems") < pos("contentCreation")
  })).toBe(true)
})
