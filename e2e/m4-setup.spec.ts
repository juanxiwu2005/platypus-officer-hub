import { expect, test } from "@playwright/test"

// M4: constitution upload → AI reads it while the president fills in goals → departments and roles with who reports to whom.
const REPLY = {
  mission: "Help students build real startups with real founders.",
  departments: [{ name: "Leadership", duties: "Sets direction." }, { name: "Finance", duties: "AI finance duties." }, { name: "Marketing", duties: "Promotion and the newsletter." }],
  roles: [
    { title: "President", department: "Leadership", reportsTo: null, duties: "Leads the club.", isAdvisor: false },
    { title: "Executive Vice President", department: "Leadership", reportsTo: "President", duties: "Supports the president.", isAdvisor: false },
    { title: "Vice President of Finance", department: "Finance", reportsTo: "Executive Vice President", duties: "Keeps the budget.", isAdvisor: false },
    { title: "Director of Marketing", department: "Marketing", reportsTo: "Executive Vice President", duties: "Leads promotion.", isAdvisor: false },
    { title: "Marketing Associate", department: "Marketing", reportsTo: "Director of Marketing", duties: "Helps with posting.", isAdvisor: false },
    { title: "Club Advisor", department: "Advisory", reportsTo: null, duties: "Advises the club.", isAdvisor: true },
  ],
  notes: ["No Director of Outreach found."],
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})

test("constitution: upload, AI reads it in the background, departments and roles fill in, and it reaches every member", async ({ page }) => {
  const storage: string[] = []; let sent: Record<string, unknown> | null = null
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) storage.push(r.url()) })
  await page.route("**/api/setup/constitution", async r => { sent = r.request().postDataJSON(); await new Promise(res => setTimeout(res, 900)); await r.fulfill({ json: { ...REPLY, source: "ai", model: "mock", provider: "mock" } }) })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  await expect(step.getByLabel("Club mission")).toHaveCount(0)           // the mission moved to step 2
  await step.getByLabel("Constitution file", { exact: true }).setInputFiles({ name: "constitution.txt", mimeType: "text/plain", buffer: Buffer.from("The President leads the club. The Director of Marketing leads promotion. Contact boss@example.org.") })
  await expect(step.getByTestId("constitution-chip")).toContainText("constitution.txt")
  expect(sent).toBeNull()                                                  // nothing is sent until Continue
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("heading")).toHaveText("Step 2 of 6 · Semester goals")
  await expect(step.getByRole("status").first()).toContainText("Reading your constitution")
  await expect(step.getByRole("status").first()).toContainText("Suggested by AI")
  expect(Object.keys(sent!)).toEqual(["text"]); expect(String(sent!.text)).not.toContain("boss@example.org")
  await expect(step.getByLabel("Club mission")).toHaveValue("Help students build real startups with real founders.")
  await expect(step.getByRole("button", { name: /^Remove goal/ })).toHaveCount(3)
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByLabel("Department name")).toHaveCount(4)         // Leadership, Finance, Marketing, Advisory
  await expect(step.getByLabel("Department duties").nth(1)).toHaveValue("AI finance duties.")
  await expect(step).not.toContainText("Standard function")
  await step.getByLabel("Department duties").nth(1).fill("Keeps the budget and files every funding request.")
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByLabel("Role title")).toHaveCount(6)
  const marketing = step.getByRole("group", { name: /Director of Marketing/ })
  await expect(marketing.getByLabel("Department")).toHaveValue(/marketing/)
  await expect(marketing.getByLabel("Reports to").locator("option:checked")).toHaveText("Executive Vice President")
  await marketing.getByLabel("Officer name").fill("Sam Okafor")
  await marketing.getByLabel("Phone").fill("480-555-0107")
  await marketing.getByLabel("ASU ID").fill("9999000099")
  await expect(marketing.getByLabel("Role duties")).toHaveValue("Leads promotion.")
  await expect(step.getByLabel("Days before the real deadline")).toBeVisible()
  await step.getByLabel("Days before the real deadline").selectOption("5")
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByLabel("Club Google Drive folder (optional)")).toBeVisible()
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await step.getByRole("button", { name: "Prepare first workflow", exact: true }).click()
  await step.getByRole("checkbox", { name: "I reviewed this event and want to start this demo workspace." }).check()
  await step.getByRole("button", { name: "Approve & start workspace", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events")

  const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); const r = (t: string) => s.roles.find((x: { displayName: string }) => x.displayName === t)
    return { depts: s.org.departments.map((d: { name: string; duties: string }) => [d.name, d.duties]), buffer: s.org.settings.clubBufferBusinessDays, mission: s.org.mission, boss: s.roles.find((x: { id: string }) => x.id === r("Director of Marketing").reportsToId)?.displayName, duties: r("Director of Marketing").duties, holder: s.people.find((p: { id: string }) => p.id === r("Director of Marketing").holderId), advisorFn: r("Club Advisor").fn, first: s.roles[0].displayName } })
  expect(saved.depts).toContainEqual(["Finance", "Keeps the budget and files every funding request."])
  expect(saved).toMatchObject({ buffer: 5, boss: "Executive Vice President", duties: "Leads promotion.", advisorFn: "advisor", first: "President", mission: "Help students build real startups with real founders." })
  expect(saved.holder).toMatchObject({ name: "Sam Okafor", phone: "480-555-0107", asuId: "9999000099", email: "sam.okafor@example.org" })
  // The text read from the file is kept in this browser's own database.
  const stored = await page.evaluate(() => new Promise<string | null>(resolve => { const q = indexedDB.open("platypus.docs", 1); q.onsuccess = () => { const g = q.result.transaction("docs").objectStore("docs").get("constitution"); g.onsuccess = () => resolve(g.result?.text ?? null) } }))
  expect(stored).toContain("The Director of Marketing leads promotion")
  expect(storage).toEqual([])

  // Every member sees the same department and duties; the invitation page shows it before they start.
  const code = await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.inviteCode)
  await page.goto(`/#/join?invite=${code}`)
  await page.getByRole("combobox", { name: "Try setup as", exact: true }).selectOption({ label: "Sam Okafor · Director of Marketing" })
  await expect(page.getByTestId("role-card")).toContainText("Director of Marketing · Marketing · reports to Executive Vice President")
  await expect(page.getByTestId("role-card")).toContainText("Leads promotion.")
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles", exact: true }).click()
  await expect(page.getByTestId("club-settings").getByLabel("Department name")).toHaveCount(4)
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
  await expect(step.getByLabel("Department name").first()).toHaveValue("Leadership")
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
