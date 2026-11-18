import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, resetDemo, viewAs } from "./helpers"

// Editing uses node actions and drag targets. Connecting lines have no click action.
test.beforeEach(async ({ page }, info) => {
  if (info.project.name !== "mobile") await page.setViewportSize({ width: 1700, height: 1000 })   // wide enough for the horizontal chart next to the side panel
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events")
  await closeRail(page)
  await expect(page.getByTestId("flow-chart")).toBeVisible()
})

const deps = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem("platypus.v1.demo")!).nodes.find((n: { id: string }) => n.id === `e-night:${k}`)?.dependsOn ?? null, key)
const dot = (page: Page, key: string) => page.getByTestId(`flow-node-${key}`)
/** Double-click on a computer; a tap on a phone (there, a tap opens the actions because the details panel would cover the chart). */
const act = async (page: Page, key: string) => { if (test.info().project.name === "mobile") await dot(page, key).click(); else await dot(page, key).dblclick() }
/** The middle of a line's hit area, on screen. */
const lineMid = (page: Page, from: string, to: string) => page.getByTestId(`flow-line-e-night:${from}-e-night:${to}`).evaluate((el: SVGPathElement) => { const p = el.getPointAtLength(el.getTotalLength() / 2), m = el.getScreenCTM()!; return { x: p.x * m.a + m.e, y: p.y * m.d + m.f } })
const center = async (page: Page, key: string) => { const b = (await dot(page, key).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }

test("only the president and vice president can edit the flow", async ({ page }) => {
  await expect(page.getByTestId("flow-edit-toggle")).toBeVisible()
  await viewAs(page, "maya")
  await expect(page.getByTestId("flow-edit-toggle")).toHaveCount(0)
})

test("drag a step onto the spot between two others: it snaps there, the order changes, Undo puts it back", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "dragging needs a mouse; phones use the double-tap menu")
  await page.getByTestId("flow-edit-toggle").click()
  const before = await deps(page, "plan")
  const [a, b, c] = [await center(page, "plan"), await center(page, "backup"), await center(page, "venuechoice")]
  expect(a.x).toBeLessThan(b.x); expect(b.x).toBeLessThan(c.x)                                           // Event Plan, Back-up Plan, Candidate Venue
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  await page.mouse.move(a.x + 40, a.y + 4, { steps: 4 })
  await page.mouse.move((b.x + c.x) / 2, b.y, { steps: 10 })                                              // between marketing needs and budget
  await expect(page.locator(".m-gap.is-near")).toHaveCount(1)                                              // the spot lights up (snap)
  await expect(page.locator(".m-ghost")).toContainText("Between “Back-up Plan")
  await page.mouse.up()
  await expect(page.getByTestId("flow-edit-msg")).toContainText("Moved “Event Plan")
  expect(await deps(page, "backup")).toEqual([])
  expect(await deps(page, "plan")).toEqual(["e-night:backup"])
  expect(await deps(page, "venuechoice")).toEqual(["e-night:plan"])
  // The compact v2 canvas preserves approximate time placement rather than forcing a strict x-order.
  // The rewritten dependency chain above is the authoritative order.
  await page.getByTestId("flow-undo").click()
  expect(await deps(page, "plan")).toEqual(before); await expect(page.getByTestId("flow-edit-msg")).toContainText("Undone")
})

test("dropping away from the line changes nothing; a plain click still opens the details", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "dragging needs a mouse")
  await page.getByTestId("flow-edit-toggle").click()
  const before = await deps(page, "plan"), a = await center(page, "plan")
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 20, 140, { steps: 8 }); await page.mouse.up()    // far from every line
  await expect(page.getByTestId("flow-edit-msg")).toContainText("nothing changed")
  expect(await deps(page, "plan")).toEqual(before)
  await dot(page, "plan").click()
  await expect(page.getByTestId("task-detail")).toContainText("Event Plan")
})

test("double-click a step: add one after it (its details open on the right), name it, then delete it", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await act(page, "budget")
  const menu = page.getByTestId("flow-menu")
  await expect(menu).toContainText("Budget")
  await menu.getByRole("button", { name: "Add a step after this one" }).click()
  await expect(page.getByTestId("task-detail")).toContainText("New step")                                  // details open for the new step
  const panel = page.getByTestId("task-detail")
  await panel.getByText("Edit", { exact: true }).click()
  await panel.getByLabel("Task name").fill("Photo release check"); await panel.getByLabel("Task name").press("Tab")
  await expect(page.getByTestId("flow-chart")).toContainText("Photo release")
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).nodes.find((n: { title: string }) => n.title === "Photo release check"))
  expect(created).toMatchObject({ eventId: "e-night", dependsOn: ["e-night:budget"], ownerId: null, estDays: 1 })
  expect(await deps(page, "foodCompliance")).toEqual([created.id])
  await closeRail(page)                                                                                     // on a phone the details panel covers the chart
  await act(page, created.id)
  await page.getByTestId("flow-menu").getByRole("button", { name: "Delete this step" }).click()
  await expect(page.getByTestId("flow-chart")).not.toContainText("Photo release")
  expect(await deps(page, "foodCompliance")).toEqual(["e-night:budget"])
  await page.getByTestId("flow-undo").click()                                                               // Undo brings it back
  await expect(page.getByTestId("flow-chart")).toContainText("Photo release")
  await page.reload()
  await closeRail(page)
  await expect(page.getByTestId("flow-chart")).toContainText("Photo release")
  expect(await deps(page, "foodCompliance")).toEqual([created.id])
})

test("Reset discards flow edits and their Undo history", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await act(page, "budget")
  await page.getByTestId("flow-menu").getByRole("button", { name: "Add a step after this one" }).click()
  await expect(page.getByTestId("task-detail").getByRole("heading", { name: "New step", exact: true })).toBeVisible()
  await closeRail(page)
  await expect(page.getByTestId("flow-undo")).toBeEnabled()
  await resetDemo(page)
  await expect(page.getByTestId("task-detail")).toHaveCount(0)
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(38)
  await expect(page.getByTestId("flow-undo")).toBeDisabled()
  await page.reload()
  await closeRail(page)
  await expect(page.getByTestId("flow-chart").locator("button.m-dot")).toHaveCount(38)
})

test("steps ASU rules need, and finished steps, cannot be deleted; the menu says why", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await act(page, "purchaseRequest")
  const menu = page.getByTestId("flow-menu")
  await expect(menu.getByRole("button", { name: "Delete this step" })).toBeDisabled()
  await expect(menu).toContainText("Cannot delete: ASU rule")
  await page.keyboard.press("Escape"); await expect(menu).toHaveCount(0)
  await act(page, "plan")
  await expect(page.getByTestId("flow-menu")).toContainText("already done")
})

test("line double-clicks and double-taps leave the graph unchanged, with hover disabled", async ({ page }, info) => {
  await page.getByTestId("flow-edit-toggle").click()
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  for (const [from, to] of [["plan", "backup"], ["foodCompliance", "quotes"], ["finalcheck", "checkin"], ["headcount", "invoice"]]) {
    const hit = page.getByTestId(`flow-line-e-night:${from}-e-night:${to}`)
    await hit.evaluate(el => el.scrollIntoView({ block: "center", inline: "center" }))
    await page.mouse.move(0, 0)
    const paint = () => hit.evaluate(el => {
      const overlay = getComputedStyle(el.nextElementSibling!)
      return [overlay.stroke, overlay.strokeWidth]
    })
    const plain = await paint()
    const m = await lineMid(page, from, to)
    expect(m.x).toBeGreaterThan(0); expect(m.x).toBeLessThan(page.viewportSize()!.width)
    expect(m.y).toBeGreaterThan(0); expect(m.y).toBeLessThan(page.viewportSize()!.height)
    await page.mouse.move(m.x, m.y)
    expect(await paint()).toEqual(plain)
    await expect(hit).toHaveCSS("cursor", "default")
    if (info.project.name === "mobile") { await page.touchscreen.tap(m.x, m.y); await page.touchscreen.tap(m.x, m.y) }
    else await page.mouse.dblclick(m.x, m.y)
    await expect(page.getByTestId("flow-menu")).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  }
  await expect(page.getByTestId("flow-undo")).toBeDisabled()
  await dot(page, "budget").scrollIntoViewIfNeeded()
  await act(page, "budget")
  const menu = page.getByTestId("flow-menu")
  await expect(menu.getByRole("button", { name: "Add a step before this one" })).toBeEnabled()
  await expect(menu.getByRole("button", { name: "Add a step after this one" })).toBeEnabled()
  await expect(menu.getByText("Stop waiting for…")).toHaveCount(0)
})

test("keyboard: Alt + arrow moves a step one place; the menu key opens the actions", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await dot(page, "plan").focus(); await page.keyboard.press("Alt+ArrowRight")
  await expect(page.getByTestId("flow-edit-msg")).toContainText("Moved “Event Plan")
  expect(await deps(page, "plan")).toEqual(["e-night:backup"])
  await dot(page, "budget").focus(); await page.keyboard.press("Shift+F10")
  await expect(page.getByTestId("flow-menu")).toContainText("Budget")
})

test("no accessibility violations while editing, and with the action menu open", async ({ page }) => {
  const scan = async () => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(x => `${x.id}: ${x.nodes.map(n => n.target.join(" ")).join(" | ")}`)
  await page.getByTestId("flow-edit-toggle").click()
  expect(await scan()).toEqual([])
  await act(page, "budget")
  await expect(page.getByTestId("flow-menu")).toBeVisible()
  expect(await scan()).toEqual([])
})
