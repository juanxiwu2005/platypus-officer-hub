import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// OB-05: the Team screen of the founder flow (/#/welcome/founder/team). It is skippable. (Before FB-2 this file also tested the Goals screen.)
const TEAM = "/#/welcome/founder/team"
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)

// The walkthrough must never touch server storage, and this screen asks no AI unless a constitution is chosen (e2e/ob-04 tests that).
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

// FB-2 (ob-5): the Goals screen left the walkthrough (goals are set in Settings only, its editor unchanged). Its tests went with it; the mission
// test moved to e2e/ob-04 (the mission is on the Name screen now) and the "centred column" test is kept below for the Team screen.

test.describe("Team", () => {
  test("a role has two cells, Role and Person; a name can be changed, and an empty one is an open position", async ({ page }) => {
    await page.goto(TEAM)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who's on your team?")
    await expect(page.locator(".ob-gt-head .ob-why")).toHaveText("Why: Every task needs one owner. Reminders go to a person, and a role is what gets handed over.")
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
      // FB-2: 1600 (was 1500): the Why line and the folded constitution section add about 90px above the rows.
      expect(tall).toBeLessThanOrEqual(1600)
      await addRoles(page, 14)
      expect(await height(page)).toBeGreaterThan(1200)   // the guard goes red for a team this big
      expect(await height(page)).toBeGreaterThan(tall)
    }
  })

  // FB-2: the limit is 90 words (was 60): the screen now has a Why line, the folded constitution section's title, Add advisor and, with an advisor,
  // the chart legend. What the folded section holds is not seen at a glance; e2e/ob-04 keeps it at 40 words or fewer on its own.
  test("at a glance: 90 words or fewer, with an advisor too, and the check goes red for a long screen", async ({ page }) => {
    await page.goto(TEAM)
    await page.getByRole("button", { name: "Add advisor" }).click()                  // the starting team plus an advisor: its row and the legend
    await expect(page.getByTestId("org-legend")).toBeVisible()
    expect(await glanceWords(page)).toBeLessThanOrEqual(90)
    await page.getByRole("button", { name: "Remove Advisor" }).click()
    await addRoles(page, 5)                                                            // ten roles, as before FB-2
    expect(await glanceWords(page)).toBeLessThanOrEqual(90)
    await page.evaluate(() => { const p = document.createElement("p"); p.textContent = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" "); document.querySelector("main")!.append(p) })
    expect(await glanceWords(page)).toBeGreaterThan(90)
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

  test("the Team column is centered in the full viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto(TEAM)
    const offset = await page.locator(".ob-team").evaluate(el => Math.abs(el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2 - window.innerWidth / 2))
    expect(offset).toBeLessThanOrEqual(1)
  })
})
