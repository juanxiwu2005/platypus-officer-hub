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
  await expect(page.getByRole("heading", { level: 1, name: "Name your club" })).toBeVisible()
  await page.getByLabel("Club name").fill("Maple Club")
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: "Plan it" }).click()
  await expect(page.getByRole("region", { name: "First steps and dates" })).toBeVisible()
  await cont(page)                                                           // screen 1 → Team (ob-6)
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
  // S3: the Tasks page is a table of open work; the sample club still has tasks in every status.
  await expect.poll(() => page.getByTestId("my-tasks").getByTestId("task-card").count()).toBeGreaterThanOrEqual(5)
  const statuses = await page.evaluate(() => [...new Set(JSON.parse(localStorage.getItem("platypus.v1.demo")!).nodes.map((n: { status: string }) => n.status))])
  for (const status of ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"]) expect(statuses, status).toContain(status)

  await page.goto("/#/")
  await closeRail(page)
  // The home page is the reminder centre (the stars card left home): each owner's tasks are combined into one email, and an owner with an
  // at-risk task has a reminder email to open.
  const atRisk = page.getByTestId("rq-person").filter({ has: page.getByTestId("rq-person-task").getByRole("button", { name: /^At risk:/ }) })
  await expect(atRisk.first()).toBeVisible()
  await expect(atRisk.first().locator(".dg-person-head")).toBeVisible()

  await page.goto("/#/handoff")
  await closeRail(page)
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()            // the season is already open
  const cards = page.getByTestId("role-handbooks").locator("button.relay")
  await expect.poll(() => cards.count()).toBeGreaterThan(0)
  await expect(page.getByTestId("role-handbooks")).not.toContainText("Not started")
  await cards.first().click()
  await expect(page.getByRole("button", { name: "Draft role handbook" })).toBeVisible()
})
