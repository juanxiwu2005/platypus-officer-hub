import { expect, test, type Page } from "@playwright/test"

// DX-14: the loading placeholder is empty for the first 150ms, then grey blocks fade in; the words stay for a screen reader.
async function plant(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => {
    const s = document.createElement("section")
    s.id = "dx14"; s.className = "route-loading"; s.setAttribute("aria-label", "Loading content")
    s.innerHTML = '<p role="status" aria-live="polite" aria-atomic="true">Loading details…</p>'
    document.body.append(s)
  })
}
test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  test("nothing at first, then the blocks fade in", async ({ page }) => {
    await plant(page)
    const samples = await page.evaluate(async () => {
      const el = document.querySelector("#dx14")!
      const out: { t: number; o: number }[] = []
      const t0 = performance.now()
      el.remove(); document.body.append(el)           // start the clock again, as if it had just appeared
      while (performance.now() - t0 < 600) { out.push({ t: Math.round(performance.now() - t0), o: Math.round(parseFloat(getComputedStyle(el, "::before").opacity) * 100) / 100 }); await new Promise(requestAnimationFrame) }
      return out
    })
    expect(samples.filter(s => s.t < 120).every(s => s.o === 0)).toBe(true)  // no flash for a fast load
    expect(samples.some(s => s.t > 160 && s.o > 0.05 && s.o < 0.95)).toBe(true) // then it fades in
    expect(samples[samples.length - 1].o).toBe(1)
  })
})
test("the words stay for a screen reader and are hidden from the eye", async ({ page }) => {
  await plant(page)
  await expect(page.getByRole("status").filter({ hasText: "Loading details…" })).toHaveCount(1)
  const box = await page.locator("#dx14 > p").boundingBox()
  expect(box!.width).toBeLessThanOrEqual(1)
  expect(await page.locator("#dx14").evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(320)
})
test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("the blocks are there almost at once", async ({ page }) => {
    await plant(page)
    await page.waitForTimeout(150)
    expect(await page.locator("#dx14").evaluate(el => getComputedStyle(el, "::before").opacity)).toBe("1")
  })
})
