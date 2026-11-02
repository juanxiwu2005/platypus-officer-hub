import { expect, test } from "@playwright/test"
import { WELCOME_ON, onboardingRecord } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// OB-10: Start walkthrough now runs the new founder flow end to end, then the officer preview, in ONE recorded attempt.
const next = (page: import("@playwright/test").Page) => page.getByRole("button", { name: c.next, exact: true })

test("a first visit runs welcome → founder flow → invite → officer preview → tasks as one recorded attempt", async ({ page }) => {
  const forbidden: string[] = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) forbidden.push(r.url()) })
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: c.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await page.getByLabel(c.founder.name.field).fill("Moonlight Typing Society")
  await next(page).click()
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await page.getByRole("button", { name: c.skip }).click()           // goals
  await page.getByRole("button", { name: c.skip }).click()           // team
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await next(page).click()
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await expect(page.getByRole("heading", { level: 1, name: c.founder.invite.title })).toBeVisible()
  await page.getByRole("button", { name: c.founder.invite.preview }).click()
  await expect(page).toHaveURL(/#\/welcome\/member\/invitation$/)
  await next(page).click(); await next(page).click(); await next(page).click()   // invitation, you, reminders
  await page.getByRole("button", { name: c.member.busyWeeks.skip }).click()
  await page.getByRole("button", { name: c.skip }).click()           // about you
  await expect(page).toHaveURL(/#\/welcome\/member\/done$/)
  await page.getByRole("button", { name: c.member.done.cta }).click()
  await expect(page).toHaveURL(/#\/tasks/)

  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0]).toMatchObject({ entry: "start", outcome: "completed", flowVersion: "ob-2" })
  const steps = rec.attempts[0].steps.map(s => `${s.step}:${s.event}`)
  for (const expected of ["founder.name:enter", "founder.constitution:skip", "founder.goals:skip", "founder.team:skip", "founder.first-event:enter", "founder.confirm:enter", "member.invitation:enter", "member.done:enter"]) expect(steps).toContain(expected)
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
