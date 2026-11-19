import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, demoClock, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import type { DemoState, ReminderMode } from "../src/data/types"
import { applySchedule } from "../src/engine/schedule"
import { addDays } from "../src/lib/dates"

// FB-8 (docs/feedback-fix/PLAN.md §12.2): the home page is the reminder centre; the three reminder modes really behave differently;
// the navigation is Reminders, Plan, Team, Handoff, Rules; Partners is temporarily archived. Nothing is ever sent: no request leaves the browser.
// Set FB8_SHOTS=<folder> to also save screenshots of each state for a visual check.
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
/** Begin with an older saved club, then explicitly activate the current rule plan. */
async function open(page: Page, mode?: ReminderMode, legacyHistory = false) {
  await page.goto("/#/")
  const s = await savedDemo(page)
  const template = s.nodes.find(n => n.id === "t-room")!
  const today = "2026-11-05"
  const event = { ...s.events.find(e => e.id === template.eventId)!, name: "Speaker Night", date: addDays(today, 21), headcount: 40 }
  const nodes = ["centre-room", "centre-layout", "centre-access", "centre-next"].map((id, i) => ({ ...template,
    id, title: ["Reserve a room", "Confirm the room layout", "Confirm room access", "Prepare the next room booking"][i],
    ownerId: "jordan", ownerVersion: 0, matching: undefined, timing: undefined, dependsOn: [], status: "accepted" as const,
    waitingOn: null, waitingOnPersonId: null, estDays: 2, clubDeadlineOverride: null,
    anchor: { kind: "fixed" as const, official: null, club: i === 3 ? addDays(today, 7) : today },
  }))
  const nudges = legacyHistory ? [{ id: "earlier-reminder", nodeId: "centre-room", channel: "email" as const, text: "Earlier message with no recipient snapshot", sentBy: "alex", sentOn: addDays(today, -4), response: null }] : []
  const saved: DemoState = applySchedule({ ...s, today, nodes, events: [event], nudges, protocolLog: [], silenceCases: [], notifications: [], funding: [], extensionRequests: [], taskAccessGrants: [], reminderRuntime: undefined,
    people: s.people.map(p => p.id === "jordan" ? { ...p, busyWeeks: [], personalBufferDays: 1 } : p),
    org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode, matchingMode: "legacy" } } })
  await page.evaluate(state => localStorage.setItem("platypus.v1.demo", JSON.stringify(state)), saved)
  await page.reload()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
  await expect(page.getByTestId("approve-all")).toHaveCount(0)
  await page.getByRole("button", { name: "Enable updated reminders", exact: true }).click()
  await expect.poll(async () => (await demo(page)).reminderRuntime?.version).toBe(2)
  if (mode === "auto_email") await expect.poll(async () => (await demo(page)).reminderRuntime?.deliveries.length).toBe(3)
}
const section = (page: Page, id: string) => page.getByTestId(id)
const rows = (page: Page, id: string) => section(page, id).getByTestId("rq-row")
const composer = (page: Page) => page.getByTestId("nudge-panel")
const closeComposer = async (page: Page) => { await composer(page).getByRole("button", { name: "Close reminder" }).click(); await closeRail(page) }

test("no mode: send-day items wait under Needs your OK, with a link to choose a mode; the five sections are there", async ({ page, isMobile }) => {
  await open(page)
  for (const [id, name] of [["rq-needs-ok", "Needs your OK"], ["rq-this-week", "This week"], ["rq-sent", "Sent"], ["rq-replies", "Replies"], ["rq-no-reply", "No reply yet"]])
    await expect(section(page, id).getByRole("heading", { level: 2 })).toContainText(name)
  // The old Today cards are gone.
  for (const gone of ["Needs a nudge", "Semester goals", "Superstar of the week"]) await expect(page.getByRole("heading", { name: gone })).toHaveCount(0)
  await expect(page.getByTestId("event-strip")).toHaveCount(0)
  expect(await rows(page, "rq-needs-ok").count()).toBeGreaterThan(1)
  await expect(rows(page, "rq-needs-ok").first().getByRole("button", { name: "Review & open draft" })).toBeVisible()
  // Forecast red first, with the risk mark.
  await expect(rows(page, "rq-needs-ok").first().getByTestId("forecast")).toBeVisible()
  await expect(rows(page, "rq-this-week").first()).toContainText(/Planned reminder (Mon|Tue|Wed|Thu|Fri|Sat|Sun), Nov \d+/)
  await expect(page.getByTestId("approve-all")).toHaveCount(0)
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
  await expect(page.getByTestId("approve-all")).toBeVisible()
})

test("I review, then I send: Review & open draft → draft → I sent this reminder → under Sent, by the president", async ({ page, isMobile }) => {
  await open(page, "review_then_self")
  await expect(page.getByTestId("choose-mode")).toHaveCount(0)
  await shot(page, "president-review-then-self", isMobile)
  const first = rows(page, "rq-needs-ok").first()
  const id = (await first.getAttribute("data-node"))!
  const before = await rows(page, "rq-needs-ok").count()
  await first.getByRole("button", { name: "Review & open draft" }).click()
  await expect(composer(page).getByRole("button", { name: /Approve/ })).toHaveCount(0)
  await composer(page).getByLabel("Preferred channel").selectOption("email")
  const draft = composer(page).getByRole("link", { name: "Open Gmail draft" })
  await expect(draft).toBeVisible()
  await draft.evaluate(a => a.removeAttribute("target"))           // stay on the page: the draft itself is not part of this test
  await draft.evaluate(a => a.addEventListener("click", e => e.preventDefault()))
  await draft.click()
  await composer(page).getByRole("button", { name: "I sent this reminder" }).click()
  await expect(composer(page)).toContainText("Recorded as sent by you")
  await closeComposer(page)
  await expect(rows(page, "rq-needs-ok")).toHaveCount(before - 1)
  const sent = section(page, "rq-sent").locator(`[data-node="${id}"]`)
  await expect(sent).toContainText("Recorded by sender")
  const state = await demo(page)
  expect(state.nudges).toEqual([])
  expect(state.reminderRuntime!.deliveries.map(d => [d.nodeId, d.via, d.recipientId])).toEqual([[id, "manual", "jordan"]])
  expect(state.reminderRuntime!.deliveries[0].message).toMatchObject({ checked: true, source: "rules", channel: "email" })
})

test("I review, Platypus sends: single approval and batch both save complete checked mail", async ({ page, isMobile }) => {
  await open(page, "review_then_auto")
  await shot(page, "president-review-then-auto", isMobile)
  const first = rows(page, "rq-needs-ok").first()
  const id = (await first.getAttribute("data-node"))!
  await first.getByRole("button", { name: "Review", exact: true }).click()
  await expect(composer(page).getByRole("link", { name: /draft/ })).toHaveCount(0)
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await expect(composer(page)).toContainText("Approved. Platypus would send it now.")
  await closeComposer(page)
  await expect(section(page, "rq-sent").locator(`[data-node="${id}"]`)).toContainText("Approved demo")
  const all = page.getByTestId("approve-all")
  const n = Number((await all.innerText()).match(/\((\d+)\)/)![1])
  expect(n).toBe(2)
  await all.click()
  await expect(page.getByText("2 reminders saved as a demo. Nothing was sent.")).toBeVisible()
  await expect(page.getByTestId("approve-all")).toHaveCount(0)
  const saved = await demo(page)
  expect(saved.nudges).toEqual([])
  expect(saved.reminderRuntime!.deliveries).toHaveLength(3)
  for (const d of saved.reminderRuntime!.deliveries) {
    expect(d.via).toBe("platypus")
    expect(d.recipientId).toBe("jordan")
    expect(d.message).toMatchObject({ checked: true, source: "rules", channel: "email" })
    expect(d.message!.body.match(/https?:\/\/\S+/g)).toEqual([d.message!.taskUrl])
  }
  await expect(section(page, "rq-sent").getByText("Approved demo")).toHaveCount(3)
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string }[])
  expect(log.filter(e => e.type === "recordReminderBatch")).toHaveLength(1)
  await shot(page, "president-review-then-auto-approved", isMobile)
  expect(await scan(page)).toEqual([])
})

test("Send automatically: actual durable mail records replace derived would-send rows and survive reload", async ({ page, isMobile }) => {
  await open(page, "auto_email")
  await expect(rows(page, "rq-needs-ok")).toHaveCount(0)
  await expect(section(page, "rq-needs-ok")).toContainText("Automatic reminders are recorded only after")
  await expect(section(page, "rq-sent").getByText("Automatic demo", { exact: true })).toHaveCount(3)
  await expect(section(page, "rq-sent").getByText("Would be sent · demo")).toHaveCount(0)
  const saved = await demo(page)
  expect(saved.nudges).toEqual([])
  expect(saved.reminderRuntime!.deliveries.every(d => d.via === "automatic" && d.message?.checked)).toBe(true)
  await expect(rows(page, "rq-no-reply")).toHaveCount(0)
  const ids = saved.reminderRuntime!.deliveries.map(d => d.id)
  await page.reload()
  await closeRail(page)
  expect((await demo(page)).reminderRuntime!.deliveries.map(d => d.id)).toEqual(ids)
  await shot(page, "president-auto", isMobile)
  expect(await scan(page)).toEqual([])
})

test("Follow up: real recorded sends start the no-reply clock, with no duplicate legacy member reminders", async ({ page }) => {
  await open(page, "review_then_auto")
  const first = rows(page, "rq-needs-ok").first()
  const id = (await first.getAttribute("data-node"))!
  await first.getByRole("button", { name: "Review", exact: true }).click()
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await expect(composer(page)).toContainText("Approved. Platypus would send it now.")
  await closeComposer(page)
  await expect(section(page, "rq-no-reply").locator(`[data-node="${id}"]`)).toHaveCount(0)
  await demoClock(page, 3)
  await page.keyboard.press("Escape")
  await closeRail(page)
  const wait = section(page, "rq-no-reply").locator(`[data-node="${id}"]`)
  await expect(wait).toContainText("3 days since reminder")
  await expect(wait.getByRole("button", { name: "Follow up" })).toBeEnabled()
  expect((await demo(page)).protocolLog.filter(e => e.kind === "reminder")).toEqual([])
  await wait.getByRole("button", { name: "Follow up" }).click()
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await expect(composer(page)).toContainText("Approved. Platypus would send it now.")
  await closeComposer(page)
  const saved = await demo(page)
  const history = saved.reminderRuntime!.deliveries.filter(d => d.nodeId === id)
  expect(history).toHaveLength(2)
  expect(history[1]).toMatchObject({ reason: "overdue", recipientId: "jordan", sentOn: saved.today })
  await expect(section(page, "rq-no-reply").locator(`[data-node="${id}"]`)).toHaveCount(0)
})

test("an officer who is not a lead sees a read-only Your reminders", async ({ page, isMobile }) => {
  await open(page, "auto_email")
  await viewAs(page, "jordan")
  await closeRail(page)
  const mine = page.getByTestId("your-reminders")
  await expect(mine.getByRole("heading", { name: "Your reminders" })).toBeVisible()
  await expect(mine).toContainText("Coming up")
  await expect(mine).toContainText("Planned reminder")
  await expect(mine.getByText("Automatic demo", { exact: true })).toHaveCount(3)
  expect((await demo(page)).reminderRuntime!.deliveries.every(d => d.recipientId === "jordan")).toBe(true)
  await expect(page.getByTestId("reminder-centre")).toHaveCount(0)
  for (const name of ["Review & open draft", "Review", "Follow up", /Approve all/]) await expect(page.locator("main").getByRole("button", { name, exact: typeof name === "string" })).toHaveCount(0)
  await shot(page, "officer", isMobile)
  expect(await scan(page)).toEqual([])
})

test("older reminders keep unknown recipients until a lead explicitly confirms the current future assignment", async ({ page }) => {
  await open(page, "review_then_self", true)
  const original = (await demo(page)).nudges
  const row = section(page, "rq-needs-ok").locator('[data-node="centre-room"]')
  await expect(row).toContainText("Jordan Patel")
  await expect(row.getByRole("button", { name: "Review & open draft" })).toHaveCount(0)
  const earlier = section(page, "rq-sent").locator('[data-node="centre-room"]')
  await expect(earlier).toContainText("recipient not recorded")
  await expect(earlier).not.toContainText("Jordan Patel")
  await row.getByRole("button", { name: "I checked · allow future reminders" }).click()
  await expect(page.getByText("Future reminders are enabled for the current assignment. Earlier history is unchanged.")).toBeVisible()
  await expect(row.getByRole("button", { name: "Review & open draft" })).toBeEnabled()
  const saved = await demo(page)
  expect(saved.nudges).toEqual(original)
  expect(saved.reminderRuntime!.legacyUnresolvedNodeIds).toEqual([])
  expect(saved.reminderRuntime!.deliveries).toEqual([])
})

test("an owner's same-day task reply appears against the recorded recipient and suppresses no-reply", async ({ page }) => {
  await open(page, "review_then_auto")
  const first = rows(page, "rq-needs-ok").first()
  const nodeId = (await first.getAttribute("data-node"))!
  await first.getByRole("button", { name: "Review", exact: true }).click()
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await expect(composer(page)).toContainText("Approved. Platypus would send it now.")
  const delivery = (await demo(page)).reminderRuntime!.deliveries[0]
  await page.goto(delivery.message!.taskUrl)
  await page.getByTestId("single-task-page").getByRole("combobox", { name: "Task status", exact: true }).selectOption("in_progress")
  await expect(page.getByRole("combobox", { name: "Task status", exact: true })).toHaveValue("in_progress")
  await page.goto("/#/")
  await closeRail(page)
  const reply = section(page, "rq-replies").locator(`[data-node="${nodeId}"]`)
  await expect(reply).toContainText("Working on it")
  await expect(reply).toContainText("Jordan Patel")
  await expect(section(page, "rq-no-reply").locator(`[data-node="${nodeId}"]`)).toHaveCount(0)
  expect((await demo(page)).reminderRuntime!.updates.some(u => u.ownerReply && u.actorId === "jordan" && u.sequence > delivery.sequence)).toBe(true)
})

test("navigation: Team is primary, Partners is archived, and Plan keeps its task count and current state", async ({ page, isMobile }) => {
  await open(page)
  await viewAs(page, "jordan")
  await closeRail(page)
  const nav = page.getByRole("navigation", { name: "Sections" })
  await expect(nav.getByRole("link")).toHaveText([/^Reminders/, /^Plan/, /^Team/, /^Handoff/, /^Rules/, /^Settings/, /^Help/])
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
  // The row's action sits under the task on a phone, inside the screen.
  const btn = rows(page, "rq-needs-ok").first().getByRole("button", { name: "Review & open draft" })
  const b = (await btn.boundingBox())!
  expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width)
})
