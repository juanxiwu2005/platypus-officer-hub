import { expect, test, type Page } from "@playwright/test"

// DX-23: the top bar is a translucent floating layer with its line only after scrolling; three shadow levels; solid fallbacks.
test.skip(({ isMobile }) => isMobile, "checked on the computer layout; the phone bar is covered by dx-20")
async function fresh(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.locator(".topbar")).toBeVisible()
}
const bar = (page: Page) => page.locator(".topbar").evaluate(el => { const c = getComputedStyle(el); return { bg: c.backgroundColor, filter: c.backdropFilter || c.getPropertyValue("-webkit-backdrop-filter"), line: c.borderBottomColor, scrolled: el.getAttribute("data-scrolled") } })
const alpha = (rgba: string) => { const m = rgba.match(/[\d.]+/g)!.map(Number); return m.length > 3 ? m[3] : 1 }

test("the bar is translucent and blurs what is under it", async ({ page }) => {
  await fresh(page)
  const b = await bar(page)
  expect(alpha(b.bg)).toBeGreaterThan(0.6)
  expect(alpha(b.bg)).toBeLessThan(1)
  expect(b.filter).toContain("blur(16px)")
})

test("the line under the bar shows only after the page has scrolled", async ({ page }) => {
  await fresh(page)
  await page.evaluate(() => { const s = document.createElement("div"); s.style.height = "3000px"; s.id = "dx23-spacer"; document.querySelector("main")!.append(s) })
  let b = await bar(page)
  expect(b.scrolled).toBe("false")
  expect(alpha(b.line)).toBe(0)
  await page.evaluate(() => window.scrollTo(0, 400))
  await expect.poll(async () => (await bar(page)).scrolled).toBe("true")
  await expect.poll(async () => alpha((await bar(page)).line)).toBeGreaterThan(0.5)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect.poll(async () => (await bar(page)).scrolled).toBe("false")
})

test.describe("solid fallbacks", () => {
  test("reduce transparency: solid, no blur, line always on", async ({ page }) => {
    await page.emulateMedia({ reducedTransparency: "reduce" } as never)
    await fresh(page)
    const supported = await page.evaluate(() => window.matchMedia("(prefers-reduced-transparency: reduce)").media !== "not all")
    // Chromium has not shipped this media query everywhere yet: where it is unknown the rule cannot be switched on by a test, so the
    // test reads the rule itself (the bar becomes the plain page colour, no blur, line always on) and checks the numbers when it can.
    const rule = await page.evaluate(() => {
      const found: string[] = []
      const walk = (list: CSSRuleList) => { for (const r of list) { if ("conditionText" in r && String((r as CSSMediaRule).conditionText).includes("prefers-reduced-transparency")) found.push(r.cssText); if ("cssRules" in r) walk((r as CSSGroupingRule).cssRules) } }
      for (const sheet of document.styleSheets) { try { walk(sheet.cssRules) } catch { /* other origin */ } }
      return found.join("\n")
    })
    expect(rule).toContain(".topbar")
    expect(rule).toContain("backdrop-filter: none")
    expect(rule).toContain("var(--surface)")
    if (supported && await page.evaluate(() => window.matchMedia("(prefers-reduced-transparency: reduce)").matches)) {
      const b = await bar(page)
      expect(alpha(b.bg)).toBe(1)
      expect(b.filter === "none" || b.filter === "").toBe(true)
    }
  })
  test("more contrast: solid, no blur, a clear line", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" } as never)
    await fresh(page)
    const b = await bar(page)
    expect(alpha(b.bg)).toBe(1)
    expect(b.filter === "none" || b.filter === "").toBe(true)
    expect(alpha(b.line)).toBeGreaterThan(0.2)
  })
})

test("three shadow levels exist and the menus use them (heavier in dark)", async ({ page }) => {
  await fresh(page)
  const light = await page.evaluate(() => { const r = getComputedStyle(document.documentElement); return { e1: r.getPropertyValue("--elev-1").trim(), e2: r.getPropertyValue("--elev-2").trim(), e3: r.getPropertyValue("--elev-3").trim() } })
  expect(light.e1).not.toBe(""); expect(light.e2).not.toBe(""); expect(light.e3).not.toBe("")
  await page.getByTestId("demo-menu").click()
  const shadow = await page.locator(".menu[role=group]").evaluate(el => getComputedStyle(el).boxShadow)
  expect(shadow).toContain("rgba(0, 0, 0, 0.1)")                       // --elev-2, light
})
test.describe("dark", () => {
  test.use({ colorScheme: "dark" })
  test("the dark shadows are heavier", async ({ page }) => {
    await fresh(page)
    await page.getByTestId("demo-menu").click()
    const shadow = await page.locator(".menu[role=group]").evaluate(el => getComputedStyle(el).boxShadow)
    expect(shadow).toContain("rgba(0, 0, 0, 0.45)")
  })
})
