import { expect, test } from "@playwright/test"
import { closeRail } from "./helpers"
import { savedDemo } from "./demo-contract"

/**
 * S3 (Juanxi, 2026-11-23): the six task statuses are fixed everywhere. An old save that renamed or recoloured them
 * keeps those fields unchanged in storage, but Tasks and Task Details show the default names and colours.
 */
const board = {
  labels: { unclaimed: "Up for grabs", accepted: "Ready", in_progress: "Doing", waiting: "On hold", blocked: "Help!", done: "Shipped" },
  colors: { accepted: "#c2418d", waiting: "#0d7373" },
  tags: [{ id: "food", label: "Food", color: "#0f8a8a" }],
  fields: ["owner"],
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
})

test("an old save with renamed statuses shows the six default names and keeps its saved settings", async ({ page }) => {
  await page.goto("/#/tasks")
  await savedDemo(page)
  await page.evaluate(b => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); s.org.board = b; localStorage.setItem("platypus.v1.demo", JSON.stringify(s)) }, board)
  await page.goto("/#/tasks?node=t-sdc")
  await page.reload()
  const detail = page.getByTestId("task-detail")
  await expect(detail.getByRole("combobox", { name: "Task status", exact: true }).locator("option:checked")).toHaveText("To do")
  await expect(detail.getByRole("combobox", { name: "Task status", exact: true }).locator("option")).toHaveText(["To do", "Working on it", "Stuck", "Waiting", "Need more time…"])
  await closeRail(page)
  await page.goto("/#/tasks?node=t-news")
  await expect(page.getByTestId("task-detail").getByRole("combobox", { name: "Task status", exact: true }).locator("option:checked")).toHaveText("Waiting")
  await closeRail(page)
  await expect(page.locator("main")).not.toContainText(/Up for grabs|Shipped|On hold|Help!/)
  const pill = page.locator(".pill[data-status=waiting]").first()
  if (await pill.count()) {
    await expect(pill).toHaveText("Waiting")
    expect(await pill.evaluate(el => (el as HTMLElement).style.getPropertyValue("--pill"))).toBe("#8656cc")
  }
  expect((await savedDemo(page)).org.board).toEqual(board)
})
