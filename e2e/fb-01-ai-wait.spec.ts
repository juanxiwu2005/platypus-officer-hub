import { expect, test, type Page, type Route } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { ask } from "./helpers"

/**
 * FB-1 3.3 (docs/feedback-fix/PLAN.md): an AI wait you can see and stop. The AI endpoints are mocked to answer very late;
 * no real AI is called. Stop (Ask) and Skip AI line (reminder) end the wait at once with a local answer, and the late
 * answer never appears afterwards.
 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
/** Answer after `ms`, unless the browser has given up on the request by then (then nothing happens). */
const late = (ms: number, json: unknown) => async (r: Route) => { await sleep(ms); await r.fulfill({ json }).catch(() => {}) }
const health = (page: Page) => page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock", syncBudgetMs: 40_000 } }))
const answers = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string; payload?: Record<string, unknown> }[]).filter(e => e.type === "ui.answer").map(e => e.payload ?? {}))
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

test("Ask: the wait counts seconds, Stop answers locally at once, and the late AI answer never appears", async ({ page }) => {
  test.setTimeout(45_000)
  await health(page)
  await page.route("**/api/chat", late(14_000, { cards: [{ kind: "text", text: "LATE AI ANSWER" }], source: "ai", model: "mock" }))
  await page.goto("/#/")
  await ask(page, "Tell me something fun about the club")
  const wait = page.getByTestId("ai-wait")
  await expect(wait).toBeVisible()
  await expect(wait).toContainText("Thinking…")
  await expect(wait.getByTestId("ai-wait-seconds")).toHaveText(/^[2-9] s$/, { timeout: 5_000 }) // it counts up
  // After 10 s: how long a complex question can take, from the server's budget in /api/health.
  await expect(wait.getByTestId("ai-wait-slow")).toHaveText("Complex questions can take up to 40 s.", { timeout: 9_000 })
  await page.getByTestId("ask-stop").click()
  await expect(wait).toHaveCount(0)
  const reply = page.getByTestId("bot-reply").last()
  await expect(reply.locator(".ask-source")).toHaveText("Platypus · stopped, quick answer from this browser")
  // The input works straight away.
  await page.locator("#ask-input").fill("What are my top 5 tasks?")
  await expect(page.getByTestId("ask-panel").getByRole("button", { name: "Send", exact: true })).toBeEnabled()
  // The mocked AI answers at 14 s: it must not show up.
  await sleep(3_500)
  await expect(page.getByTestId("ask-panel")).not.toContainText("LATE AI ANSWER")
  await expect.poll(async () => (await answers(page)).some(a => a.answer === "stopped" && a.fallback === true)).toBe(true)
})

test("Ask: Stop is reachable from the keyboard and keeps the form filled from the person's words", async ({ page }) => {
  await health(page)
  await page.route("**/api/chat", late(12_000, { cards: [{ kind: "form", intent: "plan_event", prefill: { name: "LATE NAME", headcount: 99 } }], source: "ai" }))
  await page.goto("/#/")
  await ask(page, "Plan an event about March 3 for networking night with 50 people")
  const form = page.getByTestId("plan-form")
  await expect(form.getByTestId("ai-reading")).toBeVisible()
  await expect(page.getByTestId("ai-wait")).toBeVisible()
  expect(await scan(page)).toEqual([])
  // Tab from the message box until the Stop button has the focus.
  await page.locator("#ask-input").focus()
  let reached = false
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press("Shift+Tab")
    reached = await page.evaluate(() => document.activeElement?.getAttribute("data-testid") === "ask-stop")
  }
  expect(reached).toBe(true)
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("ai-wait")).toHaveCount(0)
  await expect(form.getByTestId("ai-reading")).toHaveCount(0)
  await expect(page.getByTestId("bot-reply").last().locator(".ask-source")).toHaveText("Platypus · AI stopped, filled from your words")
  await expect(form.getByLabel("Event name")).toHaveValue("Networking night")
  await expect(form.getByLabel("People")).toHaveValue("50")
  await expect(page.locator("#ask-input")).toBeFocused()
  await expect.poll(async () => (await answers(page)).some(a => a.answer === "stopped" && a.refine === true)).toBe(true)
})

test("Reminder: Skip AI line uses the checked template at once and the draft is ready", async ({ page }) => {
  await health(page)
  await page.route("**/api/nudge/draft", late(15_000, { whyItMatters: "LATE AI LINE" }))
  await page.goto("/#/")
  await page.getByTestId("risk-list").getByRole("button", { name: "Remind" }).first().click()
  const panel = page.getByTestId("nudge-panel")
  const wait = panel.getByTestId("ai-wait")
  await expect(wait).toBeVisible()
  await expect(panel.getByRole("button", { name: "Checking draft…" })).toBeDisabled()
  await expect(wait.getByTestId("ai-wait-seconds")).toHaveText(/^[1-9] s$/, { timeout: 4_000 })
  expect(await scan(page)).toEqual([])
  await panel.getByTestId("nudge-skip-ai").click()
  await expect(wait).toHaveCount(0)
  await expect(panel.getByRole("link", { name: /^Open .+ draft$/ })).toBeVisible()
  await expect(panel).toContainText("Checked template · AI line skipped")
  await expect(panel.getByTestId("nudge-body")).toContainText("Why it matters:")
  await expect(panel.getByTestId("nudge-body")).not.toContainText("LATE AI LINE")
})

test("Reminder: when the AI line arrives in time it is used", async ({ page }) => {
  await health(page)
  await page.route("**/api/nudge/draft", late(1_500, { whyItMatters: "Together we welcome every new founder." }))
  await page.goto("/#/")
  await page.getByTestId("risk-list").getByRole("button", { name: "Remind" }).first().click()
  const panel = page.getByTestId("nudge-panel")
  await expect(panel.getByTestId("ai-wait")).toBeVisible()
  await expect(panel.getByTestId("nudge-body")).toContainText("Together we welcome every new founder.")
  await expect(panel.getByTestId("ai-wait")).toHaveCount(0)
  await expect(panel).toContainText("AI + checked template")
})
