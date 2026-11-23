import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { openMore } from "./helpers"
import { openConstitution } from "./setupHelpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// OB-04: the club name (screen 1 since ob-6, above the first event) and the constitution reading (inline on Team since ob-6, under
// "Import roles from your constitution"). The constitution endpoint is mocked; nothing real is sent anywhere.
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
const panelText = (page: Page) => page.getByTestId("constitution-import").innerText()
const TEAM = "/#/welcome/founder/team"
const t = c.founder.constitution

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
  test("Continue and Skip for now are off while the name is empty, spaces are not a name, and Enter continues once a plan is shown", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    const next = page.getByRole("button", { name: c.next, exact: true })
    const skip = page.getByRole("button", { name: c.skip, exact: true })
    const input = page.getByLabel(c.founder.name.field)
    await input.fill("")
    await expect(next).toBeDisabled()
    await expect(skip).toBeDisabled()                                          // Skip for now skips the event only: the name is still needed
    await input.fill("   ")
    await expect(skip).toBeDisabled()
    await input.fill("Desert Founders Society")
    await expect(skip).toBeEnabled()
    await expect(next).toBeDisabled()                                          // no plan yet
    await page.getByRole("button", { name: "Welcome mixer", exact: true }).click()
    await page.getByRole("button", { name: c.founder.firstEvent.cta, exact: true }).click()
    await expect(next).toBeEnabled()
    await input.press("Enter")
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  })
  test("no school line and no preview card any more (ob-6), and the name stops at 80 characters", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    await expect(page.getByTestId("name-preview")).toHaveCount(0)
    await expect(page.locator("main")).not.toContainText("ASU Tempe")
    await expect(page.getByRole("textbox", { name: /school/i })).toHaveCount(0)
    await page.getByLabel(c.founder.name.field).fill("x".repeat(120))
    await expect(page.getByLabel(c.founder.name.field)).toHaveValue("x".repeat(80))
  })
  test("the name reaches the draft: Back from Team shows it again", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    await page.getByLabel(c.founder.name.field).fill("Desert Founders Society")
    await page.getByRole("button", { name: c.skip, exact: true }).click()
    await page.getByRole("button", { name: c.back, exact: true }).click()
    await expect(page.getByLabel(c.founder.name.field)).toHaveValue("Desert Founders Society")
  })
  test("few words, no accessibility problems, no sideways scroll, dark mode too", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    expect(words(await mainText(page))).toBeLessThanOrEqual(40)
    expect(await scan(page)).toEqual([])
    await page.getByLabel(c.founder.name.field).fill("Desert Founders Society")
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
  })
})

test.describe("Constitution (inline on Team)", () => {
  test("the reading is closed until asked for, and opens and closes from one button", async ({ page }) => {
    await page.goto(TEAM)
    const open = page.getByRole("button", { name: t.open, exact: true })
    await expect(open).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByTestId("constitution-import")).toHaveCount(0)
    await open.click()
    await expect(open).toHaveAttribute("aria-expanded", "true")
    await expect(page.getByTestId("constitution-import")).toBeVisible()
    await open.click()
    await expect(page.getByTestId("constitution-import")).toHaveCount(0)
  })
  test("Use sample: AI reads in the background, the rows follow, and the reading finishes after the panel is closed", async ({ page }) => {
    await mockAi(page, 700)
    await page.goto(TEAM)
    await openConstitution(page)
    expect(words(await panelText(page))).toBeLessThanOrEqual(40)
    await expect(page.locator(".ob-const-option").first()).toContainText("Use sample")      // the sample is first
    await expect(page.locator(".ob-const-option").first()).toContainText("Recommended")
    await expect(page.locator(".ob-const-option").first()).toContainText("Fictional example only")
    expect(sent).toEqual([])                                                  // nothing is sent before a choice
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("constitution-chip")).toContainText("Sample constitution")
    await expect(page.getByTestId("constitution-import").getByRole("status")).toContainText("Reading officer titles…")
    expect(words(await panelText(page))).toBeLessThanOrEqual(40)
    await page.getByRole("button", { name: t.open, exact: true }).click()      // close it: no waiting
    await expect.poll(() => sent.map(s => s.part), { timeout: 15_000 }).toEqual(["structure", "duties"])
    await expect.poll(() => page.locator(".ob-role-title").evaluateAll(els => els.map(e => (e as HTMLTextAreaElement).value)), { timeout: 15_000 }).toContain("Director of Marketing")
    await openConstitution(page)
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI. Check each line.", { timeout: 15_000 })
    expect(sent.length).toBe(2)                                               // opening it again does not read again
  })
  test("going Back to screen 1 and returning does not restart or lose the reading", async ({ page }) => {
    await mockAi(page, 400)
    await page.goto(TEAM)
    await openConstitution(page)
    await page.getByRole("button", { name: /Use sample/ }).click()
    await page.getByRole("button", { name: c.back, exact: true }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
    await page.getByLabel(c.founder.name.field).fill("Desert Founders Society")
    await page.getByRole("button", { name: c.skip, exact: true }).click()
    await expect(page.getByTestId("constitution-chip")).toBeVisible()           // a chosen document opens the panel again
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI. Check each line.", { timeout: 15_000 })
    expect(sent.map(s => s.part)).toEqual(["structure", "duties"])
  })
  test("Upload a file: the button opens the file picker from the keyboard, a .txt is read in the browser, and no email or phone is sent", async ({ page }) => {
    await mockAi(page)
    await page.goto(TEAM)
    await openConstitution(page)
    const upload = page.getByRole("button", { name: "Upload a file" })
    await expect(upload).toBeEnabled()
    await upload.focus()
    await expect(upload).toBeFocused()
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.keyboard.press("Enter")])
    await chooser.setFiles({ name: "constitution.txt", mimeType: "text/plain", buffer: Buffer.from("The President leads the club. The Director of Marketing leads promotion. Contact boss@example.org or call 480-555-0107.") })
    await expect(page.getByTestId("constitution-chip")).toContainText("constitution.txt")
    await expect.poll(() => sent.length, { timeout: 15_000 }).toBeGreaterThan(0)
    const body = JSON.stringify(sent)
    expect(body).not.toContain("boss@example.org"); expect(body).not.toContain("480-555-0107")
    expect(body).toContain("[contact redacted]")
    expect(Object.keys(sent[0]).sort()).toEqual(["part", "text"])
  })
  test("Paste text: the box opens on demand, short text is refused, then the text is used", async ({ page }) => {
    await mockAi(page)
    await page.goto(TEAM)
    await openConstitution(page)
    await expect(page.getByLabel("Constitution text")).toHaveCount(0)
    await page.getByRole("button", { name: "Paste text" }).click()
    const use = page.getByRole("button", { name: "Use this text" })
    await expect(use).toBeDisabled()
    await page.getByLabel("Constitution text").fill("The President leads the club. The Treasurer keeps the budget.")
    await expect(use).toBeEnabled()
    await use.click()
    await expect(page.getByTestId("constitution-chip")).toContainText("Pasted constitution.txt")
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15_000 })
    await page.getByTestId("constitution-chip").getByRole("button", { name: "Remove" }).click()   // choosing again is possible
    await expect(page.getByRole("button", { name: /Use sample/ })).toBeVisible()
  })
  test("the note says how the text is used without contradicting itself, and no 'later in Settings' hint is left", async ({ page }) => {
    await page.goto(TEAM)
    await openConstitution(page)
    await expect(page.getByTestId("constitution-import")).toContainText(t.lead)
    await expect(page.locator("main")).not.toContainText("the text is not stored")
    await expect(page.locator("main")).not.toContainText("You can add this later in Settings.")
    await page.getByRole("button", { name: t.leadLabel }).click()
    await expect(page.getByText(t.leadMore)).toBeVisible()
  })
  test("when AI fails the new message is shown, without any HTTP status code, and the reading falls back to this browser", async ({ page }) => {
    await page.route("**/api/setup/constitution", r => r.fulfill({ status: 500, json: { message: "HTTP 500 upstream" } }))
    await page.goto(TEAM)
    await openConstitution(page)
    await page.getByRole("button", { name: /Use sample/ }).click()
    const note = page.getByTestId("reading-note")
    await expect(note).toContainText(t.aiFailed, { timeout: 20_000 })
    expect(await page.locator("main").innerText()).not.toMatch(/HTTP|\b[45]\d\d\b/)
    await expect(page.getByRole("button", { name: "Try AI again" })).toBeVisible()
    await expect(page.getByRole("button", { name: c.founder.team.start })).toBeEnabled()
  })
  test("when AI is off, the text is read in the browser and nothing is sent", async ({ page }) => {
    await mockAi(page)
    await page.goto("/#/")
    await openMore(page)
    await page.getByRole("checkbox", { name: "AI features" }).uncheck()
    await page.evaluate(() => { location.hash = "#/welcome/founder/team" })
    await openConstitution(page)
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("read in your browser", { timeout: 15_000 })
    expect(sent).toEqual([])
  })
  test("choosing an option adds no movement: only colour changes", async ({ page }) => {
    await page.goto(TEAM)
    await openConstitution(page)
    const style = await page.locator(".ob-const-option").first().evaluate(el => { const s = getComputedStyle(el); return { property: s.transitionProperty, transform: s.transform } })
    expect(style.property).not.toMatch(/all|transform|top|left|width|height|margin|padding/)
    expect(style.transform).toBe("none")
    await page.emulateMedia({ reducedMotion: "no-preference" })
    const press = await page.locator(".ob-const-option").first().evaluate(el => getComputedStyle(el).transitionProperty)
    expect(press).toBe(style.property)
  })
  test("no accessibility problems in either state, in light and dark", async ({ page }) => {
    await mockAi(page)
    await page.goto(TEAM)
    await openConstitution(page)
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Paste text" }).click()
    expect(await scan(page)).toEqual([])
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Paste text" }).click()
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15_000 })
    expect(words(await panelText(page))).toBeLessThanOrEqual(40)
    expect(await scan(page)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
})
