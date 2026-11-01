import { expect, test } from "@playwright/test"

// DX-04: on a phone the main controls are 44px, everything else you can tap reaches about 32px (its own box, or the
// invisible area around a small dot). Run only on the phone project. The desktop is covered by dx-shots (unchanged).
test.skip(({ isMobile }) => !isMobile, "touch sizes only matter on a phone")

const PAGES = ["/", "/events", "/tasks", "/team", "/partners", "/rules", "/handoff"]

test("a phone uses the coarse-pointer sizes", async ({ page }) => {
  await page.goto("/#/")
  expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true)
})

for (const path of PAGES) {
  test(`${path}: main controls are 44px, the rest reach 32px`, async ({ page }) => {
    await page.goto("/#/")
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(`/#${path}`)
    await page.waitForTimeout(600)
    const result = await page.evaluate(() => {
      const visible = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden]") }
      const name = (e: Element) => e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "")
      const main = [...document.querySelectorAll(".btn:not(.small), .chip, .icon-btn, .seg button, .sidenav a")].filter(visible)
      const tooSmallMain = main.filter(e => { const r = e.getBoundingClientRect(); return r.height < 43.5 || (e.classList.contains("icon-btn") && r.width < 43.5) }).map(name)
      const all = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=tab], summary")].filter(visible)
      const reach = (e: Element) => {
        const r = e.getBoundingClientRect()
        const a = getComputedStyle(e, "::after")
        const extra = a.content !== "none" && a.position === "absolute" ? Math.min(parseFloat(a.width) || 0, parseFloat(a.height) || 0) : 0
        return Math.max(Math.min(r.width, r.height), extra)
      }
      const small = all.filter(e => reach(e) < 31.5).map(name)
      return { tooSmallMain, small }
    })
    expect(result.tooSmallMain, "main controls under 44px").toEqual([])
    expect(result.small, "controls whose reach is under 32px").toEqual([])
  })
}
