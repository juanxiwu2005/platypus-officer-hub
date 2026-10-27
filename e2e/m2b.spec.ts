import { expect, test } from "@playwright/test"
import { ask, openDemoMenu } from "./helpers"

/**
 * M2b (Juanxi, 2026-10-27): a task sentence opens the task form, never the event workflow; tasks are open to every
 * officer; the event form asks only name, date, people, food yes/no, speaker and details; a new event gets a plan check.
 * The AI service is not reachable here, so these run on the app's own grammar (the fallback).
 */
test("a task sentence opens the task form; owners are tags; it creates at once with Undo", async ({ page }) => {
  await page.goto("/#/")
  await ask(page, "Create an executable task: order name tags for Maya")
  const form = page.getByTestId("task-form")
  await expect(form).toBeVisible()
  await expect(page.getByTestId("plan-form")).toHaveCount(0)
  await expect(form.getByLabel("Task name")).toHaveValue("Order name tags")
  await expect(form.locator(".owner-chip")).toHaveText(["Maya Chen×"])
  await expect(form.getByLabel("Due date")).toHaveValue("2026-10-27")
  await expect(form.getByTestId("club-deadline")).toContainText("Club deadline")
  const owners = form.getByRole("combobox", { name: "Owners" }).or(form.getByLabel("Owners"))
  await owners.fill("Jordan, Treas")
  await owners.press("Enter")
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
  await page.getByTestId("view-as").selectOption("maya")
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
  await expect(form.getByLabel("Funding")).toHaveCount(0)
  await form.getByLabel("Event name").fill("Stage Night")
  await form.getByLabel("Date").fill("2026-12-03")
  await form.getByLabel("Food").selectOption("yes")
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
  await page.getByTestId("view-as").selectOption("sam")
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
  await ask(page, "Add a task")
  await expect(page.getByTestId("task-form").getByLabel("Due date")).toHaveValue("2026-10-29")
  await openDemoMenu(page)
  await page.getByTestId("view-as").selectOption("sam")
  await ask(page, "Plan a new event")
  await expect(page.getByTestId("plan-form").last().getByRole("button", { name: "Continue" })).toBeEnabled()
})
