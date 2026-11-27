import { enableUpdatedReminders } from "./reminderHelpers"
import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { seedDemo } from "../src/data/seed"
import type { DemoState, ReminderMode } from "../src/data/types"
import { applySchedule } from "../src/engine/schedule"
import { addDays } from "../src/lib/dates"
import { closeRail, noOverflow } from "./helpers"

const KEY = "platypus.v1.demo", ID = "follow-through-room"
const read = (page: Page): Promise<DemoState> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY)
async function open(page: Page, waiting = false, mode: ReminderMode = "review_then_auto", priority = false) {
  const s = seedDemo("2027-03-28", "v2"), source = s.nodes.find(n => n.id === "t-room")!
  let state = applySchedule({ ...s, viewerId: "alex", aiEnabled: false, events: [], funding: [], notifications: [], protocolLog: [], nudges: [], silenceCases: [], extensionRequests: [],
    org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode, maxRemindersPerTask: 3 } },
    nodes: Array.from({ length: priority ? 3 : 1 }, (_, i) => ({ ...source, id: i ? `${ID}-${i}` : ID, eventId: null, stepKey: null, timing: undefined,
      status: waiting ? "waiting" : "accepted", title: `Confirm room ${i + 1}`, ownerId: "jordan", ownerVersion: 0, tier: "light", estDays: 5,
      dependsOn: [], ruleIds: [], anchor: { kind: "fixed", official: null, club: "2027-04-10" }, clubDeadlineOverride: null,
      waitingOn: waiting ? "Please provide the room confirmation" : null, waitingOnPersonId: waiting ? "sam" : null })), reminderRuntime: undefined, taskAccessGrants: [] })
  state = { ...state, today: state.nodes[0].latestStart! }
  if (priority) state = applySchedule({ ...state, nodes: state.nodes.map((n, i) => i ? { ...n, anchor: { kind: "fixed", official: null, club: i === 1 ? state.today : addDays(state.today, -3) } } : n) })
  await page.goto("/#/")
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: KEY, state })
  await page.reload(); await closeRail(page)
  await enableUpdatedReminders(page)   // S2: already on the current reminder plan; this only checks it (no "Enable updated reminders" card)
  await expect.poll(async () => (await read(page)).reminderRuntime?.version).toBe(2)
  return state
}
async function simulateDate(page: Page, today: string) {
  await page.evaluate(({ key, today }) => { const state = JSON.parse(localStorage.getItem(key)!); state.today = today; localStorage.setItem(key, JSON.stringify(state)) }, { key: KEY, today })
  await page.reload(); await closeRail(page)
}
const row = (page: Page, recipientId: string) => page.locator(`[data-testid="rq-person"][data-recipient="${recipientId}"]`)
/** Concept F / S2: one person's email opens in place on the page; the row's Send records it. */
async function openEmail(page: Page, recipientId: string) {
  await row(page, recipientId).getByTestId("rq-person-toggle").click()
  await expect(row(page, recipientId).getByTestId("rq-draft-body")).toBeVisible()   // R-S0: an editable draft
}
/** The row's Send. Step 0: History's Follow up opens that row on the home page too, so there is no other send flow. */
async function approve(page: Page, count: number, recipientId: string) {
  await row(page, recipientId).getByTestId("rq-person-send").click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.deliveries.length).toBe(count)
}
async function openHistory(page: Page) {
  await closeRail(page)
  await page.getByTestId("open-history").click()
  await expect(page.getByTestId("reminder-history")).toBeVisible()
}
test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline reminder check" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname), route => route.abort())
})

test("no reply produces one actionable follow-up, then an enabled task review instead of a dead button", async ({ page }, info) => {
  const initial = await open(page)
  await openEmail(page, "jordan")
  await approve(page, 1, "jordan")
  await simulateDate(page, addDays(initial.today, 2))
  await openHistory(page)
  const noReply = page.getByTestId("rq-no-reply")
  await expect(noReply.getByRole("button", { name: "Follow up", exact: true })).toBeEnabled()
  await noReply.getByRole("button", { name: "Follow up", exact: true }).click()
  // The follow-up opens in the compose box (R-S0 §4); its rule-written text asks again for an update.
  await expect(row(page, "jordan").getByTestId("rq-draft-body")).toHaveValue(/Checking in again on this one\. Could you share a quick update\?/)
  await expect(row(page, "jordan").getByTestId("rq-person-toggle")).toBeFocused()
  await approve(page, 2, "jordan")
  expect((await read(page)).reminderRuntime!.deliveries.map(d => d.reason)).toEqual(["start", "no_reply"])
  await simulateDate(page, addDays(initial.today, 4))
  await openHistory(page)
  await expect(noReply.getByRole("button", { name: "Review task", exact: true })).toBeEnabled()
  await expect(noReply).toContainText("Next check:")
  await expect(noReply.getByRole("button", { name: "Follow up", exact: true })).toHaveCount(0)
  expect((await read(page)).reminderRuntime!.deliveries).toHaveLength(2)
  await page.screenshot({ path: info.outputPath("bounded-no-reply.png"), fullPage: true })
})

test("helper promises survive refresh, are checked on the promised day, and provision notifies the owner", async ({ page }, info) => {
  const initial = await open(page, true)
  await openEmail(page, "sam")
  await approve(page, 1, "sam")
  const first = (await read(page)).reminderRuntime!.deliveries[0]
  await page.goto(first.message!.taskUrl)
  const panel = page.getByTestId("single-task-page")
  await expect(panel).toBeVisible()
  const promised = addDays(initial.today, 2)
  await panel.getByLabel("Expected input date").fill(promised)
  await panel.getByRole("button", { name: "Acknowledge", exact: true }).click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.waitingRequests[0].expectedOn).toBe(promised)
  await page.reload()
  await expect(panel).toContainText("Input expected")
  await expect(panel.getByRole("button", { name: "Acknowledge", exact: true })).toBeDisabled()
  await expect(panel.getByRole("combobox", { name: "Task status" })).toHaveCount(0)
  const accessibility = await new AxeBuilder({ page }).include("[data-testid=single-task-page]").analyze()
  expect(accessibility.violations.filter(v => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await page.screenshot({ path: info.outputPath("helper-promise.png"), fullPage: true })
  await simulateDate(page, promised)
  await page.goto("/#/")
  // The task link opened Plan with its side panel; on a phone leaving Plan closes that panel by itself (e2e/tasks.spec.ts,
  // tampered entries). Wait for it rather than racing it: clicking "Hide side panel" while it closes waits on a detached button.
  if (info.project.name === "mobile") await expect(page.getByTestId("rail")).toBeHidden()
  await closeRail(page)
  await openEmail(page, "sam")
  await expect(row(page, "sam").getByTestId("rq-draft-body")).toHaveValue(/is still waiting on your input, expected by/)
  await approve(page, 2, "sam")
  expect((await read(page)).reminderRuntime!.deliveries[1].reason).toBe("waiting_followup")
  await page.goto(first.message!.taskUrl)
  await panel.getByRole("button", { name: "Update provided", exact: true }).click()
  await expect(panel).toContainText("has been notified")
  const saved = await read(page)
  expect(saved.nodes[0]).toMatchObject({ status: "waiting", ownerId: "jordan" })
  expect(saved.notifications.filter(n => n.id.startsWith("waiting-provided:")).map(n => n.recipientId)).toEqual(["jordan"])
  await page.reload()
  await expect(panel).toContainText("Update provided")
})

test("automatic mode puts one person's overdue, due and start tasks into one email, in that order, with no limit left over", async ({ page }) => {
  await open(page, false, "auto_email", true)
  await expect.poll(async () => (await read(page)).reminderRuntime!.deliveries.length).toBe(3)
  const saved = await read(page)
  expect(saved.reminderRuntime!.deliveries.map(d => d.reason)).toEqual(["overdue", "due", "start"])
  expect(saved.reminderRuntime!.deliveries.every(d => !!d.message?.checked)).toBe(true)
  expect(saved.reminderRuntime!.digests).toHaveLength(1)
  expect(saved.reminderRuntime!.digests![0].nodeIds).toEqual(saved.reminderRuntime!.deliveries.map(d => d.nodeId))
  await page.reload()
  await closeRail(page)
  await expect(page.locator('[data-testid="rq-person"][data-recipient="jordan"]')).toHaveAttribute("data-state", "sent")
  await expect(page.getByTestId("rq-fix")).toHaveCount(0)
  expect((await read(page)).reminderRuntime!.deliveries).toHaveLength(3)
})
