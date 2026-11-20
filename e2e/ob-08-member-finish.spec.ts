import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { WELCOME_ON, onboardingRecord } from "./ob-helpers"

// OB-08: the last three member screens (Busy weeks, About you, Done). Run on desktop and phone.
const BUSY = "/#/welcome/member/busy-weeks"
const MEMBER_KEY = "platypus.v1.onboarding.member"
const EXTRA_KEY = "platypus.v1.onboarding.member.extra"
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => v.id)
const session = (page: Page, key: string) => page.evaluate(k => JSON.parse(sessionStorage.getItem(k) ?? "null") as Record<string, unknown> | null, key)
/** Words a person can read inside <main>, not counting screen-reader-only text. */
const words = (page: Page) => page.evaluate(() => {
  const count = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
  const hidden = [...document.querySelectorAll<HTMLElement>("main .sr-only")].reduce((n, el) => n + count(el.innerText), 0)
  return count(document.querySelector("main")!.innerText) - hidden
})
const club = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo") ?? "null") as { viewerId: string; today: string; org: { inviteCode: string }; people: Record<string, unknown>[]; nodes: { id: string; title: string; ownerId: string | null; status: string; clubDeadline: string | null }[] })
const cont = (page: Page) => page.getByRole("button", { name: "Continue" }).click()
/** Start a recorded walkthrough, then jump to the member preview (the founder screens are other packages). */
const begin = async (page: Page) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: "Start walkthrough" }).click()
  // The start route creates the attempt before navigating here; do not unmount it by jumping ahead.
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.evaluate(() => { location.hash = "#/welcome/member/invitation" })
  await expect(page.getByTestId("role-card")).toBeVisible()
}
const toBusy = async (page: Page) => { await begin(page); await cont(page); await cont(page); await cont(page); await expect(page).toHaveURL(/member\/busy-weeks$/) }

test("the week strip: many weeks can be chosen, finals and breaks are marked, every saved week is a Monday", async ({ page }) => {
  await page.goto(BUSY)
  const cells = page.getByTestId("week-strip").getByRole("button")
  await expect(cells).toHaveCount(18)
  for (const cell of await page.locator("[data-week][aria-pressed=true]").all()) await cell.click()   // the sample officer may already have a busy week
  await expect(page.getByTestId("week-strip").locator("[data-kind=finals]").first()).toHaveAttribute("aria-label", /finals week, already avoided/)
  await expect(page.getByTestId("week-strip").locator("[data-kind=between]").first()).toHaveAttribute("aria-label", /between semesters/)
  await expect(page.getByTestId("week-strip").locator("[data-kind=holiday]").first()).toHaveAttribute("aria-label", /holiday/)
  await expect(page.getByTestId("week-strip").locator("[data-kind=finals]").first()).toHaveAttribute("data-week", "2026-12-07")
  await cells.nth(1).click(); await cells.nth(3).click(); await cells.nth(7).click()
  await expect(cells.nth(1)).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("week-count")).toHaveText("3 busy")
  await cells.nth(3).click()
  await expect(cells.nth(3)).toHaveAttribute("aria-pressed", "false")
  await page.getByTestId("week-strip").locator("[data-kind=finals]").first().click()   // a finals week can be chosen too
  const saved = (await session(page, EXTRA_KEY))!
  const weeks = saved.busyWeeks as string[]
  expect(weeks).toHaveLength(3)
  for (const w of weeks) expect(new Date(`${w}T12:00:00Z`).getUTCDay()).toBe(1)
  expect(weeks).toContain("2026-12-07")
  expect(await page.getByTestId("week-strip").locator("[data-week]").evaluateAll(els => els.every(el => new Date(`${el.getAttribute("data-week")}T12:00:00Z`).getUTCDay() === 1))).toBe(true)
  expect(await words(page)).toBeLessThanOrEqual(40)
})
test("a week is a keyboard button, big enough to tap, and at most 20 can be chosen", async ({ page }) => {
  await page.goto(BUSY)
  const first = page.getByTestId("week-strip").getByRole("button").first()
  await first.focus()
  await page.keyboard.press("Space")
  await expect(first).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("Enter")
  await expect(first).toHaveAttribute("aria-pressed", "false")
  for (const cell of await page.getByTestId("week-strip").getByRole("button").all()) { const box = (await cell.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44) }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  // A club that already has 20 busy weeks (stored for this preview) cannot add a 21st.
  const twenty = Array.from({ length: 20 }, (_, i) => { const d = new Date(Date.UTC(2027, 0, 4 + i * 7)); return d.toISOString().slice(0, 10) })
  await page.evaluate(([k, w]) => sessionStorage.setItem(k as string, JSON.stringify({ v: 1, personId: "maya", busyWeeks: w })), [EXTRA_KEY, twenty])
  await page.reload()
  await expect(page.getByTestId("week-strip").getByRole("button").first()).toBeDisabled()
  await expect(page.getByTestId("week-count")).toContainText("Up to 20 weeks.")
})
test("Skip on Busy weeks leaves a hollow dashed dot, keeps nothing, and moves on", async ({ page }) => {
  await toBusy(page)
  await page.getByTestId("week-strip").getByRole("button").nth(2).click()
  await page.getByRole("button", { name: "Skip — nothing busy yet" }).click()
  await expect(page).toHaveURL(/member\/about$/)
  const dot = page.locator(".ob-dot.is-skipped")
  await expect(dot).toHaveCount(1)
  await expect(dot).toContainText("Busy weeks, skipped")
  await expect(dot.locator(".ob-dot-mark")).toHaveCSS("border-top-style", "dashed")
  expect(await session(page, EXTRA_KEY)).not.toHaveProperty("busyWeeks")
  expect((await onboardingRecord(page)).attempts[0].steps.some(s => s.step === "member.busy-weeks" && s.event === "skip")).toBe(true)
})
test("About you: a suggestion fills or adds to the answer; more than 500 characters is stopped", async ({ page }) => {
  await page.goto("/#/welcome/member/about")
  await expect(page.getByRole("heading", { name: "What would make this role worthwhile?" })).toBeVisible()
  await expect(page.locator(".ob-m-chip")).toHaveCount(9)
  const goal = page.getByRole("textbox", { name: "Career goal" })
  await goal.fill("")   // the sample officer already has an answer
  await page.getByRole("group", { name: "Career goal suggestions" }).getByRole("button", { name: "Leadership" }).click()
  await expect(goal).toHaveValue("Leadership")
  await page.getByRole("group", { name: "Career goal suggestions" }).getByRole("button", { name: "Finance" }).click()
  await expect(goal).toHaveValue("Leadership, Finance")
  await page.getByRole("group", { name: "Career goal suggestions" }).getByRole("button", { name: "Finance" }).click()   // no duplicates
  await expect(goal).toHaveValue("Leadership, Finance")
  await page.getByRole("textbox", { name: "Interests" }).fill("Concerts and design")
  expect(await session(page, EXTRA_KEY)).toMatchObject({ personId: "maya", careerGoal: "Leadership, Finance", interests: "Concerts and design" })
  await page.getByRole("textbox", { name: "Expectations" }).fill("x".repeat(501))
  await expect(page.getByRole("alert")).toContainText("under 500 characters")
  await cont(page)
  await expect(page).toHaveURL(/member\/about$/)
  expect((await session(page, EXTRA_KEY))?.expectations).toBeUndefined()
  await page.getByRole("textbox", { name: "Expectations" }).fill("x".repeat(500))
  await expect(page.getByRole("alert")).toHaveCount(0)
  expect(await words(page)).toBeLessThanOrEqual(40)
  await cont(page)
  await expect(page).toHaveURL(/member\/done$/)
})
test("Skip on About you keeps nothing and goes to Done", async ({ page }) => {
  await page.goto("/#/welcome/member/about")
  await page.getByRole("group", { name: "Interests suggestions" }).getByRole("button", { name: "Events" }).click()
  await page.getByRole("button", { name: "Skip for now" }).click()
  await expect(page).toHaveURL(/member\/done$/)
  expect(await session(page, EXTRA_KEY)).not.toHaveProperty("interests")
  await expect(page.locator(".ob-dot.is-skipped")).toHaveCount(1)
})
test("the whole preview: Done saves the officer once, with no ASU ID, keeps the viewer, and clears what was staged", async ({ page }) => {
  const calls: string[] = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) calls.push(r.url()) })
  await begin(page)
  const before = await club(page)
  await cont(page)   // invitation -> you
  await page.getByLabel("Name").fill("Maya C.")
  await cont(page)   // you -> reminders
  await page.getByRole("radio", { name: "SMS" }).check()
  await page.getByLabel("Phone (optional)").fill("480-555-0142")
  await page.getByRole("radio", { name: "Morning" }).check()
  await cont(page)   // reminders -> busy weeks
  for (const cell of await page.locator("[data-week][aria-pressed=true]").all()) await cell.click()
  await page.getByTestId("week-strip").getByRole("button").nth(1).click()
  await page.getByTestId("week-strip").getByRole("button").nth(4).click()
  const picked = ((await session(page, EXTRA_KEY))!.busyWeeks as string[]).slice()
  await cont(page)
  await page.getByRole("textbox", { name: "Career goal" }).fill("")   // the sample officer already has answers
  await page.getByRole("group", { name: "Career goal suggestions" }).getByRole("button", { name: "Marketing" }).click()
  await page.getByRole("textbox", { name: "Interests" }).fill("Concerts")
  await cont(page)
  await expect(page).toHaveURL(/member\/done$/)
  await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible()

  const after = await club(page)
  const maya = after.people.find(p => p.id === "maya")!
  const was = before.people.find(p => p.id === "maya")!
  expect(maya).toMatchObject({ name: "Maya C.", phone: "480-555-0142", channels: ["sms"], remindAt: "morning", busyWeeks: picked, careerGoal: "Marketing", interests: "Concerts" })
  expect(maya.asuId ?? "").toBe("")
  expect(maya.personalBufferDays).toBe(was.personalBufferDays)
  expect(maya.personalBufferEnabled).toBe(was.personalBufferEnabled)
  expect(maya.freeSlots).toEqual(was.freeSlots)
  expect(maya.roleId).toBe(was.roleId)
  expect(after.people.filter(p => p.id !== "maya")).toEqual(before.people.filter(p => p.id !== "maya"))   // nobody else changed
  expect(after.viewerId).toBe(before.viewerId)
  expect(await session(page, MEMBER_KEY)).toBeNull()
  expect(await session(page, EXTRA_KEY)).toBeNull()

  // The first task is the officer's earliest open one, with the club date from the node.
  const mine = after.nodes.filter(n => n.ownerId === "maya" && n.status !== "done" && n.clubDeadline).sort((a, b) => a.clubDeadline!.localeCompare(b.clubDeadline!))
  expect(mine.length).toBeGreaterThan(0)
  const card = page.getByTestId("first-task")
  await expect(card).toContainText(mine[0].title)
  await expect(card.locator("time")).toHaveAttribute("data-date", mine[0].clubDeadline!)
  // The chart shows the officer's box.
  await expect(page.getByTestId("join-chart").locator(".org-card.is-joined")).toHaveText("Treasurer")
  await expect(page.getByTestId("join-chart").locator(".org-card.is-joined")).toHaveCount(1)

  await page.getByRole("button", { name: "Open my tasks" }).click()
  await expect(page).toHaveURL(/#\/tasks$/)
  expect((await club(page)).viewerId).toBe(before.viewerId)
  const attempt = (await onboardingRecord(page)).attempts[0]
  expect(attempt.outcome).toBe("completed")
  expect(attempt.steps.some(s => s.step === "member.done" && s.event === "complete")).toBe(true)
  expect(calls).toEqual([])
})
test("Done does not save a profile that fails the Settings rules, and says so", async ({ page }) => {
  await page.goto("/#/welcome/member/invitation")
  await cont(page)   // the club exists now
  const before = await club(page)
  await page.evaluate(k => sessionStorage.setItem(k, JSON.stringify({ v: 1, personId: "maya", email: "maya@gmail.com" })), MEMBER_KEY)
  await page.evaluate(() => { location.hash = "#/welcome/member/done" })
  await expect(page.getByRole("alert")).toContainText("example.org")
  await expect(page.getByRole("alert")).toContainText("We couldn't save your choices")
  expect((await club(page)).people).toEqual(before.people)
  expect(await session(page, MEMBER_KEY)).not.toBeNull()   // kept, so Back can fix it
  await page.getByRole("button", { name: "Back" }).click()
  await expect(page).toHaveURL(/member\/about$/)
})
test("Done with no task for the officer shows the empty line and a Tasks preview line", async ({ page }) => {
  await page.goto("/#/welcome/member/invitation")
  await cont(page)
  await page.getByRole("button", { name: "Back" }).click()
  await page.getByRole("button", { name: "Change" }).click()
  await page.getByRole("combobox", { name: "Preview as" }).selectOption("priya")
  // Give the secretary a club with nothing open: mark her steps done in the saved demo, then open Done again.
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); for (const n of s.nodes) if (n.ownerId === "priya") n.status = "done"; localStorage.setItem("platypus.v1.demo", JSON.stringify(s)) })
  await page.reload()   // still on the invitation: the chosen officer waits in sessionStorage
  await expect(page.getByTestId("member-strip")).toContainText("Previewing as Priya Nair")
  await page.evaluate(() => { location.hash = "#/welcome/member/done" })
  const card = page.getByTestId("first-task")
  await expect(card).toContainText("You'll see tasks here when your president assigns one.")
  await expect(card).toContainText("Tasks lists what's yours")
  await expect(card.locator("time")).toHaveCount(0)
})
test("Done: the chart box appears with a fade only; with reduced motion it is simply highlighted", async ({ page }) => {
  await page.goto("/#/welcome/member/invitation")
  await cont(page)
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.evaluate(() => { location.hash = "#/welcome/member/done" })
  const box = page.getByTestId("join-chart").locator(".org-card.is-joined")
  await expect(box).toHaveCSS("animation-name", "ob-m-join")
  expect(parseFloat(await box.evaluate(el => getComputedStyle(el).animationDuration))).toBeGreaterThan(0.1)
  await expect(page.locator(".org-card:not(.is-joined)").first()).toHaveCSS("animation-name", "none")
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(parseFloat(await box.evaluate(el => getComputedStyle(el).animationDuration))).toBeLessThan(0.01)
  await expect(box).toHaveCSS("border-top-width", "2px")
})
test("the three screens have no accessibility problems, in light and dark", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto(BUSY)
    await page.getByTestId("week-strip").getByRole("button").nth(1).click()
    expect(await scan(page), `busy ${scheme}`).toEqual([])
    await page.goto("/#/welcome/member/about")
    await page.getByRole("button", { name: "Leadership" }).click()
    expect(await scan(page), `about ${scheme}`).toEqual([])
    await page.getByRole("textbox", { name: "Interests" }).fill("x".repeat(501))
    expect(await scan(page), `about error ${scheme}`).toEqual([])
    await page.goto("/#/welcome/member/done")
    await expect(page.getByTestId("first-task")).toBeVisible()
    expect(await scan(page), `done ${scheme}`).toEqual([])
  }
})
test("each screen stays within 40 words you see at once, and nothing overflows the phone", async ({ page }) => {
  await page.goto("/#/welcome/member/invitation"); await cont(page)
  for (const path of ["busy-weeks", "about", "done"]) {
    await page.evaluate(p => { location.hash = `#/welcome/member/${p}` }, path)
    await expect(page.locator("main h1")).toBeVisible()
    expect(await words(page), path).toBeLessThanOrEqual(40)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true)
    const next = page.getByRole("button", { name: path === "done" ? "Open my tasks" : "Continue" })
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})
