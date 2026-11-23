import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// OB-07: the first two screens of the member preview (Invitation, with the name and email since ob-6, and Reminders). Run on desktop and phone.
const INVITATION = "/#/welcome/member/invitation"
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => v.id)
const MEMBER_KEY = "platypus.v1.onboarding.member"
const choice = (page: Page) => page.evaluate(key => JSON.parse(sessionStorage.getItem(key) ?? "null") as Record<string, unknown> | null, MEMBER_KEY)
/** Words a person can read inside <main> (the strip, the card and the bottom bar). */
const words = (page: Page) => page.evaluate(() => (document.querySelector("main")!.innerText.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))).length)
const club = (page: Page) => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo") ?? "null"); return s && { viewerId: s.viewerId, people: s.people } })
const toReminders = async (page: Page) => { await page.goto(INVITATION); await page.getByRole("button", { name: "Continue" }).click(); await expect(page).toHaveURL(/member\/reminders$/) }

test("Invitation shows the club, the role, its reports-to line and duties", async ({ page }) => {
  await page.goto(INVITATION)
  const orgName = (await page.locator("main h1").innerText()).trim()
  expect(orgName.length).toBeGreaterThan(2)
  await expect(page.getByTestId("invite-line")).toHaveText("Alex Rivera invited you to be Treasurer")
  const card = page.getByTestId("role-card")
  await expect(card).toContainText("Treasurer")
  await expect(card).toContainText("Reports to President")
  await expect(card).toContainText("budget")
  await expect(page.getByTestId("member-strip")).toContainText("Previewing as Maya Chen")
  await expect(page.locator("main li")).toHaveCount(3)
  await expect(page.locator("main")).toContainText("Nothing is sent automatically")
  expect(await words(page)).toBeLessThanOrEqual(60)
})
test("Change switches the previewed officer and the role card follows", async ({ page }) => {
  await page.goto(INVITATION)
  await page.getByRole("button", { name: "Change" }).click()
  await page.getByRole("combobox", { name: "Preview as" }).selectOption({ label: "Jordan Patel · Events lead" })
  await expect(page.getByTestId("member-strip")).toContainText("Previewing as Jordan Patel")
  await expect(page.getByTestId("invite-line")).toContainText("to be Events lead")
  await expect(page.getByTestId("role-card")).toContainText("venue")
  expect((await choice(page))?.personId).toBe("jordan")
})
test("an invitation that does not match shows the new wording and a next step", async ({ page }) => {
  await page.goto(`${INVITATION}?invite=nope`)
  await expect(page.getByRole("heading", { name: "This invitation link isn't working. Ask your president to send a new one." })).toBeVisible()
  await expect(page.getByText("Open the link in the browser where the club was set up.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0)
  await page.goto(`${INVITATION}?person=nobody`)
  await expect(page.getByTestId("invalid-invite")).toBeVisible()
  await page.getByRole("link", { name: "Use this browser's invitation" }).click()
  await expect(page.getByTestId("role-card")).toBeVisible()
  await page.goto(INVITATION + "?person=sam")
  await expect(page.getByTestId("invite-line")).toContainText("Marketing lead")
})
test("Invitation asks for the name and email (the You screen up to ob-5): prefilled, editable, and checked like Settings", async ({ page }) => {
  await page.goto(INVITATION)
  await expect(page.getByLabel("Name")).toHaveValue("Maya Chen")
  await expect(page.getByLabel("Email")).toHaveValue("maya.chen@example.org")
  await expect(page.getByTestId("member-strip")).not.toContainText("Fictional demo. Choosing a name does not verify an identity.")   // the Demo strip says it once
  await expect(page.getByRole("button", { name: "Not you?" })).toHaveCount(0)                    // one name per thing: Change, in the strip
  await page.getByLabel("Email").fill("maya@gmail.com")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("alert")).toContainText("example.org")
  await expect(page).toHaveURL(/member\/invitation$/)
  await page.getByLabel("Name").fill("")
  await page.getByLabel("Email").fill("maya.c@example.org")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("alert")).toBeVisible()
  await page.getByLabel("Name").fill("Alex Rivera")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("alert")).toContainText("distinct")
  await page.getByLabel("Name").fill("Maya C.")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(/member\/reminders$/)
  expect(await choice(page)).toMatchObject({ v: 1, personId: "maya", name: "Maya C.", email: "maya.c@example.org" })
})
test("Change opens the picker and the form shows the other officer", async ({ page }) => {
  await page.goto(INVITATION)
  await page.getByRole("button", { name: "Change" }).click()
  const picker = page.getByRole("combobox", { name: "Preview as" })
  await expect(picker).toBeFocused()
  await picker.selectOption({ label: "Sam Okafor · Marketing lead" })
  await expect(page.getByLabel("Name")).toHaveValue("Sam Okafor")
  await expect(page.getByLabel("Email")).toHaveValue("sam.okafor@example.org")
})
test("Reminders: the phone appears only for WhatsApp or SMS, with its purpose, and there is no ASU ID", async ({ page }) => {
  await toReminders(page)
  const channels = page.getByRole("radiogroup", { name: "Where should reminders go?" })
  await expect(channels.getByRole("radio")).toHaveCount(3)
  // Maya's own first choice is WhatsApp, so the phone is already there.
  await expect(channels.getByRole("radio", { name: "WhatsApp" })).toBeChecked()
  await expect(page.getByTestId("phone-field")).toContainText("So your president can open a prewritten message.")
  await expect(page.getByTestId("phone-field")).not.toContainText("Nothing is sent automatically.")   // said once, on Invitation
  await channels.getByRole("radio", { name: "Email" }).check()
  await expect(page.getByTestId("phone-field")).toHaveCount(0)
  expect(await words(page)).toBeLessThanOrEqual(40)
  await channels.getByRole("radio", { name: "SMS" }).check()
  await expect(page.getByLabel("Phone (optional)")).toBeVisible()
  await channels.getByRole("radio", { name: "WhatsApp" }).check()
  await expect(page.getByLabel("Phone (optional)")).toBeVisible()
  await expect(page.getByLabel(/ASU/i)).toHaveCount(0)
  await expect(page.locator("main")).not.toContainText(/ASU ID/i)
})
test("Reminders: a phone must be a 555-01xx number, and it is dropped again if Email is chosen", async ({ page }) => {
  await toReminders(page)
  await page.getByLabel("Phone (optional)").fill("480-123-4567")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByRole("alert")).toContainText("555-01xx")
  await page.getByLabel("Phone (optional)").fill("480-555-0142")
  expect((await choice(page))?.phone).toBe("480-555-0142")
  await page.getByRole("radio", { name: "Email" }).check()
  expect(await choice(page)).not.toHaveProperty("phone")
  await page.getByRole("radio", { name: "SMS" }).check()
  await page.getByLabel("Phone (optional)").fill("")
  await page.getByRole("button", { name: "Continue" }).click()   // blank is allowed
  await expect(page).toHaveURL(/member\/busy-weeks$/)
})
test("the example reminder changes with the channel and the time, and sends nothing", async ({ page }) => {
  const requests: string[] = []
  page.on("request", r => { if (!/^(data|blob):/.test(r.url()) && r.method() !== "GET") requests.push(`${r.method()} ${r.url()}`) })
  await toReminders(page)
  const bubble = page.getByTestId("sample-reminder").locator(".ob-m-bubble")
  await expect(bubble).toHaveClass(/is-whatsapp/)
  await expect(bubble).toContainText("Hi Maya")
  await expect(bubble).toContainText("this evening")   // Maya's own time
  await page.getByRole("radio", { name: "Morning" }).check()
  await expect(bubble).toContainText("this morning")
  await page.getByRole("radio", { name: "SMS" }).check()
  await expect(bubble).toHaveClass(/is-sms/)
  await page.getByRole("radio", { name: "Email" }).check()
  await expect(bubble).toHaveClass(/is-email/)
  await expect(bubble).toContainText("Reply “got it” when done.")
  await expect(page.getByTestId("sample-reminder")).toContainText("Example")
  expect(requests).toEqual([])
})
test("Continue and Back walk through the two screens", async ({ page }) => {
  await page.goto(INVITATION)
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0)
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(/member\/reminders$/)
  await expect(page.getByRole("list", { name: "Walkthrough progress" }).locator("[aria-current=step]")).toContainText("Reminders")
  await page.getByRole("button", { name: "Back" }).click()
  await expect(page).toHaveURL(/member\/invitation$/)
  await expect(page.getByLabel("Name")).toHaveValue("Maya Chen")
})
test("the preview keeps its choices in sessionStorage only, changes nothing in the club, and calls no server", async ({ page }) => {
  const calls: string[] = []
  page.on("request", r => { if (/\/api\/(org|workspace)/.test(r.url())) calls.push(r.url()) })
  await page.goto(INVITATION)
  await page.getByRole("button", { name: "Continue" }).click()   // the club is created by now
  await expect(page).toHaveURL(/member\/reminders$/)
  const before = await club(page)
  await page.getByRole("radio", { name: "Email" }).check()
  await page.getByRole("radio", { name: "Morning" }).check()
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page).toHaveURL(/member\/busy-weeks$/)
  const saved = await choice(page)
  expect(saved).toEqual({ v: 1, personId: "maya", name: "Maya Chen", channel: "email", remindAt: "morning" })
  expect(Object.keys(saved!).every(k => ["v", "personId", "name", "email", "phone", "channel", "remindAt"].includes(k))).toBe(true)
  expect(await page.evaluate(key => localStorage.getItem(key), MEMBER_KEY)).toBeNull()
  expect(await club(page)).toEqual(before)   // viewer and every person exactly as before: nothing was saved
  expect(calls).toEqual([])
})
test("the screens fit the phone: no sideways scroll, big tap targets, the main button in reach", async ({ page }) => {
  for (const path of ["invitation", "reminders"]) {
    await page.goto(`/#/welcome/member/${path}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const next = page.getByRole("button", { name: "Continue" })
    const box = (await next.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    const view = page.viewportSize()!
    expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1)   // sticky: visible without scrolling, even when the card is taller than the screen
  }
  await page.goto("/#/welcome/member/reminders")
  for (const row of await page.locator(".ob-m-opt").all()) expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  for (const label of await page.locator(".ob-m-seg label").all()) expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44)
})
test("no accessibility problems on both screens, in light and dark", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    for (const path of ["invitation", "reminders"]) {
      await page.goto(`/#/welcome/member/${path}`)
      await expect(page.locator("main h1")).toBeVisible()
      expect(await scan(page), `${path} ${scheme}`).toEqual([])
    }
    await page.getByRole("radio", { name: "Email" }).check()
    expect(await scan(page), `reminders email ${scheme}`).toEqual([])
    await page.goto(`${INVITATION}?invite=nope`)
    expect(await scan(page), `invalid ${scheme}`).toEqual([])
    await page.goto(INVITATION)
    await page.getByRole("button", { name: "Change" }).click()
    expect(await scan(page), `picker ${scheme}`).toEqual([])
  }
})
test("the example bubble only fades; with reduced motion it changes at once", async ({ page }) => {
  await toReminders(page)
  await page.emulateMedia({ reducedMotion: "no-preference" })
  const during = await page.evaluate(async () => {
    const radio = [...document.querySelectorAll<HTMLInputElement>("input[name=channel]")].find(r => r.value === "sms")!
    radio.click()
    const seen: { opacity: number; transform: string }[] = []
    for (let i = 0; i < 12; i++) { await new Promise(r => requestAnimationFrame(r)); const cs = getComputedStyle(document.querySelector(".ob-m-bubble")!); seen.push({ opacity: Number(cs.opacity), transform: cs.transform }) }
    return seen
  })
  expect(during.some(s => s.opacity > 0 && s.opacity < 1)).toBe(true)   // a real fade
  expect(during.every(s => s.transform === "none")).toBe(true)           // and no movement
  expect(during.at(-1)!.opacity).toBe(1)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.getByRole("radio", { name: "Email" }).check()
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".ob-m-bubble")!).animationDuration))).toBeLessThan(0.01)
  // choosing a row does not move it
  expect(await page.locator(".ob-m-opt").first().evaluate(el => getComputedStyle(el).transform)).toBe("none")
})
test("a wrong or missing stored choice falls back to the first officer who is not the president", async ({ page }) => {
  await page.goto(INVITATION)
  await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ v: 1, personId: "ghost", asuId: "9999000001", secret: "x" })), MEMBER_KEY)
  await page.reload()
  await expect(page.getByTestId("member-strip")).toContainText("Previewing as Maya Chen")
  await page.evaluate(key => sessionStorage.setItem(key, "{not json"), MEMBER_KEY)
  await page.reload()
  await expect(page.getByTestId("member-strip")).toContainText("Previewing as Maya Chen")
})
