import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
import { closeRail, viewAs } from "./helpers"

// Cheers R1 interface (docs/feedback-fix/CHEERS_R1_CONTRACT.md §5; screens docs/prototypes/cheers-r1-final/), desktop and phone,
// with the R1.1 amendments (§8: points stepper, trophy, confirmation, no withdraw, automatic email, let others know).
// Every cheer and note here is fictional. Tests that need the cheers model (sending, allowance, marking seen, let others know,
// weekly line, thank prompt, email text) say so in their title with "[model]". The PAIR cheers keep R1 point values on purpose:
// older saves stay valid and count as stored.
const KEY = "platypus.v1.demo"
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations
  .filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)

interface TestCheer { id: string; fromId: string; toIds: string[]; points: number; note: string; card: string; on: string; seenBy: string[]; nodeId?: string; ccIds?: string[]; email?: boolean; withdrawnOn?: string }
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

test("the research log never names who was cheered, who was let know, or the task: Team row, send flow, Email link and inbox", async ({ page }, info) => {
  const phone = info.project.name === "mobile"
  const press = (l: ReturnType<Page["locator"]>) => phone ? l.tap() : l.click()
  await seed(page, { cheers: [PAIR[0], { ...PAIR[1], email: true, nodeId: "e-night:venue" }], viewerId: "maya", notifications: [{ id: "cheer:ch-901:maya", recipientId: "maya", nodeId: "", kind: "cheer", text: "Jordan sent you 50 points.", createdOn: "2026-10-29", read: false, cheerId: "ch-901" }] })
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
  // 2. Give points to two people, with one added and removed on the way; let two others know and take one back; more
  //    points and a trophy; confirm.
  await press(page.getByTestId("cheer-give"))
  const form = page.getByTestId("give-cheer")
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await press(form.getByRole("button", { name: "+ Add someone" }))
  await form.getByLabel("Add a teammate").selectOption("priya")
  await form.getByLabel("Add a teammate").selectOption("sam")
  await press(form.getByRole("button", { name: "Remove Sam Okafor" }))
  await form.getByLabel("Let others know too (optional)").selectOption("alex")
  await form.getByLabel("Let others know too (optional)").selectOption("sam")
  await press(form.getByRole("button", { name: "Do not tell Sam Okafor" }))
  await press(form.getByRole("button", { name: "More points" }))
  await press(form.getByRole("button", { name: "Party" }))
  await form.getByLabel(/What did they do/).fill(NOTE_B)
  await press(form.getByTestId("cheer-send"))
  await press(page.getByTestId("cheer-confirm").getByRole("button", { name: "Send" }))
  await expect(page.getByRole("status").filter({ hasText: "Cheer sent." })).toBeVisible()
  // The history's Email link shows the email text (Maya's cheer to Jordan for the room).
  await closeRail(page)
  await press(page.getByTestId("cheer-history"))
  const history = page.getByRole("dialog", { name: "Cheers history" })
  await press(history.locator('[data-cheer="ch-902"]').getByRole("button", { name: "Email" }))
  await expect(history.getByTestId("cheer-email-text")).toContainText("Hi Jordan,")
  await press(history.getByRole("button", { name: "Close history" }))
  await expect(history).toHaveCount(0)
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
  expect(ui.filter(e => e.type === "ui.change").map(e => e.payload.name)).toEqual(expect.arrayContaining(["To", "Add a teammate", "cheer-cc-add"]))
  for (const e of ui.filter(x => x.type === "ui.change" && ["To", "Add a teammate", "cheer-cc-add"].includes(String(x.payload.name)))) expect(e.payload).not.toHaveProperty("value")
  expect(ui.some(e => e.type === "ui.hover" && e.payload.name === "cheer-row")).toBe(true)
  for (const name of ["inbox-cheer", "cheer-remove", "cheer-cc-remove", "cheer-email", "More points", "Party"]) expect(ui.some(e => e.type === "ui.click" && e.payload.name === name), name).toBe(true)
  // The data action names nobody either: counts only, the people let know included.
  const sends = (file.interactionLog.entries as { type: string; payload: Record<string, unknown> }[]).filter(e => e.type === "cheerAction" && e.payload?.kind === "send")
  expect(sends.at(-1)?.payload).toMatchObject({ recipients: 2, points: 150, card: "party", email: true, cc: 1 })
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
  // R1.1 (§8.9): a cheer can also be shared with people the sender let know, so the line no longer says "the other person".
  await expect(dialog).toContainText("Only the people in each cheer can see it.")
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

test("Send stays off until the note is long enough; the form has no task field, quick starts or Also email (R1.1)", async ({ page }) => {
  await seed(page, { cheers: [] })
  const form = await openGive(page)
  await expect(form.getByRole("heading", { name: "Give points" })).toBeVisible()
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  const send = form.getByTestId("cheer-send")
  await expect(send).toBeDisabled()
  const note = form.getByLabel(/What did they do, and how did it help\?/)
  await expect(note).toHaveAttribute("data-log-name", "cheer-note")
  await expect(note).toHaveAttribute("aria-required", "true")
  await expect(form.locator(".ch-req")).toHaveText("*")
  await note.fill("Thanks")
  await expect(send).toBeDisabled()
  await expect(form.getByTestId("cheer-problem")).toHaveText("Write at least 10 characters.")
  await note.fill("Thanks for booking the room so early.")
  await expect(send).toBeEnabled()
  await expect(form.getByTestId("cheer-problem")).toHaveText("")
  await expect(form).toContainText("37 / 280")
  for (const gone of ["For a task (optional)", "Delivered on time", "Also email", "Card"]) await expect(form.getByText(gone, { exact: true })).toHaveCount(0)
  await expect(form.getByRole("group", { name: "Trophy" }).getByRole("button")).toHaveCount(8)
  await expect(form.getByRole("group", { name: "Trophy" }).getByRole("button", { name: "Trophy" })).toHaveAttribute("aria-pressed", "true")
  await expect(form.getByLabel("Let others know too (optional)")).toBeVisible()
  expect(await scan(page)).toEqual([])
})

test("points: − and + step by 50 from 100 to what is left, the keyboard works, and a typed value is checked", async ({ page }, info) => {
  // Maya has 1,000 a week and already gave 700 this week: 300 are left.
  await seed(page, { cheers: [{ ...PAIR[1], points: 700 }], viewerId: "maya" })
  const form = await openGive(page)
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByLabel(/What did they do/).fill(NOTE_B)
  const points = form.getByLabel("Points", { exact: true })
  const down = form.getByRole("button", { name: "Fewer points" }), up = form.getByRole("button", { name: "More points" })
  await expect(points).toHaveValue("100")
  await expect(points).toHaveAttribute("min", "100")
  await expect(points).toHaveAttribute("step", "50")
  await expect(points).toHaveAttribute("max", "300")
  await expect(down).toBeDisabled()
  await (info.project.name === "mobile" ? up.tap() : up.click())
  await expect(points).toHaveValue("150")
  // Keyboard: the + button with Enter and Space, the field with the arrow keys.
  await up.focus()
  await page.keyboard.press("Enter")
  await expect(points).toHaveValue("200")
  await page.keyboard.press("Space")
  await expect(points).toHaveValue("250")
  await points.focus()
  await page.keyboard.press("ArrowUp")
  await expect(points).toHaveValue("300")
  await expect(up).toBeDisabled()
  await page.keyboard.press("ArrowDown")
  await expect(points).toHaveValue("250")
  // Any whole number from 100 can be typed, up to what is left.
  await points.fill("130")
  await expect(form.getByTestId("cheer-problem")).toHaveText("")
  await expect(form.getByTestId("cheer-send")).toBeEnabled()
  for (const [typed, problem] of [["99", "Give at least 100 points."], ["301", "Only 300 points left this week."]]) {
    await points.fill(typed)
    await expect(form.getByTestId("cheer-problem")).toHaveText(problem)
    await expect(form.getByTestId("cheer-send")).toBeDisabled()
  }
  await points.fill("130")
  await form.getByTestId("cheer-send").click()
  await page.getByTestId("cheer-confirm").getByRole("button", { name: "Send" }).click()
  await expect.poll(async () => (await savedCheers(page)).find(c => c.fromId === "maya" && c.id !== "ch-902")?.points).toBe(130)
})

test("Send asks for confirmation: focus stays in the dialog, Cancel and Escape return to Send, Send in the dialog sends", async ({ page }) => {
  await seed(page, { cheers: [] })
  const form = await openGive(page)
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByLabel("Points", { exact: true }).fill("300")
  await form.getByLabel(/What did they do/).fill(NOTE_B)
  const send = form.getByTestId("cheer-send")
  await send.click()
  const dialog = page.getByRole("dialog", { name: "Send 300 points to Jordan Patel?" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText("You can't undo this.")
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused()
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab")
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true)
  }
  expect(await scan(page)).toEqual([])
  await dialog.getByRole("button", { name: "Cancel" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(send).toBeFocused()
  await send.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  await expect(send).toBeFocused()
  // The rail is still open on the form: Escape closed only the dialog.
  await expect(form).toBeVisible()
  expect(await savedCheers(page)).toEqual([])
  await send.click()
  await dialog.getByRole("button", { name: "Send" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Cheer sent. Jordan will get an email." })).toBeVisible()
  await expect.poll(async () => (await savedCheers(page)).length).toBe(1)
  expect((await savedCheers(page))[0]).toMatchObject({ toIds: ["jordan"], points: 300, email: true })
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
  // R1.1 (§8.1): no task field; the task comes along silently.
  await expect(form.getByTestId("cheer-task")).toHaveCount(0)
  await form.getByLabel(/What did they do/).fill("Every file was attached, so I could approve it at once.")
  await form.getByTestId("cheer-send").click()                                      // press 2: send
  await page.getByTestId("cheer-confirm").getByRole("button", { name: "Send" }).click() // press 3: confirm (R1.1, §8.6)
  const owner = s.people.find((p: { id: string }) => p.id === done.ownerId).name.split(" ")[0]
  await expect(page.getByRole("status").filter({ hasText: `Cheer sent. ${owner} will get an email.` })).toBeVisible()
  await expect.poll(async () => (await savedCheers(page)).length).toBe(1)
  const [cheer] = await savedCheers(page)
  expect(cheer).toMatchObject({ fromId: s.viewerId, toIds: [done.ownerId], points: 100, nodeId: done.id, card: "trophy", email: true })
  // The research log (typing included) never holds the note.
  const log = await page.evaluate(() => localStorage.getItem("platypus.v1.log") ?? "")
  expect(log).toContain("cheer")
  expect(log).not.toContain("so I could approve it at once")
})

test("[model] every cheer is emailed: nothing opens outside the app, and the Email link shows the text whose link opens the card", async ({ page, context }) => {
  await seed(page, { cheers: [] })
  const pages: unknown[] = []
  context.on("page", p => pages.push(p))
  const outside: string[] = []
  // The R1 draft went to Gmail; nothing may go there (or open a window) now.
  await context.route("https://mail.google.com/**", route => { outside.push(route.request().url()); return route.abort() })
  const form = await openGive(page)
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByLabel("Points", { exact: true }).fill("250")
  await form.getByLabel(/What did they do/).fill(NOTE_B)
  await expect(form).toContainText("Jordan will get an email.")
  await form.getByTestId("cheer-send").click()
  await page.getByTestId("cheer-confirm").getByRole("button", { name: "Send" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Cheer sent. Jordan will get an email." })).toBeVisible()
  const [cheer] = await savedCheers(page)
  expect(cheer.email).toBe(true)
  expect(pages, "no draft or other window opens").toEqual([])
  expect(outside, "nothing is sent anywhere").toEqual([])
  // The sender reads the email from the history.
  await closeRail(page)
  await page.getByTestId("cheer-history").click()
  const history = page.getByRole("dialog", { name: "Cheers history" })
  const toggle = history.getByRole("button", { name: "Email" })
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  const text = history.getByTestId("cheer-email-text")
  await expect(text).toContainText("From Platypus to Jordan Patel")
  await expect(text).toContainText("⭐ Alex sent you 250 points")
  await expect(text).toContainText("Hi Jordan,")
  await expect(text).toContainText(`Why: “${NOTE_B}”`)
  await expect(text).toContainText(`#/?cheer=${cheer.id}`)
  await expect(text).not.toContainText("points this term")
  expect(await scan(page)).toEqual([])
  await page.keyboard.press("Escape")
  // The recipient reads the same email from the card, and the link in it opens that card.
  await viewAs(page, "jordan")
  const card = page.getByTestId("cheer-card")
  await expect(card).toBeVisible()
  await card.getByRole("button", { name: "Email" }).click()
  await expect(card.getByTestId("cheer-email-text")).toContainText("From Platypus to you")
  const link = (await card.getByTestId("cheer-email-text").textContent())!.match(/https?:\/\/\S+#\/\?cheer=\S+/)![0]
  await card.getByRole("button", { name: "Close" }).click()
  await page.goto(link)
  await expect(card).toBeVisible()
  await expect(card).toContainText(NOTE_B)
})

test("[model] let others know: they get the note in their inbox and a read-only card; a fourth person sees nothing", async ({ page }) => {
  await seed(page, { cheers: [], viewerId: "maya" })
  const form = await openGive(page)
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  const cc = form.getByLabel("Let others know too (optional)")
  // The president first, then the others.
  expect(await cc.locator("optgroup").evaluateAll(gs => gs.map(g => [(g as HTMLOptGroupElement).label, [...g.querySelectorAll("option")].map(o => o.value)]))).toEqual([["Suggested", ["alex"]], ["Other officers", ["priya", "sam"]]])
  await cc.selectOption("alex")
  await expect(form.getByTestId("cheer-cc")).toContainText("Alex")
  await form.getByLabel(/What did they do/).fill(NOTE_B)
  await form.getByTestId("cheer-send").click()
  const confirm = page.getByTestId("cheer-confirm")
  await expect(confirm).toContainText("Alex will see it too.")
  await confirm.getByRole("button", { name: "Send" }).click()
  await expect.poll(async () => (await savedCheers(page)).length).toBe(1)
  const [cheer] = await savedCheers(page)
  expect(cheer).toMatchObject({ toIds: ["jordan"], ccIds: ["alex"], points: 100 })
  expect((await saved(page)).cheers.cheers[0].points).toBe(100)
  // Alex: a notice with the note, opening the card read-only; under "Shared with you" in the history, no points of his.
  await viewAs(page, "alex")
  await page.goto("/#/team")
  await closeRail(page)
  await expect(page.getByTestId("cheer-card")).toHaveCount(0)
  await page.getByTestId("bell").click()
  const notice = page.getByTestId("private-inbox").getByTestId("inbox-cheer").filter({ hasText: "recognized" })
  await expect(notice).toHaveText(`Maya recognized Jordan: “${NOTE_B}”`)
  await notice.click()
  const card = page.getByTestId("cheer-card")
  await expect(card).toBeVisible()
  await expect(card).toContainText(NOTE_B)
  await expect(card.getByTestId("cheer-card-count")).toHaveText("Maya shared this with you.")
  await expect(card.getByRole("button")).toHaveText(["Close"])
  await card.getByRole("button", { name: "Close" }).click()
  await page.goto("/#/team")
  await closeRail(page)
  await expect(page.getByTestId("your-cheers").getByTestId("cheer-row").filter({ hasText: NOTE_B })).toHaveCount(0)
  await page.getByTestId("cheer-history").click()
  const history = page.getByRole("dialog", { name: "Cheers history" })
  const shared = history.getByRole("region", { name: "Shared with you" })
  await expect(shared.getByTestId("cheer-row")).toContainText("From Maya to Jordan")
  await expect(shared.getByRole("button", { name: "Email" })).toHaveCount(0)
  await page.keyboard.press("Escape")
  // Sam, a fourth person: nothing in the inbox, the Team card, the history or a card link.
  await viewAs(page, "sam")
  await page.goto("/#/team")
  await closeRail(page)
  await expect(page.locator("body")).not.toContainText(NOTE_B)
  await page.getByTestId("bell").click()
  await expect(page.getByTestId("private-inbox")).not.toContainText("recognized")
  await page.keyboard.press("Escape")
  await page.goto(`/#/?cheer=${cheer.id}`)
  await expect(page.locator("main h1")).toBeVisible()
  await expect(page).not.toHaveURL(/cheer=/)
  await expect(page.getByTestId("cheer-card")).toHaveCount(0)
  await expect(page.locator("body")).not.toContainText(NOTE_B)
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

test("[model] no withdraw (R1.1): the sender's own cheer from today has no Withdraw, and a cheer withdrawn in an R1 save stays hidden", async ({ page }) => {
  // ch-902 was withdrawn under R1, in a saved file; ch-904 is Maya's cheer from today.
  const today = { id: "ch-904", fromId: "maya", toIds: ["priya"], points: 300, note: "The minutes were out the same evening, thank you.", card: "trophy", on: "2026-10-31", seenBy: ["priya"], email: true }
  await seed(page, { cheers: [PAIR[0], { ...PAIR[1], withdrawnOn: "2026-10-31" }, today], viewerId: "maya", notifications: [{ id: "cheer:ch-902:jordan", recipientId: "jordan", nodeId: "", kind: "cheer", text: "Maya sent you 25 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-902" }] })
  await page.goto("/#/team")
  // The withdrawn cheer counts for nobody: 300 of 1,000 used.
  await expect(page.getByTestId("cheer-left")).toContainText("700 / 1,000")
  await page.getByTestId("cheer-history").click()
  const dialog = page.getByRole("dialog", { name: "Cheers history" })
  await expect(dialog.getByTestId("cheer-row")).toHaveCount(2)
  await expect(dialog.getByTestId("cheer-withdraw")).toHaveCount(0)
  await expect(dialog.getByText("Withdraw", { exact: true })).toHaveCount(0)
  await expect(dialog).not.toContainText(NOTE_B)
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  // Jordan's inbox does not show the withdrawn cheer, and no card opens for him.
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
  await form.getByRole("button", { name: "More points" }).click()
  await form.getByRole("button", { name: "Rocket" }).click()
  await form.getByLabel("Let others know too (optional)").selectOption("priya")
  await form.getByLabel(/What did they do/).fill(NOTE_B)
  await viewAs(page, "maya")
  const again = page.getByTestId("give-cheer")
  await expect(again).toBeVisible()
  await expect(again.getByLabel(/What did they do/)).toHaveValue("")
  await expect(again.getByLabel("To", { exact: true })).toHaveValue("")
  await expect(again.getByLabel("Points", { exact: true })).toHaveValue("100")
  await expect(again.getByRole("button", { name: "Trophy", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(again.getByTestId("cheer-cc").getByRole("button")).toHaveCount(0)
  await expect(again.getByTestId("cheer-form-left")).toHaveText("1,000 left this week")
})

test("[model] the allowance shows on the card and in the form, and drops after a send", async ({ page }) => {
  await seed(page, { cheers: PAIR, viewerId: "maya" })
  await page.goto("/#/team")
  await expect(page.getByTestId("cheer-received")).toContainText("50")
  // R1.1 interim allowance (§8.3): 1,000 a week for an officer; the R1 cheer of 25 counts as stored.
  await expect(page.getByTestId("cheer-left")).toContainText("975 / 1,000")
  await page.getByTestId("cheer-give").click()
  const form = page.getByTestId("give-cheer")
  await expect(form.getByTestId("cheer-form-left")).toHaveText("975 left this week")
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  await form.getByRole("button", { name: "+ Add someone" }).click()
  await form.getByLabel("Add a teammate").selectOption("priya")
  await expect(form.getByTestId("cheer-recipients").getByRole("listitem")).toHaveCount(3)
  await form.getByLabel("Points each", { exact: true }).fill("500")
  await form.getByLabel(/What did they do/).fill("Both of you finished the room plan early.")
  await expect(form.getByTestId("cheer-problem")).toHaveText("Only 975 points left this week.")
  await expect(form.getByTestId("cheer-send")).toBeDisabled()
  // Each can get at most 487 now; the + button stops at the last step of 50 below that.
  await expect(form.getByLabel("Points each", { exact: true })).toHaveAttribute("max", "487")
  await form.getByRole("button", { name: "Fewer points" }).click()
  await expect(form.getByLabel("Points each", { exact: true })).toHaveValue("450")
  await expect(form.getByRole("button", { name: "More points" })).toBeDisabled()
  await expect(form.getByTestId("cheer-send")).toHaveText("Send 2 cheers")
  await form.getByTestId("cheer-send").click()
  await expect(page.getByRole("dialog", { name: "Send 450 points each to Jordan Patel and Priya Nair?" })).toBeVisible()
  await page.getByTestId("cheer-confirm").getByRole("button", { name: "Send" }).click()
  await expect(page.getByRole("status").filter({ hasText: "Cheer sent. Jordan and Priya will each get an email." })).toBeVisible()
  await closeRail(page)
  await expect(page.getByTestId("cheer-left")).toContainText("75 / 1,000")
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
