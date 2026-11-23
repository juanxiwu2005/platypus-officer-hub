import { enableUpdatedReminders } from "./reminderHelpers"
import { expect, test } from "@playwright/test"

// DX-03: pressing a button shrinks it at once and it springs back on release. Reduce Motion keeps the colour change only.
test.skip(({ isMobile }) => isMobile, "needs a mouse to hold a button down")

async function pressedTransform(page: import("@playwright/test").Page) {
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  // S2: the reminder centre's first Fix first button opens a task in the rail and stays in place, so it can be pressed and read back.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    s.org.settings.reminderMode = "review_then_self"
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
  })
  await page.reload()
  await enableUpdatedReminders(page)
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
  const button = page.getByTestId("rq-fix").getByRole("button").first()
  await expect(button).toBeVisible()
  await button.hover()
  const idle = await button.evaluate(el => getComputedStyle(el).transform)
  await page.mouse.down()
  await page.waitForTimeout(250)
  const down = await button.evaluate(el => getComputedStyle(el).transform)
  await page.mouse.up()
  await page.waitForTimeout(250)
  const after = await button.evaluate(el => getComputedStyle(el).transform)
  return { idle, down, after }
}

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  test("a pressed button shrinks and returns", async ({ page }) => {
    const { idle, down, after } = await pressedTransform(page)
    expect(idle).toBe("none")
    expect(down).toMatch(/^matrix\(0\.97, 0, 0, 0\.97/)
    expect(after).toBe("none")
  })
  test("the side navigation changes background only, it does not move", async ({ page }) => {
    await page.goto("/#/")
    const link = page.locator(".sidenav a", { hasText: "Handoff" })   // FB-8: Team is folded into More
    await link.hover()
    await page.mouse.down()
    await page.waitForTimeout(250)
    expect(await link.evaluate(el => getComputedStyle(el).transform)).toBe("none")
    await page.mouse.up()
  })
})

test.describe("with Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("a pressed button does not shrink", async ({ page }) => {
    const { down } = await pressedTransform(page)
    expect(down).toBe("none")
  })
})
