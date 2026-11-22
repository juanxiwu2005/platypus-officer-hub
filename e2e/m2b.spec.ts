import { expect, test } from "@playwright/test"
import { ask, openDemoMenu, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import { addDays } from "../src/lib/dates"

/**
 * M2b (Juanxi): a task sentence opens the task form, never the event workflow; tasks are open to every
 * officer; the event form asks for name, date, people, food, speaker, a situation checklist and details; a new event gets a plan check.
 * The AI service is not reachable here, so these run on the app's own grammar (the fallback).
 */
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
})

test("a task sentence opens the task form; owners are tags; it creates at once with Undo", async ({ page }) => {
  await page.goto("/#/")
  const initial = await savedDemo(page)
  await ask(page, "Create an executable task: order name tags for Maya")
  const form = page.getByTestId("task-form")
  await expect(form).toBeVisible()
  await expect(page.getByTestId("plan-form")).toHaveCount(0)
  await expect(form.getByLabel("Task name")).toHaveValue("Order name tags")
  await expect(form.locator(".owner-chip")).toHaveText(["Maya Chen×"])
  // FB-5 (PLAN 8.3): one date, Due. The "Club deadline N working days earlier" checkbox is gone.
  await expect(form.getByLabel("Due", { exact: true })).toHaveValue(addDays(initial.today, initial.org.settings.taskDueDays ?? 5))
  await expect(form.getByTestId("club-deadline")).toContainText("Due")
  await expect(form.getByRole("checkbox")).toHaveCount(0)
  const owners = form.getByRole("combobox", { name: "Owners" }).or(form.getByLabel("Owners"))
  await owners.fill("Jordan, Treas")
  await owners.press("Enter")
  await owners.press("Tab")
  await expect(form.getByRole("listbox", { name: "People and roles" })).toHaveCount(0)
  await expect(form.locator(".owner-chip")).toHaveCount(3)
  await expect(form.getByRole("button", { name: "Create 2 tasks" })).toBeVisible()
  await form.getByRole("button", { name: "Create 2 tasks" }).click()
  const applied = page.getByTestId("applied-set").last()
  await expect(applied).toContainText("Add task: Order name tags")
  await page.getByTestId("undo-auto").last().click()
  await expect(applied).toContainText("Undone")
})

test("an officer can add a task without the president", async ({ page }) => {
  await page.goto("/#/")
  await openDemoMenu(page)
  await viewAs(page, "maya")
  await ask(page, "Add a task: buy painter's tape")
  const form = page.getByTestId("task-form")
  await expect(form).toContainText("No owner: it will be yours.")
  await form.getByRole("button", { name: "Create task" }).click()
  await expect(page.getByTestId("applied-set").last()).toContainText("Done")
})

test("the event form asks only what changes the plan, then the plan is checked", async ({ page }) => {
  await page.goto("/#/")
  await ask(page, "Plan a new event")
  const form = page.getByTestId("plan-form")
  await expect(form.getByLabel("Type")).toHaveCount(0)
  await expect(form.getByRole("combobox", { name: "Funding", exact: true })).toHaveCount(0)
  await expect(form.getByRole("checkbox", { name: "Need funding or reimbursement" })).toBeVisible()
  await form.getByLabel("Event name").fill("Stage Night")
  await form.getByLabel("Date").fill("2026-12-03")
  await form.getByLabel("Food", { exact: true }).selectOption("yes")
  await form.getByLabel("Details").fill("We build a small stage in the courtyard.")
  await form.getByRole("button", { name: "Continue" }).click()
  const change = page.getByTestId("change-item").last()
  await expect(change.getByLabel("Details")).toHaveValue("We build a small stage in the courtyard.")
  await change.getByRole("button", { name: "Apply this change" }).click()
  await expect(page.getByTestId("event-review")).toContainText("Plan check: Stage Night")
})

test("an officer cannot start an event unless the president allows it", async ({ page }) => {
  await page.goto("/#/")
  await openDemoMenu(page)
  await viewAs(page, "sam")
  await ask(page, "Plan a new event")
  await expect(page.getByTestId("plan-form").getByRole("button", { name: "Continue" })).toBeDisabled()
})

test("Settings: the usual task length sets the new task's due date, and the president can open events to everyone", async ({ page }) => {
  await page.goto("/#/settings")
  const settings = page.getByTestId("club-settings")
  await settings.getByText("Tasks and events", { exact: true }).click()
  await settings.getByLabel("Usual task length").selectOption("7")
  await settings.getByLabel("Every officer").check()
  await expect(settings.getByRole("status")).toContainText("Saved")
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.settings)).toMatchObject({ taskDueDays: 7, eventCreators: "everyone" })
  const configured = await savedDemo(page)
  await ask(page, "Add a task")
  await expect(page.getByTestId("task-form").getByLabel("Due", { exact: true })).toHaveValue(addDays(configured.today, 7))
  await openDemoMenu(page)
  await viewAs(page, "sam")
  await ask(page, "Plan a new event")
  await expect(page.getByTestId("plan-form").last().getByRole("button", { name: "Continue" })).toBeEnabled()
})

test("the form appears at once; the AI's later reading fills only what the person has not changed", async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(r => { release = r })
  await page.route("**/api/chat", async route => {
    await gate
    await route.fulfill({ json: { source: "ai", model: "mock", cards: [{ kind: "text", text: "Filled in what you said." }, { kind: "form", intent: "plan_event", prefill: { name: "Jared Byrne Fireside Chat", headcount: 50, food: "none", speaker: true, details: "Fireside chat with founder Jared Byrne." } }] } })
  })
  await page.goto("/#/")
  await ask(page, "I need to plan an event with Jared, December 12 6:00 PM, 50 people")
  const form = page.getByTestId("plan-form")
  await expect(form.getByTestId("ai-reading")).toBeVisible()
  await expect(form.getByLabel("Date")).toHaveValue("2026-12-12")
  await expect(form.getByTestId("finals-warning")).toContainText("R13")
  await form.getByLabel("People").fill("60")
  release()
  await expect(form.getByTestId("ai-filled")).toBeVisible()
  await expect(form.getByLabel("Event name")).toHaveValue("Jared Byrne Fireside Chat")
  await expect(form.getByLabel("People")).toHaveValue("60")
  await expect(form.getByLabel("Guest speaker or performer")).toBeChecked()
  await expect(form.getByLabel("Details")).toHaveValue(/Fireside chat with founder Jared Byrne\. Starts at 6:00 PM\./)
})

test("'move … to <date>' moves the event and checks the plan again", async ({ page }) => {
  await page.goto("/#/")
  await ask(page, "move Networking Night to Nov 20")
  const card = page.getByTestId("event-date")
  await expect(card.getByLabel("New date")).toHaveValue("2026-11-20")
  await card.getByRole("button", { name: "Move event" }).click()
  await expect(page.getByTestId("event-review").last()).toContainText("Plan check: Networking Night")
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).events.find((e: { id: string }) => e.id === "e-night").date)).toBe("2026-11-20")
})
