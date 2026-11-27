import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, demoClock, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import type { DemoState, ReminderMode } from "../src/data/types"
import { applySchedule } from "../src/engine/schedule"
import { addDays } from "../src/lib/dates"

// FB-8 (docs/feedback-fix/PLAN.md §12.2), redrawn as concept F (2026-11-19): the home page is the reminder centre; one email per person;
// the three reminder modes really behave differently; the navigation is Reminders, Plan, Team, Handoff, Rules; Partners is temporarily archived.
// Nothing is ever sent: no request leaves the browser. Set FB8_SHOTS=<folder> to also save screenshots of each state for a visual check.
const SHOTS = process.env.FB8_SHOTS
const shot = async (page: Page, name: string, isMobile: boolean) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${isMobile ? "phone" : "desktop"}.png`, fullPage: true }) }
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

const requests = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page, context }) => {
  const seen: string[] = []; requests.set(page, seen)
  page.on("request", q => seen.push(q.url()))
  await page.route("**/api/**", q => q.fulfill({ status: 503, json: { message: "no server in this test" } }))
  await context.route(url => url.hostname !== "localhost" && url.hostname !== "127.0.0.1", q => q.abort())
})
test.afterEach(async ({ page }) => {
  // Nothing is sent. Opening a Gmail draft is the only outside address a person can open, and only in "I review, then I send".
  const outside = requests.get(page)!.map(u => new URL(u)).filter(u => u.hostname !== "localhost" && u.hostname !== "127.0.0.1" && u.hostname !== "mail.google.com")
  expect(outside.map(String), "nothing leaves the browser").toEqual([])
})

const demo = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
const TASKS = ["centre-room", "centre-layout", "centre-access", "centre-next"]
/** Begin with an older saved club; loading it upgrades it to the current rule plan (S2). Jordan has three tasks due today and one next week. */
async function open(page: Page, mode?: ReminderMode, legacyHistory = false) {
  await page.goto("/#/")
  const s = await savedDemo(page)
  const template = s.nodes.find(n => n.id === "t-room")!
  const today = "2026-11-05"
  // t-room is a club task in the current seed: the four tasks are club tasks too, so no event is needed.
  const nodes = TASKS.map((id, i) => ({ ...template,
    id, title: ["Reserve a room", "Confirm the room layout", "Confirm room access", "Prepare the next room booking"][i],
    ownerId: "jordan", ownerVersion: 0, matching: undefined, timing: undefined, dependsOn: [], status: "accepted" as const,
    waitingOn: null, waitingOnPersonId: null, estDays: 2, clubDeadlineOverride: null,
    anchor: { kind: "fixed" as const, official: null, club: i === 3 ? addDays(today, 7) : today },
  }))
  const nudges = legacyHistory ? [{ id: "earlier-reminder", nodeId: "centre-room", channel: "email" as const, text: "Earlier message with no recipient snapshot", sentBy: "alex", sentOn: addDays(today, -4), response: null }] : []
  const saved: DemoState = applySchedule({ ...s, today, nodes, events: [], nudges, protocolLog: [], silenceCases: [], notifications: [], funding: [], extensionRequests: [], taskAccessGrants: [], reminderRuntime: undefined,
    people: s.people.map(p => p.id === "jordan" ? { ...p, busyWeeks: [], personalBufferDays: 1 } : p),
    org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode, matchingMode: "legacy" } } })
  await page.evaluate(state => localStorage.setItem("platypus.v1.demo", JSON.stringify(state)), saved)
  await page.reload()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
  // S2: a loaded or fresh demo is already on the current reminder plan; the "Enable updated reminders" card never shows.
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
  await expect.poll(async () => (await demo(page)).reminderRuntime?.version).toBe(2)
  if (mode === "auto_email") await expect.poll(async () => (await demo(page)).reminderRuntime?.deliveries.length).toBe(3)
}
const person = (page: Page, id = "jordan") => page.locator(`[data-testid="rq-person"][data-recipient="${id}"]`)
const panel = (page: Page) => page.getByTestId("digest-panel")
/** S2: open one person's combined email in place and wait until the rule-written email is ready. */
async function openEmail(page: Page, id = "jordan") {
  await person(page, id).getByTestId("rq-person-toggle").click()
  // R-S0: the review modes open an editable draft; "Send automatically" keeps the read-only email.
  await expect(person(page, id).getByTestId("rq-draft").or(person(page, id).getByTestId("digest-body"))).toBeVisible()
}
/** S2: the row's own Send ("I review, Platypus sends") records that person's email. */
async function sendRow(page: Page, id = "jordan") {
  await person(page, id).getByTestId("rq-person-send").click()
  await expect(person(page, id)).toHaveAttribute("data-state", "sent")
}
const closePanel = async (page: Page) => { await panel(page).getByRole("button", { name: "Close email" }).click(); await closeRail(page) }
async function openHistory(page: Page) {
  await page.getByTestId("open-history").click()
  await expect(page.getByTestId("reminder-history")).toBeVisible()
}
const closeHistory = async (page: Page) => { await page.getByRole("button", { name: "Close details" }).click(); await closeRail(page) }

test("no mode: today's tasks are one email for Jordan, with a link to choose a mode and no repeated week list", async ({ page, isMobile }) => {
  await open(page)
  await expect(page.getByTestId("rq-summary")).toContainText("1 person to remind")
  // The old Today cards and the old five lists are gone.
  for (const gone of ["Needs a nudge", "Semester goals", "Superstar of the week", "This week", "Needs your OK"]) await expect(page.getByRole("heading", { name: gone })).toHaveCount(0)
  await expect(page.getByTestId("event-strip")).toHaveCount(0)
  await expect(page.getByTestId("rq-person")).toHaveCount(1)
  await expect(person(page).getByTestId("rq-person-task")).toHaveCount(3)
  // S2: no "Up next", other-task count or mode chip; the next check shows only once nothing is left to send today.
  await expect(person(page)).not.toContainText("Up next")
  await expect(person(page)).not.toContainText("other open task")
  await expect(page.getByTestId("reminder-mode-chip")).toHaveCount(0)
  await expect(page.getByTestId("rq-next")).toHaveCount(0)
  await expect(page.getByTestId("send-all-digests")).toHaveCount(0)
  await expect(page.getByTestId("rq-fix")).toHaveCount(0)
  await shot(page, "president-no-mode", isMobile)
  expect(await scan(page)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  // "Choose how reminders go out" opens Settings at the choice; choosing saves org.settings.reminderMode.
  await page.getByTestId("choose-mode").click()
  await expect(page.locator("main h1")).toHaveText("Settings")
  const choice = page.getByTestId("settings-reminder-mode")
  await expect(choice).toBeVisible()
  await expect(choice.getByRole("radio")).toHaveCount(3)
  await choice.getByRole("radio", { name: "I review, Platypus sends" }).check()
  await expect.poll(async () => (await demo(page)).org.settings.reminderMode).toBe("review_then_auto")
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Reminders" }).click()
  await expect(page.getByTestId("send-all-digests")).toHaveText("Send all")
})

test("I review, then I send: the row opens in Gmail → I sent this records one email for three tasks, by the president", async ({ page, isMobile }) => {
  await open(page, "review_then_self")
  await expect(page.getByTestId("choose-mode")).toHaveCount(0)
  await shot(page, "president-review-then-self", isMobile)
  await expect(page.getByTestId("rq-person-send")).toHaveCount(0)
  await openEmail(page)
  await expect(person(page).getByTestId("rq-person-sent-self")).toHaveCount(0)
  const draft = person(page).getByRole("link", { name: "Open in Gmail" })
  await expect(draft).toHaveAttribute("href", /^https:\/\/mail\.google\.com\/mail\/\?view=cm/)
  await draft.evaluate(a => a.removeAttribute("target"))           // stay on the page: the draft itself is not part of this test
  await draft.evaluate(a => a.addEventListener("click", e => e.preventDefault()))
  await draft.click()
  await person(page).getByRole("button", { name: "I sent this" }).click()
  await expect(person(page)).toHaveAttribute("data-state", "sent")
  await expect(person(page).getByText("Sent", { exact: true })).toBeVisible()
  await expect(page.getByTestId("rq-summary")).toContainText("Nothing to send today.")
  const state = await demo(page)
  expect(state.nudges).toEqual([])
  expect(state.reminderRuntime!.deliveries.map(d => d.nodeId).sort()).toEqual(TASKS.slice(0, 3).sort())
  expect(state.reminderRuntime!.deliveries.every(d => d.via === "manual" && d.recipientId === "jordan")).toBe(true)
  expect(state.reminderRuntime!.digests).toHaveLength(1)
  expect(state.reminderRuntime!.digests![0]).toMatchObject({ via: "manual", recipientId: "jordan", checked: true, source: "rules" })
  await openHistory(page)
  await expect(page.getByTestId("rq-sent").getByTestId("rq-row")).toHaveCount(1)
  await expect(page.getByTestId("rq-sent")).toContainText("To Jordan · 3 tasks")
})

test("I review, Platypus sends: the row's Send records the whole email; every task keeps its own checked mail and link", async ({ page, isMobile }) => {
  await open(page, "review_then_auto")
  await shot(page, "president-review-then-auto", isMobile)
  await openEmail(page)
  expect((await person(page).getByTestId("rq-draft-body").inputValue()).match(/^\[Open task: [^\]]+\]$/gm)).toHaveLength(3)
  await expect(person(page).getByRole("link", { name: "Open in Gmail" })).toHaveCount(0)
  await shot(page, "president-review-then-auto-expanded", isMobile)
  await sendRow(page)
  const saved = await demo(page)
  expect(saved.nudges).toEqual([])
  expect(saved.reminderRuntime!.deliveries).toHaveLength(3)
  expect(saved.reminderRuntime!.digests).toHaveLength(1)
  for (const d of saved.reminderRuntime!.deliveries) {
    expect(d.via).toBe("platypus")
    expect(d.recipientId).toBe("jordan")
    expect(d.digestId).toBe(saved.reminderRuntime!.digests![0].id)
    expect(d.message).toMatchObject({ checked: true, source: "rules", channel: "email" })
    expect(saved.reminderRuntime!.digests![0].taskUrls).toContain(d.message!.taskUrl)
  }
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string }[])
  expect(log.filter(e => e.type === "recordReminderDigests")).toHaveLength(1)
  await expect(page.getByTestId("send-all-digests")).toHaveCount(0)
  await shot(page, "president-review-then-auto-approved", isMobile)
  expect(await scan(page)).toEqual([])
})

test("I review, Platypus sends: Send all N emails records every email in one store action", async ({ page }) => {
  await open(page, "review_then_auto")
  await page.getByTestId("send-all-digests").click()
  await expect(page.getByText("Sent to 1 person.")).toBeVisible()
  await expect(page.getByTestId("send-all-digests")).toHaveCount(0)
  const saved = await demo(page)
  expect(saved.reminderRuntime!.deliveries).toHaveLength(3)
  expect(saved.reminderRuntime!.digests).toHaveLength(1)
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string }[])
  expect(log.filter(e => e.type === "recordReminderDigests")).toHaveLength(1)
  expect(log.filter(e => e.type === "recordReminderBatch")).toHaveLength(0)
})

test("Send automatically: the email is recorded without a button, survives reload, and the page only shows status", async ({ page, isMobile }) => {
  await open(page, "auto_email")
  await expect(page.getByTestId("send-all-digests")).toHaveCount(0)
  await expect(page.getByTestId("open-first-draft")).toHaveCount(0)
  await expect(person(page)).toHaveAttribute("data-state", "sent")
  await expect(page.getByTestId("rq-summary")).toContainText("Sent automatically")
  await expect(page.getByTestId("rq-person-send")).toHaveCount(0)
  const saved = await demo(page)
  expect(saved.nudges).toEqual([])
  expect(saved.reminderRuntime!.deliveries.every(d => d.via === "automatic" && d.message?.checked)).toBe(true)
  expect(saved.reminderRuntime!.digests).toHaveLength(1)
  await expect(page.getByTestId("rq-history")).toHaveText("History")
  const ids = saved.reminderRuntime!.deliveries.map(d => d.id)
  await page.reload()
  await closeRail(page)
  expect((await demo(page)).reminderRuntime!.deliveries.map(d => d.id)).toEqual(ids)
  await openHistory(page)
  await expect(page.getByTestId("rq-sent")).toContainText("To Jordan · 3 tasks")
  await expect(page.getByTestId("rq-no-reply")).toHaveCount(0)
  await closeHistory(page)
  await shot(page, "president-auto", isMobile)
  expect(await scan(page)).toEqual([])
})

test("Follow up: a recorded email starts the no-reply clock; Follow up opens that person's next email", async ({ page }) => {
  await open(page, "review_then_auto")
  await sendRow(page)
  await openHistory(page)
  await expect(page.getByTestId("rq-no-reply")).toHaveCount(0)
  await closeHistory(page)
  await demoClock(page, 3)
  await page.keyboard.press("Escape")
  await closeRail(page)
  await openHistory(page)
  const wait = page.getByTestId("rq-no-reply").locator('[data-node="centre-room"]')
  await expect(wait).toContainText("No reply · 3 days")
  await expect(wait.getByRole("button", { name: "Follow up" })).toBeEnabled()
  expect((await demo(page)).protocolLog.filter(e => e.kind === "reminder")).toEqual([])
  await wait.getByRole("button", { name: "Follow up" }).click()
  await expect(panel(page).getByTestId("digest-body")).toBeVisible()
  await panel(page).getByTestId("digest-send-next").click()
  await expect(panel(page)).toContainText("All sent.")
  await closePanel(page)
  const saved = await demo(page)
  const history = saved.reminderRuntime!.deliveries.filter(d => d.nodeId === "centre-room")
  expect(history).toHaveLength(2)
  expect(history[1]).toMatchObject({ reason: "overdue", recipientId: "jordan", sentOn: saved.today })
  await openHistory(page)
  await expect(page.getByTestId("rq-no-reply").locator('[data-node="centre-room"]')).toHaveCount(0)
})

test("an officer who is not a lead sees a read-only Your reminders", async ({ page, isMobile }) => {
  await open(page, "auto_email")
  await viewAs(page, "jordan")
  await closeRail(page)
  const mine = page.getByTestId("your-reminders")
  await expect(mine.getByRole("heading", { name: "Your reminders" })).toBeVisible()
  await expect(mine).toContainText("Coming up")
  await expect(mine).toContainText("Planned reminder")
  await expect(mine.getByText("Sent", { exact: true })).toHaveCount(3)
  expect((await demo(page)).reminderRuntime!.deliveries.every(d => d.recipientId === "jordan")).toBe(true)
  await expect(page.getByTestId("reminder-centre")).toHaveCount(0)
  for (const name of [/^Send all/, /^Open draft/, "Follow up", "History"]) await expect(page.locator("main").getByRole("button", { name, exact: typeof name === "string" })).toHaveCount(0)
  await shot(page, "officer", isMobile)
  expect(await scan(page)).toEqual([])
})

test("older reminders keep unknown recipients until a lead explicitly confirms the current future assignment", async ({ page }) => {
  await open(page, "review_then_self", true)
  const original = (await demo(page)).nudges
  const row = page.getByTestId("rq-fix").locator('[data-node="centre-room"]')
  await expect(row).toContainText("Check earlier reminders")
  await expect(person(page).locator('[data-node="centre-room"]')).toHaveCount(0)
  await openHistory(page)
  const earlier = page.getByTestId("rq-sent").locator('[data-node="centre-room"]')
  await expect(earlier).toContainText("Recipient not recorded")
  await expect(earlier).not.toContainText("Jordan Patel")
  await closeHistory(page)
  await row.getByRole("button", { name: "I checked · allow future reminders" }).click()
  await expect(page.getByText("Future reminders are enabled for the current assignment. Earlier history is unchanged.")).toBeVisible()
  await expect(person(page).locator('[data-node="centre-room"]')).toHaveCount(1)
  await expect(page.getByTestId("rq-fix")).toHaveCount(0)
  const saved = await demo(page)
  expect(saved.nudges).toEqual(original)
  expect(saved.reminderRuntime!.legacyUnresolvedNodeIds).toEqual([])
  expect(saved.reminderRuntime!.deliveries).toEqual([])
})

test("an owner's same-day task reply appears against the recorded recipient and suppresses no-reply", async ({ page }) => {
  await open(page, "review_then_auto")
  await sendRow(page)
  const delivery = (await demo(page)).reminderRuntime!.deliveries.find(d => d.nodeId === "centre-room")!
  await page.goto(delivery.message!.taskUrl)
  await page.getByTestId("task-detail").getByRole("combobox", { name: "Task status", exact: true }).selectOption("in_progress")
  await expect(page.getByRole("combobox", { name: "Task status", exact: true })).toHaveValue("in_progress")
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  // Leaving the task closes its details; on a phone the side panel goes with it.
  if ((page.viewportSize()?.width ?? 1280) < 1200) await expect(page.getByTestId("rail")).toBeHidden()
  await openHistory(page)
  await expect(page.getByTestId("rq-replies").getByTestId("rq-row")).toHaveCount(1)
  const reply = page.getByTestId("rq-replies").locator('[data-node="centre-room"]')
  await expect(reply).toContainText("Working on it")
  await expect(reply).toContainText("Jordan Patel")
  await expect(page.getByTestId("rq-no-reply")).toHaveCount(0)
  expect((await demo(page)).reminderRuntime!.updates.some(u => u.ownerReply && u.actorId === "jordan" && u.sequence > delivery.sequence)).toBe(true)
})

test("navigation: Team is primary, Partners is archived, and Plan keeps its task count and current state", async ({ page, isMobile }) => {
  await open(page)
  await viewAs(page, "jordan")
  await closeRail(page)
  const nav = page.getByRole("navigation", { name: "Sections" })
  await expect(nav.getByRole("link")).toHaveText([/^Reminders/, /^Plan/, /^Team/, /^Handoff/, /^Rules/, /^Settings/])
  await expect(nav.getByRole("button", { name: "More", exact: true })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: "Partners", exact: true })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: "Team", exact: true })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Reminders" })).toHaveAttribute("aria-current", "page")
  await expect(nav.getByRole("link", { name: /^Plan/ }).getByTestId("nav-open-tasks")).toBeVisible()
  await expect(nav.getByTestId("nav-open-tasks")).toContainText("4")
  await shot(page, "nav-closed", isMobile)
  expect(await scan(page)).toEqual([])
  await nav.getByRole("link", { name: "Team" }).click()
  await expect(page.locator("main h1")).toHaveText("Team")
  await expect(nav.getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "page")
  // The archived route returns to the main workspace, including after refresh.
  await page.goto("/#/partners")
  await page.reload()
  await expect(page).toHaveURL(/#\/$/)
  await expect(nav.getByRole("link", { name: "Partners" })).toHaveCount(0)
  // Plan: Events, and Tasks through the switch, both light Plan up.
  await closeRail(page)
  await nav.getByRole("link", { name: /^Plan/ }).click()
  await expect(page.locator("main h1")).toHaveText("Events")
  await expect(nav.getByRole("link", { name: /^Plan/ })).toHaveAttribute("aria-current", "page")
  const sw = page.getByRole("navigation", { name: "Plan" })
  await expect(sw.getByRole("link", { name: "Events" })).toHaveAttribute("aria-current", "page")
  await sw.getByRole("link", { name: "Tasks" }).click()
  await expect(page.locator("main h1")).toHaveText("Tasks")
  await expect(nav.getByRole("link", { name: /^Plan/ })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("navigation", { name: "Plan" }).getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page")
  await shot(page, "plan-tasks", isMobile)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test("phone: the primary Team link is reachable and a full-size target", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only")
  await open(page)
  const nav = page.getByRole("navigation", { name: "Sections" })
  const team = nav.getByRole("link", { name: "Team", exact: true })
  expect((await team.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
  await team.scrollIntoViewIfNeeded()
  await expect(team).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  // The person row is a full-width target inside the screen.
  const head = (await person(page).locator(".dg-person-head").boundingBox())!
  expect(head.height).toBeGreaterThanOrEqual(43.5)
  expect(head.x + head.width).toBeLessThanOrEqual(page.viewportSize()!.width)
})
