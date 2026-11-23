import { expect, test, type TestInfo } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import { viewAs } from "./helpers"

async function attachJson(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(name)
  await writeFile(path, JSON.stringify(value, null, 2))
  await info.attach(name, { path, contentType: "application/json" })
}

const DEFERRED = /\/(?:pdf(?:[.-]|$)|mammoth)[^/]*\.(?:js|mjs)(?:\?|$)/i

test("Today ships a small entry and requests no PDF or Word implementation", async ({ page }, info) => {
  const scripts: string[] = []
  page.on("request", request => {
    if (/\.(?:js|mjs)(?:\?|$)/.test(request.url())) scripts.push(request.url())
  })
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeAttached()   // S2: an older plan shows no card until saves upgrade on load
  await page.waitForLoadState("networkidle")
  expect(scripts.filter(url => DEFERRED.test(url))).toEqual([])
  const entryUrl = await page.locator('script[type="module"][src]').getAttribute("src")
  expect(entryUrl).toBeTruthy()
  const entry = await page.request.get(entryUrl!)
  const bytes = (await entry.body()).byteLength
  // 550,000 since 2026-11-16 (Juanxi, option A): the reminder centre home page, the task form with an owner and the one-Due helpers ship
  // in this file; the merged feedback-fix branch measured 534,408. 520,000 from 2026-11-09 (Handoff rules in the store); before that 500,000.
  expect(bytes).toBeLessThan(550_000)
  const initialScripts = await Promise.all([...new Set(scripts)].map(async url => ({ url, bytes: (await (await page.request.get(url)).body()).byteLength })))
  const totalInitialJsBytes = initialScripts.reduce((total, script) => total + script.bytes, 0)
  // Home interactions remain immediately available without a route download.
  await viewAs(page, "maya")
  await expect(page.getByTestId("view-as")).toHaveValue("maya")
  await attachJson(info, "initial-network.json", { entryUrl, entryBytes: bytes, totalInitialJsBytes, initialScripts })
})

test("PDF code and its worker load only after selecting a PDF", async ({ page }, info) => {
  const scripts: string[] = []
  page.on("request", request => {
    if (/\.(?:js|mjs)(?:\?|$)/.test(request.url())) scripts.push(request.url())
  })
  // The file is parsed locally. No AI action is needed to read a PDF.
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline bundle check" } }))
  await page.goto("/#/welcome/founder/constitution")
  await expect(page.getByRole("button", { name: "Upload a file", exact: true })).toBeVisible()
  await page.waitForLoadState("networkidle")
  expect(scripts.filter(url => /\/pdf[.-]/i.test(url))).toEqual([])
  await page.getByLabel("Constitution file", { exact: true }).setInputFiles("e2e/fixtures/fictional-constitution.pdf")
  await expect(page.getByTestId("constitution-chip")).toContainText("fictional-constitution.pdf")
  expect(scripts.some(url => /\/pdf-[^/]+\.js/.test(url))).toBe(true)
  expect(scripts.some(url => /\/pdf\.worker\.min-[^/]+\.mjs/.test(url))).toBe(true)
  await attachJson(info, "pdf-network.json", scripts)
})
