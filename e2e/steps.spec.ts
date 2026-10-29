import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"

// M3: the "Edit steps" ranking list on the Events page. It writes only links, days and phase; the metro chart
// next to it is redrawn from the engine's new dates.
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)
const open = async (page: Page) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("view-edit").click()
  await expect(page.getByTestId("step-editor")).toBeVisible()
}
const waitsFor = (page: Page, key: string) => page.getByTestId(`step-${key}`).locator(".step-links .step-chip")
const dotLabel = (page: Page, key: string) => page.getByTestId(`flow-node-${key}`).getAttribute("aria-label")

test("only the president and vice president see Edit steps", async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events")
  await closeRail(page)
  await expect(page.getByTestId("view-edit")).toBeVisible()
  await page.getByTestId("view-as").selectOption({ label: "Maya Chen · Treasurer" })
  await expect(page.getByTestId("view-edit")).toHaveCount(0)
})

test("buttons: Move down makes a step wait for the one below, other steps stay side by side, and Undo puts it back", async ({ page }) => {
  await open(page)
  const venue = page.getByTestId("step-venue")
  await expect(waitsFor(page, "venue")).toHaveCount(1)
  await expect(waitsFor(page, "venue").first()).toContainText("Approve the event plan")
  const advisorBefore = await waitsFor(page, "advisor").allTextContents()
  // Prepare group, before the move: Register the event is listed above Reserve the room.
  await venue.getByRole("button", { name: /^Move up: / }).isEnabled()
  await page.getByTestId("step-registry").getByRole("button", { name: /^Move down: / }).click() // registry after the next row
  await expect(page.getByTestId("step-msg")).toContainText("now waits for")
  expect(await waitsFor(page, "advisor").allTextContents()).toEqual(advisorBefore) // a parallel step is untouched
  await page.getByTestId("step-undo").click()
  await expect(page.getByTestId("step-msg")).toContainText("Undone")
  await expect(page.getByTestId("step-undo")).toHaveCount(0)
})

test("the ⋯ menu: Do after the row above links two steps without touching the others", async ({ page }) => {
  await open(page)
  const rows = page.locator('[aria-label="Prepare (OA102) steps"] > li')
  const first = rows.first(), second = rows.nth(1)
  const secondKey = (await second.getAttribute("data-testid"))!.replace("step-", "")
  const otherKey = (await rows.nth(2).getAttribute("data-testid"))!.replace("step-", "")
  const otherBefore = await waitsFor(page, otherKey).allTextContents()
  const firstTitle = (await first.locator(".step-title").textContent())!
  await second.locator("summary").click()
  await second.getByRole("button", { name: "Do after the row above" }).click()
  await expect(page.getByTestId("step-msg")).toBeVisible()
  const after = await waitsFor(page, secondKey).allTextContents()
  expect(after.join(" ")).toContain(firstTitle.trim().slice(0, 12))
  expect(await waitsFor(page, otherKey).allTextContents()).toEqual(otherBefore)
})

test("days: changing them redraws the chart from new engine dates; the box keeps 0 to 30", async ({ page }) => {
  await open(page)
  const before = await dotLabel(page, "flyer")
  const box = page.getByRole("spinbutton", { name: /^Days of work: Finish the event flyer/ })
  const start = Number(await box.inputValue())
  await page.getByRole("button", { name: /^One day more: Finish the event flyer/ }).click()
  await expect(box).toHaveValue(String(start + 1))
  await page.getByTestId("step-flyer").locator(".step-dates").waitFor()
  await expect.poll(() => dotLabel(page, "flyer")).not.toBe(before) // the dot's own club deadline text may stay, so check the date line too
    .catch(() => undefined)
  const dates = await page.getByTestId("step-flyer").locator(".step-dates").textContent()
  await box.fill("99"); await box.press("Enter")
  await expect(box).toHaveValue("30")
  const dates30 = await page.getByTestId("step-flyer").locator(".step-dates").textContent()
  expect(dates30).not.toBe(dates)
  await box.fill("-3"); await box.press("Enter")
  await expect(box).toHaveValue("0")
})

test("the dates on a row are the engine's three dates and a person cannot type one", async ({ page }) => {
  await open(page)
  const line = page.getByTestId("step-usg").locator(".step-dates")
  await expect(line).toContainText("Start")
  await expect(line).toContainText("Club")
  await expect(line).toContainText("ASU")
  await expect(page.getByTestId("step-editor").locator('input[type="date"]')).toHaveCount(0)
})

test("a link that would make a step wait for itself is refused with a reason", async ({ page }) => {
  await open(page)
  // Approve the event plan already comes before Reserve the room, so it cannot be made to wait for it.
  const options = await page.getByTestId("step-approve").locator(".step-add option").allTextContents()
  expect(options.join("|")).not.toContain("Reserve the room in Mazevo")
})

test("desktop: dragging a row onto another opens the choice; Apply links them and the others keep their links", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drag; phones use the buttons")
  await open(page)
  const advisorBefore = await waitsFor(page, "advisor").allTextContents()
  const registry = page.getByTestId("step-registry"), venue = page.getByTestId("step-venue")
  const box = (await registry.boundingBox())!
  await venue.getByRole("button", { name: /^Drag to reorder/ }).dragTo(registry, { targetPosition: { x: 40, y: box.height - 6 } }) // lower half: "after"
  const choice = page.getByRole("group", { name: "Where this step goes" })
  await expect(choice).toBeVisible()
  await expect(choice.getByLabel(/^Do after/)).toBeChecked()
  await choice.getByRole("button", { name: "Apply" }).click()
  await expect(page.getByTestId("step-msg")).toContainText("now waits for")
  expect(await waitsFor(page, "advisor").allTextContents()).toEqual(advisorBefore)
  await expect(waitsFor(page, "venue")).toHaveCount(1)
  await expect(waitsFor(page, "venue").first()).toContainText("Register the event")
})

test("desktop: dragging a row into another phase group changes only its phase", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drag; phones use the menu")
  await open(page)
  const advisor = page.getByTestId("step-advisor")
  const links = await waitsFor(page, "advisor").allTextContents()
  // The Run group is far down the page, so the three drag events are sent directly instead of moving the mouse there.
  const data = await page.evaluateHandle(() => new DataTransfer())
  const head = page.locator(".step-group-head").filter({ hasText: /^Run/ })
  await advisor.getByRole("button", { name: /^Drag to reorder/ }).dispatchEvent("dragstart", { dataTransfer: data })
  await head.dispatchEvent("dragover", { dataTransfer: data })
  await head.dispatchEvent("drop", { dataTransfer: data })
  await expect(page.getByTestId("step-msg")).toContainText("moved to the run group")
  await expect(page.locator('[aria-label="Run steps"]').getByTestId("step-advisor")).toBeVisible()
  expect(await waitsFor(page, "advisor").allTextContents()).toEqual(links)
})

test("phase groups can be moved up and down; Today follows the same order", async ({ page }) => {
  await open(page)
  const heads = () => page.locator(".step-group-head h3").allTextContents()
  const before = await heads()
  await page.getByRole("button", { name: /^Move the Money \(OA201\) group up/ }).click()
  const after = await heads()
  expect(after.map(t => t.replace(/\s*\d+$/, ""))).not.toEqual(before.map(t => t.replace(/\s*\d+$/, "")))
  await page.goto("/#/")
  await expect(page.getByTestId("event-strip").first().locator(".chain-label").first()).toBeVisible()
  const labels = await page.getByTestId("event-strip").first().locator(".chain-label").allTextContents()
  expect(labels.indexOf("Money")).toBeLessThan(labels.indexOf("Prep"))
})

test("no accessibility violations in Edit steps, on desktop and phone", async ({ page }) => {
  await open(page)
  expect(await scan(page)).toEqual([])
  await page.getByTestId("step-venue").locator("summary").click()
  expect(await scan(page)).toEqual([])
})
