import { expect, test } from "@playwright/test"
import { ask, closeRail, noOverflow, resetDemo, openMore, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"
import { enableUpdatedReminders } from "./reminderHelpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
})

test("plans an event from one sentence: form, change set, approval, flow chart; persists and resets", async ({ page }) => {
  let chatCalls = 0
  await page.route("**/api/chat", r => { chatCalls++; return r.fulfill({ status: 503, json: {} }) })
  await page.goto("/#/")
  const initial = await savedDemo(page)
  await ask(page, "Plan Founders Welcome Dinner on Nov 19, 30 people, outside caterer, USG funding")
  const form = page.getByTestId("plan-form")
  await expect(form.getByLabel("Event name")).toHaveValue("Founders Welcome Dinner")
  await expect(form.getByLabel("Date")).toHaveValue("2026-11-19")
  // M2b: the form asks only Yes/No for food; the caterer type the person wrote travels with the request.
  await expect(form.getByLabel("Food", { exact: true })).toHaveValue("yes")
  await form.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByText("food: outside caterer")).toBeVisible()
  const card = page.getByTestId("change-item")
  await expect(card.getByLabel("Event date", { exact: true })).toHaveValue("2026-11-19")
  await card.getByLabel("Event name").fill("Founder Dinner Preview")
  await card.getByLabel("Event date", { exact: true }).fill("2027-02-18")
  await card.getByRole("button", { name: "Apply this change" }).click()
  await expect(page.locator("main").getByRole("heading", { name: "Founder Dinner Preview" })).toBeVisible()
  await expect(page.getByTestId("flow-chart")).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).changeSets[0].status)).toBe("applied")
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).changeSets[0].ops[0].food)).toBe("offsite")
  expect(chatCalls).toBe(1) // M2b: the AI reads the sentence once; the form is already up from local rules and this 503 changes nothing
  await page.reload()
  const eventNav = page.getByRole("navigation", { name: "Events" })
  await closeRail(page)
  const persisted = await savedDemo(page)
  expect(persisted.events.filter(e => e.name === "Founder Dinner Preview")).toHaveLength(1)
  expect(persisted.events.filter(e => initial.events.some(seed => seed.id === e.id))).toEqual(initial.events)
  const orderedNames = [...persisted.events].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)).map(e => e.name)
  if (await eventNav.isVisible()) {
    await expect(eventNav.getByRole("button")).toHaveCount(initial.events.length + 1)
    await expect(eventNav.getByRole("button")).toHaveText(orderedNames)
    await eventNav.getByRole("button", { name: "Spring Speaker Night" }).click()
  } else {
    const picker = page.getByRole("combobox", { name: "Choose an event" })
    await expect(picker).toBeVisible()
    await expect(picker.locator("option")).toHaveCount(initial.events.length + 1)
    await expect(picker.locator("option")).toHaveText(orderedNames)
    await picker.selectOption("e-speaker")
  }
  await expect(page.locator("main").getByRole("heading", { name: "Spring Speaker Night" })).toBeVisible()
  await resetDemo(page)
  await page.goto("/#/")
  await expect(page.locator("main h1")).toHaveText("Reminders")   // FB-8: home is the reminder centre; the Events strip left home
  expect((await savedDemo(page)).events).toEqual(initial.events)
  await expect(page.getByTestId("change-set")).toHaveCount(0)
})

test("AI off: a command becomes a labelled change set; owner edits apply and rejects stick", async ({ page }) => {
  await enableUpdatedReminders(page)
  await openMore(page)
  await page.getByRole("checkbox", { name: "AI features" }).uncheck()
  await ask(page, "Assign Send the October newsletter to Priya")
  const card = page.getByTestId("change-item")
  await expect(page.getByTestId("change-set")).toContainText("AI off")
  await card.getByLabel("Owner", { exact: true }).selectOption("jordan")
  await card.getByRole("button", { name: "Apply this change" }).click()
  await expect(page.getByTestId("rq-needs-ok").locator('[data-node="t-news"]')).toContainText("Jordan")   // FB-8: the reminder centre row
  await ask(page, "Unassign Send the October newsletter")
  await page.getByTestId("change-item").last().getByRole("button", { name: "Reject", exact: true }).click()
  await expect(page.getByTestId("change-item").last()).toContainText("Rejected")
  // Small edits apply at once and can be undone (v1.2).
  await ask(page, "Set Send the October newsletter to heavy")
  await expect(page.getByTestId("applied-set").last()).toContainText("Done")
  await page.getByTestId("undo-auto").last().click()
  await expect(page.getByTestId("applied-set").last()).toContainText("Undone")
})

// FB-8: the risk list is gone; forecast-red tasks lead each reminder-centre section with a risk mark, and "Review & open draft" opens the reminder.
test("top tasks and the reminder centre's risk marks come from the app; Review & open draft opens a rule-written reminder with one task entry", async ({ page }) => {
  await page.route("**/api/nudge/draft", r => r.fulfill({ json: { whyItMatters: "We build a stronger club together.", source: "ai" } }))
  await enableUpdatedReminders(page)
  const risk = page.getByTestId("rq-needs-ok")
  await expect(risk.getByTestId("rq-row").first().getByTestId("forecast").getByRole("button")).toHaveAttribute("aria-label", /At risk/)
  await ask(page, "What are my top 5 tasks?")
  await expect(page.getByTestId("tasks-card")).toContainText("Your top")
  await closeRail(page)
  await risk.getByRole("button", { name: "Review & open draft" }).first().click()
  const panel = page.getByTestId("nudge-panel")
  await expect(panel.getByTestId("nudge-body")).toContainText("Task due:")
  await expect(panel.getByTestId("nudge-body")).toContainText("Thank you")
  const selected = await panel.getByLabel("Preferred channel").inputValue()
  expect(["whatsapp", "sms", "email"]).toContain(selected)
  await expect(panel.getByRole("link", { name: "Open task", exact: true })).toHaveCount(1)
  await expect(panel.getByRole("link", { name: /^(Done|Waiting on…|Need help|Need more time)$/ })).toHaveCount(0)
  await panel.getByLabel("Preferred channel").selectOption("email")
  const draft = panel.getByRole("link", { name: "Open Gmail draft" })
  await expect(draft).toHaveAttribute("href", /^https:\/\/mail.google.com\/mail\/\?view=cm/)
  expect(decodeURIComponent((await draft.getAttribute("href"))!)).toContain("Task due:")
  await expect(panel.getByRole("button", { name: "I sent this reminder" })).toHaveCount(0)
  const entry = (await panel.getByRole("link", { name: "Open task", exact: true }).getAttribute("href"))!
  await page.goto(entry)
  await expect(page.getByTestId("single-task-page")).toBeVisible()
  await expect(page.getByRole("button", { name: "Stuck", exact: true })).toBeVisible()
})

test("officers cannot prepare a reminder or approve a change", async ({ page }) => {
  await page.goto("/#/")
  await openMore(page)
  await page.getByRole("checkbox", { name: "AI features" }).uncheck()
  await viewAs(page, "maya")
  await expect(page.getByRole("button", { name: "Remind" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Review & open draft" })).toHaveCount(0)   // FB-8: an officer's home is read-only
  await expect(page.getByTestId("your-reminders")).toBeVisible()
  await ask(page, "Assign Send the October newsletter to Priya")
  await expect(page.getByRole("button", { name: "Apply this change" })).toBeDisabled()
  await ask(page, "Set Send the October newsletter to heavy")
  await expect(page.getByTestId("applied-set").last()).toContainText("Not changed")
})

// FB-8 (PLAN.md §12.2): home is the reminder centre. The Events progress card, Semester goals and Superstar of the week left home
// (goals are in Settings, the weekly star on Team); the events are one click away under Plan.
test("Reminders: five sections in place of the risk rows, event chains, goals and the weekly star", async ({ page }) => {
  await page.goto("/#/")
  for (const name of ["Needs your OK", "This week", "Sent", "Replies", "No reply yet"]) await expect(page.getByRole("heading", { level: 2, name })).toBeVisible()
  await expect(page.getByTestId("event-strip")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Semester goals" })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Superstar of the week" })).toHaveCount(0)
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
  await closeRail(page)
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: /^Plan/ }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events")
})

test("server errors fall back clearly, and hostile AI output changes nothing", async ({ page }) => {
  await page.route("**/api/chat", r => r.fulfill({ status: 503, json: { message: "Unavailable" } }))
  await page.goto("/#/")
  await ask(page, "How is the club doing overall")
  await expect(page.getByTestId("bot-reply").last()).toContainText("unavailable")
  await page.unroute("**/api/chat")
  await page.route("**/api/chat", r => r.fulfill({ json: { source: "ai", cards: [{ kind: "changes", ops: [{ op: "delete_node", nodeId: "t-news" }] }, { kind: "send_email", to: "a@b.c" }] } }))
  await ask(page, "Delete everything")
  await expect(page.getByTestId("bot-reply").last()).toContainText(/couldn't safely match|couldn't turn that into a change/)
  await expect(page.getByTestId("change-set")).toHaveCount(0)
})
