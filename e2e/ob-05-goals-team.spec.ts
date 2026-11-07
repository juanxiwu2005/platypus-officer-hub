import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { fillMission } from "./ob-helpers"

// OB-05: the Goals and Team screens of the founder flow (/#/welcome/founder/goals and /#/welcome/founder/team). Both are skippable.
const GOALS = "/#/welcome/founder/goals"
const TEAM = "/#/welcome/founder/team"
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)

// The walkthrough must never touch server storage, and these two screens ask no AI either.
const requests: string[] = []
test.beforeEach(async ({ page }) => {
  requests.length = 0
  page.on("request", r => { if (/\/api\/(org|workspace|setup|command)/.test(new URL(r.url()).pathname)) requests.push(r.url()) })
})
test.afterEach(() => { expect(requests).toEqual([]) })

/** Words a person sees at a glance in the main area: shown text, not the screen-reader-only text, not what the president typed (role names). Same idea as scripts/word-count.mjs. */
const glanceWords = (page: Page) => page.evaluate(() => {
  const m = document.querySelector("main")!
  const skip = ".sr-only, .ob-gt-user, [data-testid=org-chart] .org-card, option, textarea, script, style"
  const folded = (el: Element) => { const d = el.closest("details:not([open])"); return !!d && !el.closest("summary") }
  const shown = (el: Element) => { for (let e: Element | null = el; e && e !== m.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false } return true }
  const parts: string[] = []
  const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) { const el = n.parentElement; if (el && !el.closest(skip) && !folded(el) && shown(el) && el.getClientRects().length) parts.push(n.textContent ?? "") }
  return parts.join(" ").split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length
})
/** Fields on the page that ask for an email, a phone number or an ASU ID. */
const contactFields = (page: Page) => page.evaluate(() => [...document.querySelectorAll("main input, main select, main textarea")].filter(el => {
  const i = el as HTMLInputElement, label = `${i.getAttribute("aria-label") ?? ""} ${i.labels?.[0]?.textContent ?? ""} ${i.name} ${i.placeholder}`
  return /e-?mail|phone|\btel\b|asu\s*id/i.test(label) || ["email", "tel"].includes(i.type)
}).length)
const height = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight)
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
const addRoles = async (page: Page, n: number) => { for (let i = 0; i < n; i++) await page.getByRole("button", { name: "Add role" }).click() }
/** The row whose role title (a growing text box) says `title`, as the rows are ordered now. */
const ROW_AT = (page: Page, title: string) => page.locator(".ob-role-title").evaluateAll((els, t) => els.findIndex(e => (e as HTMLTextAreaElement).value === t), title)
const roleRow = async (page: Page, title: string) => page.locator(".ob-role").nth(await ROW_AT(page, title))

/** Goals opened on its own: a new draft has no mission yet, so type one (the mission is required, even to skip). */
const openGoals = async (page: Page) => { await page.goto(GOALS); await fillMission(page) }

test.describe("Goals", () => {
  test("fastest path: three goals on, Continue, and the choices are still there on Back", async ({ page }) => {
    await openGoals(page)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Set goals for your club")
    await expect(page.getByRole("switch")).toHaveCount(3)
    await expect(page.getByRole("switch", { name: "Weekly events" })).toBeChecked()
    await expect(page.getByRole("switch", { name: "Active members" })).toBeChecked()
    await page.getByRole("switch", { name: "External income" }).check()
    await expect(page.getByRole("button", { name: "Increase External income" })).toBeEnabled()
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/goals$/)
    for (const g of ["Weekly events", "Active members", "External income"]) await expect(page.getByRole("switch", { name: g })).toBeChecked()
    // The goals are written with progress at zero, so the next steps and the finished workspace start from nothing.
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).locator(".is-done")).toHaveCount(2)
  })

  test("Skip for now leaves a hollow dashed dot in the progress chain and a hint about Settings", async ({ page }) => {
    await openGoals(page)
    await expect(page.getByText("You can add this later in Settings.")).toBeVisible()
    await page.getByRole("button", { name: "Skip for now" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    const dot = page.getByRole("list", { name: "Walkthrough progress" }).locator(".is-skipped .ob-dot-mark")
    await expect(dot).toHaveCount(1)
    expect(await dot.evaluate(el => { const cs = getComputedStyle(el); return [cs.borderTopStyle, cs.backgroundColor] })).toEqual(["dashed", "rgba(0, 0, 0, 0)"])
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).getByText("Goals, skipped")).toHaveCount(1)
  })

  test("the +/- buttons and the number box change a target; the buttons and rows are at least 44px", async ({ page }) => {
    await openGoals(page)
    const events = page.getByRole("spinbutton", { name: "Weekly events target" }), members = page.getByRole("spinbutton", { name: "Active members target" })
    await expect(events).toHaveValue("1"); await expect(members).toHaveValue("40")
    await page.getByRole("button", { name: "Increase Weekly events" }).click()
    await expect(events).toHaveValue("2")
    await page.getByRole("button", { name: "Decrease Weekly events" }).click()
    await expect(events).toHaveValue("1")
    await expect(page.getByRole("button", { name: "Decrease Weekly events" })).toBeDisabled()
    await page.getByRole("button", { name: "Increase Active members" }).click()
    await expect(members).toHaveValue("45")
    await members.fill("60"); await expect(members).toHaveValue("60")
    await members.fill(""); await members.blur(); await expect(members).toHaveValue("60")
    for (const loc of [page.getByRole("button", { name: "Increase Active members" }), page.getByRole("button", { name: "Decrease Active members" }), members, page.getByRole("switch", { name: "Weekly events" }).locator("xpath=ancestor::label")]) {
      const box = (await loc.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(43.5); if (!(await loc.evaluate(el => el.tagName === "LABEL"))) expect(box.width).toBeGreaterThanOrEqual(43.5)
    }
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("spinbutton", { name: "Active members target" })).toHaveValue("60")
  })

  test("goals are optional, while selected goals still need a positive target", async ({ page }) => {
    await openGoals(page)
    await page.getByRole("switch", { name: "Active members" }).uncheck()
    await expect(page.getByRole("spinbutton", { name: "Active members target" })).toBeDisabled()
    await page.getByRole("switch", { name: "Weekly events" }).uncheck()
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await page.getByRole("button", { name: "Back" }).click()
    await page.getByRole("switch", { name: "External income" }).check()
    await page.getByRole("spinbutton", { name: "External income target" }).fill("0")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toContainText("positive target")
    await expect(page).toHaveURL(/#\/welcome\/founder\/goals$/)
  })

  test("the mission is required, limited to 300 characters, and kept", async ({ page }) => {
    await openGoals(page)
    const mission = page.getByRole("textbox", { name: "Mission" })
    await expect(mission).toBeVisible()
    await mission.fill("")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toHaveText("Add a mission to continue.")
    await mission.fill("x".repeat(400))
    expect((await mission.inputValue()).length).toBe(300)
    await mission.fill("Help students build things.")
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("textbox", { name: "Mission" })).toHaveValue("Help students build things.")
  })

  test("a selected goal name and unit are editable", async ({ page }) => {
    await openGoals(page)
    await page.getByRole("textbox", { name: "Weekly events Unit" }).fill("sessions")
    await page.getByRole("textbox", { name: "Weekly events Goal name" }).fill("Mentor sessions")
    await expect(page.getByRole("spinbutton", { name: "Mentor sessions target" })).toBeVisible()
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByRole("button", { name: "Back" }).click()
    await expect(page.getByRole("textbox", { name: "Mentor sessions Goal name" })).toHaveValue("Mentor sessions")
    await expect(page.getByRole("textbox", { name: "Mentor sessions Unit" })).toHaveValue("sessions")
  })

  test("at a glance: 40 words or fewer, no sideways scroll, no accessibility problems, light and dark", async ({ page }) => {
    await openGoals(page)
    expect(await glanceWords(page)).toBeLessThanOrEqual(40)
    expect(await noSidewaysScroll(page)).toBe(true)
    expect(await scan(page)).toEqual([])
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
  })

  test("reduced motion: the switch does not slide; with motion allowed it does, and only by transform", async ({ page }) => {
    await openGoals(page)
    const thumb = (p: Page) => p.getByRole("switch", { name: "Weekly events" }).evaluate(el => { const cs = getComputedStyle(el, "::after"); return [cs.transitionProperty, cs.transitionDuration] })
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true)
    expect(await thumb(page)).toEqual(["transform", "0.001s"])
    await page.emulateMedia({ reducedMotion: "no-preference" })
    expect(await thumb(page)).toEqual(["transform", "0.15s"])
  })

  test("the goals column is centered in the full viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await openGoals(page)
    const offset = await page.locator(".ob-goals").evaluate(el => Math.abs(el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2 - window.innerWidth / 2))
    expect(offset).toBeLessThanOrEqual(1)
  })
})

test.describe("Team", () => {
  test("a role has two cells, Role and Person; a name can be changed, and an empty one is an open position", async ({ page }) => {
    await page.goto(TEAM)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who's on your team?")
    await expect(page.getByText("Officers add their own phone and details when they join.")).toBeVisible()
    await expect(page.getByTestId("team-rows").getByRole("listitem")).toHaveCount(5)
    await expect(page.getByRole("textbox", { name: "Role 2" })).toHaveValue("Treasurer")
    await expect(page.getByRole("textbox", { name: "Person 2" })).toHaveValue("Maya Chen")
    await page.getByRole("textbox", { name: "Role 2" }).fill("Finance chair")
    await page.getByRole("textbox", { name: "Person 2" }).fill("Dana Cole")
    await expect(page.getByRole("textbox", { name: "Role 2" })).toHaveValue("Finance chair")
    await expect(page.getByRole("textbox", { name: "Person 2" })).toHaveValue("Dana Cole")
    await page.getByRole("textbox", { name: "Person 2" }).fill("")
    await expect(page.getByRole("textbox", { name: "Person 2" })).toHaveAttribute("placeholder", "Open position")
    await expect(page.getByRole("textbox", { name: "Person 2" })).toHaveValue("")
    // Only Role and Person are shown for every row; the chart names the new title.
    await expect(page.getByTestId("org-chart").locator(".org-card", { hasText: "Finance chair" })).toHaveCount(1)
  })

  test("roles can be added and removed, and the president has no Remove button", async ({ page }) => {
    await page.goto(TEAM)
    await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(4)
    await expect(page.getByRole("button", { name: "Remove President" })).toHaveCount(0)
    await page.getByRole("button", { name: "Add role" }).click()
    await expect(page.getByTestId("team-rows").getByRole("listitem")).toHaveCount(6)
    await expect(page.getByRole("textbox", { name: "Role 6" })).toBeFocused()
    await expect(page.getByRole("textbox", { name: "Role 6" })).toHaveValue("New role")
    await expect(page.getByRole("textbox", { name: "Person 6" })).toHaveAttribute("placeholder", "Open position")
    await page.getByRole("button", { name: "Add role" }).click()
    await expect(page.getByRole("textbox", { name: "Role 7" })).toHaveValue("New role 2")
    await page.getByRole("button", { name: "Remove New role 2" }).click()
    await page.getByRole("button", { name: "Remove Secretary" }).click()
    await expect(page.getByTestId("team-rows").getByRole("listitem")).toHaveCount(5)
    await expect(page.getByTestId("org-chart")).not.toContainText("Secretary")
    await expect(page.getByRole("button", { name: "Add role" })).toBeFocused()
  })

  test("no Email, Phone or ASU ID is asked (and the check goes red if one is added)", async ({ page }) => {
    await page.goto(TEAM)
    expect(await contactFields(page)).toBe(0)
    await page.getByRole("button", { name: "Edit duties" }).nth(1).click()
    expect(await contactFields(page)).toBe(0)
    await expect(page.getByLabel(/\be-?mail\b|\bphone\b|\basu\s*id\b/i)).toHaveCount(0)
    await page.evaluate(() => { const i = document.createElement("input"); i.type = "email"; i.setAttribute("aria-label", "Email"); document.querySelector("main")!.append(i) })
    expect(await contactFields(page)).toBe(1)
  })

  test("reports-to stays visible, indents the tree, and updates the chart", async ({ page }) => {
    await page.goto(TEAM)
    const row = (await roleRow(page, "Secretary"))
    await expect(row.getByRole("combobox", { name: "Reports to 5" })).toHaveValue("r-pres")
    await row.getByRole("combobox", { name: "Reports to 5" }).selectOption({ label: "Treasurer" })
    await expect(page.getByTestId("org-chart")).toContainText("Secretary, reports to Treasurer")
    await expect((await roleRow(page, "Secretary")).locator(".ob-role-title-wrap")).toHaveCSS("padding-left", "48px")
    // heads come first: when the Treasurer reports to the Marketing lead, the Treasurer moves below it
    await (await roleRow(page, "Treasurer")).getByRole("combobox", { name: "Reports to 2" }).selectOption({ label: "Marketing lead" })
    await expect(page.getByRole("textbox", { name: "Role 2" })).toHaveValue("Events lead")
    await expect(page.getByRole("textbox", { name: "Role 4" })).toHaveValue("Treasurer")
    await expect(page.getByTestId("org-chart")).toContainText("Treasurer, reports to Marketing lead")
    // a role cannot report to a role below it
    await expect((await roleRow(page, "Treasurer")).getByRole("combobox", { name: "Reports to 4" }).locator("option", { hasText: "Secretary" })).toHaveCount(0)
  })

  test("duties have their own explicit control and are limited to 400 characters", async ({ page }) => {
    await page.goto(TEAM)
    const duties = page.getByRole("textbox", { name: "Duties 2" })
    await expect(duties).toHaveCount(0)
    await (await roleRow(page, "Treasurer")).getByRole("button", { name: "Edit duties" }).click()
    await duties.fill("y".repeat(500))
    expect((await duties.inputValue()).length).toBe(400)
    await duties.fill("Keeps the budget.")
    await expect(duties).toHaveValue("Keeps the budget.")
  })

  test("Continue shows what is wrong next to the buttons: no president name, the same name twice, the same title twice", async ({ page }) => {
    await page.goto(TEAM)
    await page.getByRole("textbox", { name: "Person 1" }).fill("")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toContainText("president")
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await page.getByRole("textbox", { name: "Person 1" }).fill("alex rivera")
    await page.getByRole("textbox", { name: "Person 2" }).fill("Alex Rivera")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toHaveText("Each officer needs a different name.")
    await page.getByRole("textbox", { name: "Person 2" }).fill("Maya Chen")
    await page.getByRole("textbox", { name: "Role 5" }).fill("treasurer")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page.getByRole("alert")).toContainText("different title")
    await page.getByRole("textbox", { name: "Role 5" }).fill("Secretary")
    await page.getByRole("button", { name: "Continue" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  })

  test("Skip for now keeps good rows, and puts back the starting team if the rows were not valid", async ({ page }) => {
    await page.goto(TEAM)
    await expect(page.getByText("You can add this later in Settings.")).toBeVisible()
    await page.getByRole("textbox", { name: "Person 1" }).fill("")   // not valid: the president needs a name
    await page.getByRole("button", { name: "Skip for now" }).click()
    await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
    await expect(page.getByRole("list", { name: "Walkthrough progress" }).locator(".is-skipped")).toHaveCount(1)
    await page.goBack()
    await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
    await expect(page.getByRole("textbox", { name: "Person 1" })).toHaveValue("Alex Rivera")
    await page.getByRole("textbox", { name: "Role 3" }).fill("Events chair")
    await page.getByRole("button", { name: "Skip for now" }).click()
    await page.goBack()
    await expect(page.getByRole("textbox", { name: "Role 3" })).toHaveValue("Events chair")
  })

  test("ten roles fit in about a screen and a half; a bigger team fails the same check", async ({ page, isMobile }) => {
    await page.goto(TEAM)
    await addRoles(page, 5)
    await expect(page.getByTestId("team-rows").getByRole("listitem")).toHaveCount(10)
    expect(await noSidewaysScroll(page)).toBe(true)
    if (!isMobile) {
      const tall = await height(page)
      expect(tall).toBeLessThanOrEqual(1500)
      await addRoles(page, 14)
      expect(await height(page)).toBeGreaterThan(1200)   // the guard goes red for a team this big
      expect(await height(page)).toBeGreaterThan(tall)
    }
  })

  test("at a glance: 60 words or fewer, and the check goes red for a long screen", async ({ page }) => {
    await page.goto(TEAM)
    await addRoles(page, 5)
    expect(await glanceWords(page)).toBeLessThanOrEqual(60)
    await page.evaluate(() => { const p = document.createElement("p"); p.textContent = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" "); document.querySelector("main")!.append(p) })
    expect(await glanceWords(page)).toBeGreaterThan(40)
  })

  test("no sideways scroll, no accessibility problems, light and dark, with the fold open too", async ({ page }) => {
    await page.goto(TEAM)
    await addRoles(page, 5)
    expect(await noSidewaysScroll(page)).toBe(true)
    expect(await scan(page)).toEqual([])
    await page.getByRole("button", { name: "Edit duties" }).nth(1).click()
    expect(await scan(page)).toEqual([])
    await page.emulateMedia({ colorScheme: "dark" })
    expect(await scan(page)).toEqual([])
    expect(await noSidewaysScroll(page)).toBe(true)
  })

  test("adding or removing a row does not animate, and the buttons are at least 44px", async ({ page, isMobile }) => {
    await page.goto(TEAM)
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.getByRole("button", { name: "Add role" }).click()
    const row = page.getByTestId("team-rows").getByRole("listitem").last()
    expect(await row.evaluate(el => { const cs = getComputedStyle(el); return [cs.animationName, cs.transitionProperty] })).toEqual(["none", "all"])
    expect(await row.evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s")
    if (isMobile) for (const name of ["Remove New role", "Continue", "Back", "Skip for now"]) expect((await page.getByRole("button", { name }).boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
  })
})
