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
