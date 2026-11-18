import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

async function workflow(page: Page) {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline workflow check" } }))
})

test("shared Full Check requires an explicit insertion branch", async ({ page }) => {
  await workflow(page)
  const checkpoint = page.getByTestId("flow-node-finalcheck")
  if (test.info().project.name === "mobile") await checkpoint.click(); else await checkpoint.click({ button: "right" })
  const menu = page.getByTestId("flow-menu")
  await expect(menu.getByRole("button", { name: "Add a step before this one" })).toBeDisabled()
  await menu.getByLabel("Insert on branch").selectOption("speaker")
  await menu.getByRole("button", { name: "Add a step before this one" }).click()
  await expect.poll(async () => (await saved(page)).org.eventWorkflow?.steps.find((s: { key: string }) => s.key === "new-step")?.placement?.branchId).toBe("speaker")
  const step = (await saved(page)).org.eventWorkflow.steps.find((s: { key: string }) => s.key === "new-step")
  expect(step.cond).toBe("externalGuest")
})

test("a mixed-scope line never silently inherits its left endpoint scope", async ({ page }) => {
  await workflow(page)
  const left = page.getByTestId("flow-node-foodCompliance"), right = page.getByTestId("flow-node-quotes")
  await left.scrollIntoViewIfNeeded()
  await right.scrollIntoViewIfNeeded()
  const a = await left.boundingBox(), b = await right.boundingBox()
  // Straight SVG strokes have a zero-height/width DOM box; click the painted midpoint.
  await page.mouse.dblclick((a!.x + a!.width / 2 + b!.x + b!.width / 2) / 2, (a!.y + a!.height / 2 + b!.y + b!.height / 2) / 2)
  const menu = page.getByTestId("flow-menu")
  const add = menu.getByRole("button", { name: "Add a step here" })
  await expect(add).toBeDisabled()
  await menu.getByLabel("New step applies to").selectOption("externalFood")
  await add.click()
  await expect.poll(async () => (await saved(page)).org.eventWorkflow?.steps.find((s: { key: string }) => s.key === "new-step")?.cond).toBe("externalFood")
  expect((await saved(page)).org.eventWorkflow.steps.find((s: { key: string }) => s.key === "new-step").placement.branchId).toBe("finance")
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
  await workflow(page)
  await closeRail(page)
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
