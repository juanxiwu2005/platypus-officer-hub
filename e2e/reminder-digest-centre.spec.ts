import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow } from "./helpers"
import type { DemoState } from "../src/data/types"

// Concept F (Juanxi 2026-11-19) on the shipped seed club (Sat Oct 31, "I review, Platypus sends"):
// one email per person, problems apart under Fix first, the email itself in the right rail. Nothing is sent.
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
const serious = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze())
  .violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline reminder check" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname) && url.hostname !== "mail.google.com", route => route.abort())
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    s.org.settings.reminderMode = "review_then_auto"
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
  })
  await page.reload()
  await closeRail(page)
  await page.getByRole("button", { name: "Enable updated reminders", exact: true }).click()
  await expect(page.getByTestId("rq-summary")).toBeVisible()
})

test("the seed fits in a short page: 3 emails for 5 tasks, grouped by person, problems apart", async ({ page, isMobile }) => {
  await expect(page.getByTestId("rq-summary")).toContainText("Review 3 emails · 5 tasks · 0 sent today")
  await expect(page.getByTestId("send-all-digests")).toHaveText("Send all 3 emails")
  const people = page.getByTestId("rq-person")
  await expect(people).toHaveCount(3)
  expect(await people.evaluateAll(list => list.map(p => (p as HTMLElement).dataset.recipient))).toEqual(["maya", "jordan", "priya"])
  await expect(page.locator('[data-recipient="jordan"]').getByTestId("rq-person-task")).toHaveCount(3)
  await expect(page.getByTestId("rq-person-task")).toHaveCount(5)
  await expect(page.getByTestId("rq-fix").getByTestId("rq-row")).toHaveCount(8)
  // Every task line is one line.
  for (const line of await page.getByTestId("rq-person-task").all()) expect((await line.boundingBox())!.height).toBeLessThan(44)
  if (!isMobile) {
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(await page.locator("main").evaluate(m => m.scrollHeight)).toBeLessThan(1600)
  }
  expect(await serious(page)).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("a person opens their real email in the rail; Send & next records it and moves on; Send all records the rest", async ({ page }) => {
  await page.locator('[data-recipient="maya"] .dg-person-head').click()
  const panel = page.getByTestId("digest-panel")
  await expect(panel).toContainText("Email 1 of 3 · to Maya")
  await expect(panel.getByTestId("digest-body").getByRole("link", { name: "Open task" })).toHaveCount(1)
  await expect(panel.getByText(/Maya’s open tasks \(\d+\)/)).toBeVisible()
  await expect(page.locator('[data-testid="rq-person"][data-recipient="maya"]')).toHaveAttribute("data-state", "reviewing")
  expect(await serious(page)).toEqual([])
  await panel.getByTestId("digest-send-next").click()
  await expect(panel).toContainText("Email 2 of 3 · to Jordan")
  await expect(panel.getByTestId("digest-body").getByRole("link", { name: "Open task" })).toHaveCount(3)
  expect((await read(page)).reminderRuntime!.digests).toHaveLength(1)
  await panel.getByTestId("digest-send-all").click()
  await expect(panel).toContainText("2 emails recorded. Demo: nothing is sent.")
  const saved = await read(page)
  expect(saved.reminderRuntime!.digests).toHaveLength(3)
  expect(saved.reminderRuntime!.deliveries).toHaveLength(5)
  await panel.getByRole("button", { name: "Close email" }).click()
  await closeRail(page)
  await expect(page.getByTestId("rq-summary")).toContainText("Nothing to send today. · 3 sent today")
  await expect(page.getByTestId("rq-person")).toHaveCount(3)
  for (const p of await page.getByTestId("rq-person").all()) await expect(p).toHaveAttribute("data-state", "sent")
  await expect(page.getByTestId("rq-history")).toContainText("3 sent this week")
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})
