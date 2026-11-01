import { expect, test, type Page } from "@playwright/test"

// DX-19: a new page fades in (no slide, no exit); a different item in the right-hand Details fades in; Reduce Motion: neither.
test.skip(({ isMobile }) => isMobile, "uses the docked panel and the side navigation")
async function fresh(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
}

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  test("moving to another page fades its content in, with no slide", async ({ page }) => {
    await fresh(page)
    expect(await page.locator("main").evaluate(el => el.className)).toBe("")          // not on the first load
    const frames = await page.evaluate(async () => {
      const out: { o: number; y: number; cls: string }[] = []
      ;(document.querySelector(".sidenav a[href$='/team']") as HTMLElement).click()
      const t0 = performance.now()
      while (performance.now() - t0 < 500) {
        const first = document.querySelector("main > *") as HTMLElement | null
        if (first) { const cs = getComputedStyle(first); out.push({ o: Math.round(parseFloat(cs.opacity) * 100) / 100, y: Math.round(new DOMMatrix(cs.transform).m42), cls: document.querySelector("main")!.className }) }
        await new Promise(requestAnimationFrame)
      }
      return out
    })
    expect(frames.some(f => f.o > 0.05 && f.o < 0.95 && f.cls === "route-enter")).toBe(true)
    expect(frames.every(f => f.y === 0)).toBe(true)                                   // opacity only
    expect(frames[frames.length - 1]).toMatchObject({ o: 1, cls: "" })                // done, and the class is gone again
  })
  test("things that appear inside a page later do not fade", async ({ page }) => {
    await fresh(page)
    await page.goto("/#/tasks")
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Table" }).click()
    expect(await page.locator("main").evaluate(el => el.className)).toBe("")
  })
  test("a different task in Details fades in; the same one does not replay", async ({ page }) => {
    await fresh(page)
    const rows = page.getByTestId("risk-list").locator("button.row-btn")
    await rows.nth(0).click()
    await expect(page.locator(".detail-scroll")).toBeVisible()
    await page.waitForTimeout(400)
    const swap = await page.evaluate(async () => {
      const out: number[] = []
      ;(document.querySelectorAll("[data-testid=risk-list] button.row-btn")[1] as HTMLElement).click()
      const t0 = performance.now()
      while (performance.now() - t0 < 400) {
        const el = document.querySelector(".detail-scroll > :not(.detail-bar)") as HTMLElement | null
        if (el) out.push(Math.round(parseFloat(getComputedStyle(el).opacity) * 100) / 100)
        await new Promise(requestAnimationFrame)
      }
      return out
    })
    expect(swap.some(o => o > 0.05 && o < 0.95)).toBe(true)
    expect(swap[swap.length - 1]).toBe(1)
    // Pressing the same row again must not fade it again (the content is not rebuilt).
    const again = await page.evaluate(async () => {
      const out: number[] = []
      ;(document.querySelectorAll("[data-testid=risk-list] button.row-btn")[1] as HTMLElement).click()
      for (let i = 0; i < 12; i++) { const el = document.querySelector(".detail-scroll > :not(.detail-bar)") as HTMLElement | null; if (el) out.push(parseFloat(getComputedStyle(el).opacity)); await new Promise(requestAnimationFrame) }
      return out
    })
    expect(again.every(o => o === 1)).toBe(true)
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("neither fades", async ({ page }) => {
    await fresh(page)
    await page.locator(".sidenav a", { hasText: "Team" }).click()
    expect(await page.locator("main > *").first().evaluate(el => getComputedStyle(el).animationName)).not.toContain("dx-fade-in")
    await page.goto("/#/")
    await page.getByTestId("risk-list").locator("button.row-btn").first().click()
    expect(await page.locator(".detail-scroll > :not(.detail-bar)").first().evaluate(el => getComputedStyle(el).animationName)).not.toContain("dx-fade-in")
  })
})
