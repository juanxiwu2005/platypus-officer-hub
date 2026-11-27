import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, openAsk, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import type { DemoState } from "../src/data/types"

// Playbook (docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md §3, redesigned 2026-11-26 §6): compact question rows that open in place, three
// answer kinds (School rule, Club rule, Tip), votes, Ask AI with its context, delete instead of hide, every question for every role,
// "Add experience" with the duplicate check, and what an incoming or former officer may do. All data is the fictional v2 demo.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false } }))
})

const FUNDING_Q = "How far ahead must an event funding request go in?"
const row = (page: Page, text: string) => page.getByTestId("pb-question").filter({ has: page.getByRole("button", { name: text }) })
/** A row's own toggle button (its accessible name is the question, then "New" and the category tag). */
const head = (page: Page, text: string) => row(page, text).locator(".pb-q-btn")
const askAi = (page: Page, text: string) => row(page, text).getByRole("button", { name: `Ask AI about ${text}`, exact: true })
const answerMenu = (answer: ReturnType<Page["locator"]>) => answer.getByRole("button", { name: "More actions for this answer" })
/** Scrolled to the top first, so no control sits under the sticky top bar while axe measures target sizes. */
const scan = async (page: Page) => (await page.evaluate(() => window.scrollTo(0, 0)), await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

async function openPlaybook(page: Page) {
  await page.goto("/#/playbook")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Playbook")
  await closeRail(page)
}
async function rewrite(page: Page, fn: (s: DemoState) => DemoState) {
  const s = fn(await savedDemo(page))
  await page.evaluate(next => localStorage.setItem("platypus.v1.demo", JSON.stringify(next)), s)
  await page.reload()
}

test("navigation shows Playbook, current on /playbook and /handoff, and the handoff link opens the existing workspace", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", e => errors.push(e.message))
  await openPlaybook(page)
  const nav = page.getByRole("navigation", { name: "Sections", exact: true })
  const item = nav.getByRole("link", { name: "Playbook", exact: true })
  await expect(item).toHaveAttribute("aria-current", "page")
  await expect(nav.getByRole("link", { name: "Handoff", exact: true })).toHaveCount(0)
  const link = page.getByTestId("pb-handoff-link")
  await expect(link).toHaveText("Handoff in progress · 5 roles")
  await link.click()
  await expect(page).toHaveURL(/#\/handoff$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Handoff")
  await closeRail(page)
  await expect(item).toHaveAttribute("aria-current", "page")
  expect(errors).toEqual([])
})

test("a row opens in place with School rule, Club rule and Tip, full author names and source names, and stays read after a reload", async ({ page }) => {
  await openPlaybook(page)
  // Answers of closed rows are not in the page at all.
  await expect(page.getByTestId("pb-answer")).toHaveCount(0)
  await expect(page.locator("main")).not.toContainText("Late requests are automatically ineligible")
  const r = row(page, FUNDING_Q)
  const toggle = head(page, FUNDING_Q)
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await expect(r).toContainText("New")
  await expect(r.locator(".pb-tag")).toHaveText("Funding")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  const answers = r.getByTestId("pb-answer")
  await expect(answers).toHaveCount(3)
  await expect(answers.nth(0)).toHaveAttribute("data-kind", "rule")
  await expect(answers.nth(1)).toHaveAttribute("data-kind", "club")
  await expect(answers.nth(2)).toHaveAttribute("data-kind", "experience")
  await expect(answers.nth(0).locator(".pb-label")).toHaveText("School rule")
  await expect(answers.nth(1).locator(".pb-label")).toHaveText("Club rule")
  await expect(answers.nth(2).locator(".pb-label")).toHaveText("Tip")
  const source = answers.nth(0).getByRole("link", { name: "The Bylaws of the Undergraduate Student Government - Tempe of Arizona State University" })
  await expect(source).toHaveAttribute("href", /^https:\/\//)
  // Full names, never a first name alone.
  await expect(answers.nth(1)).toContainText("Club rule · Alex Rivera · Sep 2026")
  await expect(answers.nth(2)).toContainText("Tip · Maya Chen · Apr 2026")
  await expect(page.locator("main")).not.toContainText("ASU-R-")
  // School rules take no votes and have no menu.
  await expect(answers.nth(0).getByRole("button")).toHaveCount(0)
  // One more tip stays folded until asked for.
  await r.getByRole("button", { name: "1 more answer" }).click()
  await expect(answers).toHaveCount(4)
  await expect(answers.nth(3)).toContainText("Tip · Jordan Patel · Mar 2026")
  // Only the open row has answers in the page.
  expect(await page.locator("[data-testid=pb-question]:not(.is-open) [data-testid=pb-answer]").count()).toBe(0)
  await expect(r).not.toContainText("New")
  await page.reload()
  await closeRail(page)
  await expect(row(page, FUNDING_Q)).toHaveClass(/is-read/)
  await expect(row(page, FUNDING_Q)).not.toContainText("New")
  await expect(head(page, FUNDING_Q)).toHaveAttribute("aria-expanded", "false")
  await expect(page.getByTestId("pb-answer")).toHaveCount(0)
})

test("an open row with three answers is compact", async ({ page, isMobile }) => {
  test.skip(isMobile, "measured at a computer width")
  await page.setViewportSize({ width: 1440, height: 900 })
  await openPlaybook(page)
  await head(page, FUNDING_Q).click()
  await expect(row(page, FUNDING_Q).getByTestId("pb-answer")).toHaveCount(3)
  // About a third of a 900px-tall screen (Juanxi, 2026-11-26).
  expect(await row(page, FUNDING_Q).evaluate(e => e.getBoundingClientRect().height)).toBeLessThanOrEqual(320)
  // No row of buttons under each answer: per answer at most like, dislike and the ⋯ menu.
  for (const a of await row(page, FUNDING_Q).getByTestId("pb-answer").all()) expect(await a.getByRole("button").count()).toBeLessThanOrEqual(3)
})

test("every viewer sees every question: no role select, and the Treasurer and the Events lead see the same list", async ({ page }) => {
  await openPlaybook(page)
  await expect(page.getByTestId("pb-role")).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Role" })).toHaveCount(0)
  await expect(page.getByTestId("pb-question")).toHaveCount(8)
  await page.getByRole("button", { name: "Show 4 more" }).click()
  await expect(page.getByTestId("pb-question")).toHaveCount(12)
  const ids = (p: Page) => p.getByTestId("pb-question").evaluateAll(els => els.map(e => e.getAttribute("data-question-id")))
  const president = await ids(page)
  await viewAs(page, "maya")
  await closeRail(page)
  await page.getByRole("button", { name: "Show 4 more" }).click()
  const treasurer = await ids(page)
  await viewAs(page, "jordan")
  await closeRail(page)
  await page.getByRole("button", { name: "Show 4 more" }).click()
  expect(await ids(page)).toEqual(treasurer)
  expect(treasurer).toEqual(president)
  const funding = page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Funding", exact: true })
  await funding.click()
  await expect(funding).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("pb-question")).toHaveCount(3)
})

test("switching category chips never moves a chip", async ({ page }) => {
  await openPlaybook(page)
  const chips = page.getByTestId("pb-cats").getByRole("button")
  // Each chip's place inside the chip row (scrolling the row on a phone does not count as moving), and its width.
  const places = () => page.getByTestId("pb-cats").evaluate(row => [...row.querySelectorAll("button")].map(b => {
    const r = b.getBoundingClientRect(), box = row.getBoundingClientRect()
    return `${Math.round((r.left - box.left + row.scrollLeft) * 10) / 10}:${Math.round(r.width * 10) / 10}`
  }))
  const before = await places()
  expect(before.length).toBe(8)
  for (let i = 0; i < before.length; i++) {
    await chips.nth(i).click()
    await expect(chips.nth(i)).toHaveAttribute("aria-pressed", "true")
    expect(await places(), `after clicking chip ${i}`).toEqual(before)
  }
  await chips.first().click()
  expect(await places()).toEqual(before)
})

test("like toggles, shows its count and persists", async ({ page }) => {
  await openPlaybook(page)
  const r = row(page, FUNDING_Q)
  await head(page, FUNDING_Q).click()
  const experience = r.locator("[data-kind=experience]").first()
  const like = experience.getByRole("button", { name: /^Like/ })
  await expect(like).toHaveAttribute("aria-pressed", "true") // Alex already liked Maya's tip in the sample
  await expect(like).toHaveAccessibleName("Like 1")
  await like.click()
  await expect(like).toHaveAttribute("aria-pressed", "false")
  await expect(like).toHaveAccessibleName("Like 0")
  const club = r.locator("[data-kind=club]")
  const clubLike = club.getByRole("button", { name: /^Like/ })
  await clubLike.click()
  await expect(clubLike).toHaveAttribute("aria-pressed", "true")
  await expect(clubLike).toHaveAccessibleName("Like 3")
  await page.reload()
  await closeRail(page)
  await head(page, FUNDING_Q).click()
  await expect(row(page, FUNDING_Q).locator("[data-kind=club]").getByRole("button", { name: /^Like/ })).toHaveAttribute("aria-pressed", "true")
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.find(a => a.id === "pa-2")!.votes.up).toContain("alex")
})

test("Ask AI on a row: Ask opens with the question filled in and the focus chip, and nothing is sent", async ({ page }) => {
  const calls: string[] = []
  page.on("request", r => { if (/\/api\/(ask|chat|policy-answer)\b/.test(r.url())) calls.push(r.url()) })
  await openPlaybook(page)
  // The icon button is on every row, open or closed.
  await askAi(page, FUNDING_Q).click()
  await openAsk(page)
  await expect(page.locator("#ask-input")).toHaveValue(FUNDING_Q)
  await expect(page.getByTestId("focus-chip")).toHaveText(`Looking at: ${FUNDING_Q}×`)
  await page.waitForTimeout(500)
  expect(calls).toEqual([])
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string }[])
  expect(log.filter(e => e.type === "ui.ask")).toEqual([])
  // Closing the chip ends the question's context: Ask looks at the page again.
  await page.getByTestId("focus-chip").getByRole("button", { name: "Stop using this context" }).click()
  await expect(page.getByTestId("focus-chip")).toHaveText("Looking at: Playbook×")
})

test("sending from Ask AI includes playbookQuestion in the /api/chat request (server AI unavailable)", async ({ page }) => {
  // The demo's AI switch stays on (with it off nothing is sent at all, by design); the server is replaced by a 503 here.
  const bodies: Record<string, unknown>[] = []
  await page.route("**/api/chat", async route => { bodies.push(route.request().postDataJSON()); await route.fulfill({ status: 503, json: { error: "unavailable" } }) })
  await openPlaybook(page)
  await askAi(page, FUNDING_Q).click()
  await openAsk(page)
  await expect(page.locator("#ask-input")).toHaveValue(FUNDING_Q)
  await page.getByRole("button", { name: "Send", exact: true }).click()
  await expect.poll(() => bodies.length).toBe(1)
  const body = bodies[0] as { focus: unknown; playbookQuestion: { kind: string; questionId: string; question: string; category: string; rules: { sourceName: string; text: string }[]; clubRules: { author: string }[]; tips: { author: string; likes: number }[] } }
  expect(body.focus).toEqual({ kind: "playbook-question", id: "pq-1", title: FUNDING_Q })
  expect(body.playbookQuestion).toMatchObject({ kind: "playbook-question", questionId: "pq-1", question: FUNDING_Q, category: "Funding" })
  expect(body.playbookQuestion.rules[0].sourceName).toBe("The Bylaws of the Undergraduate Student Government - Tempe of Arizona State University")
  expect(body.playbookQuestion.clubRules.map(c => c.author)).toEqual(["Alex Rivera"])
  expect(body.playbookQuestion.tips.map(t => [t.author, t.likes])).toEqual([["Maya Chen", 1], ["Jordan Patel", 0]])
  // The app still answers (the rule book's local answer), and the log never holds the answers' text.
  await expect(page.getByTestId("rail").getByText(/Matched by keywords/).first()).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.log") ?? "")).not.toContain("Send every vendor quote")
})

test("Add experience suggests an existing question and adds the answer there instead of a duplicate", async ({ page }) => {
  await openPlaybook(page)
  await page.getByTestId("pb-add-open").click()
  const form = page.getByTestId("pb-add")
  await form.getByLabel("Question").fill("How far ahead must a funding request be submitted?")
  const similar = form.getByTestId("pb-similar")
  await expect(similar).toContainText(FUNDING_Q)
  await similar.locator("li").filter({ hasText: FUNDING_Q }).getByRole("button", { name: "Answer this existing question instead" }).click()
  await expect(form.getByTestId("pb-existing")).toContainText(FUNDING_Q)
  await expect(form.getByLabel("Answer", { exact: true })).toBeFocused()
  await form.getByLabel("Answer", { exact: true }).fill("Ask the Business Office to confirm the date the request arrived.")
  await form.getByRole("button", { name: "Save" }).click()
  await expect(form).toHaveCount(0)
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions).toHaveLength(12)
  expect(saved.playbook!.answers.find(a => a.text.startsWith("Ask the Business Office"))).toMatchObject({ questionId: "pq-1", kind: "experience", authorId: "alex" })
  const r = row(page, FUNDING_Q)
  await expect(head(page, FUNDING_Q)).toHaveAttribute("aria-expanded", "true")
  await r.getByRole("button", { name: "2 more answers" }).click()
  await expect(r).toContainText("Ask the Business Office to confirm")
})

test("a new question appears in its category, for every role", async ({ page }) => {
  await openPlaybook(page)
  await page.getByTestId("pb-add-open").click()
  const form = page.getByTestId("pb-add")
  const text = "Where do we keep the club banner between events?"
  await form.getByLabel("Question").fill(text)
  await form.getByLabel("Category").selectOption({ label: "Tools & accounts" })
  await form.getByRole("group", { name: "Answer type" }).getByLabel("Club rule").check()
  await form.getByLabel("Answer", { exact: true }).fill("In the Secretary's locker in the Memorial Union, with the table cloth.")
  await form.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Tools & accounts" })).toHaveAttribute("aria-pressed", "true")
  const r = row(page, text)
  await expect(r).toBeVisible()
  await expect(head(page, text)).toBeFocused()
  await expect(r.locator("[data-kind=club]")).toContainText("In the Secretary's locker")
  await expect(r.locator("[data-kind=club]")).toContainText("Club rule · Alex Rivera")
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions.find(q => q.text === text)).toMatchObject({ category: "tools", roleIds: "all", createdBy: "alex" })
})

test("an incoming officer can read and vote but sees no add, edit or delete", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, incomingId: "riley" } : h), people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", email: "riley.example@example.org", incomingFor: "r-fin" }] }))
  await viewAs(page, "riley")
  await closeRail(page)
  await expect(page.getByTestId("pb-add-open")).toHaveCount(0)
  await expect(page.getByTestId("pb-question")).toHaveCount(8)
  const r = row(page, FUNDING_Q)
  await head(page, FUNDING_Q).click()
  await expect(r.getByTestId("pb-answer")).toHaveCount(3)
  await expect(r.getByRole("button", { name: "Add an answer" })).toHaveCount(0)
  await expect(r.getByRole("button", { name: /^More actions/ })).toHaveCount(0)
  const like = r.locator("[data-kind=club]").getByRole("button", { name: /^Like/ })
  await expect(like).toBeEnabled()
  await like.click()
  await expect(like).toHaveAttribute("aria-pressed", "true")
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.find(a => a.id === "pa-2")!.votes.up).toContain("riley")
  expect(saved.playbook!.reads?.riley).toContain("pq-1")
})

for (const scheme of ["light", "dark"] as const) test(`no accessibility violations with a row open, a menu and a confirm (${scheme})`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: scheme })
  await openPlaybook(page)
  expect(await scan(page)).toEqual([])
  const r = row(page, FUNDING_Q)
  await head(page, FUNDING_Q).click()
  await r.getByRole("button", { name: "1 more answer" }).click()
  await answerMenu(r.locator("[data-kind=club]")).click()
  await expect(r.getByRole("menu")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await r.getByRole("menuitem", { name: "Delete" }).click()
  await expect(r.getByTestId("pb-confirm")).toBeVisible()
  expect(await scan(page)).toEqual([])
  await r.getByTestId("pb-confirm").getByRole("button", { name: "Cancel" }).click()
  await r.getByRole("button", { name: "Add an answer" }).click()
  expect(await scan(page)).toEqual([])
  await page.getByTestId("pb-add-open").click()
  await page.getByTestId("pb-add").getByLabel("Question").fill("How far ahead must a funding request be submitted?")
  await expect(page.getByTestId("pb-similar")).toBeVisible()
  expect(await scan(page)).toEqual([])
})

test("no horizontal overflow with rows open and the add form shown", async ({ page }) => {
  await openPlaybook(page)
  for (const text of [FUNDING_Q, "Can members bring homemade food to an event?"]) await head(page, text).click()
  await answerMenu(row(page, FUNDING_Q).locator("[data-kind=club]")).click()
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  await page.keyboard.press("Escape")
  await page.getByTestId("pb-add-open").click()
  await page.getByTestId("pb-add").getByLabel("Question").fill("How far ahead must a funding request be submitted?")
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

// ───────────── Focus, logging names, delete, rights, bounded lists and words ─────────────

const logOf = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string; payload: Record<string, unknown>; applied?: boolean }[])
const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "")
const focusedText = (page: Page) => page.evaluate(() => (document.activeElement?.textContent ?? "").trim())
const focusedName = (page: Page) => page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "")
const focusedAnswer = (page: Page) => page.evaluate(() => document.activeElement?.closest("[data-answer-id]")?.getAttribute("data-answer-id") ?? "")
const rowIds = (page: Page) => page.getByTestId("pb-question").evaluateAll(els => els.map(e => e.getAttribute("data-question-id") ?? ""))
/** Counts the words in <main> exactly as scripts/word-count.mjs does. */
const words = (page: Page) => page.evaluate(() => {
  const m = document.querySelector("main")!
  const shown = (el: Element) => { for (let e: Element | null = el; e && e !== m.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false } return true }
  const all: string[] = [], visible: string[] = []
  const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) { const el = n.parentElement; if (!el || el.closest("option, script, style")) continue; all.push(n.textContent ?? ""); if (shown(el) && el.getClientRects().length) visible.push(n.textContent ?? "") }
  for (const sel of m.querySelectorAll("select")) { const t = sel.selectedOptions[0]?.textContent ?? ""; all.push(t); if (shown(sel)) visible.push(t) }
  const count = (parts: string[]) => parts.join(" ").split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length
  return { all: count(all), visible: count(visible) }
})

const LARGE_Q = (i: number) => `How should the treasurer handle vendor quotes, receipts and a funding calendar for events, case ${String(i).padStart(4, "0")}`
/**
 * Worst case for the page's words: the most questions allowed (500), each exactly 100 characters of ordinary English, and 20 club
 * categories with 40-character labels. Club categories come first, so every row shown by default carries a long club label.
 */
function largePlaybook(s: DemoState): DemoState {
  const categories = Array.from({ length: 20 }, (_, i) => ({ id: `cat:c${i}`, label: `Spring gala sponsors and vendor list ${String(i).padStart(3, "0")}` }))
  const ids = [...categories.map(c => c.id), "funding", "venues", "food", "promotion", "people", "timeline", "tools"]
  const questions = Array.from({ length: 500 }, (_, i) => ({ id: `pq-x${i}`, text: LARGE_Q(i), category: ids[i % ids.length], roleIds: "all" as const, policyIds: [], checklistItemIds: [], origin: "club" as const, createdOn: "2026-11-01", createdBy: "maya" }))
  const answers = questions.slice(0, 50).flatMap((q, i) => [0, 1, 2].map(j => ({ id: `pa-x${i}-${j}`, questionId: q.id, kind: j ? "experience" as const : "club" as const, text: "An answer of ordinary length. ".repeat(12).trim(), authorId: "maya", on: "2026-11-01", status: "active" as const, votes: { up: [], down: [] } })))
  return { ...s, playbook: { questions, answers, categories } }
}

test("opening a row and Ask AI log fixed names, never the question text; the screen-reader names stay the question", async ({ page }) => {
  await openPlaybook(page)
  await expect(head(page, FUNDING_Q)).toHaveAccessibleName(new RegExp(`^${FUNDING_Q.replace(/[?$]/g, "\\$&")}`))
  await head(page, FUNDING_Q).click()
  await row(page, FUNDING_Q).getByRole("button", { name: "1 more answer" }).click()
  await askAi(page, FUNDING_Q).click()
  await expect.poll(async () => (await logOf(page)).filter(e => e.type === "ui.click").map(e => e.payload.name)).toEqual(expect.arrayContaining(["Playbook question", "Playbook Ask AI"]))
  const log = JSON.stringify(await logOf(page))
  expect(log).not.toContain("How far ahead")
  expect(log).not.toContain("vendor quote")
})

test("empty Playbook: Add experience, and the president starts from the handoff notes", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, playbook: undefined }))
  await closeRail(page)
  const empty = page.getByTestId("pb-empty")
  await expect(empty).toContainText("No questions yet.")
  await expect(empty.getByTestId("pb-add-open")).toBeVisible()
  await empty.getByRole("button", { name: "Start from your handoff notes" }).click()
  await expect(row(page, "What did the last Treasurer want the next one to know?")).toBeVisible()
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions.map(q => q.id)).toEqual(["pq-start-r-fin", "pq-start-r-events", "pq-start-r-sec"])
  // An officer who is not the president or VP gets Add experience only.
  await rewrite(page, s => ({ ...s, playbook: undefined, viewerId: "maya" }))
  await closeRail(page)
  await expect(page.getByTestId("pb-empty").getByTestId("pb-add-open")).toBeVisible()
  await expect(page.getByRole("button", { name: "Start from your handoff notes" })).toHaveCount(0)
})

test("delete an answer from its ⋯ menu with an inline confirm, edit one, and where the focus goes after each", async ({ page }) => {
  await openPlaybook(page)
  const r = row(page, FUNDING_Q)
  await head(page, FUNDING_Q).click()
  const club = r.locator("[data-kind=club]")
  // ⋯ holds Edit and Delete; the answer shows no separate Edit or Delete buttons.
  await expect(club.getByRole("button", { name: /^(Edit|Delete|Hide)$/ })).toHaveCount(0)
  await answerMenu(club).click()
  await expect(r.getByRole("menuitem")).toHaveText(["Edit", "Delete"])
  await r.getByRole("menuitem", { name: "Delete" }).click()
  const confirm = club.getByTestId("pb-confirm")
  await expect(confirm).toContainText("Delete this answer?")
  await expect(confirm.getByRole("button", { name: "Delete" })).toBeFocused()
  // Cancel keeps it, and the focus returns to its ⋯.
  await confirm.getByRole("button", { name: "Cancel" }).click()
  await expect(club).toHaveCount(1)
  await expect.poll(() => focusedName(page)).toBe("More actions for this answer")
  expect(await focusedAnswer(page)).toBe("pa-2")
  // Delete it: the focus moves to the next answer's first control (Like on the tip).
  await answerMenu(club).click()
  await r.getByRole("menuitem", { name: "Delete" }).click()
  await club.getByTestId("pb-confirm").getByRole("button", { name: "Delete" }).click()
  await expect(r.locator("[data-kind=club]")).toHaveCount(0)
  await expect.poll(() => focusedAnswer(page)).toBe("pa-3")
  expect(await focusedText(page)).toMatch(/^Like/)
  // Edit the tip: the new text shows and persists, and the focus returns to the row's button.
  const tip = r.locator("[data-answer-id=pa-3]")
  await answerMenu(tip).click()
  await r.getByRole("menuitem", { name: "Edit" }).click()
  await tip.getByLabel("Edit answer").fill("Send every vendor quote together, with tax included.")
  await tip.getByRole("button", { name: "Save", exact: true }).click()
  await expect(tip).toContainText("Send every vendor quote together, with tax included.")
  await expect.poll(() => focusedId(page)).toBe("pb-q-pq-1")
  // Save an answer: back to the row's button.
  await r.getByRole("button", { name: "Add an answer" }).click()
  await r.getByLabel("Answer", { exact: true }).fill("Keep a copy of the confirmation email.")
  await r.getByRole("button", { name: "Save answer" }).click()
  await expect.poll(() => focusedId(page)).toBe("pb-q-pq-1")
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.some(a => a.id === "pa-2")).toBe(false)
  expect(saved.playbook!.answers.find(a => a.id === "pa-3")!.text).toBe("Send every vendor quote together, with tax included.")
  // Nothing is hidden any more: no "hidden" control anywhere.
  await expect(page.locator("main")).not.toContainText(/hidden|Unhide/i)
})

test("delete a question: its answers go too, and the focus moves to the next row (or the previous)", async ({ page }) => {
  await openPlaybook(page)
  const [first, second] = await rowIds(page)
  expect(first).toBe("pq-1")
  await page.locator(`#pb-q-${first}`).click()
  const r = page.locator(`[data-question-id="${first}"]`)
  await r.getByRole("button", { name: "More actions for this question" }).click()
  await expect(r.getByRole("menuitem")).toHaveText(["Edit question", "Delete question"])
  await r.getByRole("menuitem", { name: "Delete question" }).click()
  const confirm = r.getByTestId("pb-confirm")
  await expect(confirm).toContainText("Delete this question and its 4 answers?")
  await confirm.getByRole("button", { name: "Delete" }).click()
  await expect(page.locator(`[data-question-id="${first}"]`)).toHaveCount(0)
  await expect.poll(() => focusedId(page)).toBe(`pb-q-${second}`)
  let saved = await savedDemo(page)
  expect(saved.playbook!.questions.some(q => q.id === "pq-1")).toBe(false)
  expect(saved.playbook!.answers.filter(a => a.questionId === "pq-1")).toEqual([])
  expect(saved.playbook!.answers).toHaveLength(17)
  // The last row: the focus goes to the previous one.
  await page.getByRole("button", { name: "Show 3 more" }).click()
  const rest = await rowIds(page)
  expect(rest).toHaveLength(11)
  await page.locator(`#pb-q-${rest.at(-1)}`).click()
  const last = page.locator(`[data-question-id="${rest.at(-1)}"]`)
  await last.getByRole("button", { name: "More actions for this question" }).click()
  await last.getByRole("menuitem", { name: "Delete question" }).click()
  await last.getByTestId("pb-confirm").getByRole("button", { name: "Delete" }).click()
  await expect.poll(() => focusedId(page)).toBe(`pb-q-${rest.at(-2)}`)
  saved = await savedDemo(page)
  expect(saved.playbook!.questions).toHaveLength(10)
})

test("only the president or VP can delete; an author keeps Edit on their own tip", async ({ page }) => {
  await openPlaybook(page)
  await viewAs(page, "maya")
  await closeRail(page)
  const r = row(page, FUNDING_Q)
  await head(page, FUNDING_Q).click()
  // Maya's own tip: ⋯ with Edit only. Alex's club rule: no ⋯ for her. The question (not hers): no ⋯ either.
  await answerMenu(r.locator("[data-answer-id=pa-3]")).click()
  await expect(r.getByRole("menuitem")).toHaveText(["Edit"])
  await page.keyboard.press("Escape")
  await expect(answerMenu(r.locator("[data-kind=club]"))).toHaveCount(0)
  await expect(answerMenu(r.locator("[data-answer-id=pa-4]"))).toHaveCount(0)
  await expect(r.getByRole("button", { name: "More actions for this question" })).toHaveCount(0)
  await expect(r.getByRole("button", { name: "Add an answer" })).toBeVisible()
})

test("an old save whose questions were all hidden shows the empty state (hidden items are dropped when read)", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, playbook: { ...s.playbook!, questions: s.playbook!.questions.map(q => ({ ...q, hidden: true })) } as DemoState["playbook"] }))
  await closeRail(page)
  await expect(page.getByTestId("pb-empty")).toContainText("No questions yet.")
  await expect(page.locator("main")).not.toContainText(/hidden/i)
})

test("a former officer only reads: no like or dislike, no add, and opening a row writes nothing to the Playbook", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, viewerId: "maya", people: s.people.map(p => p.id === "maya" ? { ...p, leftOn: "2026-11-01" } : p) }))
  await closeRail(page)
  await expect(page.getByTestId("pb-add-open")).toHaveCount(0)
  const r = row(page, FUNDING_Q)
  await head(page, FUNDING_Q).click()
  await expect(r.getByTestId("pb-answer")).toHaveCount(3)
  await expect(r.getByRole("button", { name: /^(Like|Dislike)/ })).toHaveCount(0)
  await expect(r.getByRole("button", { name: "Add an answer" })).toHaveCount(0)
  await expect(r.getByRole("button", { name: /^More actions/ })).toHaveCount(0)
  await expect(askAi(page, FUNDING_Q)).toBeVisible()
  expect((await logOf(page)).filter(e => e.type === "playbookAction")).toEqual([])
})

test("a vice president who is not the president leads the Playbook too", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, roles: s.roles.map(r => r.id === "r-events" ? { ...r, fn: "vice_president" } : r) }))
  await viewAs(page, "jordan")
  await closeRail(page)
  const text = "When must the RITM number reach Student Unions?"
  const r = row(page, text)
  await head(page, text).click()
  await answerMenu(r.locator("[data-kind=experience]")).click()
  await expect(r.getByRole("menuitem")).toHaveText(["Edit", "Delete"])
  await page.keyboard.press("Escape")
  await r.getByRole("button", { name: "Add an answer" }).click()
  await r.getByRole("group", { name: "Answer type" }).getByLabel("Club rule").check()
  await r.getByLabel("Answer", { exact: true }).fill("The events lead sends the number the day it arrives.")
  await r.getByRole("button", { name: "Save answer" }).click()
  await expect(r.locator("[data-kind=club]")).toContainText("The events lead sends the number")
  await expect(r.locator("[data-kind=club]")).toContainText("Club rule · Jordan Patel")
  await r.getByRole("button", { name: "More actions for this question" }).click()
  await r.getByRole("menuitem", { name: "Delete question" }).click()
  await r.getByTestId("pb-confirm").getByRole("button", { name: "Delete" }).click()
  await expect(row(page, text)).toHaveCount(0)
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions.some(q => q.text === text)).toBe(false)
  expect(saved.playbook!.answers.some(a => a.text.startsWith("The events lead sends"))).toBe(false)
})

test("a full Playbook stays within the word budget, shows seven categories plus More, and keeps lists bounded after saving", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, largePlaybook)
  await closeRail(page)
  await expect(page.getByTestId("pb-question")).toHaveCount(8)
  const counted = await words(page)
  expect(counted.visible).toBeLessThanOrEqual(200)
  expect(counted.all).toBeLessThanOrEqual(600)
  // Category chips: All, the seven universal categories and one More control that reveals the club's own.
  const chips = page.getByRole("group", { name: "Category" })
  await expect(chips.getByRole("button")).toHaveCount(9)
  const more = chips.getByRole("button", { name: "More", exact: true })
  await expect(more).toHaveAttribute("aria-expanded", "false")
  await more.click()
  await expect(more).toHaveAttribute("aria-expanded", "true")
  await expect(chips.getByRole("button")).toHaveCount(29)
  await chips.getByRole("button", { name: "Spring gala sponsors and vendor list 003" }).click()
  await expect(page.getByTestId("pb-question")).toHaveCount(8)
  await chips.getByRole("button", { name: "All", exact: true }).click()
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)

  // Answering an existing question near the top of a long category shows the list only down to that question (at least eight rows).
  await page.getByTestId("pb-add-open").click()
  const form = page.getByTestId("pb-add")
  await form.getByLabel("Question").fill(LARGE_Q(20))
  await form.getByTestId("pb-similar").locator("li").filter({ hasText: LARGE_Q(20) }).getByRole("button", { name: "Answer this existing question instead" }).click()
  await form.getByLabel("Answer", { exact: true }).fill("Collect every quote before the request goes in.")
  await form.getByRole("button", { name: "Save" }).click()
  await expect(form).toHaveCount(0)
  await expect(page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Funding", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("pb-question")).toHaveCount(8)
  await expect(page.getByRole("button", { name: /^Show \d+ more$/ })).toBeVisible()
  await expect(page.locator("#pb-q-pq-x20")).toBeFocused()

  // The Playbook is full (500 questions): a new question is refused, and the form stays open with the text and a short reason.
  await page.getByTestId("pb-add-open").click()
  await form.getByLabel("Question").fill("Where do we keep the zebra costume?")
  await form.getByLabel("Answer", { exact: true }).fill("In the storage room.")
  await form.getByRole("button", { name: "Save" }).click()
  await expect(form.getByRole("alert")).toHaveText("Not saved: the Playbook is full.")
  await expect(form).toBeVisible()
  // (The label wraps the field, so its accessible name now includes the typed text: find it by tag.)
  await expect(form.locator("textarea")).toHaveValue("In the storage room.")
})
