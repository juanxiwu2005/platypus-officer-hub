import { expect, type Page } from "@playwright/test"
import { onboardingCopy as c } from "../src/onboarding/copy"

export const continueSetup = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
/** Every public setup entrance uses Start's founder screens. Stops on screen 1 (name and first event) with the name typed. */
export async function openSetup(page: Page, name = "Fictional Launch Club", path = "/#/setup") {
  await page.goto(path)
  await page.getByLabel(c.founder.name.field, { exact: true }).fill(name)
}
/** On screen 1: pick an example sentence and press Plan it; waits for the chain. */
export async function planEvent(page: Page, example = "Spring dinner") {
  await page.getByRole("button", { name: example, exact: true }).click()
  await page.getByRole("button", { name: c.founder.firstEvent.cta, exact: true }).click()
  await expect(page.locator(".ob6-chain")).toBeVisible()
}
/** Screen 1 → Team (ob-6): the name, then a planned first event (or Skip for now when `event` is false). */
export async function setupToTeam(page: Page, name?: string, event = true) {
  await openSetup(page, name)
  if (event) { await planEvent(page); await continueSetup(page) }
  else await page.getByRole("button", { name: c.skip, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
}
/** Start workspace on Team (Confirm's job up to ob-5), then Invite → Go to Reminders. */
export async function finishSetup(page: Page) {
  await page.getByRole("button", { name: c.founder.team.start, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  await page.getByRole("button", { name: c.founder.invite.today, exact: true }).click()
  await expect(page.locator("main h1")).toHaveText("Reminders")
}
/** Team: open "Import roles from your constitution" (the Constitution screen up to ob-5). */
export async function openConstitution(page: Page) {
  const open = page.getByRole("button", { name: c.founder.constitution.open, exact: true })
  if (await open.getAttribute("aria-expanded") !== "true") await open.click()
  await expect(page.getByTestId("constitution-import")).toBeVisible()
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
