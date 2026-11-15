import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { ask, closeRail, openAsk, openDemoMenu, openMore } from "./helpers"

// "Behind the scenes" (S7): a switch in the Demo menu that shows where numbers, dates and AI output come from.
// Off (the default) means the notes are not in the page at all.
const NOTES = ".bts, .bts-row, .bts-tr"
const KEY = "platypus.v1.bts"
const setting = (page: Page) => page.evaluate(k => localStorage.getItem(k), KEY)
const switchOn = async (page: Page) => { await openDemoMenu(page); await page.getByTestId("bts-toggle").check(); await page.keyboard.press("Escape") }

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
})

test("off by default: no note is in the page, on any page", async ({ page }) => {
  for (const path of ["/", "/events", "/tasks"]) {
    await page.goto(`/#${path}`)
    await page.waitForTimeout(300)
    await expect(page.locator(NOTES)).toHaveCount(0)
  }
  await openDemoMenu(page)
  await expect(page.getByTestId("bts-toggle")).not.toBeChecked()
})

test("the switch turns on and off, keeps its state after a reload, and removes the notes from the page when off", async ({ page }) => {
  await page.goto("/#/")
  await page.waitForTimeout(300)
  await switchOn(page)
  expect(await setting(page)).toBe("1")
  await closeRail(page)
  await expect(page.locator(".bts").first()).toBeVisible()
  await expect(page.getByTestId("risk-list")).toContainText("Club deadline")
  await page.reload()
  await page.waitForTimeout(300)
  await expect(page.locator(".bts").first()).toBeVisible()
  await openDemoMenu(page)
  await expect(page.getByTestId("bts-toggle")).toBeChecked()
  await page.getByTestId("bts-toggle").uncheck()
  expect(await setting(page)).toBe("0")
  await expect(page.locator(NOTES)).toHaveCount(0) // gone from the DOM, not hidden
  await page.reload()
  await page.waitForTimeout(300)
  await expect(page.locator(NOTES)).toHaveCount(0)
})

test("when on: dates show where they come from on Today, Events and Tasks", async ({ page }) => {
  await page.goto("/#/")
  await switchOn(page)
  await closeRail(page)
  await expect(page.getByTestId("risk-list").locator(".bts").first()).toContainText("Rule engine")
  await expect(page.getByTestId("event-strip").first().locator("xpath=following-sibling::*[1]")).toContainText("Days left = event date minus today")
  await page.goto("/#/events")
  await expect(page.locator("main .bts").first()).toBeVisible()
  await page.getByTestId("view-list").click()
  const list = page.getByTestId("event-list")
  // FB-4: the List view's notes explain the one Due (with the ASU sentence where a rule sets one) and when the reminder goes out.
  await expect(list.locator(".bts").filter({ hasText: "Due" }).first()).toBeVisible()
  await expect(list.locator(".bts").filter({ hasText: "ASU needs this by" }).first()).toBeVisible()
  await expect(list.locator(".bts").filter({ hasText: "Reminder goes out" }).first()).toBeVisible()
  await page.goto("/#/tasks")
  await page.getByRole("button", { name: "Table", exact: true }).click()
  await expect(page.getByTestId("my-tasks").locator(".bts").first()).toBeVisible()
  // Turning it off again leaves the pages as they were.
  await openDemoMenu(page)
  await page.getByTestId("bts-toggle").uncheck()
  await expect(page.locator(NOTES)).toHaveCount(0)
})

test("when on: Event Budget and Handoff say where progress and sources come from; off removes them", async ({ page }) => {
  await page.goto("/#/events")
  await expect(page.locator(NOTES)).toHaveCount(0)
  await switchOn(page)
  await closeRail(page)
  await page.getByTestId("view-budget").click()
  await expect(page.getByTestId("event-budget").locator(".bts").filter({ hasText: "Line-item status" }).first()).toBeVisible()
  await page.goto("/#/handoff")
  await expect(page.locator(".season .bts")).toBeVisible()
  await openDemoMenu(page)
  await page.getByTestId("bts-toggle").uncheck()
  await expect(page.locator(NOTES)).toHaveCount(0)
})

test("when on: the new-task form explains the club deadline and the plan check says whether AI wrote it", async ({ page }) => {
  await page.goto("/#/")
  await openMore(page)
  await page.getByRole("checkbox", { name: "AI features" }).uncheck()
  await switchOn(page)
  await ask(page, "Add a task: order name tags")
  const form = page.getByTestId("task-form")
  await expect(form.getByTestId("club-deadline")).toBeVisible()
  await expect(form.locator(".bts").filter({ hasText: "working days" }).first()).toBeVisible()
  await expect(form.locator(".bts").filter({ hasText: "never supplies a date" })).toBeVisible()
  await ask(page, "Plan Founders Welcome Dinner on Nov 19, 30 people, outside caterer, USG funding")
  await page.getByTestId("plan-form").getByRole("button", { name: "Continue" }).click()
  await page.getByTestId("change-item").getByRole("button", { name: "Apply this change" }).click()
  await expect(page.getByTestId("flow-chart")).toBeVisible()
  await openAsk(page) // Navigation closes the side panel on phones; reopen it to read the plan check.
  const review = page.getByTestId("event-review")
  await expect(review.locator(".bts.k-rule").first()).toContainText(/Rule engine check · AI off.*No AI wrote this list/)
})

for (const path of ["/", "/events", "/tasks"]) test(`no accessibility violations with the notes on, on ${path}`, async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, "1"), KEY)
  await page.goto(`/#${path}`)
  await page.waitForTimeout(400)
  await closeRail(page)
  if (path === "/tasks") await page.getByRole("button", { name: "Table", exact: true }).click()
  await expect(page.locator(".bts").first()).toBeVisible()
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
  expect(res.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)).toEqual([])
})
