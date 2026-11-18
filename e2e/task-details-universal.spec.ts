import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFile } from "node:fs/promises"
import { seedDemo } from "../src/data/seed"
import { applySchedule } from "../src/engine/schedule"
import { createReminderRuntime } from "../src/reminders/engine"
import { savedDemo } from "./demo-contract"
import { closeRail, noOverflow, viewAs } from "./helpers"
import type { ReminderMode } from "../src/data/types"

const KEY = "platypus.v1.demo", ROOM = "task-work-room", SAP = "task-work-sap", CUSTOM = "task-work-custom"
async function seed(page: Page, viewerId = "jordan", mode: ReminderMode = "review_then_self") {
  const base = seedDemo(undefined, "v2"), source = base.nodes.find(n => n.stepKey === "venue")!, today = "2027-03-31"
  const nodes = [{ id: ROOM, title: "Reserve a room", stepKey: "venue", instructions: "Book an accessible room for 40 attendees." }, { id: SAP, title: "Submit the speaker agreement", stepKey: "sap", instructions: "Save the agreement reference and current status." }, { id: CUSTOM, title: "Confirm the community partner", stepKey: "club-custom", instructions: "Record the agreed arrangements.", externalLinks: [{ label: "Partner portal", url: "https://example.org/partner" }] }].map(extra => ({ ...source, ...extra, ownerId: "jordan", ownerVersion: 0, status: "accepted" as const, dependsOn: [], waitingOn: null, waitingOnPersonId: null, ruleIds: [], timing: undefined, anchor: { kind: "fixed" as const, official: null, club: today }, clubDeadlineOverride: today, taskWork: undefined }))
  const state = applySchedule({ ...base, today, viewerId, nodes, events: base.events.filter(e => e.id === source.eventId).map(e => ({ ...e, name: "Speaker Night", date: "2027-04-16", headcount: 40, venue: "campus" as const })), org: { ...base.org, settings: { ...base.org.settings, reminderMode: mode } }, nudges: [], protocolLog: [], notifications: [], silenceCases: [], taskAccessGrants: [], reminderRuntime: { ...createReminderRuntime(today), version: 2, mailRequiredAfter: 0 } })
  await page.addInitScript(({ key, value }) => { if (!sessionStorage.getItem("task-work-seeded")) { localStorage.setItem(key, JSON.stringify(value)); sessionStorage.setItem("task-work-seeded", "1") } }, { key: KEY, value: state })
}
async function open(page: Page, id = ROOM) { await page.goto(`/#/tasks?node=${id}`); await page.reload(); const panel = page.getByTestId("task-detail"); await expect(panel).toBeVisible(); return panel }
async function work(page: Page, id = ROOM) { return (await savedDemo(page)).nodes.find(n => n.id === id)! }
async function attach(page: Page) { await page.getByLabel("Attach files", { exact: true }).setInputFiles([{ name: "confirmation.txt", mimeType: "text/plain", buffer: Buffer.from("Fictional booking confirmation") }, { name: "layout.txt", mimeType: "text/plain", buffer: Buffer.from("Fictional room layout") }]); await expect(page.getByRole("button", { name: "Download confirmation.txt", exact: true })).toBeVisible() }

test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline task-detail verification" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname), route => route.abort())
})

test("draft and multi-file submission survive refresh, complete atomically, and are readable by the president", async ({ page }, info) => {
  await seed(page); let panel = await open(page)
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark" })
  await panel.getByLabel("Details", { exact: true }).fill("Student Union, Room 204. East entrance; accessible elevator nearby.")
  await attach(page)
  await panel.getByRole("button", { name: "Save draft", exact: true }).click()
  expect((await work(page)).status).toBe("accepted")
  await page.reload(); panel = page.getByTestId("task-detail")
  await expect(panel.getByLabel("Details", { exact: true })).toHaveValue(/Room 204/)
  await expect(panel.getByRole("button", { name: "Download layout.txt", exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath("task-details-draft.png"), fullPage: true })
  await panel.getByRole("button", { name: "Submit & mark done", exact: true }).click()
  await expect.poll(async () => (await work(page)).status).toBe("done")
  expect((await work(page)).taskWork!.submissions[0]).toMatchObject({ authorId: "jordan", details: expect.stringContaining("Room 204") })
  const downloading = page.waitForEvent("download")
  await panel.getByRole("button", { name: "Download confirmation.txt", exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe("confirmation.txt")
  expect(await readFile((await download.path())!, "utf8")).toBe("Fictional booking confirmation")
  await closeRail(page); await viewAs(page, "alex"); panel = await open(page)
  await expect(panel).toContainText("Submitted by Jordan Patel")
  await expect(panel.getByLabel("Details", { exact: true })).toHaveValue(/Room 204/)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const violations = (await new AxeBuilder({ page }).include('[data-testid="task-detail"]').analyze()).violations.filter(v => v.impact === "serious" || v.impact === "critical")
  expect(violations).toEqual([])
})

test("Edit is a separate drawer with atomic save/cancel, multiple links and an unchanged Settings template", async ({ page }, info) => {
  await seed(page, "alex"); const panel = await open(page)
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark" })
  const original = await savedDemo(page)
  await panel.getByLabel("Details", { exact: true }).fill("Unsubmitted result remains here")
  await panel.getByRole("button", { name: "Edit", exact: true }).click()
  let editor = page.getByRole("dialog", { name: "Edit task" })
  await editor.getByLabel("Task name", { exact: true }).fill("Discard this title")
  await editor.getByRole("button", { name: "Cancel", exact: true }).click()
  expect((await work(page)).title).toBe("Reserve a room")
  await panel.getByRole("button", { name: "Edit", exact: true }).click()
  editor = page.getByRole("dialog", { name: "Edit task" })
  await editor.getByLabel("Task name", { exact: true }).fill("Book the event room")
  await editor.getByLabel("Link 2 URL", { exact: true }).fill("https://example.org/booking")
  await page.screenshot({ path: info.outputPath("task-edit-drawer.png"), fullPage: true })
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
  expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  await editor.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(editor).toHaveCount(0)
  await expect(panel.getByRole("heading", { name: "Book the event room", exact: true })).toBeVisible()
  await expect(panel.getByRole("link", { name: /Mazevo reservations/ })).toHaveAttribute("href", "https://example.org/booking")
  await expect(panel.getByLabel("Details", { exact: true })).toHaveValue("Unsubmitted result remains here")
  expect((await savedDemo(page)).org.eventWorkflow).toEqual(original.org.eventWorkflow)
})

test("room, SAP and a custom workflow node use the same form and keep their work separate", async ({ page }) => {
  await seed(page)
  for (const [id, text] of [[ROOM, "Room reference 204"], [SAP, "Speaker agreement reference A-42"], [CUSTOM, "Partner confirmed the arrangements"]]) {
    const panel = await open(page, id)
    await expect(panel.getByRole("textbox", { name: "Details", exact: true })).toHaveValue("")
    await expect(panel.getByRole("textbox")).toHaveCount(1)
    await panel.getByLabel("Details", { exact: true }).fill(text)
    await panel.getByRole("button", { name: "Save draft", exact: true }).click()
    expect((await work(page, id)).taskWork!.drafts[0].details).toBe(text)
  }
  const panel = await open(page)
  await expect(panel.getByLabel("Details", { exact: true })).toHaveValue("Room reference 204")
  expect((await work(page, SAP)).taskWork!.drafts[0].details).toContain("A-42")
})

test("a failed save preserves text and attachments and can be retried without false completion", async ({ page }) => {
  await seed(page); const panel = await open(page)
  await panel.getByLabel("Details", { exact: true }).fill("Keep this location and its files")
  await attach(page)
  await page.evaluate(key => { const write = Storage.prototype.setItem; localStorage.setItem("task-work-fail", "yes"); Storage.prototype.setItem = function(k, value) { if (k === key && localStorage.getItem("task-work-fail") === "yes") throw new Error("Fictional quota failure"); write.call(this, k, value) } }, KEY)
  await panel.getByRole("button", { name: "Submit & mark done", exact: true }).click()
  await expect(panel.getByRole("alert")).toContainText("not saved")
  expect((await work(page)).status).toBe("accepted")
  await expect(panel.getByLabel("Details", { exact: true })).toHaveValue("Keep this location and its files")
  await expect(panel.getByRole("button", { name: "Download confirmation.txt", exact: true })).toBeVisible()
  await page.evaluate(() => localStorage.removeItem("task-work-fail"))
  await panel.getByRole("button", { name: "Submit & mark done", exact: true }).click()
  await expect.poll(async () => (await work(page)).status).toBe("done")
  expect((await work(page)).taskWork!.files).toHaveLength(2)
})

test("the email's single link opens the same submission form and remains readable after completion", async ({ page }) => {
  await seed(page, "alex", "review_then_auto")
  await page.goto("/#/"); await closeRail(page)
  const row = page.getByTestId("rq-row").filter({ hasText: "Reserve a room" }).first()
  await row.getByRole("button", { name: /Review/ }).click()
  const mail = page.getByTestId("nudge-panel")
  await expect(mail.getByRole("link", { name: "Open task", exact: true })).toBeVisible()
  await mail.getByRole("button", { name: "Approve · Platypus sends (demo)", exact: true }).click()
  const delivery = (await savedDemo(page)).reminderRuntime!.deliveries.find(d => d.nodeId === ROOM)!
  await page.goto(delivery.message!.taskUrl)
  const task = page.getByTestId("single-task-page")
  await expect(task.getByRole("navigation", { name: "External task links" }).getByRole("link")).toHaveCount(3)
  await task.getByLabel("Details", { exact: true }).fill("Booked Room 204 from the task email")
  await task.getByRole("button", { name: "Submit & mark done", exact: true }).click()
  await expect.poll(async () => (await work(page)).status).toBe("done")
  expect((await work(page)).taskWork!.submissions[0].authorId).toBe("jordan")
  await page.reload()
  await expect(task.getByLabel("Details", { exact: true })).toHaveValue(/Booked Room 204/)
  await expect(task.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0)
})

test("tablet editing stays open when interacting with the drawer outside the original rail", async ({ page, isMobile }) => {
  test.skip(isMobile, "The desktop project covers the 1024px tablet breakpoint.")
  await page.setViewportSize({ width: 1024, height: 900 })
  await seed(page, "alex"); const panel = await open(page)
  await panel.getByRole("button", { name: "Edit", exact: true }).click()
  const editor = page.getByRole("dialog", { name: "Edit task" })
  await editor.getByLabel("Task name", { exact: true }).fill("Tablet room booking")
  await editor.getByLabel("Link 1 label", { exact: true }).fill("Union reservations")
  await expect(editor).toBeVisible()
  await editor.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(panel.getByRole("heading", { name: "Tablet room booking", exact: true })).toBeVisible()
})
