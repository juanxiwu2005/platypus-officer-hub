import { expect, test, type Page } from "@playwright/test"
import { seedDemo } from "../src/data/seed"
import { clubDraft } from "../src/data/settings"
import { freshDraft } from "../src/onboarding/draft"
import { onboardingRecord } from "./ob-helpers"

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
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByRole("listitem")).toHaveCount(3)
    await page.getByLabel("Club name").fill("Fictional same guide")
    await page.getByRole("button", { name: "Skip for now", exact: true }).click()
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

test("ob-6: an older setup draft is no longer offered (its importer was removed) and is left in this browser untouched", async ({ page }) => {
  const bodies: string[] = []
  await page.route("**/api/setup/constitution", r => { bodies.push(r.request().postData() ?? ""); return r.fulfill({ status: 503, json: {} }) })
  const source = await seedDrafts(page)
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  await page.goto("/#/setup")
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("button", { name: "Continue saved setup", exact: true })).toHaveCount(0)
  await expect(page.getByLabel("Club name")).not.toHaveValue("Fictional restored club")
  const docs = await readDocs(page)
  expect(docs["setup-draft"].value).toEqual(source)                        // kept as it was
  expect(docs["setup-draft-imported"]).toBeUndefined()
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  expect(bodies.filter(b => b.includes("President leads the fictional club.")), "the old draft's document is never read").toEqual([])
})
