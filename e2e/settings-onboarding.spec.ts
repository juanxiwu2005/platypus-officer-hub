import { expect, test, type Locator, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, openDemoMenu, viewAs } from "./helpers"
import type { DemoState, OnboardingChecklist } from "../src/data/types"
import { countEveryone, countForRole } from "../src/lib/checklist"

// Settings → Onboarding (option C matrix, docs/feedback-fix/CHECKLIST_MATRIX_CONTRACT.md Sections 6 and 8). Fictional seed club only.
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
const roleIdsOf = async (page: Page) => (await read(page)).roles.map(r => r.id)
const grip = (page: Page, title: string) => page.getByRole("button", { name: `Move ${title}`, exact: true })
const moduleGrip = (page: Page, title: string) => page.getByRole("button", { name: `Move module ${title}`, exact: true })
const itemsIn = async (page: Page, module: string) => (await checklist(page))?.modules.find(m => m.title === module)?.items.map(i => i.title)

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
const centre = async (l: Locator) => { const b = (await l.boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }
/** A mouse drag from `from` to a point `dy` px into `to` (from its top), in small steps like a hand. */
async function mouseDrag(page: Page, from: Locator, to: Locator, dy: number, opts: { escape?: boolean } = {}) {
  await from.scrollIntoViewIfNeeded()
  const a = await centre(from)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(a.x, a.y + 8, { steps: 2 })
  await to.scrollIntoViewIfNeeded()
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x, b.y + dy, { steps: 8 })
  await expect(page.getByTestId("onboarding-drop-line")).toBeVisible()
  if (opts.escape) await page.keyboard.press("Escape")
  await page.mouse.up()
}

test("the starter loads, its totals match the model, and taking an Everyone item from the Treasurer lowers both counts", async ({ page }) => {
  await open(page)
  await expect(nav(page).getByRole("button", { name: "Onboarding", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByTestId("onboarding-empty")).toContainText("Every new officer gets this list.")
  await startStarter(page)
  const saved = (await checklist(page))!
  const { roles } = await read(page)
  const ids = roles.map(r => r.id)
  await expect(page.getByTestId("count-everyone")).toHaveText(String(countEveryone(saved, ids)))
  for (const r of roles) await expect(page.getByTestId(`count-${r.id}`)).toHaveText(String(countForRole(saved, r.id)))
  expect([countEveryone(saved, ids), countForRole(saved, "r-fin")]).toEqual([13, 17])
  await expect(matrix(page).getByRole("columnheader", { name: "Treasurer", exact: true })).toBeVisible()
  const handbookTag = row(page, "Complete anti-hazing training").locator('[data-source-id="ASU-R-004"]')
  await expect(handbookTag).toHaveText("ASU rule")
  await expect(handbookTag).toHaveAttribute("title", "Student Club and Organization Handbook 2026-2027")
  await expect(matrix(page)).not.toContainText("ASU-R-")

  const cell = row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets Join the officer group chat", exact: true })
  await expect(cell).toHaveAttribute("aria-pressed", "true")
  await cell.click()
  const off = row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: does not get Join the officer group chat", exact: true })
  await expect(off).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("count-r-fin")).toHaveText("16")
  // Not every role gets it any more, so the Everyone cell is empty and its count drops.
  await expect(row(page, "Join the officer group chat").getByRole("button", { name: "Everyone: not all roles get Join the officer group chat", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("count-everyone")).toHaveText("12")
  await expect.poll(async () => itemOf(await checklist(page), "Join the officer group chat")?.hiddenFor).toEqual(["r-fin"])
  await expect(page.getByTestId("onboarding-status")).toHaveText("Saved")

  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await page.getByTestId("onboarding-frame").evaluate(el => { el.scrollLeft = 10_000 })
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  // axe at a resting scroll position: the Everyone column next to the sticky Item column. At the very end of a phone's scroll a
  // column can sit half under the Item column, which axe's target-size rule reports; the phone test below checks that every
  // column scrolls fully clear of it.
  await page.getByTestId("onboarding-frame").evaluate(wrap => {
    const item = wrap.querySelector("thead th.ck-corner")!, cols = [...wrap.querySelectorAll("thead th:not(.ck-corner):not(.ck-actions-head)")]
    wrap.scrollLeft = 0
    wrap.scrollLeft = cols[1].getBoundingClientRect().left - item.getBoundingClientRect().right
  })
  expect(await serious(page)).toEqual([])
})

test("two-state cells and the Everyone rule: filled exactly when every role gets it; a click gives it to all, or to none", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const r = row(page, "Read the constitution")
  const everyone = (all: boolean) => r.getByRole("button", { name: `Everyone: ${all ? "all roles get" : "not all roles get"} Read the constitution`, exact: true })
  // No light "From Everyone" dot and no crossed ring: every cell is a filled dot or an empty ring.
  expect(await matrix(page).locator(".ck-dot").evaluateAll(els => [...new Set(els.map(e => e.className))].sort())).toEqual(["ck-dot is-off", "ck-dot is-on"])
  await expect(everyone(true)).toHaveAttribute("aria-pressed", "true")
  // All have it: Everyone gives it to none.
  await everyone(true).click()
  await expect(everyone(false)).toHaveAttribute("aria-pressed", "false")
  await expect(r.getByRole("button", { name: "Treasurer: does not get Read the constitution", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("count-everyone")).toHaveText("12")
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Read the constitution"); return i && { everyone: i.everyone, roleIds: i.roleIds, hiddenFor: i.hiddenFor } }).toEqual({ everyone: false, roleIds: [], hiddenFor: [] })
  // One role on: still not everyone.
  await r.getByRole("button", { name: "Treasurer: does not get Read the constitution", exact: true }).click()
  await expect(r.getByRole("button", { name: "Treasurer: gets Read the constitution", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(r.getByRole("button", { name: "Secretary: does not get Read the constitution", exact: true })).toBeVisible()
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Read the constitution"); return i && { everyone: i.everyone, roleIds: i.roleIds } }).toEqual({ everyone: false, roleIds: ["r-fin"] })
  await expect(page.getByTestId("count-r-fin")).toHaveText("17")
  await expect(page.getByTestId("count-r-sec")).toHaveText(String(countForRole((await checklist(page))!, "r-sec")))
  // Not all have it: Everyone gives it to every current role.
  await everyone(false).click()
  await expect(everyone(true)).toHaveAttribute("aria-pressed", "true")
  for (const name of ["President", "Treasurer", "Events lead", "Marketing lead", "Secretary"]) await expect(r.getByRole("button", { name: `${name}: gets Read the constitution`, exact: true })).toBeVisible()
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Read the constitution"); return i && { everyone: i.everyone, roleIds: i.roleIds, hiddenFor: i.hiddenFor } }).toEqual({ everyone: true, roleIds: [], hiddenFor: [] })
  // Every role picked one by one also fills the Everyone cell.
  const training = row(page, "Complete Officer Training")
  for (const name of ["Events lead", "Marketing lead", "Secretary"]) await training.getByRole("button", { name: `${name}: does not get Complete Officer Training`, exact: true }).click()
  await expect(training.getByRole("button", { name: "Everyone: all roles get Complete Officer Training", exact: true })).toHaveAttribute("aria-pressed", "true")
  // F3: and it is stored as Everyone's, so roles added later get it too (the filled Everyone cell always means that).
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Complete Officer Training"); return i && { everyone: i.everyone, roleIds: i.roleIds, hiddenFor: i.hiddenFor } }).toEqual({ everyone: true, roleIds: [], hiddenFor: [] })
  const legend = page.getByRole("list", { name: "Legend" })
  await expect(legend.getByRole("listitem")).toHaveText(["Gets it", "Does not get it", "Follows the module"])
})

test("there is no Who column, select or legend entry", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await expect(matrix(page).getByRole("columnheader", { name: "Who does it" })).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: /Who does it/ })).toHaveCount(0)
  await expect(page.getByRole("list", { name: "Legend" })).not.toContainText("Everyone")
  expect(JSON.stringify(await checklist(page))).not.toContain('"who"')
})

test("every module has + Add item at its right end; the toolbar has none", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await expect(page.locator(".ck-toolbar").getByRole("button", { name: /Add item/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^\+ Add item to / })).toHaveCount(5)
  const learn = moduleRow(page, "Learn the club")
  const add = learn.getByRole("button", { name: "+ Add item to Learn the club", exact: true })
  await expect(add).toHaveText("+ Add item")
  // At the right end of the module row: to the right of every role cell header.
  const [b, last] = [(await add.boundingBox())!, (await matrix(page).getByRole("columnheader", { name: "Treasurer", exact: true }).boundingBox())!]
  if (test.info().project.name === "desktop") expect(b.x + b.width).toBeGreaterThan(last.x)
  await add.click()
  await expect(page.locator("textarea.ck-title:focus")).toHaveValue("")
  await page.keyboard.type("Shadow a meeting")
  await page.keyboard.press("Tab")
  await expect.poll(() => itemsIn(page, "Learn the club")).toEqual(["Read the constitution", "Read the ASU student org handbook", "Complete anti-hazing training", "Complete Officer Training", "Agree on 3–5 core duties with the president", "Shadow a meeting"])
})

test("Enter adds the next row with focus, shorthand sets When, @ words stay in the title, and Backspace on an empty row goes back", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await page.getByRole("button", { name: "+ Add item to Check-ins", exact: true }).click()
  const title = page.getByRole("textbox", { name: "Item title", exact: true })
  await expect(page.locator("textarea.ck-title:focus")).toHaveValue("")
  await page.keyboard.type("Meet your mentor @buddy day 3")
  await page.keyboard.press("Enter")
  const mentor = row(page, "Meet your mentor @buddy")
  await expect(mentor.getByRole("combobox", { name: "When for Meet your mentor @buddy", exact: true })).toHaveValue("day3")
  await expect(mentor.getByRole("combobox", { name: "When for Meet your mentor @buddy", exact: true }).locator("..")).toHaveClass(/is-set/)
  // The new row is right below and has focus.
  const focused = page.locator("textarea.ck-title:focus")
  await expect(focused).toHaveValue("")
  const titles = await title.evaluateAll(els => els.map(e => (e as HTMLInputElement).value))
  expect(titles.slice(-3)).toEqual(["Day 30 review", "Meet your mentor @buddy", ""])
  await expect.poll(async () => { const i = itemOf(await checklist(page), "Meet your mentor @buddy"); return i && { when: i.when, everyone: i.everyone, keys: Object.keys(i).sort() } })
    .toEqual({ when: "day3", everyone: true, keys: ["everyone", "hiddenFor", "id", "roleIds", "title", "when"] })

  await page.keyboard.press("Backspace")
  await expect(title).toHaveCount(titles.length - 1)
  await expect(page.locator("textarea.ck-title:focus")).toHaveValue("Meet your mentor @buddy")
})

test("Paste a list reads tab-separated rows into modules with a live preview, ignoring the Owner column", async ({ page }) => {
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
  expect(saved?.modules.map(m => [m.title, m.items.map(i => i.title)])).toEqual([
    ["Onboarding Confirmation", ["Sign the code of conduct", "Set up club email"]],
    ["Tools", ["Get chat access"]],
  ])
  expect(JSON.stringify(saved)).not.toContain('"who"')
  await expect(page.getByTestId("count-everyone")).toHaveText("3")
})

test("Undo restores the previous saved version, and a module with items asks before it is deleted", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await row(page, "Meet your buddy").getByRole("button", { name: "Treasurer: gets Meet your buddy", exact: true }).click()
  await expect.poll(async () => itemOf(await checklist(page), "Meet your buddy")?.hiddenFor).toEqual(["r-fin"])
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect.poll(async () => itemOf(await checklist(page), "Meet your buddy")?.hiddenFor).toEqual([])
  await expect(row(page, "Meet your buddy").getByRole("button", { name: "Treasurer: gets Meet your buddy", exact: true })).toBeVisible()

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

test("the checklist survives a reload, including a typed module name and a keyboard move", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const name = page.getByRole("textbox", { name: "Module name", exact: true }).first()
  await name.fill("Week one basics")
  await expect.poll(async () => (await checklist(page))?.modules[0].title).toBe("Week one basics")
  await grip(page, "Meet your buddy").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Space")
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
  await row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets Join the officer group chat", exact: true }).click()
  await row(page, "Read the constitution").getByRole("combobox", { name: "When for Read the constitution: follows module, Week 1", exact: true }).selectOption("day1")
  await page.getByRole("button", { name: "Paste a list", exact: true }).click()
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  expect(await serious(page)).toEqual([])
})

test("an inherited chip shows only the value, dashed, and its name and first option say it follows the module", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const r = row(page, "Read the constitution")
  const when = r.getByRole("combobox", { name: "When for Read the constitution: follows module, Week 1", exact: true })
  await expect(when).toHaveValue("")
  await expect(when.locator("option").first()).toHaveText("Week 1 (module)")
  await expect(when.locator("..")).toHaveClass(/is-follow/)
  await expect(when.locator("..").locator(":scope > span")).toHaveText("Week 1")   // the visible pill: the value only
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Follows the module")
  // Set on the item: the chip fills and the name is plain again.
  await when.selectOption("day1")
  await expect(r.getByRole("combobox", { name: "When for Read the constitution", exact: true }).locator("..")).toHaveClass(/is-set/)
})

test("at 1440px every column of the seed club fits without scrolling, and long titles and rule tags stay readable", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a desktop width")
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page)
  await startStarter(page)
  await row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets Join the officer group chat", exact: true }).click()
  const { roles } = await read(page)
  expect(roles).toHaveLength(5)
  const box = await page.getByTestId("onboarding-frame").evaluate(wrap => {
    const w = wrap.getBoundingClientRect()
    return { left: w.left + wrap.clientLeft, right: w.left + wrap.clientLeft + wrap.clientWidth, scrollWidth: wrap.scrollWidth, clientWidth: wrap.clientWidth, scrollLeft: wrap.scrollLeft }
  })
  expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth)
  expect(box.scrollLeft).toBe(0)
  // Item, When, Everyone, every team and every role column, the last one included, lie inside the frame's visible box.
  for (const name of ["Item", "When", "Everyone", "Club leadership", "Operations", "Marketing", "Finance", ...roles.map(r => r.displayName)]) {
    const header = (await matrix(page).getByRole("columnheader", { name, exact: true }).boundingBox())!
    expect(header.x, name).toBeGreaterThanOrEqual(box.left - 1)
    expect(header.x + header.width, name).toBeLessThanOrEqual(box.right + 1)
  }
  // Titles wrap instead of being cut, and a rule tag sits on its own line under its title.
  const cut = await page.locator("textarea.ck-title").evaluateAll(els => els.filter(e => e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1).map(e => (e as HTMLTextAreaElement).value))
  expect(cut).toEqual([])
  const tagged = row(page, "Complete USG-T appropriations training")
  const [title, tag] = [(await tagged.getByRole("textbox", { name: "Item title", exact: true }).boundingBox())!, (await tagged.locator(".rule-id").boundingBox())!]
  expect(tag.y).toBeGreaterThanOrEqual(title.y + title.height - 1)
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("on a phone the sticky Item column is opaque, no header hides under it, When is reachable, and the page never scrolls sideways", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "a phone width")
  await open(page)
  await startStarter(page)
  await matrix(page).locator("thead").scrollIntoViewIfNeeded()
  const sticky = matrix(page).getByRole("columnheader", { name: "Item", exact: true })
  expect(await sticky.evaluate(el => getComputedStyle(el).backgroundColor)).toMatch(/^rgb\(/)   // rgb(), not a transparent rgba()
  // Scroll each column to the Item column's edge: the header is then in view, nothing covers its middle, and the page stays put.
  const headers = matrix(page).locator("thead th:not(.ck-corner):not(.ck-actions-head)")
  const count = await headers.count()
  expect(count).toBe(2 + 4 + 5)   // When, Everyone, four teams, five roles
  for (let i = 0; i < count; i++) {
    const seen = await headers.nth(i).evaluate(th => {
      const wrap = th.closest(".ck-wrap") as HTMLElement, item = wrap.querySelector("thead th.ck-corner") as HTMLElement
      wrap.scrollLeft = 0
      wrap.scrollLeft = th.getBoundingClientRect().left - item.getBoundingClientRect().right
      const r = th.getBoundingClientRect(), edge = item.getBoundingClientRect().right, w = wrap.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { name: th.textContent, clear: r.left >= edge - 1, inside: r.right <= w.right + 1, onTop: !!hit && th.contains(hit), overflow: document.documentElement.scrollWidth - innerWidth }
    })
    expect(seen, `${seen.name}`).toEqual({ name: seen.name, clear: true, inside: true, onTop: true, overflow: 0 })
  }
  // At the start When sits right next to the Item column.
  await page.getByTestId("onboarding-frame").evaluate(el => { el.scrollLeft = 0 })
  await expect(row(page, "Read the constitution").getByRole("combobox", { name: "When for Read the constitution: follows module, Week 1", exact: true })).toBeInViewport()
  // Each module's + Add item stays reachable on the right of the visible frame.
  await expect(page.getByRole("button", { name: "+ Add item to Learn the club", exact: true })).toBeInViewport()
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

/* ───────────── Template v2 (Section 8): teams above roles, module colours, drag and drop, frozen header ───────────── */

test("a team row sits above the role names in the Roles & teams order and tones, and Everyone spans both header rows", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const teams = matrix(page).getByTestId("onboarding-team")
  await expect(teams).toHaveText(["Club leadership", "Operations", "Marketing", "Finance"])
  expect(await teams.evaluateAll(els => els.map(e => [(e as HTMLTableCellElement).colSpan, [...e.classList].find(c => c.startsWith("wfx-tone-"))]))).toEqual([[1, "wfx-tone-0"], [2, "wfx-tone-1"], [1, "wfx-tone-2"], [1, "wfx-tone-3"]])
  expect(await matrix(page).locator("thead tr").nth(1).locator("th").allTextContents()).toEqual(["President", "Events lead", "Secretary", "Marketing lead", "Treasurer"])
  for (const name of ["Item", "When", "Everyone"]) expect(await matrix(page).getByRole("columnheader", { name, exact: true }).getAttribute("rowspan")).toBe("2")
  // Each team cell lies over its roles.
  const [finance, treasurer] = [(await teams.nth(3).boundingBox())!, (await matrix(page).getByRole("columnheader", { name: "Treasurer", exact: true }).boundingBox())!]
  expect(Math.abs(finance.x - treasurer.x)).toBeLessThanOrEqual(1)
  expect(finance.y + finance.height).toBeLessThanOrEqual(treasurer.y + 1)
  expect(await serious(page)).toEqual([])
})

test("renaming a team or moving a role in Roles & teams changes the matrix's team row", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await nav(page).getByRole("button", { name: "Roles & teams", exact: true }).click()
  await page.getByRole("button", { name: "Finance · 12 steps, edit team", exact: true }).click()
  await page.getByTestId("roles-inspector").getByLabel("Team name", { exact: true }).fill("Money")
  await expect.poll(async () => (await read(page)).org.workflowTeams!.find(t => t.id === "workflow-finance")!.name).toBe("Money")
  await page.getByRole("button", { name: "Secretary, Priya Nair", exact: true }).click()
  await page.getByTestId("roles-inspector").getByLabel("Team", { exact: true }).selectOption({ label: "Marketing" })
  await expect.poll(async () => (await read(page)).org.workflowRoleTeams!["r-sec"]).toBe("workflow-marketing")
  await nav(page).getByRole("button", { name: "Onboarding", exact: true }).click()
  const teams = matrix(page).getByTestId("onboarding-team")
  await expect(teams).toHaveText(["Club leadership", "Operations", "Marketing", "Money"])
  expect(await teams.evaluateAll(els => els.map(e => (e as HTMLTableCellElement).colSpan))).toEqual([1, 1, 2, 1])
  expect(await matrix(page).locator("thead tr").nth(1).locator("th").allTextContents()).toEqual(["President", "Events lead", "Marketing lead", "Secretary", "Treasurer"])
  // The checklist stores role ids only: the move changed no item.
  expect(JSON.stringify(await checklist(page))).not.toContain("workflow-")
  await expect(row(page, "Update the member roster in Sun Devil Central").getByRole("button", { name: /^Secretary: gets Update the member roster/ })).toBeVisible()
})

test("each module has its own soft colour: a left bar and a tinted header row, different from the next module", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const tone = (title: string) => moduleRow(page, title).evaluate(tr => {
    const th = tr.querySelector("th")!
    return { bar: getComputedStyle(th, "::before").backgroundColor, tint: getComputedStyle(th).backgroundColor, width: getComputedStyle(th, "::before").width }
  })
  const [a, b] = [await tone("First 3 days"), await tone("Learn the club")]
  expect(a.width).toBe("4px")
  expect(a.bar).not.toBe(b.bar)
  expect(a.tint).not.toBe(b.tint)
  // The bar runs down the module's item rows too.
  expect(await row(page, "Join the officer group chat").evaluate(tr => getComputedStyle(tr.querySelector("th")!, "::before").backgroundColor)).toBe(a.bar)
  // The module colours are not the team colours.
  const teamColours = await matrix(page).getByTestId("onboarding-team").evaluateAll(els => els.map(e => getComputedStyle(e).borderBottomColor))
  expect(teamColours).not.toContain(a.bar)
  expect(teamColours).not.toContain(b.bar)
})

test("a mouse drag moves an item into another module, Escape cancels a drag, and one Undo takes the drop back", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a mouse")
  await open(page)
  await startStarter(page)
  // Escape: nothing moves.
  await mouseDrag(page, grip(page, "Read the constitution"), row(page, "Request a Mazevo account"), 4, { escape: true })
  await expect(page.getByTestId("onboarding-drop-line")).toHaveCount(0)
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Move cancelled.")
  expect(await itemsIn(page, "Learn the club")).toContain("Read the constitution")
  // A drop between two items of another module.
  await mouseDrag(page, grip(page, "Read the constitution"), row(page, "Request a Mazevo account"), 4)
  await expect.poll(() => itemsIn(page, "Tools & access")).toEqual([
    "Sync the club calendar to your phone", "Update the Sun Devil Central profile", "Get added as a bank co-signer", "Complete USG-T appropriations training",
    "Walk through a budget request in Sun Devil Central", "Read the constitution", "Request a Mazevo account", "Register a practice event in Event Registry",
    "Read the ASU brand guidelines", "Get admin access to the club social accounts", "Update the member roster in Sun Devil Central",
  ])
  expect(await itemsIn(page, "Learn the club")).not.toContain("Read the constitution")
  await expect(grip(page, "Read the constitution")).toBeFocused()
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Moved Read the constitution. Position 6 of 11 in Tools & access.")
  // One Undo step per drop.
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect.poll(() => itemsIn(page, "Learn the club")).toEqual(["Read the constitution", "Read the ASU student org handbook", "Complete anti-hazing training", "Complete Officer Training", "Agree on 3–5 core duties with the president"])
  // Into an empty module, over its header row.
  await page.getByRole("button", { name: "+ Add module", exact: true }).click()
  await page.locator("textarea.ck-name:focus").fill("New module extra")
  await page.keyboard.press("Tab")
  await expect.poll(async () => (await checklist(page))?.modules.at(-1)?.title).toBe("New module extra")
  await mouseDrag(page, grip(page, "Meet your buddy"), moduleRow(page, "New module extra"), 10)
  await expect.poll(() => itemsIn(page, "New module extra")).toEqual(["Meet your buddy"])
  await expect.poll(() => itemsIn(page, "First 3 days")).toEqual(["Join the officer group chat", "Get added to the club shared drive"])
})

test("a module drags to another place by its grip", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a mouse")
  await open(page)
  await startStarter(page)
  await mouseDrag(page, moduleGrip(page, "Check-ins"), moduleRow(page, "First 3 days"), 4)
  await expect.poll(async () => (await checklist(page))?.modules.map(m => m.title)).toEqual(["Check-ins", "First 3 days", "Learn the club", "Tools & access", "Handoff from your predecessor"])
  await expect(moduleGrip(page, "Check-ins")).toBeFocused()
  // Its items came along.
  expect(await itemsIn(page, "Check-ins")).toEqual(["Week 2 check-in", "Day 30 review"])
})

test("the grip is a keyboard alternative: Space picks up, arrows move, Space drops, Escape cancels, each step announced", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const announce = page.getByTestId("onboarding-announce")
  expect(await announce.getAttribute("role")).toBe("status")
  const g = grip(page, "Get added to the club shared drive")
  await g.focus()
  await page.keyboard.press("Space")
  await expect(announce).toHaveText("Picked up Get added to the club shared drive. Position 3 of 3 in First 3 days. Arrow keys move it, Space drops it, Escape cancels.")
  await page.keyboard.press("ArrowUp")
  await expect(announce).toHaveText("Position 2 of 3 in First 3 days.")
  await page.keyboard.press("Escape")
  await expect(announce).toHaveText("Move cancelled.")
  await expect(g).toBeFocused()
  expect(await itemsIn(page, "First 3 days")).toEqual(["Join the officer group chat", "Meet your buddy", "Get added to the club shared drive"])
  // Down past the end of its module: the first place of the next one. Enter drops too.
  await page.keyboard.press("Enter")
  await page.keyboard.press("ArrowDown")
  await expect(announce).toHaveText("Position 1 of 6 in Learn the club.")
  await expect(g).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await expect(announce).toHaveText("Position 2 of 6 in Learn the club.")
  // Nothing is saved until the drop.
  expect(await itemsIn(page, "First 3 days")).toHaveLength(3)
  await page.keyboard.press("Enter")
  await expect(announce).toHaveText("Dropped Get added to the club shared drive. Position 2 of 6 in Learn the club.")
  await expect.poll(() => itemsIn(page, "Learn the club")).toEqual(["Read the constitution", "Get added to the club shared drive", "Read the ASU student org handbook", "Complete anti-hazing training", "Complete Officer Training", "Agree on 3–5 core duties with the president"])
  await expect(g).toBeFocused()
  // One Undo step for the whole move.
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect.poll(() => itemsIn(page, "First 3 days")).toEqual(["Join the officer group chat", "Meet your buddy", "Get added to the club shared drive"])
  // Modules too.
  await moduleGrip(page, "Check-ins").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowUp")
  await expect(announce).toHaveText("Position 4 of 5.")
  await page.keyboard.press("Space")
  await expect.poll(async () => (await checklist(page))?.modules.map(m => m.title)).toEqual(["First 3 days", "Learn the club", "Tools & access", "Check-ins", "Handoff from your predecessor"])
  await expect(moduleGrip(page, "Check-ins")).toBeFocused()
})

test("a keyboard move passes over a full module to the next one with room, as a pointer drag can, and says so", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await page.getByRole("button", { name: "Paste a list", exact: true }).click()
  await page.getByRole("textbox", { name: "Paste a list", exact: true }).fill(`Learn the club:\n${Array.from({ length: 55 }, (_, k) => `Task ${k}`).join("\n")}`)
  await page.getByRole("button", { name: "Add to checklist", exact: true }).click()
  await expect.poll(() => itemsIn(page, "Learn the club").then(t => t?.length)).toBe(60)
  const announce = page.getByTestId("onboarding-announce")
  await grip(page, "Get added to the club shared drive").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowDown")
  await expect(announce).toHaveText("Skipped Learn the club, which is full. Position 1 of 11 in Tools & access.")
  // And back over it: the end of First 3 days.
  await page.keyboard.press("ArrowUp")
  await expect(announce).toHaveText("Skipped Learn the club, which is full. Position 3 of 3 in First 3 days.")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Space")
  await expect.poll(async () => (await itemsIn(page, "Tools & access"))?.[0]).toBe("Get added to the club shared drive")
  expect(await itemsIn(page, "First 3 days")).toHaveLength(2)
  expect(await itemsIn(page, "Learn the club")).toHaveLength(60)
})

test("a finger drags an item by its grip on a phone after a press and hold", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "a touch screen")
  await open(page)
  await startStarter(page)
  const from = grip(page, "Day 30 review"), to = row(page, "Walk through open work together")
  // Mid-screen, away from the edges that scroll the view while a drag rests near them.
  await from.evaluate(el => el.scrollIntoView({ block: "center" }))
  await expect(to).toBeInViewport()
  const a = await centre(from), b = (await to.boundingBox())!
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: string, x: number, y: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] })
  await touch("touchStart", a.x, a.y)
  // A press and hold starts the drag (F3: a finger that moves at once scrolls instead).
  await page.waitForTimeout(350)
  const steps = 10
  for (let k = 1; k <= steps; k++) await touch("touchMove", a.x, a.y + (b.y + 4 - a.y) * k / steps)
  await expect(page.getByTestId("onboarding-drop-line")).toBeVisible()
  await touch("touchEnd", 0, 0)
  await expect.poll(() => itemsIn(page, "Handoff from your predecessor")).toEqual(["Day 30 review", "Walk through open work together", "Hand over account access", "Introduce key contacts"])
  expect(await itemsIn(page, "Check-ins")).toEqual(["Week 2 check-in"])
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("the header stays frozen while scrolling down to the last item, above the sticky Item column", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await row(page, "Day 30 review").scrollIntoViewIfNeeded()
  await expect(row(page, "Day 30 review")).toBeInViewport()
  for (const name of ["Treasurer", "Finance", "Everyone", "Item"]) {
    const header = matrix(page).getByRole("columnheader", { name, exact: true })
    const seen = await header.evaluate(th => {
      // On a phone, first bring the column in sideways (only sideways: the frame keeps its vertical scroll).
      const wrap = th.closest(".ck-wrap") as HTMLElement, corner = wrap.querySelector("thead th.ck-corner") as HTMLElement
      wrap.scrollLeft = 0
      if (th !== corner && th.getBoundingClientRect().right > wrap.getBoundingClientRect().right) wrap.scrollLeft = th.getBoundingClientRect().left - corner.getBoundingClientRect().right
      const r = th.getBoundingClientRect(), bar = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { onTop: !!hit && th.contains(hit), belowBar: r.top >= bar - 1, inViewport: r.top >= 0 && r.bottom <= innerHeight }
    })
    expect(seen, name).toEqual({ onTop: true, belowBar: true, inViewport: true })
  }
  // The frame really scrolled: the first module's row is under the header now, not beside it.
  const [head, first] = [(await matrix(page).locator("thead").boundingBox())!, (await moduleRow(page, "First 3 days").boundingBox())!]
  expect(first.y).toBeLessThan(head.y)
  // Scrolled sideways as well (a phone), the corner stays over both the header and the Item column.
  await page.getByTestId("onboarding-frame").evaluate(el => { el.scrollLeft = 10_000 })
  const corner = await matrix(page).locator("thead th.ck-corner").evaluate(th => { const r = th.getBoundingClientRect(), hit = document.elementFromPoint(r.left + 20, r.top + r.height / 2); return !!hit && th.contains(hit) })
  expect(corner).toBe(true)
})

/* ───────────── Review fixes (F2): saving at the edges, reset, damaged saves, deleting, focus, limits, names ───────────── */

const titlesIn = (c: OnboardingChecklist | undefined) => c?.modules.flatMap(m => m.items.map(i => i.title)) ?? []
const titleField = (page: Page, title: string) => row(page, title).getByRole("textbox", { name: "Item title", exact: true })
/** What has focus: the tag, its accessible label, and the title of the row it sits in. */
const focused = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement, tr = a.closest("tr")
  const title = tr?.querySelector<HTMLTextAreaElement>("textarea.ck-title, textarea.ck-name")?.value ?? null
  return { tag: a.tagName, label: a.getAttribute("aria-label") ?? a.textContent ?? "", row: title }
})
/** Pastes `text` into the focused field as a clipboard paste would. */
const pasteText = (page: Page, text: string) => page.evaluate(t => {
  const dt = new DataTransfer(); dt.setData("text/plain", t)
  document.activeElement!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }))
}, text)

test("typing is saved when the page reloads right after it", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await titleField(page, "Read the constitution").fill("Read the constitution twice")
  await page.reload()
  expect(titlesIn(await checklist(page))).toContain("Read the constitution twice")
})

test("typing is saved before View as switches to an officer who cannot edit the checklist", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await titleField(page, "Read the constitution").fill("Read the constitution twice")
  await viewAs(page, "maya")
  await page.waitForTimeout(800)
  expect(titlesIn(await checklist(page))).toContain("Read the constitution twice")
})

test("Reset demo drops typing still waiting and the Undo history of the old checklist", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await row(page, "Meet your buddy").getByRole("button", { name: /^Treasurer: / }).click()
  await expect.poll(async () => itemOf(await checklist(page), "Meet your buddy")?.hiddenFor).toEqual(["r-fin"])
  // Arm Reset first, then type without leaving the field, then reset with a script click, so the typing is still waiting.
  await openDemoMenu(page)
  await page.getByTestId("reset-demo").click()
  await expect(page.getByTestId("reset-demo")).toHaveText("Click again to reset")
  await page.getByRole("textbox", { name: "Module name", exact: true }).first().focus()
  await page.keyboard.type(" typed")
  await page.evaluate(() => (document.querySelector("[data-testid=reset-demo]") as HTMLButtonElement).click())
  await expect(page.getByTestId("onboarding-empty")).toBeVisible()
  await page.waitForTimeout(800)
  expect((await checklist(page)) ?? null).toBeNull()
  await expect(page.getByTestId("onboarding-empty")).toBeVisible()
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0)
})

test("a damaged saved checklist never breaks Settings: what can be read shows, the rest says it could not be read", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", e => errors.push(e.message))
  await open(page)
  const seed = async (value: unknown) => {
    await page.evaluate(v => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); s.org.onboardingChecklist = v; localStorage.setItem("platypus.v1.demo", JSON.stringify(s)) }, value)
    await page.reload()
    await closeRail(page)
    await nav(page).getByRole("button", { name: "Onboarding", exact: true }).click()
  }
  // A module without its items list (and a template v1 "who"): the module still shows, with no items.
  await seed({ version: 1, updatedOn: "", modules: [{ id: "a", title: "Damaged module", when: "none", who: "new" }] })
  await expect(page.getByRole("textbox", { name: "Module name", exact: true })).toHaveValue("Damaged module")
  await expect(page.getByTestId("onboarding-item")).toHaveCount(0)
  // Not a checklist at all: the empty state, one line saying so, and the starter still works over it.
  await seed({ version: 7, modules: "nope" })
  await expect(page.getByTestId("onboarding-empty")).toContainText("The saved checklist could not be read.")
  await startStarter(page)
  await expect(page.getByTestId("onboarding-empty")).toHaveCount(0)
  expect(errors).toEqual([])
})

test("only the inline Delete deletes a module: a double press on × opens the prompt, Escape cancels and gives focus back", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const first = moduleRow(page, "First 3 days")
  const x = first.getByRole("button", { name: "Delete module", exact: true })
  await x.dblclick()
  await page.waitForTimeout(300)
  expect((await checklist(page))?.modules).toHaveLength(5)
  await expect(first.getByRole("alert")).toHaveText("Delete 3 items too?")
  // One press: the prompt takes focus on its Cancel button (on a phone the second press of a double tap may land elsewhere).
  await first.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(first.getByRole("alert")).toHaveCount(0)
  await x.click()
  await expect(first.getByRole("button", { name: "Cancel", exact: true })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(first.getByRole("alert")).toHaveCount(0)
  await expect(x).toBeFocused()
  await x.press("Enter")
  await x.press("Enter")
  expect((await checklist(page))?.modules).toHaveLength(5)
  await expect(first.getByRole("button", { name: "Cancel", exact: true })).toBeVisible()
  await first.getByRole("button", { name: "Delete", exact: true }).click()
  await expect.poll(async () => (await checklist(page))?.modules).toHaveLength(4)
  // Focus lands on the next module's name, not on the page.
  expect(await focused(page)).toEqual({ tag: "TEXTAREA", label: "Module name", row: "Learn the club" })
})

test("focus stays on a moved row's grip across modules and for modules, and lands on a neighbour after a delete", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const move = async (g: Locator, key: "ArrowUp" | "ArrowDown") => { await g.focus(); await page.keyboard.press("Space"); await page.keyboard.press(key); await page.keyboard.press("Space") }
  await move(grip(page, "Join the officer group chat"), "ArrowDown")
  expect(await focused(page)).toEqual({ tag: "BUTTON", label: "Move Join the officer group chat", row: "Join the officer group chat" })
  await move(grip(page, "Get added to the club shared drive"), "ArrowDown")
  await expect.poll(async () => (await checklist(page))?.modules[1].items[0].title).toBe("Get added to the club shared drive")
  expect(await focused(page)).toEqual({ tag: "BUTTON", label: "Move Get added to the club shared drive", row: "Get added to the club shared drive" })
  await row(page, "Join the officer group chat").getByRole("button", { name: "Delete item", exact: true }).click()
  expect(await focused(page)).toEqual({ tag: "TEXTAREA", label: "Item title", row: "Meet your buddy" })
  await row(page, "Meet your buddy").getByRole("button", { name: "Delete item", exact: true }).click()
  expect(await focused(page)).toEqual({ tag: "TEXTAREA", label: "Module name", row: "First 3 days" })
  await move(moduleGrip(page, "Learn the club"), "ArrowUp")
  await expect.poll(async () => (await checklist(page))?.modules[0].title).toBe("Learn the club")
  expect(await focused(page)).toEqual({ tag: "BUTTON", label: "Move module Learn the club", row: "Learn the club" })
})

test("an item without a title says it will not be saved, and the status does not claim Saved", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await page.getByRole("button", { name: "+ Add item to Check-ins", exact: true }).click()
  const last = page.getByTestId("onboarding-item").last()
  await last.getByRole("button", { name: /^Treasurer: / }).click()
  await page.waitForTimeout(700)
  await expect(page.getByTestId("onboarding-status")).toHaveText("1 item needs a title")
  await expect(last).toContainText("Add a title to save")
  const field = last.getByRole("textbox", { name: "Item title", exact: true })
  await expect(field).toHaveAccessibleDescription("Add a title to save")
  await field.fill("Shadow the treasurer")
  await expect(page.getByTestId("onboarding-status")).toHaveText("Saved")
  await expect(row(page, "Shadow the treasurer")).not.toContainText("Add a title to save")
  await expect.poll(async () => itemOf(await checklist(page), "Shadow the treasurer")?.hiddenFor).toEqual(["r-fin"])
})

test("several lines pasted into a title keep the 120-character cap and place Section: lines like Paste a list", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await titleField(page, "Read the constitution").focus()
  await pasteText(page, `Extra A\n${"L".repeat(150)}\nTools & access:\nExtra B\nNew section:\nExtra C`)
  await expect.poll(async () => (await checklist(page))?.modules.map(m => m.title)).toEqual(["First 3 days", "Learn the club", "Tools & access", "Handoff from your predecessor", "Check-ins", "New section"])
  const c = (await checklist(page))!
  const learn = c.modules[1].items.map(i => i.title), at = learn.indexOf("Read the constitution")
  expect(learn.slice(at, at + 3)).toEqual(["Read the constitution", "Extra A", "L".repeat(120)])
  expect(c.modules[2].items.at(-1)?.title).toBe("Extra B")
  expect(c.modules[5].items.map(i => i.title)).toEqual(["Extra C"])
  // Focus stays where the lines went in: the last line placed below the row, shown capped.
  await expect(page.locator("textarea.ck-title:focus")).toHaveValue("L".repeat(120))
})

test("limits say what they cut: the paste preview counts what fits, and Enter in a full module explains", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await page.getByRole("button", { name: "Paste a list", exact: true }).click()
  await page.getByRole("textbox", { name: "Paste a list", exact: true }).fill(`First 3 days:\n${Array.from({ length: 60 }, (_, k) => `Task ${k}`).join("\n")}`)
  await expect(page.getByTestId("onboarding-paste-preview")).toHaveText("57 of 60 items fit: a module holds at most 60.")
  await page.getByRole("button", { name: "Add to checklist", exact: true }).click()
  await expect(page.getByTestId("onboarding-note")).toHaveText("Added 57 of 60 items: a module holds at most 60.")
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Added 57 of 60 items: a module holds at most 60.")
  await expect.poll(async () => (await checklist(page))?.modules[0].items).toHaveLength(60)
  await expect(page.getByRole("button", { name: "+ Add item to First 3 days", exact: true })).toBeDisabled()
  await titleField(page, "Task 10").press("Enter")
  await expect(page.getByTestId("onboarding-note")).toHaveText("No room for another item: a module holds at most 60.")
  await expect(page.getByTestId("onboarding-item")).toHaveCount(80)
})

test("the save status is not a live region; Undo is announced; cells and selects name their item", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const status = page.getByTestId("onboarding-status")
  expect(await status.evaluate(el => !!el.closest("[role=status], [role=alert], [aria-live]"))).toBe(false)
  await titleField(page, "Read the constitution").fill("Read the constitution now")
  await expect(status).toHaveText("Saved")
  await expect(page.getByTestId("onboarding-announce")).toHaveText("")
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Undid the last change.")
  const r = row(page, "Join the officer group chat")
  await expect(r.getByRole("button", { name: "Treasurer: gets Join the officer group chat", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(r.getByRole("button", { name: "Everyone: all roles get Join the officer group chat", exact: true })).toBeVisible()
  await expect(r.getByRole("combobox", { name: "When for Join the officer group chat: follows module, Day 3", exact: true })).toHaveValue("")
  await expect(r.getByRole("button", { name: "Move Join the officer group chat", exact: true })).toHaveAccessibleDescription("Drag to move, or press Space, then the arrow keys.")
  // Long titles are cut to about 40 characters in the name.
  await expect(row(page, "Walk through a budget request in Sun Devil Central").getByRole("button", { name: "Treasurer: gets Walk through a budget request in Sun De…", exact: true })).toBeVisible()
})

/* ───────────── Review fixes (F3): drops outside the frame, touch, focus after a cancelled lift, short windows, tones ───────────── */

const shownTitles = (page: Page, module: string) => page.getByTestId("onboarding-module-group").filter({ has: moduleRow(page, module) }).locator("textarea.ck-title").evaluateAll(els => els.map(e => (e as HTMLTextAreaElement).value))
const modulesNow = async (page: Page) => JSON.stringify((await checklist(page))?.modules)

test("a release outside the frame's visible box cancels the drag: beside the table, above it and below it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a mouse")
  await page.setViewportSize({ width: 1600, height: 900 })
  await open(page)
  await startStarter(page)
  const before = await modulesNow(page)
  const frame = (await page.getByTestId("onboarding-frame").boundingBox())!
  const heading = (await page.getByRole("heading", { name: "Onboarding checklist", exact: true }).boundingBox())!
  const legend = (await page.getByRole("list", { name: "Legend" }).boundingBox())!
  expect(frame.x + frame.width + 20).toBeLessThan(1600)
  const announce = page.getByTestId("onboarding-announce")
  for (const [where, x, y] of [
    ["right", frame.x + frame.width + 20, frame.y + 200], ["left", frame.x - 12, frame.y + 200],
    ["above", frame.x + 300, heading.y + heading.height / 2], ["below", legend.x + 20, legend.y + legend.height / 2],
  ] as const) {
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector(".ck-wrap")!.scrollTop = 0 })
    const a = await centre(grip(page, "Read the constitution"))
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(a.x, a.y + 30, { steps: 4 })
    await expect(page.getByTestId("onboarding-drop-line"), where).toBeVisible()
    await page.mouse.move(x, y, { steps: 6 })
    // Outside: no drop line, so nothing suggests a place.
    await expect(page.getByTestId("onboarding-drop-line"), where).toHaveCount(0)
    await page.mouse.up()
    await expect(announce, where).toHaveText("Move cancelled.")
    expect(await modulesNow(page), where).toBe(before)
    await announce.evaluate(el => { el.textContent = "" })
  }
})

test("a drop on the row's own place says Not moved", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "a mouse")
  await open(page)
  await startStarter(page)
  const before = await modulesNow(page)
  const g = grip(page, "Meet your buddy"), a = await centre(g)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(a.x, a.y + 10, { steps: 3 })
  await page.mouse.move(a.x, a.y + 2, { steps: 2 })
  await expect(page.getByTestId("onboarding-drop-line")).toBeVisible()
  await page.mouse.up()
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Not moved.")
  await expect(g).toBeFocused()
  expect(await modulesNow(page)).toBe(before)
})

test("Tab away from a row lifted into another module puts it back and keeps focus where Tab went", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await grip(page, "Join the officer group chat").focus()
  await page.keyboard.press("Space")
  for (let k = 0; k < 3; k++) await page.keyboard.press("ArrowDown")
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Position 1 of 6 in Learn the club.")
  await page.keyboard.press("Tab")
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Move cancelled.")
  expect(await shownTitles(page, "First 3 days")).toEqual(["Join the officer group chat", "Meet your buddy", "Get added to the club shared drive"])
  // The row went back to its module (and was rebuilt there): focus is on its title, the next stop after the grip, not on the page.
  await expect.poll(() => focused(page)).toEqual({ tag: "TEXTAREA", label: "Item title", row: "Join the officer group chat" })
  // Shift+Tab the other way: focus stays on a control, never on the page.
  await grip(page, "Meet your buddy").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Shift+Tab")
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Move cancelled.")
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY")
})

test("a pointer press elsewhere puts a lifted row back; a press on a cell still toggles it", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const announce = page.getByTestId("onboarding-announce")
  await grip(page, "Join the officer group chat").focus()
  await page.keyboard.press("Space")
  for (let k = 0; k < 3; k++) await page.keyboard.press("ArrowDown")
  await expect(announce).toHaveText("Position 1 of 6 in Learn the club.")
  await page.getByRole("heading", { name: "Onboarding checklist", exact: true }).click()
  await expect(announce).toHaveText("Move cancelled.")
  expect(await shownTitles(page, "First 3 days")).toEqual(["Join the officer group chat", "Meet your buddy", "Get added to the club shared drive"])
  await expect(grip(page, "Join the officer group chat")).not.toHaveClass(/is-lifted/)
  // Lifted again, then a press on a cell of another module: the row goes back and the cell changes.
  await grip(page, "Join the officer group chat").focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowDown")
  await row(page, "Request a Mazevo account").getByRole("button", { name: "Treasurer: does not get Request a Mazevo account", exact: true }).click()
  await expect(row(page, "Request a Mazevo account").getByRole("button", { name: "Treasurer: gets Request a Mazevo account", exact: true })).toHaveAttribute("aria-pressed", "true")
  expect(await shownTitles(page, "First 3 days")).toEqual(["Join the officer group chat", "Meet your buddy", "Get added to the club shared drive"])
  await expect.poll(() => itemsIn(page, "First 3 days")).toEqual(["Join the officer group chat", "Meet your buddy", "Get added to the club shared drive"])
})

test("holding Space on a grip picks the row up once and does not drop it at once", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const g = grip(page, "Meet your buddy")
  await g.focus()
  await page.keyboard.down(" ")
  await page.keyboard.down(" ")   // a key repeat
  await page.keyboard.up(" ")
  await expect(g).toHaveClass(/is-lifted/)
  await expect(page.getByTestId("onboarding-announce")).toHaveText("Picked up Meet your buddy. Position 2 of 3 in First 3 days. Arrow keys move it, Space drops it, Escape cancels.")
  await page.keyboard.press("Escape")
  await expect(g).not.toHaveClass(/is-lifted/)
})

for (const vp of [{ width: 640, height: 360 }, { width: 1280, height: 720 }]) {
  test(`at ${vp.width}×${vp.height} the frozen header stays below the top bar with the page scrolled to its end`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "a desktop window size or zoom")
    await page.setViewportSize(vp)
    await open(page)
    await startStarter(page)
    await page.evaluate(() => { scrollTo(0, 1e6); document.querySelector(".ck-wrap")!.scrollTop = 1e6 })
    await page.waitForTimeout(100)
    const seen = await page.getByTestId("onboarding-frame").evaluate(wrap => {
      const thead = wrap.querySelector("thead")!, head = thead.getBoundingClientRect(), bar = document.querySelector(".topbar")!.getBoundingClientRect().bottom
      const hit = document.elementFromPoint(head.left + 30, head.top + 5)
      return { belowBar: head.top >= bar - 1, onTop: !!hit && thead.contains(hit), scrolled: wrap.scrollTop > 0, atEnd: Math.abs(scrollY - (document.documentElement.scrollHeight - innerHeight)) <= 1 }
    })
    expect(seen).toEqual({ belowBar: true, onTop: true, scrolled: true, atEnd: true })
  })
}

test("rows focused from the bottom up are never hidden under the frozen header", async ({ page }) => {
  await open(page)
  await startStarter(page)
  const hidden = await page.getByTestId("onboarding-frame").evaluate(async wrap => {
    const thead = wrap.querySelector("thead")!
    wrap.scrollTop = wrap.scrollHeight
    await new Promise(r => setTimeout(r, 50))
    const out: string[] = []
    for (const f of [...wrap.querySelectorAll<HTMLTextAreaElement>("textarea.ck-title, textarea.ck-name")].reverse()) {
      f.focus()
      await new Promise(r => setTimeout(r, 0))
      const fr = f.getBoundingClientRect(), hr = thead.getBoundingClientRect()
      if (fr.top < hr.bottom - 1) out.push(`${f.value}: ${Math.round(hr.bottom - fr.top)}px`)
    }
    return out
  })
  expect(hidden).toEqual([])
})

test("on a phone the last rows scroll clear of the floating Ask button", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "a phone width")
  await open(page)
  await startStarter(page)
  const fab = (await page.locator(".ask-fab").boundingBox())!
  // The frame's lower edge at the bottom of the screen, under the button, and the frame scrolled to its end.
  const seen = await page.getByTestId("onboarding-frame").evaluate(wrap => {
    scrollBy(0, wrap.getBoundingClientRect().bottom - innerHeight)
    wrap.scrollTop = 1e6
    return { frameBottom: wrap.getBoundingClientRect().bottom, lastRow: wrap.querySelector("tfoot tr")!.getBoundingClientRect().bottom }
  })
  expect(seen.frameBottom).toBeGreaterThan(fab.y + fab.height)
  expect(seen.lastRow).toBeLessThanOrEqual(fab.y)
})

test("a quick finger swipe that starts on a grip scrolls and does not reorder", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "a touch screen")
  await open(page)
  await startStarter(page)
  const before = await modulesNow(page)
  const from = grip(page, "Read the constitution")
  await from.scrollIntoViewIfNeeded()
  const a = await centre(from)
  const scrolled = () => page.evaluate(() => scrollY + document.querySelector(".ck-wrap")!.scrollTop)
  const start = await scrolled()
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: string, x: number, y: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] })
  await touch("touchStart", a.x, a.y)
  for (let k = 1; k <= 6; k++) await touch("touchMove", a.x, a.y - 30 * k)
  await expect(page.getByTestId("onboarding-drop-line")).toHaveCount(0)
  await touch("touchEnd", 0, 0)
  await page.waitForTimeout(300)
  expect(await scrolled()).toBeGreaterThan(start + 20)
  expect(await modulesNow(page)).toBe(before)
})

test("six modules and six teams each get their own tone: module tones 0–5 and team tones 0–5", async ({ page }) => {
  await open(page)
  // A fictional club with six roles, each in its own team (the sixth role is a copy of the seed's Secretary, with no holder).
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    const sec = s.roles.find((r: { id: string }) => r.id === "r-sec")
    s.roles.push({ ...sec, id: "r-web", displayName: "Webmaster", holderId: null })
    s.org.workflowTeams = [...s.org.workflowTeams.slice(0, 4), { id: "workflow-outreach", name: "Outreach" }, { id: "workflow-web", name: "Web" }]
    s.org.workflowRoleTeams = Object.fromEntries(s.roles.map((r: { id: string }, k: number) => [r.id, s.org.workflowTeams[k].id]))
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
  })
  await page.reload()
  await closeRail(page)
  await nav(page).getByRole("button", { name: "Onboarding", exact: true }).click()
  await startStarter(page)
  await page.getByRole("button", { name: "+ Add module", exact: true }).click()
  await expect(page.getByTestId("onboarding-module")).toHaveCount(6)
  const teams = matrix(page).getByTestId("onboarding-team")
  await expect(teams).toHaveCount(6)
  const team = await teams.evaluateAll(els => els.map(e => ({ tone: [...e.classList].find(c => c.startsWith("wfx-tone-")), colour: getComputedStyle(e).borderBottomColor })))
  expect(team.map(t => t.tone)).toEqual(["wfx-tone-0", "wfx-tone-1", "wfx-tone-2", "wfx-tone-3", "wfx-tone-4", "wfx-tone-5"])
  expect(new Set(team.map(t => t.colour)).size).toBe(6)
  const mods = await page.getByTestId("onboarding-module-group").evaluateAll(els => els.map(e => {
    const th = e.querySelector("th")!
    return { tone: [...e.classList].find(c => c.startsWith("ck-mod-")), bar: getComputedStyle(th, "::before").backgroundColor, tint: getComputedStyle(th).backgroundColor }
  }))
  expect(mods.map(m => m.tone)).toEqual(["ck-mod-0", "ck-mod-1", "ck-mod-2", "ck-mod-3", "ck-mod-4", "ck-mod-5"])
  expect(new Set(mods.map(m => m.bar)).size).toBe(6)
  expect(new Set(mods.map(m => m.tint)).size).toBe(6)
  // No module bar is a team colour.
  for (const m of mods) expect(team.map(t => t.colour)).not.toContain(m.bar)
})
