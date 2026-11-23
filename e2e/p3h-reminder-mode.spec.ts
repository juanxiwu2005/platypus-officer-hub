import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { toRows } from "../scripts/export-to-csv.mjs"
import { fillMission, onboardingRecord } from "./ob-helpers"
import { closeRail } from "./helpers"

// S2 (Juanxi 2026-11-22), flow version ob-5: the founder walkthrough's Reminders screen (P3-H, ob-4) is removed. First event goes straight to
// Confirm, Confirm names no reminder choice, and the export has no answer for the attempt (reminderModeChoice null). An old link to the
// screen lands on Confirm, the screen that followed it. New clubs get the default choice from completeSetup; nothing is ever sent.
// Runs on desktop and Pixel 7.
type Saved = { org: { name: string; settings: { reminderMode?: string; sendMode: string } } }
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

/** The study link, then Name → Constitution (skip) → Goals (skip) → Team (skip) → First event (skip) → Confirm. */
async function toConfirm(page: Page, club = "Fictional Heron Club") {
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByLabel(c.founder.name.field).fill(club)
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await fillMission(page)
  await page.getByRole("button", { name: c.skip }).click()            // goals
  await page.getByRole("button", { name: c.skip }).click()            // team
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await h1(page, c.founder.confirm.title)
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
}

test("First event goes straight to Confirm: seven dots, none for Reminders, no reminder line, and Back returns to First event", async ({ page }) => {
  await toConfirm(page)
  await expect(chain(page).getByRole("listitem")).toHaveCount(7)
  await expect(chain(page).getByRole("listitem").filter({ hasText: "Reminders" })).toHaveCount(0)
  await expect(chain(page).locator("[aria-current=step]")).toHaveText(/Confirm/)
  await expect(page.getByTestId("confirm-reminders")).toHaveCount(0)
  await expect(page.getByRole("radio")).toHaveCount(0)
  await page.getByRole("button", { name: c.back, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await h1(page, c.founder.confirm.title)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await h1(page, c.founder.invite.title)
  await expect.poll(async () => (await demo(page))?.org.name).toBe("Fictional Heron Club")
  expect((await demo(page)).org.settings.sendMode).toBe("review")                  // sending is unchanged: a person reviews and sends
  const steps = (await onboardingRecord(page)).attempts.at(-1)!.steps.map(s => s.step)
  expect(steps.some(s => s.startsWith("founder.reminders"))).toBe(false)
})

test("an old link to the Reminders screen lands on Confirm with the draft kept, after a reload too, and records no Reminders step", async ({ page }) => {
  await toConfirm(page)
  // Within the open walkthrough.
  await page.evaluate(() => { location.hash = "#/welcome/founder/reminders" })
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
  await h1(page, c.founder.confirm.title)
  await expect(page.getByTestId("confirm-summary")).toContainText("Fictional Heron Club")
  // Opened afresh in the same tab, once the draft is saved (the save waits a quarter second): the saved draft comes back first, then Confirm shows it.
  await expect.poll(async () => (await savedSkips(page))?.includes("founder.first-event") ?? false).toBe(true)
  await page.goto("about:blank")
  await page.goto("/#/welcome/founder/reminders")
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
  await expect(page.getByTestId("confirm-summary")).toContainText("Fictional Heron Club")
  await expect(page.getByTestId("confirm-no-event")).toBeVisible()
  // Back from Confirm still goes to First event, not to the old address.
  await page.getByRole("button", { name: c.back, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  const steps = (await onboardingRecord(page)).attempts.at(-1)!.steps.map(s => s.step)
  expect(steps.some(s => s.startsWith("founder.reminders"))).toBe(false)
})

test("an old link with no walkthrough open lands on Confirm, which asks for the first event and creates nothing", async ({ page }) => {
  await page.goto("/#/welcome/founder/reminders")
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
  await expect(page.getByText(c.founder.confirm.missing)).toBeVisible()
  await expect(page.getByRole("button", { name: c.founder.confirm.start })).toHaveCount(0)
  await expect(page.getByText("Coming soon")).toHaveCount(0)
  expect((await demo(page))?.org.setupCompletedOn ?? null, "nothing was created").toBeNull()
})

test("the export says ob-5, has no Reminders answer, ticks or steps, and the setup row names none", async ({ page }) => {
  await toConfirm(page)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await h1(page, c.founder.invite.title)
  await page.getByRole("button", { name: c.founder.invite.today }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))

  expect(file.onboardingFlowVersion).toBe("ob-5")
  expect(file.onboarding.attempts.at(-1).flowVersion).toBe("ob-5")
  // The club's stored choice (absent, or the default once completeSetup sets one) was never the president's answer.
  expect(file.session).toMatchObject({ setupChoice: "start-workspace", firstEventChoice: "skipped", reminderModeChoice: null })
  type Entry = { type: string; payload: Record<string, unknown> }
  expect((file.interactionLog.entries as Entry[]).filter(e => e.payload?.route === "/welcome/founder/reminders")).toEqual([])
  expect((file.onboarding.attempts.at(-1).steps as { step: string }[]).filter(s => s.step === "founder.reminders")).toEqual([])
  const rows = toRows(file) as { type: string; description: string }[]
  expect(rows.find(x => x.type === "onboarding.setup")?.description).toBe("Setup finished: Start workspace")
  expect(rows.filter(x => /founder\.reminders/.test(x.description))).toEqual([])
})
