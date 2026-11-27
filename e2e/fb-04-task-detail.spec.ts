import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, viewAs } from "./helpers"
import { savedTask } from "./taskHelpers"
import { addDays, fmtShort } from "../src/lib/dates"
import { isBudgetControlledNode } from "../src/engine/eventBudget"
import type { DemoState, Node } from "../src/data/types"

/**
 * FB-4 (docs/feedback-fix/PLAN.md §6.2): the details an officer lands on from a reminder, with one Due.
 * Every date is read from the engine's saved output, never written here: FB-6 re-times the event template.
 */
const SHOTS = process.env.FB4_SHOTS // a folder: set it to save screenshots for a visual check

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
  await page.route("**/api/nudge/draft", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})

const demo = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
type Step = { n: Node; owner: string; first: string; other: string }
/** An officer's open event step that an ASU rule dates and Event Budget does not control, plus an officer who is neither its owner nor a lead. */
async function ruledStep(page: Page): Promise<Step> {
  await page.goto("/#/tasks")
  const s = await demo(page)
  const leads = s.roles.filter(r => r.fn === "president" || r.fn === "vice_president").map(r => r.holderId)
  const n = s.nodes.find(x => x.ownerId && !leads.includes(x.ownerId) && (x.status === "accepted" || x.status === "in_progress") && !!x.eventId && !!x.officialDeadline && !!x.clubDeadline && !!x.latestStart && !isBudgetControlledNode(x))
  expect(n, "the demo has an open ASU-dated step owned by an officer").toBeTruthy()
  const other = s.roles.find(r => r.holderId && r.holderId !== n!.ownerId && !leads.includes(r.holderId))!.holderId!
  return { n: n!, owner: n!.ownerId!, first: s.people.find(p => p.id === n!.ownerId)!.name.split(" ")[0], other }
}
async function openAs(page: Page, viewer: string, id: string) {
  await page.goto(`/#/tasks?node=${encodeURIComponent(id)}`)
  const detail = page.getByTestId("task-detail")
  // Let the linked task's side panel open first: on a phone it covers the top bar, and viewAs must know whether it is there.
  await expect(detail).toBeVisible()
  await viewAs(page, viewer)
  await expect(detail).toBeVisible()
  return detail
}
const shot = async (page: Page, name: string, project: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false }) }
const scan = async (page: Page) => (await new AxeBuilder({ page }).include("[data-testid=task-detail]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)

// The universal Task Details (docs/feedback-fix/TASK_DETAILS_UNIVERSAL_HANDOFF.md) replaced the three zones: one Due, a compact status
// menu, the requirement and one submission form. Remind moved to the reminder centre; Edit is a separate drawer; planning dates stay private.
const STATUS_OPTIONS = ["To do", "Working on it", "Stuck", "Waiting", "Need more time\u2026"]

test("the owner: one Due, one primary button, four status updates, and no private planning dates", async ({ page }, info) => {
  const { n, owner } = await ruledStep(page)
  const detail = await openAs(page, owner, n.id)
  await expect(detail.getByRole("heading", { level: 2, name: n.title })).toBeFocused()
  await expect(detail.getByTestId("task-due")).toHaveText(`Due ${fmtShort(n.clubDeadline!)}`)
  await expect(detail.locator(".btn-primary")).toHaveCount(1)
  await expect(detail.locator(".btn-primary")).toHaveText("Submit & mark done")
  await expect(detail.getByRole("combobox", { name: "Task status", exact: true }).locator("option")).toHaveText(STATUS_OPTIONS)
  await expect(detail.getByRole("button", { name: /^Remind/ })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: /Edit/ })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: "Copy details", exact: true })).toHaveCount(0)
  await expect(detail).not.toContainText(/Start by|Personal planning start|Why this date/)
  await shot(page, "owner", info.project.name)
  if (info.project.name === "mobile") expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await page.keyboard.press("Escape")
  await expect(detail).toHaveCount(0)
})

test("the president on an officer's task: Edit owner and Due through the store, and both can be put back", async ({ page }, info) => {
  const { n, owner, other } = await ruledStep(page)
  const detail = await openAs(page, "alex", n.id)
  await expect(detail.getByTestId("task-due")).toHaveText(`Due ${fmtShort(n.clubDeadline!)}`)
  await expect(detail.locator(".btn-primary")).toHaveText("Submit & mark done")
  await expect(detail.getByRole("button", { name: /^Remind/ })).toHaveCount(0)
  await expect(detail).not.toContainText(/Personal planning start|Why this date/)
  await shot(page, "president", info.project.name)
  const edit = page.getByTestId("task-edit")
  async function save(change: () => Promise<void>) {
    await detail.getByRole("button", { name: "Edit", exact: true }).click()
    await change()
    await edit.getByRole("button", { name: "Save changes", exact: true }).click()
    await expect(edit).toHaveCount(0)
  }
  await save(() => edit.getByTestId("owner-select").selectOption(other))
  await expect.poll(async () => (await savedTask(page, n.id)).ownerId).toBe(other)
  await save(() => edit.getByTestId("owner-select").selectOption(owner))
  await expect.poll(async () => (await savedTask(page, n.id)).ownerId).toBe(owner)
  const later = addDays(n.clubDeadline!, 1) // later, so no unfinished earlier step pushes it
  await save(() => edit.getByTestId("due-input").fill(later))
  await expect.poll(async () => (await savedTask(page, n.id)).clubDeadline).toBe(later)
  await expect(detail.getByTestId("task-due")).toContainText(fmtShort(later))
  await save(() => edit.getByTestId("due-input").fill(n.clubDeadline!))
  await expect.poll(async () => (await savedTask(page, n.id)).clubDeadline).toBe(n.clubDeadline)
  await expect(detail.getByTestId("task-due")).toContainText(fmtShort(n.clubDeadline!))
  await shot(page, "president-open", info.project.name)
  expect(await scan(page)).toEqual([])
  if (info.project.name === "mobile") expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("another officer: a read-only status, no buttons, no Remind and no Edit", async ({ page }, info) => {
  const { n, other } = await ruledStep(page)
  const before = await savedTask(page, n.id)
  const detail = await openAs(page, other, n.id)
  await expect(detail.locator(".task-status-label")).toBeVisible()
  await expect(detail.getByRole("combobox", { name: "Task status" })).toHaveCount(0)
  await expect(detail.getByRole("textbox")).toHaveCount(0)
  await expect(detail.locator(".btn-primary")).toHaveCount(0)
  await expect(detail.getByRole("button", { name: /^Remind/ })).toHaveCount(0)
  await expect(detail.getByRole("button", { name: /Edit/ })).toHaveCount(0)
  await shot(page, "officer", info.project.name)
  expect(await scan(page)).toEqual([])
  expect(await savedTask(page, n.id)).toEqual(before)
})

test("a budget step: Done is not offered here and Event Budget is one tap away", async ({ page }) => {
  const detail = await openAs(page, "maya", "e-night:purchaseRequest")
  await expect(detail.getByRole("button", { name: "Submit result", exact: true })).toBeVisible()
  await expect(detail.getByRole("button", { name: /mark done/i })).toHaveCount(0)
  await expect(detail).toContainText("Completion is managed in Event Budget.")
  await detail.getByRole("link", { name: "Event Budget", exact: true }).click()
  await expect(page).toHaveURL(/events\?event=e-night&view=budget/)
})

test("Events shows Flow and Budget only; Copy details lives in the event's own details, opened on purpose", async ({ page }, info) => {
  await page.goto("/#/events?event=e-night")
  await closeRail(page)
  await expect(page.getByRole("group", { name: "View" }).getByRole("button")).toHaveText(["Flow", "Budget"])
  await expect(page.getByTestId("view-list")).toHaveCount(0)
  await shot(page, "events-views", info.project.name)
  const other = (await demo(page)).events.find(e => e.id !== "e-night")
  test.skip(!other, "the demo has only one event, so there is no event switcher")
  const navButton = page.getByRole("navigation", { name: "Events" }).getByRole("button", { name: other!.name, exact: true })
  if (await navButton.isVisible()) await navButton.click()
  else await page.getByLabel("Choose an event").selectOption(other!.id)
  await expect(page.getByRole("heading", { level: 2, name: other!.name, exact: true })).toBeVisible()
  // S3: changing the event no longer opens its details by itself.
  await expect(page.getByRole("region", { name: "Event details" })).toHaveCount(0)
  await page.getByTestId("event-details-open").click()
  await expect(page.getByRole("region", { name: "Event details" }).getByRole("button", { name: /^(Copy details|Event details copied)$/ })).toBeVisible()
})
