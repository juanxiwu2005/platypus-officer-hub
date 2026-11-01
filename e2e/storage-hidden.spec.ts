import { expect, test } from "@playwright/test"

// M1 (Juanxi 2026-10-27): the shipped build hides server storage. No screen may reach it, and no
// request may go to the storage endpoints. (The endpoints themselves answer 404; see
// src/test/serverStorageHidden.test.ts.)
const STORAGE = /\/api\/(org\/|workspace)/

test("no screen reaches server storage: the main pages never link to /phase1, and /phase1 stays local", async ({ page }) => {
  const storageRequests: string[] = []
  page.on("request", r => { if (STORAGE.test(r.url())) storageRequests.push(r.url()) })

  for (const path of ["/", "/events", "/tasks", "/team", "/funding", "/handoff", "/partners", "/rules", "/settings", "/help", "/setup"]) {
    await page.goto(`/#${path}`)
    await expect(page.locator("main").first()).toBeVisible()
    await expect(page.locator('a[href*="phase1"]')).toHaveCount(0)
  }

  // Without ?example=1 the stored build opens the live workspace; the hidden build shows the local example.
  await page.goto("/#/phase1/")
  await expect(page.getByRole("heading", { name: /A little less coordinating/ })).toBeVisible()
  // Online setup sends you to the local setup instead.
  await page.goto("/#/phase1/setup")
  await expect(page).toHaveURL(/#\/phase1\/setup-legacy$/)
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible()

  expect(storageRequests).toEqual([])
})
