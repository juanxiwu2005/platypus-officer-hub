// Shared browser-test helpers: write scenario descriptions and assertion messages in English.
import { expect, type Page } from "@playwright/test"

/** v1.1 helpers: the demo controls live behind the Demo pill, and AI lives in the right rail. */
/** On a phone the side panel covers the page; close it before touching the page underneath. */
export async function closeRail(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) >= 1200) return
  const hide = page.getByRole("button", { name: "Hide side panel" })
  if (await hide.isVisible()) await hide.click()
}
/**
 * "View as" and "AI features" are in the Demo menu on every screen size (I12). Open it if it is closed.
 * The side panel is NOT closed: several tests open a task's details first and then change viewer. With the side panel full screen the top
 * bar is switched off for a person (inert), so the pill is pressed with a click event instead of a mouse click, the same way the old
 * `selectOption` reached the select underneath it.
 */
export async function openMore(page: Page) {
  // Ask the button, not the screen: a menu that is still fading out can look open for a moment but is already closed (DX-10).
  const toggle = page.getByTestId("demo-menu")
  if ((await toggle.getAttribute("aria-expanded")) === "true") return
  if (await page.getByTestId("rail").count()) await toggle.dispatchEvent("click")
  else await toggle.click()
}
/** Switch the viewer. Picking one closes the Demo menu again, as it does for a person. */
export async function viewAs(page: Page, person: string) {
  await openMore(page)
  await page.getByTestId("view-as").selectOption(person)
}
export async function openDemoMenu(page: Page) {
  await closeRail(page)
  // Ask the button, not the screen: a menu that is still fading out can look open for a moment but is already closed (DX-10).
  const toggle = page.getByTestId("demo-menu")
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click()
  await expect(page.getByTestId("reset-demo")).toBeVisible()
}
/** Reset asks once (Layout.tsx): the first click arms the button, the second one wipes the demo. */
export async function resetDemo(page: Page) {
  await openDemoMenu(page)
  const reset = page.getByTestId("reset-demo")
  await reset.click()
  await expect(reset).toHaveText("Click again to reset")
  await reset.click()
}
export async function demoClock(page: Page, days: 1 | 3 | 10) {
  await openDemoMenu(page)
  await page.getByTestId(`clock-${days}`).click()
}
export async function openAsk(page: Page) {
  const input = page.locator("#ask-input")
  if (await input.isVisible()) return
  const tab = page.getByTestId("tab-ask")
  if (await tab.isVisible()) { await tab.click(); return }
  await page.locator(".ask-fab").click()
  await expect(input).toBeVisible()
}
export async function ask(page: Page, text: string) {
  await openAsk(page)
  await page.locator("#ask-input").fill(text)
  await page.locator("#ask-input").press("Enter")
}
export const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
