import { expect, test } from "@playwright/test"

// M4: constitution upload → AI reads it while the president fills in goals → departments and roles with who reports to whom.
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

test("constitution: upload, AI reads it in the background, departments and roles fill in, and it reaches every member", async ({ page }) => {
  const storage: string[] = []; let sent: Record<string, unknown> | null = null; const parts: string[] = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) storage.push(r.url()) })
  await page.route("**/api/setup/constitution", async r => { const body = r.request().postDataJSON(); sent = body; parts.push(String(body.part)); await new Promise(res => setTimeout(res, 900)); await r.fulfill({ json: { ...(body.part === "duties" ? DUTIES : REPLY), model: "mock", provider: "mock" } }) })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  await expect(step.getByLabel("Club mission")).toHaveCount(0)           // the mission moved to step 2
  await step.getByLabel("Constitution file", { exact: true }).setInputFiles({ name: "constitution.txt", mimeType: "text/plain", buffer: Buffer.from("The President leads the club. The Director of Marketing leads promotion. Contact boss@example.org.") })
  await expect(step.getByTestId("constitution-chip")).toContainText("constitution.txt")
  expect(sent).toBeNull()                                                  // nothing is sent until Continue
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 2 of 6 · Semester goals")
  await expect(step.getByRole("status").first()).toContainText("Reading your constitution")
  await expect(step.getByRole("status").first()).toContainText("Suggested by AI from your constitution")
  expect(parts).toEqual(["structure", "duties"]);  /* structure first, then duties six positions at a time (six roles = one batch) */ expect(Object.keys(sent!).sort()).toEqual(["items", "part", "text"]); expect(String(sent!.text)).not.toContain("boss@example.org")
  await expect(step.getByLabel("Club mission")).toHaveValue("Help students build real startups with real founders.")
  await expect(step.getByRole("button", { name: /^Remove goal/ })).toHaveCount(3)
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step).not.toContainText("Department")
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 3 of 6 · Officer roles")
  await expect(step.getByLabel("Role title")).toHaveCount(6)
  const marketing = step.getByRole("group", { name: /Director of Marketing/ })
  await expect(marketing.getByLabel("Reports to").locator("option:checked")).toHaveText("Executive Vice President")
  await marketing.getByLabel("Officer name").fill("Sam Okafor")
  await marketing.getByLabel("Phone").fill("480-555-0107")
  await marketing.getByLabel("ASU ID").fill("9999000099")
  await expect(marketing.getByLabel("Role duties")).toHaveValue("Leads promotion.")
  // The organization chart sits under the last role and above the deadline question, with a card per role and a line to each boss.
  const chart = step.getByTestId("org-chart")
  await expect(chart).toBeVisible(); await expect(chart.locator(".org-card")).toHaveCount(6)
  await expect(chart.locator(".org-lines path:not(.advisory)")).toHaveCount(4); await expect(chart.locator(".org-lines path.advisory")).toHaveCount(1)           // every role but the president and the advisor reports to someone
  const box = (l: ReturnType<typeof step.locator>) => l.boundingBox().then(b => b!)
  expect((await box(step.getByRole("group", { name: /Club Advisor/ }))).y).toBeLessThan((await box(chart)).y)
  expect((await box(chart)).y).toBeLessThan((await box(step.getByLabel("Days before the real deadline"))).y)
  const card = (t: string) => chart.locator(".org-card", { hasText: t })
  expect((await box(card("President").first())).y).toBeLessThan((await box(card("Executive Vice President"))).y)
  expect((await box(card("Executive Vice President"))).y).toBeLessThan((await box(card("Director of Marketing"))).y)
  await marketing.getByLabel("Reports to").selectOption({ label: "President" })       // the chart follows the form
  expect((await box(card("Director of Marketing"))).y).toBeCloseTo((await box(card("Executive Vice President"))).y, 0)
  await marketing.getByLabel("Reports to").selectOption({ label: "Executive Vice President" })
  await expect(step.getByLabel("Days before the real deadline")).toBeVisible()
  await step.getByLabel("Days before the real deadline").selectOption("5")
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByLabel("Club Google Drive folder (optional)")).toBeVisible()
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 5 of 6 · Event workflow")
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await step.getByRole("button", { name: "Prepare first workflow", exact: true }).click()
  await step.getByRole("checkbox", { name: "I reviewed this event and want to start this demo workspace." }).check()
  await step.getByRole("button", { name: "Approve & start workspace", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events")

  const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); const r = (t: string) => s.roles.find((x: { displayName: string }) => x.displayName === t)
    return { hasDepartments: "departments" in s.org, buffer: s.org.settings.clubBufferBusinessDays, mission: s.org.mission, boss: s.roles.find((x: { id: string }) => x.id === r("Director of Marketing").reportsToId)?.displayName, duties: r("Director of Marketing").duties, holder: s.people.find((p: { id: string }) => p.id === r("Director of Marketing").holderId), advisorFn: r("Club Advisor").fn, first: s.roles[0].displayName } })
  expect(saved).toMatchObject({ hasDepartments: false, buffer: 5, boss: "Executive Vice President", duties: "Leads promotion.", advisorFn: "advisor", first: "President", mission: "Help students build real startups with real founders." })
  expect(saved.holder).toMatchObject({ name: "Sam Okafor", phone: "480-555-0107", asuId: "9999000099", email: "sam.okafor@example.org" })
  // The text read from the file is kept in this browser's own database.
  const stored = await page.evaluate(() => new Promise<string | null>(resolve => { const q = indexedDB.open("platypus.docs", 1); q.onsuccess = () => { const g = q.result.transaction("docs").objectStore("docs").get("constitution"); g.onsuccess = () => resolve(g.result?.text ?? null) } }))
  expect(stored).toContain("The Director of Marketing leads promotion")
  expect(storage).toEqual([])

  // Every member sees the same department and duties; the invitation page shows it before they start.
  const code = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.inviteCode)
  await page.goto(`/#/join?invite=${code}`)
  await page.getByRole("combobox", { name: "Try setup as", exact: true }).selectOption({ label: "Sam Okafor · Director of Marketing" })
  await expect(page.getByTestId("role-card")).toContainText("Director of Marketing · reports to Executive Vice President")
  await expect(page.getByTestId("role-card")).toContainText("Leads promotion.")
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles", exact: true }).click()
  await expect(page.getByTestId("club-settings").getByTestId("org-chart").locator(".org-card")).toHaveCount(6)
  await page.getByTestId("club-settings").getByRole("button", { name: "Edit roles", exact: true }).click()
  await expect(page.getByTestId("club-settings").getByLabel("Role title")).toHaveCount(6)
})

test("without AI the constitution is read in the browser, and roles can be added and removed by hand", async ({ page }) => {
  await page.route("**/api/setup/constitution", r => r.fulfill({ status: 503, json: { message: "No AI" } }))
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  await step.getByRole("button", { name: "Use the sample constitution", exact: true }).click()
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("status").first()).toContainText("read in your browser")
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByLabel("Role title")).toHaveCount(10)
  await expect(step.getByRole("group", { name: /Executive Vice President/ }).getByLabel("Reports to").locator("option:checked")).toHaveText("President")
  // A role cannot report to itself or to someone beneath it.
  await expect(step.getByRole("group", { name: /Executive Vice President/ }).getByLabel("Reports to").locator("option")).not.toContainText(["Vice President of Finance"])
  await step.getByRole("button", { name: "Add role", exact: true }).click()
  await expect(step.getByLabel("Role title")).toHaveCount(11)
  await step.getByRole("button", { name: "Remove role 11", exact: true }).click()
  await expect(step.getByLabel("Role title")).toHaveCount(10)
  await step.getByRole("group", { name: /Secretary/ }).getByLabel("ASU ID").fill("1234567890")
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("alert")).toContainText("fictional")
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("a failed piece is tried again, then the reason is shown, standard text fills in, and Try AI again works", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", async r => {
    calls++
    if (calls <= 3) return r.fulfill({ status: 504, json: { error: "timeout", message: "The AI took too long to answer." } })
    return r.fulfill({ json: { ...(r.request().postDataJSON().part === "duties" ? DUTIES : REPLY), model: "mock", provider: "mock" } })
  })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  await step.getByRole("button", { name: "Use the sample constitution", exact: true }).click()
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("status").first()).toContainText("AI could not read it (The AI took too long to answer)", { timeout: 12000 })
  await step.getByRole("button", { name: "Try AI again", exact: true }).click()
  await expect(step.getByRole("status").first()).toContainText("Suggested by AI from your constitution")
  await expect(step.getByLabel("Club mission")).toHaveValue("Help students build real startups with real founders.")
})

test("one slow or failed request is tried again on its own and the reading still finishes", async ({ page }) => {
  let calls = 0
  await page.route("**/api/setup/constitution", async r => {
    calls++
    if (calls === 1 || calls === 3) return r.fulfill({ status: 504, json: { error: "timeout", message: "The AI took too long to answer." } })   // the structure and then the first duties request fail once
    return r.fulfill({ json: { ...(r.request().postDataJSON().part === "duties" ? DUTIES : REPLY), model: "mock", provider: "mock" } })
  })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  await step.getByRole("button", { name: "Use the sample constitution", exact: true }).click()
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("status").first()).toContainText("Suggested by AI from your constitution", { timeout: 15000 })
  await expect(step.getByRole("status").first()).not.toContainText("could not")
  expect(calls).toBe(4)   // structure (failed, retried), duties (failed, retried)
})
