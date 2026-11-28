import { expect, test, type Locator, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

// DESIGN_TOKENS §15 (Juanxi 2026-11-28): switching tabs must never move a page's frame. In Settings the title and the section
// list jumped about 200px between Workflow and Roles & teams, because the page column was a centred 1180px column that
// widened to 1600px against the navigation only while a wide chart was on screen. For one window width and side-panel state,
// the title, the second-level navigation and the start of the content now stay at the same x on every tab and every page.
// Rows of tabs (Flow | Budget, Rules categories, Events | Tasks) also keep the chosen tab at the same weight, so nothing beside it moves.

type Box = { x: number; width: number }
const box = async (loc: Locator): Promise<Box> => { const b = (await loc.boundingBox())!; return { x: Math.round(b.x), width: Math.round(b.width) } }
const x = async (loc: Locator) => (await box(loc)).x

async function fresh(page: Page, width: number, hash: string, panel: "open" | "closed") {
  await page.setViewportSize({ width, height: 1000 })
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline page frame check" } }))
  await page.goto(`/#${hash}`)
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.locator("main .page-head h1").first()).toBeVisible()
  if (panel === "closed") {
    await page.getByRole("button", { name: "Hide side panel" }).click()
    await expect(page.getByTestId("rail")).toHaveCount(0)
  }
}

const SETTINGS_TABS = ["Club", "Roles & teams", "Workflow", "Onboarding", "My preferences", "Admin"]
async function openSettingsTab(page: Page, name: string) {
  const nav = page.getByRole("navigation", { name: "Settings sections" })
  await nav.getByRole("button", { name, exact: true }).click()
  await expect(nav.getByRole("button", { name, exact: true })).toHaveAttribute("aria-current", "page")
  // Workflow and Onboarding load their own code: wait until the section itself is on screen.
  await expect(page.locator(".settings-body").getByText(/^Loading (workflows|checklist)…$/)).toHaveCount(0)
  if (name === "Workflow") await expect(page.getByTestId("workflow-settings")).toBeVisible()
  if (name === "Roles & teams") await expect(page.getByTestId("org-chart")).toBeVisible()
}

const HEADINGS: Record<string, string> = { "/": "Reminders", "/events": "Events", "/tasks": "Tasks", "/team": "Team", "/playbook": "Playbook", "/handoff": "Handoff", "/rules": "Rules", "/settings": "Settings" }

test.describe("computer", () => {
  test.skip(({ isMobile }) => isMobile, "the computer layout; the phone check is below")
  for (const width of [1440, 1780]) {
    for (const panel of ["open", "closed"] as const) {
      test(`Settings at ${width}px with the side panel ${panel}: title, sections and content start stay put on every tab`, async ({ page }) => {
        await fresh(page, width, "/settings", panel)
        const frames: Record<string, { title: number; nav: Box; body: number; main: Box }> = {}
        // Twice round, so the second pass also covers coming back to a tab after a wide one (Workflow) and a narrow one.
        for (const pass of [1, 2]) {
          for (const name of SETTINGS_TABS) {
            await openSettingsTab(page, name)
            frames[`${pass}:${name}`] = {
              title: await x(page.locator("main .page-head h1")),
              nav: await box(page.locator(".settings-nav")),
              body: await x(page.locator(".settings-body")),
              main: await box(page.locator("main#main")),
            }
          }
        }
        const first = frames["1:Club"]
        expect(first.nav.width, "the section list has a fixed width").toBe(170)
        for (const [tab, frame] of Object.entries(frames)) expect(frame, `Settings → ${tab}`).toEqual(first)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), "no sideways scroll").toBeLessThanOrEqual(0)
      })

      test(`Plan at ${width}px with the side panel ${panel}: Events and Tasks share the title and switch, and the event list and Flow/Budget never move`, async ({ page }) => {
        await fresh(page, width, "/events", panel)
        await expect(page.getByTestId("view-flow")).toBeVisible()
        const head = async () => ({
          main: await box(page.locator("main#main")),
          title: await x(page.locator("main .page-head h1")),
          planSwitch: await x(page.getByTestId("plan-switch")),
          tasksLink: await x(page.getByTestId("plan-switch").getByRole("link", { name: "Tasks", exact: true })),
        })
        const onEvents = await head()
        const list = page.getByRole("navigation", { name: "Events", exact: true })
        const names = await list.getByRole("button").allTextContents()
        expect(names.length, "the demo has more than one event, so the event list is shown").toBeGreaterThan(1)
        const listBox = await box(list)
        const content = await x(page.locator(".events-content"))
        const budgetButton = await x(page.getByTestId("view-budget"))
        expect(content, "the content starts right of the event list").toBeGreaterThan(listBox.x + listBox.width)
        for (const name of names) {
          await list.getByRole("button", { name, exact: true }).click()
          await expect(list.getByRole("button", { name, exact: true })).toHaveAttribute("aria-current", "page")
          for (const view of ["view-budget", "view-flow"]) {
            await page.getByTestId(view).click()
            await expect(page.getByTestId(view)).toHaveAttribute("aria-pressed", "true")
            expect(await head(), `${name}, ${view}: page head`).toEqual(onEvents)
            expect(await box(list), `${name}, ${view}: event list`).toEqual(listBox)
            expect(await x(page.locator(".events-content")), `${name}, ${view}: content start`).toBe(content)
            expect(await x(page.getByTestId("view-budget")), `${name}, ${view}: the Budget button beside Flow (the chosen one is not bold)`).toBe(budgetButton)
          }
        }

        await page.getByTestId("plan-switch").getByRole("link", { name: "Tasks", exact: true }).click()
        await expect(page).toHaveURL(/#\/tasks/)
        await expect(page.locator("main .page-head h1")).toHaveText("Tasks")
        expect(await head(), "Tasks: the same page head as Events").toEqual(onEvents)
        await page.getByTestId("plan-switch").getByRole("link", { name: "Events", exact: true }).click()
        await expect(page.getByTestId("view-flow")).toBeVisible()
        expect(await head(), "back on Events").toEqual(onEvents)
      })

      test(`every page at ${width}px with the side panel ${panel} uses the same page column`, async ({ page }) => {
        await fresh(page, width, "/", panel)
        const columns: Record<string, { main: Box; title: number }> = {}
        for (const [hash, heading] of Object.entries(HEADINGS)) {
          await page.evaluate(h => { window.location.hash = `#${h}` }, hash)
          await expect(page.locator("main .page-head h1").first()).toHaveText(heading)
          await expect(page.locator("main .route-loading")).toHaveCount(0)
          columns[hash] = { main: await box(page.locator("main#main")), title: await x(page.locator("main .page-head h1").first()) }
        }
        for (const [hash, column] of Object.entries(columns)) expect(column, hash).toEqual(columns["/"])
        // The column sits next to the navigation (Juanxi 2026-11-01: no empty strip beside it), at most --page-max wide.
        const side = (await page.locator("nav.sidenav").boundingBox())!
        expect(columns["/"].main.x - Math.round(side.x + side.width)).toBeLessThanOrEqual(32)
        expect(columns["/"].main.width).toBeLessThanOrEqual(1600)
      })
    }
  }

  test("Rules: choosing a category moves none of the category buttons", async ({ page }) => {
    await fresh(page, 1440, "/rules", "open")
    const group = page.getByRole("group", { name: "Policy category" })
    const buttons = group.getByRole("button")
    const labels = await buttons.allTextContents()
    expect(labels.length).toBeGreaterThan(1)
    const xs = async () => Promise.all(labels.map(label => x(group.getByRole("button", { name: label, exact: true }))))
    const before = await xs()
    const mainX = await x(page.locator("main#main"))
    for (const label of labels) {
      await group.getByRole("button", { name: label, exact: true }).click()
      await expect(group.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true")
      expect(await xs(), `after choosing ${label}`).toEqual(before)
      expect(await x(page.locator("main#main"))).toBe(mainX)
    }
  })

  test("Settings → Roles & teams: Chart and Contact list keep the card where it was", async ({ page }) => {
    await fresh(page, 1780, "/settings", "closed")
    await openSettingsTab(page, "Roles & teams")
    const views = page.getByRole("group", { name: "Roles view" })
    const card = page.locator(".rt-main")
    const start = { card: await x(card), list: await x(views.getByRole("button", { name: "Contact list", exact: true })) }
    await views.getByRole("button", { name: "Contact list", exact: true }).click()
    await expect(views.getByRole("button", { name: "Contact list", exact: true })).toHaveAttribute("aria-pressed", "true")
    expect({ card: await x(card), list: await x(views.getByRole("button", { name: "Contact list", exact: true })) }).toEqual(start)
    await views.getByRole("button", { name: "Chart", exact: true }).click()
    expect({ card: await x(card), list: await x(views.getByRole("button", { name: "Contact list", exact: true })) }).toEqual(start)
  })
})

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone only")
  test("Settings: the section row and the content start stay put on every tab", async ({ page }) => {
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false, message: "Offline page frame check" } }))
    await page.goto("/#/settings")
    await closeRail(page)
    const nav = page.getByRole("navigation", { name: "Settings sections" })
    await expect(nav).toBeVisible()
    let first: { nav: Box; body: number } | null = null
    for (const name of SETTINGS_TABS) {
      await nav.getByRole("button", { name, exact: true }).click()
      await expect(nav.getByRole("button", { name, exact: true })).toHaveAttribute("aria-current", "page")
      await expect(page.locator(".settings-body").getByText(/^Loading (workflows|checklist)…$/)).toHaveCount(0)
      const frame = { nav: await box(nav), body: await x(page.locator(".settings-body")) }
      first ??= frame
      expect(frame, `Settings → ${name}`).toEqual(first)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${name}: no sideways scroll`).toBeLessThanOrEqual(0)
    }
  })
})
