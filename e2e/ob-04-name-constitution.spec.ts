import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { openMore } from "./helpers"

// OB-04: the founder Name screen and the constitution reading. The constitution endpoint is mocked; nothing real is sent anywhere.
// FB-2 (ob-5): the constitution is no longer a screen of its own but the folded section "Fill roles from your constitution (optional)" at the top of
// the Team screen, and the mission moved from the old Goals screen to the Name screen.
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
const TEAM = "/#/welcome/founder/team"
const MISSION = "Help students build things together."
/** The constitution section on the Team screen; `open` unfolds it (it starts folded when no document is chosen). */
const section = (page: Page) => page.getByTestId("constitution-section")
async function openConstitution(page: Page) {
  await page.goto(TEAM)
  const toggle = page.getByRole("button", { name: "Fill roles from your constitution (optional)" })
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
}
/** Words in the constitution section only (the Team screen around it has its own word check in ob-05). */
const sectionWords = async (page: Page) => words(await section(page).innerText())

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
    await page.getByRole("textbox", { name: "Mission" }).fill(MISSION)                  // FB-2: the mission is on this screen now
    await input.press("Enter")
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
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
    await page.getByRole("textbox", { name: "Mission" }).fill(MISSION)
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByLabel("Club name")).toHaveValue("Desert Founders Society")
  })
  // FB-2 moved this here from the old Goals screen (e2e/ob-05): same rule, same messages.
  test("the mission is required, limited to 300 characters, explained by a Why line, and kept", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    await page.getByLabel("Club name").fill("Desert Founders Society")
    const mission = page.getByRole("textbox", { name: "Mission" })
    await expect(mission).toHaveValue("")
    await expect(page.locator("#ob-mission-why")).toHaveText("Why: Used in every reminder: why the work matters.")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toHaveText("Add a mission to continue.")
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
    await mission.fill("   ")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toHaveText("Add a mission to continue.")
    await mission.fill("x".repeat(400))
    expect((await mission.inputValue()).length).toBe(300)
    await mission.fill("Help students build things.")
    await expect(page.getByRole("alert")).toHaveCount(0)
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("textbox", { name: "Mission" })).toHaveValue("Help students build things.")
  })
  test("the title has its Why line", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    await expect(page.locator(".ob-name-head .ob-why")).toHaveText("Why: Your club's name goes on every reminder and handoff note.")
  })
  test("few words (90 at most, FB-2), no accessibility problems, no sideways scroll, dark mode too", async ({ page }) => {
    await page.goto("/#/welcome/founder/name")
    expect(words(await mainText(page))).toBeLessThanOrEqual(90)
    expect(await scan(page)).toEqual([])
    await page.getByLabel("Club name").fill("Desert Founders Society")
    await page.getByRole("button", { name: "Continue" }).click()                      // the mission message is on screen too
    await expect(page.getByRole("alert")).toBeVisible()
    expect(words(await mainText(page))).toBeLessThanOrEqual(90)
    expect(await scan(page)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
  })
})

test.describe("Constitution (a folded section of the Team screen)", () => {
  test("Use sample: AI reads in the background, Continue works at once, and the reading finishes after leaving the screen", async ({ page }) => {
    await mockAi(page, 700)
    await openConstitution(page)
    expect(await sectionWords(page)).toBeLessThanOrEqual(40)
    await expect(page.locator(".ob-const-option").first()).toContainText("Use sample")      // the sample is first
    await expect(page.locator(".ob-const-option").first()).toContainText("Recommended")
    await expect(page.locator(".ob-const-option").first()).toContainText("Fictional example only")
    expect(sent).toEqual([])                                                  // nothing is sent before a choice
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("constitution-chip")).toContainText("Sample constitution")
    await expect(page.getByRole("status")).toContainText("Reading officer titles…")
    expect(await sectionWords(page)).toBeLessThanOrEqual(40)
    await page.getByRole("button", { name: "Continue" }).click()               // no waiting
    await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
    await expect.poll(() => sent.map(s => s.part), { timeout: 15_000 }).toEqual(["structure", "duties"])
    await page.goBack()
    await expect(page.getByRole("button", { name: "Fill roles from your constitution (optional)" })).toHaveAttribute("aria-expanded", "true")   // a chosen document opens the section
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI. Check each line.", { timeout: 15_000 })
    expect(sent.length).toBe(2)                                               // coming back does not read again
  })
  test("leaving for the Name screen and returning does not restart or lose the reading", async ({ page }) => {
    await mockAi(page, 400)
    await openConstitution(page)
    await page.getByRole("button", { name: /Use sample/ }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
    await page.getByLabel("Club name").fill("Desert Founders Society")
    await page.getByRole("textbox", { name: "Mission" }).fill(MISSION)
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByTestId("constitution-chip")).toBeVisible()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI. Check each line.", { timeout: 15_000 })
    expect(sent.map(s => s.part)).toEqual(["structure", "duties"])
  })
  test("Upload a file: the button opens the file picker from the keyboard, a .txt is read in the browser, and no email or phone is sent", async ({ page }) => {
    await mockAi(page)
    await openConstitution(page)
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
    await page.getByTestId("constitution-chip").getByRole("button", { name: "Remove" }).click()   // choosing again is possible (each role row has its own Remove too)
    await expect(page.getByRole("button", { name: /Use sample/ })).toBeVisible()
  })
  // ob-5: there is no Constitution step to skip. The section starts folded and reads nothing until a choice; the standard roles stay.
  test("the section starts folded, offers nothing to read until it is opened, and sends nothing", async ({ page }) => {
    await mockAi(page)
    await page.goto(TEAM)
    await expect(page.getByRole("button", { name: "Fill roles from your constitution (optional)" })).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByRole("button", { name: /Use sample/ })).toHaveCount(0)
    await expect(page.getByRole("textbox", { name: "Role 1" })).toHaveValue("President")
    await page.getByRole("button", { name: "Skip for now" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
    const dot = page.getByRole("list", { name: "Walkthrough progress" }).locator("li.is-skipped")
    await expect(dot).toHaveCount(1)
    await expect(dot).toContainText("Team")
    expect(sent).toEqual([])
  })
  test("choosing a document after skipping Team, then Continue, takes Team off the skipped list", async ({ page }) => {
    await mockAi(page)
    await page.goto(TEAM)
    await page.getByRole("button", { name: "Skip for now" }).click()
    await page.goBack()
    await page.getByRole("button", { name: "Fill roles from your constitution (optional)" }).click()
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15_000 })
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).locator("li.is-skipped")).toHaveCount(0)
  })
  test("when AI fails the new message is shown, without any HTTP status code, and the reading falls back to this browser", async ({ page }) => {
    await page.route("**/api/setup/constitution", r => r.fulfill({ status: 500, json: { message: "HTTP 500 upstream" } }))
    await openConstitution(page)
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
    await page.evaluate(() => { location.hash = "#/welcome/founder/team" })
    await page.getByRole("button", { name: "Fill roles from your constitution (optional)" }).click()
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("read in your browser", { timeout: 15_000 })
    expect(sent).toEqual([])
  })
  test("choosing an option adds no movement: only colour changes", async ({ page }) => {
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
    await openConstitution(page)
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Paste text" }).click()
    expect(await scan(page)).toEqual([])
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Paste text" }).click()
    await page.getByRole("button", { name: /Use sample/ }).click()
    await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15_000 })
    expect(await sectionWords(page)).toBeLessThanOrEqual(40)
    expect(await scan(page)).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
})
