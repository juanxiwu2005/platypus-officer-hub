import { expect, test, type Page } from "@playwright/test"
import { applySchedule } from "../src/engine/schedule"
import { seedDemo } from "../src/data/seed"
import { closeRail, noOverflow, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"

const retired = { schemaVersion: 99, opaque: "Fictional archived responsibility data", assignments: ["preserve"] }
async function archivedBrowser(page: Page) {
  const state = seedDemo(undefined, "v2"), source = state.nodes.find(node => node.ownerId === "maya")!
  state.matching = retired
  state.matchingContext = { source: "Fictional constitution", untouched: true }
  state.org.settings.matchingMode = "responsibilities"
  state.org.matchingWorkspaceId = "fictional-retired-workspace"
  state.nodes.push({ ...source, id: "fictional-retired-task", title: "Fictional archived task", eventId: null, stepKey: null, phase: null, dependsOn: [], status: "unclaimed", acceptedOn: null, ownerId: "maya", matching: { opaque: "retained" } })
  const scheduled = applySchedule(state)
  await page.addInitScript(value => { if (!sessionStorage.getItem("rollback-seeded")) { localStorage.setItem("platypus.v1.demo", JSON.stringify(value)); sessionStorage.setItem("rollback-seeded", "1") } }, scheduled)
  return scheduled
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline rollback verification" } }))
})

test("the founder walkthrough opens on its three screens (ob-6: name and first event, team with the constitution, invite)", async ({ page }) => {
  await page.goto("/#/welcome/test/president")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Name your club")
  await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByRole("listitem")).toHaveCount(3)
  await page.getByLabel("Club name", { exact: true }).fill("Fictional main walkthrough")
  await page.getByRole("button", { name: "Skip for now", exact: true }).click()
  await expect(page).toHaveURL(/founder\/team$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who's on your team?")
  await expect(page.getByRole("button", { name: "Import roles from your constitution", exact: true })).toBeVisible()
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  await page.screenshot({ path: `/tmp/matching-rollback-${test.info().project.name}-team.png`, fullPage: true })
})

test("withdraws responsibility pages and creates tasks through the previous owner selector while retaining archived data", async ({ page }) => {
  const original = await archivedBrowser(page)
  await page.goto("/#/matching")
  await expect(page).toHaveURL(/#\/settings$/)
  await expect(page.getByRole("link", { name: "Set up responsibilities", exact: true })).toHaveCount(0)
  await page.goto("/#/tasks")
  await closeRail(page)
  await page.getByTestId("new-task").click()
  const form = page.getByTestId("new-task-form")
  await expect(form.getByLabel("Responsibility", { exact: true })).toHaveCount(0)
  await form.getByLabel("New task name", { exact: true }).fill("Fictional rollback assignment")
  await form.getByLabel("Assign to", { exact: true }).selectOption("maya")
  await form.getByRole("button", { name: "Add", exact: true }).click()
  await expect.poll(async () => (await savedDemo(page)).nodes.find(node => node.title === "Fictional rollback assignment")?.ownerId).toBe("maya")
  await page.reload()
  const after = await savedDemo(page)
  expect(after.matching).toEqual(retired)
  expect(after.matchingContext).toEqual(original.matchingContext)
  for (const node of original.nodes) expect(after.nodes.find(candidate => candidate.id === node.id)).toEqual(node)
})

test("existing assigned work remains claimable without the withdrawn responsibility configuration", async ({ page }) => {
  await archivedBrowser(page)
  await page.goto("/#/tasks")
  await viewAs(page, "maya")
  await page.goto("/#/tasks?node=fictional-retired-task")
  await expect(page.getByTestId("task-matching")).toHaveCount(0)
  await page.getByRole("button", { name: "I've got it", exact: true }).click()
  await expect.poll(async () => (await savedDemo(page)).nodes.find(node => node.id === "fictional-retired-task")?.status).toBe("accepted")
  await page.reload()
  expect((await savedDemo(page)).matching).toEqual(retired)
})
