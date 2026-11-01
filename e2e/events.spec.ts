import { expect, test } from "@playwright/test"
import { closeRail, noOverflow, resetDemo } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events?event=e-night")
  await closeRail(page)
  await page.getByTestId("view-flow").click()
})

test("Spring Speaker Night's event plan is Done for fresh and existing saved demos", async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  await expect(page.getByTestId("flow-node-plan")).toHaveClass(/done/)
  await expect(page.getByTestId("flow-node-backup")).not.toHaveClass(/done/)
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    saved.schemaVersion = 18
    saved.org.mission = "Keep my saved club notes"
    const plan = saved.nodes.find((node: { id: string }) => node.id === "e-speaker:plan")
    plan.status = "accepted"
    delete plan.completedOn
    localStorage.setItem("platypus.v1.demo", JSON.stringify(saved))
  })
  await page.reload()
  await expect(page.getByTestId("flow-node-plan")).toHaveClass(/done/)
  await expect(page.getByTestId("flow-node-backup")).not.toHaveClass(/done/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.mission)).toBe("Keep my saved club notes")
  await page.reload()
  await expect(page.getByTestId("flow-node-plan")).toHaveClass(/done/)
})

test("the flow chart has one main line through the event day, and a step opens with its three deadlines", async ({ page }) => {
  const chart = page.getByTestId("flow-chart")
  await expect(chart).toBeVisible()
  await expect(chart.locator("button.m-dot")).toHaveCount(38)
  await expect(chart).toContainText("Event day")
  await expect(chart).not.toContainText("Today")
  await expect(chart).not.toContainText(/weeks out/)
  await expect(chart.locator(".m-start .m-dot.station")).toHaveClass(/done/)
  await page.getByTestId("flow-node-purchaseRequest").click()
  const panel = page.getByTestId("task-detail")
  await expect(panel.getByRole("heading", { name: "Purchase Request", exact: true })).toBeVisible()
  await expect(panel.locator(".task-dates")).toContainText("Wed, Feb 24")
  await expect(panel.locator(".task-dates")).toContainText("Fri, Feb 26")
  await expect(panel.locator(".task-dates")).toContainText("Thu, Mar 11")
  await panel.getByText("Sources and responsibilities", { exact: true }).click()
  await expect(panel.getByRole("link", { name: "R09", exact: true })).toHaveAttribute("href", /^https:/)
  await page.keyboard.press("Escape")
  await expect(panel).toHaveCount(0)
})

test("a pointer hovers a step; touch opens its details with the same deadline", async ({ page }, info) => {
  const node = page.getByTestId("flow-node-purchaseRequest")
  if (info.project.name === "desktop") {
    await node.hover()
    const card = node.locator("xpath=..").locator(".m-card")
    await expect(card).toBeVisible()
    await expect(card).toContainText("Purchase Request")
    await expect(card).toContainText("ASU deadline Mar 11")
  } else {
    await node.tap()
    await expect(page.getByTestId("task-detail").locator(".task-dates")).toContainText("Thu, Mar 11")
  }
})

test("moving an upstream due date later reschedules its dependants and flags the rule break in red", async ({ page }) => {
  await page.getByLabel("Event date", { exact: true }).fill("2026-11-19")
  await page.goto("/#/tasks")
  await page.getByRole("button", { name: "Table", exact: true }).click()
  await page.getByLabel("Task scope").selectOption("team")
  await page.getByLabel("Due date of Budget Approval", { exact: true }).fill("2026-11-02")
  await page.goto("/#/events?event=e-night")
  await page.getByTestId("flow-node-purchaseRequest").click()
  const panel = page.getByTestId("task-detail")
  await expect(panel.locator(".task-dates")).toContainText("Tue, Nov 3")
  await closeRail(page)
  await expect(page.getByTestId("flow-node-purchaseRequest")).toHaveClass(/has-error/)
  await expect(page.getByTestId("event-issues")).toContainText("cannot finish in time")
  await resetDemo(page)
  await expect(page.getByTestId("flow-node-purchaseRequest")).not.toHaveClass(/has-error/)
})

test("changing the event date recomputes the plan and warnings in Flow and List", async ({ page }) => {
  await page.getByTestId("event-date").fill("2026-12-09")
  await expect(page.getByTestId("event-issues")).toContainText("R13")
  await page.getByTestId("event-date").fill("2026-12-03")
  await page.getByTestId("flow-node-purchaseRequest").click()
  await expect(page.getByTestId("task-detail").locator(".task-dates")).toContainText("Tue, Nov 17")
  await closeRail(page)
  await page.getByTestId("view-list").click()
  const row = page.getByTestId("event-step-e-night:purchaseRequest").locator("xpath=ancestor::tr")
  await expect(row).toContainText("ASU Nov 17")
  await row.getByTestId("event-step-e-night:purchaseRequest").click()
  await expect(page.getByTestId("task-detail").locator(".task-dates")).toContainText("Tue, Nov 17")
})

test("the list view opens every step from the same event as the Flow", async ({ page }) => {
  const count = await page.getByTestId("flow-chart").locator("button.m-dot").count()
  await page.getByTestId("view-list").click()
  const steps = page.getByTestId("event-list").getByRole("button")
  await expect(steps).toHaveCount(count)
  for (let index = 0; index < count; index++) {
    const title = (await steps.nth(index).locator("span").last().innerText()).trim()
    await steps.nth(index).click()
    await expect(page.getByTestId("task-detail").getByRole("heading", { name: title, exact: true })).toBeVisible()
    await page.keyboard.press("Escape")
  }
})

test("the budget keeps its item column visible while scrolling and uses an accounting double rule", async ({ page }) => {
  await page.getByTestId("view-budget").click()
  const wrap = page.getByTestId("event-budget")
  const table = wrap.locator("table")
  await expect(table).toHaveClass(/event-budget-table/)
  const item = table.locator("tbody td").first()
  await expect(item).toHaveCSS("position", "sticky")
  await expect(table.locator("tfoot th").first()).toHaveCSS("border-top-style", "double")
  await wrap.evaluate(el => { el.scrollLeft = el.scrollWidth })
  const editor = item.getByRole("textbox", { name: "Catering item", exact: true })
  const [cell, frame] = await Promise.all([editor.boundingBox(), wrap.boundingBox()])
  expect(cell!.x).toBeGreaterThanOrEqual(frame!.x)
  expect(cell!.x + cell!.width).toBeLessThanOrEqual(frame!.x + frame!.width)
  await editor.fill("Catering delivery")
  await expect(item.getByRole("textbox", { name: "Catering delivery item", exact: true })).toHaveValue("Catering delivery")
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("event and budget edits persist after reload and Reset demo restores both", async ({ page }) => {
  await page.getByLabel("Event date", { exact: true }).fill("2026-12-03")
  await page.getByTestId("view-budget").click()
  await page.getByLabel("Catering quantity", { exact: true }).fill("35")
  await page.getByLabel("Catering status", { exact: true }).selectOption("purchase_approval")
  await page.getByLabel("Event supplies status", { exact: true }).selectOption("purchase_approval")
  await expect(page.getByTestId("event-budget").locator("tfoot")).toContainText("$2,200.00")
  await page.getByTestId("view-flow").click()
  await expect(page.getByTestId("flow-node-purchaseRequest")).toHaveClass(/done/)
  await page.reload()
  await expect(page.getByLabel("Event date", { exact: true })).toHaveValue("2026-12-03")
  await expect(page.getByTestId("flow-node-purchaseRequest")).toHaveClass(/done/)
  await page.getByTestId("view-budget").click()
  await expect(page.getByLabel("Catering quantity", { exact: true })).toHaveValue("35")
  await expect(page.getByLabel("Catering status", { exact: true })).toHaveValue("purchase_approval")
  await resetDemo(page)
  await expect(page.getByLabel("Event date", { exact: true })).toHaveValue("2027-03-25")
  await expect(page.getByLabel("Catering quantity", { exact: true })).toHaveValue("30")
  await expect(page.getByLabel("Catering status", { exact: true })).toHaveValue("food_exception_permit")
})

test("every step in the second event opens", async ({ page }, info) => {
  if (info.project.name === "mobile") await page.getByLabel("Choose an event", { exact: true }).selectOption("e-speaker")
  else await page.getByRole("navigation", { name: "Events", exact: true }).getByRole("button", { name: "Spring Speaker Night", exact: true }).click()
  await closeRail(page)
  await page.getByTestId("view-list").click()
  const steps = page.getByTestId("event-list").getByRole("button")
  await expect(page.getByTestId("event-list")).toContainText("Speaker SAP Headshot")
  for (let index = 0; index < await steps.count(); index++) {
    const title = (await steps.nth(index).locator("span").last().innerText()).trim()
    await steps.nth(index).click()
    await expect(page.getByTestId("task-detail").getByRole("heading", { name: title, exact: true })).toBeVisible()
    await page.keyboard.press("Escape")
  }
})

test("keyboard Enter and Space open a flow node; Escape returns focus", async ({ page }) => {
  const node = page.getByTestId("flow-node-purchaseRequest")
  for (const key of ["Enter", "Space"]) {
    await node.focus()
    await page.keyboard.press(key)
    await expect(page.getByTestId("task-detail").getByRole("heading", { name: "Purchase Request", exact: true })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("task-detail")).toHaveCount(0)
    await expect(node).toBeFocused()
  }
})
