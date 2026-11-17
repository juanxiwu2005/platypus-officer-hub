import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, viewAs } from "./helpers"

const text = "Robot Builders maintain the robots. The visual team prepares clear event graphics."
const source = (page: Page) => page.locator("#matching-source")
const library = (page: Page) => page.locator("#matching-library")
const preview = (page: Page) => page.getByTestId("matching-assignment-result")
const sideKey = (page: Page) => page.evaluate(() => Object.keys(localStorage).find(key => key.startsWith("platypus.matching.setup.v1:"))!)
const business = (page: Page) => page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
  return { people: state.people, roles: state.roles, nodes: state.nodes, version: state.schemaVersion }
})
async function open(page: Page, example = false) {
  await page.goto(`/#/matching${example ? "?example=1" : ""}`)
  await closeRail(page)
  await expect(page.getByRole("heading", { name: "Responsibilities", exact: true })).toBeVisible()
  // The legacy reader normalizes its seed on first reopen (including waitingOnPersonId: null).
  // Start each semantic preservation comparison after that existing normalization has run.
  await page.reload()
  await closeRail(page)
  await expect(page.getByRole("heading", { name: "Responsibilities", exact: true })).toBeVisible()
}
async function manual(page: Page, name: string) {
  await library(page).getByRole("button", { name: "New responsibility", exact: true }).click()
  await library(page).getByLabel("Responsibility name").fill(name)
  await library(page).getByLabel("What does this responsibility cover?").fill("Coordinate a fictional room request.")
  await library(page).getByLabel("What should be delivered?").fill("A confirmed room reservation.")
  await library(page).getByRole("button", { name: "Save draft", exact: true }).click()
  await expect(library(page).getByRole("button", { name: `${name} Draft`, exact: true })).toBeVisible()
  await library(page).getByRole("button", { name: "Confirm responsibility", exact: true }).click()
  await expect(library(page).getByRole("button", { name: `${name} Confirmed`, exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  // Every API is mocked; these browser checks never reach an AI provider.
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline test. Continue manually." } }))
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
})

test("Team and Settings lead to the responsibility setup without an AI request", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", route => { calls++; return route.fulfill({ status: 503, json: {} }) })
  for (const path of ["team", "settings"]) {
    await page.goto(`/#/${path}`)
    await closeRail(page)
    await page.getByRole("link", { name: "Set up responsibilities", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Responsibilities", exact: true })).toBeVisible()
  }
  expect(calls).toBe(0)
})

test("manual setup survives refresh and opening the example, while actual tasks and team stay unchanged", async ({ page }) => {
  await open(page)
  const before = await business(page)
  await manual(page, "Room request coordination")
  await page.reload()
  await expect(library(page).getByRole("button", { name: "Room request coordination Confirmed", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Try 12-person example" }).click()
  await expect(library(page).getByRole("button", { name: "Space coordination Confirmed", exact: true })).toBeVisible()
  await page.goto("/#/matching")
  await expect(library(page).getByRole("button", { name: "Room request coordination Confirmed", exact: true })).toBeVisible()
  expect(await business(page)).toEqual(before)
})

test("two workflows reuse a duty, with clear primary, backup, multiple-candidate and unknown-qualification outcomes", async ({ page }) => {
  await open(page, true)
  await expect(preview(page)).toContainText("Suggested: Demo Riley")
  await page.getByRole("button", { name: /Reserve a competition space/ }).click()
  await expect(preview(page)).toContainText("Suggested: Demo Riley")
  await page.getByRole("button", { name: /Prepare the competition poster/ }).click()
  await expect(preview(page)).toContainText("Suggested: Demo Drew")
  await expect(preview(page)).toContainText("Confirm the backup")
  await page.getByRole("button", { name: /Test the firmware competition/ }).click()
  await expect(preview(page)).toContainText("Several people can do this")
  await page.getByRole("button", { name: /Prepare a flight demonstration/ }).click()
  await expect(preview(page)).toContainText("Check the required qualifications")
})

test("AI proposals require adoption and confirmation; the second adoption keeps the same batch usable", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", async route => {
    calls++
    const request = route.request().postDataJSON()
    await route.fulfill({ json: { part: "responsibilities", requestId: request.requestId, sourceId: request.sourceId, warnings: ["Check general policy coverage manually."], proposals: ["Robot upkeep", "Visual clarity"].map((title, index) => ({
      id: `browser-proposal-${index}`, title, description: "Own this fictional process.", deliverable: "An inspected deliverable.", exclusions: [], requiredQualificationIds: [], roleIds: [request.roles[0].id],
      source: { kind: index ? "suggestion" : "constitution", sourceId: request.sourceId, quote: index ? "" : "Robot Builders maintain the robots.", verified: !index },
    })) } })
  })
  await open(page)
  await source(page).getByLabel("Constitution text").fill(text)
  await source(page).getByRole("button", { name: "Draft responsibilities", exact: true }).click()
  await expect(source(page).getByText("Reading complete", { exact: true })).toBeVisible()
  await expect(source(page).getByText("Quote found in source", { exact: true })).toBeVisible()
  await expect(source(page).getByText("Suggestion · not verified in source", { exact: true })).toBeVisible()
  await expect(library(page).getByRole("button", { name: "Robot upkeep Draft", exact: true })).toHaveCount(0)
  await source(page).getByRole("button", { name: "Use as draft", exact: true }).first().click()
  await source(page).getByRole("button", { name: "Use as draft", exact: true }).click()
  await expect(library(page).getByRole("button", { name: "Robot upkeep Draft", exact: true })).toBeVisible()
  await expect(library(page).getByRole("button", { name: "Visual clarity Draft", exact: true })).toBeVisible()
  await page.reload()
  await expect(library(page).getByRole("button", { name: "Visual clarity Draft", exact: true })).toBeVisible()
  expect(calls).toBe(1)
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), await sideKey(page))
  expect(saved.decisions).toHaveLength(2)
  expect(saved.matching.roleResponsibilities.every((row: { confirmed: boolean }) => !row.confirmed)).toBe(true)
})

test("AI failure leaves a usable manual setup", async ({ page }) => {
  await open(page)
  await source(page).getByLabel("Constitution text").fill(text)
  await source(page).getByRole("button", { name: "Draft responsibilities", exact: true }).click()
  await expect(source(page).getByText("Reading failed", { exact: true })).toBeVisible()
  await manual(page, "Manual lab inspection")
  await expect(source(page).getByLabel("Constitution text")).toHaveValue(text)
})

test("refresh does not replay a pending request, and Stop keeps the saved input", async ({ page }) => {
  let calls = 0
  let release!: () => void
  const waiting = new Promise<void>(resolve => { release = resolve })
  await page.route("**/api/setup/constitution", async route => { calls++; await waiting; await route.fulfill({ status: 503, json: { message: "Ended test wait." } }).catch(() => {}) })
  await open(page)
  await source(page).getByLabel("Constitution text").fill(text)
  await source(page).getByRole("button", { name: "Draft responsibilities", exact: true }).click()
  await expect.poll(() => calls).toBe(1)
  await page.reload()
  await expect(source(page).getByText("Reading interrupted", { exact: true })).toBeVisible()
  expect(calls).toBe(1)
  await source(page).getByRole("button", { name: "Draft responsibilities", exact: true }).click()
  await expect.poll(() => calls).toBe(2)
  await source(page).getByRole("button", { name: "Stop waiting", exact: true }).click()
  await expect(source(page).getByText("Reading stopped", { exact: true })).toBeVisible()
  await expect(source(page).getByLabel("Constitution text")).toHaveValue(text)
  release()
})

test("damaged preview data is preserved and downloadable without resetting business data", async ({ page }) => {
  await open(page)
  await source(page).getByLabel("Constitution text").fill(text)
  await source(page).getByLabel("Source name").focus()
  const key = await sideKey(page), before = await business(page)
  await page.evaluate(storageKey => localStorage.setItem(storageKey, "{damaged-preview"), key)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Responsibility setup could not open" })).toBeVisible()
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download saved preview" }).click()
  expect((await download).suggestedFilename()).toBe("responsibility-setup.json")
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBe("{damaged-preview")
  expect(await business(page)).toEqual(before)
})

test("a member can review the setup but cannot edit it", async ({ page }) => {
  await open(page)
  await viewAs(page, "maya")
  await expect(library(page).getByRole("button", { name: "New responsibility", exact: true })).toBeDisabled()
  await expect(source(page).getByLabel("Constitution text")).toBeDisabled()
  await expect(page.getByText("You can review this setup. Switch to the president or vice president to edit.")).toBeVisible()
})

test("example layout has no horizontal overflow or accessibility violations", async ({ page }, info) => {
  await open(page, true)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations
  expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" ; ")}`)).toEqual([])
  await page.screenshot({ path: `/tmp/matching-stage2-${info.project.name}.png`, fullPage: true })
})
