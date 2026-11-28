import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, openAsk, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import { savedTask } from "./taskHelpers"
import { addDays } from "../src/lib/dates"
import type { DemoState } from "../src/data/types"

/**
 * FB-5 (docs/feedback-fix/PLAN.md §8): "+ New event" opens the event form in Ask at once, without AI; "+ New task"
 * names a person and one Due date. A task without an owner can never be reminded about.
 * AI is never reachable here: /api/chat is counted, and the event form must not call it.
 */
const SHOTS = process.env.FB5_SHOTS // a folder: set it to save screenshots for a visual check
const shot = async (page: Page, name: string, project: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false }) }

let chatCalls = 0
test.beforeEach(async ({ page }) => {
  chatCalls = 0
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/chat", r => { chatCalls++; return r.fulfill({ status: 503, json: {} }) })
  await page.route("**/api/event/review", r => r.fulfill({ status: 503, json: {} }))
  await page.route("**/api/nudge/draft", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})

const demo = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
/** Change the saved demo the way a later session would find it, then load it again. */
async function rewrite(page: Page, fn: (s: DemoState) => DemoState) {
  const s = fn(await savedDemo(page))
  await page.evaluate(next => localStorage.setItem("platypus.v1.demo", JSON.stringify(next)), s)
  await page.reload()
}
// A next officer named for the Treasurer handoff who has not taken the role yet (the handoff record names them, as the Handoff page does).
const withIncoming = (s: DemoState): DemoState => ({ ...s, handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, incomingId: "riley" } : h), people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", email: "riley.example@example.org", incomingFor: "r-fin" }] })

test.describe("+ New event (PLAN 8.1)", () => {
  test("the president opens the empty event form in Ask without AI, fills it in, and the event appears", async ({ page }, info) => {
    await page.goto("/#/events")
    await closeRail(page)
    const button = page.getByTestId("new-event")
    await expect(button).toBeEnabled()
    await expect(page.getByTestId("new-event-why")).toHaveCount(0)
    await shot(page, "events-head-president", info.project.name)
    await button.click()
    const rail = page.getByTestId("rail")
    await expect(page.getByTestId("tab-ask")).toHaveAttribute("aria-selected", "true")
    const form = rail.getByTestId("plan-form")
    await expect(form).toHaveCount(1)
    await expect(form.getByLabel("Event name")).toBeFocused()
    await expect(form.getByLabel("Event name")).toHaveValue("")
    await expect(form.getByLabel("Date")).toHaveValue("")
    await expect(form.getByTestId("ai-reading")).toHaveCount(0)
    if (info.project.name === "mobile") {
      // On a phone the panel opens full screen, and it can be closed again.
      const box = (await rail.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1)
    }
    await shot(page, "event-form", info.project.name)
    // A second press while the form is still open only brings focus back to it.
    if (info.project.name === "desktop") {
      await page.locator("main").click({ position: { x: 5, y: 5 } })
      await button.click()
      await expect(rail.getByTestId("plan-form")).toHaveCount(1)
      await expect(form.getByLabel("Event name")).toBeFocused()
    }
    const s = await savedDemo(page)
    const date = addDays(s.today, 40)
    await form.getByLabel("Event name").fill("Stage Night")
    await form.getByLabel("Date").fill(date)
    // Option A (2026-11-28): Create event makes the event at once and the chat shows it with Undo.
    await form.getByRole("button", { name: "Create event" }).click()
    await expect(rail.getByTestId("event-created")).toContainText("Stage Night created")
    await expect.poll(async () => (await demo(page)).events.find(e => e.name === "Stage Night")?.date).toBe(date)
    expect(chatCalls).toBe(0)
    // Everything after the form is as before: the plan check follows in Ask, and the new event opens on the Events page.
    await openAsk(page)
    await expect(page.getByTestId("event-review").last()).toContainText("Plan check: Stage Night")
    await closeRail(page)
    await expect(page.locator("#ev-title")).toHaveText("Stage Night")
  })

  test("an officer without permission sees it switched off, with the reason", async ({ page }, info) => {
    await page.goto("/#/events")
    await viewAs(page, "sam")
    await closeRail(page)
    await expect(page.getByTestId("new-event")).toBeDisabled()
    await expect(page.getByTestId("new-event-why")).toHaveText("Only the president or VP can create events.")
    await expect(page.getByTestId("new-event")).toHaveAccessibleDescription("Only the president or VP can create events.")
    await shot(page, "events-head-officer", info.project.name)
    expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  })

  test("the reason follows Settings when the president opens events to chosen officers", async ({ page }) => {
    await page.goto("/#/events")
    await rewrite(page, s => ({ ...s, org: { ...s.org, settings: { ...s.org.settings, eventCreators: "chosen", eventCreatorIds: ["maya"] } } }))
    await viewAs(page, "sam")
    await closeRail(page)
    await expect(page.getByTestId("new-event-why")).toHaveText("Only the president, VP and officers they choose can create events.")
    await viewAs(page, "maya")
    await closeRail(page)
    await expect(page.getByTestId("new-event")).toBeEnabled()
  })

  test("with no events yet, the empty state has the same button", async ({ page }) => {
    await page.goto("/#/events")
    await rewrite(page, s => ({ ...s, events: [], nodes: s.nodes.filter(n => !n.eventId), funding: [] }))
    await closeRail(page)
    await expect(page.getByText("No events yet.")).toBeVisible()
    await page.getByTestId("new-event-empty").click()
    await expect(page.getByTestId("rail").getByTestId("plan-form").getByLabel("Event name")).toBeFocused()
  })
})

test.describe("+ New task: assign a person, one Due (PLAN 8.2, 8.3)", () => {
  test("the president gives a task to Sam: it waits in Not claimed until Sam accepts", async ({ page }, info) => {
    await page.goto("/#/tasks")
    await closeRail(page)
    const s = await savedDemo(page)
    await page.getByTestId("new-task").click()
    const form = page.getByTestId("new-task-form")
    await expect(form.getByLabel("New task name")).toBeFocused()
    await expect(form.getByLabel("Assign to")).toHaveValue(s.viewerId) // "Me"
    await expect(form.getByLabel("Assign to").locator("option", { hasText: "Anyone (open)" })).toHaveCount(1)
    await expect(form.getByLabel("Due", { exact: true })).toHaveValue(addDays(s.today, s.org.settings.taskDueDays ?? 5))
    await expect(form.getByRole("checkbox")).toHaveCount(0) // one date only
    await form.getByLabel("New task name").fill("Print the sign-in sheet")
    await form.getByLabel("Assign to").selectOption({ label: "Sam Okafor" })
    await shot(page, "task-form", info.project.name)
    expect(await noOverflow(page)).toBeLessThanOrEqual(0)
    expect((await new AxeBuilder({ page }).include("[data-testid=new-task-form]").analyze()).violations).toEqual([])
    await form.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.locator(".board-notice")).toContainText("Sent to Sam. It stays in Not claimed until Sam accepts.")
    await expect(page.getByTestId("new-task-form")).toHaveCount(0)
    // 2026-11-28: a task for someone else asks once whether to email them; Not now sends nothing.
    const ask = page.getByTestId("email-ask")
    await expect(ask.getByRole("button", { name: "Send email", exact: true })).toBeFocused()
    await ask.getByRole("button", { name: "Not now", exact: true }).click()
    await expect(ask).toHaveCount(0)
    await expect(page.getByTestId("new-task")).toBeFocused()
    expect((await savedDemo(page)).taskEmails ?? []).toEqual([])
    const task = await savedTask(page, "Print the sign-in sheet")
    expect(task).toMatchObject({ ownerId: "sam", status: "unclaimed", clubDeadline: addDays(s.today, s.org.settings.taskDueDays ?? 5) })
    expect((await demo(page)).notifications.some(n => n.nodeId === task.id && n.recipientId === "sam")).toBe(true)
    // Sam sees it as Not claimed in their own task list and accepts it.
    await viewAs(page, "sam")
    await closeRail(page)
    const mine = page.getByTestId("my-tasks").getByTestId("task-card").filter({ hasText: "Print the sign-in sheet" })
    await expect(mine).toContainText("Not claimed")
    await mine.getByRole("button", { name: "Print the sign-in sheet" }).click()
    await page.getByTestId("task-detail").getByRole("button", { name: "I've got it", exact: true }).click()
    expect(await savedTask(page, task.id)).toMatchObject({ ownerId: "sam", status: "accepted" })
  })

  test("an officer's task for themselves is To do at once; they cannot post one for anyone", async ({ page }) => {
    await page.goto("/#/tasks")
    await viewAs(page, "maya")
    await closeRail(page)
    await page.getByTestId("new-task").click()
    const form = page.getByTestId("new-task-form")
    const assign = form.getByLabel("Assign to")
    await expect(assign.locator("option", { hasText: "Anyone (open)" })).toHaveCount(0)
    await expect(assign.locator("option")).toContainText(["Me", "Alex Rivera"])
    // The date can be changed; it is still the only one.
    const s = await savedDemo(page)
    const due = addDays(s.today, 9)
    await form.getByLabel("Due", { exact: true }).fill(due)
    await form.getByLabel("New task name").fill("Reconcile the receipts")
    await form.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.locator(".board-notice")).toContainText("Added to your To do.")
    expect(await savedTask(page, "Reconcile the receipts")).toMatchObject({ ownerId: "maya", status: "accepted", clubDeadline: due })
    await expect(page.getByTestId("my-tasks").getByTestId("task-card").filter({ hasText: "Reconcile the receipts" })).toContainText("To do")
  })

  test("Anyone (open) has no owner; Undo takes it back; an empty name is refused", async ({ page }) => {
    await page.goto("/#/tasks")
    await closeRail(page)
    await page.getByTestId("new-task").click()
    const form = page.getByTestId("new-task-form")
    await form.getByRole("button", { name: "Add", exact: true }).click()
    await expect(form.getByRole("alert")).toHaveText("Give the task a name.")
    await form.getByLabel("New task name").fill("Book a bigger room")
    await form.getByLabel("Assign to").selectOption({ label: "Anyone (open)" })
    await form.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.locator(".board-notice")).toContainText("Posted in Not claimed. Anyone can claim it.")
    expect(await savedTask(page, "Book a bigger room")).toMatchObject({ ownerId: null, status: "unclaimed" })
    await page.getByTestId("new-task-undo").click()
    await expect.poll(() => savedTask(page, "Book a bigger room")).toBeUndefined()
  })

  test("a club task links to an event, takes a quick due date and can email its owner (2026-11-28)", async ({ page }) => {
    await page.goto("/#/tasks")
    await closeRail(page)
    const s = await savedDemo(page)
    await page.getByTestId("new-task").click()
    const form = page.getByTestId("new-task-form")
    await form.getByLabel("New task name").fill("Print name badges")
    await form.getByLabel("Assign to").selectOption({ label: "Sam Okafor" })
    await form.getByRole("button", { name: "In 3 days", exact: true }).click()
    await expect(form.getByLabel("Due", { exact: true })).toHaveValue(addDays(s.today, 3))
    await expect(form.getByRole("button", { name: "In 3 days", exact: true })).toHaveAttribute("aria-pressed", "true")
    await expect(form.getByTestId("new-task-link-note")).toContainText("A club task.")
    await form.getByLabel("Link to an event").selectOption("e-night")
    await expect(form.getByTestId("new-task-link-note")).toContainText("goes last in Sam's Marketing branch before Networking Night")
    expect((await new AxeBuilder({ page }).include("[data-testid=new-task-form]").analyze()).violations).toEqual([])
    await form.getByRole("button", { name: "Add", exact: true }).click()
    const ask = page.getByTestId("email-ask")
    await expect(ask).toContainText("Email Sam about this task?")
    expect((await new AxeBuilder({ page }).include("[data-testid=email-ask]").analyze()).violations).toEqual([])
    await ask.getByRole("button", { name: "Send email", exact: true }).click()
    await expect(page.locator(".board-notice")).toContainText("Emailed Sam.")
    const task = await savedTask(page, "Print name badges")
    expect(task).toMatchObject({ eventId: "e-night", clubTask: true, ownerId: "sam", clubDeadline: addDays(s.today, 3), placement: { branchId: "marketing" } })
    expect((await savedDemo(page)).taskEmails).toEqual([expect.objectContaining({ nodeId: task.id, toId: "sam" })])
    // It stays under Club tasks, tagged with its event, and the type filter keeps it with the club tasks.
    await page.getByLabel("Task scope").selectOption("team")
    const row = page.getByTestId("my-tasks").getByTestId("task-card").filter({ hasText: "Print name badges" })
    await expect(row).toContainText("Networking Night")
    await page.getByLabel("Task type").selectOption("event")
    await expect(row).toHaveCount(0)
    await page.getByLabel("Task type").selectOption("club")
    await expect(row).toHaveCount(1)
  })

  test("Escape closes the form and gives focus back", async ({ page }) => {
    await page.goto("/#/tasks")
    await closeRail(page)
    await page.getByTestId("new-task").click()
    await page.getByTestId("new-task-form").getByLabel("New task name").press("Escape")
    await expect(page.getByTestId("new-task-form")).toHaveCount(0)
    await expect(page.getByTestId("new-task")).toBeFocused()
  })

  test("an incoming officer viewed as cannot create tasks or events", async ({ page }) => {
    await page.goto("/#/tasks")
    await rewrite(page, withIncoming)
    await viewAs(page, "riley")
    await closeRail(page)
    await expect(page.getByTestId("new-task")).toBeDisabled()
    await expect(page.getByTestId("new-task")).toHaveAccessibleDescription("Only current officers can add tasks.")
    await page.goto("/#/events")
    await closeRail(page)
    await expect(page.getByTestId("new-event")).toBeDisabled()
  })
})
