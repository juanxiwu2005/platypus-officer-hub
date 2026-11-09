import { expect, test } from "@playwright/test"
import { ask, closeRail, viewAs } from "./helpers"

// Handoff stage 7 (docs/HANDOFF_EXECUTION_PLAN.md §8). Juanxi (Q3): the product's question record is the study log; nothing new is recorded.
test("what the next officer asked in Ask shows to the president and to them, read from the study log, never sent to the AI", async ({ page }) => {
  test.setTimeout(90_000)
  let sentToAi = ""
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/handbook/draft", r => { sentToAi += r.request().postData() ?? ""; return r.fulfill({ status: 502, json: { error: "bad_json", message: "x" } }) })
  await page.goto("/#/handoff")
  await expect(page.getByRole("button", { name: "Save dates" })).toBeVisible()
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })

  // The president names a next officer (the handbook is built from the club's records).
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  await expect(role.getByTestId("handbook-draft")).toBeVisible()
  await viewAs(page, "maya")
  await role.getByRole("button", { name: "Confirm as outgoing officer", exact: true }).click()
  await viewAs(page, "alex")
  await role.getByRole("button", { name: "Approve as president", exact: true }).click()
  await role.getByLabel("Incoming fictional officer name").fill("Taylor Example")
  await role.getByRole("button", { name: "Name as next officer" }).click()

  // The next officer asks Ask something the handbook does not cover.
  await viewAs(page, "incoming:season:2026-10-26:r-fin")
  await ask(page, "Quokkas zeppelin xylophone?")
  await expect(page.locator(".ask-list")).toContainText("zeppelin")
  await closeRail(page) // on a phone the Ask panel covers the page

  // The president sees it, once they look; the question appears nowhere else.
  await viewAs(page, "alex")
  await page.goto("/#/handoff") // a hash change: the app, and its log, stay as they are
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const asked = page.getByRole("region", { name: "Treasurer handbook" }).getByTestId("asked-questions")
  await asked.getByRole("button", { name: "Refresh" }).click()
  await expect(asked).toContainText("1 asked · 1 not covered by the handbook")
  await expect(asked).toContainText("Quokkas zeppelin xylophone?")
  await expect(asked).toContainText("never sent to the AI")

  // Another officer does not see it; the next officer does.
  await viewAs(page, "jordan")
  await expect(page.getByRole("region", { name: "Treasurer handbook" }).getByTestId("asked-questions")).toHaveCount(0)
  await viewAs(page, "incoming:season:2026-10-26:r-fin")
  await expect(page.getByRole("region", { name: "Treasurer handbook" }).getByTestId("asked-questions")).toContainText("Quokkas zeppelin xylophone?")

  // Drafting again after the question was asked: the question is not in what goes to the AI, and not in the club's saved data.
  await viewAs(page, "alex")
  sentToAi = ""
  await page.getByRole("region", { name: "Treasurer handbook" }).getByRole("button", { name: "Draft role handbook" }).click()
  await expect(page.getByRole("region", { name: "Treasurer handbook" }).getByTestId("handbook-draft")).toContainText("Built from your sources")
  expect(sentToAi).toContain("\"sources\"") // the draft did go out, with the club's records
  expect(sentToAi).not.toContain("zeppelin")
  const saved = await page.evaluate(() => localStorage.getItem("platypus.v1.demo") ?? "")
  expect(saved).not.toContain("zeppelin")
})
