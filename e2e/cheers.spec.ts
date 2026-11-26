import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
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
  // Option B (Juanxi, 2026-11-26): the note shows on the row, as in F1; the hover or tap card keeps the full note.
  await expect(rows.first().locator(".ch-fi-note")).toContainText(`“${NOTE_B}”`)
  await expect(rows.first().locator(".ch-dir")).toHaveText("Sent")
  await expect(rows.nth(1).locator(".ch-dir")).toHaveText("Received")
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

test("a third officer sees none of another pair's cheers in the inbox, the history or a card link", async ({ page }) => {
  const SAM_NOTE = "You made the flyer in one evening, thank you."
  await seed(page, {
    cheers: [...PAIR, { id: "ch-905", fromId: "priya", toIds: ["sam"], points: 10, note: SAM_NOTE, card: "thanks", on: "2026-10-30", seenBy: ["sam"] }],
    viewerId: "sam",
    notifications: [
      { id: "cheer:ch-901:maya", recipientId: "maya", nodeId: "", kind: "cheer", text: "Jordan sent you 50 points.", createdOn: "2026-10-29", read: false, cheerId: "ch-901" },
      { id: "cheer:ch-902:jordan", recipientId: "jordan", nodeId: "", kind: "cheer", text: "Maya sent you 25 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-902" },
      { id: "cheer:ch-905:sam", recipientId: "sam", nodeId: "", kind: "cheer", text: "Priya sent you 10 points.", createdOn: "2026-10-30", read: true, cheerId: "ch-905" },
    ],
  })
  await page.goto("/#/team")
  await closeRail(page)
  // Inbox: only Sam's own cheer notice.
  await page.getByTestId("bell").click()
  const inbox = page.getByTestId("private-inbox")
  await expect(inbox.getByTestId("inbox-cheer")).toHaveCount(1)
  await expect(inbox).toContainText("Priya sent you 10 points.")
  await expect(inbox).not.toContainText(/Jordan sent you|Maya sent you/)
  await page.keyboard.press("Escape")
  // History: Sam's cheer only, none of Maya and Jordan's.
  await page.goto("/#/team")
  await closeRail(page)
  await page.getByTestId("cheer-history").click()
  const dialog = page.getByRole("dialog", { name: "Cheers history" })
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(1)
  await expect(dialog).toContainText(SAM_NOTE)
  await expect(dialog).not.toContainText(NOTE_A)
  await expect(dialog).not.toContainText(NOTE_B)
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  // A card link to someone else's cheer opens nothing.
  for (const id of ["ch-901", "ch-902"]) {
    await page.goto(`/#/?cheer=${id}`)
    await expect(page.locator("main h1")).toBeVisible()
    await expect(page).not.toHaveURL(/cheer=/)
    await expect(page.getByTestId("cheer-card")).toHaveCount(0)
    await expect(page.locator("body")).not.toContainText(NOTE_A)
    await expect(page.locator("body")).not.toContainText(NOTE_B)
  }
})

test("a Team cheer row's hover card stays open when the pointer moves into it (the Hover card rule)", async ({ page }, info) => {
  await seed(page, { cheers: PAIR, viewerId: "maya" })
  await page.goto("/#/team")
  await closeRail(page)
  const row = page.getByTestId("your-cheers").getByTestId("cheer-row").first()
  const trigger = row.getByTestId("cheer-row-who")
  const card = row.getByRole("tooltip")
  if (info.project.name === "mobile") {
    // A phone cannot hover: a tap opens the same card, which stays until a tap elsewhere.
    await trigger.tap()
    await expect(card).toBeVisible()
    await expect(card).toHaveText(`“${NOTE_B}”`)
    return
  }
  await trigger.hover()
  await expect(card).toBeVisible()
  const from = (await trigger.boundingBox())!
  const to = (await card.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + 2)
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })   // up across the gap, into the card
  const under = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest(".hover-card"), [to.x + to.width / 2, to.y + to.height / 2])
  expect(under, "the card itself is under the pointer").toBe(true)
  expect(await row.locator(".hover").evaluate(el => el.matches(":hover"))).toBe(true)
  await expect(card).toBeVisible()
  await expect(card).toHaveText(`“${NOTE_B}”`)
})

test("the history shows a 280-character note in full", async ({ page }) => {
  const words = "Booked the room early, sent the caterer quote, and checked every line of the budget with me before the deadline"
  const LONG = `${words}. ${words}. ${words}.`.slice(0, 279) + "."
  expect(LONG).toHaveLength(280)
  await seed(page, { cheers: [{ ...PAIR[0], note: LONG }], viewerId: "maya" })
  await page.goto("/#/team")
  await closeRail(page)
  await page.getByTestId("cheer-history").click()
  const dialog = page.getByRole("dialog", { name: "Cheers history" })
  const note = dialog.getByTestId("cheer-row").first().locator(".ch-fi-note")
  await expect(note).toContainText(LONG)
  const box = await note.evaluate(el => ({ scroll: el.scrollHeight, client: el.clientHeight, lines: Math.round(el.clientHeight / parseFloat(getComputedStyle(el).lineHeight || "20")) }))
  expect(box.scroll - box.client, "nothing of the note is cut off").toBeLessThanOrEqual(1)
  expect(box.lines, "a long note takes more than two lines").toBeGreaterThan(2)
})

test("the research log never names who was cheered or the task: Team row, send flow, drafts and inbox", async ({ page, context }, info) => {
  const phone = info.project.name === "mobile"
  const press = (l: ReturnType<Page["locator"]>) => phone ? l.tap() : l.click()
  await seed(page, { cheers: PAIR, viewerId: "maya", notifications: [{ id: "cheer:ch-901:maya", recipientId: "maya", nodeId: "", kind: "cheer", text: "Jordan sent you 50 points.", createdOn: "2026-10-29", read: false, cheerId: "ch-901" }] })
  await context.route("https://mail.google.com/**", route => route.fulfill({ contentType: "text/plain", body: "Fictional draft" }))
  const s = await saved(page)
  const task = s.nodes.find((n: { id: string }) => n.id === "e-night:venue")
  const event = s.events.find((e: { id: string }) => e.id === "e-night")
  const startSeq = await page.evaluate(() => Math.max(0, ...JSON.parse(localStorage.getItem("platypus.v1.log") ?? "[]").map((e: { seq: number }) => e.seq)))
  // 1. The Team row's hover card, read for most of a second.
  await page.goto("/#/team")
  await closeRail(page)
  const trigger = page.getByTestId("your-cheers").getByTestId("cheer-row-who").first()
  if (phone) { await trigger.tap(); await page.waitForTimeout(700); await page.locator("main h1").tap() }
  else { await trigger.hover(); await page.waitForTimeout(700); await page.mouse.move(2, 400) }
  // 2. Give points to two people for a task, with one added and removed on the way, and Also email.
  await press(page.getByTestId("cheer-give"))
  const form = page.getByTestId("give-cheer")
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await press(form.getByRole("button", { name: "+ Add someone" }))
  await form.getByLabel("Add a teammate").selectOption("priya")
  await form.getByLabel("Add a teammate").selectOption("sam")
  await press(form.getByRole("button", { name: "Remove Sam Okafor" }))
  await form.getByTestId("cheer-task").selectOption(task.id)
  await form.getByLabel(/Why they did well/).fill(NOTE_B)
  await form.getByTestId("cheer-email").check()
  const popup = context.waitForEvent("page")
  await press(form.getByTestId("cheer-send"))
  await (await popup).close()
  const sent = page.getByTestId("cheer-sent")
  const second = context.waitForEvent("page")
  await press(sent.getByTestId("cheer-draft").nth(1))
  await (await second).close()
  await press(sent.getByRole("button", { name: "Done" }))
  // 3. The inbox's cheer notice opens its card.
  await closeRail(page)
  await press(page.getByTestId("bell"))
  await press(page.getByTestId("inbox-cheer"))
  await expect(page.getByTestId("cheer-card")).toBeVisible()
  await press(page.getByTestId("cheer-card").getByRole("button", { name: "Close" }))
  await expect(page.getByTestId("cheer-card")).toHaveCount(0)
  // 4. Export, as a participant would.
  await page.goto("/#/settings")
  await closeRail(page)
  await press(page.getByRole("button", { name: "My preferences" }))
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-data").click()])
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"))
  const ui = (file.interactionLog.entries as { seq: number; type: string; payload: Record<string, unknown> }[]).filter(e => e.seq > startSeq && e.type.startsWith("ui."))
  // The flow above was recorded, by fixed names where a name would say who or what.
  expect(ui.filter(e => e.type === "ui.change").map(e => e.payload.name)).toEqual(expect.arrayContaining(["To", "Add a teammate", "For a task (optional)", "Also email"]))
  expect(ui.some(e => e.type === "ui.hover" && e.payload.name === "cheer-row")).toBe(true)
  expect(ui.some(e => e.type === "ui.click" && e.payload.name === "inbox-cheer")).toBe(true)
  expect(ui.some(e => e.type === "ui.click" && e.payload.name === "cheer-remove")).toBe(true)
  expect(ui.some(e => e.type === "ui.click" && e.payload.name === "cheer-draft")).toBe(true)
  const text = JSON.stringify(ui)
  for (const p of s.people as { name: string }[]) for (const part of p.name.split(" ")) expect(text, `${p.name} is in the log`).not.toContain(part)
  expect(text).not.toContain(task.title)
  expect(text).not.toContain(event.name)
  expect(text).not.toContain("so the caterer")
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
  expect(draft.searchParams.get("to")).toBe("jordan.patel@example.org")
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
  await seed(page, { cheers: PAIR, viewerId: "maya", notifications: [{ id: "cheer:ch-902:jordan", recipientId: "jordan", nodeId: "", kind: "cheer", text: "Maya sent you 25 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-902" }] })
  await page.goto("/#/team")
  await expect(page.getByTestId("cheer-left")).toContainText("175 / 200")
  await page.getByTestId("cheer-history").click()
  const dialog = page.getByRole("dialog", { name: "Cheers history" })
  // Only Maya's own cheer from today offers Withdraw; Jordan's to her does not.
  await expect(dialog.getByTestId("cheer-withdraw")).toHaveCount(1)
  await dialog.getByTestId("cheer-withdraw").click()
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(1)
  await expect(dialog).not.toContainText(NOTE_B)
  // The points come back to this week's allowance.
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId("cheer-left")).toContainText("200 / 200")
  // Jordan's inbox no longer shows it, and no card opens for him.
  await viewAs(page, "jordan")
  await closeRail(page)
  await page.getByTestId("bell").click()
  await expect(page.getByTestId("private-inbox")).toBeVisible()
  await expect(page.getByTestId("inbox-cheer")).toHaveCount(0)
  await expect(page.getByTestId("private-inbox")).not.toContainText("Maya sent you 25 points.")
  await expect(page.getByTestId("cheer-card")).toHaveCount(0)
})

test("the Give points form starts again when the viewer changes (View as)", async ({ page }) => {
  await seed(page, { cheers: [] })
  const form = await openGive(page)
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByRole("button", { name: "100", exact: true }).click()
  await form.getByLabel(/Why they did well/).fill(NOTE_B)
  await form.getByTestId("cheer-email").check()
  await viewAs(page, "maya")
  const again = page.getByTestId("give-cheer")
  await expect(again).toBeVisible()
  await expect(again.getByLabel(/Why they did well/)).toHaveValue("")
  await expect(again.getByLabel("To", { exact: true })).toHaveValue("")
  await expect(again.getByRole("button", { name: "25", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(again.getByTestId("cheer-email")).not.toBeChecked()
  await expect(again.getByTestId("cheer-form-left")).toHaveText("200 left this week")
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
  // Priya's task was finished late, with details: it does not count (on time and with details, screen F7).
  const late = { ...done("priya", "e-night:registry"), facts: { detailsChars: 40, files: 1, onTime: false } }
  await seed(page, { cheers: [], viewerId: "alex", today: "2026-11-02", activity: [done("maya", "e-night:budget"), done("jordan", "e-night:venue"), late] })
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
