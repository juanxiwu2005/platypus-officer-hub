import { expect, test, type Locator, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { closeRail, noOverflow } from "./helpers"
import { enableUpdatedReminders } from "./reminderHelpers"
import type { DemoState } from "../src/data/types"

// R-S0 §4 (Juanxi 2026-11-27): a lead edits a person's email in a plain compose box before it goes out. Seed club,
// Sat Oct 31: Maya 1 task, Jordan 3, Priya 1. Nothing is really sent; Gmail is intercepted.
const LINE = "Thanks for taking this on, Maya. Ping me if the room is gone."
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!) as DemoState)
const person = (page: Page, id: string) => page.locator(`[data-testid="rq-person"][data-recipient="${id}"]`)
const serious = async (page: Page) => (await new AxeBuilder({ page }).include("[data-testid=rq-draft]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze())
  .violations.filter(v => v.impact === "serious" || v.impact === "critical").map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).slice(0, 3).join(" ; ")}`)
async function openDraft(page: Page, id: string): Promise<Locator> {
  await person(page, id).getByTestId("rq-person-toggle").click()
  const draft = person(page, id).getByTestId("rq-draft")
  await expect(draft).toBeVisible()
  return draft
}
const firstToken = async (body: Locator) => (await body.inputValue()).match(/\[Open task: [^\]]+\]/)![0]

test.beforeEach(async ({ page, context }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline reminder check" } }))
  await context.route(url => !["localhost", "127.0.0.1", "mail.google.com"].includes(url.hostname), route => route.abort())
  await context.route(url => url.hostname === "mail.google.com", route => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Gmail stand-in</title>" }))
})

test("edit Maya's email: add a line, lose the link, put it back, undo and redo, send; History shows Edited", async ({ page }) => {
  await enableUpdatedReminders(page, "review_then_auto")
  const draft = await openDraft(page, "maya")
  await expect(draft.getByTestId("rq-draft-to")).toHaveText("maya.chen@example.org")
  await expect(draft.getByRole("textbox", { name: "Subject" })).toHaveValue("Reconcile September receipts, due Oct 26")
  const body = draft.getByRole("textbox", { name: "Message" })
  const token = await firstToken(body)
  expect(await body.inputValue()).not.toMatch(/https?:/)
  expect(await serious(page)).toEqual([])
  // Type a personal line after the greeting, the way a person would.
  await body.click()
  await body.press("Control+Home")
  await body.press("End")
  await page.keyboard.type(`\n\n${LINE}`)
  await expect(body).toHaveValue(new RegExp(`^Hi Maya,\\n\\n${LINE.replace(/[.?]/g, "\\$&")}\\n`))
  // Losing the task link stops sending and says why.
  await body.fill((await body.inputValue()).replace(token, ""))
  const send = person(page, "maya").getByRole("button", { name: "Send to Maya" })
  await expect(draft.getByTestId("rq-draft-missing")).toContainText("Missing link: ")
  await expect(send).toBeDisabled()
  expect(await serious(page)).toEqual([])
  await draft.getByTestId("rq-draft-putback").click()
  await expect(draft.getByTestId("rq-draft-missing")).toHaveCount(0)
  await expect(send).toBeEnabled()
  // Undo and Redo, by button and by keyboard; Put back is one step.
  await draft.getByTestId("rq-draft-undo").click()
  await expect(draft.getByTestId("rq-draft-missing")).toBeVisible()
  await draft.getByTestId("rq-draft-redo").click()
  await expect(draft.getByTestId("rq-draft-missing")).toHaveCount(0)
  await body.press("Control+z")
  await expect(body).not.toHaveValue(new RegExp(token.replace(/[[\]().]/g, "\\$&")))
  await body.press("Control+Shift+z")
  await expect(draft.getByTestId("rq-draft-missing")).toHaveCount(0)
  await expect(body).toHaveValue(new RegExp(LINE.replace(/[.?]/g, "\\$&")))
  expect(await noOverflow(page)).toBeLessThanOrEqual(0)
  await send.click()
  await expect(person(page, "maya")).toHaveAttribute("data-state", "sent")
  const snap = (await read(page)).reminderRuntime!.digests![0]
  expect(snap).toMatchObject({ edited: true, recipientId: "maya", via: "platypus" })
  expect(snap.body).toContain(LINE)
  expect(snap.body).toContain(`Open task: ${snap.taskUrls[0]}`)
  expect(snap.original!.body).not.toContain(LINE)
  await closeRail(page)
  await page.getByTestId("open-history").click()
  const row = page.getByTestId("rq-sent").locator(`[data-digest="${snap.id}"]`)
  await expect(row.getByTestId("rq-edited")).toHaveText("Edited")
  await row.getByText("Recorded email").click()
  await expect(row.locator("pre")).toContainText(LINE)
  await expect(row.locator("pre")).toContainText(snap.taskUrls[0])
})

test("I review, then I send: Open in Gmail carries the edited draft and To; collapsing the row keeps I sent this", async ({ page }) => {
  await enableUpdatedReminders(page, "review_then_self")
  const draft = await openDraft(page, "jordan")
  const body = draft.getByRole("textbox", { name: "Message" })
  await body.fill(`${await body.inputValue()}\n\nP.S. ${LINE}`)
  const [gmail] = await Promise.all([page.waitForEvent("popup"), draft.getByRole("link", { name: "Open in Gmail" }).click()])
  const url = new URL(gmail.url())
  await gmail.close()
  expect(url.host).toBe("mail.google.com")
  expect(url.searchParams.get("to")).toBe("jordan.patel@example.org")
  expect(url.searchParams.get("su")).toBe("3 club tasks for today")
  const mailed = url.searchParams.get("body")!
  expect(mailed).toContain(`P.S. ${LINE}`)
  expect(mailed).not.toContain("[Open task:")
  expect(mailed.match(/^Open task: http:\/\/(?:localhost|127\.0\.0\.1):\d+\/#\/events\?\S*access=\S+$/gm)).toHaveLength(3)
  await expect(draft.getByTestId("rq-person-sent-self")).toBeVisible()
  // Collapse and reopen (and look at another row in between): the draft and "I sent this" stay.
  await person(page, "jordan").getByTestId("rq-person-toggle").click()
  await openDraft(page, "maya")
  const again = await openDraft(page, "jordan")
  await expect(again.getByRole("textbox", { name: "Message" })).toHaveValue(new RegExp(`P\\.S\\. ${LINE.replace(/[.?]/g, "\\$&")}$`))
  await again.getByTestId("rq-person-sent-self").click()
  await expect(person(page, "jordan")).toHaveAttribute("data-state", "sent")
  const snap = (await read(page)).reminderRuntime!.digests![0]
  expect(snap).toMatchObject({ edited: true, via: "manual", recipientId: "jordan" })
  expect(snap.body).toBe(mailed)
})

test("Send all is disabled while one draft has a missing link, names the person, and sends every current draft once fixed", async ({ page }) => {
  await enableUpdatedReminders(page, "review_then_auto")
  const draft = await openDraft(page, "jordan")
  const body = draft.getByRole("textbox", { name: "Message" })
  await body.fill((await body.inputValue()).replace(await firstToken(body), ""))
  await person(page, "jordan").getByTestId("rq-person-toggle").click()
  await expect(person(page, "jordan").getByText("Put back the task link first.")).toBeVisible()
  // Contract §4: disabled, and the summary's status line says why.
  await expect(page.getByTestId("send-all-digests")).toBeDisabled()
  await expect(page.getByTestId("rq-feedback")).toHaveText("Put back the task link in Jordan's email first.")
  expect((await read(page)).reminderRuntime!.digests ?? []).toEqual([])
  const fix = await openDraft(page, "jordan")
  await fix.getByTestId("rq-draft-putback").click()
  await expect(page.getByTestId("rq-feedback")).toHaveText("")
  await page.getByTestId("send-all-digests").click()
  await expect.poll(async () => (await read(page)).reminderRuntime!.digests?.length ?? 0).toBe(3)
  const snaps = (await read(page)).reminderRuntime!.digests!
  expect(snaps.map(d => [d.recipientId, d.edited ?? false])).toEqual([["maya", false], ["jordan", true], ["priya", false]])
  expect(snaps[1].taskUrls.every(u => snaps[1].body.includes(`Open task: ${u}`))).toBe(true)
})

test("Reset demo clears an unsent edit: Maya's row opens with the rule-written email again", async ({ page }) => {
  await enableUpdatedReminders(page, "review_then_auto")
  const draft = await openDraft(page, "maya")
  const body = draft.getByRole("textbox", { name: "Message" })
  const original = await body.inputValue()
  await body.click()
  await body.press("Control+End")
  await page.keyboard.type(`\n${LINE}`)
  await expect(body).toHaveValue(new RegExp(`${LINE.replace(/[.?]/g, "\\$&")}$`))
  await person(page, "maya").getByTestId("rq-person-toggle").click()
  await page.getByTestId("demo-menu").click()
  await page.getByTestId("reset-demo").click()
  await page.getByTestId("reset-demo").click()
  // Same tab, no reload: only the store's reset can clear the in-memory draft.
  await expect(page.getByText("Demo data reset")).toBeVisible()
  await expect(person(page, "maya")).toBeVisible()
  if (await person(page, "maya").getAttribute("data-open")) await person(page, "maya").getByTestId("rq-person-toggle").click()
  const again = await openDraft(page, "maya")
  const value = await again.getByRole("textbox", { name: "Message" }).inputValue()
  expect(value).not.toContain(LINE)
  expect(value).toBe(original)
  await expect(again).not.toHaveAttribute("data-edited", /.*/)
})
