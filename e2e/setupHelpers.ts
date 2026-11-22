import { expect, type Page } from "@playwright/test"
import { fillMission, passReminders } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

export const continueSetup = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
/** Every public setup entrance now uses Start's founder screens. Stops on Constitution. */
export async function openSetup(page: Page, name = "Fictional Launch Club", path = "/#/setup") {
  await page.goto(path)
  await page.getByLabel("Club name", { exact: true }).fill(name)
  await continueSetup(page)
}
export async function setupToTeam(page: Page, name?: string) {
  await openSetup(page, name)
  await page.getByRole("button", { name: c.founder.constitution.skip }).click()
  await fillMission(page)
  await continueSetup(page)
}
export async function setupToConfirm(page: Page, name?: string, event = true) {
  await setupToTeam(page, name)
  await continueSetup(page)
  if (event) {
    await page.getByRole("button", { name: "Spring dinner", exact: true }).click()
    await page.getByRole("button", { name: c.founder.firstEvent.cta, exact: true }).click()
    await continueSetup(page)
  } else await page.getByRole("button", { name: c.skip, exact: true }).click()
  await passReminders(page)
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
}
export async function finishSetup(page: Page) {
  await page.getByRole("button", { name: c.founder.confirm.start, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  await page.getByRole("button", { name: c.founder.invite.today, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
}
export const setupRole = async (page: Page, title: string) => {
  const index = await page.locator(".ob-role-title").evaluateAll((els, t) => els.findIndex(e => (e as HTMLTextAreaElement).value === t), title)
  expect(index, `Role ${title} exists`).toBeGreaterThanOrEqual(0)
  return page.locator(".ob-role").nth(index)
}

export const savedSetupDraft = (page: Page) => page.evaluate(() => new Promise<{ club: { name: string; mission: string } } | null>(resolve => {
  const req = indexedDB.open("platypus.docs", 1)
  req.onsuccess = () => {
    const db = req.result, read = db.transaction("docs").objectStore("docs").get("onboarding-draft")
    read.onsuccess = () => { db.close(); resolve(read.result?.value ?? null) }
  }
}))
