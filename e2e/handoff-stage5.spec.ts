import { expect, test } from "@playwright/test"
import { demoClock, viewAs } from "./helpers"

// Handoff stage 5 (docs/HANDOFF_EXECUTION_PLAN.md §7): questions, reading and read-back, shadow task, check-ins.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/handbook/draft", r => r.fulfill({ status: 502, json: { error: "bad_json", message: "x" } })) // the built-in handbook is enough here
})

test("questions, reading, read-back, shadow task and check-ins, with scores seen only by the president and the new officer", async ({ page }) => {
  test.setTimeout(90_000) // one long story, about 25 steps
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })

  // The outgoing officer answers a question the records raise; the answer joins the interview.
  await viewAs(page, "maya")
  const questions = role.getByTestId("gap-questions")
  await expect(questions).toContainText("Questions from the records")
  await questions.getByLabel(/^Answer: What usually goes wrong/).fill("Late receipts. Reconcile every Friday.")
  await questions.getByRole("button", { name: "Save answer" }).first().click()
  await expect(questions).toContainText("answered: Late receipts. Reconcile every Friday.")
  await expect(questions).toContainText("draft the handbook again afterwards")

  // Handbook drafted, signed off, and a next officer named.
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(role.getByTestId("handbook-draft")).toBeVisible()
  await role.getByRole("button", { name: "Confirm as outgoing officer", exact: true }).click()
  await viewAs(page, "alex")
  await role.getByRole("button", { name: "Approve as president", exact: true }).click()
  await role.getByLabel("Incoming officer name").fill("Taylor Example")
  await role.getByRole("button", { name: "Name as next officer" }).click()
  await role.getByRole("button", { name: "Pick a task to shadow" }).click()
  await expect(role.getByTestId("new-officer")).toContainText("Shadowing")

  // The next officer reads, marks one section unclear, and answers the three read-back questions.
  await viewAs(page, "incoming:season:2026-10-26:r-fin")
  const next = role.getByTestId("new-officer")
  await expect(next).toContainText("Your predecessor: Maya Chen")
  await next.getByRole("button", { name: "Unclear" }).first().click()
  await next.getByRole("button", { name: "Got it" }).last().click()
  const boxes = next.getByRole("textbox")
  await boxes.nth(0).fill("Quokkas zeppelin xylophone")
  await boxes.nth(1).fill("Ask the president")
  await boxes.nth(2).fill("Quokkas zeppelin xylophone")
  await next.getByRole("button", { name: "Save read-back" }).click()
  await expect(next).toContainText("Not found in the handbook")

  // The outgoing officer sees the "unclear" question and the flagged answer, and decides.
  await viewAs(page, "maya")
  await expect(role.getByTestId("gap-questions")).toContainText("found “")
  await role.getByTestId("new-officer").getByRole("button", { name: "Fine as it is" }).first().click()
  await expect(role.getByTestId("new-officer")).toContainText("looked at")

  // Hand over (the handbook was withdrawn by the answer, so draft and sign off again).
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await role.getByRole("button", { name: "Confirm as outgoing officer", exact: true }).click()
  await viewAs(page, "alex")
  await role.getByRole("button", { name: "Approve as president", exact: true }).click()
  await role.getByRole("button", { name: "Finish role handoff" }).click()
  await expect(role).toContainText("Handed to Taylor Example.")

  // Day 7 check-in: not open yet, then open; only the new officer writes, only they and the president read.
  await expect(role.getByTestId("reviews")).toContainText("Opens ")
  await demoClock(page, 10)
  if (!(await role.isVisible())) await page.getByRole("button", { name: /^Treasurer handbook/ }).click() // on a phone the clock menu closes the side panel
  await viewAs(page, "incoming:season:2026-10-26:r-fin")
  const reviews = role.getByTestId("reviews")
  await reviews.getByLabel("What was missing from the handbook?").first().fill("Who approves the USG forms.")
  await reviews.getByRole("button", { name: "Save day 7 check-in" }).click()
  await expect(reviews).toContainText("Clarity 3/5 · confidence 3/5 · welcome 3/5 · missing: Who approves the USG forms.")
  await viewAs(page, "jordan")
  await expect(reviews.getByText("Clarity 3/5")).toHaveCount(0)
  await expect(reviews).toContainText("Recorded.")
  await viewAs(page, "alex")
  await expect(reviews).toContainText("Clarity 3/5")
  await reviews.getByRole("button", { name: "Add to dossier" }).click()
  await expect(reviews).toContainText("in the dossier")
  await role.getByTestId("role-dossier").getByText("Role dossier").click()
  await expect(role.getByTestId("dossier-lessons")).toContainText("A new officer's note after day 7: Who approves the USG forms.")
})
