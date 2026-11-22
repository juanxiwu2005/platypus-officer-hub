import { expect, test, type Page } from "@playwright/test"
import { MISSION, onboardingRecord, passReminders } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// P3-D: a reload in the middle of the founder flow (or a phone reloading the tab after switching apps) keeps everything the president typed and
// stays on the same screen; a new attempt (the study link again, Start walkthrough, Replay) starts from a fresh draft. Desktop and Pixel 7.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))   // local grammar and local reading
})

type Draft = { tab: string; club: { name: string; mission: string; goals: { id: string; target: number }[]; roles: { displayName: string }[] }; event: { name: string } | null; date: string; buffer: number; skipped: string[]; doc: { fileName: string } | null; applied: boolean }
/** The saved draft in this browser's database, or null. */
const saved = (page: Page) => page.evaluate(() => new Promise<Draft | null>(resolve => {
  const open = indexedDB.open("platypus.docs", 1)
  open.onupgradeneeded = () => { open.result.createObjectStore("docs", { keyPath: "id" }) }
  open.onsuccess = () => { const get = open.result.transaction("docs", "readonly").objectStore("docs").get("onboarding-draft"); get.onsuccess = () => { open.result.close(); resolve((get.result?.value ?? null) as Draft | null) }; get.onerror = () => resolve(null) }
  open.onerror = () => resolve(null)
}))
/** Reload once the draft on screen has been saved (the save waits a quarter second after the last change). */
const reloadAfterSave = async (page: Page, check: (d: Draft) => boolean) => {
  await expect.poll(async () => { const d = await saved(page); return !!d && check(d) }).toBe(true)
  await page.reload()
}
const cont = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
const h1 = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
const chain = (page: Page) => page.getByRole("region", { name: c.founder.firstEvent.chainLabel })

/** Study link → Name → Constitution (sample, read in the browser) → Goals. */
const toGoals = async (page: Page, club = "Sun Devil Robotics Club") => {
  await page.goto("/#/start")
  await page.getByLabel(c.founder.name.field).fill(club); await cont(page)
  await page.getByRole("button", { name: c.founder.constitution.sample }).click()
  await expect(page.getByTestId("reading-note")).toBeVisible()
  await cont(page)
  await h1(page, c.founder.goals.title)
}

test("Name starts empty with an example, and Continue waits for a name", async ({ page }) => {
  await page.goto("/#/start")
  const name = page.getByLabel(c.founder.name.field)
  await expect(name).toHaveValue("")
  await expect(name).toHaveAttribute("placeholder", c.founder.name.example)
  await expect(page.getByRole("button", { name: c.next, exact: true })).toBeDisabled()
  await name.fill("   ")
  await expect(page.getByRole("button", { name: c.next, exact: true })).toBeDisabled()
  await name.fill("Sun Devil Robotics Club")
  await expect(page.getByRole("button", { name: c.next, exact: true })).toBeEnabled()
})

test("a reload on Goals keeps the name, the constitution's roles, the mission and the goals, on the same screen", async ({ page }) => {
  await toGoals(page)
  const mission = page.getByRole("textbox", { name: c.founder.goals.missionField })
  await expect(mission).toHaveValue("")
  await mission.fill(MISSION)
  await page.getByRole("switch", { name: "External income" }).check()
  await page.getByRole("button", { name: "Increase Active members" }).click()
  await reloadAfterSave(page, d => d.club.mission === MISSION && d.club.goals.length === 3 && d.club.goals.some(g => g.target === 45))
  await expect(page).toHaveURL(/#\/welcome\/founder\/goals$/)
  await h1(page, c.founder.goals.title)
  await expect(page.getByRole("textbox", { name: c.founder.goals.missionField })).toHaveValue(MISSION)
  for (const g of ["Weekly events", "Active members", "External income"]) await expect(page.getByRole("switch", { name: g })).toBeChecked()
  await expect(page.getByRole("spinbutton", { name: "Active members target" })).toHaveValue("45")
  // Back on Constitution: the document is still chosen, and its reading (finished before the reload) is still there.
  await page.getByRole("button", { name: c.back }).click()
  await expect(page.getByTestId("constitution-chip")).toBeVisible()
  await expect(page.getByTestId("reading-note")).toBeVisible()
  await page.getByRole("button", { name: c.back }).click()
  await expect(page.getByLabel(c.founder.name.field)).toHaveValue("Sun Devil Robotics Club")
  // Still one attempt, still open.
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0].outcome).toBeUndefined()
})

test("a reload on Team keeps edited roles and people; a reload on First event keeps the planned event and buffer; a reload on Confirm keeps it all", async ({ page }) => {
  await toGoals(page)
  await page.getByRole("textbox", { name: c.founder.goals.missionField }).fill(MISSION)
  await cont(page)
  await h1(page, c.founder.team.title)
  const roles = await page.locator(".ob-role-title").count()
  await page.getByRole("textbox", { name: "Role 2" }).fill("Executive Vice President of Internal Affairs")
  await page.getByRole("textbox", { name: "Person 2" }).fill("Dana Cole")
  await reloadAfterSave(page, d => d.club.roles.some(r => r.displayName === "Executive Vice President of Internal Affairs"))
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await expect(page.getByRole("textbox", { name: "Role 2" })).toHaveValue("Executive Vice President of Internal Affairs")
  await expect(page.getByRole("textbox", { name: "Person 2" })).toHaveValue("Dana Cole")
  await expect(page.locator(".ob-role-title")).toHaveCount(roles)
  await cont(page)

  await h1(page, c.founder.firstEvent.title)
  await expect(page.getByRole("textbox", { name: c.founder.firstEvent.sentenceLabel })).toHaveValue("")
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await expect(chain(page)).toBeVisible()
  await page.getByRole("button", { name: "5 days" }).click()
  const dots = await chain(page).getByRole("listitem").allInnerTexts()
  await reloadAfterSave(page, d => d.event?.name === "Welcome Mixer" && d.buffer === 5)
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  await expect(chain(page)).toBeVisible()
  expect(await chain(page).getByRole("listitem").allInnerTexts()).toEqual(dots)
  await expect(page.getByRole("button", { name: "5 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: c.next, exact: true })).toBeEnabled()
  await cont(page)
  await passReminders(page, "auto_email")                                  // P3-H (its own reload is in e2e/p3h-reminder-mode.spec.ts)

  await h1(page, c.founder.confirm.title)
  await page.reload()
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
  await expect(page.getByTestId("confirm-summary")).toContainText("Sun Devil Robotics Club")
  await expect(page.getByTestId("confirm-summary")).toContainText("Welcome Mixer")
  await expect(page.getByText(c.founder.confirm.missing)).toHaveCount(0)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  await expect.poll(async () => JSON.parse((await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))) ?? "{}")?.org?.name).toBe("Sun Devil Robotics Club")
  await expect.poll(() => saved(page)).toBeNull()                         // finishing deletes the saved draft
  await page.reload()
  await h1(page, c.founder.invite.title)                                   // a reload after finishing stays on Invite
})

test("a reload after Skip for now on First event keeps the skip, and Confirm starts without an event", async ({ page }) => {
  await page.goto("/#/start")
  await page.getByLabel(c.founder.name.field).fill("Maple Club"); await cont(page)
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await page.getByRole("textbox", { name: c.founder.goals.missionField }).fill(MISSION)
  await page.getByRole("button", { name: c.skip }).click()
  await page.getByRole("button", { name: c.skip }).click()
  await page.getByRole("button", { name: c.skip }).click()                 // First event
  await passReminders(page)                                                // Reminders
  await h1(page, c.founder.confirm.title)
  await reloadAfterSave(page, d => d.skipped.includes("founder.first-event") && d.skipped.includes("founder.reminders"))
  await expect(page.getByTestId("confirm-no-event")).toBeVisible()
  await expect(page.getByTestId("confirm-summary")).toContainText("Maple Club")
})

test("after a finished attempt, the study link starts a fresh draft", async ({ page }) => {
  await page.goto("/#/start")
  await page.getByLabel(c.founder.name.field).fill("First Club"); await cont(page)
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await page.getByRole("textbox", { name: c.founder.goals.missionField }).fill(MISSION)
  await page.getByRole("button", { name: c.skip }).click()
  await page.getByRole("button", { name: c.skip }).click()
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await cont(page)
  await passReminders(page)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await page.getByRole("button", { name: c.founder.invite.today }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")

  await page.goto("/#/start")
  await expect(page.getByLabel(c.founder.name.field)).toHaveValue("")
  await page.getByLabel(c.founder.name.field).fill("Second Club"); await cont(page)
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await expect(page.getByRole("textbox", { name: c.founder.goals.missionField })).toHaveValue("")
  await page.getByRole("textbox", { name: c.founder.goals.missionField }).fill(MISSION)
  await page.getByRole("button", { name: c.skip }).click()
  await page.getByRole("button", { name: c.skip }).click()
  await expect(page.getByRole("textbox", { name: c.founder.firstEvent.sentenceLabel })).toHaveValue("")
  await expect(chain(page)).toHaveCount(0)                                // no event carried over from the first attempt
  const rec = await onboardingRecord(page)
  expect(rec.attempts.map(a => a.outcome ?? "open")).toEqual(["completed", "open"])
})

test("opening the study link again mid-attempt starts fresh and closes the earlier attempt as exited (with no exit step)", async ({ page }) => {
  await page.goto("/#/start")
  await page.getByLabel(c.founder.name.field).fill("Half Club"); await cont(page)
  await expect.poll(async () => (await saved(page))?.club.name).toBe("Half Club")
  await page.goto("/#/start")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByLabel(c.founder.name.field)).toHaveValue("")
  await page.reload()                                                      // the old draft never comes back, even after a reload
  await expect(page.getByLabel(c.founder.name.field)).toHaveValue("")
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(2)
  expect(rec.attempts[0].outcome).toBe("exited")
  expect(rec.attempts[0].steps.some(s => s.event === "exit")).toBe(false)
  expect(rec.attempts[1].outcome).toBeUndefined()
})

test("Exit ends the attempt and deletes the saved draft: the next start is fresh", async ({ page }) => {
  await page.goto("/#/start")
  await page.getByLabel(c.founder.name.field).fill("Gone Club")
  await expect.poll(async () => (await saved(page))?.club.name).toBe("Gone Club")
  await page.getByRole("button", { name: c.exit }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await expect.poll(() => saved(page)).toBeNull()
  await page.goBack()                                                      // even the browser's Back does not bring it back
  await expect(page.getByLabel(c.founder.name.field)).toHaveValue("")
})

test("Team on a phone-sized screen: nothing wider than the screen, and a long role title is shown in full", async ({ page }) => {
  for (const size of [{ width: 412, height: 915 }, { width: 390, height: 844 }]) {   // Pixel 7, iPhone 13
    await page.setViewportSize(size)
    await page.goto("/#/welcome/founder/team")
    await page.getByRole("textbox", { name: "Role 2" }).fill("Executive Vice President of Internal Affairs and Outreach")
    const wide = await page.evaluate(() => [...document.querySelectorAll(".ob-team *")].filter(el => el.getBoundingClientRect().right > window.innerWidth + 0.5 && !el.closest(".org-scroll")).map(el => el.className))
    expect(wide).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    const title = page.getByRole("textbox", { name: "Role 2" })
    expect(await title.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true)          // not cut: every line is shown
    expect(await title.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(50)      // it wrapped onto a second line
    const head = page.locator(".ob-team-head span", { hasText: c.founder.team.reportsTo })
    const box = (await head.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(size.width)
  }
})

test("the org chart opens with the top role in view, and a fade marks the side with more to see", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto("/#/welcome/founder/team")
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: c.founder.team.add }).click()
  const scroller = page.getByTestId("org-chart").locator(".org-scroll")
  await scroller.scrollIntoViewIfNeeded()
  expect(await scroller.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true)
  await reloadAfterSave(page, d => d.club.roles.length === 9)               // the chart's first view, with the wide team
  await scroller.scrollIntoViewIfNeeded()
  const pres = page.getByTestId("org-chart").locator(".org-card", { hasText: "President" }).first()
  const [p, s] = [(await pres.boundingBox())!, (await scroller.boundingBox())!]
  expect(p.x).toBeGreaterThanOrEqual(s.x)
  expect(p.x + p.width).toBeLessThanOrEqual(s.x + s.width)
  expect(Math.abs(p.x + p.width / 2 - (s.x + s.width / 2))).toBeLessThanOrEqual(24)              // centred
  const fade = page.getByTestId("org-fade")
  await expect(fade).toHaveClass(/more-left/)
  await expect(fade).toHaveClass(/more-right/)
  await scroller.evaluate(el => { el.scrollLeft = el.scrollWidth })
  await expect(fade).not.toHaveClass(/more-right/)
  await scroller.evaluate(el => { el.scrollLeft = 0 })
  await expect(fade).not.toHaveClass(/more-left/)
  // A chart that fits shows no fade at all.
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto("/#/welcome/test/president")
  await page.goto("/#/welcome/founder/team")
  await expect(page.getByTestId("org-fade")).not.toHaveClass(/more-(left|right)/)
})
