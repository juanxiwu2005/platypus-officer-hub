import { expect, test } from "@playwright/test"

// DX-06: tracking follows size, numbers line up, and the small phone labels are readable.
const px = (s: string) => parseFloat(s)

test("headings get tighter as they get bigger", async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  const t = await page.evaluate(() => {
    const read = (sel: string) => { const e = document.querySelector(sel)!; const c = getComputedStyle(e); return { ls: c.letterSpacing, fs: c.fontSize } }
    return { h1: read("h1"), h2: read("h2") }
  })
  const em = (v: { ls: string; fs: string }) => (v.ls === "normal" ? 0 : px(v.ls) / px(v.fs))
  expect(em(t.h1)).toBeCloseTo(-0.02, 2)
  expect(em(t.h2)).toBeCloseTo(-0.015, 2)
  expect(px(t.h1.fs)).toBeGreaterThan(px(t.h2.fs)) // the bigger heading is the tighter one
  expect(em(t.h1)).toBeLessThan(em(t.h2))
})

test("body text keeps normal spacing", async ({ page }) => {
  await page.goto("/#/")
  expect(await page.evaluate(() => getComputedStyle(document.body).letterSpacing)).toBe("normal")
})

test("dates and counts use equal-width digits", async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  const row = page.getByTestId("reminder-centre").locator(".rq-meta").first()   // FB-8: the reminder centre's dates
  await expect(row).toBeVisible()
  expect(await row.evaluate(el => getComputedStyle(el).fontVariantNumeric)).toContain("tabular-nums")
  expect(await page.locator(".sidenav .count").first().evaluate(el => getComputedStyle(el).fontVariantNumeric)).toContain("tabular-nums")
})

test("phone chart and chain labels are at least 14px", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("mobile"), "phone only")
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("/#/handoff")   // FB-8: the Events strip and its chains left the home page; the Handoff page has a labelled chain
  await expect(page.locator(".chain-label").first()).toBeVisible()
  const sizes = await page.locator(".chain-label").evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(14)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
})
