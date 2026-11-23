import { expect, test, type Page } from "@playwright/test"
import { seedDemo } from "../src/data/seed"
import { clubDraft } from "../src/data/settings"
import { freshDraft } from "../src/onboarding/draft"
import { onboardingRecord } from "./ob-helpers"
import { continueSetup } from "./setupHelpers"

const readDocs = (page: Page) => page.evaluate(() => new Promise<Record<string, { value: unknown }>>(resolve => {
  const req = indexedDB.open("platypus.docs", 1)
  req.onsuccess = () => {
    const db = req.result, read = db.transaction("docs").objectStore("docs").getAll()
    read.onsuccess = () => { db.close(); resolve(Object.fromEntries(read.result.map(r => [r.id, r]))) }
  }
}))
async function seedDrafts(page: Page) {
  await page.goto("/#/settings")
  await expect(page.locator("main h1")).toHaveText("Settings")
  const state = seedDemo("2026-10-22"), old = clubDraft(state)
  old.name = "Fictional restored club"; old.roles[0].duties = "Edited president duties"
  const base = freshDraft(state)
  const steps = base.steps.map(s => s.key === "budget" ? { ...s, title: "Saved budget workflow" } : s)
  const source = { v: 1, step: 2, draft: old, steps, buffer: 5, sentence: "Plan Saved Dinner on Dec 3, 30 people", doc: { fileName: "saved.txt", text: "President leads the fictional club.", checksum: "saved-constitution" } }
  const canonical = { ...base, doc: { fileName: "other.txt", text: "An unfinished earlier reading.", checksum: "other-constitution" }, tab: "previous-tab", club: { ...base.club, name: "Another unfinished draft" } }
  await page.evaluate(({ source, canonical }) => new Promise<void>(resolve => {
    sessionStorage.setItem("platypus.v1.onboarding.draft", canonical.tab)
    const req = indexedDB.open("platypus.docs", 1)
    req.onupgradeneeded = () => req.result.createObjectStore("docs", { keyPath: "id" })
    req.onsuccess = () => {
      const db = req.result, tx = db.transaction("docs", "readwrite"), s = tx.objectStore("docs")
      for (const [id, value] of [["setup-draft", source], ["onboarding-draft", canonical]]) s.put({ id, kind: "json", savedAt: new Date().toISOString(), value })
      tx.oncomplete = () => { db.close(); resolve() }
    }
  }), JSON.parse(JSON.stringify({ source, canonical })))
  return source
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 503, json: {} }))
})

for (const entry of ["/#/setup", "/#/welcome/classic", "/#/welcome/setup"]) {
  test(`${entry} uses the Start founder screens and keeps setup outside the study record`, async ({ page }) => {
    await page.goto(entry)
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByRole("listitem")).toHaveCount(7)
    await page.getByLabel("Club name").fill("Fictional same guide")
    await continueSetup(page)
    await page.getByRole("button", { name: "Skip — use standard roles", exact: true }).click()
    await page.getByRole("textbox", { name: "Mission", exact: true }).fill("Build together.")
    await continueSetup(page)
    await expect(page.locator(".ob-role-list")).toBeVisible()
    await expect(page.getByRole("textbox", { name: /Email|Phone|ASU ID/ })).toHaveCount(0)
    await expect(page.locator(".ob-role-duties")).toHaveCount(0)
    expect((await onboardingRecord(page)).attempts).toHaveLength(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
}

test("Settings Replay setup opens the same guide", async ({ page }) => {
  await page.goto("/#/settings")
  await page.getByRole("link", { name: "Replay setup", exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.locator("main h1")).toHaveText("Name your club")
})

test("legacy setup continues with duties, document, workflow and both original drafts preserved", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", r => { calls++; return r.fulfill({ status: 503, json: {} }) })
  const source = await seedDrafts(page)
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  await page.goto("/#/setup")
  await page.getByRole("button", { name: "Continue saved setup", exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.locator(".ob-role").first().getByRole("button", { name: "Edit duties", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Duties 1", exact: true })).toHaveValue("Edited president duties")
  const docs = await readDocs(page)
  expect(docs["setup-draft"].value).toEqual(source)
  expect(Object.values(docs).some(r => (r.value as { club?: { name: string } }).club?.name === "Another unfinished draft")).toBe(true)
  expect(docs["onboarding-draft"].value).toMatchObject({ steps: source.steps, buffer: 5, doc: source.doc })
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  await page.reload()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await expect(page.getByTestId("constitution-chip")).toContainText("saved.txt")
  expect(calls).toBe(0)
})

test("a failed continuation commits neither draft replacement nor backup; retry works", async ({ page }) => {
  await seedDrafts(page)
  await page.goto("/#/setup")
  await expect(page.getByRole("button", { name: "Continue saved setup", exact: true })).toBeVisible()
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      if (value.id === "onboarding-draft") throw new Error("Fictional draft write failure")
      return put.call(this, value, key)
    }
  })
  await page.getByRole("button", { name: "Continue saved setup", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("Your drafts are still kept")
  const docs = await readDocs(page)
  expect(docs["onboarding-draft"].value).toMatchObject({ club: { name: "Another unfinished draft" } })
  expect(Object.keys(docs).filter(k => k.startsWith("onboarding-draft-backup-"))).toHaveLength(0)
  await page.reload()
  await page.getByRole("button", { name: "Continue saved setup", exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
})
