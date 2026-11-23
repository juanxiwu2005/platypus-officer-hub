import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, viewAs } from "./helpers"
import { savedTask } from "./taskHelpers"
import { fmtShort } from "../src/lib/dates"

// S3 (Juanxi 2026-11-23): "Next up" under the event's flow answers who acts next and what will be late,
// from the rule engine's schedule and forecast. At most five rows; at-risk steps first.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events?event=e-night")
  await closeRail(page)
})

const RANK: Record<string, number> = { risk: 0, watch: 1, start: 2 }

test("Next up ranks at-risk steps first, opens their details, offers Remind and fits the screen", async ({ page }, info) => {
  const strip = page.getByTestId("next-up")
  await expect(strip.getByRole("heading", { name: "Next up", exact: true })).toBeVisible()
  const rows = strip.locator("li")
  await expect(rows.first()).toBeVisible()
  const count = await rows.count()
  expect(count).toBeLessThanOrEqual(5)
  const reasons = await rows.evaluateAll(items => items.map(item => item.getAttribute("data-reason") ?? ""))
  const ranks = reasons.map(r => RANK[r])
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  expect(reasons[0]).toBe("risk")
  await expect(rows.first().locator(".tag.late")).toHaveText("At risk")
  // Each row shows the rule engine's club deadline and is never a finished step.
  const ids: string[] = []
  for (let index = 0; index < count; index++) {
    const id = (await rows.nth(index).getAttribute("data-testid"))!.replace("next-up-", "")
    ids.push(id)
    const saved = await savedTask(page, id)
    expect(saved.status).not.toBe("done")
    await expect(rows.nth(index)).toContainText(saved.title)
    await expect(rows.nth(index)).toContainText(`Due ${fmtShort(saved.clubDeadline!)}`)
  }
  // A row opens the same details as its dot.
  const first = await savedTask(page, ids[0])
  await rows.first().locator(".next-up-row").click()
  await expect(page.getByTestId("task-detail").getByRole("heading", { name: first.title, exact: true })).toBeVisible()
  expect(new URL(page.url().replace("/#/", "/")).searchParams.get("node")).toBe(ids[0])
  await closeRail(page)
  // Remind reuses the existing reminder draft for that one task.
  await rows.first().getByRole("button", { name: /^Remind / }).click()
  await expect(page.getByTestId("nudge-panel")).toBeVisible()
  await closeRail(page)
  if (info.project.name === "mobile") expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const box = await strip.boundingBox()
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  const violations = (await new AxeBuilder({ page }).include("[data-testid='next-up']").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => v.id)
  expect(violations).toEqual([])
  // An officer who is not the president or VP sees the same list without Remind.
  await viewAs(page, "maya")
  await expect(strip.locator("li").first()).toBeVisible()
  await expect(strip.getByRole("button", { name: /^Remind / })).toHaveCount(0)
})

test("Next up says so in one line when nothing needs action, and steps aside while the flow is edited", async ({ page }) => {
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    for (const node of saved.nodes) if (node.eventId === "e-night") { node.status = "done"; node.completedOn = saved.today }
    localStorage.setItem("platypus.v1.demo", JSON.stringify(saved))
  })
  await page.reload()
  await closeRail(page)
  await expect(page.getByTestId("next-up-empty")).toHaveText("Nothing is late or due to start.")
  await page.getByTestId("flow-edit-toggle").click()
  await expect(page.getByTestId("next-up")).toHaveCount(0)
})

test("changing the event keeps the Details panel closed until it is asked for", async ({ page }, info) => {
  if (info.project.name === "mobile") await page.getByLabel("Choose an event", { exact: true }).selectOption("e-speaker")
  else await page.getByRole("navigation", { name: "Events", exact: true }).getByRole("button", { name: "Spring Speaker Night", exact: true }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Spring Speaker Night", exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Event details" })).toHaveCount(0)
  await expect(page.locator(".event-head .tag")).toHaveCount(0)   // no "workflow · vN" tag in the head
  await page.getByTestId("event-details-open").click()
  await expect(page.getByRole("region", { name: "Event details" }).getByRole("heading", { name: "Spring Speaker Night" })).toBeVisible()
})
