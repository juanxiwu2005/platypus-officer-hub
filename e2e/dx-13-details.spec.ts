import { expect, test, type Page } from "@playwright/test"

// DX-13: a <details> opens and closes by growing and shrinking, not by jumping. Reduce Motion: it jumps, as before.
async function plant(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => {
    const d = document.createElement("details")
    d.id = "dx13"
    d.innerHTML = '<summary>More</summary><div style="height:160px">content</div>'
    document.body.append(d)
  })
}
const heights = (page: Page, open: boolean) => page.evaluate(async open => {
  const d = document.querySelector("#dx13") as HTMLDetailsElement
  const out: number[] = []
  d.open = open
  const t0 = performance.now()
  while (performance.now() - t0 < 500) { out.push(Math.round(d.getBoundingClientRect().height)); await new Promise(requestAnimationFrame) }
  return out
}, open)

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  test("opening grows and closing shrinks through in-between heights", async ({ page }) => {
    await plant(page)
    const closed = (await page.locator("#dx13").boundingBox())!.height
    const grow = await heights(page, true)
    expect(grow[grow.length - 1]).toBeGreaterThan(closed + 150)
    expect(grow.some(h => h > closed + 10 && h < grow[grow.length - 1] - 10)).toBe(true)
    const shrink = await heights(page, false)
    expect(shrink.some(h => h > closed + 10 && h < grow[grow.length - 1] - 10)).toBe(true)
    expect(Math.abs(shrink[shrink.length - 1] - closed)).toBeLessThan(2)
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("it jumps to the final height", async ({ page }) => {
    await plant(page)
    const closed = (await page.locator("#dx13").boundingBox())!.height
    const grow = await heights(page, true)
    expect(grow.filter(h => h > closed + 10 && h < closed + 150)).toEqual([])
  })
})

test("a real disclosure in the app still opens and shows its content", async ({ page }) => {
  await page.goto("/#/events")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByTestId("view-flow").click()
  // The shared task details keep one disclosure, Schedule notes, for a step with a real schedule problem. Moving the
  // event this close to the demo day leaves Purchase Request with one (the dates still come from the rule engine).
  await page.getByLabel("Event date", { exact: true }).fill("2026-11-10")
  await page.getByTestId("flow-node-purchaseRequest").click()
  const notes = page.getByTestId("task-detail").locator("details.task-schedule-notes")
  const summary = notes.locator("> summary")
  await expect(summary).toBeVisible()
  await expect(summary).toContainText("Schedule notes")
  await expect(notes.locator("li").first()).toBeHidden()
  await summary.click()
  await expect(notes).toHaveAttribute("open", "")
  await expect(notes.locator("li").first()).toBeVisible()
})
