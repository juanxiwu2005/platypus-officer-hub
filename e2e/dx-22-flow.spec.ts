import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

// DX-22: when a step is moved, the dots glide to their new places with a transform (not left/top) while the lines dim, and a
// window resize does not glide. Reduce Motion: it all happens at once.
test.skip(({ isMobile }) => isMobile, "uses the horizontal chart")
async function openFlow(page: Page) {
  await page.setViewportSize({ width: 1700, height: 1000 })
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/events")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await closeRail(page)
  await expect(page.getByTestId("flow-chart")).toBeVisible()
}
const dot = (page: Page, key: string) => page.getByTestId(`flow-node-${key}`)
const nodeOf = (page: Page, key: string) => dot(page, key).locator("xpath=ancestor::*[contains(@class,'m-node')][1]")

test("steps are placed with a transform, not with left and top", async ({ page }) => {
  await openFlow(page)
  const css = await nodeOf(page, "plan").evaluate(el => { const cs = getComputedStyle(el); return { left: cs.left, top: cs.top, transform: cs.transform, x: (el as HTMLElement).style.getPropertyValue("--x") } })
  expect(css.left).toBe("0px")
  expect(css.top).toBe("0px")
  expect(css.transform).toMatch(/^matrix\(1, 0, 0, 1, [\d.]+, [\d.]+\)$/)
  expect(css.x).toMatch(/px$/)
})

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  // In this chart steps keep approximate time positions, so most edits (a new order, a new date) leave the dots where they were and nothing
  // visibly glides. The two halves of the feature are therefore tested separately: the style, and the rule that switches it on.
  test("style: with is-settling a step glides to a new place, without it the step jumps", async ({ page }) => {
    await openFlow(page)
    const run = (withClass: boolean) => page.evaluate(async withClass => {
      const metro = document.querySelector(".metro")!
      const node = document.querySelector("[data-testid=flow-node-plan]")!.closest(".m-node") as HTMLElement
      const x = () => Math.round(new DOMMatrix(getComputedStyle(node).transform).m41)
      metro.classList.toggle("is-settling", withClass)
      const from = x()
      node.style.setProperty("--x", `${from + 200}px`)
      const seen: number[] = []
      const t0 = performance.now()
      while (performance.now() - t0 < 700) { seen.push(x()); await new Promise(requestAnimationFrame) }
      metro.classList.remove("is-settling")
      return { from, seen }
    }, withClass)
    const glide = await run(true)
    expect(glide.seen.filter(v => v > glide.from + 5 && v < glide.from + 195).length).toBeGreaterThan(3)   // in-between places
    expect(glide.seen[glide.seen.length - 1]).toBe(glide.from + 200)
    const jump = await run(false)
    expect(jump.seen.filter(v => v > jump.from + 5 && v < jump.from + 195)).toEqual([])                     // straight there
  })
  test("rule: adding a step switches the glide on, dims the lines, and then settles", async ({ page }) => {
    await openFlow(page)
    await page.getByTestId("flow-edit-toggle").click()
    await page.evaluate(() => {
      type Frame = { settling: boolean; line: number }
      const w = window as unknown as { __f: Frame[] }
      w.__f = []
      const t0 = performance.now()
      const tick = () => { const m = document.querySelector(".metro")!; w.__f.push({ settling: m.classList.contains("is-settling"), line: parseFloat(getComputedStyle(m.querySelector("svg")!).opacity) }); if (performance.now() - t0 < 1800) requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
    await dot(page, "plan").dblclick()
    await page.getByTestId("flow-menu").getByRole("button", { name: "Add a step after this one" }).click()
    await page.waitForTimeout(1900)
    const f = await page.evaluate(() => (window as unknown as { __f: { settling: boolean; line: number }[] }).__f)
    expect(f.some(s => s.settling)).toBe(true)
    expect(f.some(s => s.line < 0.9 && s.line > 0.3)).toBe(true)      // the lines dim while it settles
    expect(f[f.length - 1]).toMatchObject({ settling: false, line: 1 })
  })
  test("making the window narrower does not glide the steps", async ({ page }) => {
    await openFlow(page)
    await page.setViewportSize({ width: 1500, height: 1000 })
    await page.waitForTimeout(100)
    expect(await page.locator(".metro").evaluate(el => el.classList.contains("is-settling"))).toBe(false)
  })
  test("the diamond a step can drop on grows by scaling", async ({ page }) => {
    await openFlow(page)
    const near = await page.evaluate(() => { const g = document.createElement("span"); g.className = "m-gap is-near"; document.querySelector(".metro-canvas")!.append(g); const cs = getComputedStyle(g); return { w: cs.width, t: cs.transform } })
    expect(near.w).toBe("14px")
    expect(near.t).not.toBe("none")
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("the steps are simply at their new places when the date changes", async ({ page }) => {
    await openFlow(page)
    await page.getByTestId("event-date").fill("2027-06-30")
    await expect(page.getByTestId("event-date")).toHaveValue("2027-06-30")
    expect(await page.locator(".metro").evaluate(el => el.classList.contains("is-settling"))).toBe(false)
    expect(await nodeOf(page, "plan").evaluate(el => getComputedStyle(el).transitionDuration)).toMatch(/^0s/)
  })
})
