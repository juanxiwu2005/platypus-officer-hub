import { expect, test, type Page } from "@playwright/test"
import { viewAs } from "./helpers"

// Handoff stage 2 (docs/HANDOFF_EXECUTION_PLAN.md §4). The sample club's handoff season is already open (P3-A).
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/handbook/draft", r => r.fulfill({ json: { entries: [{ sourceId: "interview:r-fin:1" }], model: "mock", provider: "mock", source: "ai" } }))
})

/** Draft, Maya confirms, Alex approves and ticks the first week. Leaves the viewer on Alex with the Treasurer panel open. */
async function readyToFinish(page: Page, { ticks = true } = {}) {
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
  if (ticks) { const boxes = role.getByRole("checkbox"); for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check() }
  return role
}

test("a club member takes the role over: the old role is flagged open, the person is not duplicated, tasks wait to be claimed", async ({ page }) => {
  const role = await readyToFinish(page)
  await role.getByLabel("Who takes over?").selectOption({ label: "Sam Okafor · Marketing lead" })
  await expect(role).toContainText("Marketing lead will be open until someone takes it.")
  await expect(role.getByLabel("Incoming fictional officer name")).toHaveCount(0)
  await role.getByRole("button", { name: "Finish role handoff" }).click()
  await expect(role).toContainText("Handed to Sam Okafor.")

  // Sam is the Treasurer now and has the open tasks to claim; Maya left the View as list; Settings still save.
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
  expect(state.people.filter((p: { name: string }) => p.name === "Sam Okafor")).toHaveLength(1)
  expect(state.roles.find((r: { id: string }) => r.id === "r-fin").holderId).toBe("sam")
  expect(state.roles.find((r: { id: string }) => r.id === "r-mkt").holderId).toBeNull()
  expect(state.nodes.filter((n: { ownerId: string; status: string }) => n.ownerId === "sam" && n.status === "unclaimed").length).toBeGreaterThan(0)
  await page.goto("/#/settings")
  const settings = page.getByTestId("club-settings")
  await settings.getByLabel("Club name", { exact: true }).fill("Desert Founders Stage Two")
  await expect(settings.getByRole("status")).toContainText("Saved")
})

test("a role can be left open, and then handed to someone later", async ({ page }) => {
  const role = await readyToFinish(page)
  await role.getByLabel("Who takes over?").selectOption({ label: "Nobody yet (leave it open)" })
  await role.getByRole("button", { name: "Finish role handoff" }).click()
  await expect(role).toContainText("Left open: Treasurer has no officer yet.")
  await role.getByRole("button", { name: "Hand over to someone" }).click()
  // The president answers for the open role; the work already done is kept.
  await expect(role.getByLabel("Outgoing interview · fictional example only")).toBeEnabled()
  await expect(role.getByTestId("handbook-draft")).toBeVisible()
  await expect(role.getByLabel("Who takes over?")).toBeVisible()
  await expect(role.getByRole("option", { name: "Nobody yet (leave it open)" })).toHaveCount(0)
})

test("one role can be handed over without a club-wide season", async ({ page }) => {
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); s.handoff = null; s.handoffRoles = []; localStorage.setItem("platypus.v1.demo", JSON.stringify(s)) })
  await page.reload()
  await expect(page.getByRole("button", { name: "Start handoff season" })).toBeVisible()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  await page.getByRole("button", { name: "Hand over this role" }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  await expect(role.getByRole("button", { name: "Draft role handbook" })).toBeVisible()
  // Only the Treasurer joined; the button now starts the full season, not "Save dates".
  await expect(page.getByRole("button", { name: "Start handoff season" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save dates" })).toHaveCount(0)
  const roles = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).handoffRoles.map((r: { roleId: string }) => r.roleId))
  expect(roles).toEqual(["r-fin"])
})
