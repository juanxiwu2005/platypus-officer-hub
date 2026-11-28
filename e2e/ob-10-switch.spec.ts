import { expect, test } from "@playwright/test"
import { WELCOME_ON, onboardingRecord } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { openDemoMenu } from "./helpers"

// OB-10: Start walkthrough now runs the new founder flow end to end, then the officer preview, in ONE recorded attempt.
const next = (page: import("@playwright/test").Page) => page.getByRole("button", { name: c.next, exact: true })

test("a first visit runs welcome → founder flow → invite → officer preview → tasks as one recorded attempt", async ({ page }) => {
  const forbidden: string[] = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) forbidden.push(r.url()) })
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.getByLabel(c.founder.name.field).fill("Moonlight Typing Society")
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await next(page).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.getByRole("button", { name: c.founder.team.start }).click()
  await expect(page.getByRole("heading", { level: 1, name: c.founder.invite.title })).toBeVisible()
  await page.getByRole("button", { name: c.founder.invite.preview }).click()
  await expect(page).toHaveURL(/#\/welcome\/member\/invitation$/)
  await next(page).click(); await next(page).click()                              // invitation, reminders
  await page.getByRole("button", { name: c.member.busyWeeks.skip }).click()
  await expect(page).toHaveURL(/#\/welcome\/member\/done$/)
  await page.getByRole("button", { name: c.member.done.cta }).click()
  await expect(page).toHaveURL(/#\/tasks/)

  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0]).toMatchObject({ entry: "start", outcome: "completed", flowVersion: "ob-6", setupChoice: "start-workspace" })
  const steps = rec.attempts[0].steps.map(s => `${s.step}:${s.event}`)
  expect(steps.slice(0, 6)).toEqual(["founder.name:enter", "founder.name:leave", "founder.team:enter", "founder.team:leave", "founder.invite:enter", "founder.invite:leave"])
  for (const expected of ["member.invitation:enter", "member.busy-weeks:skip", "member.done:enter", "member.done:complete"]) expect(steps).toContain(expected)
  expect(steps.some(x => /founder\.(reminders|constitution|goals|first-event|confirm)|member\.(you|about)/.test(x))).toBe(false)   // ob-6: three founder and four member screens
  expect(JSON.stringify(rec)).not.toContain("Moonlight")                                // behaviour only, never what was typed
  const stored = await page.evaluate(() => localStorage.getItem("platypus.v1.demo") ?? "")
  expect(stored).toContain("Moonlight Typing Society")                                  // …while the club itself was really created
  expect(forbidden).toEqual([])
})

test("Replay walkthrough from the Demo menu starts the same flow and records a second attempt", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.explore }).click()
  await page.goto("/#/welcome/start")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.getByRole("button", { name: c.exit }).click()
  const rec = await onboardingRecord(page)
  expect(rec.attempts.map(a => `${a.entry}:${a.outcome}`)).toEqual(["explore:explored", "start:exited"])
})

test("the old classic link enters the same founder setup", async ({ page }) => {
  await page.goto("/#/welcome/classic")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.founder.name.title)
})

test("the Demo menu has two test buttons that open the onboarding pages without recording anything and without any URL flag", async ({ page }) => {
  await page.goto("/#/")                                    // no ?walkthrough=1, no private window
  await openDemoMenu(page)
  await page.getByTestId("test-onboarding-president").click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("heading", { level: 1, name: c.founder.name.title })).toBeVisible()
  await page.getByRole("button", { name: c.exit }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await openDemoMenu(page)
  await page.getByTestId("test-onboarding-invite").click()
  await expect(page).toHaveURL(/#\/welcome\/member\/invitation$/)
  await expect(page.getByRole("note")).toContainText("Previewing as")
  expect(await onboardingRecord(page)).toEqual({ attempts: [] })    // testing leaves the research record empty
})
test("a test button does not write into an attempt that is still open", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.start }).click()          // a real, recorded attempt is now open
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  const before = (await onboardingRecord(page)).attempts[0].steps.length
  await page.goto("/#/welcome/test/president")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.getByRole("button", { name: c.exit }).click()
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0].steps.length).toBe(before)                  // no new steps, and the exit was not recorded
})
test("the setup doors that are not the study link (/setup, Settings → Replay setup) do not write into an attempt that is still open", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  const before = (await onboardingRecord(page)).attempts[0].steps.length
  for (const door of ["/#/setup", "/#/welcome/setup"]) {
    await page.goto(door)
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  }
  await page.getByLabel(c.founder.name.field).fill("Door Club")
  await page.getByRole("button", { name: c.skip }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0].steps.length).toBe(before)
})
// Invitation links are not the study link either: like the classic Join page they record nothing, so the member screens neither add steps to nor
// complete a founder attempt that never finished setup. (The member preview from Invite still records: see the first test and ob-09.)
for (const door of ["Settings → Try officer setup", "/join", "/welcome/classic-join"] as const) {
  test(`an invitation link (${door}) neither writes into nor completes an attempt that is still open`, async ({ page }) => {
    await page.goto(WELCOME_ON)
    await page.getByRole("button", { name: c.start }).click()        // a real founder attempt is open and has not finished setup
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
    const before = (await onboardingRecord(page)).attempts[0].steps
    await page.goto("/#/settings")
    await page.getByRole("button", { name: "Roles & teams", exact: true }).click()
    await page.getByTestId("club-settings").getByText("Invite officers", { exact: true }).click()
    const tryLink = page.getByRole("link", { name: "Try officer setup" })
    const query = new globalThis.URL((await tryLink.getAttribute("href"))!).hash.replace(/^#\/join/, "")
    if (door === "Settings → Try officer setup") await tryLink.click()
    else await page.goto(`/#${door}${query}`)
    await expect(page).toHaveURL(/#\/welcome\/member\/invitation\?invite=/)
    await next(page).click(); await next(page).click()                            // invitation, reminders
    await page.getByRole("button", { name: c.member.busyWeeks.skip }).click()
    await expect(page).toHaveURL(/#\/welcome\/member\/done$/)
    await page.getByRole("button", { name: c.member.done.cta }).click()
    await expect(page).toHaveURL(/#\/tasks/)
    const rec = await onboardingRecord(page)
    expect(rec.attempts).toHaveLength(1)
    expect(rec.attempts[0].outcome, "the founder attempt is not completed by the member screens").toBeUndefined()
    expect(rec.attempts[0].steps).toEqual(before)
  })
}
