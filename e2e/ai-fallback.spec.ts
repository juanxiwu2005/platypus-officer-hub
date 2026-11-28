import { expect, test } from "@playwright/test"
import { ask, viewAs } from "./helpers"
import { savedDemo, savedEvent } from "./demo-contract"

/**
 * Production 2026-11-07: "Plan an event about March 3 for networking night with 50 people" waited 31 s for /api/chat, got a 504,
 * and showed only "Local fallback · server unavailable" with no planning form. "Draft role handbook" got a 502 (the AI's reply was
 * cut off). Here the AI endpoints answer 504/502 after a short delay; the person must still get a usable form and handbook.
 * No real AI is called.
 */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
/** "March 3" said on `today`: this year's March 3, or next year's when it has passed. Computed by the app's date rules, not by AI. */
const march3 = (today: string) => { const y = Number(today.slice(0, 4)); return `${today > `${y}-03-03` ? y + 1 : y}-03-03` }

test("Ask: planning an event shows the form at once and keeps it when the AI times out", async ({ page }) => {
  const sent: Record<string, unknown>[] = []
  await page.route("**/api/chat", async r => {
    sent.push(r.request().postDataJSON())
    await sleep(1500)
    await r.fulfill({ status: 504, json: { error: "timeout", message: "The AI provider took too long to answer." } })
  })
  await page.goto("/#/")
  const demo = await savedDemo(page)
  await ask(page, "Plan an event about March 3 for networking night with 50 people")
  const form = page.getByTestId("plan-form")
  // The form is there while the AI is still reading, filled from the person's own words.
  await expect(form.getByTestId("ai-reading")).toBeVisible()
  await expect(form.getByLabel("Event name")).toHaveValue("Networking night")
  await expect(form.getByLabel("Date")).toHaveValue(march3(demo.today))
  await expect(form.getByLabel("People")).toHaveValue("50")
  // The 504 arrives: the form stays, the label says what happened.
  const reply = page.getByTestId("bot-reply").last()
  await expect(reply.locator(".ask-source")).toHaveText("Platypus · AI didn't answer in time, filled from your words")
  await expect(form.getByTestId("ai-reading")).toHaveCount(0)
  expect(sent).toHaveLength(1) // asked once, never retried
  expect(sent[0].purpose).toBe("form")
  expect(sent[0].data).not.toHaveProperty("tasks")
  // And it works: Create event makes the event at once with the person's date (Option A, 2026-11-28).
  await form.getByRole("button", { name: "Review event" }).click()
  // Review option B: the form drafts; Create event in the change list is the approval.
  await page.getByTestId("change-set").last().getByRole("button", { name: "Create event" }).click()
  await expect(page.getByTestId("event-created")).toContainText("Networking night created")
  expect((await savedEvent(page, "Networking night")).date).toBe(march3(demo.today))
})

test("Ask: a planning message left to the AI still ends in the form when the AI fails", async ({ page }) => {
  let calls = 0
  await page.route("**/api/chat", async r => { calls++; await sleep(800); await r.fulfill({ status: 502, json: { error: "upstream", message: "AI provider error 502." } }) })
  await page.goto("/#/")
  await ask(page, "Plan a monthly social for new members")
  const form = page.getByTestId("plan-form")
  await expect(form).toBeVisible()
  await expect(form.getByLabel("Event name")).toHaveValue("Monthly social")
  await expect(page.getByTestId("bot-reply").last().locator(".ask-source")).toHaveText("Platypus · AI unavailable, filled from your words")
  expect(calls).toBe(1)
})

test("Handoff: a failed AI handbook draft falls back to one built from the sources, which can be signed off", async ({ page }) => {
  let calls = 0
  await page.route("**/api/handbook/draft", async r => {
    calls++
    await sleep(800)
    await r.fulfill({ status: 502, json: { error: "bad_json", message: "AIR stopped before finishing the response (output limit)." } })
  })
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(role.getByRole("button", { name: "Drafting from sources…" })).toBeVisible()
  const draft = role.getByTestId("handbook-draft")
  await expect(draft).toContainText("Built from your sources · AI unavailable")
  await expect(role.getByRole("status")).toHaveText("The AI couldn't draft it right now, so the app built this handbook from your sources. You can draft again later.")
  await expect(draft.locator("ol.entries > li").first()).toBeVisible()
  expect(calls).toBe(1)
  // Not a dead end: the outgoing officer can confirm this handbook.
  await viewAs(page, "maya")
  await expect(role.getByRole("button", { name: "Confirm as outgoing officer", exact: true })).toBeEnabled()

  // A timeout is named as one, and once the AI answers the draft is the AI's again.
  await viewAs(page, "alex")
  await page.unroute("**/api/handbook/draft")
  await page.route("**/api/handbook/draft", async r => { await sleep(300); await r.fulfill({ status: 504, json: { error: "timeout", message: "The AI provider took too long to answer." } }) })
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(draft).toContainText("Built from your sources · AI didn't answer in time")
  await page.unroute("**/api/handbook/draft")
  await page.route("**/api/handbook/draft", r => r.fulfill({ json: { entries: [{ sourceId: "interview:r-fin:1" }], model: "mock-model", provider: "mock", source: "ai", partial: true } }))
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(draft).toContainText("AI-selected source extracts · mock · reply was cut short, complete picks kept")
})
