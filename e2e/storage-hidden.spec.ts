import { expect, test } from "@playwright/test"

// The retired Organization Setup and Activity workspace stored data on the server. Their screens and
// endpoints were removed; no main page may request those endpoints or link to the old /phase1 pages.
const STORAGE = /\/api\/(org\/|workspace)/

test("no screen requests the removed server storage, and old /phase1 links return to the main workspace", async ({ page }) => {
  const storageRequests: string[] = []
  page.on("request", r => { if (STORAGE.test(r.url())) storageRequests.push(r.url()) })

  for (const path of ["/", "/events", "/tasks", "/team", "/funding", "/handoff", "/partners", "/rules", "/settings", "/help", "/setup"]) {
    await page.goto(`/#${path}`)
    await expect(page.locator("main").first()).toBeVisible()
    await expect(page.locator('a[href*="phase1"]')).toHaveCount(0)
  }

  // Old bookmarks fall through to the main workspace's catch-all redirect.
  for (const path of ["/phase1/", "/phase1/setup"]) {
    await page.goto(`/#${path}`)
    await expect(page).not.toHaveURL(/phase1/)
    await expect(page.locator("main").first()).toBeVisible()
  }

  expect(storageRequests).toEqual([])
})
