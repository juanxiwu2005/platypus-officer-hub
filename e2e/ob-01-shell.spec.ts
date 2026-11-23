import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { onboardingRecord } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// OB-01: the focus shell, the progress chain, the step flow and the draft; since ob-6 (S6) three founder screens, four member screens and
// redirects for every older address.
const scan = async (page: import("@playwright/test").Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => v.id)

test("the founder flow shows a progress chain of three that follows the route", async ({ page }) => {
  await page.goto("/#/welcome/founder/name")
  const chain = page.getByRole("list", { name: "Walkthrough progress" })
  await expect(chain.getByRole("listitem")).toHaveCount(3)
  await expect(chain.locator("[aria-current=step]")).toHaveText(/Name/)
  await page.goto("/#/welcome/founder/team")
  await expect(chain.locator("[aria-current=step]")).toHaveText(/Team/)
  await expect(chain.locator(".is-done")).toHaveCount(1)
})
test("the member flow has its own four steps", async ({ page }) => {
  await page.goto("/#/welcome/member/reminders")
  await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByRole("listitem")).toHaveCount(4)
})
test("the welcome page has no progress chain or app frame", async ({ page }) => {
  for (const path of ["/#/welcome"]) {
    await page.goto(path)
    await expect(page.getByRole("list", { name: "Walkthrough progress" })).toHaveCount(0)
    await expect(page.getByRole("combobox", { name: "View as" })).toHaveCount(0)
  }
})

// ob-6 redirects: an old screen's address opens the screen that now does its job; an unknown one opens the welcome page.
const REDIRECTS: [string, RegExp][] = [
  ["/#/welcome/founder/constitution", /#\/welcome\/founder\/team$/],
  ["/#/welcome/founder/goals", /#\/welcome\/founder\/team$/],
  ["/#/welcome/founder/first-event", /#\/welcome\/founder\/name$/],
  ["/#/welcome/founder/reminders", /#\/welcome\/founder\/team$/],
  ["/#/welcome/founder/confirm", /#\/welcome\/founder\/team$/],
  ["/#/welcome/member/you", /#\/welcome\/member\/invitation$/],
  ["/#/welcome/classic", /#\/welcome\/founder\/name$/],
  ["/#/welcome/setup", /#\/welcome\/founder\/name$/],
  ["/#/setup", /#\/welcome\/founder\/name$/],
  ["/#/welcome/nothing-here", /#\/welcome$/],
  ["/#/welcome/founder/nothing", /#\/welcome$/],
]
for (const [from, to] of REDIRECTS) {
  test(`the old address ${from.slice(2)} opens the screen that does its job now`, async ({ page }) => {
    await page.goto(from)
    await expect(page).toHaveURL(to)
    await expect(page.locator("main h1")).toBeVisible()
    await expect(page.locator("main")).toHaveCount(1)
  })
}
test("old invitation addresses keep their query: /join, classic join and member/you open the member Invitation for that link", async ({ page }) => {
  await page.goto("/#/welcome/member/invitation")
  const code = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo") ?? "null")?.org?.inviteCode ?? null)
  for (const path of ["/#/join?invite=nope", "/#/welcome/classic-join?invite=nope", "/#/welcome/member/you?invite=nope"]) {
    await page.goto(path)
    await expect(page).toHaveURL(/#\/welcome\/member\/invitation\?invite=nope$/)
    await expect(page.getByTestId("invalid-invite")).toBeVisible()
    await expect(page.locator("main")).toHaveCount(1)
  }
  if (code) {
    await page.goto(`/#/join?invite=${encodeURIComponent(code)}`)
    await expect(page.getByTestId("invite-line")).toBeVisible()
  }
  expect(await scan(page)).toEqual([])
})
test("member/about (removed in ob-6) goes on to Done", async ({ page }) => {
  await page.goto("/#/welcome/member/about")
  await expect(page).toHaveURL(/#\/welcome\/member\/done$/)
})
test("Exit on a flow screen records the step it left from", async ({ page }) => {
  await page.goto("/#/welcome/start")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)   // wait for the start to finish, or its redirect can land after the next address
  await page.goto("/#/welcome/founder/team")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.founder.team.title)
  await page.getByRole("button", { name: "Exit" }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  const rec = await onboardingRecord(page)
  expect(rec.attempts[0].flowVersion).toBe("ob-6")
  expect(rec.attempts[0].steps).toContainEqual(expect.objectContaining({ step: "founder.team", event: "exit" }))
})

test("the progress chain looks like what it says: done and current dots are filled, skipped ones are hollow and dashed, upcoming ones are hollow", async ({ page }) => {
  await page.goto("/#/welcome/start")
  await page.getByLabel(c.founder.name.field).fill("Maple Club")                  // the name starts empty
  await page.getByRole("button", { name: c.skip, exact: true }).click()           // the first event skipped
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  const mark = (state: string) => page.locator(`.ob-dot.is-${state} .ob-dot-mark`).first().evaluate(e => { const s = getComputedStyle(e); return { bg: s.backgroundColor, border: s.borderStyle } })
  await expect(page.locator(".ob-dot.is-now")).toContainText("Team")
  await expect.poll(async () => (await mark("now")).bg, { message: "the current dot is filled" }).not.toBe("rgba(0, 0, 0, 0)")   // under load the style can land a frame late
  const now = await mark("now"), skipped = await mark("skipped"), todo = await mark("todo")
  expect(now.border).toBe("solid")
  expect(skipped.bg).toBe("rgba(0, 0, 0, 0)"); expect(skipped.border).toBe("dashed")
  expect(todo.border).toBe("solid"); expect(todo.bg).not.toBe(now.bg)
  // Back, then Plan it and Continue: the first screen is done (filled) again.
  await page.getByRole("button", { name: c.back, exact: true }).click()
  await page.getByRole("button", { name: "Spring dinner", exact: true }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta, exact: true }).click()
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  const done = await mark("done")
  expect(done.bg).toBe(now.bg); expect(done.border).toBe("solid")
})
