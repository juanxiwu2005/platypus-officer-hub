import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/#/events")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId("view-flow").click()
})

test("flow chart shows lanes and opens a step with its three deadlines", async ({ page }) => {
  await expect(page.getByTestId("flow-chart")).toBeVisible()
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

  // Put it back
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

test("Gantt and list views show the same steps", async ({ page }) => {
  await page.getByTestId("view-gantt").click()
  await expect(page.getByTestId("gantt")).toContainText("Submit the USG food request")
  await page.getByTestId("view-list").click()
  await expect(page.getByTestId("event-list")).toContainText("ASU Nov 4")
  await page.getByTestId("event-list").getByRole("button", { name: /Submit the USG food request/ }).click()
  await expect(page.getByTestId("node-panel")).toBeVisible()
})

test("changes persist after reload and Reset demo restores the plan", async ({ page }) => {
  await page.getByTestId("flow-node-usg").click()
  await page.getByTestId("club-input").fill("2026-11-02")
  await page.reload()
  await page.getByTestId("view-flow").click()
  await page.getByTestId("flow-node-usg").click()
  await expect(page.getByTestId("club-input")).toHaveValue("2026-11-02")
  await page.getByRole("button", { name: "Close panel" }).click()
  await page.getByTestId("reset-demo").click()
  await page.getByTestId("flow-node-usg").click()
  await expect(page.getByTestId("club-input")).toHaveValue("2026-10-30")
})

test("every step in the second event opens", async ({ page }) => {
  await page.getByRole("button", { name: /Spring Speaker Night/ }).click()
  await page.getByTestId("view-list").click()
  await expect(page.getByTestId("event-list")).toContainText("Get the speaker's signed SAP agreement")
})
