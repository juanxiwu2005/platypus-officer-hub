import { expect, test, type Page } from "@playwright/test"
import { openMore, viewAs } from "./helpers"

// DX-20a: on a phone the top bar is one line and "View as" / "AI features" are behind "⋯". On a computer nothing moves.
async function fresh(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
}
const box = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone only")
  test("the top bar is one line and the page starts much higher", async ({ page }) => {
    await fresh(page)
    const bar = await box(page, ".topbar")
    expect(bar.height).toBeLessThanOrEqual(64)                  // was 185
    const h1 = await box(page, "h1")
    expect(h1.y).toBeLessThanOrEqual(170)                       // was 271
    for (const sel of [".brand", "[data-testid=demo-menu]", "[data-testid=bell]", "[data-testid=more-toggle]"]) {
      const b = await box(page, sel)
      expect(b.y, `${sel} is on the first line`).toBeGreaterThanOrEqual(0)
      expect(b.y + b.height, `${sel} is inside the bar`).toBeLessThanOrEqual(bar.height + 1)
      expect(b.x + b.width, `${sel} is inside the screen`).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
  test("the buttons in the bar are 44px to hit", async ({ page }) => {
    await fresh(page)
    for (const id of ["more-toggle", "bell", "demo-menu"]) { const b = await box(page, `[data-testid=${id}]`); expect(b.height, id).toBeGreaterThanOrEqual(43.5) }
  })
  test("View as and AI features are behind ⋯, which opens, closes with Escape and with a tap outside", async ({ page }) => {
    await fresh(page)
    const toggle = page.getByTestId("more-toggle")
    await expect(page.getByTestId("view-as")).toBeHidden()
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    await expect(page.getByTestId("view-as")).toBeVisible()
    await expect(page.getByRole("checkbox", { name: "AI features" })).toBeVisible()
    await expect(page.locator(".more-org")).toHaveText("Desert Founders Society")
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("view-as")).toBeHidden()
    await expect(toggle).toBeFocused()
    await toggle.click()
    await page.mouse.click(200, 700)
    await expect(page.getByTestId("view-as")).toBeHidden()
  })
  test("picking someone in View as works, closes the panel and shows their tasks", async ({ page }) => {
    await fresh(page)
    await viewAs(page, "maya")
    await expect(page.getByTestId("view-as")).toBeHidden()
    await expect(page.getByTestId("view-as")).toHaveValue("maya")
  })
  test("the AI switch still works from the panel", async ({ page }) => {
    await fresh(page)
    await openMore(page)
    await page.getByRole("checkbox", { name: "AI features" }).uncheck()
    await expect(page.getByTestId("view-as")).toBeHidden()
    await openMore(page)
    await expect(page.getByRole("checkbox", { name: "AI features" })).not.toBeChecked()
  })
  test("the Demo menu and the bell still open from the one-line bar", async ({ page }) => {
    await fresh(page)
    await page.getByTestId("demo-menu").click()
    await expect(page.getByTestId("reset-demo")).toBeVisible()
    await page.keyboard.press("Escape")
    await page.getByTestId("bell").click()
    await expect(page.locator(".menu.wide")).toBeVisible()
  })
})

test.describe("computer", () => {
  test.skip(({ isMobile }) => isMobile, "computer only")
  test.use({ viewport: { width: 1440, height: 900 } })
  test("nothing moved: same order, View as and AI features in the bar, no ⋯ button", async ({ page }) => {
    await fresh(page)
    await expect(page.getByTestId("more-toggle")).toBeHidden()
    await expect(page.getByTestId("view-as")).toBeVisible()
    await expect(page.getByRole("checkbox", { name: "AI features" })).toBeVisible()
    const x = async (loc: ReturnType<Page["locator"]>) => (await loc.boundingBox())!.x
    const xs = [await x(page.getByTestId("demo-menu")), await x(page.getByTestId("view-as")), await x(page.getByRole("checkbox", { name: "AI features" })), await x(page.getByTestId("bell")), await x(page.getByTestId("ask-toggle"))]
    expect(xs).toEqual([...xs].sort((a, b) => a - b))           // Demo → View as → AI → bell → Ask, left to right, as before
    expect((await box(page, ".topbar")).height).toBeLessThanOrEqual(60)
    await expect(page.locator(".more-org")).toBeHidden()
  })
})
