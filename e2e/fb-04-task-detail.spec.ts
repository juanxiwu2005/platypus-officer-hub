import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, viewAs } from "./helpers"
import { savedTask } from "./taskHelpers"
import { addDays, fmtShort } from "../src/lib/dates"
import { isBudgetControlledNode } from "../src/engine/eventBudget"
import type { DemoState, Node } from "../src/data/types"

/**
 * FB-4 (docs/feedback-fix/PLAN.md §6.2): the details an officer lands on from a reminder, in three zones, with one Due.
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
  await viewAs(page, viewer)
  const detail = page.getByTestId("task-detail")
  await expect(detail).toBeVisible()
  return detail
}
const shot = async (page: Page, name: string, project: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false }) }
const scan = async (page: Page) => (await new AxeBuilder({ page }).include("[data-testid=task-detail]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(", ")}`)

test("the owner: one Due, one primary button, the small replies, and the dates under Why this date", async ({ page }, info) => {
  const { n, owner } = await ruledStep(page)
  const detail = await openAs(page, owner, n.id)
  await expect(detail.getByRole("heading", { level: 2, name: n.title })).toBeFocused()
  await expect(detail.getByTestId("task-due")).toContainText(`Due ${fmtShort(n.clubDeadline!)}`)
  await expect(detail.locator(".td-head")).not.toContainText(/Start by|Club deadline|ASU|Due date/)
  const next = detail.getByRole("region", { name: "Your next step" })
  await expect(next.locator(".btn-primary")).toHaveCount(1)
  await expect(next.locator(".btn-primary")).toHaveText("Mark done")
  await expect(next.getByRole("group", { name: "Update task status" }).getByRole("button")).toHaveText(["Waiting on…", "Need help", "Need more time"])
  await expect(detail.getByRole("button", { name: /^Remind/ })).toHaveCount(0)
  await expect(detail.getByTestId("task-edit")).toHaveCount(0)
  await expect(detail.getByText("Copy All Event Details")).toHaveCount(0)
  await shot(page, "owner", info.project.name)
  await detail.getByText("Why this date", { exact: true }).click()
  await expect(detail.getByTestId("asu-sentence")).toContainText(`ASU needs this by ${fmtShort(n.officialDeadline!)}.`)
  await expect(detail.getByTestId("why-date")).toContainText(`Reminder goes out ${fmtShort(n.latestStart!)}.`)
  if (info.project.name === "mobile") expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await page.keyboard.press("Escape")
  await expect(detail).toHaveCount(0)
})

test("the president on an officer's task: Remind <first name>, Edit owner and Due through the store, and both can be put back", async ({ page }, info) => {
  const { n, owner, first, other } = await ruledStep(page)
  const detail = await openAs(page, "alex", n.id)
  await expect(detail.getByRole("button", { name: `Remind ${first}`, exact: true })).toBeVisible()
  await expect(detail.getByRole("region", { name: "Your next step" }).locator(".btn-primary")).toHaveText("Mark done")
  await shot(page, "president", info.project.name)
  await detail.getByText("Why this date", { exact: true }).click()
  await expect(detail.getByTestId("why-date")).toContainText("private planning preferences")
  await expect(detail.getByTestId("why-date")).not.toContainText(`Reminder goes out ${fmtShort(n.latestStart!)}`)
  await detail.getByText("Edit", { exact: true }).click()
  const edit = detail.getByTestId("task-edit")
  await edit.getByTestId("owner-select").selectOption(other)
  await expect.poll(async () => (await savedTask(page, n.id)).ownerId).toBe(other)
  await edit.getByTestId("owner-select").selectOption(owner)
  await expect.poll(async () => (await savedTask(page, n.id)).ownerId).toBe(owner)
  const later = addDays(n.clubDeadline!, 1) // later, so no unfinished earlier step pushes it
  await edit.getByTestId("due-input").fill(later)
  await expect.poll(async () => (await savedTask(page, n.id)).clubDeadline).toBe(later)
  await expect(detail.getByTestId("task-due")).toContainText(`Due ${fmtShort(later)}`)
  await edit.getByRole("button", { name: /^Use recommended \(/ }).click()
  await expect.poll(async () => (await savedTask(page, n.id)).clubDeadline).toBe(n.clubDeadline)
  await expect(detail.getByTestId("task-due")).toContainText(`Due ${fmtShort(n.clubDeadline!)}`)
  await detail.getByText("People", { exact: true }).click()
  await detail.getByText("Sources", { exact: true }).click()
  await shot(page, "president-open", info.project.name)
  expect(await scan(page)).toEqual([])
  if (info.project.name === "mobile") expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("another officer: the existing sentence, no buttons, no Remind and no Edit", async ({ page }, info) => {
  const { n, other } = await ruledStep(page)
  const before = await savedTask(page, n.id)
  const detail = await openAs(page, other, n.id)
  const next = detail.getByRole("region", { name: "Your next step" })
  await expect(next).toContainText("Only the owner or president can update this task.")
  await expect(next.locator(".btn-primary")).toHaveCount(0)
  await expect(detail.getByRole("button", { name: /^Remind/ })).toHaveCount(0)
  await expect(detail.getByTestId("task-edit")).toHaveCount(0)
  await shot(page, "officer", info.project.name)
  expect(await scan(page)).toEqual([])
  expect(await savedTask(page, n.id)).toEqual(before)
})

test("a budget step: Mark done is disabled and Event Budget is one tap away", async ({ page }) => {
  const detail = await openAs(page, "maya", "e-night:purchaseRequest")
  const next = detail.getByRole("region", { name: "Your next step" })
  await expect(next.getByRole("button", { name: "Mark done", exact: true })).toBeDisabled()
  await expect(next).toContainText("Complete this step in Event Budget.")
  await next.getByRole("button", { name: "Open Event Budget", exact: true }).click()
  await expect(page).toHaveURL(/events\?event=e-night&view=budget/)
})

test("Events List has four columns, and Copy All Event Details lives in the event's own details", async ({ page }, info) => {
  await page.goto("/#/events?event=e-night")
  await closeRail(page)
  await page.getByTestId("view-list").click()
  await expect(page.getByTestId("event-list").locator("thead th")).toHaveText(["Step", "Owner", "Status", "Due"])
  await shot(page, "events-list", info.project.name)
  const other = (await demo(page)).events.find(e => e.id !== "e-night")
  test.skip(!other, "the demo has only one event, so there is no event switcher")
  const navButton = page.getByRole("navigation", { name: "Events" }).getByRole("button", { name: other!.name, exact: true })
  if (await navButton.isVisible()) await navButton.click()
  else await page.getByLabel("Choose an event").selectOption(other!.id)
  await expect(page.getByRole("region", { name: "Event details" }).getByRole("button", { name: /Copy All Event Details|Event details copied/ })).toBeVisible()
})
