import { expect, test, type Page } from "@playwright/test"

// DX-10: the Demo menu and the bell menu fade and grow in, leave a little faster, and stay correct for keyboard and screen reader.
const sampleOpacity = (page: Page, click: string, menu: string, ms = 400) => page.evaluate(async ({ click, menu, ms }) => {
  const out: { o: number; display: string; hidden: boolean }[] = []
  ;(document.querySelector(click) as HTMLElement).click()
  const t0 = performance.now()
  while (performance.now() - t0 < ms) {
    const m = document.querySelector(menu) as HTMLElement
    const cs = getComputedStyle(m)
    out.push({ o: Math.round(parseFloat(cs.opacity) * 100) / 100, display: cs.display, hidden: m.hidden })
    await new Promise(requestAnimationFrame)
  }
  return out
}, { click, menu, ms })

async function fresh(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("demo-menu")).toBeVisible()
}

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } })
  for (const [name, button, menu] of [["Demo menu", "[data-testid=demo-menu]", ".menu[role=group]"], ["bell menu", "[data-testid=bell]", ".menu.wide"]] as const) {
    test(`${name} fades in and out`, async ({ page }) => {
      await fresh(page)
      const opening = await sampleOpacity(page, button, menu)
      expect(opening.some(s => s.o > 0.05 && s.o < 0.95)).toBe(true)  // seen part-way
      expect(opening[opening.length - 1].o).toBe(1)
      expect(opening[opening.length - 1].display).not.toBe("none")
      const closing = await sampleOpacity(page, button, menu)
      // The attribute flips as soon as React has rendered (the first frame after the click can still show the old state).
      const flipped = closing.findIndex(s => s.hidden)
      expect(flipped).toBeGreaterThanOrEqual(0)
      expect(flipped).toBeLessThan(4)
      // Right after it flips the menu is still painted, and fades: a screen reader already sees it closed, a sighted person sees it leave.
      expect(closing.some(s => s.hidden && s.display !== "none" && s.o > 0.05 && s.o < 0.95)).toBe(true)
      expect(closing[closing.length - 1].display).toBe("none")
    })
  }
  test("leaving is quicker than arriving", async ({ page }) => {
    await fresh(page)
    await page.getByTestId("demo-menu").click()
    await expect(page.getByTestId("reset-demo")).toBeVisible()
    const t = await page.evaluate(() => { const m = document.querySelector(".menu[role=group]") as HTMLElement; const open = getComputedStyle(m).transitionDuration; m.hidden = true; return { open, closed: getComputedStyle(m).transitionDuration } })
    const ms = (s: string) => { const first = s.split(",")[0].trim(); return first.endsWith("ms") ? parseFloat(first) : parseFloat(first) * 1000 }
    expect(ms(t.closed)).toBeLessThan(ms(t.open))
  })
  test("clicking away and Escape still close it", async ({ page }) => {
    await fresh(page)
    await page.getByTestId("demo-menu").click()
    await expect(page.getByTestId("reset-demo")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("reset-demo")).toBeHidden()
    await page.getByTestId("demo-menu").click()
    await page.getByRole("heading", { level: 1 }).click()
    await expect(page.getByTestId("reset-demo")).toBeHidden()
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("the menu is simply there or not", async ({ page }) => {
    await fresh(page)
    await page.getByTestId("demo-menu").click()
    expect(await page.getByTestId("reset-demo").isVisible()).toBe(true)
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("reset-demo")).toBeHidden()
  })
})
