import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { ask, closeRail } from "./helpers"

// WCAG 2.0, 2.1 and 2.2 A/AA scan of every page and the main panels, on desktop and phone (S6).
// wcag22aa is what switches on axe's target-size rule (WCAG 2.5.8, touch targets of at least 24x24).
const PAGES = ["/", "/events", "/tasks", "/team", "/funding", "/handoff", "/partners", "/rules", "/settings", "/help"]
const scan = async (page: import("@playwright/test").Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

for (const path of PAGES) test(`no accessibility violations on ${path}`, async ({ page }) => {
  await page.goto(`/#${path}`)
  await page.waitForTimeout(300)
  expect(await scan(page)).toEqual([])
})
test("no accessibility violations in the Ask panel, a task's details and the board", async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.goto("/#/")
  await ask(page, "Plan Founder Dinner on Nov 19, 30 people")
  await ask(page, "What are my top 5 tasks?")
  expect(await scan(page)).toEqual([])
  await closeRail(page) // on a phone the panel covers the page
  await page.goto("/#/tasks?node=e-night:usg")
  await expect(page.getByTestId("task-detail")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await closeRail(page)
  await page.getByRole("button", { name: "Board", exact: true }).click()
  expect(await scan(page)).toEqual([])
})
test("keyboard: / focuses Ask, Escape closes details, a flow step opens with Enter", async ({ page }) => {
  await page.goto("/#/events")
  await page.locator("main").click({ position: { x: 5, y: 5 } })
  await page.keyboard.press("/")
  await expect(page.locator("#ask-input")).toBeFocused()
  await closeRail(page) // on a phone the Ask panel covers the page
  await page.getByTestId("flow-node-usg").focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("node-panel")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("node-panel")).toHaveCount(0)
})

// ---- S6: keyboard and right-rail focus ----

test("keyboard: Tab follows reading order, top bar then side navigation then the page", async ({ page }) => {
  await page.goto("/#/tasks")
  await page.waitForTimeout(300)
  const regions = ["topbar", "sidenav", "main", "rail"]
  const seen: number[] = []
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab")
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
  }
  expect(seen.length).toBeGreaterThan(10)
  expect(seen).toEqual([...seen].sort((a, b) => a - b))
  expect(new Set(seen).size).toBeGreaterThanOrEqual(3)
})

type Pg = import("@playwright/test").Page
const DETAIL_TRIGGERS: [string, string, (p: Pg) => import("@playwright/test").Locator][] = [
  ["flow step", "/events", p => p.getByTestId("flow-node-usg")],
  ["task", "/tasks", p => p.locator("main .tbl .row-btn").first()],
  ["funding", "/funding", p => p.locator("main .row-btn").first()],
  ["partner", "/partners", p => p.locator("main .row-btn").first()],
  ["handoff", "/handoff", p => p.locator("main button.relay").first()],
  ["board settings", "/tasks", p => p.getByRole("button", { name: "Customize" })],
]
for (const [name, path, trigger] of DETAIL_TRIGGERS) {
  test(`right rail: ${name} details take focus when they open and give it back on Escape`, async ({ page }) => {
    await page.goto(`/#${path}`)
    await page.waitForTimeout(300)
    if (name === "board settings") await page.getByRole("button", { name: "Board", exact: true }).click()
    const opener = trigger(page)
    await opener.focus()
    await page.keyboard.press("Enter")
    const details = page.getByRole("region", { name: "Details" })
    await expect(details).toBeVisible()
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[aria-label="Details"]'))).toBe(true)
    await page.keyboard.press("Escape")
    await expect(details).toHaveCount(0)
    await expect(opener).toBeFocused()
  })
}

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

// Known gap, pinned on purpose: between 861px and 1199px the panel floats over the right side of the page but the
// page stays live (people click it), so Tab can still walk into content that is partly hidden behind the panel.
test.fixme("right rail on a tablet width: Tab stays inside the panel while it floats over the page", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "tablet width is tested from the desktop project")
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.goto("/#/tasks")
  await page.getByRole("button", { name: "Ask Platypus" }).click()
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => !!document.activeElement?.closest("main, nav.sidenav"))).toBe(false)
  }
})

test("keyboard: a board card changes status from its menu without dragging", async ({ page }) => {
  await page.goto("/#/tasks")
  await page.getByRole("button", { name: "Board", exact: true }).click()
  const menu = page.locator("select.move-menu").first()
  await menu.focus()
  const before = await menu.inputValue()
  const label = await menu.getAttribute("aria-label")
  await page.keyboard.press("ArrowDown")
  await expect(page.locator(`select.move-menu[aria-label="${label}"]`)).not.toHaveValue(before)
})
