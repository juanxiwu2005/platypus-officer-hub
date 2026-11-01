import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { blankDraft } from "../src/organization/presets"

test("organization setup keeps its shell and one main landmark while its editor loads", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline loading check" } }))
  await page.route("**/api/org/setup", route => route.fulfill({ json: {
    workspaceId: "bundle-loading-fictional",
    revision: 1,
    draft: blankDraft(),
    approved: null,
    updatedAt: "2026-10-31T12:00:00Z",
    expiresAt: "2026-11-07T12:00:00Z",
  } }))
  let release!: () => void
  let requested!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { requested = resolve })
  const scripts: string[] = []
  page.on("request", request => scripts.push(request.url()))
  await page.route(/\/assets\/OnlineSetup-[^/]+\.js$/, async route => {
    requested()
    await gate
    await route.continue()
  })
  try {
    await page.goto("/#/phase1/setup", { waitUntil: "domcontentloaded" })
    await started
    await expect(page.getByRole("navigation", { name: "Workspace navigation" })).toBeVisible()
    await expect(page.getByRole("status")).toHaveText("Opening your workspace…")
    await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite")
    await expect(page.getByRole("main")).toHaveCount(1)
    const accessibility = await new AxeBuilder({ page }).include(".route-loading").withTags(["wcag2a", "wcag2aa"]).analyze()
    expect(accessibility.violations).toEqual([])
  } finally {
    release()
  }
  await expect(page.getByLabel("Organization name", { exact: true })).toBeVisible()
  await expect(page.getByRole("main")).toHaveCount(1)
  expect(scripts.some(url => /\/pdf[.-]/i.test(url))).toBe(false)
})
