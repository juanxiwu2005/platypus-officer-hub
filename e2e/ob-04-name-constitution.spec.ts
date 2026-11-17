import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { openMore } from "./helpers"

// OB-04: founder flow screens 1 and 2 (Name, Constitution). The constitution endpoint is mocked; nothing real is sent anywhere.
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)
const REPLY = {
  mission: "Help students build real startups with real founders.",
  roles: [
    { title: "President", reportsTo: null, isAdvisor: false },
    { title: "Director of Marketing", reportsTo: "President", isAdvisor: false },
    { title: "Treasurer", reportsTo: "President", isAdvisor: false },
  ],
  notes: [],
}
const DUTIES = { items: [{ name: "President", duties: "Leads the club." }, { name: "Director of Marketing", duties: "Leads promotion." }, { name: "Treasurer", duties: "Keeps the budget." }] }
const words = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length   // a lone dash or dot is not a word
const mainText = (page: Page) => page.locator("main").innerText()

let forbidden: string[] = []
let sent: Record<string, unknown>[] = []
test.beforeEach(async ({ page }) => {
  forbidden = []; sent = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) forbidden.push(r.url()) })
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})
test.afterEach(() => { expect(forbidden, "the walkthrough must not call /api/org or /api/workspace").toEqual([]) })

/** Answer the constitution endpoint like the real one: structure first, then duties. `wait` slows each answer down. */
async function mockAi(page: Page, wait = 0) {
  await page.route("**/api/setup/constitution", async r => {
    const body = r.request().postDataJSON(); sent.push(body)
    if (wait) await new Promise(res => setTimeout(res, wait))
    await r.fulfill({ json: { ...(body.part === "duties" ? DUTIES : REPLY), model: "mock", provider: "mock" } })
  })
}

test.describe("Name", () => {
  test("Continue is off while the name is empty, the preview follows the typing, and Enter continues", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    const next = page.getByRole("button", { name: "Continue" })
    await page.getByLabel("Club name").fill("")                                // the demo club's name is pre-filled: clear it
    await expect(next).toBeDisabled()
    await expect(page.getByRole("button", { name: /skip/i })).toHaveCount(0)     // the name is required: no Skip
    const preview = page.getByTestId("name-preview")
    await expect(preview).toContainText("Your club")
    const input = page.getByLabel("Club name")
    await input.fill("   ")
    await expect(next).toBeDisabled()                                          // spaces are not a name
    await input.fill("Desert Founders Society")
    await expect(preview).toContainText("Desert Founders Society")
    await expect(next).toBeEnabled()
    await input.press("Enter")
    await expect(page).toHaveURL(/#\/welcome\/founder\/constitution$/)
  })
  test("the school is a fixed small label with an explanation, and the name stops at 80 characters", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    await expect(page.locator("main")).toContainText("ASU Tempe")
    await expect(page.getByRole("textbox", { name: /school/i })).toHaveCount(0)
    await page.getByRole("button", { name: "School" }).click()                 // hover on a desktop, tap on a phone
    await expect(page.getByText("so the school is fixed")).toBeVisible()
    await page.getByLabel("Club name").fill("x".repeat(120))
    await expect(page.getByLabel("Club name")).toHaveValue("x".repeat(80))
  })
  test("the name reaches the draft: Back from the next screen shows it again", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    await page.getByLabel("Club name").fill("Desert Founders Society")
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByLabel("Club name")).toHaveValue("Desert Founders Society")
  })
  test("few words, no accessibility problems, no sideways scroll, dark mode too", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    expect(words(await mainText(page))).toBeLessThanOrEqual(40)
    expect(await scan(page)).toEqual([])
    await page.getByLabel("Club name").fill("Desert Founders Society")
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
  })
})

test.describe("Constitution", () => {
  test("Use sample: AI reads in the background, Continue works at once, and the reading finishes after leaving the screen", async ({ page }) => {
    await mockAi(page, 700)
    await page.goto("/#/welcome/founder/constitution")
    expect(words(await mainText(page))).toBeLessThanOrEqual(40)
    await expect(page.locator(".ob-const-option").first()).toContainText("Use sample")      // the sample is first
    await expect(page.locator(".ob-const-option").first()).toContainText("Recommended")
    await expect(page.locator(".ob-const-option").first()).toContainText("Fictional example only")
    expect(sent).toEqual([])                                                  // nothing is sent before a choice
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("constitution-chip")).toContainText("Sample constitution")
    await expect(page.getByRole("status")).toContainText("Reading officer titles…")
    expect(words(await mainText(page))).toBeLessThanOrEqual(40)
    await page.getByRole("button", { name: "Continue" }).click()               // no waiting
    await expect(page).toHaveURL(/#\/welcome\/founder\/goals$/)
    await expect.poll(() => sent.map(s => s.part), { timeout: 15_000 }).toEqual(["structure", "duties"])
    await page.goBack()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI. Check each line.", { timeout: 15_000 })
    expect(sent.length).toBe(2)                                               // coming back does not read again
  })
  test("leaving for the Name screen and returning does not restart or lose the reading", async ({ page }) => {
    await mockAi(page, 400)
    await page.goto("/#/welcome/founder/constitution")
    await page.getByRole("button", { name: /Use sample/ }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
    await page.getByLabel("Club name").fill("Desert Founders Society")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByTestId("constitution-chip")).toBeVisible()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI. Check each line.", { timeout: 15_000 })
    expect(sent.map(s => s.part)).toEqual(["structure", "duties"])
  })
  test("Upload a file: the button opens the file picker from the keyboard, a .txt is read in the browser, and no email or phone is sent", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/welcome/founder/constitution")
    const upload = page.getByRole("button", { name: "Upload a file" })
    await upload.focus()
    const chooser = page.waitForEvent("filechooser")
    await page.keyboard.press("Enter")
    await (await chooser).setFiles({ name: "constitution.txt", mimeType: "text/plain", buffer: Buffer.from("The President leads the club. The Director of Marketing leads promotion. Contact boss@example.org or call 480-555-0107.") })
    await expect(page.getByTestId("constitution-chip")).toContainText("constitution.txt")
    await expect.poll(() => sent.length, { timeout: 15_000 }).toBeGreaterThan(0)
    const body = JSON.stringify(sent)
    expect(body).not.toContain("boss@example.org"); expect(body).not.toContain("480-555-0107")
    expect(body).toContain("[contact redacted]")
    expect(Object.keys(sent[0]).sort()).toEqual(["part", "text"])
  })
  test("Paste text: the box opens on demand, short text is refused, then the text is used", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/welcome/founder/constitution")
    await expect(page.getByLabel("Constitution text")).toHaveCount(0)
    await page.getByRole("button", { name: "Paste text" }).click()
    const use = page.getByRole("button", { name: "Use this text" })
    await expect(use).toBeDisabled()
    await page.getByLabel("Constitution text").fill("The President leads the club. The Treasurer keeps the budget.")
    await expect(use).toBeEnabled()
    await use.click()
    await expect(page.getByTestId("constitution-chip")).toContainText("Pasted constitution.txt")
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15_000 })
    await page.getByRole("button", { name: "Remove" }).click()                  // choosing again is possible
    await expect(page.getByRole("button", { name: /Use sample/ })).toBeVisible()
  })
  test("Skip leaves a hollow dashed dot, reads nothing, and says where to add it later", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/welcome/founder/constitution")
    await expect(page.getByText("You can add this later in Settings.")).toBeVisible()
    await page.getByRole("button", { name: "Skip — use standard roles" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/goals$/)
    const dot = page.getByRole("list", { name: "Walkthrough progress" }).locator("li.is-skipped")
    await expect(dot).toHaveCount(1)
    await expect(dot).toContainText("Constitution")
    expect(await dot.locator(".ob-dot-mark").evaluate(el => getComputedStyle(el).borderTopStyle)).toBe("dashed")
    expect(sent).toEqual([])
  })
  test("choosing a document after skipping takes the step off the skipped list", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/welcome/founder/constitution")
    await page.getByRole("button", { name: "Skip — use standard roles" }).click()
    await page.goBack()
    await page.getByRole("button", { name: /Use sample/ }).click()
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).locator("li.is-skipped")).toHaveCount(0)
  })
  test("when AI fails the new message is shown, without any HTTP status code, and the reading falls back to this browser", async ({ page }) => {
    await page.route("**/api/setup/constitution", r => r.fulfill({ status: 500, json: { message: "HTTP 500 upstream" } }))
    await page.goto("/#/welcome/founder/constitution")
    await page.getByRole("button", { name: /Use sample/ }).click()
    const note = page.getByTestId("reading-note")
    await expect(note).toContainText("We couldn't use AI just now, so we read it here in your browser instead. Check each line.", { timeout: 20_000 })
    expect(await page.locator("main").innerText()).not.toMatch(/HTTP|\b[45]\d\d\b/)
    await expect(page.getByRole("button", { name: "Try AI again" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled()
  })
  test("when AI is off, the text is read in the browser and nothing is sent", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/")
    await openMore(page)
    await page.getByRole("checkbox", { name: "AI features" }).uncheck()
    await page.evaluate(() => { location.hash = "#/welcome/founder/constitution" })
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("read in your browser", { timeout: 15_000 })
    expect(sent).toEqual([])
  })
  test("choosing an option adds no movement: only colour changes", async ({ page }) => {
    await page.goto("/#/welcome/founder/constitution")
    const style = await page.locator(".ob-const-option").first().evaluate(el => { const s = getComputedStyle(el); return { property: s.transitionProperty, transform: s.transform } })
    expect(style.property).not.toMatch(/all|transform|top|left|width|height|margin|padding/)
    expect(style.transform).toBe("none")
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const press = await page.locator(".ob-const-option").first().evaluate(el => getComputedStyle(el).transitionProperty)
    expect(press).toBe(style.property)
  })
  test("no accessibility problems in either state, in light and dark", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/welcome/founder/constitution")
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Paste text" }).click()
    expect(await scan(page)).toEqual([])
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Paste text" }).click()
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15_000 })
    expect(words(await mainText(page))).toBeLessThanOrEqual(40)
    expect(await scan(page)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
})
