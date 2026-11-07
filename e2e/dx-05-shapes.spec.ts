import { expect, test } from "@playwright/test"

// DX-05: the three risk states have three different shapes (not only three colours), in light and dark.
test("each risk state draws its own shape", async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("risk-list").getByTestId("forecast").first()).toBeVisible()
  const shapes = await page.evaluate(() => {
    const out: Record<string, string> = {}
    for (const el of document.querySelectorAll<HTMLElement>(".risk")) {
      const color = ["red", "yellow", "green"].find(c => el.classList.contains(c))
      const svg = el.querySelector("i svg")
      if (color && svg && !out[color]) out[color] = [...svg.children].filter(n => !n.classList.contains("glyph")).map(n => n.tagName + (n.getAttribute("d") ?? n.getAttribute("rx") ?? n.getAttribute("r"))).join("|")
    }
    return out
  })
  // Today shows at least red dots in the nudge list and green dots on the event rows.
  expect(Object.keys(shapes).length).toBeGreaterThanOrEqual(2)
  expect(new Set(Object.values(shapes)).size).toBe(Object.keys(shapes).length)
})

test.describe("dark appearance", () => {
  test.use({ colorScheme: "dark" })
  test("the mark inside the shape stays visible", async ({ page }) => {
    await page.goto("/#/")
    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    const first = page.locator(".risk .glyph").first()
    await expect(first).toBeAttached()
    const stroke = await first.evaluate(el => getComputedStyle(el).stroke)
    const fill = await page.locator(".risk i").first().evaluate(el => getComputedStyle(el).color)
    expect(stroke).not.toBe(fill)
  })
})
