import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, viewAs } from "./helpers"
import type { DemoState, OnboardingChecklist } from "../src/data/types"
import { countEveryone, countForRole } from "../src/lib/checklist"

// Settings → Onboarding (option C matrix, docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md Section 6). Fictional seed club only.
const read = (page: Page): Promise<DemoState> => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
const checklist = async (page: Page): Promise<OnboardingChecklist | undefined> => (await read(page)).org.onboardingChecklist
const serious = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations
  .filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

const nav = (page: Page) => page.getByRole("navigation", { name: "Settings sections" })
const matrix = (page: Page) => page.getByTestId("onboarding-matrix")
/** Exactly `text`: titles are text areas (they wrap), and React keeps a text area's text content equal to its value. */
const exactly = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
/** The item row whose title field holds `title`. */
const row = (page: Page, title: string) => page.getByTestId("onboarding-item").filter({ has: page.locator("textarea.ck-title", { hasText: exactly(title) }) })
/** The module row whose name field holds `title`. */
const moduleRow = (page: Page, title: string) => page.getByTestId("onboarding-module").filter({ has: page.locator("textarea.ck-name", { hasText: exactly(title) }) })
const itemOf = (c: OnboardingChecklist | undefined, title: string) => c?.modules.flatMap(m => m.items).find(i => i.title === title)

async function open(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline onboarding checklist" } }))
  await page.goto("/#/settings")
  await closeRail(page)
  await nav(page).getByRole("button", { name: "Onboarding", exact: true }).click()
  await expect(page.getByTestId("onboarding-settings")).toBeVisible()
}
async function startStarter(page: Page) {
  await page.getByRole("button", { name: "Start from Platypus starter", exact: true }).click()
  await expect(matrix(page)).toBeVisible()
  await expect.poll(async () => (await checklist(page))?.modules.length).toBe(5)
}

test("the starter loads, its totals match the model, and hiding an Everyone item for the Treasurer lowers that count", async ({ page }) => {
  await open(page)
  await expect(nav(page).getByRole("button", { name: "Onboarding", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByTestId("onboarding-empty")).toContainText("Every new officer gets this list.")
  await startStarter(page)
  const saved = (await checklist(page))!
  const { roles } = await read(page)
  await expect(page.getByTestId("count-everyone")).toHaveText(String(countEveryone(saved)))
  for (const r of roles) await expect(page.getByTestId(`count-${r.id}`)).toHaveText(String(countForRole(saved, r.id)))
  expect([countEveryone(saved), countForRole(saved, "r-fin")]).toEqual([13, 17])
  await expect(matrix(page).getByRole("columnheader", { name: "Treasurer", exact: true })).toBeVisible()
  await expect(row(page, "Complete anti-hazing training").locator(".rule-id")).toHaveText("ASU-R-004")

  const cell = row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets this item", exact: true })
  await expect(cell).toHaveAttribute("aria-pressed", "true")
  await cell.click()
  const hidden = row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: hidden", exact: true })
  await expect(hidden).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("count-r-fin")).toHaveText("16")
  await expect(page.getByTestId("count-everyone")).toHaveText("13")
  await expect.poll(async () => itemOf(await checklist(page), "Join the officer group chat")?.hiddenFor).toEqual(["r-fin"])
  await expect(page.getByTestId("onboarding-status")).toHaveText("Saved")

  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await matrix(page).evaluate(el => { el.parentElement!.scrollLeft = 10_000 })
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  // axe at a resting scroll position: the Everyone column next to the sticky Item column. At the very end of a phone's scroll a
  // column can sit half under the Item column, which axe's target-size rule reports; the phone test below checks that every
  // column scrolls fully clear of it.
  await matrix(page).evaluate(el => {
    const wrap = el.parentElement!, [item, ...cols] = [...el.querySelectorAll("thead th")]
    wrap.scrollLeft = 0
    wrap.scrollLeft = cols[2].getBoundingClientRect().left - item.getBoundingClientRect().right
  })
  expect(await serious(page)).toEqual([])
})

test("Everyone off, then one role on", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const r = row(page, "Read the constitution")
  await r.getByRole("button", { name: "Everyone: on", exact: true }).click()
  await expect(r.getByRole("button", { name: "Everyone: off", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(r.getByRole("button", { name: "Treasurer: not included", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("count-everyone")).toHaveText("12")
  await r.getByRole("button", { name: "Treasurer: not included", exact: true }).click()
  await expect(r.getByRole("button", { name: "Treasurer: gets this item", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(r.getByRole("button", { name: "Secretary: not included", exact: true })).toBeVisible()
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Read the constitution"); return i && { everyone: i.everyone, roleIds: i.roleIds } }).toEqual({ everyone: false, roleIds: ["r-fin"] })
  await expect(page.getByTestId("count-r-fin")).toHaveText("17")
  await expect(page.getByTestId("count-r-sec")).toHaveText(String(countForRole((await checklist(page))!, "r-sec")))
})

test("Enter adds the next row with focus, shorthand sets Who and When, and Backspace on an empty row goes back", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await page.getByRole("button", { name: "+ Add item", exact: true }).click()
  const title = page.getByRole("textbox", { name: "Item title", exact: true })
  await expect(page.locator("textarea.ck-title:focus")).toHaveValue("")
  await page.keyboard.type("Meet your mentor @buddy day 3")
  await page.keyboard.press("Enter")
  const mentor = row(page, "Meet your mentor")
  await expect(mentor.getByRole("combobox", { name: "Who does it", exact: true })).toHaveValue("buddy")
  await expect(mentor.getByRole("combobox", { name: "When", exact: true })).toHaveValue("day3")
  await expect(mentor.getByRole("combobox", { name: "When", exact: true }).locator("..")).toHaveClass(/is-set/)
  // The new row is right below and has focus.
  const focused = page.locator("textarea.ck-title:focus")
  await expect(focused).toHaveValue("")
  const titles = await title.evaluateAll(els => els.map(e => (e as HTMLInputElement).value))
  expect(titles.slice(-3)).toEqual(["Day 30 review", "Meet your mentor", ""])
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Meet your mentor"); return i && { who: i.who, when: i.when, everyone: i.everyone } }).toEqual({ who: "buddy", when: "day3", everyone: true })

  await page.keyboard.press("Backspace")
  await expect(title).toHaveCount(titles.length - 1)
  await expect(page.locator("textarea.ck-title:focus")).toHaveValue("Meet your mentor")
})

test("Paste a list reads tab-separated rows into modules with a live preview", async ({ page }) => {
  await open(page)
  await page.getByTestId("onboarding-empty").getByRole("button", { name: "Paste a list", exact: true }).click()
  const box = page.getByRole("textbox", { name: "Paste a list", exact: true })
  await box.fill(["Section\tChecklist Item\tOwner", "0. Onboarding Confirmation\t\t", "\tSign the code of conduct\tPresident", "\tSet up club email\t", "Tools\tGet chat access\tBuddy"].join("\n"))
  await expect(page.getByTestId("onboarding-paste-preview")).toHaveText("3 items in 2 modules")
  await page.getByRole("button", { name: "Add to checklist", exact: true }).click()
  await expect(page.getByTestId("onboarding-paste")).toHaveCount(0)
  await expect(page.getByTestId("onboarding-module")).toHaveCount(2)
  expect(await page.getByRole("textbox", { name: "Module name", exact: true }).evaluateAll(els => els.map(e => (e as HTMLInputElement).value))).toEqual(["Onboarding Confirmation", "Tools"])
  await expect(page.getByTestId("onboarding-item")).toHaveCount(3)
  const saved = await checklist(page)
  expect(saved?.modules.map(m => [m.title, m.items.map(i => [i.title, i.who ?? null])])).toEqual([
    ["Onboarding Confirmation", [["Sign the code of conduct", "president"], ["Set up club email", null]]],
    ["Tools", [["Get chat access", "buddy"]]],
  ])
  await expect(page.getByTestId("count-everyone")).toHaveText("3")
})

test("Undo restores the previous saved version, and a module with items asks before it is deleted", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await row(page, "Meet your buddy").getByRole("button", { name: "Treasurer: gets this item", exact: true }).click()
  await expect.poll(async () => itemOf(await checklist(page), "Meet your buddy")?.hiddenFor).toEqual(["r-fin"])
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect.poll(async () => itemOf(await checklist(page), "Meet your buddy")?.hiddenFor).toEqual([])
  await expect(row(page, "Meet your buddy").getByRole("button", { name: "Treasurer: gets this item", exact: true })).toBeVisible()

  const checkIns = moduleRow(page, "Check-ins")
  await checkIns.getByRole("button", { name: "Delete module", exact: true }).click()
  await expect(checkIns).toContainText("Delete 2 items too?")
  expect((await checklist(page))?.modules).toHaveLength(5)
  await checkIns.getByRole("button", { name: "Delete", exact: true }).click()
  await expect.poll(async () => (await checklist(page))?.modules.map(m => m.title)).toEqual(["First 3 days", "Learn the club", "Tools & access", "Handoff from your predecessor"])
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect.poll(async () => (await checklist(page))?.modules).toHaveLength(5)
  // Back past the start: the club has no checklist again.
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect.poll(async () => (await checklist(page)) ?? null).toBeNull()
  await expect(page.getByTestId("onboarding-empty")).toBeVisible()
})

test("the checklist survives a reload, including a typed module name and a move", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const name = page.getByRole("textbox", { name: "Module name", exact: true }).first()
  await name.fill("Week one basics")
  await expect.poll(async () => (await checklist(page))?.modules[0].title).toBe("Week one basics")
  await row(page, "Meet your buddy").getByRole("button", { name: "Move item up", exact: true }).click()
  await expect.poll(async () => (await checklist(page))?.modules[0].items.map(i => i.title)).toEqual(["Meet your buddy", "Join the officer group chat", "Get added to the club shared drive"])
  await page.reload()
  await closeRail(page)
  await nav(page).getByRole("button", { name: "Onboarding", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Module name", exact: true }).first()).toHaveValue("Week one basics")
  await expect(page.getByRole("textbox", { name: "Item title", exact: true }).first()).toHaveValue("Meet your buddy")
  await expect(page.getByTestId("onboarding-item")).toHaveCount(23)
})

test("a non-lead viewer sees no Onboarding tab, even from the deep link", async ({ page }) => {
  await page.goto("/#/settings")
  await viewAs(page, "maya")
  await page.goto("/#/settings?tab=onboarding")
  await closeRail(page)
  await expect(nav(page).getByRole("button", { name: "My preferences", exact: true })).toBeVisible()
  await expect(nav(page).getByRole("button", { name: "Onboarding", exact: true })).toHaveCount(0)
  await expect(page.getByTestId("onboarding-settings")).toHaveCount(0)
})

test("the deep link opens Onboarding, and dark mode has no serious accessibility issues", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/#/settings?tab=onboarding")
  await closeRail(page)
  await expect(page.getByTestId("onboarding-settings")).toBeVisible()
  expect(await serious(page)).toEqual([])
  await startStarter(page)
  await row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets this item", exact: true }).click()
  await row(page, "Read the constitution").getByRole("combobox", { name: "When: follows module, Week 1", exact: true }).selectOption("day1")
  await page.getByRole("button", { name: "Paste a list", exact: true }).click()
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  expect(await serious(page)).toEqual([])
})

test("an inherited chip shows only the value, dashed, and its name and first option say it follows the module", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const r = row(page, "Read the constitution")
  const when = r.getByRole("combobox", { name: "When: follows module, Week 1", exact: true })
  await expect(when).toHaveValue("")
  await expect(when.locator("option").first()).toHaveText("Week 1 (module)")
  await expect(when.locator("..")).toHaveClass(/is-follow/)
  await expect(when.locator("..").locator(":scope > span")).toHaveText("Week 1")   // the visible pill: the value only
  const who = r.getByRole("combobox", { name: "Who does it: follows module, New officer", exact: true })
  await expect(who).toHaveValue("")
  await expect(who.locator("..").locator(":scope > span")).toHaveText("New officer")
  await expect(who.locator("option").first()).toHaveText("New officer (module)")
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Follows the module")
  // Set on the item: the chip fills and the name is plain again.
  await when.selectOption("day1")
  await expect(r.getByRole("combobox", { name: "When", exact: true }).locator("..")).toHaveClass(/is-set/)
})

test("at 1440px every column of the seed club fits without scrolling, and long titles and rule tags stay readable", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a desktop width")
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page)
  await startStarter(page)
  await row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets this item", exact: true }).click()
  const { roles } = await read(page)
  expect(roles).toHaveLength(5)
  const box = await matrix(page).evaluate(el => {
    const wrap = el.parentElement!, w = wrap.getBoundingClientRect()
    return { left: w.left + wrap.clientLeft, right: w.left + wrap.clientLeft + wrap.clientWidth, scrollWidth: wrap.scrollWidth, clientWidth: wrap.clientWidth, scrollLeft: wrap.scrollLeft }
  })
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
  expect(box.scrollLeft).toBe(0)
  // Item, When, Who, Everyone and every role column, the last one included, lie inside the frame's visible box.
  for (const name of ["Item", "When", "Who does it", "Everyone", ...roles.map(r => r.displayName)]) {
    const header = (await matrix(page).getByRole("columnheader", { name, exact: true }).boundingBox())!
    expect(header.x, name).toBeGreaterThanOrEqual(box.left - 1)
    expect(header.x + header.width, name).toBeLessThanOrEqual(box.right + 1)
  }
  // Titles wrap instead of being cut, and a rule tag sits on its own line under its title.
  const cut = await page.locator("textarea.ck-title").evaluateAll(els => els.filter(e => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map(e => (e as HTMLTextAreaElement).value))
  expect(cut).toEqual([])
  const long = row(page, "Walk through a budget request in Sun Devil Central").getByRole("textbox", { name: "Item title", exact: true })
  expect((await long.boundingBox())!.height).toBeGreaterThan(30)
  const tagged = row(page, "Complete USG-T appropriations training")
  const [title, tag] = [(await tagged.getByRole("textbox", { name: "Item title", exact: true }).boundingBox())!, (await tagged.locator(".rule-id").boundingBox())!]
  expect(tag.y).toBeGreaterThanOrEqual(title.y + title.height - 1)
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("on a phone the sticky Item column is opaque, no header hides under it, When and Who are reachable, and the page never scrolls sideways", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "a phone width")
  await open(page)
  await startStarter(page)
  await matrix(page).locator("thead").scrollIntoViewIfNeeded()
  const sticky = matrix(page).getByRole("columnheader", { name: "Item", exact: true })
  expect(await sticky.evaluate(el => getComputedStyle(el).backgroundColor)).toMatch(/^rgb\(/)   // rgb(), not a transparent rgba()
  // Scroll each column to the Item column's edge: the header is then in view, nothing covers its middle, and the page stays put.
  const headers = matrix(page).locator("thead th")
  const count = await headers.count()
  for (let i = 1; i < count - 1; i++) {
    const seen = await headers.nth(i).evaluate(th => {
      const wrap = th.closest(".ck-wrap") as HTMLElement, item = wrap.querySelector("thead th") as HTMLElement
      wrap.scrollLeft = 0
      wrap.scrollLeft = th.getBoundingClientRect().left - item.getBoundingClientRect().right
      const r = th.getBoundingClientRect(), edge = item.getBoundingClientRect().right, w = wrap.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { name: th.textContent, clear: r.left >= edge - 1, inside: r.right <= w.right + 1, onTop: !!hit && th.contains(hit), overflow: document.documentElement.scrollWidth - innerWidth }
    })
    expect(seen, `${seen.name}`).toEqual({ name: seen.name, clear: true, inside: true, onTop: true, overflow: 0 })
  }
  // At the start When and Who sit right next to the Item column.
  await matrix(page).evaluate(el => { el.parentElement!.scrollLeft = 0 })
  await expect(row(page, "Read the constitution").getByRole("combobox", { name: "When: follows module, Week 1", exact: true })).toBeInViewport()
  await expect(row(page, "Read the constitution").getByRole("combobox", { name: "Who does it: follows module, New officer", exact: true })).toBeInViewport()
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})
