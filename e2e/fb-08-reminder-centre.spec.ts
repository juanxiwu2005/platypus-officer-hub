import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, demoClock, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import type { DemoState, ReminderMode } from "../src/data/types"

// FB-8 (docs/feedback-fix/PLAN.md §12.2): the home page is the reminder centre; the three reminder modes really behave differently;
// the navigation is Reminders, Plan, Handoff, Rules plus a folded More. Nothing is ever sent: no request leaves the browser.
// Set FB8_SHOTS=<folder> to also save screenshots of each state for a visual check.
const SHOTS = process.env.FB8_SHOTS
const shot = async (page: Page, name: string, isMobile: boolean) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${isMobile ? "phone" : "desktop"}.png`, fullPage: true }) }
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

const requests = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page, context }) => {
  const seen: string[] = []; requests.set(page, seen)
  page.on("request", q => seen.push(q.url()))
  await page.route("**/api/**", q => q.fulfill({ status: 503, json: { message: "no server in this test" } }))
  await context.route(url => url.hostname !== "localhost" && url.hostname !== "127.0.0.1", q => q.abort())
})
test.afterEach(async ({ page }) => {
  // Nothing is sent. Opening a Gmail draft is the only outside address a person can open, and only in "I review, then I send".
  const outside = requests.get(page)!.map(u => new URL(u)).filter(u => u.hostname !== "localhost" && u.hostname !== "127.0.0.1" && u.hostname !== "mail.google.com")
  expect(outside.map(String), "nothing leaves the browser").toEqual([])
})

const demo = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
/** Start from the sample club with this reminder mode (or none), on the home page. */
async function open(page: Page, mode?: ReminderMode) {
  await page.goto("/#/")
  await savedDemo(page)
  await page.evaluate(m => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    if (m) s.org.settings.reminderMode = m; else delete s.org.settings.reminderMode
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
  }, mode ?? null)
  await page.reload()
  await expect(page.locator("main h1")).toHaveText("Reminders")
  await closeRail(page)
}
const section = (page: Page, id: string) => page.getByTestId(id)
const rows = (page: Page, id: string) => section(page, id).getByTestId("rq-row")
const composer = (page: Page) => page.getByTestId("nudge-panel")
const closeComposer = async (page: Page) => { await composer(page).getByRole("button", { name: "Close reminder" }).click(); await closeRail(page) }

test("no mode: send-day items wait under Needs your OK, with a link to choose a mode; the five sections are there", async ({ page, isMobile }) => {
  await open(page)
  for (const [id, name] of [["rq-needs-ok", "Needs your OK"], ["rq-this-week", "This week"], ["rq-sent", "Sent"], ["rq-replies", "Replies"], ["rq-no-reply", "No reply yet"]])
    await expect(section(page, id).getByRole("heading", { level: 2 })).toContainText(name)
  // The old Today cards are gone.
  for (const gone of ["Needs a nudge", "Semester goals", "Superstar of the week"]) await expect(page.getByRole("heading", { name: gone })).toHaveCount(0)
  await expect(page.getByTestId("event-strip")).toHaveCount(0)
  expect(await rows(page, "rq-needs-ok").count()).toBeGreaterThan(1)
  await expect(rows(page, "rq-needs-ok").first().getByRole("button", { name: "Review & open draft" })).toBeVisible()
  // Forecast red first, with the risk mark.
  await expect(rows(page, "rq-needs-ok").first().getByTestId("forecast")).toBeVisible()
  await expect(rows(page, "rq-this-week").first()).toContainText(/Goes out (Mon|Tue|Wed|Thu|Fri|Sat|Sun), (Nov|Oct) \d+/)
  await expect(page.getByTestId("approve-all")).toHaveCount(0)
  await shot(page, "president-no-mode", isMobile)
  expect(await scan(page)).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  // "Choose how reminders go out" opens Settings at the choice; choosing saves org.settings.reminderMode.
  await page.getByTestId("choose-mode").click()
  await expect(page.locator("main h1")).toHaveText("Settings")
  const choice = page.getByTestId("settings-reminder-mode")
  await expect(choice).toBeVisible()
  await expect(choice.getByRole("radio")).toHaveCount(3)
  await choice.getByRole("radio", { name: "I review, Platypus sends" }).check()
  await expect.poll(async () => (await demo(page)).org.settings.reminderMode).toBe("review_then_auto")
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Reminders" }).click()
  await expect(page.getByTestId("approve-all")).toBeVisible()
})

test("I review, then I send: Review & open draft → draft → I sent this reminder → under Sent, by the president", async ({ page, isMobile }) => {
  await open(page, "review_then_self")
  await expect(page.getByTestId("choose-mode")).toHaveCount(0)
  await shot(page, "president-review-then-self", isMobile)
  const first = rows(page, "rq-needs-ok").first()
  const id = (await first.getAttribute("data-node"))!
  const before = await rows(page, "rq-needs-ok").count()
  await first.getByRole("button", { name: "Review & open draft" }).click()
  await expect(composer(page).getByRole("button", { name: /Approve/ })).toHaveCount(0)
  await composer(page).getByLabel("Preferred channel").selectOption("email")
  const draft = composer(page).getByRole("link", { name: "Open Gmail draft" })
  await expect(draft).toBeVisible()
  await draft.evaluate(a => a.removeAttribute("target"))           // stay on the page: the draft itself is not part of this test
  await draft.evaluate(a => a.addEventListener("click", e => e.preventDefault()))
  await draft.click()
  await composer(page).getByRole("button", { name: "I sent this reminder" }).click()
  await expect(composer(page)).toContainText("Recorded as sent by you")
  await closeComposer(page)
  await expect(rows(page, "rq-needs-ok")).toHaveCount(before - 1)
  const sent = section(page, "rq-sent").locator(`[data-node="${id}"]`)
  await expect(sent).toContainText("Sent by you")
  const nudges = (await demo(page)).nudges
  expect(nudges.map(n => [n.nodeId, n.via])).toEqual([[id, "president"]])
})

test("I review, Platypus sends: Review → Approve · Platypus sends (demo) → Sent by Platypus; Approve all (N) does the rest in one click", async ({ page, isMobile }) => {
  await open(page, "review_then_auto")
  await shot(page, "president-review-then-auto", isMobile)
  const first = rows(page, "rq-needs-ok").first()
  const id = (await first.getAttribute("data-node"))!
  await first.getByRole("button", { name: "Review", exact: true }).click()
  await expect(composer(page).getByRole("link", { name: /draft/ })).toHaveCount(0)
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await expect(composer(page)).toContainText("Demo: nothing is sent")
  await closeComposer(page)
  await expect(section(page, "rq-sent").locator(`[data-node="${id}"]`)).toContainText("Sent by Platypus · demo")
  // Approve all: one confirmNudgeSent per item, none of them blocked by a limit.
  const all = page.getByTestId("approve-all")
  const n = Number((await all.innerText()).match(/\((\d+)\)/)![1])
  expect(n).toBeGreaterThan(1)
  await all.click()
  await expect(page.getByTestId("approve-all")).toHaveCount(0)
  await expect(section(page, "rq-needs-ok").getByRole("button", { name: "Review", exact: true, disabled: false })).toHaveCount(0)
  const nudges = (await demo(page)).nudges
  expect(nudges).toHaveLength(n + 1)
  expect(nudges.every(x => x.via === "platypus")).toBe(true)
  await expect(section(page, "rq-sent").getByText("Sent by Platypus · demo")).toHaveCount(n + 1)
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string }[])
  expect(log.filter(e => e.type === "confirmNudgeSent")).toHaveLength(n + 1)
  await shot(page, "president-review-then-auto-approved", isMobile)
  expect(await scan(page)).toEqual([])
})

test("Send automatically: nothing waits; send-day reminders show under Sent as Would be sent, nothing is written; Follow up approves a follow-up", async ({ page, isMobile }) => {
  await open(page, "auto_email")
  await expect(rows(page, "rq-needs-ok")).toHaveCount(0)
  await expect(section(page, "rq-needs-ok")).toContainText("Your club sends automatically")
  expect(await section(page, "rq-sent").getByText("Would be sent · demo").count()).toBeGreaterThan(1)
  expect((await demo(page)).nudges).toEqual([])
  await shot(page, "president-auto", isMobile)
  expect(await scan(page)).toEqual([])
  // Long-silent ones are under No reply yet; Follow up opens the composer, where Platypus sends (demo).
  const wait = rows(page, "rq-no-reply").first()
  const id = (await wait.getAttribute("data-node"))!
  await wait.getByRole("button", { name: "Follow up" }).click()
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await closeComposer(page)
  expect((await demo(page)).nudges.map(x => [x.nodeId, x.via])).toEqual([[id, "platypus"]])
  await expect(section(page, "rq-sent").locator(`[data-node="${id}"]`).first()).toContainText("Sent by Platypus · demo")
})

test("Follow up: two days with no reply moves a reminder to No reply yet; the silence protocol's reminders show as Follow-up · demo", async ({ page }) => {
  await open(page, "review_then_auto")
  const first = rows(page, "rq-needs-ok").first()
  const id = (await first.getAttribute("data-node"))!
  await first.getByRole("button", { name: "Review", exact: true }).click()
  await composer(page).getByRole("button", { name: "Approve · Platypus sends (demo)" }).click()
  await closeComposer(page)
  await expect(section(page, "rq-no-reply").locator(`[data-node="${id}"]`)).toHaveCount(0)
  await demoClock(page, 3)
  await page.keyboard.press("Escape")
  await closeRail(page)
  const wait = section(page, "rq-no-reply").locator(`[data-node="${id}"]`)
  await expect(wait).toContainText("3 days")
  // Over those days the silence protocol sent its two simulated reminders for this silent task: with ours, that is the limit of three,
  // so Follow up is held back and says why (nudgeBlocked).
  expect(await section(page, "rq-sent").locator(`[data-node="${id}"]`).getByText("Follow-up · demo").count()).toBe(2)
  await expect(wait.getByRole("button", { name: "Follow up" })).toBeDisabled()
  await expect(wait.getByRole("button", { name: "Follow up" })).toHaveAttribute("title", "This task has reached its reminder limit.")
})

test("an officer who is not a lead sees a read-only Your reminders", async ({ page, isMobile }) => {
  await open(page, "auto_email")
  await viewAs(page, "jordan")
  await closeRail(page)
  const mine = page.getByTestId("your-reminders")
  await expect(mine.getByRole("heading", { name: "Your reminders" })).toBeVisible()
  await expect(mine).toContainText("Coming up")
  await expect(mine).toContainText("Goes out")
  await expect(mine.getByText("Would be sent · demo").first()).toBeVisible()
  await expect(page.getByTestId("reminder-centre")).toHaveCount(0)
  for (const name of ["Review & open draft", "Review", "Follow up", /Approve all/]) await expect(page.locator("main").getByRole("button", { name, exact: typeof name === "string" })).toHaveCount(0)
  await shot(page, "officer", isMobile)
  expect(await scan(page)).toEqual([])
})

test("navigation: Reminders, Plan, Handoff, Rules; More holds Team and Partners; Plan stays current on Tasks and carries the open-task count", async ({ page, isMobile }) => {
  await open(page)
  const nav = page.getByRole("navigation", { name: "Sections" })
  await expect(nav.getByRole("link")).toHaveText([/^Reminders/, /^Plan/, /^Handoff/, /^Rules/, /^Settings/, /^Help/])
  const more = nav.getByRole("button", { name: "More" })
  await expect(more).toHaveAttribute("aria-expanded", "false")
  await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: "Reminders" })).toHaveAttribute("aria-current", "page")
  await expect(nav.getByRole("link", { name: /^Plan/ }).getByTestId("nav-open-tasks")).toBeVisible()
  await shot(page, "nav-closed", isMobile)
  await more.click()
  await expect(more).toHaveAttribute("aria-expanded", "true")
  await expect(nav.getByRole("link")).toHaveText([/^Reminders/, /^Plan/, /^Handoff/, /^Rules/, /^Team/, /^Partners/, /^Settings/, /^Help/])
  expect(await scan(page)).toEqual([])
  await shot(page, "nav-open", isMobile)
  await nav.getByRole("link", { name: "Team" }).click()
  await expect(page.locator("main h1")).toHaveText("Team")
  await expect(nav.getByRole("link", { name: "Team" })).toHaveAttribute("aria-current", "page")
  // A link straight to a page inside More opens it by itself.
  await page.goto("/#/partners")
  await page.reload()
  await expect(nav.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true")
  await expect(nav.getByRole("link", { name: "Partners" })).toHaveAttribute("aria-current", "page")
  // Plan: Events, and Tasks through the switch, both light Plan up.
  await closeRail(page)
  await nav.getByRole("link", { name: /^Plan/ }).click()
  await expect(page.locator("main h1")).toHaveText("Events")
  await expect(nav.getByRole("link", { name: /^Plan/ })).toHaveAttribute("aria-current", "page")
  const sw = page.getByRole("navigation", { name: "Plan" })
  await expect(sw.getByRole("link", { name: "Events" })).toHaveAttribute("aria-current", "page")
  await sw.getByRole("link", { name: "Tasks" }).click()
  await expect(page.locator("main h1")).toHaveText("Tasks")
  await expect(nav.getByRole("link", { name: /^Plan/ })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("navigation", { name: "Plan" }).getByRole("link", { name: "Tasks" })).toHaveAttribute("aria-current", "page")
  await shot(page, "plan-tasks", isMobile)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test("phone: the navigation strip keeps all items reachable and the More button is a full-size target", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone only")
  await open(page)
  const nav = page.getByRole("navigation", { name: "Sections" })
  const more = nav.getByRole("button", { name: "More" })
  expect((await more.boundingBox())!.height).toBeGreaterThanOrEqual(43.5)
  await more.click()
  await nav.getByRole("link", { name: "Partners" }).scrollIntoViewIfNeeded()
  await expect(nav.getByRole("link", { name: "Partners" })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  // The row's action sits under the task on a phone, inside the screen.
  const btn = rows(page, "rq-needs-ok").first().getByRole("button", { name: "Review & open draft" })
  const b = (await btn.boundingBox())!
  expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width)
})
