import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { REMINDER_MODES } from "../src/data/reminderMode"
import { clubDraft } from "../src/data/settings"
import { seedDemo } from "../src/data/seed"
import { orgSteps } from "../src/engine/playbooks"
import { withOwners } from "../src/engine/workflow"
import { onboardingCopy as c } from "../src/onboarding/copy"
import { prepareEvent, previewFor } from "../src/onboarding/founder/firstEvent/plan"
import { exampleReminder } from "../src/onboarding/founder/reminderMode/example"
import { fillMission } from "./ob-helpers"

// FB-3 (docs/feedback-fix/PLAN.md 5 and 12.5): the second half of the founder walkthrough. The AI server is absent (404), so the local grammar
// reads the first event; nothing is ever sent. Runs on desktop and Pixel 7.
const r = c.founder.reminders
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)
const h1 = (page: Page, name: string) => expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
const next = (page: Page) => page.getByRole("button", { name: c.next, exact: true }).click()
const noSideScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
const words = (s: string) => s.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", q => q.fulfill({ status: 404, json: { message: "no server in this test" } }))
})

/** The study link, Name (with the mission), Team skipped, then First event: planned from an example, or skipped. Ends on Reminders. */
async function toReminders(page: Page, example: string | null = "Welcome mixer") {
  await page.goto("/#/start")
  await h1(page, c.founder.name.title)
  await page.getByLabel(c.founder.name.field).fill("Fictional Heron Club")
  await fillMission(page)
  await next(page)
  await page.getByRole("button", { name: c.skip }).click()                                  // Team
  const first = page.getByTestId("first-event")
  if (example) {
    await first.getByRole("button", { name: example }).click()
    await first.getByRole("button", { name: c.founder.firstEvent.cta }).click()
    await expect(page.getByRole("region", { name: c.founder.firstEvent.chainLabel })).toBeVisible()
    await next(page)
  } else await first.getByRole("button", { name: c.skip }).click()
  await h1(page, r.title)
}

test.describe("Reminders", () => {
  test("the example reminder uses the draft's officer, step and event, and the engine's Due", async ({ page }) => {
    await toReminders(page)
    const state = seedDemo(undefined, "v2"), club = { ...clubDraft(state), name: "Fictional Heron Club" }
    const planned = await prepareEvent(state, club, c.founder.firstEvent.examples[0].sentence)
    if (!planned.ok) throw new Error(planned.notice)
    const expected = exampleReminder(club, previewFor(state, club, planned.event, planned.date, "11111111-2222-3333-4444-555555555555", withOwners(orgSteps(state), club.roles), 3))
    expect(expected.due).not.toBeNull()
    const card = page.getByRole("figure", { name: r.exampleLabel })
    await expect(card).toHaveText(expected.text)
    await expect(card).toContainText(`Hi ${expected.name} — ${expected.step} for Welcome Mixer. Due `)
  })

  test("with First event skipped the example is the general sentence, with no date", async ({ page }) => {
    await toReminders(page, null)
    const card = page.getByTestId("reminder-example")
    await expect(card).toHaveText(/^Hi \S+ — your next task is ready\. Reply: Done · Waiting on… · Need help\.$/)
    expect(await card.innerText()).not.toMatch(/\d/)
  })

  test("each option shows its three steps, an analogy and what happens in Platypus; the study parts are unchanged", async ({ page }) => {
    await toReminders(page)
    const screen = page.getByTestId("reminder-mode")
    const opts = screen.locator(".ob-rm-opt")
    await expect(opts).toHaveCount(3)
    for (const [i, mode] of REMINDER_MODES.entries()) {
      const o = r.options[mode]
      const opt = opts.nth(i)
      await expect(opt.locator(".ob-rm-title")).toHaveText(o.title)
      await expect(opt.getByTestId("reminder-steps").locator(".fb3-rm-step")).toHaveText([...o.steps])
      await expect(opt.getByTestId("reminder-like")).toHaveText(o.like)
      await expect(opt.getByTestId("reminder-in-app")).toHaveText(o.inApp)
      await expect(opt.getByTestId(`reminder-mode-${mode}`)).not.toBeChecked()
    }
    await expect(screen.getByRole("button", { name: c.next, exact: true })).toBeDisabled()
    await expect(screen.getByTestId("reminder-mode-demo")).toHaveText(r.demo)
    await expect(screen.getByRole("button", { name: c.skip })).toBeVisible()
  })

  test("no accessibility problems, at most 140 words, no sideways scroll, 44px options on a phone", async ({ page, isMobile }) => {
    await toReminders(page, "Spring dinner")
    const text = await page.getByTestId("reminder-mode").innerText()
    expect(words(text), text).toBeLessThanOrEqual(140)
    expect(await scan(page)).toEqual([])
    await noSideScroll(page)
    if (isMobile) for (const opt of await page.locator(".ob-rm-opt").all()) expect((await opt.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
})
