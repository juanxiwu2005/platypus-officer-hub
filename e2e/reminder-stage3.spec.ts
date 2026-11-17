import { expect, test, type Page, type TestInfo } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { savedDemo } from "./demo-contract"
import { closeRail, noOverflow, viewAs } from "./helpers"
import type { DemoState, ReminderMode } from "../src/data/types"
import type { ReminderDelivery } from "../src/reminders/contracts"

const KEY = "platypus.v1.demo"
const ROOM = "reminder-s3-room", POSTER = "reminder-s3-poster", TODAY = "2027-03-31"
const DETAILS = "Please confirm the accessible entrance and projector connection"
const read = (page: Page): Promise<DemoState> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY)
const rows = (page: Page, section: string) => page.getByTestId(section).getByTestId("rq-row")
const node = (state: DemoState, id = ROOM) => state.nodes.find(n => n.id === id)!

/** Only saved input fixtures are installed. Enabling, confirming, assigning and sending use the real UI. */
async function openLegacy(page: Page, mode: ReminderMode, options: { history?: boolean; count?: number } = {}) {
  await page.goto("/#/tasks")
  await savedDemo(page)
  await page.evaluate(({ key, mode, history, count, room, poster, today }) => {
    const s: DemoState = JSON.parse(localStorage.getItem(key)!)
    const source = s.nodes.find(n => n.stepKey === "venue" && n.eventId)!
    const event = s.events.find(e => e.id === source.eventId)!
    event.name = "Speaker Night"; event.date = "2027-04-16"; event.headcount = 40; event.venue = "campus"
    s.events = [event]
    s.nodes = [
      { ...source, id: room, title: "Reserve a room", stepKey: "venue", ownerId: "jordan", instructions: "Reserve a room for 40 attendees and record the booking confirmation.", completionCriteria: "Save the confirmed room number and booking reference.", why: "A confirmed location lets everyone plan to attend." },
      { ...source, id: poster, title: "Prepare the event invitation", stepKey: "flyer", ownerId: "priya", instructions: "Prepare the invitation using the confirmed event details.", completionCriteria: "Save the invitation draft for review.", why: "Clear event details help members decide whether to join." },
    ].slice(0, count).map(n => ({ ...n, status: "accepted", ownerVersion: 0, acceptedOn: today, assignedOn: today, lastUpdate: null, completedOn: undefined, dependsOn: [], waitingOn: null, waitingOnPersonId: null, anchor: { kind: "fixed", official: null, club: today }, clubDeadlineOverride: null, timing: undefined, matching: undefined, ruleIds: [] }))
    s.today = today; s.viewerId = "alex"; s.aiEnabled = true
    s.org.settings.reminderMode = mode
    s.org.settings.matchingMode = "legacy"
    s.org.settings.maxRemindersPerTask = 2
    s.org.settings.silenceProtocol = { nudgeDays: [4, 8], presidentDay: 11, reassignDay: 13, retroDay: 16 }
    s.nudges = history ? [{ id: "before-reminder-s3", nodeId: room, channel: "email", text: "Earlier room reminder", sentBy: "alex", sentOn: "2027-03-25", response: null, via: "president" }] : []
    s.protocolLog = []; s.silenceCases = []; s.notifications = []; s.extensionRequests = []
    s.taskAccessGrants = []; s.officerGrants = []
    delete s.reminderRuntime
    localStorage.setItem(key, JSON.stringify(s))
  }, { key: KEY, mode, history: options.history ?? false, count: options.count ?? 2, room: ROOM, poster: POSTER, today: TODAY })
  await page.goto("/#/")
  await page.reload()
  await expect(page.getByTestId("reminder-plan-status")).toBeVisible()
  await closeRail(page)
  return read(page)
}

async function activate(page: Page) {
  await page.getByRole("button", { name: "Enable updated reminders", exact: true }).click()
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
  expect(mail.body).toContain("Thank you")
  expect(mail.taskUrl).toMatch(/\/#\/officer\?access=/)
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

test("an old save explicitly enables the plan without changing custom settings or history, and Details has three readable zones", async ({ page }, info) => {
  const before = await openLegacy(page, "review_then_auto", { history: true })
  expect(before.reminderRuntime).toBeUndefined()
  await expect(page.getByTestId("rq-sent")).toContainText("recipient not recorded")
  await activate(page)
  const enabled = await read(page)
  expect(enabled.org.settings).toEqual(before.org.settings)
  expect(enabled.nudges).toEqual(before.nudges)
  expect(enabled.reminderRuntime!.legacyUnresolvedNodeIds).toContain(ROOM)
  const review = page.getByTestId("rq-needs-ok").locator(`[data-node="${ROOM}"]`)
  await expect(review).toContainText("Jordan Patel")
  await review.getByRole("button", { name: "I checked · allow future reminders" }).click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.legacyUnresolvedNodeIds?.includes(ROOM) ?? false).toBe(false)
  expect((await read(page)).nudges).toEqual(before.nudges)
  const panel = await detail(page)
  await expect(panel.locator(".td-head .td-event")).toHaveText("Speaker Night")
  await expect(panel.getByRole("heading", { level: 2, name: "Reserve a room", exact: true })).toBeFocused()
  await expect(panel.getByTestId("task-due")).toHaveCount(1)
  await expect(panel.getByTestId("task-due")).toContainText("Task due")
  await expect(panel.getByTestId("task-due")).not.toContainText(/Start by|ASU|Event date/)
  const next = panel.getByRole("region", { name: "Your next step" })
  await expect(next).toContainText("40 attendees")
  await expect(next).toContainText("Save the confirmed room number and booking reference.")
  await expect(next).toContainText("A confirmed location lets everyone plan to attend.")
  const entry = next.getByRole("group", { name: "Where to submit" })
  await expect(entry.getByRole("link")).toHaveCount(1)
  await expect(entry.getByRole("link")).toHaveAttribute("href", "https://eoss.asu.edu/student-unions/submit-a-space-request")
  await expect(entry).toContainText("request entry")
  await expect(panel.getByRole("region", { name: "Reminder plan" })).toContainText("Jordan Patel")
  await expect(panel.getByTestId("why-date")).not.toHaveAttribute("open", "")
  await accessible(page, "[data-testid=task-detail]")
  await screenshot(page, info, "details-three-zones")
  await page.goto("/#/settings?reminders=1")
  await closeRail(page)
  await expect(page.getByTestId("reminder-plan-settings")).toContainText("3 days overdue")
  await page.getByText("Deadline and follow-up defaults", { exact: true }).click()
  await expect(page.getByRole("spinbutton", { name: "Legacy reminder 1 day", exact: true })).toHaveValue("4")
  await expect(page.getByRole("spinbutton", { name: "Legacy reminder 1 day", exact: true })).toBeDisabled()
  expect((await read(page)).org.settings).toEqual(before.org.settings)
})

test("Approve all persists complete unique-link snapshots, survives reload, and recognizes a same-day owner reply before reassignment", async ({ page }, info) => {
  await openLegacy(page, "review_then_auto")
  await activate(page)
  await expect(page.getByTestId("approve-all")).toHaveText("Approve all (2)")
  await page.getByTestId("approve-all").click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.deliveries.length).toBe(2)
  await expect(page.getByTestId("reminder-centre")).toContainText("2 reminders saved as a demo. Nothing was sent.")
  const saved = await read(page), deliveries = saved.reminderRuntime!.deliveries
  for (const delivery of deliveries) completeMail(delivery, saved)
  expect(new Set(deliveries.map(d => d.candidateId)).size).toBe(2)
  await expect(rows(page, "rq-sent")).toHaveCount(2)
  await page.reload()
  await expect(rows(page, "rq-sent")).toHaveCount(2)
  await expect(page.getByTestId("approve-all")).toHaveCount(0)
  expect((await read(page)).reminderRuntime!.deliveries).toEqual(deliveries)
  await screenshot(page, info, "saved-batch")
  const roomDelivery = deliveries.find(d => d.nodeId === ROOM)!
  await page.goto(roomDelivery.message!.taskUrl)
  const task = page.getByTestId("single-task-page")
  await expect(task).toBeVisible()
  await task.getByRole("button", { name: "Working on it", exact: true }).click()
  await expect(task.getByTestId("single-task-status")).toHaveText("Working on it")
  const replied = await read(page)
  expect(replied.extensionRequests).toEqual([])
  expect(replied.reminderRuntime!.updates.some(u => u.nodeId === ROOM && u.ownerReply && u.actorId === "jordan" && u.on === roomDelivery.sentOn && u.sequence > roomDelivery.sequence)).toBe(true)
  await page.goto("/#/")
  await closeRail(page)
  await expect(page.getByTestId("rq-replies").locator(`[data-node="${ROOM}"]`)).toContainText("Working on it")
  await expect(page.getByTestId("rq-no-reply").locator(`[data-node="${ROOM}"]`)).toHaveCount(0)
  const panel = await detail(page)
  await panel.getByText("Edit", { exact: true }).click()
  await panel.getByTestId("owner-select").selectOption("sam")
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
  await panel.getByRole("button", { name: "Waiting on", exact: true }).click()
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
  await expect(page.getByTestId("rq-sent").locator(`[data-node="${ROOM}"]`)).toHaveCount(2)
  await page.reload()
  await expect(page.getByTestId("rq-sent")).toContainText("Sam Okafor")
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
  await panel.getByRole("button", { name: "Waiting on", exact: true }).click()
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
  await expect(panel.getByRole("status")).toHaveText("Your update is saved. Thank you.")
  await expect.poll(async () => node(await read(page)).status).toBe("waiting")
  expect(node(await read(page))).toMatchObject({ waitingOn: DETAILS, waitingOnPersonId: "sam" })
  expect((await read(page)).reminderRuntime!.waitingRequests).toHaveLength(1)
})
