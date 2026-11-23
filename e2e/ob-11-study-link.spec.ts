import { expect, test, type Page } from "@playwright/test"
import { WELCOME_ON, onboardingRecord } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// Phase 3 study link and the skippable first event (on screen 1 since ob-6). Runs on desktop and phone (Pixel 7).
// The study link is https://platypus-officer-hub.netlify.app/#/start: no flag needed, one recorded attempt, straight to the founder name screen.
type Saved = { today: string; org: { name: string; setupCompletedOn: string | null }; events: { id: string; name: string }[] }
const demo = async (page: Page) => JSON.parse((await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))) ?? "null") as Saved
const nameScreen = (page: Page) => expect(page.getByRole("heading", { level: 1, name: c.founder.name.title })).toBeVisible()
const cont = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
const chainDot = (page: Page, label: string) => page.getByRole("list", { name: c.progress }).getByRole("listitem").filter({ hasText: label })

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))   // the local grammar plans the event
})

for (const url of ["/#/start", "/?walkthrough=1#/start", "/#/start?walkthrough=1"]) test(`the study link ${url} opens the founder name screen as one recorded attempt`, async ({ page }) => {
  await page.goto(url)
  await nameScreen(page)
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("link", { name: "Tasks" })).toHaveCount(0)              // the focus shell, not the app
  await noSideScroll(page)
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0]).toMatchObject({ entry: "start", replay: 0, flowVersion: "ob-6" })
  expect(rec.attempts[0].steps.map(s => `${s.step}:${s.event}`)).toEqual(["founder.name:enter"])
})

test("a reload on the name screen stays in setup and does not start a second attempt", async ({ page }) => {
  await page.goto("/#/start")
  await nameScreen(page)
  await page.reload()
  await nameScreen(page)
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.reload()
  await nameScreen(page)
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0].outcome).toBeUndefined()                                       // still open, not exited
  await page.getByLabel(c.founder.name.field).fill("Maple Club")
  await page.getByRole("button", { name: c.skip, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  expect((await onboardingRecord(page)).attempts[0].steps.map(s => `${s.step}:${s.event}`)).toEqual(["founder.name:enter", "founder.name:skip", "founder.name:leave", "founder.team:enter"])
})

test("the study link works in a browser that already has saved demo data and a finished welcome", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.explore }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await expect.poll(async () => (await demo(page))?.org?.name ?? "").not.toBe("")
  await page.goto("/#/start")
  await nameScreen(page)
  const rec = await onboardingRecord(page)
  expect(rec.attempts.map(a => `${a.entry}:${a.outcome ?? "open"}`)).toEqual(["explore:explored", "start:open"])
})

test("the plain root address with no flag still opens Today and records nothing; /welcome/start still works", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("main h1")).toHaveText("Reminders")
  expect(await onboardingRecord(page)).toEqual({ attempts: [] })
  await page.goto("/#/welcome/start")
  await nameScreen(page)
  expect((await onboardingRecord(page)).attempts).toHaveLength(1)
})

/** Screen 1 with the club named (ob-6: the first event is on the same screen). */
const named = async (page: Page, club = "Maple Club") => {
  await page.goto("/#/start")
  await page.getByLabel(c.founder.name.field).fill(club)
  await expect(page.getByRole("heading", { level: 2, name: c.founder.firstEvent.title })).toBeVisible()
}
const FIRST = "Name and first event"

test("the progress chain has three dots: screen 1 is optional only for its event, Team and Invite are required", async ({ page }) => {
  await page.goto("/#/start")
  await nameScreen(page)
  await expect(page.getByRole("list", { name: c.progress }).getByRole("listitem")).toHaveCount(3)
  for (const label of ["Team", "Invite"]) await expect(chainDot(page, label)).not.toContainText("optional")
})

test("Skip for now on the first event: Team follows with no event, Back returns, and Start workspace creates the club without an event", async ({ page }) => {
  await named(page)
  // Skip is one press away; Plan it waits for a sentence (an example chip writes one). Nothing is planned until the president asks.
  await expect(page.getByRole("textbox", { name: c.founder.firstEvent.sentenceLabel })).toHaveValue("")
  await expect(page.getByRole("button", { name: c.founder.firstEvent.cta })).toBeDisabled()
  await expect(page.getByRole("button", { name: c.skip })).toBeEnabled()
  await expect(page.getByRole("region", { name: c.founder.firstEvent.chainLabel })).toHaveCount(0)
  await noSideScroll(page)
  await page.getByRole("button", { name: c.skip }).click()

  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await expect(chainDot(page, FIRST)).toContainText(`${FIRST}, skipped`)
  await noSideScroll(page)

  // Back from Team returns to screen 1; nothing is planned, and Skip is still there.
  await page.getByRole("button", { name: c.back, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("button", { name: c.next, exact: true })).toBeDisabled()
  await page.getByRole("button", { name: c.skip }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)

  await page.getByRole("button", { name: c.founder.team.start }).click()
  await expect(page.getByRole("heading", { level: 1, name: c.founder.invite.title })).toBeVisible()
  await expect.poll(async () => (await demo(page)).org.name).toBe("Maple Club")
  const s = await demo(page)
  expect(s.org.setupCompletedOn).toBe(s.today)
  expect(s.events.filter(e => e.id.startsWith("setup-event-"))).toEqual([])

  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0].setupChoice).toBe("start-workspace")
  const steps = rec.attempts[0].steps.map(x => `${x.step}:${x.event}`)
  expect(steps.filter(x => x === "founder.name:skip")).toHaveLength(2)                  // ob-6: the first event's Skip is screen 1's
  expect(steps).toContain("founder.team:back")
  expect(JSON.stringify(rec)).not.toContain("Maple")                                     // behaviour only, never content
})

test("Skip, Back, then plan after all: the event comes back and screen 1 is no longer marked skipped", async ({ page }) => {
  await named(page)
  await page.getByRole("button", { name: c.skip }).click()
  await expect(chainDot(page, FIRST)).toContainText(`${FIRST}, skipped`)
  await page.getByRole("button", { name: c.back, exact: true }).click()           // Team → screen 1
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await expect(page.getByRole("region", { name: c.founder.firstEvent.chainLabel })).toBeVisible()
  await cont(page)
  await expect(chainDot(page, FIRST)).toContainText(`${FIRST}, done`)
  await page.getByRole("button", { name: c.founder.team.start }).click()
  await expect(page.getByRole("heading", { level: 1, name: c.founder.invite.title })).toBeVisible()
  await expect.poll(async () => (await demo(page)).events.map(e => e.name)).toContain("Welcome Mixer")
})

test("on a phone, Skip for now is a full-size target next to Continue", async ({ page, isMobile }) => {
  test.skip(!isMobile, "finger sizes")
  await named(page)
  for (const name of [c.next, c.skip]) {
    const b = await page.getByRole("button", { name, exact: true }).boundingBox()
    expect(b!.height).toBeGreaterThanOrEqual(44)
  }
  await noSideScroll(page)
})
