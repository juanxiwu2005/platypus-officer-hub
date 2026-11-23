import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { ask, closeRail, viewAs } from "./helpers"

// WCAG 2.0, 2.1 and 2.2 A/AA scan of every page and the main panels, on desktop and phone (S6).
// wcag22aa is what switches on axe's target-size rule (WCAG 2.5.8, touch targets of at least 24x24).
const PAGES = ["/", "/events", "/events?view=budget", "/tasks", "/team", "/funding", "/handoff", "/rules", "/settings", "/help"]
const scan = async (page: import("@playwright/test").Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

for (const path of PAGES) test(`no accessibility violations on ${path}`, async ({ page }) => {
  await page.goto(`/#${path}`)
  await expect(page.locator("main h1")).toBeVisible()
  expect(await scan(page)).toEqual([])
})
test("no accessibility violations in the Ask panel, a task's details and the board", async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/")
  await ask(page, "Plan Founder Dinner on Nov 19, 30 people")
  await ask(page, "What are my top 5 tasks?")
  expect(await scan(page)).toEqual([])
  await closeRail(page) // on a phone the panel covers the page
  await page.goto("/#/tasks?node=e-night:purchaseRequest")
  await expect(page.getByTestId("task-detail")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await closeRail(page)
  expect(await scan(page)).toEqual([])
})
test("no accessibility violations on any setup step, with a constitution read", async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/setup/constitution", r => r.fulfill({ status: 503, json: {} }))
  await page.goto("/#/setup")
  await page.getByLabel("Club name").fill("Fictional accessible club")
  expect(await scan(page)).toEqual([])
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: /Use sample/ }).click()
  expect(await scan(page)).toEqual([])
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("textbox", { name: "Mission", exact: true }).fill("Build together.")
  expect(await scan(page)).toEqual([])
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Continue", exact: true }).click()
    expect(await scan(page)).toEqual([])
  }
  // ob-5 (S2): First event is the last optional step; Skip for now goes straight to Confirm (no Reminders screen).
  await page.getByRole("button", { name: "Skip for now", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Ready to start?" })).toBeVisible()
  expect(await scan(page)).toEqual([])

})
test("Owners: Escape dismisses suggestions without closing the task form", async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false } }))
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: {} }))
  await page.goto("/#/")
  await ask(page, "Create an executable task: order name tags for Maya")
  const form = page.getByTestId("task-form")
  const owners = form.getByLabel("Owners", { exact: true })
  await owners.fill("Jordan, Treas")
  await owners.press("Enter")
  await expect(form.locator(".owner-chip")).toHaveCount(3)
  await expect(form.getByRole("listbox", { name: "People and roles" })).toBeVisible()
  await owners.press("Escape")
  await expect(form.getByRole("listbox", { name: "People and roles" })).toHaveCount(0)
  await expect(form).toBeVisible()
  await expect(owners).toBeFocused()
  await expect(form.getByRole("button", { name: "Create 2 tasks" })).toBeVisible()
})
test("keyboard: / focuses Ask, Escape closes details, a flow step opens with Enter", async ({ page }) => {
  await page.goto("/#/events")
  await page.locator("main").focus()
  await page.keyboard.press("/")
  await expect(page.locator("#ask-input")).toBeFocused()
  await closeRail(page) // on a phone the Ask panel covers the page
  await page.getByTestId("flow-node-purchaseRequest").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("task-detail")).toBeVisible()
  await expect.poll(() => page.getByRole("region", { name: "Details" }).evaluate(el => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("task-detail")).toHaveCount(0)
  await expect(page.getByTestId("flow-node-purchaseRequest")).toBeFocused()
})

test("keyboard: / stays in text inputs and Ask's textarea while typing", async ({ page }) => {
  await page.goto("/#/tasks")
  await page.getByTestId("new-task").click()
  const name = page.getByLabel("New task name")
  await name.press("/")
  await expect(name).toHaveValue("/")
  await expect(name).toBeFocused()
  // FB-5: the form now has Assign to and Due after the name (a select and a date field, where "/" also stays), so
  // leave the fields for the form's Add button before pressing "/".
  await page.getByTestId("new-task-form").getByRole("button", { name: "Add", exact: true }).focus()
  await page.keyboard.press("/")
  const input = page.locator("#ask-input")
  await expect(input).toBeFocused()
  await input.press("/")
  await expect(input).toHaveValue("/")
  await expect(input).toBeFocused()
})

test("brand link includes the visible organization name after editing and opens Home by keyboard", async ({ page }) => {
  await page.goto("/#/settings")
  await closeRail(page)
  const club = page.getByTestId("club-settings")
  const name = "Fictional Access Club"
  await club.getByLabel("Club name", { exact: true }).fill(name)
  await expect(club.getByRole("status")).toContainText("Saved")
  const home = page.getByRole("link", { name: `Platypus ${name}`, exact: true })
  await expect(home.locator("span")).toHaveText(name)
  await expect(home).toContainText("Platypus")
  expect(await scan(page)).toEqual([])
  await home.focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.locator("main h1")).toHaveText("Reminders")
})

// ---- S6: keyboard and right-rail focus ----

test("keyboard: Tab follows reading order, top bar then side navigation then the page", async ({ page }) => {
  await page.goto("/#/tasks")
  await page.waitForTimeout(300)
  const regions = ["topbar", "sidenav", "main", "rail"]
  const seen: number[] = []
  const orgName = await page.locator(".brand span").textContent()
  const first = page.getByRole("link", { name: `Platypus ${orgName}`, exact: true })
  await first.focus()
  for (let i = 0; i < 160; i++) {
    const r = await page.evaluate(() => {
      const a = document.activeElement
      if (!a || a === document.body) return "none"
      if (a.closest("header.topbar")) return "topbar"
      if (a.closest("nav.sidenav")) return "sidenav"
      if (a.closest("main")) return "main"
      if (a.closest("aside.rail")) return "rail"
      return a.closest(".ask-fab") ? "fab" : "other"
    })
    const idx = regions.indexOf(r)
    if (idx >= 0) seen.push(idx)
    await page.keyboard.press("Tab")
    if (await first.evaluate(el => el === document.activeElement)) break
    expect(i, "Tab should complete a single traversal of the page").toBeLessThan(159)
  }
  expect(seen.length).toBeGreaterThan(10)
  expect(seen).toEqual([...seen].sort((a, b) => a - b))
  expect(new Set(seen).size).toBeGreaterThanOrEqual(3)
})

type Pg = import("@playwright/test").Page
const DETAIL_TRIGGERS: [string, string, (p: Pg) => import("@playwright/test").Locator][] = [
  ["flow step", "/events", p => p.getByTestId("flow-node-purchaseRequest")],
  ["task", "/tasks", p => p.locator("main button.task-title").first()],
  ["funding", "/events?event=e-night&view=budget", p => p.getByRole("button", { name: "Funding application", exact: true })],
  ["handoff", "/handoff", p => p.locator("main button.relay").first()],
  // The Settings workflow editor draws its own canvas: the Event Plan step is `workflow-task-plan` there (WORKFLOW_SETTINGS_REDESIGN).
  ["workflow settings", "/settings", p => p.getByTestId("workflow-builder").getByTestId("workflow-task-plan")],
]
for (const [name, path, trigger] of DETAIL_TRIGGERS) {
  test(`right rail: ${name} details take focus when they open and give it back on Escape`, async ({ page }) => {
    await page.goto(`/#${path}`)
    await page.waitForTimeout(300)
    if (name === "workflow settings") await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Workflow", exact: true }).click()
    const opener = trigger(page)
    await opener.focus()
    await page.keyboard.press("Enter")
    const details = page.getByRole("region", { name: "Details", exact: true })
    await expect(details).toBeVisible()
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[aria-label="Details"]'))).toBe(true)
    await page.keyboard.press("Escape")
    await expect(details).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
}

// S3 (2026-11-23): the six statuses are fixed, so Settings has no Tasks section. An old #/settings?tab=tasks link opens the first section.
// S6: Links & files left too; an old #/settings?tab=links link opens Club, where Planning notes moved.
test("keyboard: Settings sections open from the keyboard, and old Tasks and Links links open Club", async ({ page }) => {
  await page.goto("/#/settings?tab=tasks")
  const nav = page.getByRole("navigation", { name: "Settings sections" })
  await expect(nav.getByRole("button")).toHaveText(["Club", "Roles & teams", "Workflow", "My preferences", "Admin"])
  await expect(nav.getByRole("button", { name: "Club", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByTestId("board-settings")).toHaveCount(0)
  await page.goto("/#/settings?tab=links")
  await expect(nav.getByRole("button", { name: "Club", exact: true })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("textbox", { name: "Planning notes", exact: true })).toBeVisible()
  const opener = nav.getByRole("button", { name: "My preferences", exact: true })
  await opener.focus()
  await page.keyboard.press("Enter")
  await expect(opener).toHaveAttribute("aria-current", "page")
  await expect(opener).toBeFocused()
  expect(await scan(page)).toEqual([])
})

test("right rail: switching details returns focus to the latest page trigger", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.goto("/#/events")
  await page.getByTestId("flow-node-plan").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("task-detail").getByRole("heading", { name: "Event Plan", exact: true })).toBeFocused()
  const next = page.getByTestId("flow-node-backup")
  await next.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("task-detail").getByRole("heading", { name: "Back-up Plan", exact: true })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("region", { name: "Details", exact: true })).toHaveCount(0)
  await expect(next).toBeFocused()
})

test("right rail on a phone: the page underneath cannot be reached with Tab while the panel covers it", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "the panel only covers the whole screen on a phone")
  await page.goto("/#/tasks")
  await page.getByRole("button", { name: "Ask Platypus" }).click()
  await expect(page.getByTestId("rail")).toBeVisible()
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => !!document.activeElement?.closest("main, nav.sidenav, header.topbar"))).toBe(false)
  }
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("rail")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Ask Platypus" })).toBeFocused()
})

for (const viewer of ["sam", "jordan"]) test(`right rail: ${viewer}'s read-only funding checklist keeps Tab and Shift+Tab inside`, async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 })
  await page.goto("/#/events?event=e-night&view=budget")
  await viewAs(page, viewer)
  const opener = page.getByRole("button", { name: "Funding application", exact: true })
  await opener.click()
  const rail = page.getByTestId("rail")
  const summary = rail.locator("summary").filter({ hasText: "Pre-submission check" })
  await summary.focus()
  await page.keyboard.press("Enter")
  await expect(rail.getByLabel("Public purpose", { exact: true })).toBeDisabled()
  await expect(rail.getByRole("button", { name: "Check before submitting", exact: true })).toBeDisabled()
  await expect(rail.locator("fieldset")).toHaveAttribute("disabled", "")
  await page.keyboard.press("Tab")
  await expect(page.getByTestId("tab-ask")).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(summary).toBeFocused()
  for (const key of [...Array<string>(25).fill("Tab"), ...Array<string>(25).fill("Shift+Tab")]) {
    await page.keyboard.press(key)
    expect(await rail.evaluate(el => el.contains(document.activeElement))).toBe(true)
  }
  expect(await scan(page)).toEqual([])
  await page.keyboard.press("Escape")
  await expect(rail).toHaveCount(0)
  await expect(opener).toBeFocused()
})

// Tablet width (861–1199px): the panel floats over the right side of the page. The page behind it is switched off for
// Tab, and a click or tap on the page closes the panel (Juanxi 2026-10-29).
test("right rail on a tablet width: Tab stays out of the page behind the floating panel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "tablet width is tested from the desktop project")
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto("/#/tasks")
  await page.getByTestId("ask-toggle").click()
  await expect(page.getByTestId("rail")).toBeVisible()
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => !!document.activeElement?.closest("main, nav.sidenav"))).toBe(false)
  }
})

test("right rail on a tablet width: a click on the page closes the panel", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "tablet width is tested from the desktop project")
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto("/#/tasks")
  await page.getByTestId("ask-toggle").click()
  await expect(page.getByTestId("rail")).toBeVisible()
  await page.mouse.click(400, 400) // a real click on the page behind the panel (Playwright's locator.click refuses switched-off elements)
  await expect(page.getByTestId("rail")).toHaveCount(0)
})

test("keyboard: a table row changes status through Details", async ({ page }) => {
  await page.goto("/#/tasks")
  await closeRail(page)
  const card = page.getByTestId("my-tasks").getByTestId("task-card").filter({ has: page.locator(".pill[data-status=accepted]") }).first().locator("button.task-title")
  const title = await card.locator("span").last().innerText()
  await card.focus()
  await page.keyboard.press("Enter")
  const details = page.getByTestId("task-detail")
  await expect(details.getByRole("heading", { name: title, exact: true })).toBeFocused()
  // The universal Task Details: Done comes from submitting a result, so type it in Details, then Tab on to Submit & mark done.
  const tabTo = async (target: import("@playwright/test").Locator) => {
    for (let i = 0; i < 30 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press("Tab")
    await expect(target).toBeFocused()
  }
  await tabTo(details.getByRole("textbox", { name: "Details", exact: true }))
  await page.keyboard.type("Done with the keyboard.")
  await tabTo(details.getByRole("button", { name: "Submit & mark done", exact: true }))
  await page.keyboard.press("Enter")
  await expect(details.getByRole("combobox", { name: "Task status", exact: true })).toHaveValue("done")
  await page.keyboard.press("Escape")
  // The table lists open work, so the finished task leaves it.
  await expect(page.getByTestId("my-tasks")).toBeVisible()
  await expect(page.getByTestId("my-tasks").locator("button.task-title").filter({ hasText: title })).toHaveCount(0)
})

test("flow actions dialog: focus enters, Tab stays inside, Escape restores its step", async ({ page }) => {
  await page.goto("/#/events")
  await closeRail(page)
  await page.getByTestId("flow-edit-toggle").click()
  const opener = page.getByTestId("flow-node-budget")
  await opener.focus()
  await page.keyboard.press("Shift+F10")
  const dialog = page.getByRole("dialog", { name: "Actions for Budget" })
  await expect(dialog).toBeVisible()
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  for (const key of ["Shift+Tab", ...Array<string>(18).fill("Tab")]) {
    await page.keyboard.press(key)
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  }
  expect(await scan(page)).toEqual([])
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
  if ((page.viewportSize()?.width ?? 1280) <= 700) {
    await page.keyboard.press("Shift+F10")
    await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
    await dialog.getByRole("button", { name: "Open details", exact: true }).focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("region", { name: "Details", exact: true })).toBeVisible()
    // The details take focus once they listen for keys; Escape pressed before that would race their first render.
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[aria-label="Details"]'))).toBe(true)
    await page.keyboard.press("Escape")
    await expect(page.getByRole("region", { name: "Details", exact: true })).toHaveCount(0)
    await expect(opener).toBeFocused()
  }
  const targets = await page.locator("button.m-dot").evaluateAll(nodes => nodes.map(el => {
    const box = el.getBoundingClientRect()
    return { width: box.width, height: box.height }
  }))
  expect(targets.length).toBeGreaterThan(30)
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(24)
    expect(target.height).toBeGreaterThanOrEqual(24)
  }
})
