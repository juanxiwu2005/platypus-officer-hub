import { fillMission, passReminders } from "./ob-helpers"
import { expect, test, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

// P3-A: after the founder walkthrough's Start workspace, the participant's club keeps the sample scenario: the three sample event
// templates (plus the event they planned), board tasks, an at-risk item to remind about, and an open handoff season.
// No server: the first event is read by the local grammar, and nothing is sent anywhere.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
})

const cont = (page: Page) => page.getByRole("button", { name: "Continue" }).click()

async function startWorkspace(page: Page) {
  await page.goto("/?walkthrough=1#/welcome/start")
  await page.evaluate(() => { location.hash = "#/welcome/founder/name" })
  await expect(page.getByRole("heading", { level: 1, name: "Name your club" })).toBeVisible()
  await page.getByLabel("Club name").fill("Maple Club")
  await fillMission(page); await cont(page)                       // FB-2 (ob-5): the mission is on Name
  await page.getByRole("button", { name: "Skip for now" }).click()          // Team
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: "Plan it" }).click()
  await expect(page.getByRole("region", { name: "First steps and dates" })).toBeVisible()
  await cont(page)
  await passReminders(page)                                                  // Reminders (P3-H): skipped
  await page.getByRole("button", { name: "Start workspace" }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo") ?? "{}").org?.name)).toBe("Maple Club")
}

test("Start workspace keeps the sample events, tasks, risks and handoff in the new club", async ({ page }) => {
  await startWorkspace(page)

  await page.goto("/#/events")
  await closeRail(page)
  const options = page.getByLabel("Choose an event").locator("option")
  for (const name of ["Welcome Mixer", "Networking Night", "Spring Speaker Night", "Founder Dinner"]) await expect(options.filter({ hasText: name })).toHaveCount(1)

  await page.goto("/#/tasks")
  await closeRail(page)
  await page.getByLabel("Task scope").selectOption("team")
  await expect.poll(() => page.getByTestId("board-card").count()).toBeGreaterThanOrEqual(10)
  for (const column of ["Not claimed", "To do", "Working on it", "Waiting", "Stuck", "Done"]) {
    await expect(page.getByRole("region", { name: column, exact: true }).getByTestId("board-card").first(), column).toBeVisible()
  }

  await page.goto("/#/")
  await closeRail(page)
  // FB-8: the home page is the reminder centre: at-risk tasks with an owner to remind lead Needs your OK (the stars card left home).
  const risk = page.getByTestId("rq-needs-ok")
  await expect(risk.getByTestId("rq-row").first().getByTestId("forecast")).toBeVisible()
  await expect(risk.getByRole("button", { name: "Review & open draft" }).first()).toBeVisible()

  await page.goto("/#/handoff")
  await closeRail(page)
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()            // the season is already open
  const cards = page.getByTestId("role-handbooks").locator("button.relay")
  await expect.poll(() => cards.count()).toBeGreaterThan(0)
  await expect(page.getByTestId("role-handbooks")).not.toContainText("Not started")
  await cards.first().click()
  await expect(page.getByRole("button", { name: "Draft role handbook" })).toBeVisible()
})
