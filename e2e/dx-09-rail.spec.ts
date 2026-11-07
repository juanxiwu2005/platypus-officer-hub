import { expect, test, type Page } from "@playwright/test"

// DX-09: the side panel slides (below 1200px) or fades (wide) in and out, the same road both ways, it can be turned
// around mid-way, and the page underneath is usable the moment it starts to leave. With Reduce Motion it just appears.
async function fresh(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
}
const closeRailNow = async (page: Page) => {
  const hide = page.getByRole("button", { name: "Hide side panel" })
  if (await hide.isVisible()) { await hide.click(); await expect(page.getByTestId("rail")).toHaveCount(0) }
}
/** Click something, then read the panel's x-offset or opacity once per frame until it settles or goes away. */
async function record(page: Page, click: string, what: "x" | "opacity", ms = 700) {
  return page.evaluate(async ({ click, what, ms }) => {
    const out: (number | null)[] = []
    ;(document.querySelector(click) as HTMLElement).click()
    const t0 = performance.now()
    while (performance.now() - t0 < ms) {
      const r = document.querySelector("[data-testid=rail]")
      const cs = r && getComputedStyle(r)
      out.push(cs ? (what === "x" ? Math.round(new DOMMatrix(cs.transform).m41) : Math.round(parseFloat(cs.opacity) * 100) / 100) : null)
      await new Promise(requestAnimationFrame)
    }
    return out
  }, { click, what, ms })
}

test.describe("floating panel (below 1200px)", () => {
  test.use({ viewport: { width: 1000, height: 800 }, reducedMotion: "no-preference" })

  test("slides in from the right and leaves the same way", async ({ page }) => {
    await fresh(page)
    await closeRailNow(page)
    const inn = (await record(page, ".ask-fab", "x")).filter((v): v is number => v !== null)
    expect(inn[0]).toBeGreaterThan(300)          // starts off to the right (the panel is 420px wide)
    expect(inn[inn.length - 1]).toBe(0)          // ends in place
    expect(inn.some(v => v > 10 && v < 410)).toBe(true) // and was seen on the way
    for (let i = 1; i < inn.length; i++) expect(inn[i]).toBeLessThanOrEqual(inn[i - 1] + 1) // never moves backwards
    const out = await record(page, "[aria-label='Hide side panel']", "x")
    const seen = out.filter((v): v is number => v !== null)
    expect(seen.some(v => v > 10 && v < 410)).toBe(true) // slides back out, not a jump
    expect(out[out.length - 1]).toBeNull()               // and is gone afterwards
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1] - 1)
  })

  test("the page under the panel is usable the moment it starts to leave", async ({ page }) => {
    await fresh(page)
    await closeRailNow(page)
    await page.locator(".ask-fab").click()
    await expect(page.getByTestId("rail")).toBeVisible()
    await page.getByRole("button", { name: "Hide side panel" }).click()
    // No waiting for the animation: the covered parts of the page must already be switched back on.
    const inert = await page.evaluate(() => ["#main", "nav.sidenav", "header.topbar"].map(s => document.querySelector(s)?.hasAttribute("inert")))
    expect(inert).toEqual([false, false, false])
    await expect(page.getByTestId("rail")).toHaveCount(0)
  })

  test("turning around mid-way reverses from where it is", async ({ page }) => {
    await fresh(page)
    await closeRailNow(page)
    const xs = await page.evaluate(async () => {
      const out: number[] = []
      const x = () => { const r = document.querySelector("[data-testid=rail]"); return r ? Math.round(new DOMMatrix(getComputedStyle(r).transform).m41) : -1 }
      const frame = () => new Promise(requestAnimationFrame)
      ;(document.querySelector(".ask-fab") as HTMLElement).click()
      while (!(x() > 0 && x() < 380)) await frame()      // wait until it is clearly on its way in
      out.push(x())
      ;(document.querySelector("[aria-label='Hide side panel']") as HTMLElement).click() // turn around
      for (let i = 0; i < 4; i++) { await frame(); out.push(x()) }
      return out
    })
    expect(xs[0]).toBeGreaterThan(0)
    expect(xs[1]).toBeGreaterThanOrEqual(xs[0] - 40) // continues from about the same place (no jump back to 100% or to 0)
    expect(xs[xs.length - 1]).toBeGreaterThan(xs[0] - 1) // and heads back out
    await expect(page.getByTestId("rail")).toHaveCount(0)
  })
})

test.describe("docked panel (wide)", () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" })
  test("fades in and out", async ({ page }) => {
    await fresh(page)
    await expect(page.getByTestId("rail")).toBeVisible()          // open when the page loads, no entrance
    const out = await record(page, "[data-testid=ask-toggle]", "opacity")
    const seen = out.filter((v): v is number => v !== null)
    expect(seen.some(v => v > 0.05 && v < 0.95)).toBe(true)
    expect(out[out.length - 1]).toBeNull()
    const inn = (await record(page, "[data-testid=ask-toggle]", "opacity")).filter((v): v is number => v !== null)
    expect(inn[0]).toBeLessThan(0.5)
    expect(inn[inn.length - 1]).toBe(1)
  })
})

test.describe("Reduce Motion", () => {
  test.use({ viewport: { width: 1000, height: 800 }, reducedMotion: "reduce" })
  test("the panel is there when opened and gone when closed, at once", async ({ page }) => {
    await fresh(page)
    await closeRailNow(page)
    await page.locator(".ask-fab").click()
    expect(await page.getByTestId("rail").count()).toBe(1)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-testid=rail]")!).transform)).toBe("none")
    await page.getByRole("button", { name: "Hide side panel" }).click()
    expect(await page.getByTestId("rail").count()).toBe(0)
  })
})

test.describe("safe areas and viewport units", () => {
  // In a desktop browser the safe area is 0 and 100vh equals 100dvh, so the numbers cannot tell old from new. The rules can.
  test("the Ask button leaves room for the home indicator and the docked panel uses the visible height", async ({ page }) => {
    await fresh(page)
    const rules = await page.evaluate(() => {
      const texts: string[] = []
      const walk = (list: CSSRuleList) => { for (const r of list) { texts.push(r.cssText); if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules) } }
      for (const sheet of document.styleSheets) { try { walk(sheet.cssRules) } catch { /* cross-origin sheet */ } }
      return texts
    })
    expect(rules.some(t => t.includes(".ask-fab") && t.includes("env(safe-area-inset-bottom)"))).toBe(true)
    expect(rules.some(t => t.includes(".rail") && t.includes("100dvh"))).toBe(true)
  })
  test("the docked panel is as tall as the visible window minus the bars", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await fresh(page)
    const h = await page.getByTestId("rail").evaluate(el => Math.round(el.getBoundingClientRect().height))
    expect(h).toBe(900 - 56 - 28)
  })
})
