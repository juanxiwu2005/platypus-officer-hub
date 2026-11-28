import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { onboardingRecord } from "./ob-helpers"
import { onboardingCopy as c } from "../src/onboarding/copy"

// OB-09: finishing setup (Start workspace, on Team since ob-6; the Confirm screen is gone) and Invite (screen 3 of 3), then the hand-over to the
// member preview. Run on desktop and phone.
// The server is not there (404), so the first event is read by the local grammar. Nothing real is sent anywhere.
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)
type Saved = { viewerId: string; today: string; org: { name: string; mission: string; goals: unknown[]; inviteCode: string; setupCompletedOn: string | null }; events: { name: string; date: string }[]; roles: { id: string; fn: string; holderId: string | null; displayName: string }[]; people: { id: string; name: string; email: string; phone: string; setupCompletedOn: string | null }[] }
const demoRaw = (page: Page) => page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
const demo = async (page: Page) => JSON.parse((await demoRaw(page)) ?? "null") as Saved
const draftSaved = (page: Page) => page.evaluate(() => new Promise<boolean>(resolve => {
  const open = indexedDB.open("platypus.docs", 1)
  open.onupgradeneeded = () => { open.result.createObjectStore("docs", { keyPath: "id" }) }
  open.onerror = () => resolve(false)
  open.onsuccess = () => { const get = open.result.transaction("docs", "readonly").objectStore("docs").get("onboarding-draft"); get.onsuccess = () => { open.result.close(); resolve(!!get.result) }; get.onerror = () => resolve(false) }
}))
/** Words you see at once inside <main>: not the screen-reader-only text, and not the officers' names (they are bold). */
const words = (page: Page) => page.evaluate(() => {
  const count = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
  const main = document.querySelector("main")!
  const skip = [...main.querySelectorAll<HTMLElement>(".sr-only, .hover-card, .ob-i9-who b")].reduce((n, el) => n + count(el.innerText || el.textContent || ""), 0)
  return count(main.innerText) - skip
})

const requests = new WeakMap<Page, string[]>()
test.beforeEach(async ({ page }) => {
  const seen: string[] = []; requests.set(page, seen)
  page.on("request", r => seen.push(new globalThis.URL(r.url()).pathname))
  await page.route("**/api/**", r => r.fulfill({ status: 404, json: { message: "no server in this test" } }))
})
test.afterEach(async ({ page }) => {
  const seen = requests.get(page)!
  expect(seen.filter(p => /^\/api\/(org|workspace)/.test(p)), "no server storage").toEqual([])
  expect(seen.filter(p => p.startsWith("/api/") && p !== "/api/command" && p !== "/api/health"), "only existing interfaces").toEqual([])
})

const cont = (page: Page) => page.getByRole("button", { name: "Continue" }).click()
const START = c.founder.team.start
/** Begin a recorded walkthrough on the founder flow's first screen. */
const begin = async (page: Page) => {
  await page.goto("/?walkthrough=1#/welcome/start")                     // the same door Start walkthrough and Replay walkthrough use
  await expect(page.getByRole("heading", { level: 1, name: "Name your club" })).toBeVisible()
}
/** Screen 1 (name and the Welcome mixer) to Team, where Start workspace finishes setup since ob-6 (it was Confirm's button). */
const toTeam = async (page: Page, club = "Maple Club") => {
  await begin(page)
  await page.getByLabel("Club name").fill(club)
  await page.getByRole("button", { name: "Welcome mixer" }).click()
  await page.getByRole("button", { name: "Plan it" }).click()
  await expect(page.getByRole("region", { name: "First steps and dates" })).toBeVisible()
  await cont(page)
  await expect(page.getByRole("heading", { level: 1, name: c.founder.team.title })).toBeVisible()
}
const toInvite = async (page: Page, club?: string) => { await toTeam(page, club); await page.getByRole("button", { name: START }).click(); await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/) }

test("Name to Invite in three screens: Start workspace on Team creates the club, a double click creates it once, the saved draft is gone", async ({ page }) => {
  await toTeam(page)
  await expect(page.getByTestId("confirm-summary")).toHaveCount(0)      // ob-6: no Confirm screen
  await expect(page.getByTestId("replace-warning")).toHaveCount(0)      // the first time, nothing is replaced
  await page.getByRole("button", { name: START }).dblclick()
  await expect(page).toHaveURL(/#\/welcome\/founder\/invite$/)
  await expect(page.getByRole("heading", { level: 1, name: "Your club is ready." })).toBeVisible()
  await expect.poll(async () => (await demo(page)).org.name).toBe("Maple Club")
  const s = await demo(page)
  // The planned event once (the double click made one club), then the three sample event templates the workspace keeps (P3-A).
  expect(s.events.map(e => e.name)).toEqual(["Welcome Mixer", "Networking Night", "Spring Speaker Night", "Founder Dinner"])
  expect(s.org.setupCompletedOn).toBe(s.today)
  expect(s.org.inviteCode).toMatch(/^[0-9a-f-]{36}$/)
  expect(s.org.mission).toBe(c.founder.team.mission)                    // not asked any more: the standard line, editable in Settings
  expect(s.org.goals).toEqual([])                                       // and no goals are written
  await expect(page.locator(".ob-i9-link")).toHaveValue(new RegExp(`#/join\\?invite=${s.org.inviteCode}$`))
  const attempt = (await onboardingRecord(page)).attempts.at(-1)!
  expect(attempt.setupChoice).toBe("start-workspace")
  expect(attempt.steps.map(x => `${x.step}:${x.event}`)).toEqual(expect.arrayContaining(["founder.team:leave", "founder.invite:enter"]))
  await page.waitForTimeout(1500)                                       // past the draft's own save delay
  expect(await draftSaved(page), "the saved draft is deleted").toBe(false)
})

test("the replace warning and Keep current demo show only after a club was already set up", async ({ page }) => {
  await toInvite(page)
  await page.reload()                                                   // a fresh draft; the club made above stays
  await toTeam(page, "Second Club")
  await expect(page.getByTestId("replace-warning")).toHaveText("This replaces the current demo workspace.")
  // Keep current demo changes nothing and ends the attempt as exited.
  const before = await demoRaw(page)
  await page.getByRole("button", { name: c.founder.team.keep }).click()
  await expect(page).toHaveURL(/#\/$/)
  expect(await demoRaw(page)).toBe(before)
  const attempts = (await onboardingRecord(page)).attempts
  expect(attempts.at(-1)!.outcome).toBe("exited")
  expect(attempts.at(-1)!.setupChoice).toBe("keep-demo")
})

test("Start workspace refuses a draft without a ready event, and Back goes to the first screen", async ({ page }) => {
  await begin(page)
  await page.evaluate(() => { location.hash = "#/welcome/founder/confirm" })   // the old address goes to Team
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.getByRole("button", { name: START }).click()
  await expect(page.getByRole("alert")).toHaveText("Plan your first event before you start.")
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
  await page.getByRole("button", { name: "Back" }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  expect((await demo(page))?.org.setupCompletedOn ?? null, "nothing was created").toBeNull()
})

test("Back on Team returns to screen 1 with the plan still there", async ({ page }) => {
  await toTeam(page)
  await page.getByRole("button", { name: "Back" }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/name$/)
  await expect(page.getByRole("region", { name: "First steps and dates" })).toBeVisible()
  await expect(page.getByLabel("Club name")).toHaveValue("Maple Club")
})

test("Invite: three buttons, a short note, every officer Invited, Copy link says Copied, links are well formed", async ({ page, context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined)
  await toInvite(page)
  const s = await demo(page)
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible()
  const whatsapp = page.getByRole("link", { name: "WhatsApp" }), email = page.getByRole("link", { name: "Email" })
  await expect(whatsapp).toBeVisible(); await expect(email).toBeVisible()
  await expect(page.getByText("Only people with this link can join.")).toBeVisible()
  await expect(page.getByText("Nothing sends automatically.")).toHaveCount(0)                   // S6 copy: said once, not here
  await expect(page.getByText(/Demo only: Joined appears/)).toHaveCount(0)
  // The list: every role but the president; named officers are Invited, open positions have no status.
  const rows = page.getByRole("list", { name: "Officers" }).getByRole("listitem")
  const expectedRows = s.roles.filter(r => r.fn !== "president")
  await expect(rows).toHaveCount(expectedRows.length)
  for (const r of expectedRows) {
    const p = s.people.find(x => x.id === r.holderId)
    const row = rows.filter({ hasText: r.displayName }).first()
    if (p?.name.trim()) await expect(row.getByTestId("officer-status")).toHaveText("Invited")
    else { await expect(row).toContainText("Open position"); await expect(row.getByTestId("officer-status")).toHaveCount(0) }
  }
  await expect(page.getByRole("list", { name: "Officers" })).not.toContainText(s.people.find(p => p.id === s.roles.find(r => r.fn === "president")!.holderId)!.name)
  // No App chrome and no way back to the form.
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0)
  await expect(page.getByText(/View as|Ask/)).toHaveCount(0)
  // Links: encoded one-sentence message with the club name and the link, and no officer contact details.
  const link = await page.locator(".ob-i9-link").inputValue()
  expect(link).toBe(`${new globalThis.URL(page.url()).origin}/#/join?invite=${encodeURIComponent(s.org.inviteCode)}`)
  const message = `Join Maple Club on Platypus as an officer: ${link}`
  await expect(whatsapp).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(message)}`)
  await expect(email).toHaveAttribute("href", `mailto:?subject=${encodeURIComponent("Join Maple Club on Platypus")}&body=${encodeURIComponent(message)}`)
  for (const a of [whatsapp, email]) { await expect(a).toHaveAttribute("target", "_blank"); await expect(a).toHaveAttribute("rel", "noopener noreferrer") }
  const hrefs = decodeURIComponent((await whatsapp.getAttribute("href"))! + (await email.getAttribute("href"))!)
  for (const p of s.people) { if (p.email) expect(hrefs).not.toContain(p.email); if (p.phone) expect(hrefs).not.toContain(p.phone) }
  expect(hrefs.replaceAll(link, "")).not.toMatch(/@|\+?\d[\d\s().-]{6,}\d/)
  // Copy link.
  await page.getByRole("button", { name: "Copy link" }).click()
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText()).catch(() => link)).toBe(link)
})

test("Copy link without clipboard access selects the box and says what to do", async ({ page }) => {
  await toInvite(page)
  await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) }, configurable: true }) })
  await page.getByRole("button", { name: "Copy link" }).click()
  await expect(page.getByText("Press Ctrl+C to copy.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible()
  await expect(page.locator(".ob-i9-link")).toBeFocused()
})

test("See what your officers will see: the same attempt continues into the member preview, and Done marks that officer Joined", async ({ page }) => {
  await toInvite(page)
  const before = (await onboardingRecord(page)).attempts.length
  await page.getByRole("button", { name: "See what your officers will see" }).click()
  await expect(page).toHaveURL(/#\/welcome\/member\/invitation$/)
  await expect(page.getByTestId("role-card")).toBeVisible()
  expect((await onboardingRecord(page)).attempts.at(-1)!.outcome, "the attempt is still open").toBeUndefined()
  await cont(page); await cont(page)                                                           // Invitation, Reminders
  await expect(page).toHaveURL(/member\/busy-weeks$/)
  await cont(page)                                                                             // Busy weeks
  await expect(page).toHaveURL(/member\/done$/)
  await expect(page.getByTestId("first-task")).toBeVisible()
  await expect.poll(async () => (await demo(page)).people.filter(p => p.setupCompletedOn).length).toBeGreaterThan(0)
  const joined = (await demo(page)).people.find(p => p.setupCompletedOn)!
  // Back on the Invite screen that officer reads Joined.
  await page.evaluate(() => { location.hash = "#/welcome/founder/invite" })
  await expect(page.getByTestId("officer-status").filter({ hasText: "Joined" })).toHaveCount(1)
  await expect(page.getByRole("list", { name: "Officers" })).toContainText(joined.name)
  await page.evaluate(() => { location.hash = "#/welcome/member/done" })
  await page.getByRole("button", { name: "Open my tasks" }).click()
  await expect(page).toHaveURL(/#\/tasks$/)
  const record = await onboardingRecord(page)
  expect(record.attempts, "one attempt for the whole walkthrough").toHaveLength(before)
  const attempt = record.attempts.at(-1)!
  expect(attempt.outcome).toBe("completed")
  const steps = attempt.steps.map(s => s.step)
  expect(attempt.flowVersion).toBe("ob-6")
  for (const gone of ["founder.reminders", "founder.constitution", "founder.goals", "founder.first-event", "founder.confirm", "member.you", "member.about"]) expect(steps, gone).not.toContain(gone)
  for (const id of ["founder.name", "founder.team", "founder.invite", "member.invitation", "member.reminders", "member.busy-weeks", "member.done"]) expect(steps, id).toContain(id)
})

test("Go to Reminders ends the walkthrough as completed", async ({ page }) => {
  await toInvite(page)
  await page.getByRole("button", { name: "Go to Reminders" }).click()
  await expect(page).toHaveURL(/#\/$/)
  expect((await onboardingRecord(page)).attempts.at(-1)!.outcome).toBe("completed")
})

test("both screens have no accessibility problems, in light and dark, and stay inside their word budgets", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await toTeam(page)
    expect(await scan(page), `team ${scheme}`).toEqual([])
    await page.getByRole("button", { name: START }).click()
    await expect(page).toHaveURL(/founder\/invite$/)
    expect(await scan(page), `invite ${scheme}`).toEqual([])
    expect(await words(page), "invite words").toBeLessThanOrEqual(60)
    const box = await page.locator("main").evaluate(el => ({ over: el.scrollWidth > el.clientWidth + 1 }))
    expect(box.over, "no sideways scroll").toBe(false)
  }
})

test("Invited changes to Joined with a fade only; with reduced motion it is simply there", async ({ page }) => {
  await toInvite(page)
  await page.getByRole("button", { name: "See what your officers will see" }).click()
  for (let i = 0; i < 3; i++) await cont(page)                        // Invitation, Reminders, Busy weeks
  await expect(page).toHaveURL(/member\/done$/)
  await expect(page.getByTestId("first-task")).toBeVisible()
  await expect.poll(async () => (await demo(page)).people.filter(p => p.setupCompletedOn).length).toBeGreaterThan(0)
  for (const motion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion: motion })
    await page.evaluate(() => { location.hash = "#/welcome/founder/invite" })
    const status = page.getByTestId("officer-status").filter({ hasText: "Joined" })
    await expect(status).toHaveCount(1)
    const style = await status.evaluate(el => { const cs = getComputedStyle(el); return { name: cs.animationName, transform: cs.transform, duration: cs.animationDuration } })
    expect(style.transform).toBe("none")
    if (motion === "reduce") expect(parseFloat(style.duration) * (style.duration.endsWith("ms") ? 1 : 1000)).toBeLessThanOrEqual(1)
    await page.evaluate(() => { location.hash = "#/welcome/member/done" })
  }
})
