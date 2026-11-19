import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"
import { clubAgendaEntryFixture, planEntryFixture, PLAN_EVENT, PLAN_OTHER, PLAN_ROOM } from "../src/test/planEntryFixture"
import { reducer } from "../src/data/store"
import { seedDemo } from "../src/data/seed"
import { makeTaskAccessGrant, taskAccessToken } from "../src/reminders/taskAccess"
import { planTaskPath } from "../src/reminders/planEntry"
import { savedDemo } from "./demo-contract"
import { noOverflow } from "./helpers"

const KEY = "platypus.v1.demo"
async function seed(page: Page, viewerId = "alex", waiting = false, club = false, selectedTask?: string) {
  let state = club ? clubAgendaEntryFixture() : planEntryFixture()
  const target = selectedTask ?? (club ? "t-agenda" : PLAN_ROOM)
  if (club || selectedTask) state = { ...state,
    events: state.events.map(event => event.id === "plan-other-event" ? { ...event, name: "Networking Night" } : event),
    nodes: state.nodes.map(node => node.id === "plan-other-event-task" ? { ...node, title: "Moderator Lead Staffing", stepKey: "moderator-staffing", instructions: "Confirm the moderator lead and staffing plan.", externalLinks: [] } : node),
  }
  if (waiting) {
    state = reducer({ ...state, viewerId: "jordan" }, { type: "replyTask", nodeId: PLAN_ROOM, reply: "waiting", input: { waitingOnPersonId: "sam", waitingOn: "Please confirm the event requirements" } })
    state = { ...state, viewerId: "alex" }
  }
  const request = waiting ? state.reminderRuntime!.waitingRequests.find(item => !item.closedOn) : undefined
  const grant = await makeTaskAccessGrant(state, target, request?.id)
  state = { ...reducer(state, { type: "issueTaskAccessGrant", grant }), viewerId }
  await page.addInitScript(({ state, key }) => {
    if (!sessionStorage.getItem("plan-entry-seeded")) {
      localStorage.setItem(key, JSON.stringify(state)); sessionStorage.setItem("plan-entry-seeded", "yes")
      localStorage.setItem("platypus.v1.eventsView", "list"); localStorage.setItem("platypus.v1.railOpen", "0")
    }
  }, { state, key: KEY })
  return { token: taskAccessToken(grant), path: `/#${planTaskPath(state.nodes.find(node => node.id === target)?.eventId, target, taskAccessToken(grant))}` }
}
const panel = (page: Page) => page.getByTestId("rail")
const task = (page: Page) => page.getByTestId("task-detail")
async function seeRoom(page: Page) { await expect(task(page).getByRole("heading", { name: "Reserve a room", exact: true })).toBeVisible(); await expect(task(page).getByLabel("Details", { exact: true })).toBeEnabled() }
async function seeOther(page: Page) {
  await expect(task(page).getByRole("heading", { name: "Confirm event requirements", exact: true })).toBeVisible()
  await expect(task(page)).toContainText("40 attendees. Accessible room. Projector required.")
  await expect(task(page)).not.toContainText("PRIVATE unsubmitted notes")
  await expect(task(page).getByRole("textbox")).toHaveCount(0)
  await expect(task(page).getByRole("combobox", { name: "Task status" })).toHaveCount(0)
  await expect(task(page).getByRole("button", { name: /Edit|Add files|Submit/ })).toHaveCount(0)
}
test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline Plan entry verification" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname), route => route.abort())
})

test("a newly prepared email opens the actual event Plan and keeps the scoped actor after node navigation", async ({ page }, info) => {
  await seed(page)
  await page.goto("/#/")
  const row = page.getByTestId("rq-row").filter({ hasText: "Reserve a room" }).first()
  await row.getByRole("button", { name: /Review/ }).click()
  const composer = page.getByTestId("nudge-panel")
  const link = await composer.getByRole("link", { name: "Open task", exact: true }).getAttribute("href")
  expect(link).toContain(`/#/events?event=${PLAN_EVENT}&node=${PLAN_ROOM}&access=`)
  await composer.getByRole("button", { name: "Approve · Platypus sends (demo)", exact: true }).click()
  await page.goto(link!); await seeRoom(page)
  await expect(page.getByTestId("flow-chart")).toBeAttached()
  await expect(page.getByTestId("view-flow")).toHaveAttribute("aria-pressed", "true")
  expect((await savedDemo(page)).viewerId).toBe("alex")
  expect((await savedDemo(page)).nodes.find(node => node.id === PLAN_ROOM)?.status).toBe("accepted")
  await task(page).getByLabel("Details", { exact: true }).fill("Student Union Room 204; checking availability")
  await task(page).getByLabel("Attach files", { exact: true }).setInputFiles({ name: "booking.txt", mimeType: "text/plain", buffer: Buffer.from("Fictional room booking draft") })
  await expect(task(page).getByRole("button", { name: "Download booking.txt" })).toBeVisible()
  await expect(task(page).getByTestId("task-autosave-status")).toHaveText("Draft saved automatically.")
  await page.reload(); await seeRoom(page)
  await expect(task(page).getByLabel("Details", { exact: true })).toHaveValue(/Room 204/)
  await panel(page).getByLabel("View task in this event").selectOption(PLAN_OTHER); await seeOther(page)
  const download = page.waitForEvent("download")
  await task(page).getByRole("button", { name: "Download requirements.txt" }).click()
  expect(await readFile((await (await download).path())!, "utf8")).toBe("hello")
  await page.goBack(); await seeRoom(page)
  await page.goForward(); await seeOther(page)
  await panel(page).getByRole("link", { name: /Reserve a room/ }).click(); await seeRoom(page)
  await expect(task(page).getByLabel("Details", { exact: true })).toHaveValue(/Room 204/)
  await expect(task(page).getByRole("button", { name: "Download booking.txt" })).toBeVisible()
  await page.screenshot({ path: info.outputPath("email-in-real-plan.png"), fullPage: !info.project.name.includes("mobile") })
  const violations = (await new AxeBuilder({ page }).include('[data-testid="rail"]').analyze()).violations.filter(item => item.impact === "serious" || item.impact === "critical")
  expect(violations).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  await task(page).getByRole("button", { name: "Submit & mark done" }).click()
  await expect.poll(async () => (await savedDemo(page)).nodes.find(node => node.id === PLAN_ROOM)?.status).toBe("done")
  const state = await savedDemo(page)
  expect(state.viewerId).toBe("alex")
  expect(state.nodes.find(node => node.id === PLAN_ROOM)?.taskWork?.submissions[0].authorId).toBe("jordan")
  expect(state.nodes.find(node => node.id === PLAN_OTHER)?.taskWork?.drafts[0].details).toBe("PRIVATE unsubmitted notes")
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  await expect(task(page)).toHaveCount(0)
  if (info.project.name.includes("mobile")) await expect(panel(page)).toBeHidden()
})

test("members can switch actual workflow dots and return without losing an immediately edited draft", async ({ page }, info) => {
  const { path } = await seed(page, "jordan")
  await page.goto(path); await seeRoom(page)
  await task(page).getByLabel("Details", { exact: true }).fill("Keep this immediate room update")
  await panel(page).getByRole("button", { name: "← Back to Plan" }).click()
  await expect(panel(page)).toBeHidden()
  await page.getByTestId("flow-node-club-requirements").click()
  await seeOther(page)
  await page.screenshot({ path: info.outputPath("teammate-submission-in-plan.png"), fullPage: !info.project.name.includes("mobile") })
  await panel(page).getByLabel("View task in this event").selectOption(PLAN_ROOM); await seeRoom(page)
  await expect(task(page).getByLabel("Details", { exact: true })).toHaveValue("Keep this immediate room update")
  await expect(page.locator('.m-node.is-selected .m-dot')).toHaveCount(1)
  await panel(page).getByRole("button", { name: "Close details", exact: true }).click()
  await expect(page).not.toHaveURL(/node=|access=|from=/)
  await expect(task(page)).toHaveCount(0)
  await page.reload(); await expect(task(page)).toHaveCount(0)
})

test("a direct task bookmark restores the selected event and Details despite saved List and hidden-panel preferences", async ({ page }) => {
  await seed(page, "jordan")
  await page.goto(`/#${planTaskPath(PLAN_EVENT, PLAN_ROOM)}`); await seeRoom(page)
  await expect(page.getByTestId("view-flow")).toHaveAttribute("aria-pressed", "true")
  await page.reload(); await seeRoom(page)
  await panel(page).getByLabel("View task in this event").selectOption(PLAN_OTHER); await seeOther(page)
  await page.reload(); await seeOther(page)
  await page.goBack(); await seeRoom(page)
})

test("legacy email links hand off to Plan and a reassigned link cannot open another task", async ({ page }) => {
  const { token } = await seed(page)
  await page.goto(`/#/officer?access=${encodeURIComponent(token)}`); await seeRoom(page)
  await expect(page).toHaveURL(/#\/events\?event=plan-speaker&node=plan-room/)
  await page.evaluate(({ key, id }) => { const state = JSON.parse(localStorage.getItem(key)!); const node = state.nodes.find((n: { id: string }) => n.id === id); node.ownerId = "sam"; node.ownerVersion++; localStorage.setItem(key, JSON.stringify(state)) }, { key: KEY, id: PLAN_ROOM })
  await page.reload()
  await expect(page.getByRole("heading", { name: "Check your task link" })).toBeVisible()
  await expect(task(page)).toHaveCount(0)
  await expect(page.getByTestId("flow-chart")).toHaveCount(0)
})

test("wrong event/task targets and forged origins fail without falling back to another activity", async ({ page }) => {
  const { token } = await seed(page)
  for (const path of [planTaskPath("plan-other-event", "plan-other-event-task", token), planTaskPath(PLAN_EVENT, PLAN_ROOM, token, PLAN_OTHER), planTaskPath(PLAN_EVENT, "missing"), planTaskPath(PLAN_EVENT, PLAN_ROOM, token.slice(0, -1) + (token.endsWith("0") ? "1" : "0"))]) {
    await page.goto(`/#${path}`)
    await expect(page.getByRole("heading", { name: "Check your task link" })).toBeVisible()
    await expect(task(page)).toHaveCount(0)
    await expect(page.getByTestId("flow-chart")).toHaveCount(0)
  }
})

test("waiting recipients retain only their help actions while browsing shared event context", async ({ page }) => {
  const { path } = await seed(page, "alex", true)
  await page.goto(path)
  await expect(panel(page).getByRole("heading", { name: "Your help is requested" })).toBeVisible()
  await expect(panel(page).getByRole("combobox", { name: "Task status" })).toHaveCount(0)
  await panel(page).getByLabel("View task in this event").selectOption(PLAN_OTHER); await seeOther(page)
  await panel(page).getByRole("link", { name: /Reserve a room/ }).click()
  await panel(page).getByRole("button", { name: "Update provided", exact: true }).click()
  await expect(panel(page)).toContainText("Your update is saved. Thank you.")
  const state = await savedDemo(page)
  expect(state.nodes.find(node => node.id === PLAN_ROOM)?.ownerId).toBe("jordan")
  expect(state.nodes.find(node => node.id === PLAN_ROOM)?.status).toBe("waiting")
  expect(state.reminderRuntime!.waitingRequests[0]).toMatchObject({ responseBy: "sam", response: "provided" })
})


test("the reported agenda legacy link opens Events beside the original task without assigning an activity", async ({ page }, info) => {
  const { token } = await seed(page, "priya", false, true)
  await page.goto(`/#/officer?access=${encodeURIComponent(token)}`)
  await expect(task(page).getByRole("heading", { name: "Draft the meeting agenda", exact: true })).toBeVisible()
  await expect(page).toHaveURL(/#\/events\?node=t-agenda&access=/)
  await expect(page.locator("main.single-task")).toHaveCount(0)
  await expect(page.locator("nav.sidenav")).toBeAttached()
  await expect(page.getByTestId("flow-chart")).toBeAttached()
  await expect(page.getByTestId("task-board")).toHaveCount(0)
  await expect(page.getByTestId("task-detail")).toContainText("Club task")
  expect((await savedDemo(page)).nodes.find(n => n.id === "t-agenda")?.eventId).toBeNull()
  await task(page).getByLabel("Details", { exact: true }).fill("Agenda: introductions and room planning")
  await task(page).getByLabel("Attach files").setInputFiles({ name: "agenda.txt", mimeType: "text/plain", buffer: Buffer.from("Fictional agenda attachment") })
  await expect(task(page).getByRole("button", { name: "Download agenda.txt" })).toBeVisible()
  await panel(page).getByLabel("View task", { exact: true }).selectOption(PLAN_OTHER)
  await expect(task(page).getByRole("heading", { name: "Prepare meeting materials" })).toBeVisible()
  await expect(task(page)).toContainText("40 attendees. Accessible room. Projector required.")
  await expect(task(page)).not.toContainText("PRIVATE unsubmitted notes")
  await expect(task(page).getByRole("button", { name: /Edit|Submit|Add files/ })).toHaveCount(0)
  await page.goBack()
  await expect(task(page).getByLabel("Details", { exact: true })).toHaveValue("Agenda: introductions and room planning")
  await page.reload()
  await expect(task(page).getByRole("button", { name: "Download agenda.txt" })).toBeVisible()
  await page.screenshot({ path: info.outputPath("club-agenda-in-plan.png"), fullPage: !info.project.name.includes("mobile") })
  expect((await new AxeBuilder({ page }).include('[data-testid="rail"]').analyze()).violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
  await task(page).getByRole("button", { name: "Submit & mark done" }).click()
  await expect.poll(async () => (await savedDemo(page)).nodes.find(n => n.id === "t-agenda")?.status).toBe("done")
  const agenda = (await savedDemo(page)).nodes.find(n => n.id === "t-agenda")!
  expect(agenda.eventId).toBeNull()
  expect(agenda.taskWork!.submissions[0].authorId).toBe("priya")
})

test("club mail opens the last viewed event, supports graph browsing and leaves My tasks as the normal default", async ({ page, isMobile }) => {
  await seed(page, "alex", false, true)
  await page.goto("/#/events?event=plan-other-event")
  await expect(page.getByRole("heading", { name: "Networking Night", exact: true })).toBeVisible()
  await page.goto("/#/")
  const row = page.getByTestId("rq-row").filter({ hasText: "Draft the meeting agenda" }).first()
  await row.getByRole("button", { name: /Review/ }).click()
  const url = await page.getByTestId("nudge-panel").getByRole("link", { name: "Open task", exact: true }).getAttribute("href")
  expect(url).toContain("/#/events?node=t-agenda&access=")
  await page.goto(url!)
  await expect(task(page).getByRole("heading", { name: "Draft the meeting agenda" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Networking Night", exact: true })).toBeAttached()
  await expect(page.getByTestId("task-board")).toHaveCount(0)
  await expect(page).toHaveURL(/event=plan-other-event/)
  await panel(page).getByRole("button", { name: "← Back to Plan" }).click()
  await page.getByTestId("flow-node-moderator-staffing").click()
  await expect(task(page).getByRole("heading", { name: "Moderator Lead Staffing" })).toBeVisible()
  await expect(task(page).getByRole("textbox")).toHaveCount(0)
  await panel(page).getByRole("button", { name: "← Back to Plan" }).click()
  if (isMobile) await page.getByLabel("Choose an event", { exact: true }).selectOption(PLAN_EVENT)
  else await page.getByRole("button", { name: "Speaker Night", exact: true }).click()
  await expect(task(page).getByRole("heading", { name: "Draft the meeting agenda" })).toBeVisible()
  await page.goBack()
  await expect(task(page).getByRole("heading", { name: "Moderator Lead Staffing" })).toBeVisible()
  await expect(page).toHaveURL(/event=plan-other-event/)
  await page.goForward()
  await expect(task(page).getByRole("heading", { name: "Draft the meeting agenda" })).toBeVisible()
  await panel(page).getByRole("button", { name: "← Back to Plan" }).click()
  await page.getByTestId("flow-node-club-requirements").click()
  await expect(task(page)).toContainText("40 attendees. Accessible room. Projector required.")
  await expect(task(page)).not.toContainText("PRIVATE unsubmitted notes")
  await panel(page).getByRole("link", { name: /Draft the meeting agenda/ }).click()
  await expect(task(page).getByLabel("Task status")).toBeVisible()
  expect((await savedDemo(page)).nodes.find(node => node.id === "t-agenda")?.eventId).toBeNull()
  await page.goto("/#/tasks")
  await expect(page.getByLabel("Task scope")).toHaveValue("mine")
  expect((await savedDemo(page)).viewerId).toBe("alex")
})

test("Club-task Plan rejects an invalid or reassigned original grant without opening another task", async ({ page }) => {
  const { path } = await seed(page, "alex", false, true)
  await page.goto(path)
  await expect(task(page).getByRole("heading", { name: "Draft the meeting agenda" })).toBeVisible()
  await page.evaluate(key => { const state = JSON.parse(localStorage.getItem(key)!); const n = state.nodes.find((item: {id: string}) => item.id === "t-agenda"); n.ownerId = "sam"; n.ownerVersion++; localStorage.setItem(key, JSON.stringify(state)) }, KEY)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Check your task link" })).toBeVisible()
  await expect(task(page)).toHaveCount(0)
})


test("an assigned Moderator email always opens its real Networking Night flow rather than the task board", async ({ page }, info) => {
  const { token } = await seed(page, "alex", false, false, "plan-other-event-task")
  await page.goto(`/#/events?event=${PLAN_EVENT}`)
  await expect(page.getByRole("heading", { name: "Speaker Night", exact: true })).toBeVisible()
  await page.goto(`/#/officer?access=${encodeURIComponent(token)}`)
  await expect(task(page).getByRole("heading", { name: "Moderator Lead Staffing" })).toBeVisible()
  await expect(page).toHaveURL(/#\/events\?event=plan-other-event&node=plan-other-event-task/)
  await expect(page.getByRole("heading", { name: "Networking Night", exact: true })).toBeAttached()
  await expect(page.getByTestId("flow-chart")).toBeAttached()
  await expect(page.locator('.m-node.is-selected .m-dot')).toHaveCount(1)
  await expect(page.getByTestId("task-board")).toHaveCount(0)
  await expect(page.getByTestId("view-flow")).toHaveAttribute("aria-pressed", "true")
  await page.screenshot({ path: info.outputPath("moderator-event-entry.png"), fullPage: !info.project.name.includes("mobile") })
  // A Tasks link saved by the previous version must also leave the board automatically.
  await page.goto(`/#/tasks?node=plan-other-event-task&access=${encodeURIComponent(token)}`)
  await expect(task(page).getByRole("heading", { name: "Moderator Lead Staffing" })).toBeVisible()
  await expect(page).toHaveURL(/#\/events\?event=plan-other-event/)
})


test("the full seeded Networking Night opens its real selected node and shared room result from a legacy email", async ({ page }, info) => {
  const base = seedDemo(undefined, "v2")
  const moderator = base.nodes.find(node => node.eventId === "e-night" && node.stepKey === "moderator")!
  const room = base.nodes.find(node => node.eventId === "e-night" && node.stepKey === "venue")!
  const grant = await makeTaskAccessGrant(base, moderator.id)
  const state = reducer(base, { type: "issueTaskAccessGrant", grant })
  await page.addInitScript(({ state, key }) => { localStorage.setItem(key, JSON.stringify(state)); localStorage.setItem("platypus.v1.eventsView", "list"); localStorage.setItem("platypus.v1.railOpen", "0") }, { state, key: KEY })
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(`/#/officer?access=${encodeURIComponent(taskAccessToken(grant))}`)
  await expect(task(page).getByRole("heading", { name: moderator.title, exact: true })).toBeVisible()
  await expect(page).toHaveURL(/#\/events\?event=e-night/)
  await expect(page.getByRole("heading", { name: "Networking Night", exact: true })).toBeAttached()
  await expect(page.getByTestId("flow-chart")).toBeAttached()
  await expect(page.locator('[data-testid^="flow-node-"]')).toHaveCount(base.nodes.filter(node => node.eventId === "e-night").length)
  await expect(page.locator(".m-node.is-selected .m-dot")).toHaveCount(1)
  await expect(page.getByTestId("task-board")).toHaveCount(0)
  await page.screenshot({ path: info.outputPath("networking-real-seed.png"), fullPage: !info.project.name.includes("mobile") })
  await panel(page).getByRole("button", { name: "← Back to Plan" }).click()
  await page.getByTestId("flow-node-venue").click()
  await expect(task(page).getByRole("heading", { name: room.title, exact: true })).toBeVisible()
  await expect(task(page).getByRole("combobox", { name: "Task status" })).toHaveCount(0)
  await panel(page).getByRole("link", { name: moderator.title }).click()
  await expect(task(page).getByRole("heading", { name: moderator.title, exact: true })).toBeVisible()
  expect((await savedDemo(page)).viewerId).toBe(state.viewerId)
  expect(errors).toEqual([])
})
