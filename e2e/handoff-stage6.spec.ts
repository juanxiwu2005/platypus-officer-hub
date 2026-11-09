import { expect, test, type Page } from "@playwright/test"

// Handoff stage 6 (docs/HANDOFF_EXECUTION_PLAN.md §8): former titles, a new role's starter questions, moving work, closing a role.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
})

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))

async function addRole(page: Page, title: string) {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles", exact: true }).click()
  const settings = page.getByTestId("club-settings")
  await settings.getByRole("button", { name: "Edit roles", exact: true }).click()
  await settings.getByRole("button", { name: "Add role", exact: true }).click()
  await settings.getByLabel("Role title", { exact: true }).last().fill(title)
  await expect(settings.getByRole("status")).toContainText("Saved")
}

test("a renamed role shows its former title in the dossier", async ({ page }) => {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles", exact: true }).click()
  const settings = page.getByTestId("club-settings")
  await settings.getByRole("button", { name: "Edit roles", exact: true }).click()
  await settings.getByLabel("Role title", { exact: true }).nth(1).fill("Finance Chair")
  await expect(settings.getByRole("status")).toContainText("Saved")
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Finance Chair handbook/ }).click()
  await expect(page.getByTestId("former-names")).toContainText("Formerly Treasurer (until ")
})

test("a new role asks the president three questions, and the answers become part of its dossier", async ({ page }) => {
  await addRole(page, "Outreach Chair")
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Outreach Chair handbook/ }).click()
  const role = page.getByRole("region", { name: "Outreach Chair handbook" })
  const starter = role.getByTestId("starter-questions")
  await expect(starter).toContainText("A new role: three questions")
  await starter.getByLabel("Why does the club need this role?").fill("Speakers bring new members.")
  await starter.getByLabel("What does success look like by the end of the semester?").focus() // leaving the box saves it
  await expect(role.getByTestId("dossier-lessons")).toContainText("Why does the club need this role? Speakers bring new members.")
})

test("work moves to another role and arrives Not claimed", async ({ page }) => {
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  const panel = role.getByTestId("role-changes")
  await panel.getByText("Change this role").click()
  await panel.getByLabel("Move to").selectOption({ label: "Marketing lead" })
  const first = panel.getByRole("checkbox").first()
  await first.check()
  await panel.getByRole("button", { name: "Move selected" }).click()
  const s = await saved(page)
  const moved = s.nodes.filter((n: { ownerId: string; status: string; fn: string }) => n.ownerId === "sam" && n.status === "unclaimed" && n.fn === "marketing")
  expect(moved.length).toBeGreaterThan(0)
})

test("closing a role keeps it in the club's history", async ({ page }) => {
  await addRole(page, "Outreach Chair")
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Outreach Chair handbook/ }).click()
  const role = page.getByRole("region", { name: "Outreach Chair handbook" })
  const panel = role.getByTestId("role-changes")
  await panel.getByText("Change this role").click()
  await panel.getByRole("button", { name: "Close role, keep its history" }).click()
  await expect(page.getByRole("button", { name: /^Outreach Chair handbook/ })).toHaveCount(0)
  const s = await saved(page)
  expect(s.roles.some((r: { id: string }) => r.id.includes("outreach") || r.displayName === "Outreach Chair")).toBe(false)
  expect(s.archivedRoles.map((r: { displayName: string }) => r.displayName)).toEqual(["Outreach Chair"])
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles", exact: true }).click()
  await expect(page.getByTestId("closed-roles")).toContainText("Outreach Chair · closed ")
})
