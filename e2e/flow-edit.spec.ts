import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"

// Editing the event's flow right on the chart: drag a step onto a spot between two steps, double-click a step or a line.
test.beforeEach(async ({ page }, info) => {
  if (info.project.name !== "mobile") await page.setViewportSize({ width: 1700, height: 1000 })   // wide enough for the horizontal chart next to the side panel
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events")
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
  await page.getByTestId("view-as").selectOption("maya")
  await expect(page.getByTestId("flow-edit-toggle")).toHaveCount(0)
})

test("drag a step onto the spot between two others: it snaps there, the order changes, Undo puts it back", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "dragging needs a mouse; phones use the double-tap menu")
  await page.getByTestId("flow-edit-toggle").click()
  const before = await deps(page, "draft")
  const [a, b, c] = [await center(page, "draft"), await center(page, "mktneeds"), await center(page, "budget")]
  expect(a.x).toBeLessThan(b.x); expect(b.x).toBeLessThan(c.x)                                           // today: event plan, marketing needs, budget
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  await page.mouse.move(a.x + 40, a.y + 4, { steps: 4 })
  await page.mouse.move((b.x + c.x) / 2, b.y, { steps: 10 })                                              // between marketing needs and budget
  await expect(page.locator(".m-gap.is-near")).toHaveCount(1)                                              // the spot lights up (snap)
  await expect(page.locator(".m-ghost")).toContainText("Between “List marketing needs")
  await page.mouse.up()
  await expect(page.getByTestId("flow-edit-msg")).toContainText("Moved “Draft the event plan")
  expect(await deps(page, "mktneeds")).toEqual([])                                                         // marketing needs is first now
  expect(await deps(page, "draft")).toEqual(["e-night:mktneeds"])
  expect(await deps(page, "budget")).toEqual(["e-night:draft"])
  const [a2, b2, c2] = [await center(page, "draft"), await center(page, "mktneeds"), await center(page, "budget")]
  expect(b2.x).toBeLessThan(a2.x); expect(a2.x).toBeLessThan(c2.x)                                         // the chart re-sorted itself: 2nd, 1st, 3rd
  await page.getByTestId("flow-undo").click()
  expect(await deps(page, "draft")).toEqual(before); await expect(page.getByTestId("flow-edit-msg")).toContainText("Undone")
})

test("dropping away from the line changes nothing; a plain click still opens the details", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "dragging needs a mouse")
  await page.getByTestId("flow-edit-toggle").click()
  const before = await deps(page, "draft"), a = await center(page, "draft")
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 20, 140, { steps: 8 }); await page.mouse.up()    // far from every line
  await expect(page.getByTestId("flow-edit-msg")).toContainText("nothing changed")
  expect(await deps(page, "draft")).toEqual(before)
  await dot(page, "draft").click()
  await expect(page.getByTestId("node-panel")).toContainText("Draft the event plan")
})

test("double-click a step: add one after it (its details open on the right), name it, then delete it", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await act(page, "budget")
  const menu = page.getByTestId("flow-menu")
  await expect(menu).toContainText("Build the budget")
  await menu.getByRole("button", { name: "Add a step after this one" }).click()
  await expect(page.getByTestId("node-panel")).toContainText("New step")                                  // details open for the new step
  const panel = page.getByTestId("node-panel")
  await panel.getByLabel("Step name").fill("Photo release check"); await panel.getByLabel("Step name").press("Enter")
  await expect(page.getByTestId("flow-chart")).toContainText("Photo release")
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).nodes.find((n: { title: string }) => n.title === "Photo release check"))
  expect(created).toMatchObject({ eventId: "e-night", dependsOn: ["e-night:budget"], ownerId: null, estDays: 1 })
  expect(await deps(page, "approve")).toEqual([created.id])                                                 // it sits between budget and approve
  await closeRail(page)                                                                                     // on a phone the details panel covers the chart
  await act(page, created.id)
  await page.getByTestId("flow-menu").getByRole("button", { name: "Delete this step" }).click()
  await expect(page.getByTestId("flow-chart")).not.toContainText("Photo release")
  expect(await deps(page, "approve")).toEqual(["e-night:budget"])                                           // and everything is wired as before
  await page.getByTestId("flow-undo").click()                                                               // Undo brings it back
  await expect(page.getByTestId("flow-chart")).toContainText("Photo release")
})

test("steps ASU rules need, and finished steps, cannot be deleted; the menu says why", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await act(page, "usg")
  const menu = page.getByTestId("flow-menu")
  await expect(menu.getByRole("button", { name: "Delete this step" })).toBeDisabled()
  await expect(menu).toContainText("Cannot delete: ASU rule")
  await page.keyboard.press("Escape"); await expect(menu).toHaveCount(0)
  await act(page, "mktneeds")
  await expect(page.getByTestId("flow-menu")).toContainText("already done")
})

test("double-click a line: cut the link, or join two steps that are not linked", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "the line's position is computed for the wide layout")
  await page.getByTestId("flow-edit-toggle").click()
  let m = await lineMid(page, "draft", "mktneeds")
  await page.mouse.dblclick(m.x, m.y)
  await expect(page.getByTestId("flow-menu")).toContainText("Remove the link")
  await page.getByTestId("flow-menu").getByRole("button", { name: /Remove the link/ }).click()
  expect(await deps(page, "mktneeds")).toEqual([])
  await expect(page.getByTestId("flow-edit-msg")).toContainText("no longer waits")
  await page.getByTestId("flow-undo").click()
  expect(await deps(page, "mktneeds")).toEqual(["e-night:draft"])
  // Two neighbours on a line that do not really wait for each other: the menu says so and offers to join them.
  m = await lineMid(page, "foodex", "usg")
  await page.mouse.dblclick(m.x, m.y)
  await expect(page.getByTestId("flow-menu")).toContainText("not linked")
  await page.getByTestId("flow-menu").getByRole("button", { name: /Make .* wait for/ }).click()
  expect(await deps(page, "usg")).toContain("e-night:foodex")
  // A step can also be added right on a line.
  m = await lineMid(page, "budget", "approve")
  await page.mouse.dblclick(m.x, m.y)
  await page.getByTestId("flow-menu").getByRole("button", { name: "Add a step here" }).click()
  await expect(page.getByTestId("node-panel")).toContainText("New step")
})

test("keyboard: Alt + arrow moves a step one place; the menu key opens the actions", async ({ page }) => {
  await page.getByTestId("flow-edit-toggle").click()
  await dot(page, "draft").focus(); await page.keyboard.press("Alt+ArrowRight")
  await expect(page.getByTestId("flow-edit-msg")).toContainText("Moved “Draft the event plan")
  expect(await deps(page, "draft")).toEqual(["e-night:mktneeds"])
  await dot(page, "budget").focus(); await page.keyboard.press("Shift+F10")
  await expect(page.getByTestId("flow-menu")).toContainText("Build the budget")
})

test("no accessibility violations while editing, and with the action menu open", async ({ page }, info) => {
  const scan = async () => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(x => `${x.id}: ${x.nodes.map(n => n.target.join(" ")).join(" | ")}`)
  await page.getByTestId("flow-edit-toggle").click()
  expect(await scan()).toEqual([])
  await act(page, "budget")
  await expect(page.getByTestId("flow-menu")).toBeVisible()
  // On a phone the open menu floats over small dots that sit close together; axe's target-size rule reads that overlap as a violation. The menu itself is checked there too.
  const found = await scan()
  expect(info.project.name === "mobile" ? found.filter(v => !v.startsWith("target-size: button[data-testid=\"flow-node-")) : found).toEqual([])
})
