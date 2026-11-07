import { expect, test, type Page } from "@playwright/test"

// DX-15: the Events page gives the flow chart more room with the Ask panel open, without removing the event list.
test.skip(({ isMobile }) => isMobile, "this is the computer layout")
async function openEvents(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto("/#/events")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("view-flow")).toBeVisible()
}
const rect = (page: Page, sel: string) => page.evaluate(s => { const b = document.querySelector(s)!.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width) } }, sel)

test("1440px with the Ask panel open: the event list is 176px, the demo names fit in full, and longer names stay reachable", async ({ page }) => {
  await openEvents(page, 1440)
  expect((await rect(page, ".event-nav")).w).toBe(176)
  const names = await page.locator(".event-nav button").evaluateAll(els => els.map(e => ({ text: e.textContent, title: e.getAttribute("title"), clipped: e.scrollWidth > e.clientWidth })))
  expect(names.length).toBeGreaterThan(1)
  for (const n of names) expect(n.title).toBe(n.text)        // a clipped name can always be read in full
  for (const n of names) expect(n.clipped, `${n.text} is cut off`).toBe(false) // and none of the demo names needs it
  await expect(page.locator(".event-nav button")).toHaveCount(names.length)
})
test("a wider screen keeps the 220px list", async ({ page }) => {
  await openEvents(page, 1600)
  expect((await rect(page, ".event-nav")).w).toBe(220)
})
test("with the Ask panel closed the list stays 220px", async ({ page }) => {
  await openEvents(page, 1440)
  await page.getByRole("button", { name: "Hide side panel" }).click()
  expect((await rect(page, ".event-nav")).w).toBe(220)
})
test("the empty status line no longer leaves a gap, but is still in the page for the screen reader", async ({ page }) => {
  await openEvents(page, 1440)
  const toolbar = await rect(page, ".toolbar"), metro = await rect(page, ".metro")
  expect(metro.top - toolbar.bottom).toBe(16)  // the normal page gap; it was 57
  await expect(page.locator(".m-edit-bar [role=status]")).toHaveCount(1)
  expect(await page.locator(".m-edit-bar [role=status]").evaluate(el => el.matches(":empty"))).toBe(true)
})
test("edit mode still has its bar", async ({ page }) => {
  await openEvents(page, 1440)
  await page.getByRole("button", { name: "Edit flow" }).click()
  const bar = page.locator(".m-edit-bar")
  await expect(bar.getByRole("button").first()).toBeVisible()
  expect((await rect(page, ".m-edit-bar")).bottom - (await rect(page, ".m-edit-bar")).top).toBeGreaterThan(20)
})
test("a soft layer shows there is more to the right, and goes at the end; the chart itself is not masked", async ({ page }) => {
  await openEvents(page, 1440)
  const layer = () => page.locator(".metro-fade").evaluate(el => Number(getComputedStyle(el, "::after").opacity))
  expect(await page.locator(".metro").evaluate(el => el.scrollWidth > el.clientWidth + 100)).toBe(true)
  await expect.poll(layer).toBe(1)
  await page.locator(".metro").evaluate(el => { el.scrollLeft = el.scrollWidth })
  await expect.poll(layer).toBe(0)
  await page.locator(".metro").evaluate(el => { el.scrollLeft = 0 })
  await expect.poll(layer).toBe(1)
  // The mistake this replaced: a mask on the chart hid its right-click menu. Nothing on the chart may mask it.
  expect(await page.locator(".metro").evaluate(el => getComputedStyle(el).maskImage)).toBe("none")
  expect(await page.locator(".metro-fade").evaluate(el => getComputedStyle(el, "::after").pointerEvents)).toBe("none")
})
test("the chart's right-click menu is not cut off or covered", async ({ page }) => {
  await openEvents(page, 1440)
  await page.getByRole("button", { name: "Edit flow" }).click()
  await page.locator(".m-dot:not(.station)").nth(2).dblclick()
  const menu = page.getByTestId("flow-menu")
  await expect(menu).toBeVisible()
  const button = menu.getByRole("button").first()
  const box = (await button.boundingBox())!
  const top = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-testid=flow-menu]") !== null, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  expect(top).toBe(true)  // the button is what you would hit, not something drawn over it
})
