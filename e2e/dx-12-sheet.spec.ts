import { expect, test, type Page } from "@playwright/test"

// DX-12: on a phone the explanation card slides up from the bottom and fades in, and slides back when closed.
// On a computer it is unchanged: no delay, no slide (e2e/feel.spec.ts guards the no-delay part).
test.skip(({ isMobile }) => !isMobile, "the bottom sheet only exists where nothing can hover")

async function fresh(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.locator(".risk").first()).toBeVisible()
}

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  test("opens with a slide and fade, closes the same way", async ({ page }) => {
    await fresh(page)
    const r = await page.evaluate(async () => {
      const frame = () => new Promise(requestAnimationFrame)
      const hover = document.querySelector(".risk")!.closest(".hover") as HTMLElement
      const card = hover.querySelector(".hover-card") as HTMLElement
      const read = () => { const cs = getComputedStyle(card); return { o: Math.round(parseFloat(cs.opacity) * 100) / 100, y: Math.round(new DOMMatrix(cs.transform).m42), v: cs.visibility, p: cs.position } }
      const opening: ReturnType<typeof read>[] = [], closing: ReturnType<typeof read>[] = []
      ;(hover.querySelector("button, [tabindex]") as HTMLElement).click()
      for (let i = 0; i < 24; i++) { opening.push(read()); await frame() }
      document.querySelector("h1")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
      for (let i = 0; i < 24; i++) { closing.push(read()); await frame() }
      return { opening, closing }
    })
    expect(r.opening.some(s => s.o > 0.05 && s.o < 0.95)).toBe(true)         // fades in
    expect(r.opening.some(s => s.y > 0 && s.y < 12)).toBe(true)              // and slides up
    expect(r.opening[r.opening.length - 1]).toMatchObject({ o: 1, y: 0, v: "visible", p: "fixed" })
    expect(r.closing.some(s => s.o > 0.05 && s.o < 0.95 && s.v === "visible")).toBe(true) // still there while it leaves
    expect(r.closing[r.closing.length - 1]).toMatchObject({ o: 0, v: "hidden" })
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("the card is simply there or not", async ({ page }) => {
    await fresh(page)
    const hover = page.locator(".risk").first().locator("xpath=ancestor::*[contains(@class,'hover')][1]")
    await hover.locator("button, [tabindex]").first().tap()
    await expect(hover.locator(".hover-card")).toBeVisible()
    expect(await hover.locator(".hover-card").evaluate(el => getComputedStyle(el).transform)).toMatch(/^matrix\(1, 0, 0, 1, 0, 0\)|^none$/)
    await page.getByRole("heading", { level: 1 }).tap()
    await expect(hover.locator(".hover-card")).toBeHidden()
  })
})
