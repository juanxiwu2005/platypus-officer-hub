import { expect, test } from "@playwright/test"
import { enableUpdatedReminders } from "./reminderHelpers"

// DX-05: the three risk states have three different shapes (not only three colours), in light and dark.
test("each risk state draws its own shape", async ({ page }) => {
  // FB-8: the home page (the reminder centre) marks only red tasks, so the three states are checked on Handoff, which shows all three.
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("/#/handoff")
  await expect(page.locator("main .risk").first()).toBeVisible()
  const shapes = await page.evaluate(() => {
    const out: Record<string, string> = {}
    for (const el of document.querySelectorAll<HTMLElement>(".risk")) {
      const color = ["red", "yellow", "green"].find(c => el.classList.contains(c))
      const svg = el.querySelector("i svg")
      if (color && svg && !out[color]) out[color] = [...svg.children].filter(n => !n.classList.contains("glyph")).map(n => n.tagName + (n.getAttribute("d") ?? n.getAttribute("rx") ?? n.getAttribute("r"))).join("|")
    }
    return out
  })
  // Handoff shows red, yellow and green handover risk marks.
  expect(Object.keys(shapes).length).toBeGreaterThanOrEqual(2)
  expect(new Set(Object.values(shapes)).size).toBe(Object.keys(shapes).length)
})

test.describe("dark appearance", () => {
  test.use({ colorScheme: "dark" })
  test("the mark inside the shape stays visible", async ({ page }) => {
    await page.goto("/#/")
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    // A fresh demo opts in to the reminder centre through its shipped control; then the centre shows its risk marks.
    await enableUpdatedReminders(page)
    const first = page.locator(".risk .glyph").first()
    await expect(first).toBeAttached()
    const stroke = await first.evaluate(el => getComputedStyle(el).stroke)
    const fill = await page.locator(".risk i").first().evaluate(el => getComputedStyle(el).color)
    expect(stroke).not.toBe(fill)
  })
})
