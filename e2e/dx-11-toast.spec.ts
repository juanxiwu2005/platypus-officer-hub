import { expect, test, type Page } from "@playwright/test"
import { openDemoMenu } from "./helpers"

// DX-11: the "Demo data reset" message rises and fades in, stays 2.4 seconds, fades out and is removed. One at a time.
async function reset(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await openDemoMenu(page)
  const button = page.getByTestId("reset-demo")
  await button.click()
  await button.click()   // asks twice before it wipes anything
}
const toast = (page: Page) => page.locator(".toast")

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } })
  test("rises and fades in, waits, fades out and is removed", async ({ page }) => {
    await page.goto("/#/")
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await openDemoMenu(page)
    const frames = await page.evaluate(async () => {
      const out: { o: number; y: number; state: string | null }[] = []
      const button = document.querySelector("[data-testid=reset-demo]") as HTMLElement
      const frame = () => new Promise(requestAnimationFrame)
      button.click(); await frame(); await frame()   // the first click only arms the button; React needs a frame to show that
      button.click()
      const t0 = performance.now()
      while (performance.now() - t0 < 3100) {
        const el = document.querySelector(".toast")
        if (el) { const cs = getComputedStyle(el); out.push({ o: Math.round(parseFloat(cs.opacity) * 100) / 100, y: Math.round(new DOMMatrix(cs.transform).m42), state: el.getAttribute("data-state") }) }
        else out.push({ o: -1, y: 0, state: null })
        await new Promise(requestAnimationFrame)
      }
      return out
    })
    const present = frames.filter(f => f.state !== null)
    expect(present.some(f => f.o > 0.05 && f.o < 0.95 && f.state === "open")).toBe(true)   // seen on its way in
    expect(present.some(f => f.y > 0 && f.y < 8)).toBe(true)                                // and rising
    expect(present.some(f => f.o === 1 && f.y === 0)).toBe(true)                            // sits still
    expect(present.some(f => f.state === "closed" && f.o > 0.05 && f.o < 0.95)).toBe(true) // fades out
    expect(frames[frames.length - 1].state).toBeNull()                                      // and goes away
  })
  test("a second message does not stack a second toast", async ({ page }) => {
    await reset(page)
    await expect(toast(page)).toHaveCount(1)
    await openDemoMenu(page)
    const button = page.getByTestId("reset-demo")
    await button.click(); await button.click()
    expect(await toast(page).count()).toBe(1)
  })
  test("on a phone it is narrower than the screen and clears the Ask button", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 })
    await reset(page)
    const box = await toast(page).boundingBox()
    expect(box!.width).toBeLessThanOrEqual(390 - 96 + 1)
    expect(box!.x + box!.width).toBeLessThan(390 - 18 - 52) // the round Ask button starts at x=320: the real message stops short of it
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("it is simply there for a moment, then gone", async ({ page }) => {
    await reset(page)
    await expect(toast(page)).toHaveText("Demo data reset")
    expect(await toast(page).evaluate(el => getComputedStyle(el).transform)).toMatch(/^matrix\(1, 0, 0, 1, /)
    await expect(toast(page)).toHaveCount(0, { timeout: 4000 })
  })
})
