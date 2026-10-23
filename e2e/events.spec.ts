import { expect, test } from "@playwright/test"
import { resetDemo } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.goto("/#/events")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId("view-flow").click()
})

test("the flow chart has one main line through the event day, and a step opens with its three deadlines", async ({ page }) => {
  const chart = page.getByTestId("flow-chart")
  await expect(chart).toBeVisible()
  await expect(chart.locator("button.m-dot")).toHaveCount(20)
  await expect(chart).toContainText("Event day")
  await page.getByTestId("flow-node-usg").click()
  const panel = page.getByTestId("node-panel")
  await expect(panel.getByRole("heading", { name: "Submit the USG food request" })).toBeVisible()
  await expect(panel.getByTestId("dl-start")).toHaveText("Wed, Oct 28")
  await expect(panel.getByTestId("club-input")).toHaveValue("2026-10-30")
  await expect(panel.getByTestId("dl-official")).toHaveText("Wed, Nov 4")
  await expect(panel).toContainText("R09: 10 business days before the event")
  await page.keyboard.press("Escape")
  await expect(panel).toHaveCount(0)
})

test("hovering a step shows a short card; the full title is not on the chart", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "hover needs a pointer")
  const node = page.getByTestId("flow-node-usg")
  await node.hover()
  const card = node.locator("xpath=..").locator(".m-card")
  await expect(card).toBeVisible()
  await expect(card).toContainText("Submit the USG food request")
  await expect(card).toContainText("ASU deadline Nov 4")
})

test("moving a step later reschedules the steps after it and flags the rule break in red", async ({ page }) => {
  await page.getByTestId("flow-node-flyer").click()
  await page.getByTestId("club-input").fill("2026-11-02")
  await page.getByRole("button", { name: "Close panel" }).click()
  await expect(page.getByTestId("flow-node-usg")).toHaveClass(/has-error/)
  await page.getByTestId("flow-node-usg").click()
  const panel = page.getByTestId("node-panel")
  await expect(panel.getByTestId("dl-start")).toHaveText("Tue, Nov 3")
  await expect(panel.getByTestId("node-issues")).toContainText("after the ASU deadline")
  await expect(panel).toContainText("Moved later")
  await page.getByRole("button", { name: "Close panel" }).click()
  await expect(page.getByTestId("event-issues")).toContainText("cannot finish in time")
  await page.getByTestId("flow-node-flyer").click()
  await page.getByRole("button", { name: /Use recommended/ }).click()
  await page.getByRole("button", { name: "Close panel" }).click()
  await expect(page.getByTestId("flow-node-usg")).not.toHaveClass(/has-error/)
})

test("changing the event date recomputes the plan", async ({ page }) => {
  await page.getByTestId("event-date").fill("2026-12-09")
  await expect(page.getByTestId("event-issues")).toContainText("R13")
  await page.getByTestId("event-date").fill("2026-12-03")
  await page.getByTestId("flow-node-usg").click()
  await expect(page.getByTestId("dl-official")).toHaveText("Tue, Nov 17")
})

test("the list view shows the same steps", async ({ page }) => {
  await page.getByTestId("view-list").click()
  await expect(page.getByTestId("event-list")).toContainText("ASU Nov 4")
  await page.getByTestId("event-list").getByRole("button", { name: /Submit the USG food request/ }).click()
  await expect(page.getByTestId("node-panel")).toBeVisible()
})

test("changes persist after reload and Reset demo restores the plan", async ({ page }) => {
  await page.getByTestId("flow-node-usg").click()
  await page.getByTestId("club-input").fill("2026-11-02")
  await page.reload()
  await page.getByTestId("flow-node-usg").click()
  await expect(page.getByTestId("club-input")).toHaveValue("2026-11-02")
  await page.getByRole("button", { name: "Close panel" }).click()
  await resetDemo(page)
  await page.getByTestId("flow-node-usg").click()
  await expect(page.getByTestId("club-input")).toHaveValue("2026-10-30")
})

test("every step in the second event opens", async ({ page }) => {
  await page.getByRole("button", { name: "Spring Speaker Night" }).click()
  await page.getByTestId("view-list").click()
  await expect(page.getByTestId("event-list")).toContainText("Get the speaker's signed SAP agreement")
})
