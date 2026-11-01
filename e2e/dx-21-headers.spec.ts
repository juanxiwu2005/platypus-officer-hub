import { expect, test, type Page } from "@playwright/test"

// DX-21: the board's column headers are a coloured dot and a name, not a solid colour bar; the status pill elsewhere is unchanged.
test.skip(({ isMobile }) => isMobile, "the board columns are read on a computer here")
async function openBoard(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/#/tasks")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("task-board")).toBeVisible()
}
const lum = (rgb: number[]) => { const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]) }
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)

test("the header is quiet: no solid bar, normal text, a dot in the status colour", async ({ page }) => {
  await openBoard(page)
  const h = await page.locator(".board-col > header").first().evaluate(el => { const cs = getComputedStyle(el), dot = getComputedStyle(el, "::before"), h2 = getComputedStyle(el.querySelector("h2")!), cnt = getComputedStyle(el.querySelector(".count")!); return { bg: cs.backgroundColor, color: cs.color, h2: h2.color, dotBg: dot.backgroundColor, dotW: dot.width, dotR: dot.borderRadius, pill: el.style.getPropertyValue("--pill"), cntBg: cnt.backgroundColor } })
  expect(h.bg).toBe("rgba(0, 0, 0, 0)")                       // no colour bar
  expect(h.h2).toBe(h.color)                                   // the name is the normal text colour
  expect(h.dotW).toBe("10px")
  expect(h.dotR).toMatch(/50%|5px/)                            // round
  expect(rgb(h.dotBg)).toEqual(rgb(await page.evaluate(c => { const d = document.createElement("i"); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v }, h.pill)))   // the dot is the status colour
  expect(h.cntBg).not.toBe("rgba(255, 255, 255, 0.25)")        // the old translucent-white badge is gone
})

test("every default status colour reads as a dot on the light column (3:1 or more)", async ({ page }) => {
  await openBoard(page)
  const colours = await page.locator(".board-col > header").evaluateAll(els => els.map(el => getComputedStyle(el, "::before").backgroundColor))
  const column = await page.locator(".board-col").first().evaluate(el => getComputedStyle(el).backgroundColor)
  expect(colours).toHaveLength(6)
  for (const c of colours) expect(ratio(rgb(c), rgb(column)), `${c} on ${column}`).toBeGreaterThanOrEqual(3)
})

test.describe("dark", () => {
  test.use({ colorScheme: "dark" })
  test("the dot has a light ring, so the colours that are too dark on a dark column still show", async ({ page }) => {
    await openBoard(page)
    const info = await page.locator(".board-col > header").evaluateAll(els => els.map(el => { const d = getComputedStyle(el, "::before"); return { c: d.backgroundColor, ring: d.boxShadow } }))
    const column = await page.locator(".board-col").first().evaluate(el => getComputedStyle(el).backgroundColor)
    expect(info.some(i => ratio(rgb(i.c), rgb(column)) < 3)).toBe(true)   // there ARE colours under 3:1 (that is why the ring exists)
    for (const i of info) expect(i.ring).not.toBe("none")
  })
})

test("light has no ring", async ({ page }) => {
  await openBoard(page)
  expect(await page.locator(".board-col > header").first().evaluate(el => getComputedStyle(el, "::before").boxShadow)).toBe("none")
})

test("the status pill in the table view is still a solid colour block", async ({ page }) => {
  await openBoard(page)
  await page.getByRole("button", { name: "Table" }).click()
  const pill = page.locator(".pill").first()
  await expect(pill).toBeVisible()
  const cs = await pill.evaluate(el => { const c = getComputedStyle(el); return { bg: c.backgroundColor, color: c.color } })
  expect(cs.bg).not.toBe("rgba(0, 0, 0, 0)")
  expect(rgb(cs.color)).toEqual([255, 255, 255])
})
