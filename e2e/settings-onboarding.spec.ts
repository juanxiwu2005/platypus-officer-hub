import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, openDemoMenu, viewAs } from "./helpers"
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

  const cell = row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: gets Join the officer group chat", exact: true })
  await expect(cell).toHaveAttribute("aria-pressed", "true")
  await cell.click()
  const hidden = row(page, "Join the officer group chat").getByRole("button", { name: "Treasurer: hidden for Join the officer group chat", exact: true })
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
  await r.getByRole("button", { name: "Everyone: on for Read the constitution", exact: true }).click()
  await expect(r.getByRole("button", { name: "Everyone: off for Read the constitution", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(r.getByRole("button", { name: "Treasurer: does not get Read the constitution", exact: true })).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByTestId("count-everyone")).toHaveText("12")
  await r.getByRole("button", { name: "Treasurer: does not get Read the constitution", exact: true }).click()
  await expect(r.getByRole("button", { name: "Treasurer: gets Read the constitution", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(r.getByRole("button", { name: "Secretary: does not get Read the constitution", exact: true })).toBeVisible()
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
  await expect(mentor.getByRole("combobox", { name: "Who does it for Meet your mentor", exact: true })).toHaveValue("buddy")
  await expect(mentor.getByRole("combobox", { name: "When for Meet your mentor", exact: true })).toHaveValue("day3")
  await expect(mentor.getByRole("combobox", { name: "When for Meet your mentor", exact: true }).locator("..")).toHaveClass(/is-set/)
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
  const who = r.getByRole("combobox", { name: "Who does it for Read the constitution: follows module, New officer", exact: true })
  await expect(who).toHaveValue("")
  await expect(who.locator("..").locator(":scope > span")).toHaveText("New officer")
  await expect(who.locator("option").first()).toHaveText("New officer (module)")
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
  await expect(row(page, "Read the constitution").getByRole("combobox", { name: "When for Read the constitution: follows module, Week 1", exact: true })).toBeInViewport()
  await expect(row(page, "Read the constitution").getByRole("combobox", { name: "Who does it for Read the constitution: follows module, New officer", exact: true })).toBeInViewport()
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
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
  // A module without its items list: the module still shows, with no items.
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

test("focus follows a moved item across modules, a moved module, and lands on a neighbour after a delete", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await row(page, "Join the officer group chat").getByRole("button", { name: "Move item down", exact: true }).click()
  expect(await focused(page)).toEqual({ tag: "BUTTON", label: "Move item down", row: "Join the officer group chat" })
  await row(page, "Get added to the club shared drive").getByRole("button", { name: "Move item down", exact: true }).click()
  await expect.poll(async () => (await checklist(page))?.modules[1].items[0].title).toBe("Get added to the club shared drive")
  expect(await focused(page)).toEqual({ tag: "BUTTON", label: "Move item down", row: "Get added to the club shared drive" })
  await row(page, "Join the officer group chat").getByRole("button", { name: "Delete item", exact: true }).click()
  expect(await focused(page)).toEqual({ tag: "TEXTAREA", label: "Item title", row: "Meet your buddy" })
  await row(page, "Meet your buddy").getByRole("button", { name: "Delete item", exact: true }).click()
  expect(await focused(page)).toEqual({ tag: "TEXTAREA", label: "Module name", row: "First 3 days" })
  await moduleRow(page, "Learn the club").getByRole("button", { name: "Move module up", exact: true }).click()
  await expect.poll(async () => (await checklist(page))?.modules[0].title).toBe("Learn the club")
  // At the top the Up button is disabled, so focus goes to the module's name.
  expect(await focused(page)).toEqual({ tag: "TEXTAREA", label: "Module name", row: "Learn the club" })
  await moduleRow(page, "Tools & access").getByRole("button", { name: "Move module up", exact: true }).click()
  expect(await focused(page)).toEqual({ tag: "BUTTON", label: "Move module up", row: "Tools & access" })
})

test("an item without a title says it will not be saved, and the status does not claim Saved", async ({ page }) => {
  await open(page)
  await startStarter(page)
  await page.getByRole("button", { name: "+ Add item", exact: true }).click()
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
  await expect(r.getByRole("button", { name: "Everyone: on for Join the officer group chat", exact: true })).toBeVisible()
  await expect(r.getByRole("combobox", { name: "When for Join the officer group chat: follows module, Day 3", exact: true })).toHaveValue("")
  await expect(r.getByRole("combobox", { name: "Who does it for Join the officer group chat: follows module, New officer", exact: true })).toHaveValue("")
  // Long titles are cut to about 40 characters in the name.
  await expect(row(page, "Walk through a budget request in Sun Devil Central").getByRole("button", { name: "Treasurer: gets Walk through a budget request in Sun De…", exact: true })).toBeVisible()
})
