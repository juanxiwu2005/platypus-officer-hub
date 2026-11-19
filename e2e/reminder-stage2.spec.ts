import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { savedDemo } from "./demo-contract"
import type { DemoState } from "../src/data/types"
import { applySchedule } from "../src/engine/schedule"
import { closeRail } from "./helpers"

const demo = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)

async function openMail(page: Page, waiting = false) {
  await page.goto("/#/tasks")
  const s = await savedDemo(page)
  const original = s.nodes.find(n => n.stepKey === "venue" && n.ownerId && n.status !== "done" && n.eventId)!
  const event = { ...s.events.find(e => e.id === original.eventId)!, headcount: 40 }
  const node = { ...original, title: "Reserve a room", status: waiting ? "waiting" as const : "accepted" as const,
    waitingOn: waiting ? "Please confirm our room requirements" : null, waitingOnPersonId: waiting ? "sam" : null,
    instructions: "Reserve a room for 40 attendees and record the booking confirmation.",
    completionCriteria: "The confirmed location and reservation reference are saved.",
    why: "The confirmed room lets us share the location with everyone.",
  }
  const planned = applySchedule({ ...s, nodes: s.nodes.map(n => n.id === node.id ? node : n.ownerId === node.ownerId && n.status !== "done" ? { ...n, status: "done" as const } : n), events: s.events.map(e => e.id === event.id ? event : e),
    viewerId: "alex", aiEnabled: true, org: { ...s.org, settings: { ...s.org.settings, reminderMode: "review_then_auto", matchingMode: "legacy" } },
    nudges: [], protocolLog: [], silenceCases: [], extensionRequests: [], taskAccessGrants: [], reminderRuntime: undefined })
  // Use an actual rule-engine date so the ordinary owner reminder is currently eligible.
  const due = planned.nodes.find(n => n.id === node.id)!.clubDeadline!
  const selected = { nodeId: node.id, eventName: event.name, ownerId: node.ownerId, title: node.title }
  await page.evaluate(state => localStorage.setItem("platypus.v1.demo", JSON.stringify(state)), { ...planned, today: due })
  await page.goto("/#/")
  await page.reload()
  await closeRail(page)
  await page.getByRole("button", { name: "Enable updated reminders", exact: true }).click()
  await expect.poll(async () => (await demo(page)).reminderRuntime?.version).toBe(2)
  // Concept F: the reminder is part of the recipient's email for today, opened from the Reminders page.
  const recipientId = waiting ? "sam" : node.ownerId!
  await page.locator(`[data-testid="rq-person"][data-recipient="${recipientId}"] .dg-person-head`).click()
  const panel = page.getByTestId("digest-panel")
  await expect(panel.getByTestId("digest-send-next")).toBeEnabled()
  await expect(panel.getByTestId("digest-body").getByRole("link", { name: "Open task" }).first()).toBeVisible()
  // The combined email has one "Open task" link per task; pick this task's link by its node.
  const entry = await panel.getByTestId("digest-body").getByRole("link", { name: "Open task" }).evaluateAll((links, id) => links.map(a => (a as HTMLAnchorElement).href)
    .filter(href => new URLSearchParams(new URL(href).hash.split("?")[1] ?? "").get("node") === id), node.id)
  expect(entry).toHaveLength(1)
  return { ...selected, panel, entry: entry[0], recipientId }
}

test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline test" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname), route => route.abort())
})

test("one rule-written mail opens a reusable task page: Working, reload, Done and completed read-back", async ({ page, isMobile }, info) => {
  const ai: string[] = [], errors: string[] = []
  page.on("request", r => { if (/\/api\/(?:nudge|chat|command|ask)/.test(r.url())) ai.push(r.url()) })
  page.on("pageerror", e => errors.push(e.message))
  const { panel, nodeId, eventName, ownerId } = await openMail(page)
  await expect(panel.getByTestId("digest-mail")).toContainText("Reserve a room")
  await expect(panel.getByTestId("digest-mail")).toContainText(eventName)
  await expect(panel.getByTestId("digest-body")).toContainText("Task due:")
  await expect(panel.getByTestId("digest-body")).toContainText("Thank you")
  await expect(panel.getByTestId("ai-wait")).toHaveCount(0)
  await expect(panel.getByRole("link", { name: /^(Done|Working on it|Stuck|Waiting on)$/ })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath(`mail-${isMobile ? "phone" : "desktop"}.png`), fullPage: true })
  await panel.getByTestId("digest-send-next").click()
  await expect(panel).toContainText("recorded. Demo: nothing is sent.")
  const saved = (await demo(page)).reminderRuntime!.deliveries.find(d => d.nodeId === nodeId)!
  expect(saved.message!.body).toContain("40 attendees")
  expect((await demo(page)).nudges).toEqual([])
  expect(saved.message?.recipientId).toBe(ownerId)
  expect(saved.message?.source).toBe("rules")
  expect(saved.message?.wordCount).toBeLessThanOrEqual(100)
  expect(saved.message!.body.match(/https?:\/\/\S+/g)).toEqual([saved.message!.taskUrl])
  await page.goto(saved.message!.taskUrl)
  const task = page.getByTestId("single-task-page")
  await expect(task).toBeVisible()
  await expect(task).toContainText("40 attendees")
  await expect(task).toContainText("reservation reference")
  await expect(page.getByRole("navigation", { name: "Sections" })).toHaveCount(0)
  await expect(task.getByRole("link", { name: "Open ASU space requests" })).toHaveAttribute("href", "https://eoss.asu.edu/student-unions/submit-a-space-request")
  expect((await demo(page)).nodes.find(n => n.id === nodeId)!.status).toBe("accepted")
  await task.getByRole("button", { name: "Working on it", exact: true }).click()
  await expect(task.getByTestId("single-task-status")).toHaveText("Working on it")
  expect((await demo(page)).extensionRequests).toEqual([])
  expect((await demo(page)).viewerId).toBe("alex")
  await page.reload()
  await expect(task.getByTestId("single-task-status")).toHaveText("Working on it")
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
  expect(a11y.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([])
  await page.screenshot({ path: info.outputPath(`task-${isMobile ? "phone" : "desktop"}.png`), fullPage: true })
  await task.getByRole("button", { name: "Done", exact: true }).click()
  await expect(task.getByTestId("single-task-status")).toHaveText("Done")
  await page.reload()
  await expect(task.getByTestId("single-task-status")).toHaveText("Done")
  await expect(task.getByRole("button", { name: "Working on it", exact: true })).toHaveCount(0)
  expect(ai).toEqual([])
  expect(errors).toEqual([])
})

test("the same task entry can record Waiting on and Stuck without consuming it", async ({ page }) => {
  const { entry, nodeId } = await openMail(page)
  await page.goto(entry)
  const task = page.getByTestId("single-task-page")
  await expect(task).toBeVisible()
  await task.getByRole("button", { name: "Waiting on", exact: true }).click()
  await task.getByRole("combobox", { name: "Waiting on", exact: true }).selectOption("sam")
  await task.getByRole("button", { name: /Save waiting/ }).click()
  await expect(task.getByTestId("single-task-status")).toHaveText("Waiting on")
  expect((await demo(page)).nodes.find(n => n.id === nodeId)!.waitingOnPersonId).toBe("sam")
  await page.reload()
  await expect(task).toBeVisible()
  await task.getByRole("button", { name: "Stuck", exact: true }).click()
  await expect(task.getByTestId("single-task-status")).toHaveText("Stuck")
  expect((await demo(page)).nodes.find(n => n.id === nodeId)!.waitingOnPersonId).toBeNull()
  await page.reload()
  await expect(task.getByTestId("single-task-status")).toHaveText("Stuck")
})

test("altered entries and reassignment withdraw the old recipient's action rights", async ({ page }) => {
  const { entry, nodeId } = await openMail(page)
  await page.goto(`${entry}0`)
  await expect(page.getByRole("heading", { name: "Check your task link" })).toBeVisible()
  await page.evaluate(id => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    const n = s.nodes.find((n: { id: string }) => n.id === id)
    n.ownerId = "sam"; n.ownerVersion = (n.ownerVersion ?? 0) + 1
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
  }, nodeId)
  await page.goto(entry)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Check your task link" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveCount(0)
})

test("a waiting follow-up goes to Sam and its task entry only responds to the help request", async ({ page }) => {
  const { panel, nodeId, ownerId } = await openMail(page, true)
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText("Sam Okafor")
  await expect(panel.getByTestId("digest-body")).toContainText("Reserve a room")
  await panel.getByTestId("digest-send-next").click()
  await expect(panel).toContainText("recorded. Demo: nothing is sent.")
  const saved = (await demo(page)).reminderRuntime!.deliveries.find(d => d.nodeId === nodeId)!
  expect(saved.message!.body).toContain("Please confirm our room requirements")
  expect(saved.recipientId).toBe("sam")
  expect(saved.ownerId).toBe(ownerId)
  await page.goto(saved.message!.taskUrl)
  const task = page.getByTestId("single-task-page")
  await expect(task).toBeVisible()
  for (const name of ["Done", "Working on it", "Stuck", "Waiting on"]) await expect(task.getByRole("button", { name, exact: true })).toHaveCount(0)
  await task.getByRole("button", { name: "Acknowledge" }).click()
  await expect(task.getByRole("button", { name: "Acknowledge" })).toBeDisabled()
  await page.reload()
  await expect(task.getByRole("button", { name: "Update provided" })).toBeVisible()
  await task.getByRole("button", { name: "Update provided" }).click()
  await expect(task).toContainText("Your update is recorded")
  const after = await demo(page)
  expect(after.nodes.find(n => n.id === nodeId)).toMatchObject({ status: "waiting", ownerId })
  expect(after.reminderRuntime!.waitingRequests.find(w => w.nodeId === nodeId)).toMatchObject({ response: "provided", responseBy: "sam" })
})
