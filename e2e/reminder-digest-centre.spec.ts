import { enableUpdatedReminders } from "./reminderHelpers"
import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow } from "./helpers"
import type { DemoState } from "../src/data/types"

// Concept F (Juanxi 2026-11-19) on the shipped seed club (Sat Oct 31, "I review, Platypus sends"):
// one email per person, problems apart under Fix first, the email itself opens in place (S2). Nothing is sent.
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
const serious = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze())
  .violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline reminder check" } }))
  await context.route(url => !["localhost", "127.0.0.1"].includes(url.hostname) && url.hostname !== "mail.google.com", route => route.abort())
  await page.goto("/#/")
  await expect(page.getByTestId("reminder-centre")).toBeAttached()
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    s.org.settings.reminderMode = "review_then_auto"
    localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
  })
  await page.reload()
  await closeRail(page)
  await enableUpdatedReminders(page)   // S2: already on the current reminder plan; this only checks it (no "Enable updated reminders" card)
  await expect(page.getByTestId("rq-summary")).toBeVisible()
})

test("the seed fits in a short page: 3 people for 5 tasks, grouped by person, problems apart", async ({ page, isMobile }) => {
  await expect(page.getByTestId("rq-summary")).toHaveText("3 people to remindSend 3 emails")
  await expect(page.getByTestId("send-all-digests")).toHaveText("Send 3 emails")
  await expect(page.getByRole("button", { name: "Send 3 emails" })).toBeVisible()
  await expect(page.getByTestId("rq-fix").getByRole("heading", { level: 2, name: "Fix first, 8" })).toBeVisible()
  await expect(page.getByTestId("rq-fix").getByRole("button", { name: /^Assign/ })).toHaveCount(0)
  for (const gone of ["reminder-mode-chip", "rq-held", "rq-next", "reminder-plan-status"]) await expect(page.getByTestId(gone)).toHaveCount(0)
  const people = page.getByTestId("rq-person")
  await expect(people).toHaveCount(3)
  expect(await people.evaluateAll(list => list.map(p => (p as HTMLElement).dataset.recipient))).toEqual(["maya", "jordan", "priya"])
  await expect(page.locator('[data-recipient="jordan"]').getByTestId("rq-person-task")).toHaveCount(3)
  await expect(page.getByTestId("rq-person-task")).toHaveCount(5)
  await expect(page.getByTestId("rq-person-send")).toHaveCount(3)
  await expect(page.getByTestId("rq-fix").getByTestId("rq-row")).toHaveCount(8)
  // A computer or an iPad: every task line is one line. A phone (R-S0 W2): the full title wraps and the reason sits under it.
  for (const line of await page.getByTestId("rq-person-task").all()) {
    const title = line.locator(".dg-task-title"), chip = line.getByTestId("rq-reason")
    expect(await title.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)
    if (isMobile) expect((await chip.boundingBox())!.y).toBeGreaterThanOrEqual((await title.boundingBox())!.y + (await title.boundingBox())!.height - 1)
    else expect((await line.boundingBox())!.height).toBeLessThan(44)
  }
  await expect(page.getByText("Late to start")).toHaveCount(0)
  await expect(page.getByTestId("rq-people").getByText("No start update")).toHaveCount(3)
  if (!isMobile) {
    await page.setViewportSize({ width: 1440, height: 900 })
    expect(await page.locator("main").evaluate(m => m.scrollHeight)).toBeLessThan(1600)
  }
  expect(await serious(page)).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

test("a row expands to its real email in place; a row's Send records it once; Send all records the rest", async ({ page }) => {
  const maya = page.locator('[data-testid="rq-person"][data-recipient="maya"]')
  const toggle = maya.getByRole("button", { name: "Email to Maya Chen" })
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  // R-S0: a review mode opens the email as an editable draft; each task link is a token on its own line.
  await expect(maya.getByTestId("rq-draft-body")).toHaveValue(/^\[Open task: [^\]]+\]$/m)
  expect((await maya.getByTestId("rq-draft-body").inputValue()).match(/\[Open task: /g)).toHaveLength(1)
  await expect(maya.getByTestId("rq-draft-to")).toHaveText("maya.chen@example.org")
  await expect(page.getByTestId("digest-panel")).toHaveCount(0)
  expect(await serious(page)).toEqual([])
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await maya.getByRole("button", { name: "Send to Maya" }).click()
  await expect(maya).toHaveAttribute("data-state", "sent")
  await expect(maya.getByText("Sent", { exact: true })).toBeVisible()
  await expect(toggle).toBeFocused()
  // Step 0: the page's one status line announces it; the row shows Sent and keeps no "Sent to Maya." note.
  await expect(page.getByTestId("rq-feedback")).toHaveText("Sent to Maya.")
  await expect(maya.getByText("Sent to Maya.")).toHaveCount(0)
  expect((await read(page)).reminderRuntime!.digests).toHaveLength(1)
  const order = () => page.getByTestId("rq-person").evaluateAll(list => list.map(p => (p as HTMLElement).dataset.recipient))
  // The last row sent: it is marked in place and does not jump above Jordan.
  const priya = page.locator('[data-testid="rq-person"][data-recipient="priya"]')
  await priya.getByRole("button", { name: "Send to Priya" }).click()
  await expect(priya).toHaveAttribute("data-state", "sent")
  expect(await order()).toEqual(["maya", "jordan", "priya"])
  const jordan = page.locator('[data-testid="rq-person"][data-recipient="jordan"]')
  await jordan.getByRole("button", { name: "Email to Jordan Patel" }).click()
  await expect(jordan.getByTestId("rq-draft-body")).toBeVisible()
  expect((await jordan.getByTestId("rq-draft-body").inputValue()).match(/^\[Open task: [^\]]+\]$/gm)).toHaveLength(3)
  await page.getByRole("button", { name: "Send 1 email" }).click()
  await expect(page.getByTestId("rq-feedback")).toHaveText("Sent to 1 person. 2 were sent earlier today.")
  // Send all is gone; focus moved to the summary line instead of falling to the page body.
  await expect(page.getByTestId("rq-summary-line")).toBeFocused()
  expect(await order()).toEqual(["maya", "jordan", "priya"])
  const saved = await read(page)
  expect(saved.reminderRuntime!.digests).toHaveLength(3)
  expect(saved.reminderRuntime!.deliveries).toHaveLength(5)
  await expect(page.getByTestId("rq-summary")).toContainText("Nothing to send today.")
  await expect(page.getByTestId("rq-next")).toHaveText(/^Next check: (Mon|Tue|Wed|Thu|Fri|Sat|Sun), Nov \d+ · \d+ planned this week$/)
  await expect(page.getByTestId("send-all-digests")).toHaveCount(0)
  await expect(page.getByTestId("rq-person")).toHaveCount(3)
  for (const p of await page.getByTestId("rq-person").all()) await expect(p).toHaveAttribute("data-state", "sent")
  await expect(page.getByTestId("rq-history")).toHaveText("History")
  await page.getByTestId("open-history").click()
  await expect(page.getByTestId("rq-sent").getByTestId("rq-row")).toHaveCount(3)
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

// R-S0 W2: titles are never cut, reasons are one neutral chip, real statuses use the fixed pills, and there is no red risk mark.
test("narrow screens wrap whole titles; reasons are neutral; statuses use the fixed pills; risk is text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await closeRail(page)
  const people = page.getByTestId("rq-people")
  await expect(people.locator("[data-testid=forecast], .risk")).toHaveCount(0)
  const titles = people.locator(".dg-task-title")
  await expect(titles).toHaveCount(5)
  for (const title of await titles.all()) {
    expect(await title.evaluate(el => ({ cut: el.scrollWidth > el.clientWidth, ellipsis: getComputedStyle(el).textOverflow }))).toEqual({ cut: false, ellipsis: "clip" })
    const box = (await title.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(320)
  }
  await expect(page.locator('[data-node="t-room"] .dg-task-title')).toHaveText("Book the spring weekly meeting room · At risk")
  // "At risk" is read after the title and adds no tab stop.
  await expect(people.getByTestId("rq-at-risk").first()).toHaveText("· At risk")
  expect(await people.getByTestId("rq-at-risk").evaluateAll(list => list.every(el => !el.closest("button, a, [tabindex]:not([tabindex=\"-1\"])")))).toBe(true)
  const chips = await page.getByTestId("rq-reason").evaluateAll(list => [...new Set(list.map(el => getComputedStyle(el).backgroundColor + getComputedStyle(el).color))])
  expect(chips).toHaveLength(1)
  const fix = page.getByTestId("rq-fix")
  await expect(fix.getByText("No owner")).toHaveCount(0)
  await expect(fix.locator('.pill[data-status="unclaimed"]')).toHaveText(["Not claimed", "Not claimed"])
  await expect(fix.locator('.pill[data-status="blocked"]')).toHaveText(["Stuck", "Stuck"])
  // The email subject is plain sans text; the page title keeps the serif.
  await page.locator('[data-recipient="maya"]').getByTestId("rq-person-toggle").click()
  const subject = page.locator('[data-recipient="maya"]').getByTestId("digest-subject")
  await expect(subject).toHaveText("Club work · Reconcile September receipts")
  expect(await subject.evaluate(el => el.tagName)).toBe("P")
  const family = (sel: string) => page.locator(sel).first().evaluate(el => getComputedStyle(el).fontFamily)
  expect(await family('[data-testid="digest-subject"]')).not.toMatch(/Georgia/)
  expect(await family(".page-head h1")).toMatch(/Georgia/)
  expect(await family("#dg-fix-h")).not.toMatch(/Georgia/)
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
})

for (const [width, height] of [[390, 844], [320, 640]]) {
  test(`phone ${width}px: the floating Ask button never covers an action`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only: the Ask button is drawn below 1200px, on a touch screen")
    await page.setViewportSize({ width, height })
    const fab = page.locator(".ask-fab")
    await expect(fab).toBeVisible()
    // At the end of the page every button and link of the people list and Fix first sits above the Ask button.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const covered = () => page.evaluate(() => {
      const f = document.querySelector(".ask-fab")!.getBoundingClientRect()
      return [...document.querySelectorAll<HTMLElement>("main button, main a[href]")].filter(el => el.getClientRects().length).filter(el => {
        const b = el.getBoundingClientRect()
        return b.right > f.left && b.left < f.right && b.bottom > f.top && b.top < f.bottom
      }).map(el => el.textContent)
    })
    expect(await covered()).toEqual([])
    // The people list alone (no Fix first after it): its last Send still clears the button.
    await page.evaluate(() => document.querySelector<HTMLElement>("[data-testid=rq-fix]")!.remove())
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    expect(await covered()).toEqual([])
    const last = (await page.getByTestId("rq-person").last().boundingBox())!
    expect(last.y + last.height).toBeLessThanOrEqual((await fab.boundingBox())!.y)
  })
}
