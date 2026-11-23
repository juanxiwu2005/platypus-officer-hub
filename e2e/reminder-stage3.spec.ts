import { enableUpdatedReminders } from "./reminderHelpers"
import { expect, test, type Page, type TestInfo } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { savedDemo } from "./demo-contract"
import { closeRail, noOverflow, viewAs } from "./helpers"
import { applySchedule } from "../src/engine/schedule"
import { fmtShort } from "../src/lib/dates"
import type { DemoState, ReminderMode } from "../src/data/types"
import type { ReminderDelivery } from "../src/reminders/contracts"

const KEY = "platypus.v1.demo"
const ROOM = "reminder-s3-room", POSTER = "reminder-s3-poster", TODAY = "2027-03-31"
const DETAILS = "Please confirm the accessible entrance and projector connection"
const read = (page: Page): Promise<DemoState> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY)
const rows = (page: Page, section: string) => page.getByTestId(section).getByTestId("rq-row")
/** Recorded emails, replies and no-reply rows live in the History panel of the right rail (concept F). */
async function openHistory(page: Page) {
  await page.getByTestId("open-history").click()
  await expect(page.getByTestId("reminder-history")).toBeVisible()
}
const closeHistory = async (page: Page) => { await page.getByRole("button", { name: "Close details" }).click(); await closeRail(page) }
const node = (state: DemoState, id = ROOM) => state.nodes.find(n => n.id === id)!

/** Only saved input fixtures are installed. Enabling, confirming, assigning and sending use the real UI. */
async function openLegacy(page: Page, mode: ReminderMode, options: { history?: boolean; count?: number } = {}) {
  await page.goto("/#/tasks")
  await savedDemo(page)
  const input = await page.evaluate(({ key, mode, history, count, room, poster, today }) => {
    const s: DemoState = JSON.parse(localStorage.getItem(key)!)
    const source = s.nodes.find(n => n.stepKey === "venue" && n.eventId)!
    const event = s.events.find(e => e.id === source.eventId)!
    event.name = "Speaker Night"; event.date = "2027-04-16"; event.headcount = 40; event.venue = "campus"
    s.events = [event]
    s.nodes = [
      { ...source, id: room, title: "Reserve a room", stepKey: "venue", ownerId: "jordan", instructions: "Reserve a room for 40 attendees and record the booking confirmation.", completionCriteria: "Save the confirmed room number and booking reference.", why: "A confirmed location lets everyone plan to attend." },
      { ...source, id: poster, title: "Prepare the event invitation", stepKey: "flyer", ownerId: "priya", instructions: "Prepare the invitation using the confirmed event details.", completionCriteria: "Save the invitation draft for review.", why: "Clear event details help members decide whether to join." },
    ].slice(0, count).map(n => ({ ...n, status: "accepted", ownerVersion: 0, acceptedOn: today, assignedOn: today, lastUpdate: null, completedOn: undefined, dependsOn: [], waitingOn: null, waitingOnPersonId: null, anchor: { kind: "fixed", official: null, club: today }, clubDeadlineOverride: today, timing: undefined, matching: undefined, ruleIds: [] }))
    s.today = today; s.viewerId = "alex"; s.aiEnabled = true
    s.org.settings.reminderMode = mode
    s.org.settings.matchingMode = "legacy"
    s.org.settings.maxRemindersPerTask = 2
    s.org.settings.silenceProtocol = { nudgeDays: [4, 8], presidentDay: 11, reassignDay: 13, retroDay: 16 }
    s.nudges = history ? [{ id: "before-reminder-s3", nodeId: room, channel: "email", text: "Earlier room reminder", sentBy: "alex", sentOn: "2027-03-25", response: null, via: "president" }] : []
    s.protocolLog = []; s.silenceCases = []; s.notifications = []; s.extensionRequests = []
    s.taskAccessGrants = []; s.officerGrants = []
    delete s.reminderRuntime
    return s
  }, { key: KEY, mode, history: options.history ?? false, count: options.count ?? 2, room: ROOM, poster: POSTER, today: TODAY })
  const scheduled = applySchedule(input)
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: KEY, state: scheduled })
  await page.goto("/#/")
  await page.reload()
  // S2: an older plan shows no Enable card on the home page (saves are to upgrade on load).
  await expect(page.getByTestId("reminder-centre")).toBeAttached()
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
  await closeRail(page)
  const loaded = await read(page)
  expect(node(loaded).clubDeadline).toBe(TODAY)
  return loaded
}

async function activate(page: Page) {
  await enableUpdatedReminders(page)
  await expect.poll(async () => (await read(page)).reminderRuntime?.version).toBe(2)
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
}
async function detail(page: Page, id = ROOM) {
  await page.goto(`/#/tasks?node=${encodeURIComponent(id)}`)
  const panel = page.getByTestId("task-detail")
  await expect(panel).toBeVisible()
  return panel
}
async function accessible(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  if (include) builder = builder.include(include)
  const result = await builder.analyze()
  expect(result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
}
const screenshot = (page: Page, info: TestInfo, name: string) => page.screenshot({ path: info.outputPath(`${name}-${info.project.name}.png`), fullPage: true })
function completeMail(delivery: ReminderDelivery, state: DemoState) {
  expect(delivery.outcome).toBe("simulated")
  expect(delivery.message).toMatchObject({ source: "rules", checked: true, recipientId: delivery.recipientId, channel: "email" })
  const mail = delivery.message!
  expect(mail.wordCount).toBeLessThanOrEqual(100)
  expect(mail.body).toContain("Task due:")
  expect(delivery.due).toBe(node(state, delivery.nodeId).clubDeadline)
  expect(mail.body).toContain(`Task due: ${fmtShort(delivery.due!)}`)
  expect(mail.body).toContain("Thank you")
  const url = new URL(mail.taskUrl), query = new URLSearchParams(url.hash.split("?")[1])
  const activity = state.events.find(event => event.id === node(state, delivery.nodeId).eventId)
  expect(url.hash.startsWith(activity ? "#/events?" : "#/officer?")).toBe(true)
  if (activity) { expect(query.get("event")).toBe(activity.id); expect(query.get("node")).toBe(delivery.nodeId) }
  expect(mail.body.match(/https?:\/\/\S+/g)).toEqual([mail.taskUrl])
  expect(mail.text).toBe(`${mail.subject}\n\n${mail.body}`)
  expect(state.taskAccessGrants?.some(g => g.id === mail.accessId && g.nodeId === delivery.nodeId && g.recipientId === delivery.recipientId)).toBe(true)
}

const observations = new WeakMap<Page, { ai: string[]; errors: string[] }>()
test.beforeEach(async ({ page, context }) => {
  const seen = { ai: [] as string[], errors: [] as string[] }; observations.set(page, seen)
  page.on("request", request => { if (/\/api\/(?:nudge|chat|command|ask|send|mail)/.test(request.url())) seen.ai.push(request.url()) })
  page.on("pageerror", error => seen.errors.push(error.message))
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline browser check" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname), route => route.abort())
})
test.afterEach(async ({ page }) => {
  expect(observations.get(page)!.ai, "reminders require no AI or sending endpoint").toEqual([])
  expect(observations.get(page)!.errors, "the task and reminder pages have no uncaught browser errors").toEqual([])
})

test("an old save explicitly enables the plan without changing custom settings or history, and Details uses the approved universal submission layout", async ({ page }, info) => {
  const before = await openLegacy(page, "review_then_auto", { history: true })
  expect(before.reminderRuntime).toBeUndefined()
  await openHistory(page)
  await expect(page.getByTestId("rq-sent")).toContainText("Recipient not recorded")
  await closeHistory(page)
  await activate(page)
  const enabled = await read(page)
  expect(enabled.org.settings).toEqual(before.org.settings)
  expect(enabled.nudges).toEqual(before.nudges)
  expect(enabled.reminderRuntime!.legacyUnresolvedNodeIds).toContain(ROOM)
  const review = page.getByTestId("rq-fix").locator(`[data-node="${ROOM}"]`)
  await expect(review).toContainText("Check earlier reminders")
  await review.getByRole("button", { name: "I checked · allow future reminders" }).click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.legacyUnresolvedNodeIds?.includes(ROOM) ?? false).toBe(false)
  expect((await read(page)).nudges).toEqual(before.nudges)
  const panel = await detail(page)
  await expect(panel.locator(".td-head .td-event")).toContainText("Speaker Night")
  await expect(panel.getByRole("heading", { level: 2, name: "Reserve a room", exact: true })).toBeFocused()
  await expect(panel.getByTestId("task-due")).toHaveCount(1)
  await expect(panel.getByTestId("task-due")).toContainText("Due")
  await expect(panel.getByTestId("task-due")).toContainText(fmtShort(TODAY))
  await expect(panel.getByTestId("task-due")).not.toContainText(/Start by|ASU|Event date/)
  const eventBox = await panel.locator(".td-head .td-event").boundingBox()
  const titleBox = await panel.getByRole("heading", { level: 2, name: "Reserve a room", exact: true }).boundingBox()
  const dueBox = await panel.getByTestId("task-due").boundingBox()
  expect(eventBox).not.toBeNull(); expect(titleBox).not.toBeNull(); expect(dueBox).not.toBeNull()
  expect(eventBox!.y + eventBox!.height).toBeLessThanOrEqual(titleBox!.y)
  expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(dueBox!.y)
  await expect(panel).toContainText("40 attendees")
  await expect(panel.getByRole("navigation", { name: "External task links" }).getByRole("link")).toHaveCount(3)
  await expect(panel.getByRole("link", { name: "Student Union requests", exact: true })).toHaveAttribute("href", "https://eoss.asu.edu/student-unions/submit-a-space-request")
  await expect(panel.getByLabel("Details", { exact: true })).toBeVisible()
  await expect(panel.getByRole("region", { name: "Reminder plan" })).toHaveCount(0)
  expect(node(await read(page)).completionCriteria).toBe(node(enabled).completionCriteria)
  await accessible(page, "[data-testid=task-detail]")
  await screenshot(page, info, "details-universal-submission")
  await page.goto("/#/settings?reminders=1")
  await expect(page.getByRole("heading", { level: 1, name: "Settings", exact: true })).toBeVisible()
  await expect(page.getByTestId("reminder-plan-settings")).toContainText("3 days overdue")
  await page.getByText("Deadline and follow-up defaults", { exact: true }).click()
  await expect(page.getByRole("spinbutton", { name: "Legacy reminder 1 day", exact: true })).toHaveValue("4")
  await expect(page.getByRole("spinbutton", { name: "Legacy reminder 1 day", exact: true })).toBeDisabled()
  expect((await read(page)).org.settings).toEqual(before.org.settings)
})

test("Send all persists complete unique-link snapshots, survives reload, and recognizes a same-day owner reply before reassignment", async ({ page }, info) => {
  await openLegacy(page, "review_then_auto")
  await activate(page)
  // Two people, so two emails.
  await expect(page.getByTestId("rq-summary")).toContainText("2 people to remind")
  await expect(page.getByTestId("send-all-digests")).toHaveText("Send all")
  await page.getByTestId("send-all-digests").click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.deliveries.length).toBe(2)
  await expect(page.getByTestId("reminder-centre")).toContainText("Sent to 2 people.")
  const saved = await read(page), deliveries = saved.reminderRuntime!.deliveries
  for (const delivery of deliveries) completeMail(delivery, saved)
  expect(new Set(deliveries.map(d => d.candidateId)).size).toBe(2)
  expect(saved.reminderRuntime!.digests?.map(d => d.recipientId).sort()).toEqual(["jordan", "priya"])
  await openHistory(page)
  await expect(rows(page, "rq-sent")).toHaveCount(2)
  await page.reload()
  await closeRail(page)
  await expect(page.getByTestId("send-all-digests")).toHaveCount(0)
  await openHistory(page)
  await expect(rows(page, "rq-sent")).toHaveCount(2)
  expect((await read(page)).reminderRuntime!.deliveries).toEqual(deliveries)
  await screenshot(page, info, "saved-batch")
  const roomDelivery = deliveries.find(d => d.nodeId === ROOM)!
  await page.goto(roomDelivery.message!.taskUrl)
  const task = page.getByTestId("task-detail")
  await expect(task).toBeVisible()
  await task.getByRole("combobox", { name: "Task status", exact: true }).selectOption("in_progress")
  await expect(task.getByRole("combobox", { name: "Task status", exact: true })).toHaveValue("in_progress")
  const replied = await read(page)
  expect(replied.extensionRequests).toEqual([])
  expect(replied.reminderRuntime!.updates.some(u => u.nodeId === ROOM && u.ownerReply && u.actorId === "jordan" && u.on === roomDelivery.sentOn && u.sequence > roomDelivery.sequence)).toBe(true)
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  if ((page.viewportSize()?.width ?? 1280) < 1200) await expect(page.getByTestId("rail")).toBeHidden()
  await openHistory(page)
  await expect(page.getByTestId("rq-replies").locator(`[data-node="${ROOM}"]`)).toContainText("Working on it")
  await expect(page.getByTestId("rq-no-reply").locator(`[data-node="${ROOM}"]`)).toHaveCount(0)
  const panel = await detail(page)
  await panel.getByRole("button", { name: "Edit", exact: true }).click()
  const editor = page.getByRole("dialog", { name: "Edit task" })
  await editor.getByTestId("owner-select").selectOption("sam")
  await editor.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect.poll(async () => node(await read(page)).ownerId).toBe("sam")
  expect((await read(page)).reminderRuntime!.deliveries.find(d => d.id === roomDelivery.id)!.recipientId).toBe("jordan")
  await page.goto(roomDelivery.message!.taskUrl)
  await expect(page.getByRole("heading", { name: "Check your task link" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveCount(0)
})

test("an ordinary owner's Waiting on automatically records Sam's email and grants only help-request responses", async ({ page }, info) => {
  await openLegacy(page, "auto_email", { count: 1 })
  await activate(page)
  await expect.poll(async () => (await read(page)).reminderRuntime!.deliveries.length).toBe(1)
  await viewAs(page, "jordan")
  const panel = await detail(page)
  await panel.getByRole("combobox", { name: "Task status", exact: true }).selectOption("waiting")
  await panel.getByRole("combobox", { name: "Waiting on", exact: true }).selectOption("sam")
  await panel.getByRole("textbox", { name: "What help or input is needed?" }).fill(DETAILS)
  await panel.getByRole("button", { name: "Save waiting status" }).click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.deliveries.filter(d => d.reason === "waiting_on" && d.recipientId === "sam").length).toBe(1)
  const saved = await read(page), followup = saved.reminderRuntime!.deliveries.find(d => d.reason === "waiting_on")!
  expect(saved.viewerId).toBe("jordan")
  expect(node(saved)).toMatchObject({ ownerId: "jordan", status: "waiting", waitingOn: DETAILS, waitingOnPersonId: "sam" })
  expect(followup).toMatchObject({ ownerId: "jordan", recipientId: "sam", via: "automatic" })
  expect(followup.waitingRequestId).toBeTruthy()
  completeMail(followup, saved)
  expect(followup.message!.body).toContain(DETAILS)
  await closeRail(page)
  await viewAs(page, "alex")
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  if ((page.viewportSize()?.width ?? 1280) < 1200) await expect(page.getByTestId("rail")).toBeHidden()
  await openHistory(page)
  await expect(page.getByTestId("rq-sent").locator(`[data-node="${ROOM}"]`)).toHaveCount(2)
  await page.reload()
  await closeRail(page)
  await openHistory(page)
  await expect(page.getByTestId("rq-sent")).toContainText("To Sam")
  expect((await read(page)).reminderRuntime!.deliveries).toHaveLength(2)
  await page.goto(followup.message!.taskUrl)
  const request = page.getByTestId("single-task-page")
  await expect(request).toContainText(DETAILS)
  for (const name of ["Done", "Working on it", "Stuck", "Waiting on"]) await expect(request.getByRole("button", { name, exact: true })).toHaveCount(0)
  await request.getByRole("button", { name: "Acknowledge", exact: true }).click()
  await expect(request.getByRole("button", { name: "Acknowledge", exact: true })).toBeDisabled()
  await page.reload()
  await expect(request.getByRole("button", { name: "Update provided", exact: true })).toBeVisible()
  await accessible(page)
  await screenshot(page, info, "waiting-request")
  await request.getByRole("button", { name: "Update provided", exact: true }).click()
  await expect(request).toContainText("Your update is recorded")
  const after = await read(page)
  expect(node(after)).toMatchObject({ ownerId: "jordan", status: "waiting" })
  expect(after.reminderRuntime!.waitingRequests.find(r => r.id === followup.waitingRequestId)).toMatchObject({ response: "provided", responseBy: "sam" })
  expect(after.reminderRuntime!.deliveries).toHaveLength(2)
})

test("a real storage failure keeps the waiting draft and avoids Saved until the owner retries successfully", async ({ page }) => {
  await openLegacy(page, "review_then_auto", { count: 1 })
  await activate(page)
  await viewAs(page, "jordan")
  const panel = await detail(page)
  await panel.getByRole("combobox", { name: "Task status", exact: true }).selectOption("waiting")
  await panel.getByRole("combobox", { name: "Waiting on", exact: true }).selectOption("sam")
  const text = panel.getByRole("textbox", { name: "What help or input is needed?" })
  await text.fill(DETAILS)
  await page.evaluate(key => {
    const write = Storage.prototype.setItem
    Object.defineProperty(window, "restoreReminderStorage", { configurable: true, value: () => { Storage.prototype.setItem = write } })
    Storage.prototype.setItem = function (item, value) { if (item === key) throw new DOMException("Storage unavailable", "QuotaExceededError"); return write.call(this, item, value) }
  }, KEY)
  try {
    await panel.getByRole("button", { name: "Save waiting status" }).click()
    await expect(panel.getByRole("alert")).toContainText("not saved")
    await expect(text).toHaveValue(DETAILS)
    await expect(panel.getByText("Your update is saved. Thank you.", { exact: true })).toHaveCount(0)
    expect(node(await read(page)).status).toBe("accepted")
  } finally {
    await page.evaluate(() => (window as Window & { restoreReminderStorage: () => void }).restoreReminderStorage())
  }
  await panel.getByRole("button", { name: "Save waiting status" }).click()
  await expect(panel.getByRole("status").filter({ hasText: "Your update is saved. Thank you." })).toHaveText("Your update is saved. Thank you.")
  await expect.poll(async () => node(await read(page)).status).toBe("waiting")
  expect(node(await read(page))).toMatchObject({ waitingOn: DETAILS, waitingOnPersonId: "sam" })
  expect((await read(page)).reminderRuntime!.waitingRequests).toHaveLength(1)
})
