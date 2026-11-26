import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, viewAs } from "./helpers"

// Cheers R1 interface (docs/feedback-fix/CHEERS_R1_CONTRACT.md §5; screens docs/prototypes/cheers-r1-final/), desktop and phone.
// Every cheer and note here is fictional. Tests that need the cheers model (sending, allowance, marking seen, withdraw,
// weekly line, thank prompt, email text) say so in their title with "[model]".
const KEY = "platypus.v1.demo"
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations
  .filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

interface TestCheer { id: string; fromId: string; toIds: string[]; points: 10 | 25 | 50 | 100; note: string; card: "thanks" | "star" | "teamwork"; on: string; seenBy: string[]; nodeId?: string }
const NOTE_A = "The quote and flyer were attached, so I approved it in one go."
const NOTE_B = "Room booked two weeks early, so the caterer could confirm."
/** Maya and Jordan's cheers, all already seen, in the demo week (Mon Oct 26 – Sun Nov 1, today Sat Oct 31). */
const PAIR: TestCheer[] = [
  { id: "ch-901", fromId: "jordan", toIds: ["maya"], points: 50, note: NOTE_A, card: "star", on: "2026-10-29", seenBy: ["maya"] },
  { id: "ch-902", fromId: "maya", toIds: ["jordan"], points: 25, note: NOTE_B, card: "thanks", on: "2026-10-31", seenBy: ["jordan"] },
]

/** Replace the demo's cheers (and optionally other fields) in saved data, then reload. Runs once per test. */
async function seed(page: Page, patch: { cheers?: TestCheer[]; viewerId?: string; today?: string; notifications?: object[]; activity?: object[] }) {
  await page.goto("/#/team")
  await expect(page.locator("main h1")).toBeVisible()
  await page.evaluate(({ key, patch }) => {
    const s = JSON.parse(localStorage.getItem(key)!)
    if (patch.cheers) s.cheers = { cheers: patch.cheers }
    if (patch.viewerId) s.viewerId = patch.viewerId
    if (patch.today) s.today = patch.today
    if (patch.notifications) s.notifications = [...s.notifications, ...patch.notifications]
    if (patch.activity) { const max = Math.max(0, ...(s.activity ?? []).map((e: { seq: number }) => e.seq)); s.activity = [...(s.activity ?? []), ...patch.activity.map((e, i) => ({ ...e, seq: max + i + 1, id: `act:${max + i + 1}` }))] }
    localStorage.setItem(key, JSON.stringify(s))
  }, { key: KEY, patch })
  await page.reload()
}
const saved = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY)
const savedCheers = async (page: Page): Promise<TestCheer[]> => (await saved(page)).cheers?.cheers ?? []

/** Team → Give points; on a phone the form opens in the full-screen side panel. */
async function openGive(page: Page) {
  await page.goto("/#/team")
  await page.getByTestId("cheer-give").click()
  const form = page.getByTestId("give-cheer")
  await expect(form).toBeVisible()
  return form
}

test("Team shows the viewer's own cheers in place of Contributions, and nobody else's", async ({ page }) => {
  await seed(page, { cheers: PAIR, viewerId: "maya" })
  await page.goto("/#/team")
  await expect(page.getByTestId("contribution-board")).toHaveCount(0)
  const card = page.getByTestId("your-cheers")
  await expect(card.getByRole("heading", { name: "Your cheers" })).toBeVisible()
  await expect(card).toContainText("Only you see this")
  const rows = card.getByTestId("cheer-row")
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText("To Jordan")
  await expect(rows.first()).toContainText("Today")
  await expect(rows.nth(1)).toContainText("Thu")
  // The note is one hover, focus or tap away (Team's word budget); the history shows it in full.
  await rows.first().getByTestId("cheer-row-who").click()
  await expect(rows.first().getByRole("tooltip")).toBeVisible()
  await expect(rows.first().getByRole("tooltip")).toHaveText(`“${NOTE_B}”`)
  await expect(rows.first()).toContainText("−25")
  await expect(rows.nth(1)).toContainText("From Jordan")
  await expect(rows.nth(1)).toContainText("+50")
  await expect(card.getByRole("button", { name: "View history" })).toBeVisible()
  await expect(card.getByRole("button", { name: "Give points" })).toBeVisible()
  // A third officer sees none of Maya and Jordan's cheers: an empty card, and no note anywhere on the page.
  await viewAs(page, "sam")
  await closeRail(page)
  await expect(card.getByTestId("cheer-row")).toHaveCount(0)
  await expect(card).toContainText("No cheers yet.")
  await expect(page.locator("main")).not.toContainText(NOTE_A)
  await expect(page.locator("main")).not.toContainText(NOTE_B)
})

test("the history dialog filters and groups by week, traps focus, and Escape returns focus", async ({ page }) => {
  await seed(page, { cheers: [...PAIR, { id: "ch-903", fromId: "priya", toIds: ["maya"], points: 10, note: "You explained the budget lines at the meeting.", card: "teamwork", on: "2026-10-14", seenBy: ["maya"] }], viewerId: "maya" })
  await page.goto("/#/team")
  const open = page.getByTestId("cheer-history")
  await open.click()
  const dialog = page.getByRole("dialog", { name: "Cheers history" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("heading", { name: "This week" })).toBeVisible()
  await expect(dialog.getByRole("heading", { name: "Last week" })).toHaveCount(0)
  await expect(dialog.getByRole("heading", { name: "Earlier" })).toBeVisible()
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(3)
  await expect(dialog).toContainText("Only you and the other person in each cheer can see it.")
  await dialog.getByRole("button", { name: "Sent", exact: true }).click()
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(1)
  await dialog.getByRole("button", { name: "Received", exact: true }).click()
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(2)
  // Tab never leaves the dialog.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true)
  }
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()
  expect(await scan(page)).toEqual([])
})

test("Send stays off until the note is long enough; a quick start adds its phrase to the note", async ({ page }) => {
  await seed(page, { cheers: [] })
  const form = await openGive(page)
  await expect(form.getByRole("heading", { name: "Give points" })).toBeVisible()
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  const send = form.getByTestId("cheer-send")
  await expect(send).toBeDisabled()
  const note = form.getByLabel(/Why they did well/)
  await expect(note).toHaveAttribute("data-log-name", "cheer-note")
  await note.fill("Thanks")
  await expect(send).toBeDisabled()
  await expect(form.getByTestId("cheer-problem")).toHaveText("Write at least 10 characters.")
  await form.getByRole("button", { name: "Delivered on time" }).click()
  await expect(note).toHaveValue(/Delivered on time/)
  await expect(note).toBeFocused()
  await note.fill("Thanks for booking the room so early.")
  await expect(send).toBeEnabled()
  await expect(form.getByTestId("cheer-problem")).toHaveText("")
  await expect(form).toContainText("37 / 280")
  expect(await scan(page)).toEqual([])
})

test("[model] a cheer from a finished task takes at most three presses with a typed note", async ({ page }) => {
  await seed(page, { cheers: [] })
  const s = await saved(page)
  const done = s.nodes.find((n: { status: string; ownerId: string | null }) => n.status === "done" && n.ownerId && n.ownerId !== s.viewerId)
  expect(done, "the demo has a finished task owned by someone other than the president").toBeTruthy()
  await page.goto(`/#/tasks?node=${encodeURIComponent(done.id)}`)
  const prompt = page.getByTestId("thank-prompt")
  await expect(prompt).toContainText("finished this.")
  await prompt.getByRole("button", { name: "Give points" }).click()                 // press 1: open, owner and task chosen
  const form = page.getByTestId("give-cheer")
  await expect(form.getByTestId("cheer-task")).toHaveValue(done.id)
  await form.getByLabel(/Why they did well/).fill("Every file was attached, so I could approve it at once.")
  await form.getByTestId("cheer-send").click()                                      // press 2: send
  await expect(page.getByRole("status").filter({ hasText: "Cheer sent." })).toBeVisible()
  await expect.poll(async () => (await savedCheers(page)).length).toBe(1)
  const [cheer] = await savedCheers(page)
  expect(cheer).toMatchObject({ fromId: s.viewerId, toIds: [done.ownerId], points: 25, nodeId: done.id, card: "star" })
  // The research log (typing included) never holds the note.
  const log = await page.evaluate(() => localStorage.getItem("platypus.v1.log") ?? "")
  expect(log).toContain("cheer")
  expect(log).not.toContain("so I could approve it at once")
})

test("[model] Also email opens a draft whose link opens the card", async ({ page, context }) => {
  await seed(page, { cheers: [] })
  const form = await openGive(page)
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByLabel(/Why they did well/).fill(NOTE_B)
  await form.getByTestId("cheer-email").check()
  // The draft never reaches Google: the test answers the compose address itself.
  await context.route("https://mail.google.com/**", route => route.fulfill({ contentType: "text/plain", body: "Fictional draft" }))
  const popup = context.waitForEvent("page")
  await form.getByTestId("cheer-send").click()
  const tab = await popup
  await tab.waitForLoadState()
  const draft = new URL(tab.url())
  expect(draft.host).toBe("mail.google.com")
  expect(draft.searchParams.get("su")).toBe("⭐ Alex sent you 25 points")
  const body = draft.searchParams.get("body")!
  expect(body).toContain("Hi Jordan,")
  expect(body).toContain(`Why: “${NOTE_B}”`)
  const [cheer] = await savedCheers(page)
  expect(body).toContain(`#/?cheer=${cheer.id}`)
  expect(body).not.toMatch(/points this term/)
})

test("received cards show once: 1 of N, Next, Close, at most three, and closing marks them seen [model for seen]", async ({ page }) => {
  const unseen = (id: string, from: string, on: string): TestCheer => ({ id, fromId: from, toIds: ["jordan"], points: 25, note: `${NOTE_B} (${id})`, card: "star", on, seenBy: [] })
  await seed(page, { cheers: [unseen("ch-911", "maya", "2026-10-27"), unseen("ch-912", "alex", "2026-10-28"), unseen("ch-913", "sam", "2026-10-29"), unseen("ch-914", "priya", "2026-10-30")], viewerId: "jordan" })
  const dialog = page.getByTestId("cheer-card")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole("heading", { name: "Thank you, Jordan!" })).toBeVisible()
  await expect(dialog).toContainText("(ch-911)")                       // oldest first
  await expect(dialog.getByTestId("cheer-card-count")).toHaveText("1 of 3 new cheers")
  await expect(dialog.getByTestId("cheer-card-next")).toBeFocused()
  await dialog.getByTestId("cheer-card-next").click()
  await expect(dialog.getByTestId("cheer-card-count")).toHaveText("2 of 3 new cheers")
  await dialog.getByTestId("cheer-card-next").click()
  await expect(dialog.getByTestId("cheer-card-count")).toHaveText("3 of 3 new cheers")
  await expect(dialog.getByRole("link", { name: "1 more on Team" })).toBeVisible()
  expect(await scan(page)).toEqual([])
  await dialog.getByTestId("cheer-card-close").click()
  await expect(dialog).toHaveCount(0)
  // Not again in this session, even on another page.
  await page.goto("/#/team")
  await expect(page.getByTestId("your-cheers")).toBeVisible()
  await expect(dialog).toHaveCount(0)
  // [model] The three shown are seen; the fourth comes back on the next load, alone.
  await expect.poll(async () => (await savedCheers(page)).filter(c => c.seenBy.includes("jordan")).map(c => c.id)).toEqual(["ch-911", "ch-912", "ch-913"])
  await page.reload()
  await expect(dialog).toContainText("(ch-914)")
  await expect(dialog.getByTestId("cheer-card-count")).toHaveText(/points this term/)
})

test("a card link opens for its sender and recipient only, and a cheer notice opens its card", async ({ page }) => {
  await seed(page, { cheers: PAIR, viewerId: "jordan", notifications: [{ id: "nt-cheer-1", recipientId: "jordan", nodeId: "", kind: "cheer", text: "Maya sent you 25 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-902" }] })
  const dialog = page.getByTestId("cheer-card")
  await closeRail(page)
  await page.getByTestId("bell").click()
  await page.getByTestId("inbox-cheer").click()
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(NOTE_B)
  await expect(dialog).toContainText("From Maya Chen")
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(page).not.toHaveURL(/cheer=/)
  // The sender can open it too.
  await viewAs(page, "maya")
  await page.goto("/#/?cheer=ch-902")
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "Close" }).click()
  await expect(dialog).toHaveCount(0)
  // Anyone else sees nothing.
  await viewAs(page, "sam")
  await page.goto("/#/?cheer=ch-902")
  await expect(page.locator("main h1")).toBeVisible()
  await expect(page).not.toHaveURL(/cheer=/)
  await expect(dialog).toHaveCount(0)
})

test("[model] the sender can withdraw a cheer on the day it was sent", async ({ page }) => {
  await seed(page, { cheers: PAIR, viewerId: "maya" })
  await page.goto("/#/team")
  await page.getByTestId("cheer-history").click()
  const dialog = page.getByRole("dialog", { name: "Cheers history" })
  // Only Maya's own cheer from today offers Withdraw; Jordan's to her does not.
  await expect(dialog.getByTestId("cheer-withdraw")).toHaveCount(1)
  await dialog.getByTestId("cheer-withdraw").click()
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(1)
  await expect(dialog).not.toContainText(NOTE_B)
})

test("[model] the allowance shows on the card and in the form, and drops after a send", async ({ page }) => {
  await seed(page, { cheers: PAIR, viewerId: "maya" })
  await page.goto("/#/team")
  await expect(page.getByTestId("cheer-received")).toContainText("50")
  await expect(page.getByTestId("cheer-left")).toContainText("175 / 200")
  await page.getByTestId("cheer-give").click()
  const form = page.getByTestId("give-cheer")
  await expect(form.getByTestId("cheer-form-left")).toHaveText("175 left this week")
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByRole("button", { name: "+ Add someone" }).click()
  await form.getByLabel("Add a teammate").selectOption("priya")
  await expect(form.getByTestId("cheer-recipients").getByRole("listitem")).toHaveCount(3)
  await form.getByRole("button", { name: "100", exact: true }).click()
  await form.getByLabel(/Why they did well/).fill("Both of you finished the room plan early.")
  await expect(form.getByTestId("cheer-problem")).toHaveText("Only 175 points left this week.")
  await expect(form.getByTestId("cheer-send")).toBeDisabled()
  await form.getByRole("button", { name: "50", exact: true }).click()
  await expect(form.getByTestId("cheer-send")).toHaveText("Send 2 cheers")
  await form.getByTestId("cheer-send").click()
  await expect(page.getByRole("status").filter({ hasText: "Cheer sent." })).toBeVisible()
  await closeRail(page)
  await expect(page.getByTestId("cheer-left")).toContainText("75 / 200")
})

test("[model] the president's weekly line opens Give points with those people, and closing puts it away for the week", async ({ page }) => {
  const done = (personId: string, nodeId: string) => ({ on: "2026-11-02", actorId: personId, kind: "task.done", personIds: [personId], nodeId, facts: { detailsChars: 40, files: 1 }, source: "live" })
  await seed(page, { cheers: [], viewerId: "alex", today: "2026-11-02", activity: [done("maya", "e-night:budget"), done("jordan", "e-night:venue")] })
  await page.goto("/#/")
  const line = page.getByTestId("cheer-weekly")
  await expect(line).toContainText("This week: Jordan and Maya delivered on time with details.")
  await line.getByRole("button", { name: "Thank them" }).click()
  const form = page.getByTestId("give-cheer")
  await expect(form.getByTestId("cheer-recipients").getByRole("listitem").filter({ hasText: /Jordan|Maya/ })).toHaveCount(2)
  await expect(line).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  await expect(line).toHaveCount(0)
})

test("the received card and the Team card stay readable in dark mode", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await seed(page, { cheers: [{ ...PAIR[1], seenBy: [] }], viewerId: "jordan" })
  const dialog = page.getByTestId("cheer-card")
  await expect(dialog).toBeVisible()
  expect(await scan(page)).toEqual([])
  await page.keyboard.press("Escape")
  await page.goto("/#/team")
  await expect(page.getByTestId("your-cheers").getByTestId("cheer-row")).toHaveCount(1)
  await closeRail(page)
  expect(await scan(page)).toEqual([])
})
