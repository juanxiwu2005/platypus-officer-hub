import { expect, test, type TestInfo } from "@playwright/test"
import { writeFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { viewAs } from "./helpers"

async function attachJson(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(name)
  await writeFile(path, JSON.stringify(value, null, 2))
  await info.attach(name, { path, contentType: "application/json" })
}

const DEFERRED = /\/(?:PhaseOne|OnlineSetup|pdf(?:[.-]|$)|mammoth)[^/]*\.(?:js|mjs)(?:\?|$)/i

test("Today ships a small entry and requests no PhaseOne, organization setup or PDF implementation", async ({ page }, info) => {
  const scripts: string[] = []
  page.on("request", request => {
    if (/\.(?:js|mjs)(?:\?|$)/.test(request.url())) scripts.push(request.url())
  })
  await page.goto("/#/")
  await expect(page.getByTestId("risk-list")).toBeVisible()
  await page.waitForLoadState("networkidle")
  expect(scripts.filter(url => DEFERRED.test(url))).toEqual([])
  const entryUrl = await page.locator('script[type="module"][src]').getAttribute("src")
  expect(entryUrl).toBeTruthy()
  const entry = await page.request.get(entryUrl!)
  const bytes = (await entry.body()).byteLength
  expect(bytes).toBeLessThan(500_000)
  const initialScripts = await Promise.all([...new Set(scripts)].map(async url => ({ url, bytes: (await (await page.request.get(url)).body()).byteLength })))
  const totalInitialJsBytes = initialScripts.reduce((total, script) => total + script.bytes, 0)
  // Home interactions remain immediately available without a route download.
  await viewAs(page, "maya")
  await expect(page.getByTestId("view-as")).toHaveValue("maya")
  await attachJson(info, "initial-network.json", { entryUrl, entryBytes: bytes, totalInitialJsBytes, initialScripts })
})

test("a delayed PhaseOne route announces loading with visible content before it resolves", async ({ page }, info) => {
  let release!: () => void
  let requested!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const started = new Promise<void>(resolve => { requested = resolve })
  await page.route(/\/assets\/PhaseOne-[^/]+\.js$/, async route => {
    requested()
    await gate
    await route.continue()
  })
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  try {
    await page.goto("/#/phase1", { waitUntil: "domcontentloaded" })
    await started
    const status = page.getByRole("status")
    await expect(status).toHaveText("Opening your workspace…")
    await expect(status).toHaveAttribute("aria-live", "polite")
    await expect(page.getByRole("main", { name: "Loading workspace" })).toBeVisible()
    await expect(page.getByRole("main")).toHaveCount(1)
    const bounds = await page.locator(".route-loading").boundingBox()
    expect(bounds!.height).toBeGreaterThanOrEqual(320)
    const accessibility = await new AxeBuilder({ page }).include(".route-loading").withTags(["wcag2a", "wcag2aa"]).analyze()
    expect(accessibility.violations).toEqual([])
    const screenshot = info.outputPath("phase1-loading.png")
    await page.screenshot({ path: screenshot })
    await info.attach("phase1-loading.png", { path: screenshot, contentType: "image/png" })
  } finally {
    release()
  }
  await expect(page.getByRole("heading", { name: /A little less coordinating/ })).toBeVisible()
  expect(errors).toEqual([])
})

test("PhaseOne supports a direct hash, refresh and browser Back/Forward", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("/#/")
  await expect(page.getByTestId("risk-list")).toBeVisible()
  await page.goto("/#/phase1")
  await expect(page.getByRole("heading", { name: /A little less coordinating/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("heading", { name: /A little less coordinating/ })).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId("risk-list")).toBeVisible()
  await page.goForward()
  await expect(page.getByRole("heading", { name: /A little less coordinating/ })).toBeVisible()
  expect(errors).toEqual([])
})

test("PDF code and its worker load only after selecting a PDF", async ({ page }, info) => {
  const scripts: string[] = []
  page.on("request", request => {
    if (/\.(?:js|mjs)(?:\?|$)/.test(request.url())) scripts.push(request.url())
  })
  // The file is parsed locally. No AI action is needed to read a PDF.
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline bundle check" } }))
  await page.goto("/#/setup")
  await expect(page.getByLabel("Constitution file", { exact: true })).toBeVisible()
  await page.waitForLoadState("networkidle")
  expect(scripts.filter(url => /\/pdf[.-]/i.test(url))).toEqual([])
  await page.getByLabel("Constitution file", { exact: true }).setInputFiles("public/organization/fictional-constitution.pdf")
  await expect(page.getByTestId("constitution-chip")).toContainText("fictional-constitution.pdf")
  expect(scripts.some(url => /\/pdf-[^/]+\.js/.test(url))).toBe(true)
  expect(scripts.some(url => /\/pdf\.worker\.min-[^/]+\.mjs/.test(url))).toBe(true)
  await attachJson(info, "pdf-network.json", scripts)
})
