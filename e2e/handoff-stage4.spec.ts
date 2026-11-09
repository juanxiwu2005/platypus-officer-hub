import { expect, test } from "@playwright/test"

// Handoff stage 4 (docs/HANDOFF_EXECUTION_PLAN.md §6): role dossier, sectioned handbook, handover risk.
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
})

test("role cards are ordered by handover risk, riskiest first, and say why to a screen reader", async ({ page }) => {
  await page.goto("/#/handoff")
  const cards = page.getByTestId("role-handbooks").locator("button.relay")
  await expect(cards.first()).toBeVisible()
  const rank = { low: 0, medium: 1, high: 2 } as const
  const labels = await cards.locator("[aria-label^='Handover risk']").evaluateAll(els => els.map(e => e.getAttribute("aria-label") ?? ""))
  expect(labels.length).toBe(await cards.count()) // none of the sample roles is handed over yet
  const levels = labels.map(l => rank[(l.match(/Handover risk (low|medium|high)/)?.[1] ?? "low") as keyof typeof rank])
  expect(levels).toEqual([...levels].sort((a, b) => b - a))
  expect(new Set(levels).size).toBeGreaterThan(1)
  expect(labels[0]).toMatch(/open task/)
})

test("the dossier shows four blocks from the club's records, and every row opens its record", async ({ page }) => {
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  const dossier = role.getByTestId("role-dossier")
  await dossier.getByText("Role dossier").click()
  for (const block of ["calendar", "inFlight", "people", "lessons"]) await expect(dossier.getByTestId(`dossier-${block}`)).toBeVisible()
  await expect(dossier.getByTestId("dossier-calendar")).toContainText("Deadline: Chase the USG reimbursement")
  await expect(dossier.getByTestId("dossier-calendar")).toContainText("Standing step in every event")
  await expect(dossier.getByTestId("dossier-people")).toContainText("Jamie Ortiz")
  await expect(role.getByTestId("handoff-risk")).toContainText("Handover risk:")
  await dossier.getByTestId("dossier-calendar").getByRole("link", { name: /Chase the USG reimbursement/ }).click()
  await expect(page).toHaveURL(/#\/tasks\?node=t-usg/)
})

test("the handbook reads in sections, and the next 30 days list real deadlines", async ({ page }) => {
  let sent = ""
  await page.route("**/api/handbook/draft", r => {
    sent = r.request().postData() ?? ""
    return r.fulfill({ json: { entries: [{ sourceId: "task:t-recon" }, { sourceId: "contact:c-caterer" }, { sourceId: "deadline:t-usg" }, { sourceId: "interview:r-fin:1" }, { sourceId: "task:invented" }], model: "mock", provider: "mock", source: "ai" } })
  })
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  const draft = role.getByTestId("handbook-draft")
  await expect(draft).toBeVisible()
  const headings = await draft.locator("p.small > b").allTextContents()
  expect(headings).toEqual(["From the outgoing officer", "Calendar", "In flight", "People"])
  expect(sent).toMatch(/"kind":"deadline"/)
  expect(sent).not.toMatch(/example\.org|555-01|personalBuffer|busyWeeks/)
  await expect(draft).not.toContainText("invented")
  await expect(role.getByTestId("first-30-days")).toContainText("Deadline:")
})

test("when the AI fails, the built-in handbook still draws from several sections", async ({ page }) => {
  await page.route("**/api/handbook/draft", r => r.fulfill({ status: 502, json: { error: "bad_json", message: "x" } }))
  await page.goto("/#/handoff")
  await page.getByRole("button", { name: /^Treasurer handbook/ }).click()
  const role = page.getByRole("region", { name: "Treasurer handbook" })
  await role.getByRole("button", { name: "Draft role handbook" }).click()
  const draft = role.getByTestId("handbook-draft")
  await expect(draft).toContainText("Built from your sources")
  expect((await draft.locator("p.small > b").allTextContents()).length).toBeGreaterThanOrEqual(3)
})
