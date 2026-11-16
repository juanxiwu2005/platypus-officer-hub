import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
import { REMINDER_MODES } from "../src/data/reminderMode"
import type { ReminderMode } from "../src/data/types"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { toRows } from "../scripts/export-to-csv.mjs"
import { fillMission, passReminders } from "./ob-helpers"
import { closeRail } from "./helpers"

// P3-H (Juanxi 2026-11-08): the founder walkthrough's Reminders screen asks how reminders should reach officers. A study question: nothing is
// chosen for the president, Skip for now is the way not to answer, the answer is stored as org.settings.reminderMode, and the export reads it
// back from what is already recorded (step events + the `ui.change` radio entries). Nothing is ever sent. Runs on desktop and Pixel 7.
const r = c.founder.reminders
const TITLES = REMINDER_MODES.map(m => r.options[m].title)
type Saved = { org: { name: string; settings: { reminderMode?: ReminderMode; sendMode: string } } }
const demo = async (page: Page) => JSON.parse((await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))) ?? "null") as Saved
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)
const screen = (page: Page) => page.getByTestId("reminder-mode")
const radios = (page: Page) => screen(page).getByRole("radio")
const cont = (page: Page) => screen(page).getByRole("button", { name: c.next, exact: true })
const h1 = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
const words = (page: Page) => screen(page).evaluate(el => (el as HTMLElement).innerText.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length)
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
/** The saved walkthrough draft's answer (IndexedDB), or undefined while nothing is saved. */
const savedMode = (page: Page) => page.evaluate(() => new Promise<string | null | undefined>(resolve => {
  const open = indexedDB.open("platypus.docs", 1)
  open.onupgradeneeded = () => { open.result.createObjectStore("docs", { keyPath: "id" }) }
  open.onsuccess = () => { const get = open.result.transaction("docs", "readonly").objectStore("docs").get("onboarding-draft"); get.onsuccess = () => { open.result.close(); resolve(get.result?.value?.reminderMode) }; get.onerror = () => resolve(undefined) }
  open.onerror = () => resolve(undefined)
}))

const requests = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page, context }) => {
  const seen: string[] = []; requests.set(page, seen)
  page.on("request", q => seen.push(q.url()))
  await page.route("**/api/**", q => q.fulfill({ status: 404, json: { message: "no server in this test" } }))
  await context.route(url => url.hostname !== "localhost" && url.hostname !== "127.0.0.1", q => q.abort())
})
test.afterEach(async ({ page }) => {
  // Nothing is sent: no outside address, no mail link, and only the existing AI interface (unused here) could be asked.
  const seen = requests.get(page)!.map(u => new URL(u))
  expect(seen.filter(u => u.hostname !== "localhost" && u.hostname !== "127.0.0.1").map(String), "nothing leaves the browser").toEqual([])
  expect(seen.filter(u => u.pathname.startsWith("/api/") && u.pathname !== "/api/command" && u.pathname !== "/api/health").map(u => u.pathname)).toEqual([])
})

/** The study link, then Name (with the mission) → Team (skip) → First event (skip) → Reminders. */
async function toReminders(page: Page, club = "Fictional Heron Club") {
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByLabel(c.founder.name.field).fill(club)
  await fillMission(page)                                    // FB-2 (ob-5): the mission is on Name
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await page.getByRole("button", { name: c.skip }).click()            // team
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await h1(page, r.title)
  await expect(page).toHaveURL(/#\/welcome\/founder\/reminders$/)
}
const startWorkspace = async (page: Page) => {
  await h1(page, c.founder.confirm.title)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await h1(page, c.founder.invite.title)
}

test("nothing is ticked at first and Continue waits; each answer, in the fixed order, goes through Confirm into org.settings.reminderMode", async ({ page }) => {
  for (const mode of REMINDER_MODES) {
    await toReminders(page)
    await expect(screen(page).getByRole("radiogroup", { name: r.title })).toBeVisible()
    await expect(radios(page)).toHaveCount(3)
    expect(await radios(page).evaluateAll(els => els.map(e => (e as HTMLInputElement).getAttribute("aria-labelledby") && document.getElementById((e as HTMLInputElement).getAttribute("aria-labelledby")!)!.textContent))).toEqual(TITLES)
    for (const title of TITLES) await expect(screen(page).getByRole("radio", { name: title })).not.toBeChecked()
    await expect(cont(page)).toBeDisabled()
    await expect(screen(page).getByTestId("reminder-mode-demo")).toHaveText(r.demo)
    // Each option is a title; its old one line is its accessible description (FB-3: no longer shown, the steps, analogy and in-app line are).
    await expect(screen(page).getByRole("radio", { name: r.options[mode].title })).toHaveAccessibleDescription(r.options[mode].body)
    await expect(screen(page).getByText(r.options[mode].body)).toBeHidden()
    await screen(page).getByText(r.options[mode].like).click()                       // the whole option is the target, not just the dot
    await expect(screen(page).getByRole("radio", { name: r.options[mode].title })).toBeChecked()
    await expect(cont(page)).toBeEnabled()
    await cont(page).click()
    await expect(page.getByTestId("confirm-reminders")).toHaveText(`Reminders: ${r.options[mode].title}.`)
    await startWorkspace(page)
    await expect.poll(async () => (await demo(page))?.org.settings.reminderMode).toBe(mode)
    expect((await demo(page)).org.settings.sendMode).toBe("review")                  // sending is unchanged: a person reviews and sends
  }
})

test("Skip for now leaves no answer: Confirm names none, the club has no reminderMode, the dot is hollow, and Back shows nothing ticked", async ({ page }) => {
  await toReminders(page)
  await screen(page).getByRole("radio", { name: TITLES[0] }).check()                // a tick, then Skip after all
  await screen(page).getByRole("button", { name: c.skip }).click()
  await h1(page, c.founder.confirm.title)
  await expect(page.getByTestId("confirm-reminders")).toHaveCount(0)
  await expect(page.getByRole("list", { name: c.progress }).getByRole("listitem").filter({ hasText: "Reminders" })).toContainText("Reminders, skipped")
  await page.getByRole("button", { name: c.back, exact: true }).click()
  await h1(page, r.title)
  for (const title of TITLES) await expect(screen(page).getByRole("radio", { name: title })).not.toBeChecked()
  await expect(cont(page)).toBeDisabled()
  await passReminders(page)
  await startWorkspace(page)
  await expect.poll(async () => (await demo(page))?.org.name).toBe("Fictional Heron Club")
  expect("reminderMode" in (await demo(page)).org.settings).toBe(false)
})

test("a reload on the screen keeps the answer, and the step after it", async ({ page }) => {
  await toReminders(page)
  await screen(page).getByRole("radio", { name: r.options.review_then_self.title }).check()
  await expect.poll(() => savedMode(page)).toBe("review_then_self")
  await page.reload()
  await h1(page, r.title)
  await expect(page).toHaveURL(/#\/welcome\/founder\/reminders$/)
  await expect(screen(page).getByRole("radio", { name: r.options.review_then_self.title })).toBeChecked()
  await expect(cont(page)).toBeEnabled()
  await cont(page).click()
  await page.reload()
  await expect(page.getByTestId("confirm-reminders")).toHaveText(`Reminders: ${r.options.review_then_self.title}.`)
  await startWorkspace(page)
  await expect.poll(async () => (await demo(page))?.org.settings.reminderMode).toBe("review_then_self")
})

// FB-3 (docs/feedback-fix/PLAN.md 5.1): at most 140 words (was 60): the screen now has a Why line, an example reminder, and under each option
// its three steps, an analogy and what happens in Platypus.
test("no accessibility problems in light and dark, at most 140 words, no sideways scroll, and full-size targets on a phone", async ({ page, isMobile }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await toReminders(page)
    await expect(screen(page).locator(".ob-why")).toHaveText(`Why: ${r.why}`)
    expect(await scan(page), `${scheme}, nothing ticked`).toEqual([])
    expect(await words(page)).toBeLessThanOrEqual(140)
    await noSideScroll(page)
    await screen(page).getByRole("radio", { name: TITLES[2] }).check()
    expect(await scan(page), `${scheme}, ticked`).toEqual([])
    await noSideScroll(page)
  }
  // The keyboard reaches the choices and can change them with the arrow keys.
  await screen(page).getByRole("radio", { name: TITLES[2] }).focus()
  await page.keyboard.press("ArrowUp")
  await expect(screen(page).getByRole("radio", { name: TITLES[1] })).toBeChecked()
  if (isMobile) {
    for (const opt of await screen(page).locator(".ob-rm-opt").all()) expect((await opt.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    for (const name of [c.back, c.next, c.skip]) expect((await screen(page).getByRole("button", { name, exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
})

test("the export holds the answer (reminderModeChoice), every tick by its label, the time on the screen, and the setup row says it", async ({ page }) => {
  await toReminders(page)
  await screen(page).getByRole("radio", { name: r.options.auto_email.title }).check()
  await screen(page).getByRole("radio", { name: r.options.review_then_auto.title }).check()     // a change of mind
  await cont(page).click()
  await startWorkspace(page)
  await page.getByRole("button", { name: c.founder.invite.workspace }).click()
  await expect(page.locator("main h1")).toHaveText("Today")
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))

  expect(file.onboardingFlowVersion).toBe("ob-5")
  expect(file.session).toMatchObject({ setupChoice: "start-workspace", firstEventChoice: "skipped", reminderModeChoice: "review_then_auto" })
  expect(file.state.org.settings.reminderMode).toBe("review_then_auto")
  // Every tick, by the option's label, in its group, on this screen.
  type Entry = { at: number; type: string; payload: Record<string, unknown> }
  const ticks = (file.interactionLog.entries as Entry[]).filter(e => e.type === "ui.change" && e.payload.route === "/welcome/founder/reminders")
  expect(ticks.map(e => [e.payload.name, e.payload.role, e.payload.checked, e.payload.group, e.payload.testid])).toEqual([
    [r.options.auto_email.title, "radio", true, r.title, "reminder-mode-auto_email"],
    [r.options.review_then_auto.title, "radio", true, r.title, "reminder-mode-review_then_auto"],
  ])
  // Time on the screen: its enter and leave step events.
  const steps = (file.onboarding.attempts.at(-1).steps as { step: string; event: string; at: number }[]).filter(s => s.step === "founder.reminders")
  expect(steps.map(s => s.event)).toEqual(["enter", "leave"])
  expect(steps[1].at).toBeGreaterThanOrEqual(steps[0].at)
  expect(ticks.every(t => t.at >= steps[0].at && t.at <= steps[1].at)).toBe(true)
  // The CSV rows read in plain words.
  const rows = toRows(file) as { type: string; description: string; route: string }[]
  expect(rows.filter(x => x.type === "ui.change" && x.route === "/welcome/founder/reminders").map(x => x.description)).toEqual([
    `Ticked radio "${r.options.auto_email.title}" in "${r.title}" on /welcome/founder/reminders`,
    `Ticked radio "${r.options.review_then_auto.title}" in "${r.title}" on /welcome/founder/reminders`,
  ])
  expect(rows.find(x => x.type === "onboarding.setup")?.description).toBe("Setup finished: Start workspace; reminders: review_then_auto")
  expect(rows.filter(x => /founder\.reminders/.test(x.description)).map(x => x.description)).toEqual(["Walkthrough screen founder.reminders: enter", "Walkthrough screen founder.reminders: leave"])
})
