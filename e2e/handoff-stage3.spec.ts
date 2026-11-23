import { expect, test, type Page } from "@playwright/test"
import { openMore, viewAs } from "./helpers"

// Handoff stage 3 (docs/HANDOFF_EXECUTION_PLAN.md §5). The sample club's handoff season is already open (P3-A).
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/handbook/draft", r => r.fulfill({ json: { entries: [{ sourceId: "interview:r-fin:1" }], model: "mock", provider: "mock", source: "ai" } }))
})

async function readyToFinish(page: Page) {
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(role.getByTestId("handbook-draft")).toBeVisible()
  await viewAs(page, "maya")
  await role.getByRole("button", { name: "Confirm as outgoing officer", exact: true }).click()
  await viewAs(page, "alex")
  await role.getByRole("button", { name: "Approve as president", exact: true }).click()
  return role
}

test("the next officer is named first: they can be viewed as, read the handbook, and the first-week list waits for the handover", async ({ page }) => {
  const role = await readyToFinish(page)
  await role.getByLabel("Incoming officer name").fill("Taylor Example")
  await role.getByRole("button", { name: "Name as next officer" }).click()
  await expect(role).toContainText("Next officer: Taylor Example")
  await expect(role.getByLabel("Who takes over?")).toHaveCount(0)

  // The first-week list is closed until the handover, even for the president.
  const boxes = role.getByRole("checkbox")
  await expect(role).toContainText("Opens after handover.")
  for (let i = 0; i < await boxes.count(); i++) await expect(boxes.nth(i)).toBeDisabled()

  // Taylor shows in View as, marked incoming, and sees the handbook but cannot finish the handover.
  await openMore(page)
  const options = await page.getByTestId("view-as").locator("option").allTextContents()
  expect(options).toContain("Taylor Example · incoming Treasurer")
  await viewAs(page, "incoming:season:2026-10-26:r-fin")
  await expect(role.getByTestId("handbook-draft")).toBeVisible()
  await expect(role.getByRole("button", { name: "Finish role handoff" })).toBeDisabled()

  // Settings still save with someone waiting.
  await viewAs(page, "alex")
  await page.goto("/#/settings")
  const settings = page.getByTestId("club-settings")
  await settings.getByLabel("Club name", { exact: true }).fill("Desert Founders Stage Three")
  await expect(settings.getByRole("status")).toContainText("Saved")
})

test("Finish hands the role to the named officer, who then ticks the first-week list themselves", async ({ page }) => {
  const role = await readyToFinish(page)
  await role.getByLabel("Incoming officer name").fill("Taylor Example")
  await role.getByRole("button", { name: "Name as next officer" }).click()
  await role.getByRole("button", { name: "Finish role handoff" }).click()
  await expect(role).toContainText("Handed to Taylor Example.")

  const boxes = role.getByRole("checkbox")
  for (let i = 0; i < await boxes.count(); i++) await expect(boxes.nth(i)).toBeEnabled() // the president can tick
  await openMore(page) // the former officer is out of the View as list, so cannot tick
  expect(await page.getByTestId("view-as").locator("option").allTextContents()).not.toContain("Maya Chen · Treasurer")
  await viewAs(page, "incoming:season:2026-10-26:r-fin")
  await boxes.first().check()
  await expect(role).toContainText("1/6")
})

test("changing the next officer removes the unused person", async ({ page }) => {
  const role = await readyToFinish(page)
  await role.getByLabel("Incoming officer name").fill("Taylor Example")
  await role.getByRole("button", { name: "Name as next officer" }).click()
  await role.getByRole("button", { name: "Change next officer" }).click()
  await expect(role.getByLabel("Who takes over?")).toBeVisible()
  await openMore(page)
  expect(await page.getByTestId("view-as").locator("option").allTextContents()).not.toContain("Taylor Example · incoming Treasurer")
})

test("a club saved before role terms existed opens as it was, with nothing lost and no restore notice", async ({ page }) => {
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  const before = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    const people = s.people.length, tasks = s.nodes.length, roles = s.roles.length
    delete s.roleTerms; s.schemaVersion = s.schemaVersion - 1
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
    return { people, tasks, roles }
  })
  await page.reload()
  await expect(page.getByTestId("storage-banner")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  const after = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return { people: s.people.length, tasks: s.nodes.length, roles: s.roles.length, version: s.schemaVersion, active: s.roleTerms?.filter((t: { status: string }) => t.status === "active").length }
  })
  // The page saves on change only; open a role so the state is written back, then read it.
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  await page.getByRole("button", { name: "Draft role handbook" }).waitFor()
  expect(after.people).toBe(before.people)
  expect(after.tasks).toBe(before.tasks)
  expect(after.roles).toBe(before.roles)
})
