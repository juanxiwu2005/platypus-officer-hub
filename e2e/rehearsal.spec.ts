import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { ask, closeRail, viewAs } from "./helpers"
import { createUnclaimedTask, savedTask } from "./taskHelpers"

// S9 release rehearsals: what a participant does from a clean browser to an exported file, and the keyboard-only path.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
})

test("participant path: clean browser → six-step setup → task → event → rule question → export; nothing blank, every action logged in order", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", e => errors.push(String(e)))
  // Establish the clean browser before the Provider reads its first snapshot; deleting a mounted tab's
  // business key is now correctly treated as an external storage conflict, not a new empty workspace.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("rehearsal-clean-browser")) {
      localStorage.clear()
      sessionStorage.setItem("rehearsal-clean-browser", "1")
    }
  })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  await step.getByLabel("Club name", { exact: true }).fill("Fictional Rehearsal Club")
  for (let i = 0; i < 5; i++) await step.getByRole("button", { name: "Continue", exact: true }).click()
  await step.getByRole("button", { name: "Prepare first workflow", exact: true }).click()
  await step.getByRole("checkbox", { name: "I reviewed this event and want to start this demo workspace." }).check()
  await step.getByRole("button", { name: "Approve & start workspace", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events")
  await closeRail(page)
  // a task
  await ask(page, "Add a task: order name tags")
  await page.getByTestId("task-form").getByRole("button", { name: /^Create task/ }).click()
  await expect(page.getByTestId("applied-set").last()).toBeVisible()
  // an event
  await ask(page, "Plan Spring Mixer on Dec 3, 20 people, outside caterer, USG funding")
  await page.getByTestId("plan-form").getByRole("button", { name: "Continue" }).click()
  await page.getByTestId("change-item").getByRole("button", { name: "Apply this change" }).click()
  // a rule question (the answer is built from the rule book, so it works with the AI off)
  await ask(page, "What do outside caterers need?")
  await expect(page.getByTestId("rule-answer").last()).toContainText("R06")
  // a few more small actions, so the log has plenty of lines
  for (const path of ["/tasks", "/team", "/funding", "/rules", "/settings"]) { await page.goto(`/#${path}`); await expect(page.getByRole("heading", { level: 1 })).toBeVisible() }
  await closeRail(page)
  await page.getByTestId("demo-menu").click()
  await page.getByTestId("clock-1").click()
  await page.getByTestId("clock-3").click()
  await page.keyboard.press("Escape")   // the Demo menu floats over the page; on a phone the page now starts higher, under it
  await page.getByRole("button", { name: "My preferences" }).click()
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))
  const log = file.interactionLog.entries as { seq: number; at: number; type: string; applied: boolean }[]
  expect(log.length).toBeGreaterThanOrEqual(5)
  expect(log.map(e => e.seq)).toEqual([...log.map(e => e.seq)].sort((a, b) => a - b)) // in order
  expect(new Set(log.map(e => e.seq)).size).toBe(log.length) // none twice
  expect(log.map(e => e.at)).toEqual([...log.map(e => e.at)].sort((a, b) => a - b))
  expect(log.map(e => e.type)).toEqual(expect.arrayContaining(["completeSetup", "advanceClock"]))
  expect(file.state.org.name).toBe("Fictional Rehearsal Club")
  expect(errors).toEqual([])
})

test("keyboard only: claim a task, change its status and finish it without a mouse", async ({ page }) => {
  const id = await createUnclaimedTask(page, "Prepare the keyboard rehearsal")
  await viewAs(page, "jordan")
  await closeRail(page)
  const card = page.getByTestId("task-board").getByRole("button", { name: "Prepare the keyboard rehearsal" })
  await card.focus()
  await page.keyboard.press("Enter")
  const detail = page.getByTestId("task-detail")
  await detail.getByRole("button", { name: "I've got it", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(detail).toContainText("To do")
  expect(await savedTask(page, id)).toMatchObject({ status: "accepted", ownerId: "jordan" })
  await detail.getByRole("button", { name: "Need help", exact: true }).focus()
  await page.keyboard.press("Space")
  await expect(detail).toContainText("Stuck")
  expect(await savedTask(page, id)).toMatchObject({ status: "blocked", ownerId: "jordan" })
  await detail.getByRole("button", { name: "Mark done", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(detail).toContainText("Completed on")
  expect(await savedTask(page, id)).toMatchObject({ status: "done", ownerId: "jordan" })
  await page.reload()
  // The task was opened from the board rather than a historic deep link.
  expect(await savedTask(page, id)).toMatchObject({ status: "done", ownerId: "jordan" })
  await closeRail(page)
  await expect(page.getByRole("region", { name: "Done", exact: true })).toContainText("Prepare the keyboard rehearsal")
})
