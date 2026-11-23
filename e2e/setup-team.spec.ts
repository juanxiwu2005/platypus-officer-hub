import { expect, test } from "@playwright/test"
import { continueSetup, finishSetup, setupToTeam } from "./setupHelpers"
import { closeRail, resetDemo, viewAs } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})

test("the shared setup creates the workspace only after confirmation", async ({ page }) => {
  await setupToTeam(page)
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  await page.getByRole("textbox", { name: "Role 2", exact: true }).fill("VP of Finance")
  await continueSetup(page)
  await page.getByRole("button", { name: "Spring dinner", exact: true }).click()
  await page.getByRole("button", { name: "Plan it", exact: true }).click()
  await continueSetup(page)
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  await finishSetup(page)
  await page.goto("/#/team")
  await expect(page.getByText("VP of Finance", { exact: true }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText("VP of Finance", { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("first-event API dates are ignored and private profile/files stay out of the request", async ({ page }) => {
  let requestBody: Record<string, unknown> | null = null
  await page.unroute("**/api/command")
  await page.route("**/api/command", r => {
    requestBody = r.request().postDataJSON()
    return r.fulfill({ json: { source: "ai", ops: [{ op: "create_event", name: "Fictional API Dinner", type: "social", headcount: 30, venue: "campus", food: "offsite", funding: "usg", speaker: false, date: "2099-01-01", officialDeadline: "2098-01-01" }] } })
  })
  await setupToTeam(page); await continueSetup(page)
  await page.getByRole("button", { name: "Spring dinner", exact: true }).click()
  await page.getByRole("button", { name: "Plan it", exact: true }).click()
  await page.locator("summary").filter({ hasText: "Event details" }).click()
  await expect(page.getByLabel("Event name", { exact: true })).toHaveValue("Fictional API Dinner")
  await expect(page.getByLabel("Event date", { exact: true })).not.toHaveValue("2099-01-01")
  expect(requestBody).not.toBeNull()
  expect(JSON.stringify(requestBody)).not.toMatch(/personalBuffer|busyWeeks|dataUrl|files|careerGoal|phone/)
  await page.getByRole("button", { name: "Exit", exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).events.length)).toBe(3)
})

test("renaming a role saves itself, can be undone, and follows through team and handoff", async ({ page }) => {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles & teams", exact: true }).click()
  const settings = page.getByTestId("club-settings")
  await settings.getByRole("button", { name: "Contact list", exact: true }).click()
  await settings.getByRole("button", { name: "Edit roles", exact: true }).click()
  await settings.getByLabel("Role title", { exact: true }).nth(1).fill("Finance Chair")
  await expect(settings.getByRole("status")).toContainText("Saved")
  await settings.getByRole("button", { name: "Undo" }).click()
  await expect(settings.getByLabel("Role title", { exact: true }).nth(1)).toHaveValue("Treasurer")
  await settings.getByLabel("Role title", { exact: true }).nth(1).fill("VP of Finance")
  await expect(settings.getByRole("status")).toContainText("Saved")
  await page.goto("/#/team")
  await expect(page.getByText("VP of Finance", { exact: true }).first()).toBeVisible()
  await page.goto("/#/handoff")
  await expect(page.getByTestId("role-handbooks")).toContainText("VP of Finance")
  await expect(page.getByTestId("role-handbooks")).not.toContainText("Treasurer")
})

test("officer five-question setup saves preferences and busy weeks while private buffers stay personal", async ({ page }) => {
  const started = Date.now()
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Roles & teams", exact: true }).click()
  const settings = page.getByTestId("club-settings")
  await settings.getByText("Invite officers", { exact: true }).click()
  await settings.getByRole("link", { name: "Try officer setup", exact: true }).click()
  await expect(page.getByRole("navigation", { name: "Sections" })).toHaveCount(0)
  await page.getByRole("combobox", { name: "Try setup as", exact: true }).selectOption("maya")
  await page.getByRole("combobox", { name: "Preferred channel", exact: true }).selectOption("email")
  await page.getByRole("combobox", { name: "Reminder preference", exact: true }).selectOption("morning")
  await page.getByLabel("My extra working days", { exact: true }).fill("3")
  await page.getByLabel("A date in your busy week", { exact: true }).fill("2026-10-22")
  await page.getByRole("button", { name: "Add busy week", exact: true }).click()
  await page.getByRole("textbox", { name: "Expectations for this role", exact: true }).fill("Practice financial planning with this fictional team.")
  await page.getByRole("button", { name: "Save my setup", exact: true }).click()
  await expect(page.getByRole("heading", { name: "You're ready", exact: true })).toBeVisible()
  expect(Date.now() - started).toBeLessThan(120000)
  await page.getByRole("link", { name: "View my tasks as Maya Chen", exact: true }).click()
  await page.goto("/#/settings")
  await expect(page.getByTestId("club-settings")).toHaveCount(0)
  await expect(page.getByLabel("My extra working days", { exact: true })).toHaveValue("3")
  await viewAs(page, "alex")
  await page.getByRole("button", { name: "My preferences", exact: true }).click()
  await expect(page.getByLabel("My extra working days", { exact: true })).toHaveValue("1")
  await expect(page.getByTestId("my-settings")).not.toContainText("Week of 2026-10-19")
  await page.goto("/#/team")
  await expect(page.getByTestId("meeting-finder").getByRole("heading", { name: "Shared times", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("meeting finder uses shared slots and opens only an Arizona calendar draft", async ({ page }) => {
  await page.goto("/#/team")
  const finder = page.getByTestId("meeting-finder")
  await expect(finder.getByRole("heading", { name: "Shared times", exact: true })).toBeVisible()
  await expect(finder).toContainText("No shared time in the next two weeks")
  await finder.getByRole("checkbox", { name: "Sam Okafor", exact: true }).uncheck()
  await expect(finder.getByRole("button", { name: "18:30–19:00", exact: true }).first()).toBeVisible()
  await finder.getByRole("button", { name: "18:30–19:00", exact: true }).first().click()
  const href = (await finder.getByRole("link", { name: "Open Calendar draft for picked time", exact: true }).getAttribute("href"))!
  const params = new URL(href).searchParams
  expect(params.get("ctz")).toBe("America/Phoenix"); expect(params.has("add")).toBe(false)
  for (const checkbox of await finder.getByRole("checkbox").all()) await checkbox.uncheck()
  await expect(finder).toContainText("No shared time in the next two weeks")
  await expect(page.getByTestId("contribution-board")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("meeting finder: paint my week on the left, see the group on the right, pick a time", async ({ page }) => {
  await page.goto("/#/team")
  const finder = page.getByTestId("meeting-finder")
  const mine = finder.getByTestId("my-grid"), group = finder.getByTestId("group-grid")
  await expect(mine.getByRole("gridcell")).toHaveCount(196); await expect(group.getByRole("gridcell")).toHaveCount(196)
  // Alex is free Thu 6–8 pm; paint Friday 6:00–7:00 pm by dragging two half-hour cells.
  const cell = (grid: typeof mine, label: string) => grid.getByRole("gridcell", { name: label, exact: true })
  await cell(mine, "Fri 6:30 pm · not free").scrollIntoViewIfNeeded()
  const a = await cell(mine, "Fri 6:00 pm · not free").boundingBox(), b = await cell(mine, "Fri 6:30 pm · not free").boundingBox()
  await page.mouse.move(a!.x + 3, a!.y + 3); await page.mouse.down(); await page.mouse.move(b!.x + 3, b!.y + 3); await page.mouse.up()
  await expect(cell(mine, "Fri 6:00 pm · free")).toHaveCount(1); await expect(cell(mine, "Fri 6:30 pm · free")).toHaveCount(1)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).people.find((p: { id: string }) => p.id === "alex").availabilityOverrides["2026-10-30:20"])).toBe(true)
  await expect(group.getByRole("gridcell", { name: "Fri Oct 30 6:00 pm · 1 of 5 free", exact: true })).toHaveCount(1)
  // A second press-and-drag over the cell removes it; hovering never changes it.
  const remove = await cell(mine, "Fri 6:00 pm · free").boundingBox()
  await page.mouse.move(remove!.x + 3, remove!.y + 3); await page.mouse.down(); await page.mouse.up()
  await expect(cell(mine, "Fri 6:00 pm · not free")).toHaveCount(1)
  // Hover names who is free; click picks a time and offers a Calendar draft.
  await group.getByRole("gridcell", { name: "Thu Oct 29 6:00 pm · 4 of 5 free", exact: true }).hover()
  await expect(finder.getByRole("status").first()).toContainText("Free: Alex, Maya, Jordan, Priya · Not free: Sam")
  await group.getByRole("gridcell", { name: "Thu Oct 29 6:30 pm · 5 of 5 free", exact: true }).click()
  await expect(finder.getByTestId("picked-time")).toContainText("Thu Oct 29, 6:30 pm–7:00 pm · 5 of 5 free")
  const href = (await finder.getByRole("link", { name: "Open Calendar draft for picked time", exact: true }).getAttribute("href"))!
  expect(new URL(href).searchParams.get("dates")).toBe("20261029T183000/20261029T190000")
  // Keyboard: arrow keys move, Enter toggles my cell.
  await cell(mine, "Sat 8:00 am · not free").focus(); await page.keyboard.press("Enter")
  await expect(cell(mine, "Sat 8:00 am · free")).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("invalid defaults and expired invitations cannot change the local demo", async ({ page }) => {
  await page.goto("/#/settings")
  const settings = page.getByTestId("club-settings")
  await settings.getByTestId("tasks-events-settings").locator("summary").click()   // Club → More
  await settings.getByLabel("Private check day", { exact: true }).fill("4")
  await expect(settings.getByRole("status")).toContainText("must increase")
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.settings.silenceProtocol.presidentDay)).toBe(7)
  await page.getByRole("button", { name: "Roles & teams", exact: true }).click()
  await settings.getByText("Invite officers", { exact: true }).click()
  const href = await settings.getByRole("link", { name: "Try officer setup", exact: true }).getAttribute("href")
  await resetDemo(page)
  const resetState = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  await page.goto(href!)
  await expect(page.getByRole("heading", { name: "Check your setup invitation", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save my setup", exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(resetState)
})

test("task dates remain visible while another officer's buffer explanation stays private", async ({ page }) => {
  await page.goto("/#/events")
  await page.getByTestId("view-flow").click()
  await page.getByTestId("flow-node-purchaseRequest").click()
  const panel = page.getByTestId("task-detail")
  // FB-4: the one visible date is Due. FB-6 moved the dates; they are not asserted here. The universal Task Details
  // (docs/feedback-fix/TASK_DETAILS_UNIVERSAL_HANDOFF.md) dropped "Why this date", so the panel shows no planning dates or buffers at all.
  await expect(panel.getByTestId("task-due").locator("strong")).toHaveText(/^\w{3} \d+/)
  await expect(panel).not.toContainText(/Maya's personal buffer|Personal planning start|Start by/)
  // S3 removed the Events List view, whose per-step reminder note was the only place a personal buffer was named.
})

/** Audit §5.1: buttons inside a hover card can be clicked (fixed in S3: styles.css restores pointer-events). */
test("the contribution board drills down from its hover card", async ({ page }, info) => {
  await page.goto("/#/team")
  const row = page.getByTestId("contribution-board").locator("tbody tr").filter({ has: page.locator(".hover") }).first()
  const trigger = row.locator("[tabindex]")
  if (info.project.name === "mobile") await trigger.tap() // a phone cannot hover: a tap opens the card
  else await trigger.hover()
  const card = row.locator(".hover-card")
  await expect(card).toBeVisible()
  await card.getByRole("button").first().click()
  await expect(page.getByTestId("task-detail")).toBeVisible()
})

for (const width of [375, 390, 768]) {
  test(`Settings controls and organization chart remain operable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto("/#/settings")
    const activate = async (target: import("@playwright/test").Locator) => info.project.name === "mobile" ? target.tap() : target.click()
    const nav = page.getByRole("navigation", { name: "Settings sections" })
    for (const name of ["Roles & teams", "Workflow", "My preferences", "Admin", "Club", "Roles & teams"]) {
      const button = nav.getByRole("button", { name, exact: true })
      await activate(button)
      await expect(button).toHaveAttribute("aria-current", "page")
    }
    const settings = page.getByTestId("club-settings")
    await activate(settings.getByRole("button", { name: "Contact list", exact: true }))
    await activate(settings.getByRole("button", { name: "Edit roles", exact: true }))
    await settings.getByLabel("Role title", { exact: true }).nth(1).fill("Finance Chair")
    await expect(settings.getByRole("status")).toContainText("Saved")
    expect(await page.evaluate(() => innerWidth)).toBe(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
    await activate(settings.getByRole("button", { name: "Undo", exact: true }))
    await expect(settings.getByLabel("Role title", { exact: true }).nth(1)).toHaveValue("Treasurer")
    // The wide chart remains scrollable and readable; it is never an overlay over the invitation.
    await activate(settings.getByRole("button", { name: "Chart", exact: true }))
    const chart = settings.getByRole("group", { name: "Organization chart, scrolls sideways", exact: true })
    await chart.focus()
    await page.keyboard.press("End")
    await page.keyboard.press("ArrowRight")
    await expect(settings.getByTestId("org-chart")).toContainText("Secretary")
    if (width < 700) await expect.poll(() => chart.evaluate(e => e.scrollLeft)).toBeGreaterThan(0)
    await activate(settings.getByText("Invite officers", { exact: true }))
    await expect(settings.getByRole("link", { name: "Try officer setup", exact: true })).toBeVisible()
    await page.screenshot({ path: `output/playwright/wp04-settings-${width}-${info.project.name}.png`, fullPage: true })
    await activate(settings.getByRole("link", { name: "Try officer setup", exact: true }))
    await expect(page.getByRole("combobox", { name: "Try setup as", exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
}

test("Settings and officer setup keep drafts and report browser storage failure without claiming success", async ({ page }) => {
  await page.goto("/#/settings")
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  // Fail the real persistence boundary after the app has loaded a valid workspace.
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Object.defineProperty(window, "restoreDemoStorage", { value: () => { Storage.prototype.setItem = original } })
    Storage.prototype.setItem = function(key, value) {
      if (key === "platypus.v1.demo") throw new DOMException("Simulated full browser storage", "QuotaExceededError")
      original.call(this, key, value)
    }
  })
  const settings = page.getByTestId("club-settings")
  await settings.getByLabel("Club name", { exact: true }).fill("Fictional unsaved club")
  await expect(settings.getByRole("status")).toContainText("Saving failed")
  await expect(settings.getByRole("status")).not.toContainText("Saved")
  await expect(page.getByTestId("storage-banner")).toContainText("could not be saved")
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  await expect(settings.getByLabel("Club name", { exact: true })).toHaveValue("Fictional unsaved club")
  await page.getByRole("button", { name: "Roles & teams", exact: true }).click()
  await settings.getByText("Invite officers", { exact: true }).click()
  await settings.getByRole("link", { name: "Try officer setup", exact: true }).click()
  await page.getByRole("textbox", { name: "Expectations for this role", exact: true }).fill("Fictional unsaved preference")
  await page.getByRole("button", { name: "Save my setup", exact: true }).click()
  await expect(page.getByRole("heading", { name: "You're ready", exact: true })).toHaveCount(0)
  await expect(page.getByRole("alert").filter({ hasText: "Keep this tab open" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Expectations for this role", exact: true })).toHaveValue("Fictional unsaved preference")
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  await page.evaluate(() => (window as Window & { restoreDemoStorage: () => void }).restoreDemoStorage())
  await page.getByRole("button", { name: "Save my setup", exact: true }).click()
  await expect(page.getByRole("heading", { name: "You're ready", exact: true })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).people.find((p: { id: string }) => p.id === "maya").expectations)).toBe("Fictional unsaved preference")
})

test("a tampered invitation cannot reveal the setup form or change saved state", async ({ page }) => {
  await page.goto("/#/settings")
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  await page.goto("/#/join?invite=tampered&person=maya")
  await expect(page.getByRole("heading", { name: "Check your setup invitation", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save my setup", exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
})

test("meeting availability supports a real tap to add and remove a dated exception", async ({ page }, info) => {
  await page.goto("/#/team")
  const grid = page.getByTestId("my-grid")
  const cell = grid.getByRole("gridcell", { name: "Sat 8:00 am · not free", exact: true })
  if (info.project.name === "mobile") await cell.tap(); else await cell.click()
  const selected = grid.getByRole("gridcell", { name: "Sat 8:00 am · free", exact: true })
  await expect(selected).toHaveAttribute("aria-selected", "true")
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).people[0].availabilityOverrides["2026-10-31:0"])).toBe(true)
  if (info.project.name === "mobile") await selected.tap(); else await selected.click()
  await expect(cell).toHaveAttribute("aria-selected", "false")
})
