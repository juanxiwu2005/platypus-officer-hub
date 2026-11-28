import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { toRows } from "../scripts/export-to-csv.mjs"
import { onboardingRecord } from "./ob-helpers"
import { closeRail } from "./helpers"

// S2 (Juanxi 2026-11-22), flow version ob-5: the founder walkthrough's Reminders screen (P3-H, ob-4) is removed, and the export has no answer
// for the attempt (reminderModeChoice null). Since ob-6 (S6) Confirm folded into Team, so an old link to the screen lands on Team. New clubs get the default choice from completeSetup; nothing is ever sent.
// Runs on desktop and Pixel 7.
type Saved = { org: { name: string; setupCompletedOn?: string | null; settings: { reminderMode?: string; sendMode: string } } }
const demo = async (page: Page) => JSON.parse((await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))) ?? "null") as Saved
const h1 = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
const chain = (page: Page) => page.getByRole("list", { name: c.progress })
/** The saved walkthrough draft's skipped steps (IndexedDB), or null while nothing is saved. */
const savedSkips = (page: Page) => page.evaluate(() => new Promise<string[] | null>(resolve => {
  const open = indexedDB.open("platypus.docs", 1)
  open.onupgradeneeded = () => { open.result.createObjectStore("docs", { keyPath: "id" }) }
  open.onsuccess = () => { const get = open.result.transaction("docs", "readonly").objectStore("docs").get("onboarding-draft"); get.onsuccess = () => { open.result.close(); resolve(get.result?.value?.skipped ?? null) }; get.onerror = () => resolve(null) }
  open.onerror = () => resolve(null)
}))

const requests = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page, context }) => {
  const seen: string[] = []; requests.set(page, seen)
  page.on("request", q => seen.push(q.url()))
  await page.route("**/api/**", q => q.fulfill({ status: 404, json: { message: "no server in this test" } }))
  await context.route(url => url.hostname !== "localhost" && url.hostname !== "127.0.0.1", q => q.abort())
})
test.afterEach(async ({ page }) => {
  // Nothing is sent: no outside address, and only the existing AI interface (unused here) could be asked.
  const seen = requests.get(page)!.map(u => new URL(u))
  expect(seen.filter(u => u.hostname !== "localhost" && u.hostname !== "127.0.0.1").map(String), "nothing leaves the browser").toEqual([])
  expect(seen.filter(u => u.pathname.startsWith("/api/") && u.pathname !== "/api/command" && u.pathname !== "/api/health").map(u => u.pathname)).toEqual([])
})

/** The study link, then screen 1 (name, Skip for now on the first event) → Team, where Start workspace finishes setup since ob-6. */
async function toTeam(page: Page, club = "Fictional Heron Club") {
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByLabel(c.founder.name.field).fill(club)
  await page.getByRole("button", { name: c.skip, exact: true }).click()
  await h1(page, c.founder.team.title)
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
}

test("the walkthrough asks nothing about reminders: three dots, none for Reminders, no reminder radios, and Start workspace keeps review-before-send", async ({ page }) => {
  await toTeam(page)
  await expect(chain(page).getByRole("listitem")).toHaveCount(3)
  await expect(chain(page).getByRole("listitem").filter({ hasText: "Reminders" })).toHaveCount(0)
  await expect(chain(page).locator("[aria-current=step]")).toHaveText(/Team/)
  await expect(page.getByTestId("confirm-reminders")).toHaveCount(0)
  await expect(page.getByRole("radio")).toHaveCount(0)
  await page.getByRole("button", { name: c.founder.team.start }).click()
  await h1(page, c.founder.invite.title)
  await expect.poll(async () => (await demo(page))?.org.name).toBe("Fictional Heron Club")
  expect((await demo(page)).org.settings.sendMode).toBe("review")                  // sending is unchanged: a person reviews and sends
  const steps = (await onboardingRecord(page)).attempts.at(-1)!.steps.map(s => s.step)
  expect(steps.some(s => s.startsWith("founder.reminders"))).toBe(false)
})

test("an old link to the Reminders screen lands on Team with the draft kept, after a reload too, and records no Reminders step", async ({ page }) => {
  await toTeam(page)
  // Within the open walkthrough.
  await page.evaluate(() => { location.hash = "#/welcome/founder/reminders" })
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await h1(page, c.founder.team.title)
  // Opened afresh in the same tab, once the draft is saved (the save waits a quarter second): the saved draft comes back first, then Team shows it.
  await expect.poll(async () => (await savedSkips(page))?.includes("founder.name") ?? false).toBe(true)
  await page.goto("about:blank")
  await page.goto("/#/welcome/founder/reminders")
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  // Back from Team still goes to screen 1, with the name kept.
  await page.getByRole("button", { name: c.back, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByLabel(c.founder.name.field)).toHaveValue("Fictional Heron Club")
  const steps = (await onboardingRecord(page)).attempts.at(-1)!.steps.map(s => s.step)
  expect(steps.some(s => s.startsWith("founder.reminders"))).toBe(false)
})

test("an old link with no walkthrough open lands on Team, whose Start workspace asks for the first event and creates nothing", async ({ page }) => {
  await page.goto("/#/welcome/founder/reminders")
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.getByRole("button", { name: c.founder.team.start }).click()
  await expect(page.getByRole("alert")).toHaveText(c.founder.team.missing)
  await expect(page.getByText("Coming soon")).toHaveCount(0)
  expect((await demo(page))?.org.setupCompletedOn ?? null, "nothing was created").toBeNull()
})

test("the export says ob-6, has no Reminders answer, ticks or steps, and the setup row names none", async ({ page }) => {
  await toTeam(page)
  await page.getByRole("button", { name: c.founder.team.start }).click()
  await h1(page, c.founder.invite.title)
  await page.getByRole("button", { name: c.founder.invite.today }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))

  expect(file.onboardingFlowVersion).toBe("ob-6")
  expect(file.onboarding.attempts.at(-1).flowVersion).toBe("ob-6")
  // The club's stored choice (absent, or the default once completeSetup sets one) was never the president's answer.
  expect(file.session).toMatchObject({ setupChoice: "start-workspace", firstEventChoice: "skipped", reminderModeChoice: null })
  type Entry = { type: string; payload: Record<string, unknown> }
  expect((file.interactionLog.entries as Entry[]).filter(e => e.payload?.route === "/welcome/founder/reminders")).toEqual([])
  expect((file.onboarding.attempts.at(-1).steps as { step: string }[]).filter(s => s.step === "founder.reminders")).toEqual([])
  const rows = toRows(file) as { type: string; description: string }[]
  expect(rows.find(x => x.type === "onboarding.setup")?.description).toBe("Setup finished: Start workspace")
  expect(rows.filter(x => /founder\.reminders/.test(x.description))).toEqual([])
})
