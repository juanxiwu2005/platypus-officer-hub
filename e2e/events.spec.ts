import { expect, test } from "@playwright/test"
import { closeRail, noOverflow, resetDemo } from "./helpers"
import { savedTask } from "./taskHelpers"
import { fmtShort } from "../src/lib/dates"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events?event=e-night")
  await closeRail(page)
  await page.getByTestId("view-flow").click()
})

for (const version of [17, 18, 19]) test(`Spring Speaker Night's event plan is Done for fresh and saved v${version} demos`, async ({ page }) => {
  await page.goto("/#/events?event=e-speaker")
  await expect(page.getByTestId("flow-node-plan")).toHaveClass(/done/)
  await expect(page.getByTestId("flow-node-backup")).not.toHaveClass(/done/)
  await page.evaluate((savedVersion) => {
    const saved = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    saved.schemaVersion = savedVersion
    saved.org.mission = "Keep my saved club notes"
    const plan = saved.nodes.find((node: { id: string }) => node.id === "e-speaker:plan")
    plan.status = "accepted"
    delete plan.completedOn
    localStorage.setItem("platypus.v1.demo", JSON.stringify(saved))
  }, version)
  await page.reload()
  await expect(page.getByTestId("flow-node-plan")).toHaveClass(/done/)
  await expect(page.getByTestId("flow-node-backup")).not.toHaveClass(/done/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.mission)).toBe("Keep my saved club notes")
  await page.reload()
  await expect(page.getByTestId("flow-node-plan")).toHaveClass(/done/)
})

test("the flow chart opens the shared task detail with one Due and retains its official deadline", async ({ page }) => {
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
  // The shared detail shows one Due. The official limit remains in the rule data. FB-6: the calibrated window
  // opens 30 days before the Mar 25 event and is due with Budget Approval, 18 days before (Sun Mar 7 → Fri Mar 5); ASU (R09) Thu Mar 11.
  const saved = await savedTask(page, "e-night:purchaseRequest")
  expect([saved.latestStart, saved.clubDeadline, saved.officialDeadline]).toEqual(["2027-02-23", "2027-03-05", "2027-03-11"])
  await expect(panel.getByTestId("task-due").locator("strong")).toHaveText(fmtShort(saved.clubDeadline!))
  await expect(panel.locator(".td-head")).not.toContainText(/Start by|Club deadline|ASU/)
  await expect(panel.getByRole("navigation", { name: "External task links" }).getByRole("link").first()).toHaveAttribute("href", /^https:/)
  expect((await savedTask(page, "e-night:purchaseRequest")).officialDeadline).toBe(saved.officialDeadline)
  await page.keyboard.press("Escape")
  await expect(panel).toHaveCount(0)
})

test("a pointer hovers a step; touch opens its details with the same Due", async ({ page }, info) => {
  const node = page.getByTestId("flow-node-purchaseRequest")
  const saved = await savedTask(page, "e-night:purchaseRequest")
  if (info.project.name === "desktop") {
    await node.hover()
    const card = node.locator("xpath=..").locator(".m-card")
    await expect(card).toBeVisible()
    await expect(card).toContainText("Purchase Request")
    await expect(card).toContainText(`Due ${fmtShort(saved.clubDeadline!)}`)
    await expect(card).not.toContainText("ASU deadline")
  } else {
    await node.tap()
    await expect(page.getByTestId("task-detail").getByTestId("task-due").locator("strong")).toHaveText(fmtShort(saved.clubDeadline!))
  }
})

test("moving an upstream due date later reschedules its dependants and flags the rule break in red", async ({ page }) => {
  await page.getByLabel("Event date", { exact: true }).fill("2026-11-19")
  await page.goto("/#/tasks")
  await page.getByRole("button", { name: "Table", exact: true }).click()
  await page.getByLabel("Task scope").selectOption("team")
  // FB-6: a link between calibrated steps means finish order, so Purchase Request moves to Budget Approval's new date. Thu Nov 5 is
  // after the R09 deadline (Wed Nov 4), so the rule break is red. FB-4: the label is "Due for …" and the one date shown is Due.
  await page.getByLabel("Due for Budget Approval", { exact: true }).fill("2026-11-05")
  await page.goto("/#/events?event=e-night")
  await page.getByTestId("flow-node-purchaseRequest").click()
  const panel = page.getByTestId("task-detail")
  const moved = await savedTask(page, "e-night:purchaseRequest")
  expect(moved.clubDeadline).toBe("2026-11-05")
  await expect(panel.getByTestId("task-due").locator("strong")).toHaveText(fmtShort(moved.clubDeadline!))
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
  const replanned = await savedTask(page, "e-night:purchaseRequest")
  const detail = page.getByTestId("task-detail")
  await expect(detail.getByTestId("task-due").locator("strong")).toHaveText(fmtShort(replanned.clubDeadline!))
  expect(replanned.officialDeadline).not.toBeNull()
  await closeRail(page)
  await page.getByTestId("view-list").click()
  const row = page.getByTestId("event-step-e-night:purchaseRequest").locator("xpath=ancestor::tr")
  await expect(row).toContainText(fmtShort(replanned.clubDeadline!))
  await row.getByTestId("event-step-e-night:purchaseRequest").click()
  await expect(page.getByTestId("task-detail").getByTestId("task-due").locator("strong")).toHaveText(fmtShort(replanned.clubDeadline!))
})

test("the list view opens every step from the same event as the Flow", async ({ page }) => {
  const count = await page.getByTestId("flow-chart").locator("button.m-dot").count()
  await page.getByTestId("view-list").click()
  const steps = page.getByTestId("event-list").getByRole("button")
  await expect(steps).toHaveCount(count)
  for (let index = 0; index < count; index++) {
    const title = (await steps.nth(index).locator("span").last().innerText()).trim()
    await steps.nth(index).click()
    // The details take focus once they are ready for keys; pressing Escape before that would race their first render.
    const heading = page.getByTestId("task-detail").getByRole("heading", { name: title, exact: true })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("task-detail")).toHaveCount(0)
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
    // The details take focus once they are ready for keys; pressing Escape before that would race their first render.
    const heading = page.getByTestId("task-detail").getByRole("heading", { name: title, exact: true })
    await expect(heading).toBeVisible()
    await expect(heading).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("task-detail")).toHaveCount(0)
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
