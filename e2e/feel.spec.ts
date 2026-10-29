import { expect, test } from "@playwright/test"

// S3 (2026-10-27): hover cards answer at once, cards with buttons can be used, and form fields get a
// quiet focus style while keyboard focus stays visible everywhere.
test.beforeEach(async ({ page }) => {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test("hover cards and flow-chart cards start showing with no delay", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "hover needs a pointer")
  const delay = (el: Element) => getComputedStyle(el).transitionDelay
  const dot = page.getByTestId("risk-list").getByTestId("forecast").first()
  await dot.locator("button").hover()
  const card = dot.locator(".hover-card")
  expect(await card.evaluate(delay)).toBe("0s, 0s")
  await expect(card).toBeVisible()
  await page.goto("/#/events")
  await page.getByTestId("view-flow").click()
  const node = page.getByTestId("flow-node-usg")
  await node.hover()
  const mCard = node.locator("xpath=..").locator(".m-card")
  expect(await mCard.evaluate(delay)).toBe("0s, 0s")
  await expect(mCard).toBeVisible()
})

test("a button inside a hover card can be clicked (Team contributions)", async ({ page }, info) => {
  await page.goto("/#/team")
  const cell = page.getByTestId("contribution-board").locator(".hover").filter({ has: page.locator(".hover-card button") }).first()
  const trigger = cell.locator("[tabindex]")
  if (info.project.name === "desktop") await trigger.hover(); else await trigger.tap() // a phone cannot hover: a tap opens the card
  const button = cell.locator(".hover-card button").first()
  const title = (await button.textContent())!
  await button.click()
  await expect(page.getByTestId("task-detail").getByRole("heading", { name: title })).toBeVisible()
})

test("form fields get a quiet focus style; keyboard focus on buttons keeps its ring", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the Ask box is in the side panel on desktop")
  const field = page.locator("#ask-input")
  await field.click()
  const style = await field.evaluate(el => { const s = getComputedStyle(el); return { outline: s.outlineColor, shadow: s.boxShadow, border: s.borderTopColor } })
  expect(style.outline).toBe("rgba(0, 0, 0, 0)")
  expect(style.shadow).not.toBe("none")
  const accent = await page.evaluate(() => { const p = document.createElement("i"); p.style.color = "var(--accent)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c })
  expect(style.border).toBe(accent)
  await page.keyboard.press("Shift+Tab")
  const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return `${s.outlineStyle} ${s.outlineWidth}` })
  expect(ring).toBe("solid 2px")
})
