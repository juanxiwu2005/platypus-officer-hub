import { expect, test } from "@playwright/test"

// M4: constitution upload → AI reads it → departments and roles with who reports to whom. Since ob-6 the reading opens inline on Team.
const REPLY = {
  mission: "Help students build real startups with real founders.",
  roles: [
    { title: "President", reportsTo: null, isAdvisor: false },
    { title: "Executive Vice President", reportsTo: "President", isAdvisor: false },
    { title: "Vice President of Finance", reportsTo: "Executive Vice President", isAdvisor: false },
    { title: "Director of Marketing", reportsTo: "Executive Vice President", isAdvisor: false },
    { title: "Marketing Associate", reportsTo: "Director of Marketing", isAdvisor: false },
    { title: "Club Advisor", reportsTo: null, isAdvisor: true },
  ],
  notes: ["No Director of Outreach found."],
}
const DUTIES = { items: [{ name: "President", duties: "Leads the club." }, { name: "Executive Vice President", duties: "Supports the president." }, { name: "Vice President of Finance", duties: "Keeps the budget." }, { name: "Director of Marketing", duties: "Leads promotion." }, { name: "Marketing Associate", duties: "Helps with posting." }, { name: "Club Advisor", duties: "Advises the club." }] }

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})


import { continueSetup, finishSetup, openConstitution, openSetup, planEvent, setupRole } from "./setupHelpers"
import type { Page } from "@playwright/test"

/** Screen 1 with the name and Skip for now, then Team with "Import roles from your constitution" open. */
const toReading = async (page: Page) => {
  await openSetup(page)
  await page.getByRole("button", { name: "Skip for now", exact: true }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await openConstitution(page)
}

test("constitution roles and duties flow through the shared setup into saved roles and member invitations", async ({ page }) => {
  const sent: Record<string, unknown>[] = []
  await page.route("**/api/setup/constitution", r => { const b = r.request().postDataJSON(); sent.push(b); return r.fulfill({ json: b.part === "duties" ? DUTIES : REPLY }) })
  await openSetup(page)
  await planEvent(page)
  await page.getByRole("button", { name: "5 days", exact: true }).click()
  await continueSetup(page)
  await openConstitution(page)
  await page.getByLabel("Constitution file", { exact: true }).setInputFiles({ name: "constitution.txt", mimeType: "text/plain", buffer: Buffer.from("The President leads the club. The Director of Marketing leads promotion. Contact boss@example.org.") })
  await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI")
  await expect(page.locator(".ob-role")).toHaveCount(6)
  const marketing = await setupRole(page, "Director of Marketing")
  await marketing.getByRole("textbox", { name: /^Person/ }).fill("Sam Okafor")
  await marketing.getByRole("button", { name: "Edit duties", exact: true }).click()
  await expect(marketing.getByRole("textbox", { name: /^Duties/ })).toHaveValue("Leads promotion.")
  await expect(marketing.getByRole("combobox").locator("option:checked")).toHaveText("Executive Vice President")
  await expect(page.getByTestId("org-chart").locator(".org-card")).toHaveCount(6)
  expect(sent.map(b => b.part)).toEqual(["structure", "duties"])
  expect(JSON.stringify(sent)).not.toContain("boss@example.org")
  await finishSetup(page)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
  expect(saved.org.settings.clubBufferBusinessDays).toBe(5)
  expect(saved.org.mission).toBe(REPLY.mission)                          // the reading's mission (the walkthrough no longer asks for one)
  const role = saved.roles.find((r: { displayName: string }) => r.displayName === "Director of Marketing")
  expect(role.duties).toBe("Leads promotion.")
  expect(saved.people.find((p: { id: string }) => p.id === role.holderId).name).toBe("Sam Okafor")
  // The shared invitation link opens the member walkthrough (ob-6; the classic Join page is gone); ?person= picks the officer to preview.
  await page.goto(`/#/join?invite=${saved.org.inviteCode}&person=${role.holderId}`)
  await expect(page).toHaveURL(/#\/welcome\/member\/invitation\?/)
  await expect(page.getByTestId("role-card")).toContainText("Leads promotion.")
  await expect(page.getByLabel("Name")).toHaveValue("Sam Okafor")
})

test("local reading retains the hierarchy and supports manual role creation/removal", async ({ page }) => {
  await page.route("**/api/**", r => r.fulfill({ status: 503, json: {} }))
  await toReading(page)
  await page.getByRole("button", { name: /Use sample/ }).click()
  await expect(page.getByTestId("reading-note")).toBeVisible({ timeout: 15000 })
  await expect.poll(() => page.locator(".ob-role-title").evaluateAll(els => els.map(e => (e as HTMLTextAreaElement).value))).toContain("Executive Vice President")
  const count = await page.locator(".ob-role").count()
  const vp = await setupRole(page, "Executive Vice President")
  await expect(vp.getByRole("combobox").locator("option:checked")).toHaveText("President")
  await page.getByRole("button", { name: "Add role", exact: true }).click()
  await expect(page.locator(".ob-role")).toHaveCount(count + 1)
  await page.locator(".ob-role").last().getByRole("button", { name: /^Remove/ }).click()
  await expect(page.locator(".ob-role")).toHaveCount(count)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("failed structure requests retry, keep local roles, and allow a deliberate AI retry", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", r => {
    calls++
    return calls <= 3 ? r.fulfill({ status: 504, json: { message: "Timeout" } }) : r.fulfill({ json: r.request().postDataJSON().part === "duties" ? DUTIES : REPLY })
  })
  await toReading(page)
  await page.getByRole("button", { name: /Use sample/ }).click()
  await expect(page.getByRole("button", { name: "Try AI again", exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Try AI again", exact: true }).click()
  await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI")
  expect(calls).toBe(5)
})

test("structure and duty requests retry independently without dropping duties", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", r => {
    calls++
    return [1, 3].includes(calls) ? r.fulfill({ status: 504, json: {} }) : r.fulfill({ json: r.request().postDataJSON().part === "duties" ? DUTIES : REPLY })
  })
  await toReading(page)
  await page.getByRole("button", { name: /Use sample/ }).click()
  await expect(page.getByTestId("reading-note")).toContainText("Suggested by AI", { timeout: 15000 })
  expect(calls).toBe(4)
})
