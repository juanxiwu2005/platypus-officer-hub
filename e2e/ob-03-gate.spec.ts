import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { WELCOME_ON, onboardingRecord, seenWelcome } from "./ob-helpers"
import { openDemoMenu } from "./helpers"

// OB-03: the first-visit welcome page. Off by default; on with ?walkthrough=1 (before or after the #).
test("the switch is off by default: the first visit goes straight to Today", async ({ page }) => {
  await page.goto("/#/")
  await expect(page.locator("main h1")).toHaveText("Today")
  expect(await onboardingRecord(page)).toEqual({ attempts: [] })
})
for (const url of ["/?walkthrough=1#/", "/#/?walkthrough=1"]) test(`a first visit opens the welcome page (${url})`, async ({ page }) => {
  await page.goto(url)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to Platypus")
  await expect(page.getByText("Everything here is fictional and stays in this browser.")).toBeVisible()
  await expect(page.getByRole("navigation", { name: /main|primary/i })).toHaveCount(0)   // the focus shell has no navigation
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
  expect(scan.violations.map(v => v.id)).toEqual([])
})
test("Explore the sample club: Today opens, it is remembered, and it is recorded without any typed text", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: "Explore the sample club" }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
  expect(await seenWelcome(page)).toBe(true)
  await page.goto(WELCOME_ON); await page.reload()
  await expect(page.locator("main h1")).toHaveText("Today")   // not asked again
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1)
  expect(rec.attempts[0]).toMatchObject({ entry: "explore", outcome: "explored", flowVersion: "ob-5" })
})
test("Start walkthrough opens the new founder flow inside the focus shell and is recorded once", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: "Start walkthrough" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Name your club")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("link", { name: "Tasks" })).toHaveCount(0)    // no sidebar
  await expect(page.getByRole("button", { name: "Ask Platypus" })).toHaveCount(0)
  const rec = await onboardingRecord(page)
  expect(rec.attempts).toHaveLength(1); expect(rec.attempts[0]).toMatchObject({ entry: "start", replay: 0 })
  expect(await seenWelcome(page)).toBe(true)   // leaving halfway does not bring the welcome page back
  await page.goto(WELCOME_ON)
  await expect(page.locator("main h1")).toHaveText("Today")
})
test("Exit records the exit and returns to Today", async ({ page }) => {
  await page.goto("/#/welcome/start")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Name your club")
  await page.getByRole("button", { name: "Exit" }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
  expect((await onboardingRecord(page)).attempts[0].outcome).toBe("exited")
})
test("Reset demo brings the welcome page back and keeps what was recorded; Replay walkthrough records a new attempt", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: "Explore the sample club" }).click()
  await openDemoMenu(page)
  await page.getByTestId("reset-demo").click(); await page.getByTestId("reset-demo").click()
  await page.goto(WELCOME_ON); await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to Platypus")
  expect((await onboardingRecord(page)).attempts).toHaveLength(1)
  await page.getByRole("button", { name: "Explore the sample club" }).click()
  await openDemoMenu(page)
  await page.getByRole("link", { name: "Replay walkthrough" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Name your club")
  const attempts = (await onboardingRecord(page)).attempts
  expect(attempts.map(a => a.entry)).toEqual(["explore", "explore", "start"])
})
test("Export my data carries the onboarding record, with no typed text in it", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await page.getByRole("button", { name: "Start walkthrough" }).click()
  await page.getByLabel("Club name").fill("Moonlight Typing Society")
  await page.getByRole("button", { name: "Exit" }).click()
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "My preferences" }).click().catch(() => undefined)
  const download = page.waitForEvent("download")
  await page.getByTestId("export-data").click()
  const text = await (await (await download).createReadStream()).toArray().then(c => Buffer.concat(c as Buffer[]).toString("utf8"))
  const exported = JSON.parse(text)
  expect(exported.onboarding.attempts).toHaveLength(1)
  expect(JSON.stringify(exported.onboarding)).not.toContain("Moonlight")
})
