import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { ask } from "./helpers"

// WCAG 2 A/AA scan of every page and the main panels (v1.1 keyboard and accessibility pass).
const PAGES = ["/", "/events", "/tasks", "/team", "/funding", "/handoff", "/partners", "/rules", "/settings", "/help"]
const scan = async (page: import("@playwright/test").Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "one scan is enough"))
for (const path of PAGES) test(`no accessibility violations on ${path}`, async ({ page }) => {
  await page.goto(`/#${path}`)
  await page.waitForTimeout(300)
  expect(await scan(page)).toEqual([])
})
test("no accessibility violations in the Ask panel, a task's details and the board", async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/")
  await ask(page, "Plan Founder Dinner on Nov 19, 30 people")
  await ask(page, "What are my top 5 tasks?")
  expect(await scan(page)).toEqual([])
  await page.goto("/#/tasks?node=e-night:usg")
  await expect(page.getByTestId("task-detail")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await page.getByRole("button", { name: "Board", exact: true }).click()
  expect(await scan(page)).toEqual([])
})
test("keyboard: / focuses Ask, Escape closes details, a flow step opens with Enter", async ({ page }) => {
  await page.goto("/#/events")
  await page.locator("main").click({ position: { x: 5, y: 5 } })
  await page.keyboard.press("/")
  await expect(page.locator("#ask-input")).toBeFocused()
  await page.getByTestId("flow-node-usg").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("node-panel")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("node-panel")).toHaveCount(0)
})
