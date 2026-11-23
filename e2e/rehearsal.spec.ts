import { expect, test } from "@playwright/test"
import { readFileSync } from "node:fs"
import { finishSetup, savedSetupDraft, setupToTeam } from "./setupHelpers"
import { ask, closeRail, viewAs } from "./helpers"
import { createUnclaimedTask, savedTask } from "./taskHelpers"

// S9 release rehearsals: what a participant does from a clean browser to an exported file, and the keyboard-only path.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
})

test("participant path: clean browser → shared setup → task → event → rule question → export; nothing blank, every action logged in order", async ({ page }) => {
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
  await setupToTeam(page, "Fictional Rehearsal Club")
  await finishSetup(page)
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

test("a refused setup save keeps the founder draft, organization and the Team page (where Start workspace is since ob-6)", async ({ page }) => {
  await setupToTeam(page, "Fictional unsaved club")
  const original = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  await page.evaluate(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === "platypus.v1.demo") throw new Error("Fictional business save failure")
      return write.call(this, key, value)
    }
  })
  await page.getByRole("button", { name: "Start workspace", exact: true }).click()
  await expect(page.locator("main").getByRole("alert")).toContainText("Your club could not be saved")
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(original)
  // The founder draft is written to the browser database a moment after the last change (draft.tsx, SAVE_DELAY), and this test reaches
  // Team faster than a person can: reload only once the draft with this club is stored, as it is for anyone working at a human pace.
  await expect.poll(async () => (await savedSetupDraft(page))?.club.name).toBe("Fictional unsaved club")
  await page.reload()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await expect(page.getByLabel("Club name", { exact: true })).toHaveValue("Fictional unsaved club")
})

test("keyboard only: claim a task, change its status and finish it without a mouse", async ({ page }) => {
  const id = await createUnclaimedTask(page, "Prepare the keyboard rehearsal")
  await viewAs(page, "jordan")
  await closeRail(page)
  const card = page.getByTestId("my-tasks").getByRole("button", { name: "Prepare the keyboard rehearsal" })
  await card.focus()
  await page.keyboard.press("Enter")
  const detail = page.getByTestId("task-detail")
  await detail.getByRole("button", { name: "I've got it", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(detail).toContainText("To do")
  expect(await savedTask(page, id)).toMatchObject({ status: "accepted", ownerId: "jordan" })
  // The universal task details: the status is one drop-down, changed from the keyboard by typing an option's first letter.
  const status = detail.getByRole("combobox", { name: "Task status", exact: true })
  await status.focus()
  await page.keyboard.press("s")
  await expect(status).toHaveValue("blocked")
  await expect(detail.getByRole("status").filter({ hasText: "Your update is saved." })).toBeVisible()
  expect(await savedTask(page, id)).toMatchObject({ status: "blocked", ownerId: "jordan" })
  // Finishing is a submission: a few words of result typed from the keyboard, then Submit & mark done.
  await detail.getByLabel("Details", { exact: true }).focus()
  await page.keyboard.type("Rehearsal room booked")
  await detail.getByRole("button", { name: "Submit & mark done", exact: true }).focus()
  await page.keyboard.press("Enter")
  await expect(status).toHaveValue("done")
  expect(await savedTask(page, id)).toMatchObject({ status: "done", ownerId: "jordan" })
  await page.reload()
  // The task was opened from the task table rather than a historic deep link; the table lists open work, so it has left it.
  expect(await savedTask(page, id)).toMatchObject({ status: "done", ownerId: "jordan" })
  await closeRail(page)
  await expect(page.getByTestId("my-tasks")).toBeVisible()
  await expect(page.getByTestId("my-tasks").getByRole("button", { name: "Prepare the keyboard rehearsal" })).toHaveCount(0)
})
