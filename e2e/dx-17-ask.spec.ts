import { expect, test, type Page } from "@playwright/test"
import { ask } from "./helpers"

// DX-17: the Ask panel greets in the middle before the first message; new messages rise in, old ones do not replay.
async function fresh(page: Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("ask-panel")).toBeVisible()
}

test.describe("before the first message", () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test("the greeting and the suggestions sit together in the middle of the panel", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "uses the docked panel")
    await fresh(page)
    const welcome = page.getByTestId("ask-welcome")
    await expect(welcome).toContainText("What do you need?")
    await expect(welcome.getByRole("button")).not.toHaveCount(0)
    const r = await page.evaluate(() => {
      const w = document.querySelector("[data-testid=ask-welcome]")!.getBoundingClientRect()
      const head = document.querySelector(".ask-head")!.getBoundingClientRect()
      const form = document.querySelector(".ask-form")!.getBoundingClientRect()
      const hello = document.querySelector(".ask-hello")!.getBoundingClientRect()
      const chips = document.querySelector("[data-testid=ask-welcome] .chips")!.getBoundingClientRect()
      const groupMid = (hello.top + chips.bottom) / 2, areaMid = (head.bottom + form.top) / 2
      return { off: Math.abs(groupMid - areaMid), free: w.height, suggestionRows: document.querySelectorAll(".chips").length }
    })
    expect(r.off).toBeLessThan(60)            // the group is near the middle of the free space (it was glued to the bottom)
    expect(r.suggestionRows).toBe(1)          // one row of suggestions, never two
  })
})

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } })
  test("a message sent now rises in, and the suggestions move to the foot of the panel", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "uses the docked panel")
    await fresh(page)
    await page.evaluate(() => {
      const out: { o: number; y: number }[] = []
      ;(window as unknown as { __b: typeof out }).__b = out
      const tick = () => { const b = document.querySelector(".bubble.is-new"); if (b) { const cs = getComputedStyle(b); out.push({ o: Math.round(parseFloat(cs.opacity) * 100) / 100, y: Math.round(new DOMMatrix(cs.transform).m42) }) } ; if (out.length < 40) requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
    await ask(page, "What are my top 5 tasks?")
    await expect(page.locator(".bubble.user")).toHaveCount(1)
    await page.waitForTimeout(500)
    const frames = await page.evaluate(() => (window as unknown as { __b: { o: number; y: number }[] }).__b)
    expect(frames.some(f => f.o > 0.05 && f.o < 0.95)).toBe(true)
    expect(frames.some(f => f.y > 0 && f.y < 6)).toBe(true)
    await expect(page.getByTestId("ask-welcome")).toHaveCount(0)
    expect(await page.locator(".chips").count()).toBe(1)   // now at the foot
  })
  test("reopening the panel does not replay the old messages", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "uses the docked panel")
    await fresh(page)
    await ask(page, "What are my top 5 tasks?")
    await expect(page.locator(".bubble.bot")).toHaveCount(1)
    await page.getByRole("button", { name: "Hide side panel" }).click()
    await expect(page.getByTestId("rail")).toHaveCount(0)   // really gone (it slides out first), so the panel is built again when reopened
    await page.locator("[data-testid=ask-toggle]").click()
    await expect(page.locator(".bubble.user")).toHaveCount(1)
    await expect(page.locator(".bubble.is-new")).toHaveCount(0)
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } })
  test("a new message has no animation", async ({ page }, info) => {
    test.skip(info.project.name.startsWith("mobile"), "uses the docked panel")
    await fresh(page)
    await ask(page, "What are my top 5 tasks?")
    await expect(page.locator(".bubble.user")).toHaveCount(1)
    expect(await page.locator(".bubble.user").evaluate(el => getComputedStyle(el).animationName)).toBe("none")
  })
})
