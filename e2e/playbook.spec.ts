import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow, openAsk, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import type { DemoState } from "../src/data/types"

// Playbook phase 1 (docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md §3): question rows that open in place, three answer kinds, votes, Ask AI,
// "Add experience" with the duplicate check, and what an incoming officer may do. All data is the fictional v2 demo.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { configured: false } }))
})

const FUNDING_Q = "How far ahead must an event funding request go in?"
const row = (page: Page, text: string) => page.getByTestId("pb-question").filter({ has: page.getByRole("button", { name: text }) })
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

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

test("a row opens in place with the three answer kinds and source names, and stays read after a reload", async ({ page }) => {
  await openPlaybook(page)
  // Answers of closed rows are not in the page at all.
  await expect(page.getByTestId("pb-answer")).toHaveCount(0)
  await expect(page.locator("main")).not.toContainText("Late requests are automatically ineligible")
  const r = row(page, FUNDING_Q)
  const head = r.getByRole("button", { name: FUNDING_Q })
  await expect(head).toHaveAttribute("aria-expanded", "false")
  await expect(r).toContainText("New")
  await head.click()
  await expect(head).toHaveAttribute("aria-expanded", "true")
  const answers = r.getByTestId("pb-answer")
  await expect(answers).toHaveCount(3)
  await expect(answers.nth(0)).toHaveAttribute("data-kind", "rule")
  await expect(answers.nth(1)).toHaveAttribute("data-kind", "club")
  await expect(answers.nth(2)).toHaveAttribute("data-kind", "experience")
  await expect(answers.nth(0)).toContainText("School rule")
  await expect(answers.nth(1)).toContainText("Club practice")
  await expect(answers.nth(2)).toContainText("Experience")
  const source = answers.nth(0).getByRole("link", { name: "The Bylaws of the Undergraduate Student Government - Tempe of Arizona State University" })
  await expect(source).toHaveAttribute("href", /^https:\/\//)
  await expect(answers.nth(1)).toContainText("Alex · Sep 2026")
  await expect(page.locator("main")).not.toContainText("ASU-R-")
  // One more experience answer stays folded until asked for.
  await r.getByRole("button", { name: "1 more answer" }).click()
  await expect(answers).toHaveCount(4)
  // Only the open row has answers in the page.
  expect(await page.locator("[data-testid=pb-question]:not(.is-open) [data-testid=pb-answer]").count()).toBe(0)
  await expect(r).not.toContainText("New")
  await page.reload()
  await closeRail(page)
  await expect(row(page, FUNDING_Q)).toHaveClass(/is-read/)
  await expect(row(page, FUNDING_Q)).not.toContainText("New")
  await expect(row(page, FUNDING_Q).getByRole("button", { name: FUNDING_Q })).toHaveAttribute("aria-expanded", "false")
  await expect(page.getByTestId("pb-answer")).toHaveCount(0)
})

test("filters: the viewer's role by default, category chips, and Show N more past eight", async ({ page }) => {
  await openPlaybook(page)
  const role = page.getByTestId("pb-role")
  await expect(role).toHaveValue("r-pres")
  await expect(page.getByTestId("pb-question")).toHaveCount(7)
  await role.selectOption("all")
  await expect(page.getByTestId("pb-question")).toHaveCount(8)
  await page.getByRole("button", { name: "Show 4 more" }).click()
  await expect(page.getByTestId("pb-question")).toHaveCount(12)
  await expect(page.getByRole("button", { name: /^Show \d+ more$/ })).toHaveCount(0)
  const funding = page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Funding", exact: true })
  await funding.click()
  await expect(funding).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("pb-question")).toHaveCount(3)
})

test("like toggles, shows its count and persists", async ({ page }) => {
  await openPlaybook(page)
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  const experience = r.locator("[data-kind=experience]").first()
  const like = experience.getByRole("button", { name: /^Like/ })
  await expect(like).toHaveAttribute("aria-pressed", "true") // Alex already liked Maya's answer in the sample
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
  await row(page, FUNDING_Q).getByRole("button", { name: FUNDING_Q }).click()
  await expect(row(page, FUNDING_Q).locator("[data-kind=club]").getByRole("button", { name: /^Like/ })).toHaveAttribute("aria-pressed", "true")
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.find(a => a.id === "pa-2")!.votes.up).toContain("alex")
})

test("Ask AI opens Ask with the question ready to send", async ({ page }) => {
  await openPlaybook(page)
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  await r.getByRole("button", { name: "Ask AI" }).click()
  await openAsk(page)
  await expect(page.locator("#ask-input")).toHaveValue(FUNDING_Q)
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
  await expect(r.getByRole("button", { name: FUNDING_Q })).toHaveAttribute("aria-expanded", "true")
  await r.getByRole("button", { name: "2 more answers" }).click()
  await expect(r).toContainText("Ask the Business Office to confirm")
})

test("a new question appears in its category", async ({ page }) => {
  await openPlaybook(page)
  await page.getByTestId("pb-add-open").click()
  const form = page.getByTestId("pb-add")
  const text = "Where do we keep the club banner between events?"
  await form.getByLabel("Question").fill(text)
  await form.getByLabel("Category").selectOption({ label: "Tools & accounts" })
  await form.getByRole("group", { name: "Answer type" }).getByLabel("Club practice").check()
  await form.getByLabel("Answer", { exact: true }).fill("In the Secretary's locker in the Memorial Union, with the table cloth.")
  await form.getByRole("button", { name: "Save" }).click()
  await expect(page.getByRole("group", { name: "Category" }).getByRole("button", { name: "Tools & accounts" })).toHaveAttribute("aria-pressed", "true")
  const r = row(page, text)
  await expect(r).toBeVisible()
  await expect(r.getByRole("button", { name: text })).toBeFocused()
  await expect(r.locator("[data-kind=club]")).toContainText("In the Secretary's locker")
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions.find(q => q.text === text)).toMatchObject({ category: "tools", roleIds: ["r-pres"], createdBy: "alex" })
})

test("an incoming officer can read and vote but sees no add or edit", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, incomingId: "riley" } : h), people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", email: "riley.example@example.org", incomingFor: "r-fin" }] }))
  await viewAs(page, "riley")
  await closeRail(page)
  await expect(page.getByTestId("pb-role")).toHaveValue("r-fin")
  await expect(page.getByTestId("pb-add-open")).toHaveCount(0)
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  await expect(r.getByTestId("pb-answer")).toHaveCount(3)
  await expect(r.getByRole("button", { name: "Add an answer" })).toHaveCount(0)
  await expect(r.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0)
  await expect(r.getByRole("button", { name: "Hide", exact: true })).toHaveCount(0)
  const like = r.locator("[data-kind=club]").getByRole("button", { name: /^Like/ })
  await expect(like).toBeEnabled()
  await like.click()
  await expect(like).toHaveAttribute("aria-pressed", "true")
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.find(a => a.id === "pa-2")!.votes.up).toContain("riley")
  expect(saved.playbook!.reads?.riley).toContain("pq-1")
})

for (const scheme of ["light", "dark"] as const) test(`no accessibility violations with a row open (${scheme})`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: scheme })
  await openPlaybook(page)
  expect(await scan(page)).toEqual([])
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  await r.getByRole("button", { name: "1 more answer" }).click()
  await r.getByRole("button", { name: "Add an answer" }).click()
  expect(await scan(page)).toEqual([])
  await page.getByTestId("pb-add-open").click()
  await page.getByTestId("pb-add").getByLabel("Question").fill("How far ahead must a funding request be submitted?")
  await expect(page.getByTestId("pb-similar")).toBeVisible()
  expect(await scan(page)).toEqual([])
})

test("no horizontal overflow with rows open and the add form shown", async ({ page }) => {
  await openPlaybook(page)
  await page.getByTestId("pb-role").selectOption("all")
  for (const text of [FUNDING_Q, "Can members bring homemade food to an event?"]) await row(page, text).getByRole("button", { name: text }).click()
  await page.getByTestId("pb-add-open").click()
  await page.getByTestId("pb-add").getByLabel("Question").fill("How far ahead must a funding request be submitted?")
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

// ───────────── Review fixes (2026-11-25): focus, logging names, hidden items, roles, bounded lists and words ─────────────

const logOf = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]") as { type: string; payload: Record<string, unknown>; applied?: boolean }[])
const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "")
const focusedText = (page: Page) => page.evaluate(() => (document.activeElement?.textContent ?? "").trim())
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

test("Ask AI only fills Ask: no request to an AI endpoint and no ui.ask entry", async ({ page }) => {
  const calls: string[] = []
  page.on("request", r => { if (/\/api\/(ask|chat|policy-answer)\b/.test(r.url())) calls.push(r.url()) })
  await openPlaybook(page)
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  await r.getByRole("button", { name: "Ask AI" }).click()
  await openAsk(page)
  await expect(page.locator("#ask-input")).toHaveValue(FUNDING_Q)
  await page.waitForTimeout(500)
  expect(calls).toEqual([])
  expect((await logOf(page)).filter(e => e.type === "ui.ask")).toEqual([])
})

test("opening a row logs a fixed name, never the question text; the screen-reader name stays the question", async ({ page }) => {
  await openPlaybook(page)
  const head = row(page, FUNDING_Q).getByRole("button", { name: FUNDING_Q })
  await expect(head).toHaveAccessibleName(new RegExp(`^${FUNDING_Q.replace(/[?$]/g, "\\$&")}`))
  await head.click()
  await row(page, FUNDING_Q).getByRole("button", { name: "1 more answer" }).click()
  await expect.poll(async () => (await logOf(page)).filter(e => e.type === "ui.click").map(e => e.payload.name)).toContain("Playbook question")
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
  await page.getByTestId("pb-role").selectOption("all")
  await expect(row(page, "What did the last Treasurer want the next one to know?")).toBeVisible()
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions.map(q => q.id)).toEqual(["pq-start-r-fin", "pq-start-r-events", "pq-start-r-sec"])
  // An officer who is not the president or VP gets Add experience only.
  await rewrite(page, s => ({ ...s, playbook: undefined, viewerId: "maya" }))
  await closeRail(page)
  await expect(page.getByTestId("pb-empty").getByTestId("pb-add-open")).toBeVisible()
  await expect(page.getByRole("button", { name: "Start from your handoff notes" })).toHaveCount(0)
})

test("hide and unhide an answer, edit an answer, and where the focus goes after each action", async ({ page }) => {
  await openPlaybook(page)
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  // Hide the club answer: the focus moves to the next answer's first action (Like on the experience answer).
  await r.locator("[data-kind=club]").getByRole("button", { name: "Hide", exact: true }).click()
  await expect(r.locator("[data-kind=club]")).toHaveCount(0)
  await expect.poll(() => focusedAnswer(page)).toBe("pa-3")
  expect(await focusedText(page)).toMatch(/^Like/)
  // Unhide it from the quiet "1 hidden answer" list.
  await r.getByRole("button", { name: "1 hidden answer" }).click()
  await r.getByTestId("pb-hidden-answer").getByRole("button", { name: "Unhide" }).click()
  await expect(r.locator("[data-kind=club]")).toHaveCount(1)
  // Hide the last answer that has actions: there is no next one, so the row's own button gets the focus.
  await r.locator("[data-kind=experience]").getByRole("button", { name: "Hide", exact: true }).click()
  await expect.poll(() => focusedId(page)).toBe("pb-q-pq-1")
  // Save an answer: back to the row's button.
  await r.getByRole("button", { name: "Add an answer" }).click()
  await r.getByLabel("Answer", { exact: true }).fill("Keep a copy of the confirmation email.")
  await r.getByRole("button", { name: "Save answer" }).click()
  await expect.poll(() => focusedId(page)).toBe("pb-q-pq-1")
  // Edit an answer: the new text shows and persists, and the focus returns to the row's button.
  const club = r.locator("[data-kind=club]")
  await club.getByRole("button", { name: "Edit", exact: true }).click()
  await club.getByLabel("Edit answer").fill("We submit six weeks ahead so there is time to fix a returned request.")
  await club.getByRole("button", { name: "Save", exact: true }).click()
  await expect(club).toContainText("We submit six weeks ahead")
  await expect.poll(() => focusedId(page)).toBe("pb-q-pq-1")
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.find(a => a.id === "pa-2")!.text).toBe("We submit six weeks ahead so there is time to fix a returned request.")
})

test("hide a question: the focus moves to the next row (or the previous), and the president unhides it from Hidden questions", async ({ page }) => {
  await openPlaybook(page)
  const [first, second] = await rowIds(page)
  expect(first).toBe("pq-1")
  await page.locator(`#pb-q-${first}`).click()
  await page.locator(`[data-question-id="${first}"]`).getByRole("button", { name: "Hide question" }).click()
  await expect(page.locator(`[data-question-id="${first}"]`)).toHaveCount(0)
  await expect.poll(() => focusedId(page)).toBe(`pb-q-${second}`)
  // The last row: the focus goes to the previous one.
  const rest = await rowIds(page)
  await page.locator(`#pb-q-${rest.at(-1)}`).click()
  await page.locator(`[data-question-id="${rest.at(-1)}"]`).getByRole("button", { name: "Hide question" }).click()
  await expect.poll(() => focusedId(page)).toBe(`pb-q-${rest.at(-2)}`)
  await page.getByRole("button", { name: "Hidden questions (2)" }).click()
  const list = page.getByTestId("pb-hidden-questions")
  await expect(list).toContainText(FUNDING_Q)
  await list.locator("li").filter({ hasText: FUNDING_Q }).getByRole("button", { name: "Unhide" }).click()
  await expect(row(page, FUNDING_Q)).toBeVisible()
  await expect(page.getByRole("button", { name: "Hidden questions (1)" })).toBeVisible()
  const saved = await savedDemo(page)
  expect(saved.playbook!.questions.find(q => q.id === "pq-1")!.hidden).toBeUndefined()
  // Nobody else sees the hidden-questions control.
  await rewrite(page, s => ({ ...s, viewerId: "maya" }))
  await closeRail(page)
  await expect(page.getByRole("button", { name: /^Hidden questions/ })).toHaveCount(0)
})

test("when every question is hidden, the page shows the empty state and the president can still unhide them", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, playbook: { ...s.playbook!, questions: s.playbook!.questions.map(q => ({ ...q, hidden: true })) } }))
  await closeRail(page)
  await expect(page.getByTestId("pb-empty")).toContainText("No questions yet.")
  await page.getByRole("button", { name: "Hidden questions (12)" }).click()
  await page.getByTestId("pb-hidden-questions").locator("li").first().getByRole("button", { name: "Unhide" }).click()
  await expect(page.getByTestId("pb-question")).toHaveCount(1)
})

test("a former officer only reads: no like or dislike, no add, and opening a row writes nothing to the Playbook", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, viewerId: "maya", people: s.people.map(p => p.id === "maya" ? { ...p, leftOn: "2026-11-01" } : p) }))
  await closeRail(page)
  await expect(page.getByTestId("pb-add-open")).toHaveCount(0)
  await page.getByTestId("pb-role").selectOption("all")
  const r = row(page, FUNDING_Q)
  await r.getByRole("button", { name: FUNDING_Q }).click()
  await expect(r.getByTestId("pb-answer")).toHaveCount(3)
  await expect(r.getByRole("button", { name: /^(Like|Dislike)/ })).toHaveCount(0)
  await expect(r.getByRole("button", { name: "Add an answer" })).toHaveCount(0)
  await expect(r.getByRole("button", { name: "Ask AI" })).toBeVisible()
  expect((await logOf(page)).filter(e => e.type === "playbookAction")).toEqual([])
})

test("a vice president who is not the president leads the Playbook too", async ({ page }) => {
  await openPlaybook(page)
  await rewrite(page, s => ({ ...s, roles: s.roles.map(r => r.id === "r-events" ? { ...r, fn: "vice_president" } : r) }))
  await viewAs(page, "jordan")
  await closeRail(page)
  await expect(page.getByTestId("pb-role")).toHaveValue("r-events")
  const text = "When must the RITM number reach Student Unions?"
  const r = row(page, text)
  await r.getByRole("button", { name: text }).click()
  await expect(r.getByRole("button", { name: "Hide", exact: true })).toHaveCount(1)
  await r.getByRole("button", { name: "Add an answer" }).click()
  await r.getByRole("group", { name: "Answer type" }).getByLabel("Club practice").check()
  await r.getByLabel("Answer", { exact: true }).fill("The events lead sends the number the day it arrives.")
  await r.getByRole("button", { name: "Save answer" }).click()
  await expect(r.locator("[data-kind=club]")).toContainText("The events lead sends the number")
  await r.getByRole("button", { name: "Hide question" }).click()
  await page.getByRole("button", { name: "Hidden questions (1)" }).click()
  await expect(page.getByTestId("pb-hidden-questions")).toContainText(text)
  const saved = await savedDemo(page)
  expect(saved.playbook!.answers.find(a => a.text.startsWith("The events lead sends"))).toMatchObject({ kind: "club", authorId: "jordan" })
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
