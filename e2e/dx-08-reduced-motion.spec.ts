import { expect, test } from "@playwright/test"

// DX-08: with Reduce Motion on, nothing keeps blinking or spinning. With it off, the "working" dots still blink.
const PAGES = ["/", "/events", "/tasks", "/team", "/rules", "/handoff", "/playbook", "/settings"]

async function putWaitCardOnPage(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const el = document.createElement("div")
    el.id = "dx08"
    el.innerHTML = '<span class="ai-wait-mark"><i></i><i></i><i></i></span><span class="typing"><i></i></span><span class="spin"></span>'
    document.body.append(el)
  })
}

test.describe("Reduce Motion on", () => {
  test.use({ reducedMotion: "reduce" })
  test("the working dots and the spinner hold still", async ({ page }) => {
    await page.goto("/#/")
    await putWaitCardOnPage(page)
    const names = await page.evaluate(() => [...document.querySelectorAll("#dx08 i, #dx08 .spin")].map(e => getComputedStyle(e).animationName))
    expect(names.every(n => n === "none")).toBe(true)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("#dx08 i")!).opacity)).toBe("0.6")
  })
  for (const path of PAGES) {
    test(`${path} has no animation that repeats forever`, async ({ page }) => {
      await page.goto("/#/")
      await page.evaluate(() => window.localStorage.clear())
      await page.goto(`/#${path}`)
      await page.waitForTimeout(700)
      const forever = await page.evaluate(() => document.getAnimations().filter(a => (a.effect?.getComputedTiming().iterations ?? 1) === Infinity).map(a => (a as CSSAnimation).animationName ?? a.id))
      expect(forever).toEqual([])
    })
  }
})

test.describe("Reduce Motion off", () => {
  test.use({ reducedMotion: "no-preference" })
  test("the working dots still blink", async ({ page }) => {
    await page.goto("/#/")
    await putWaitCardOnPage(page)
    const names = await page.evaluate(() => [...document.querySelectorAll("#dx08 .ai-wait-mark i, #dx08 .typing i")].map(e => getComputedStyle(e).animationName))
    expect(names.every(n => n === "blink")).toBe(true)
  })
})
