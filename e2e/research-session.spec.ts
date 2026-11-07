import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { fillMission } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { closeRail } from "./helpers"
import { toRows } from "../scripts/export-to-csv.mjs"

// Phase 3 study sessions (docs/PHASE3_DATA_DICTIONARY.md): the study link begins a session; the export holds only that session,
// says how much older data there was (counts only), and records the end of setup apart from how the attempt ended.
// Fictional data only; the AI server is absent (404) so the local answers run.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
})

const next = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
const h1 = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name })).toBeVisible()

test("study link → Start workspace → Exit in the officer preview → export: only the new session, setup completed, outcome exited", async ({ page }) => {
  // An earlier visit in the same browser: a walkthrough left at once, then some browsing.
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByRole("button", { name: c.exit, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /^Tasks/ }).click()
  await expect(page.locator("main h1")).toHaveText("Tasks")
  await page.getByRole("combobox", { name: "Task scope" }).selectOption({ label: "Team tasks" })
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]").length as number)
  expect(before).toBeGreaterThan(0)

  // The study session: the link again, setup with First event skipped, Start workspace, then the officer preview and Exit.
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByLabel(c.founder.name.field).fill("Fictional Heron Club")
  await next(page)
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await fillMission(page)
  await page.getByRole("button", { name: c.skip }).click()            // goals
  await page.getByRole("button", { name: c.skip }).click()            // team
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await h1(page, c.founder.confirm.title)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await h1(page, c.founder.invite.title)
  await page.getByRole("button", { name: c.founder.invite.preview }).click()
  await expect(page).toHaveURL(/#\/welcome\/member\/invitation$/)
  await page.getByRole("button", { name: c.exit, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText("Today")

  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))

  expect(file.formatVersion).toBe(3)
  const s = file.session
  expect(s.id).toMatch(/^s-[0-9a-f]{16}$/)
  expect(s).toMatchObject({ outcome: "exited", setupChoice: "start-workspace", firstEventChoice: "skipped", olderAttemptsLeftOut: 1 })
  expect(s.previousEntriesCleared).toBeGreaterThanOrEqual(before)
  expect(s.olderEntriesLeftOut).toBe(s.previousEntriesCleared)
  expect(Date.parse(s.setupCompletedAt)).toBeGreaterThan(Date.parse(s.startedAt))
  expect(s.startedAtAz).toBe(new Date(s.startedAtMs - 7 * 3600_000).toISOString().replace("T", " ").replace("Z", ""))
  // only the new session: one attempt, entries numbered from 1, all tagged, nothing from the earlier browsing
  expect(file.onboarding.attempts).toHaveLength(1)
  expect(file.onboarding.attempts[0]).toMatchObject({ id: s.attempt, outcome: "exited", sessionId: s.id, setupChoice: "start-workspace" })
  const log = file.interactionLog.entries as { seq: number; session?: string; type: string; payload: Record<string, unknown> }[]
  expect(log[0].seq).toBe(1)
  expect(log.every(e => e.session === s.id)).toBe(true)
  expect(log.some(e => e.type === "ui.change" && e.payload.name === "Task scope")).toBe(false)
  expect(log.some(e => e.type === "completeSetup")).toBe(true)
  expect(file.timeline.filter((r: { type: string }) => r.type === "onboarding.start")).toHaveLength(1)
  // the CSV: Arizona time next to UTC, seconds since the session began
  const rows = toRows(file)
  expect(rows[0]).toMatchObject({ type: "session.start", elapsed_s: 0, time_az: s.startedAtAz })
  expect(rows.find(r => r.type === "onboarding.setup")).toMatchObject({ description: "Setup finished: Start workspace" })
  expect(rows.every(r => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/.test(String(r.time_az)))).toBe(true)
})
