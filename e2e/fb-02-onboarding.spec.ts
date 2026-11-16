import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { MISSION, WELCOME_ON, onboardingRecord } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// FB-2 (docs/feedback-fix/PLAN.md 4.1, 4.3, 12.4): the shorter founder flow (Name → Team → First event → Reminders → Confirm → Invite), the Why
// lines, and the advisor beside the president. Nothing here calls a server: every /api request is answered by the test.
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)
const words = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
const TEAM = "/#/welcome/founder/team"
const chart = (page: Page) => page.getByTestId("org-chart")
const card = (page: Page, title: string) => chart(page).locator(".org-card", { hasText: new RegExp(`^${title}$`) })
type Saved = { club: { roles: { displayName: string; fn: string; reportsToId: string | null }[]; goals: unknown[] } }
const saved = (page: Page) => page.evaluate(() => new Promise<Saved | null>(resolve => {
  const open = indexedDB.open("platypus.docs", 1)
  open.onupgradeneeded = () => { open.result.createObjectStore("docs", { keyPath: "id" }) }
  open.onsuccess = () => { const get = open.result.transaction("docs", "readonly").objectStore("docs").get("onboarding-draft"); get.onsuccess = () => { open.result.close(); resolve((get.result?.value ?? null) as Saved | null) }; get.onerror = () => resolve(null) }
  open.onerror = () => resolve(null)
}))

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
})

test("Welcome: Why, How and What, each with its label, in that order; few words, no sideways scroll, no accessibility problems", async ({ page }) => {
  await page.goto(WELCOME_ON)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to Platypus")
  const lines = page.getByTestId("welcome-why")
  await expect(lines.locator("dt")).toHaveText(["Why", "How", "What"])
  await expect(lines.locator("dd")).toHaveText([
    "Clubs miss deadlines when nobody sees the whole chain, and everything resets at handoff.",
    "Platypus watches every deadline and writes the reminder for you.",
    "Set up your team, your first event and your reminders. About 5 minutes.",
  ])
  expect(words(await page.locator("main").innerText())).toBeLessThanOrEqual(90)
  expect(await noSidewaysScroll(page)).toBe(true)
  expect(await scan(page)).toEqual([])
  await page.emulateMedia({ colorScheme: "dark" })
  expect(await scan(page)).toEqual([])
})

test("the founder flow is Name → Team → First event → Reminders → Confirm → Invite, records ob-5, and the club starts with no goals", async ({ page }) => {
  await page.goto("/#/start")
  const chain = page.getByRole("list", { name: c.progress }).getByRole("listitem")
  await expect(chain).toHaveCount(6)
  await page.getByLabel(c.founder.name.field).fill("Fictional Heron Club")
  await page.getByRole("textbox", { name: c.founder.name.mission }).fill(MISSION)
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.getByRole("button", { name: c.skip }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/reminders$/)
  await page.getByTestId("reminder-mode").getByRole("button", { name: c.skip }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo") ?? "{}"))
  expect(s.org.mission).toBe(MISSION)
  expect(s.org.goals).toEqual([])                                           // goals are set in Settings only
  const rec = await onboardingRecord(page)
  expect(rec.attempts[0].flowVersion).toBe("ob-5")
  expect(rec.attempts[0].steps.map(x => x.step).filter(x => /constitution|goals/.test(x))).toEqual([])
})

test("Add advisor: a row that advises the president, beside the president in the chart with a dashed line, kept on reload, and Continue passes", async ({ page }) => {
  await page.goto(TEAM)
  await expect(page.getByTestId("org-legend")).toHaveCount(0)               // no advisor yet: no legend
  await page.getByRole("button", { name: c.founder.team.addAdvisor }).click()
  const rows = page.getByTestId("team-rows").getByRole("listitem")
  await expect(rows).toHaveCount(6)
  const row = rows.last()                                                   // listed last
  await expect(row.getByRole("textbox", { name: "Role 6" })).toHaveValue("Advisor")
  await expect(row.getByRole("textbox", { name: "Role 6" })).toBeFocused()
  await expect(row.getByText(c.founder.team.advises)).toBeVisible()
  await expect(row.getByRole("combobox")).toHaveCount(0)                    // no Reports to
  await expect(row.locator(".ob-role-branch")).toHaveCount(0)               // not indented
  // Nobody can report to the advisor.
  await expect(rows.nth(1).getByRole("combobox").locator("option", { hasText: "Advisor" })).toHaveCount(0)
  // The chart: same level as the president, right beside it, a dashed line between them, the legend under the chart.
  const [p, a] = [(await card(page, "President").boundingBox())!, (await card(page, "Advisor").boundingBox())!]
  expect(Math.abs(p.y - a.y)).toBeLessThanOrEqual(1)
  expect(a.x).toBeGreaterThan(p.x + p.width)
  expect(a.x - (p.x + p.width)).toBeLessThan(p.width)
  expect(await card(page, "Advisor").evaluate(el => el.classList.contains("advisor"))).toBe(true)
  const dashed = chart(page).locator("path.advisory")
  await expect(dashed).toHaveCount(1)
  expect(await dashed.evaluate(el => getComputedStyle(el).strokeDasharray)).not.toBe("none")
  await expect(page.getByTestId("org-legend")).toHaveText("Solid line: reports to · Dashed line: advises")
  await expect(chart(page).locator(".sr-only li", { hasText: /^Advisor, advises the president$/ })).toHaveCount(1)
  // A second advisor is "Advisor 2" and goes further right on the same level.
  await page.getByRole("button", { name: c.founder.team.addAdvisor }).click()
  await expect(page.getByRole("textbox", { name: "Role 7" })).toHaveValue("Advisor 2")
  const [p2, a1, a2] = [(await card(page, "President").boundingBox())!, (await card(page, "Advisor").boundingBox())!, (await card(page, "Advisor 2").boundingBox())!]   // the list grew: measure again
  expect(Math.abs(a2.y - p2.y)).toBeLessThanOrEqual(1); expect(a2.x).toBeGreaterThan(a1.x)
  await page.getByRole("button", { name: "Remove Advisor 2" }).click()
  // Fill the advisor, edit duties, reload: all kept.
  await row.getByRole("textbox", { name: "Person 6" }).fill("Casey Lin")
  await row.getByRole("button", { name: c.founder.team.editDuties }).click()
  await page.getByRole("textbox", { name: "Duties 6" }).fill("Signs university forms.")
  await expect.poll(async () => (await saved(page))?.club.roles.filter(r => r.fn === "advisor").length).toBe(1)
  await page.reload()
  await expect(page.getByRole("textbox", { name: "Role 6" })).toHaveValue("Advisor")
  await expect(page.getByRole("textbox", { name: "Person 6" })).toHaveValue("Casey Lin")
  await expect(chart(page).locator("path.advisory")).toHaveCount(1)
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/first-event$/)
  const advisor = (await saved(page))?.club.roles.find(r => r.fn === "advisor")
  expect(advisor).toMatchObject({ displayName: "Advisor", reportsToId: null })
})

test("an advisor renamed into an ordinary role reports to the president again; it can be removed", async ({ page }) => {
  await page.goto(TEAM)
  await page.getByRole("button", { name: c.founder.team.addAdvisor }).click()
  await page.getByRole("textbox", { name: "Role 6" }).fill("Events chair")
  await expect(page.getByRole("combobox", { name: "Reports to 6" })).toHaveValue("r-pres")
  await expect(chart(page).locator("path.advisory")).toHaveCount(0)
  await page.getByRole("textbox", { name: "Role 6" }).fill("Faculty Advisor")
  await expect(page.getByRole("combobox", { name: "Reports to 6" })).toHaveCount(0)
  await expect(page.getByTestId("team-rows").getByRole("listitem").last().getByText(c.founder.team.advises)).toBeVisible()
  await page.getByRole("button", { name: "Remove Faculty Advisor" }).click()
  await expect(page.getByTestId("team-rows").getByRole("listitem")).toHaveCount(5)
  await expect(page.getByTestId("org-legend")).toHaveCount(0)
})

test("a phone: the constitution section and Add advisor are 44px, nothing is wider than the screen, the chart opens with the president centred", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(TEAM)
  for (const name of [c.founder.constitution.section, c.founder.team.add, c.founder.team.addAdvisor]) expect((await page.getByRole("button", { name }).boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
  await page.getByRole("button", { name: c.founder.team.addAdvisor }).click()
  await page.getByRole("button", { name: c.founder.constitution.section }).click()
  expect(await noSidewaysScroll(page)).toBe(true)
  const wide = await page.evaluate(() => [...document.querySelectorAll(".ob-team *")].filter(el => el.getBoundingClientRect().right > window.innerWidth + 0.5 && !el.closest(".org-scroll")).map(el => el.className))
  expect(wide).toEqual([])
  const scroller = chart(page).locator(".org-scroll")
  await scroller.scrollIntoViewIfNeeded()
  const [p, s] = [(await card(page, "President").boundingBox())!, (await scroller.boundingBox())!]
  expect(Math.abs(p.x + p.width / 2 - (s.x + s.width / 2))).toBeLessThanOrEqual(24)
  await expect(page.getByTestId("org-fade")).toHaveClass(/more-right/)        // the advisor (and more) is to the right
})

test("the Team screen with an advisor and the constitution section open: no accessibility problems, light and dark", async ({ page }) => {
  await page.goto(TEAM)
  await page.getByRole("button", { name: c.founder.team.addAdvisor }).click()
  await page.getByRole("button", { name: c.founder.constitution.section }).click()
  await page.getByRole("button", { name: c.founder.constitution.sample }).click()
  await expect(page.getByTestId("reading-note")).toBeVisible({ timeout: 15_000 })
  expect(await scan(page)).toEqual([])
  await page.emulateMedia({ colorScheme: "dark" })
  expect(await scan(page)).toEqual([])
})

test("Team and Settings show a constitution's advisor beside the president, with the legend", async ({ page }) => {
  await page.goto(TEAM)                                                     // the sample constitution names a Club Advisor
  await page.getByRole("button", { name: c.founder.constitution.section }).click()
  await page.getByRole("button", { name: c.founder.constitution.sample }).click()
  await expect(card(page, "Club Advisor")).toBeVisible({ timeout: 15_000 })
  const [p, a] = [(await card(page, "President").boundingBox())!, (await card(page, "Club Advisor").boundingBox())!]
  expect(Math.abs(p.y - a.y)).toBeLessThanOrEqual(1)
  await expect(page.getByTestId("org-legend")).toBeVisible()
  // Through the walkthrough to a club, then the Settings roles page shows the same chart.
  await page.getByRole("button", { name: c.back }).click()
  await page.getByLabel(c.founder.name.field).fill("Fictional Heron Club")
  await page.getByRole("textbox", { name: c.founder.name.mission }).fill(MISSION)
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await page.getByRole("button", { name: c.next, exact: true }).click()
  await page.getByTestId("first-event").getByRole("button", { name: c.skip }).click()
  await page.getByTestId("reminder-mode").getByRole("button", { name: c.skip }).click()
  await page.getByRole("button", { name: c.founder.confirm.start }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  await page.goto("/#/settings")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Roles" }).click()
  const [sp, sa] = [(await card(page, "President").boundingBox())!, (await card(page, "Club Advisor").boundingBox())!]
  expect(Math.abs(sp.y - sa.y)).toBeLessThanOrEqual(1)
  expect(sa.x).toBeGreaterThan(sp.x)
  await expect(page.getByTestId("org-legend")).toBeVisible()
})
