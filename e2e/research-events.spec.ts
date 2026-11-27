import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
import { closeRail, noOverflow } from "./helpers"

// Phase 3 behaviour-only items approved 2026-11-07 (docs/PHASE3_DATA_DICTIONARY.md section 11): study task markers,
// leaving the page, starting to type in a field and hover cards. One short session on a computer and on a phone, then
// Export my data: the new entries are there, in order, and nothing that was typed is anywhere in the file.
type Entry = { seq: number; at: number; type: string; applied: boolean; payload: Record<string, unknown> }
const TYPED = "Quokka zebra marmalade"

test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
  await context.route(url => url.hostname !== "localhost" && url.hostname !== "127.0.0.1", r => r.abort())
})

const phone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 700
const press = (page: Page, locator: ReturnType<Page["locator"]>) => (phone(page) ? locator.tap() : locator.click())
const nav = (page: Page, name: string | RegExp) => press(page, page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name }))
/** Hide the page (as when the participant switches to another tab or app), wait, and show it again. */
async function away(page: Page, ms: number) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await page.waitForTimeout(ms)
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" })
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

test("task markers, a field edit, a hover card and time away are exported in order, with no typed text", async ({ page }) => {
  await page.goto("/#/")
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
  // S2: a loaded or fresh demo is already on the current reminder plan; the "Enable updated reminders" card never shows.
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
  const pill = page.getByTestId("demo-menu")

  // 1. Start task 1 from the Demo menu; the pill shows it, and the top bar still fits on a phone.
  await press(page, pill)
  const tasks = page.getByRole("group", { name: "Study tasks" })
  await expect(tasks.getByRole("button", { name: "Task done" })).toBeDisabled()
  await press(page, tasks.getByRole("button", { name: "Start task 1" }))
  await expect(tasks).toBeHidden()                                    // the menu closes so the task card can be read
  await expect(page.getByTestId("demo-task")).toHaveText("· Task 1")
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)

  // 2. Edit a field: type into the sources search on Rules, then leave it.
  await nav(page, "Rules")
  await expect(page.locator("main h1")).toHaveText("Rules")
  const search = page.getByLabel("Search rules")
  await search.fill(TYPED)
  await search.press("Tab")

  // 3. A hover card read for about a second (a tap opens it on a phone, a tap elsewhere closes it).
  // R-S0 W2: the reminder page shows risk as the text "At risk" (no risk mark, so no hover card there); the card read here is
  // Team's workload meter, a Hover card like the others. Then back to Reminders for the rest of the session.
  await nav(page, "Team")
  await expect(page.locator("main h1")).toHaveText("Team")
  await closeRail(page)
  const info = page.getByTestId("officers").getByRole("img", { name: /^Workload: / }).first()
  if (phone(page)) { await info.tap(); await page.waitForTimeout(900); await page.locator("main h1").tap() }
  else { await info.hover(); await page.waitForTimeout(900); await page.mouse.move(2, 400) }
  // ...and a mouse pass that is too short to count.
  if (!phone(page)) { await info.hover(); await page.mouse.move(2, 400) }
  await nav(page, /^Reminders/)
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)

  // 4. Away from the page: a flicker (nothing written), then two seconds in another tab.
  await away(page, 150)
  await away(page, 2000)

  // 5. Start task 2 (ends task 1), then "Task done" by keyboard: focus goes back to the pill.
  await press(page, pill)
  await press(page, tasks.getByRole("button", { name: "Start task 2" }))
  await expect(page.getByTestId("demo-task")).toHaveText("· Task 2")
  await pill.focus()
  await page.keyboard.press("Enter")
  for (let i = 0; i < 7; i++) await page.keyboard.press("Tab")        // 1 … 6, then Done
  await expect(tasks.getByRole("button", { name: "Task done" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(pill).toBeFocused()
  await expect(page.getByTestId("demo-task")).toHaveCount(0)

  // 6. Export
  await nav(page, "Settings")
  await press(page, page.getByRole("button", { name: "My preferences" }))
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const text = readFileSync((await download.path())!, "utf8")
  const file = JSON.parse(text)
  const log = file.interactionLog.entries as Entry[]
  if (process.env.SHOW_TIMELINE) console.info(file.timeline.map((r: { seq: number; type: string; desc: string }) => `${String(r.seq).padStart(3)} ${r.type.padEnd(16)} ${r.desc}`).join("\n"))

  const p = (e: Entry) => e.payload
  // S2: until saves upgrade on load, the explicit reminder upgrade reloads the page before the session; that page close is not part of it.
  const session = log.slice(log.findIndex(e => e.type === "ui.task"))
  const mine = session.filter(e => ["ui.task", "ui.visibility", "ui.edit"].includes(e.type)).map(e => ({ type: e.type, ...p(e) }))
  expect(mine).toEqual([
    { type: "ui.task", task: 1, event: "start", route: "/" },
    { type: "ui.edit", route: "/rules", field: "Search rules", kind: "search", area: "main", event: "start" },
    { type: "ui.edit", route: "/rules", field: "Search rules", kind: "search", area: "main", event: "end", ms: expect.any(Number) },
    { type: "ui.visibility", state: "hidden", via: "tab", route: "/" },
    { type: "ui.visibility", state: "visible", via: "tab", awayMs: expect.any(Number), route: "/" },
    { type: "ui.task", task: 1, event: "done", implicit: true, ms: expect.any(Number), route: "/" },
    { type: "ui.task", task: 2, event: "start", route: "/" },
    { type: "ui.task", task: 2, event: "done", ms: expect.any(Number), route: "/" },
  ])
  const visible = log.find(e => e.type === "ui.visibility" && p(e).state === "visible")!
  expect(p(visible).awayMs as number).toBeGreaterThanOrEqual(1900)

  // the hover card: one entry of at least half a second, named by its trigger and the heading it sits under; the short pass is not there
  // The workload meter's trigger has its own name ("Workload: <band>").
  const hovers = log.filter(e => e.type === "ui.hover" && /^Workload: /.test(String(p(e).name)))
  expect(hovers).toHaveLength(1)
  expect(p(hovers[0])).toMatchObject({ route: "/team", via: phone(page) ? "tap" : "mouse" })
  expect(p(hovers[0]).ms as number).toBeGreaterThanOrEqual(800)
  expect(log.every(e => e.type !== "ui.hover" || (p(e).ms as number) >= 500)).toBe(true)

  // in order: task 1 started → field edited → hover card → away → task 1 ended → task 2 → done → export
  const at = (test: (e: Entry) => boolean) => log.findIndex(test)
  const order = [
    at(e => e.type === "ui.task" && p(e).event === "start" && p(e).task === 1),
    at(e => e.type === "ui.edit" && p(e).event === "end"),
    at(e => e === hovers[0]),
    at(e => e.type === "ui.visibility" && p(e).state === "hidden" && p(e).via === "tab"),
    at(e => e.type === "ui.task" && p(e).implicit === true),
    at(e => e.type === "ui.task" && p(e).event === "done" && p(e).task === 2),
    log.length - 1,
  ]
  expect(order.every(i => i >= 0)).toBe(true)
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  expect(log[log.length - 1].type).toBe("ui.export")

  // the task buttons write their own entry, not a second click entry
  expect(log.some(e => e.type === "ui.click" && /^(Start task \d|Task done)$/.test(String(p(e).name)))).toBe(false)
  // nothing typed anywhere in the file: not in the log, the timeline, or the demo data
  expect(text).not.toContain(TYPED)
  expect(text).not.toContain("Quokka")
  // the timeline reads well
  const descs = (file.timeline as { desc: string }[]).map(r => r.desc)
  expect(descs).toContain("Started study task 1 on /")
  expect(descs).toContain('Started typing in search field "Search rules" on /rules')
  expect(descs.some(d => /^Came back after \d+\.\d s away \(another tab or app\) on \/$/.test(d))).toBe(true)
  expect(descs.some(d => /^Ended study task 1 after .* \(next task started\)$/.test(d))).toBe(true)
})

test("the running task survives a reload, and the task buttons are not in the walkthrough", async ({ page }) => {
  await page.goto("/#/")
  await closeRail(page)
  await press(page, page.getByTestId("demo-menu"))
  await press(page, page.getByRole("group", { name: "Study tasks" }).getByRole("button", { name: "Start task 3" }))
  await expect(page.getByTestId("demo-task")).toHaveText("· Task 3")
  await page.reload()
  await expect(page.getByTestId("demo-task")).toHaveText("· Task 3")
  await press(page, page.getByTestId("demo-menu"))
  await expect(page.getByRole("button", { name: "Start task 3" })).toHaveAttribute("aria-pressed", "true")
  const scan = await new AxeBuilder({ page }).include(".menu-wrap").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()
  expect(scan.violations.map(v => v.id)).toEqual([])
  await page.goto("/#/welcome/test/president")
  await expect(page.getByRole("heading", { level: 1, name: "Name your club" })).toBeVisible()
  await expect(page.getByRole("group", { name: "Study tasks" })).toHaveCount(0)
  await expect(page.getByTestId("demo-menu")).toHaveCount(0)
})
