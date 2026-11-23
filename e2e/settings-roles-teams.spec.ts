import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { noOverflow } from "./helpers"
import type { DemoState } from "../src/data/types"

// Settings → Roles & teams (concept C, docs/feedback-fix/ROLES_TEAMS_CONCEPTS_2026-11-19.md): org chart + workflow team areas + inspector.
const read = (page: Page): Promise<DemoState> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
const serious = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations
  .filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline roles and teams" } }))
  await page.goto("/#/settings")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Roles & teams", exact: true }).click()
  await expect(page.getByTestId("org-chart")).toBeVisible()
})

const inspector = (page: Page) => page.getByTestId("roles-inspector")
const zone = (page: Page, label: string) => page.getByRole("button", { name: `${label}, edit team`, exact: true })

test("the chart shows the preset teams as areas with their step counts, and the inspector edits a role's team", async ({ page }) => {
  for (const label of ["Club leadership · 1 step", "Operations · 25 steps", "Marketing · 8 steps", "Finance · 12 steps"]) await expect(zone(page, label)).toBeVisible()
  await expect(page.getByTestId("team-zone")).toHaveCount(4)
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("President")
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  expect(await serious(page)).toEqual([])

  await page.getByRole("button", { name: "Treasurer, Maya Chen", exact: true }).click()
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("Treasurer")
  await expect(inspector(page).getByLabel("Team", { exact: true })).toHaveValue("workflow-finance")
  await expect(inspector(page)).toContainText("Owns 12 steps in Speaker series.")

  // Secretary moves to Marketing: the areas follow, and the Workflow canvas roster for Marketing lists Priya.
  await page.getByRole("button", { name: "Secretary, Priya Nair", exact: true }).click()
  await inspector(page).getByLabel("Team", { exact: true }).selectOption({ label: "Marketing" })
  await expect(page.getByTestId("team-save-status")).toContainText("Team saved for Secretary.")
  expect((await read(page)).org.workflowRoleTeams!["r-sec"]).toBe("workflow-marketing")
  const marketing = page.locator('[data-testid="team-zone"][data-team-id="workflow-marketing"]')
  const secretary = page.getByRole("button", { name: "Secretary, Priya Nair", exact: true })
  const [z, card] = [(await marketing.boundingBox())!, (await secretary.boundingBox())!]
  expect(card.x).toBeGreaterThanOrEqual(z.x); expect(card.x + card.width).toBeLessThanOrEqual(z.x + z.width + 0.5)
  expect(await serious(page)).toEqual([])

  await inspector(page).getByRole("button", { name: "Open in Workflow →" }).click()
  await expect(page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Workflow", exact: true })).toHaveAttribute("aria-current", "page")
  await page.getByRole("button", { name: /^Marketing · \d+ steps?, edit branch$/ }).first().click()
  await expect(page.locator(".wfb-roster").first()).toContainText("Priya · Secretary")
})

test("Undo after a team change restores the role's previous team", async ({ page }) => {
  await page.getByRole("button", { name: "Secretary, Priya Nair", exact: true }).click()
  await inspector(page).getByLabel("Team", { exact: true }).selectOption({ label: "Marketing" })
  await page.getByTestId("team-save-status").getByRole("button", { name: "Undo" }).click()
  await expect.poll(async () => (await read(page)).org.workflowRoleTeams!["r-sec"]).toBe("workflow-operations")
  await expect(zone(page, "Operations · 25 steps")).toBeVisible()
  await expect(page.getByTestId("team-save-status")).toHaveCount(0)
})

test("+ Team adds a team that can be renamed and deleted; a used team cannot be deleted", async ({ page }) => {
  await zone(page, "Finance · 12 steps").click()
  await expect(inspector(page).getByRole("button", { name: "Delete team" })).toBeDisabled()
  await expect(inspector(page)).toContainText("Roles are in this team. Move them to another team first.")

  await page.getByRole("button", { name: "+ Team", exact: true }).click()
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("New team")
  await expect.poll(async () => (await read(page)).org.workflowTeams!.map(t => t.name)).toEqual(["Club leadership", "Operations", "Marketing", "Finance", "New team"])
  await inspector(page).getByLabel("Team name", { exact: true }).fill("Outreach")
  await expect.poll(async () => (await read(page)).org.workflowTeams!.at(-1)!.name).toBe("Outreach")
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("Outreach")
  await expect(inspector(page)).toContainText("No roles yet.")
  await inspector(page).getByRole("button", { name: "Delete team" }).click()
  await expect.poll(async () => (await read(page)).org.workflowTeams!.map(t => t.name)).toEqual(["Club leadership", "Operations", "Marketing", "Finance"])
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("President")
  expect(await serious(page)).toEqual([])
})

test("the contact list shows each role's team, and Escape brings the inspector back to the president", async ({ page }) => {
  await page.getByRole("button", { name: "Marketing lead, Sam Okafor", exact: true }).click()
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("Marketing lead")
  await inspector(page).getByLabel("Duties", { exact: true }).focus()
  await page.keyboard.press("Escape")
  await expect(inspector(page).getByRole("heading", { level: 2 })).toHaveText("President")

  await page.getByRole("button", { name: "Contact list", exact: true }).click()
  await expect(page.getByRole("columnheader", { name: "Team", exact: true })).toBeVisible()
  await expect(page.getByRole("row").filter({ hasText: "Treasurer" })).toContainText("Finance")
  await expect(page.getByRole("button", { name: "Copy all emails" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Show duties for Secretary" })).toBeVisible()
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  expect(await serious(page)).toEqual([])
})

test("Workflow has no Teams panel of its own: its menu offers no Teams, and teams are edited here", async ({ page }) => {
  await page.goto("/#/settings?tab=workflow")
  await expect(page.getByTestId("workflow-builder")).toBeVisible()
  await page.getByTestId("workflow-settings").getByRole("button", { name: "Versions", exact: true }).click()
  await expect(page.getByRole("menuitem", { name: "Teams", exact: true })).toHaveCount(0)
  await page.keyboard.press("Escape")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Roles & teams", exact: true }).click()
  await expect(page.getByTestId("org-chart")).toBeVisible()
})
