import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail } from "./helpers"
import { branchPill, menuTrigger, openBranch, openMenu } from "./workflowLegacyHelpers"

// Settings → Workflow layout: one row per team branch, readable labels, header menus and bulk team assignment.
let errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline workflow layout acceptance" } }))
})
test.afterEach(() => expect(errors).toEqual([]))

async function open(page: Page) {
  await page.goto("/#/settings")
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const builder = page.getByTestId("workflow-builder")
  await expect(builder.getByTestId("workflow-start")).toBeVisible()
  await expect(page.getByRole("combobox", { name: "Saved workflow", exact: true }).locator("option:checked")).toHaveText(/^Speaker series( · Draft)?$/)
  return builder
}
/** Lane id → the branch ids of its dots, read from the rendered canvas. */
const dotBranches = (page: Page) => page.getByTestId("workflow-builder").locator(".wfx-task").evaluateAll(elements => Object.fromEntries(elements.map(element => [element.getAttribute("data-testid")!.replace("workflow-task-", ""), element.getAttribute("data-branch-id")!])))
const laneIds = (page: Page) => page.locator('[data-testid^="workflow-branch-pill-"]').evaluateAll(elements => elements.map(element => element.getAttribute("data-testid")!.replace("workflow-branch-pill-", "")))

test("each team branch is one row, phases run left to right and Fit shows the start station", async ({ page, isMobile }) => {
  const builder = await open(page)
  const lanes = await laneIds(page)
  expect(lanes.length).toBeGreaterThan(1)
  for (const id of lanes) {
    const tops = await builder.locator(`.wfx-task[data-branch-id="${id}"]`).evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().top)))
    expect(tops.length).toBeGreaterThan(0)
    expect(new Set(tops).size, `lane ${id} keeps its dots on one row`).toBe(1)
    const lane = (await builder.getByTestId(`workflow-segment-${id}`).boundingBox())!
    expect(tops[0]).toBeGreaterThan(lane.y)
    expect(tops[0]).toBeLessThan(lane.y + lane.height)
  }
  const phases = []
  for (const id of ["plan", "prepare", "event", "close"]) {
    const phase = builder.getByTestId(`workflow-phase-${id}`)
    await expect(phase).toBeVisible()
    phases.push((await phase.boundingBox())!.x)
  }
  expect([...phases].sort((a, b) => a - b)).toEqual(phases)
  expect(new Set(phases).size).toBe(4)
  if (!isMobile) {
    await builder.getByRole("button", { name: "Fit", exact: true }).click()
    const region = (await builder.getByRole("region", { name: "Workflow main line and team branches", exact: true }).boundingBox())!
    const start = (await builder.getByTestId("workflow-start").boundingBox())!
    expect(start.x).toBeGreaterThanOrEqual(region.x)
    expect(start.y).toBeGreaterThanOrEqual(region.y)
    expect(start.x + start.width).toBeLessThanOrEqual(region.x + region.width)
    expect(start.y + start.height).toBeLessThanOrEqual(region.y + region.height)
  }
})

test("task labels wrap only between words", async ({ page }) => {
  const builder = await open(page)
  const labels = builder.locator(".wfx-task strong")
  expect(await labels.count()).toBeGreaterThan(30)
  const broken = await labels.evaluateAll(elements => elements.flatMap(element => {
    const text = element.firstChild
    if (!text || text.nodeType !== Node.TEXT_NODE) return []
    const value = text.textContent ?? ""
    const words: string[] = []
    for (const match of value.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length)
      // A line clamp can report the same box twice; a real break puts the word on two different lines.
      const lines = new Set([...range.getClientRects()].filter(rect => rect.width > 0).map(rect => Math.round(rect.top)))
      if (lines.size > 1) words.push(`${value} → ${match[0]}`)
    }
    return words
  }))
  expect(broken).toEqual([])
})

test("bulk assignment moves three steps into one branch and a single Undo returns them", async ({ page }) => {
  const builder = await open(page)
  const original = await dotBranches(page)
  // The Operations close-out branch receives two Marketing and one Finance close-out step (same interval, no school rules).
  const target = original.thankyou
  const chosen = ["postmarketing", "photoBackup", "attendance"]
  expect(new Set(chosen.map(key => original[key])).size).toBe(2)
  expect(chosen.every(key => original[key] && original[key] !== target)).toBe(true)
  const facts = async () => Promise.all(chosen.map(async key => {
    const dot = builder.getByTestId(`workflow-task-${key}`)
    return { title: await dot.getAttribute("title"), label: await dot.getAttribute("aria-label") }
  }))
  const before = await facts()
  const team = (await branchPill(page, target).getAttribute("aria-label"))!.split(" · ")[0]
  const details = await openBranch(page, target)
  await expect(details.getByRole("heading", { name: `${team} path`, exact: true })).toBeVisible()
  await details.getByRole("button", { name: "+ Select steps", exact: true }).click()
  await expect(builder.getByRole("button", { name: "Select steps", exact: true })).toHaveAttribute("aria-pressed", "true")
  await closeRail(page)
  for (const [index, key] of chosen.entries()) {
    const dot = builder.getByTestId(`workflow-task-${key}`)
    await expect(dot).toHaveAccessibleName(`Select ${before[index].title}`)
    await dot.click()
    await expect(dot).toHaveAttribute("aria-pressed", "true")
  }
  if (!(await details.isVisible())) await openBranch(page, target)
  await expect(details.getByText("3 steps selected", { exact: true })).toBeVisible()
  await details.getByRole("button", { name: "Assign 3 steps", exact: true }).click()
  await expect(builder.getByRole("status").filter({ hasText: `Moved 3 steps to ${team}.` })).toBeVisible()
  await expect(builder.getByRole("button", { name: "Select steps", exact: true })).toHaveAttribute("aria-pressed", "false")
  await closeRail(page)
  const segment = (await builder.getByTestId(`workflow-segment-${target}`).boundingBox())!
  for (const key of chosen) {
    const dot = builder.getByTestId(`workflow-task-${key}`)
    await expect(dot).toHaveAttribute("data-branch-id", target)
    // The dot itself sits inside the lane card (its 100px label box may reach a few pixels past the card edge).
    const box = (await dot.locator("i").boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(segment.x)
    expect(box.x + box.width).toBeLessThanOrEqual(segment.x + segment.width + 1)
    expect(box.y).toBeGreaterThanOrEqual(segment.y)
    expect(box.y + box.height).toBeLessThanOrEqual(segment.y + segment.height + 1)
  }
  expect(await facts()).toEqual(before)
  await builder.getByRole("button", { name: "Undo edit", exact: true }).click()
  await expect.poll(() => dotBranches(page)).toEqual(original)
  expect(await facts()).toEqual(before)
})

test("the header groups saved workflows and the More menu closes with Escape back to its button", async ({ page }) => {
  await open(page)
  await openMenu(page, "New workflow", "Blank workflow")
  await expect(page.getByLabel("Workflow name", { exact: true })).toHaveValue("Untitled workflow")
  const picker = page.getByRole("combobox", { name: "Saved workflow", exact: true })
  expect(await picker.locator("optgroup").evaluateAll(groups => groups.map(group => group.getAttribute("label")))).toEqual(["Platypus preset", "Your organization"])
  await expect(picker.locator('optgroup[label="Platypus preset"] option')).toHaveText([/^Speaker series( · Draft)?$/])
  await expect(picker.locator('optgroup[label="Your organization"] option')).toContainText(["Untitled workflow · Draft"])
  const more = menuTrigger(page, "More")
  await more.click()
  await expect(more).toHaveAttribute("aria-expanded", "true")
  const menu = page.getByTestId("workflow-settings").getByRole("menu")
  await expect(menu.getByRole("menuitem")).toHaveText(["Duplicate workflow", "Use by default", "Apply role teams", "Teams"])
  await expect(menu.getByRole("menuitem").first()).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(menu).toHaveCount(0)
  await expect(more).toBeFocused()
  await expect(more).toHaveAttribute("aria-expanded", "false")
})

test("the Workflow tab has no page-level sideways scroll and no serious axe issues with a branch open", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await open(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const lane = (await laneIds(page))[0]
  const details = await openBranch(page, lane)
  await expect(details.getByRole("combobox", { name: "Team", exact: true })).toBeVisible()
  await expect(branchPill(page, lane)).toHaveAttribute("aria-pressed", "true")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const axe = await new AxeBuilder({ page }).include("[data-testid='workflow-settings']").include("[data-testid='workflow-builder-details']").withTags(["wcag2a", "wcag2aa"]).analyze()
  expect(axe.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([])
  await page.screenshot({ path: test.info().outputPath("workflow-branch-open.png"), fullPage: false })
})
