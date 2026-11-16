import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { fillMission, passReminders } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { closeRail } from "./helpers"
import { toRows } from "../scripts/export-to-csv.mjs"

// Phase 3 study sessions (docs/PHASE3_DATA_DICTIONARY.md §1.1): the study link begins a session. Its start removes only data from an earlier
// sitting (older than 6 hours), counted; opening the link again mid-sitting loses nothing, and the export then holds two sessions.
// Setup's end is recorded apart from how the attempt ended. Fictional data only; the AI server is absent (404) so the local answers run.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
})

const next = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
const h1 = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
const OLD = 49

test("an earlier day is cleared, the link opened twice keeps both sessions; Create my club then Exit on Invite: setup completed, outcome exited", async ({ page }) => {
  // This browser was used the day before: 49 log entries from then.
  // Seeded before the app loads: the app saves its own log when a page is left (P3-G), so writing storage under a running page and
  // reloading would be overwritten by that save — which is right for real use, and why the seed goes in first.
  await page.addInitScript(n => {
    if (sessionStorage.getItem("seeded-yesterday")) return
    sessionStorage.setItem("seeded-yesterday", "1")
    const day = Date.now() - 24 * 3600_000
    localStorage.setItem("platypus.v1.log", JSON.stringify(Array.from({ length: n }, (_, i) => ({ seq: i + 1, at: day + i, actor: "alex", type: "ui.click", payload: { route: "/", role: "button", name: `Yesterday ${i}` }, applied: true }))))
  }, OLD)
  await page.goto("/#/")
  await expect(page.locator("main h1")).toHaveText("Today")

  // Today, session 1: the study link, left at once; some browsing.
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByRole("button", { name: c.exit, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /^Tasks/ }).click()
  await expect(page.locator("main h1")).toHaveText("Tasks")
  await page.getByRole("combobox", { name: "Task scope" }).selectOption({ label: "Team tasks" })

  // Session 2: the link opened again; setup with First event skipped, Create my club, then Exit on Invite.
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByLabel(c.founder.name.field).fill("Fictional Heron Club")
  await fillMission(page)                                    // FB-2 (ob-5): the mission is on Name
  await next(page)
  await page.getByRole("button", { name: c.skip }).click()            // team
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await passReminders(page)                                            // Reminders (P3-H): skipped too
  await h1(page, c.founder.confirm.title)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await h1(page, c.founder.invite.title)
  // FB-3 (ob-5): Invite no longer leads into the officer preview, so the attempt is left with Exit on Invite itself (setup done, outcome exited).
  await page.getByRole("button", { name: c.exit, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText("Today")

  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))

  expect(file.formatVersion).toBe(3)
  const [first, second] = file.sessions
  expect(file.sessions).toHaveLength(2)
  for (const s of file.sessions) expect(s.id).toMatch(/^s-[0-9a-f]{16}$/)
  // session 1 (left at once): no setup, cleared the day before
  expect(first).toMatchObject({ outcome: "exited", setupCompletedAt: null, setupChoice: null, previousEntriesCleared: OLD })
  // session 2 (the latest, also as `session`): setup completed with Create my club (recorded as start-workspace), the attempt still ended "exited"; nothing more cleared
  expect(second).toMatchObject({ outcome: "exited", setupChoice: "start-workspace", firstEventChoice: "skipped", reminderModeChoice: "skipped", previousEntriesCleared: 0 })
  expect(file.session).toMatchObject({ ...second, olderEntriesLeftOut: OLD, olderAttemptsLeftOut: 0 })
  expect(Date.parse(second.setupCompletedAt)).toBeGreaterThan(Date.parse(second.startedAt))
  expect(second.startedAtAz).toBe(new Date(second.startedAtMs - 7 * 3600_000).toISOString().replace("T", " ").replace("Z", ""))
  // both sessions are in the file, each entry tagged; yesterday's entries are not (only counted)
  expect(file.onboarding.attempts.map((a: { sessionId: string }) => a.sessionId)).toEqual([first.id, second.id])
  const log = file.interactionLog.entries as { seq: number; session?: string; type: string; payload: Record<string, unknown> }[]
  const scope = log.find(e => e.type === "ui.change" && e.payload.name === "Task scope")
  expect(scope?.session).toBe(first.id)
  expect(log.find(e => e.type === "completeSetup")?.session).toBe(second.id)
  expect(log.filter(e => e.session === first.id)).toHaveLength(first.entries)
  expect(log.filter(e => e.session === second.id)).toHaveLength(second.entries)
  expect(JSON.stringify(file)).not.toContain("Yesterday ")
  expect(log[0].seq).toBe(OLD + 1)                     // numbering goes on; the 49 missing numbers were the 6-hour clean-up, not the cap
  expect(file.interactionLog.droppedEarlier).toBe(0)
  // the CSV: Arizona time next to UTC, the session column, seconds since each session began
  const rows = toRows(file)
  expect(rows.filter(r => r.type === "session.start").map(r => [r.session, r.elapsed_s, r.time_az])).toEqual([[first.id, 0, first.startedAtAz], [second.id, 0, second.startedAtAz]])
  expect(rows.find(r => r.type === "onboarding.setup")).toMatchObject({ session: second.id, description: "Setup finished: Start workspace; reminders: skipped" })
  expect(rows.every(r => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/.test(String(r.time_az)))).toBe(true)
})
