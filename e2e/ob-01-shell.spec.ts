import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { fillMission, onboardingRecord } from "./ob-helpers"

// OB-01: the focus shell, the progress chain, the step flow and the draft. The new screens are placeholders until OB-04…OB-09, so these tests
// look at the structure around them.
const scan = async (page: import("@playwright/test").Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => v.id)

test("the founder flow shows a progress chain that follows the route", async ({ page }) => {
  await page.goto("/#/welcome/founder/name")
  const chain = page.getByRole("list", { name: "Walkthrough progress" })
  await expect(chain.getByRole("listitem")).toHaveCount(6)                     // ob-5 (FB-2): Name, Team, First event, Reminders, Confirm, Invite
  await expect(chain.locator("[aria-current=step]")).toHaveText(/Name/)
  await page.goto("/#/welcome/founder/team")
  await expect(chain.locator("[aria-current=step]")).toHaveText(/Team/)
  await expect(chain.locator(".is-done")).toHaveCount(1)                        // only Name comes before Team now
})
test("the member flow has its own six steps", async ({ page }) => {
  await page.goto("/#/welcome/member/reminders")
  await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByRole("listitem")).toHaveCount(6)
})
test("the welcome and classic pages have no progress chain, and nothing from the app frame", async ({ page }) => {
  for (const path of ["/#/welcome", "/#/welcome/classic"]) {
    await page.goto(path)
    await expect(page.getByRole("list", { name: "Walkthrough progress" })).toHaveCount(0)
    await expect(page.getByRole("combobox", { name: "View as" })).toHaveCount(0)
  }
})
test("the classic setup still finishes inside the shell, and the classic join page has one main landmark", async ({ page }) => {
  await page.goto("/#/welcome/classic")
  await page.getByRole("button", { name: "Use the sample constitution" }).click()
  await expect(page.getByTestId("constitution-chip")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await page.goto("/#/welcome/classic-join?invite=nope")
  await expect(page.locator("main")).toHaveCount(1)
})
test("an unknown /welcome path shows a placeholder and no accessibility problems", async ({ page }) => {
  await page.goto("/#/welcome/founder/unknown")                                   // ob-5: founder/goals is no longer unknown, it opens Team
  expect(await scan(page)).toEqual([])
})
test("ob-5: the removed Constitution and Goals addresses open the Team screen", async ({ page }) => {
  for (const old of ["constitution", "goals"]) {
    await page.goto(`/#/welcome/founder/${old}`)
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who's on your team?")
  }
})
test("Exit on a flow screen records the step it left from", async ({ page }) => {
  await page.goto("/#/welcome/start")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)   // wait for the start to finish, or its redirect can land after the next address
  await page.goto("/#/welcome/founder/team")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who's on your team?")
  await page.getByRole("button", { name: "Exit" }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  const rec = await onboardingRecord(page)
  expect(rec.attempts[0].steps).toContainEqual(expect.objectContaining({ step: "founder.team", event: "exit" }))
})

test("the progress chain looks like what it says: done and current dots are filled, skipped ones are hollow and dashed, upcoming ones are hollow", async ({ page }) => {
  await page.goto("/#/welcome/start")
  await page.getByLabel("Club name").fill("Maple Club")                          // the name starts empty
  await fillMission(page)                                                        // FB-2: the mission is on Name
  await page.getByRole("button", { name: "Continue", exact: true }).click()      // Name done
  await page.getByRole("button", { name: /Skip/ }).first().click()               // Team skipped (ob-5: Constitution is a section of Team)
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  const mark = (state: string) => page.locator(`.ob-dot.is-${state} .ob-dot-mark`).first().evaluate(e => { const s = getComputedStyle(e); return { bg: s.backgroundColor, border: s.borderStyle } })
  const done = await mark("done"), now = await mark("now"), skipped = await mark("skipped"), todo = await mark("todo")
  expect(done.bg).not.toBe("rgba(0, 0, 0, 0)"); expect(done.border).toBe("solid")
  expect(now.bg).toBe(done.bg)
  expect(skipped.bg).toBe("rgba(0, 0, 0, 0)"); expect(skipped.border).toBe("dashed")
  expect(todo.border).toBe("solid"); expect(todo.bg).not.toBe(done.bg)
})
