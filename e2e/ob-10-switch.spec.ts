import { expect, test } from "@playwright/test"
import { WELCOME_ON, fillMission, onboardingRecord, passReminders } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { openDemoMenu } from "./helpers"

// OB-10: Start walkthrough runs the founder flow end to end in ONE recorded attempt. FB-3 (ob-5): the attempt ends at Invite with Open my workspace;
// the officer preview is no longer part of it (the Demo menu's Test Onboarding Page Invite still opens it, below, recording nothing).
const next = (page: import("@playwright/test").Page) => page.getByRole("button", { name: c.next, exact: true })

test("a first visit runs welcome → founder flow → invite → workspace as one recorded attempt, with no officer preview", async ({ page }) => {
  const forbidden: string[] = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) forbidden.push(r.url()) })
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.getByLabel(c.founder.name.field).fill("Moonlight Typing Society")
  await fillMission(page)                                    // FB-2 (ob-5): the mission is on Name
  await next(page).click()
  await page.getByRole("button", { name: c.skip }).click()           // team
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await next(page).click()
  await passReminders(page, "review_then_self")
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await expect(page.getByRole("heading", { level: 1, name: c.founder.invite.title })).toBeVisible()
  await expect(page.getByRole("button", { name: "See what your officers will see" })).toHaveCount(0)
  await page.getByRole("button", { name: c.founder.invite.workspace }).click()
  await expect(page).toHaveURL(/#\/$/)

  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0]).toMatchObject({ entry: "start", outcome: "completed", flowVersion: "ob-5" })
  const steps = rec.attempts[0].steps.map(s => `${s.step}:${s.event}`)
  // ob-5 (FB-2): no Constitution or Goals step any more, so neither id is recorded; FB-3: no member step either.
  expect(steps.filter(x => /founder\.(constitution|goals)|^member\./.test(x))).toEqual([])
  for (const expected of ["founder.name:enter", "founder.team:skip", "founder.first-event:enter", "founder.reminders:enter", "founder.reminders:leave", "founder.confirm:enter", "founder.invite:complete"]) expect(steps).toContain(expected)
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

test("the classic setup stays reachable as a fallback", async ({ page }) => {
  await page.goto("/#/welcome/classic")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Set up your fictional club")
})

test("the Demo menu has two test buttons that open the onboarding pages without recording anything and without any URL flag", async ({ page }) => {
  await page.goto("/#/")                                    // no ?walkthrough=1, no private window
  await openDemoMenu(page)
  await page.getByTestId("test-onboarding-president").click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("heading", { level: 1, name: c.founder.name.title })).toBeVisible()
  await page.getByRole("button", { name: c.exit }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
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
