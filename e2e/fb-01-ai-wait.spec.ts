import { expect, test, type Page, type Route } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { ask } from "./helpers"
import { enableUpdatedReminders } from "./reminderHelpers"

/**
 * FB-1 3.3 (docs/feedback-fix/PLAN.md): an AI wait you can see and stop. The AI endpoints are mocked to answer very late;
 * no real AI is called. Stop (Ask) ends the wait at once; reminders use rules without an AI request. The late
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

test("Reminder: a stalled AI endpoint does not delay the rule-written draft", async ({ page }) => {
  await health(page)
  let calls = 0
  await page.route("**/api/nudge/draft", route => { calls++; return route.abort() })
  const ai: string[] = []
  page.on("request", r => { if (/\/api\/(?:nudge|chat|command|ask)/.test(r.url())) ai.push(r.url()) })
  await enableUpdatedReminders(page, "review_then_self")   // the Gmail draft path; the sample club starts on review_then_auto
  // Concept F / S2: today's reminder is the person's combined email, opened in place on the Reminders page.
  const panel = page.getByTestId("rq-person").first()
  await panel.getByTestId("rq-person-toggle").click()
  await expect(panel.getByRole("link", { name: "Open in Gmail" })).toBeVisible()
  await expect(panel.getByTestId("ai-wait")).toHaveCount(0)
  // R-S0: the email opens as an editable draft.
  await expect(panel.getByTestId("rq-draft-body")).toHaveValue(/Task due:/)
  await expect(panel.getByTestId("rq-draft-body")).toHaveValue(/Thank you/)
  expect(await scan(page)).toEqual([])
  expect(calls).toBe(0)
  expect(ai).toEqual([])
})

test("Reminder: available AI text is not requested or substituted into the rule draft", async ({ page }) => {
  await health(page)
  let calls = 0
  await page.route("**/api/nudge/draft", route => { calls++; return route.fulfill({ json: { whyItMatters: "UNREQUESTED AI LINE" } }) })
  await enableUpdatedReminders(page, "review_then_self")   // the Gmail draft path; the sample club starts on review_then_auto
  const panel = page.getByTestId("rq-person").first()
  await panel.getByTestId("rq-person-toggle").click()
  await expect(panel.getByTestId("rq-draft-body")).toHaveValue(/^\[Open task: [^\]]+\]$/m)
  await expect(panel.getByTestId("rq-draft-body")).not.toHaveValue(/UNREQUESTED AI LINE/)
  await expect(panel.getByTestId("rq-draft-subject")).not.toHaveValue(/UNREQUESTED AI LINE/)
  expect(decodeURIComponent((await panel.getByRole("link", { name: "Open in Gmail" }).getAttribute("href"))!)).not.toContain("UNREQUESTED AI LINE")
  await expect(panel.getByTestId("ai-wait")).toHaveCount(0)
  expect(calls).toBe(0)
})
