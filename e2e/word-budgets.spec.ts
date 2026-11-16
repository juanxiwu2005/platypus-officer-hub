import { expect, test, type Page } from "@playwright/test"
import { POLICY_CATALOG } from "../src/data/policyCatalog"
import { fmtShort } from "../src/lib/dates"
import { savedDemo } from "./demo-contract"
import { closeRail, noOverflow } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
})

/** Every source the page lists for the current tab, in order. A computer lists them all at once; a phone has Previous / Next, six at a time. */
async function sourcePages(page: Page) {
  await expect(page.locator("[data-policy-id]").first()).toBeVisible()
  const seen: string[] = []
  const nav = page.getByRole("navigation", { name: "Source pages", exact: true })
  const paged = await nav.count() > 0
  const next = nav.getByRole("button", { name: "Next", exact: true })
  for (;;) {
    const records = page.locator("[data-policy-id]")
    if (paged) expect(await records.count()).toBeLessThanOrEqual(6)
    seen.push(...await records.evaluateAll(rows => rows.map(row => row.getAttribute("data-policy-id")!)))
    if (!paged || await next.isDisabled()) break
    await next.focus()
    await page.keyboard.press("Enter")
  }
  expect(new Set(seen).size).toBe(seen.length)
  return seen
}

test("Rules: a computer lists all 64 sources with no pages; a phone keeps Previous and Next", async ({ page, isMobile }) => {
  await page.goto("/#/rules")
  await closeRail(page)
  await expect(page.locator("[data-policy-id]").first()).toBeVisible()
  const nav = page.getByRole("navigation", { name: "Source pages", exact: true })
  if (isMobile) {
    await expect(nav).toBeVisible()
    expect(await page.locator("[data-policy-id]").count()).toBe(6)
    // The link and the Ask button are the same size with the icon in the middle (the link used to be taller, with its icon in the corner).
    const boxes = await page.locator("[data-policy-id]").first().locator(".rule-actions .icon-btn").evaluateAll(els => els.map(el => {
      const b = el.getBoundingClientRect(), v = el.querySelector("svg")!.getBoundingClientRect()
      return { w: Math.round(b.width), h: Math.round(b.height), dx: Math.round((v.x + v.width / 2) - (b.x + b.width / 2)), dy: Math.round((v.y + v.height / 2) - (b.y + b.height / 2)) }
    }))
    expect(boxes).toHaveLength(2)
    expect(boxes[0].w).toBe(boxes[1].w)
    expect(boxes[0].h).toBe(boxes[1].h)
    for (const b of boxes) { expect(Math.abs(b.dx)).toBeLessThanOrEqual(1); expect(Math.abs(b.dy)).toBeLessThanOrEqual(1) }
  } else {
    await expect(nav).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^(Previous|Next)$/ })).toHaveCount(0)
    await expect(page.locator("[data-policy-id]")).toHaveCount(POLICY_CATALOG.length)
    await expect(page.getByRole("status").filter({ hasText: `${POLICY_CATALOG.length} sources` })).toBeVisible()
  }
})

test("Rules keyboard browsing reaches every source through All and each category", async ({ page }) => {
  await page.goto("/#/rules")
  await closeRail(page)
  expect(await sourcePages(page)).toEqual(POLICY_CATALOG.map(source => source.recordId))
  const categories = page.getByRole("group", { name: "Policy category", exact: true }).getByRole("button")
  for (let index = 1; index < await categories.count(); index++) {
    const category = categories.nth(index)
    await category.focus()
    await page.keyboard.press("Space")
    await expect(category).toHaveAttribute("aria-pressed", "true")
    const label = (await category.innerText()).toLowerCase()
    const id = label === "access" ? "accessibility" : label
    expect(await sourcePages(page)).toEqual(POLICY_CATALOG.filter(source => source.category === id).map(source => source.recordId))
  }
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("Rules search finds archived records and keyboard controls open sources and Ask", async ({ page, context }) => {
  await page.route("**/api/policy-answer", r => r.fulfill({ json: { inScope: true, answer: "Registry requirements from the checked source.", citations: ["ASU-R-010"], model: "mock", provider: "mock" } }))
  await context.route("https://eventreg.asu.edu/", r => r.fulfill({ contentType: "text/html", body: "<h1>Official Registry test destination</h1>" }))
  await page.goto("/#/rules")
  await closeRail(page)
  const search = page.getByRole("searchbox", { name: "Search sources", exact: true })
  const last = POLICY_CATALOG.at(-1)!
  await search.fill(last.recordId)
  await expect(page.locator("[data-policy-id]")).toHaveCount(1)
  await expect(page.locator("[data-policy-id]")).toHaveAttribute("data-policy-id", last.recordId)
  await search.fill("ASU-R-010")
  const source = page.locator('[data-policy-id="ASU-R-010"]')
  await expect(source).toHaveAttribute("data-source-file", "PLAN_E01_ASU_Event_Registry_2026-10-29.txt")
  await source.getByRole("link", { name: "Open source: ASU Event Registry", exact: true }).focus()
  const opened = page.waitForEvent("popup")
  await page.keyboard.press("Enter")
  const official = await opened
  await expect(official).toHaveURL("https://eventreg.asu.edu/")
  await expect(official.getByRole("heading")).toHaveText("Official Registry test destination")
  await official.close()
  await source.getByRole("button", { name: "Ask Platypus about ASU Event Registry · ASU-R-010", exact: true }).focus()
  await page.keyboard.press("Space")
  await expect(page.locator(".bubble.user").last()).toContainText("What does ASU Event Registry cover")
  await expect(page.getByTestId("rule-answer").last()).toBeVisible()
})

test("Events mounts a node description on keyboard focus with one Due, and the ASU deadline stays under Why this date", async ({ page }) => {
  await page.goto("/#/events?event=e-night")
  await closeRail(page)
  await page.getByTestId("view-flow").click()
  const demo = await savedDemo(page)
  const purchaseRequest = demo.nodes.find(node => node.eventId === "e-night" && node.stepKey === "purchaseRequest")
  expect(purchaseRequest).toBeDefined()
  const officialDeadline = purchaseRequest!.officialDeadline
  expect(officialDeadline).not.toBeNull()
  expect(officialDeadline).toBeTruthy()
  const chart = page.getByTestId("flow-chart")
  await expect(chart.locator(".m-card")).toHaveCount(0)
  const node = page.getByTestId("flow-node-purchaseRequest")
  await node.focus()
  const cardId = await node.getAttribute("aria-describedby")
  expect(cardId).toBeTruthy()
  // FB-4: the hover card shows one date, Due (the club deadline); the ASU deadline moved to the detail's "Why this date".
  await expect(page.locator(`[id="${cardId}"]`)).toContainText(`Due ${fmtShort(purchaseRequest!.clubDeadline!)}`)
  await expect(page.locator(`[id="${cardId}"]`)).not.toContainText("ASU deadline")
  await expect(chart.locator(".m-card")).toHaveCount(1)
  await page.keyboard.press("Enter")
  const detail = page.getByTestId("task-detail")
  await detail.getByText("Why this date", { exact: true }).click()
  await expect(detail.getByTestId("asu-sentence")).toContainText(`ASU needs this by ${fmtShort(officialDeadline!)}.`)
  await detail.getByText("Sources", { exact: true }).click()
  await expect(detail.getByRole("link", { name: "R09", exact: true })).toHaveAttribute("href", /^https:/)
})
