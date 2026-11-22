import { FLOW_VERSION } from "../src/onboarding/record"
import { fillMission, passReminders } from "./ob-helpers"
import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { ask, closeRail } from "./helpers"

// Phase 3 research log (docs/PHASE3_DATA_DICTIONARY.md): a short participant session, then Export my data.
// The exported file must hold every step below, in order, with real and increasing times. Nothing leaves the browser:
// the AI server is absent (404, so the app's local answers run), and outside links are stopped before they load.
type Entry = { seq: number; at: number; type: string; actor: string; applied: boolean; payload: Record<string, unknown>; before?: unknown }
type Row = { time: string; at: number; source: string; seq: number | null; type: string; route: string | null; desc: string }

const outside: string[] = []
test.beforeEach(async ({ page, context }) => {
  outside.length = 0
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
  await context.route(url => url.hostname !== "localhost" && url.hostname !== "127.0.0.1", r => { outside.push(r.request().url()); return r.abort() })
})

const next = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()

async function session(page: Page) {
  // 0. Before the study link: a look around the sample club in this browser, minutes before. It is the same sitting, so it stays (outside any session).
  await page.goto("/#/")
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /^Rules/ }).click()
  await expect(page.locator("main h1")).toHaveText("Rules")
  // 1. Setup through the walkthrough: the study link begins the session
  await page.goto("/#/start")
  await expect(page.getByRole("heading", { level: 1, name: "Name your club" })).toBeVisible()
  await page.getByLabel(c.founder.name.field).fill("Fictional Lantern Society")
  await next(page)
  // The shared eight-step founder flow (docs/feedback-fix/SETUP_ENTRY_UNIFICATION_HANDOFF.md): Constitution, then Goals with its mission.
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await fillMission(page)
  await page.getByRole("button", { name: c.skip }).click()            // goals
  await page.getByRole("button", { name: c.skip }).click()            // team
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta }).click()
  await next(page)
  // P3-H: the Reminders question. FB-8: "I review, then I send", the mode where a person opens the draft, so the draft link is still logged
  // below ("I review, Platypus sends" now approves in one click with no draft link: e2e/fb-08-reminder-centre.spec.ts).
  await passReminders(page, "review_then_self")
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await expect(page.getByRole("heading", { level: 1, name: c.founder.invite.title })).toBeVisible()
  await page.getByRole("button", { name: c.founder.invite.today }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")      // FB-8: the home page is the reminder centre
  // 2. Prepare one reminder in the reminder composer (choose a channel, open the draft: the outside page is stopped). The home page now
  // combines each person's tasks into one email in its own panel; a single-task reminder (ui.reminder, data dictionary §5.1) opens from Ask.
  await ask(page, "Remind Jordan about the workshop checklist")
  await page.getByRole("button", { name: "Open the draft" }).last().click()
  const panel = page.getByTestId("nudge-panel")
  await expect(panel).toBeVisible()
  await expect(panel.getByTestId("reminder-mode-note")).toHaveText("Your club chose: I review, then I send (demo: nothing is sent).")
  await panel.getByLabel("Preferred channel").selectOption("email")
  const draft = panel.getByRole("link", { name: "Open Gmail draft" })
  await expect(draft).toBeVisible()
  const [mail] = await Promise.all([page.waitForEvent("popup"), draft.click()])
  await mail.close()
  await panel.getByRole("button", { name: "Close reminder" }).click()
  // 3. Click a few things: a page link, a drop-down, the demo clock (a data change with its earlier value)
  await closeRail(page)
  // FB-8: Tasks is under Plan: the Plan link opens Events, the "Events | Tasks" switch opens Tasks.
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /^Plan/ }).click()
  await page.getByRole("navigation", { name: "Plan" }).getByRole("link", { name: "Tasks" }).click()
  await expect(page.locator("main h1")).toHaveText("Tasks")
  await page.getByRole("combobox", { name: "Task scope" }).selectOption({ label: "Team tasks" })
  await page.getByTestId("demo-menu").click()
  await page.getByTestId("clock-1").click()
  await page.keyboard.press("Escape")
  // 4. A rule question, then its cited source (stopped too)
  await ask(page, "What do outside caterers need?")
  const answer = page.getByTestId("rule-answer").last()
  await expect(answer).toContainText("R06")
  const [popup] = await Promise.all([page.waitForEvent("popup"), answer.getByRole("link", { name: /R06 source/ }).click()])
  await popup.close()
  // 5. Export
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  expect(download.suggestedFilename()).toMatch(/^platypus-export-.*\.json$/)
  return JSON.parse(readFileSync((await download.path())!, "utf8"))
}

test("a short session is exported whole: walkthrough, a reminder, clicks, a rule question, its source, the export — in order; browsing just before it stays", async ({ page }) => {
  const started = Date.now()
  const file = await session(page)
  const log = file.interactionLog.entries as Entry[]
  const timeline = file.timeline as Row[]
  if (process.env.SHOW_TIMELINE) console.info(timeline.map(r => `${r.time}  ${r.source.padEnd(10)} ${String(r.seq ?? "").padStart(3)}  ${r.type.padEnd(22)} ${r.desc}`).join("\n"))

  // shape, numbering and time
  expect(file).toMatchObject({ format: "platypus-export", formatVersion: 3, onboardingFlowVersion: FLOW_VERSION, demoToday: file.state.today })
  // the study session: begun by the study link. The browsing minutes before it is the same sitting: kept, with no session; nothing was cleared.
  expect(file.session).toMatchObject({ setupChoice: "start-workspace", firstEventChoice: "planned", reminderModeChoice: "review_then_self", outcome: "completed", previousEntriesCleared: 0, olderEntriesLeftOut: 0 })
  expect(file.sessions).toHaveLength(1)
  const start = log.findIndex(e => e.type === "ui.navigate" && e.payload.to === "/welcome/founder/name")
  expect(start).toBeGreaterThan(0)
  expect(log.slice(0, start).some(e => e.type === "ui.click" && /^Rules/.test(String(e.payload.name)))).toBe(true)
  const tagged = (e: Entry) => (e as Entry & { session?: string }).session
  expect(log.slice(0, start).every(e => tagged(e) === undefined)).toBe(true)
  expect(log.slice(start).every(e => tagged(e) === file.session.id)).toBe(true)
  expect(file.session.entries).toBe(log.length - start)
  expect(file.onboarding.attempts).toHaveLength(1)
  expect(timeline.filter(r => r.source === "session")).toHaveLength(1)
  expect(typeof file.build.commit).toBe("string")
  expect(log.map(e => e.seq)).toEqual(log.map((_, i) => log[0].seq + i))
  for (let i = 1; i < log.length; i++) expect(log[i].at).toBeGreaterThanOrEqual(log[i - 1].at)
  expect(log[0].at).toBeGreaterThanOrEqual(started - 1000)
  for (let i = 1; i < timeline.length; i++) expect(timeline[i].at).toBeGreaterThanOrEqual(timeline[i - 1].at)
  expect(timeline.filter(r => r.source === "log")).toHaveLength(log.length)
  expect(timeline.every(r => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}$/.test((r as Row & { timeAz: string }).timeAz))).toBe(true)
  expect(timeline.some(r => r.source === "onboarding")).toBe(true)

  // the session's steps, in order
  const find = (from: number, test: (e: Entry) => boolean, what: string) => {
    const i = log.findIndex((e, k) => k >= from && test(e))
    expect(i, what).toBeGreaterThanOrEqual(0)
    return i
  }
  const p = (e: Entry) => e.payload
  let i = find(0, e => e.type === "ui.navigate" && p(e).to === "/welcome/founder/name", "the walkthrough opened")
  // 2026-11-07: typing in a field is recorded as "started / stopped typing", with the field's label and never its text
  i = find(i, e => e.type === "ui.edit" && p(e).event === "start" && String(p(e).field).includes(c.founder.name.field) && p(e).kind === "text", "typing began in the club name")
  i = find(i, e => e.type === "ui.click" && p(e).name === c.next && p(e).route === "/welcome/founder/name" && p(e).to === "/welcome/founder/constitution", "Continue on the Name screen")
  i = find(i, e => e.type === "ui.change" && p(e).route === "/welcome/founder/reminders" && p(e).role === "radio" && p(e).name === "I review, then I send" && p(e).checked === true && p(e).testid === "reminder-mode-review_then_self", "the Reminders answer")
  i = find(i, e => e.type === "ui.click" && p(e).name === c.founder.confirm.start, "Start workspace")
  i = find(i, e => e.type === "completeSetup" && e.applied, "the club was created")
  i = find(i, e => e.type === "ui.click" && p(e).name === c.founder.invite.today && p(e).to === "/", "Go to Today")
  i = find(i, e => e.type === "ui.ask" && p(e).question === "Remind Jordan about the workshop checklist", "the reminder request")
  i = find(i, e => e.type === "ui.click" && p(e).name === "Open the draft" && p(e).area === "answer", "Open the draft")
  i = find(i, e => e.type === "ui.details" && p(e).action === "open" && p(e).kind === "nudge", "the reminder opened in Details")
  i = find(i, e => e.type === "ui.reminder" && p(e).action === "open", "the reminder composer opened")
  i = find(i, e => e.type === "ui.change" && p(e).name === "Preferred channel" && p(e).value === "Gmail" && p(e).area === "reminder", "the channel chosen")
  i = find(i, e => e.type === "ui.click" && p(e).name === "Open Gmail draft" && p(e).external === true && p(e).href === "mail.google.com/mail/", "the draft link")
  i = find(i, e => e.type === "ui.click" && p(e).name === "Close reminder", "the composer closed")
  i = find(i, e => e.type === "ui.click" && p(e).role === "link" && /^Plan/.test(String(p(e).name)) && p(e).to === "/events" && p(e).area === "nav", "the Plan link")
  i = find(i, e => e.type === "ui.click" && p(e).role === "link" && p(e).name === "Tasks" && p(e).to === "/tasks", "the Tasks switch")
  i = find(i, e => e.type === "ui.change" && p(e).name === "Task scope" && p(e).value === "Team tasks", "the task scope chosen")
  i = find(i, e => e.type === "advanceClock" && e.applied && (e.before as { today?: string })?.today !== undefined, "the demo clock, with its earlier value")
  i = find(i, e => e.type === "ui.ask" && p(e).question === "What do outside caterers need?", "the rule question")
  i = find(i, e => e.type === "ui.answer" && p(e).answer === "rule-answer" && (p(e).citations as string[]).includes("R06"), "the kind of answer and its citation")
  i = find(i, e => e.type === "ui.click" && p(e).external === true && /R06 source/.test(String(p(e).name)) && p(e).area === "answer", "the cited source was opened")
  i = find(i, e => e.type === "ui.click" && p(e).testid === "export-data", "the Export button")
  expect(log[log.length - 1]).toMatchObject({ type: "ui.export" })
  expect(i).toBe(log.length - 2)

  // what screen events never hold: what was typed into a field, the AI's answer, message bodies, query values.
  // (The saved result of a form is a data action, as before: completeSetup's payload has the club name.)
  const logged = JSON.stringify([log, timeline])
  const screen = JSON.stringify(log.filter(e => e.type.startsWith("ui.")))
  expect(screen).not.toContain("Fictional Lantern Society")
  expect(JSON.stringify(log.find(e => e.type === "completeSetup"))).toContain("Fictional Lantern Society")
  expect(logged).not.toContain("body=")
  const answerText = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.chat") ?? "[]").flatMap((m: { cards?: { answer?: string }[] }) => (m.cards ?? []).map(card => card.answer).filter(Boolean)))
  expect(answerText.length).toBeGreaterThan(0)
  for (const text of answerText) expect(logged).not.toContain(String(text).slice(0, 60))
  // the two outside pages were stopped, and nothing else left the browser
  expect(outside.some(u => u.includes("mail.google.com"))).toBe(true)
  expect(outside.length).toBe(2)
  // a sensible size for this session (measured 2026-11-07 with the typing entries: 42 on a computer, 40 on a phone)
  expect(log.length).toBeLessThan(80)
})
