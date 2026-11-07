import { expect, test, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { clubDraft } from "../src/data/settings"
import { seedDemo } from "../src/data/seed"
import { orgSteps } from "../src/engine/playbooks"
import { withOwners } from "../src/engine/workflow"
import { fmtShort } from "../src/lib/dates"
import { onboardingCopy } from "../src/onboarding/copy"
import { chainDots, prepareEvent, previewFor, wordCount } from "../src/onboarding/founder/firstEvent/plan"

// OB-06: the first-event screen (the witness moment). The walkthrough's other screens are still placeholders, so this opens the screen's own address.
const URL = "/#/welcome/founder/first-event"
const c = onboardingCopy.founder.firstEvent
const scan = async (page: Page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(" ")).join(" | ")}`)

// Every request the page makes, so a test can say what was NOT called.
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

const chain = (page: Page) => page.getByRole("region", { name: c.chainLabel })
const dotsText = (page: Page) => chain(page).getByRole("listitem").evaluateAll(els => els.map(e => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()))
const plan = async (page: Page, example = "Welcome mixer") => {
  await page.goto(URL)
  await expect(page.getByRole("heading", { level: 1, name: c.title })).toBeVisible()
  await page.getByRole("button", { name: example }).click()
  await page.getByRole("button", { name: c.cta }).click()
  await expect(chain(page)).toBeVisible()
}
/** A club whose workflow dates its steps by the ASU rules alone: the one case where the buffer changes dates (see the report). */
const byRuleDemo = () => {
  const s = seedDemo(undefined, "v2")
  const steps = orgSteps(s).map(x => x.anchor?.kind === "target" ? { ...x, anchor: undefined } : x)
  return { ...s, org: { ...s.org, eventWorkflow: { steps, updatedOn: s.today, summary: "Rules only (test)" } } }
}

test("fastest path: example, Plan it, a chain with rule-engine dates, Continue", async ({ page }) => {
  await plan(page)
  const items = await dotsText(page)
  expect(items.length).toBeGreaterThanOrEqual(3)
  expect(items.length).toBeLessThanOrEqual(6)
  // The dates on the page are exactly what the rule engine gives for this sentence (nothing else gives a date).
  const state = seedDemo(undefined, "v2"), club = clubDraft(state)
  const r = await prepareEvent(state, club, c.examples[0].sentence)
  if (!r.ok) throw new Error(r.notice)
  const expected = chainDots(previewFor(state, club, r.event, r.date, "11111111-2222-3333-4444-555555555555", withOwners(orgSteps(state), club.roles), 3)).map(d => `${d.title} ${fmtShort(d.date)}`)
  expect(items).toEqual(expected)
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeEnabled()
  await page.getByRole("button", { name: onboardingCopy.next }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/confirm$/)
})

test("before Plan it there is no chain, and Continue waits", async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByRole("textbox", { name: c.sentenceLabel })).toHaveValue(/Spring Kickoff Dinner on Apr 16/)   // the draft's own sentence is the default
  await expect(chain(page)).toHaveCount(0)
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeDisabled()
  await expect(page.getByText(c.details, { exact: true })).toHaveCount(0)
})

test("a sentence that is not one event says what to do and draws nothing", async ({ page }) => {
  await page.goto(URL)
  await page.getByRole("textbox", { name: c.sentenceLabel }).fill("What is the budget deadline?")
  await page.getByRole("button", { name: c.cta }).click()
  await expect(page.getByRole("status")).toHaveText(c.notEvent)
  await expect(chain(page)).toHaveCount(0)
})

test("the buffer is a five-way control; turning it re-plans the dates (a club whose steps follow the ASU rules)", async ({ page }) => {
  await page.addInitScript(demo => { if (!localStorage.getItem("platypus.v1.demo")) localStorage.setItem("platypus.v1.demo", JSON.stringify(demo)) }, byRuleDemo())
  await plan(page, "Spring dinner")
  const group = page.getByRole("group", { name: /Club buffer/ })
  await expect(group.getByRole("button")).toHaveCount(5)
  await expect(group.getByRole("button", { name: "3 days" })).toHaveAttribute("aria-pressed", "true")   // the draft's buffer
  await expect(page.getByTestId("buffer-example")).toBeVisible()
  const before = await dotsText(page)
  await group.getByRole("button", { name: "7 days" }).click()
  await expect(group.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(group.getByRole("button", { name: "3 days" })).toHaveAttribute("aria-pressed", "false")
  await expect.poll(() => dotsText(page)).not.toEqual(before)
  const seven = await dotsText(page)
  await group.getByRole("button", { name: "1 day" }).click()
  await expect.poll(() => dotsText(page)).not.toEqual(seven)
  // The choice is kept in the draft: Continue and Back bring the same value.
  await group.getByRole("button", { name: "5 days" }).click()
  await page.getByRole("button", { name: onboardingCopy.next }).click()
  await expect(page).toHaveURL(/confirm$/)
  await page.goBack()      // the Confirm screen is still a placeholder with no Back button of its own
  await expect(page).toHaveURL(/first-event$/)
  await expect(page.getByRole("group", { name: /Club buffer/ }).getByRole("button", { name: "5 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(chain(page)).toBeVisible()      // the planned event survives the round trip
})

test("with the standard workflow the buffer is saved but moves no date (the engine dates every step from a target)", async ({ page }) => {
  await plan(page)
  const before = await dotsText(page)
  await page.getByRole("button", { name: "7 days" }).click()
  await expect(page.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true")
  expect(await dotsText(page)).toEqual(before)
})

test("Event details are folded; a past date turns Continue off and says why, a good date brings the chain back", async ({ page }) => {
  await plan(page)
  const details = page.locator("details.ob6-details")
  await expect(details).not.toHaveAttribute("open", "")
  await details.getByText(c.details, { exact: true }).click()
  for (const label of [c.fields.name, c.fields.date, c.fields.type, c.fields.headcount, c.fields.venue, c.fields.food, c.fields.funding, c.fields.speaker]) await expect(details.getByLabel(label)).toBeVisible()
  await expect(details.getByLabel(c.fields.name)).toHaveValue("Welcome Mixer")
  const date = details.getByLabel(c.fields.date)
  await expect(date).toHaveValue("2027-03-05")
  await date.fill("2020-01-01")
  await expect(page.getByRole("alert")).toHaveText(c.dateError)
  await expect(chain(page)).toHaveCount(0)
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeDisabled()
  await date.fill("2027-03-12")
  await expect(chain(page)).toBeVisible()
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeEnabled()
  await details.getByLabel(c.fields.name).fill("Welcome Mixer 2")
  await details.getByLabel(c.fields.headcount).fill("55")
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeEnabled()
})

test("editing the sentence turns Continue off until Plan it is pressed again", async ({ page }) => {
  await plan(page)
  await page.getByRole("textbox", { name: c.sentenceLabel }).fill("Plan Spring Social on Apr 2, 20 people")
  await expect(page.getByRole("status")).toHaveText(c.stale)
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeDisabled()
  await page.getByRole("button", { name: c.cta }).click()
  await expect(page.getByRole("status")).toHaveText("")
  await expect(page.getByRole("button", { name: onboardingCopy.next })).toBeEnabled()
  await expect(page.locator("details.ob6-details").getByLabel(c.fields.name)).toHaveValue("Spring Social")
})

test("Back goes to the previous screen; Skip for now is there from the start (Phase 3: First event is optional)", async ({ page }) => {
  await page.goto(URL)
  await expect(page.getByRole("button", { name: onboardingCopy.skip })).toBeVisible()
  await expect(page.getByText(c.skipHint)).toBeVisible()
  await page.getByRole("button", { name: onboardingCopy.back }).click()
  await expect(page).toHaveURL(/#\/welcome\/founder\/team$/)
})

test("a screen of at most 60 words at a glance, with no sideways page scroll", async ({ page }) => {
  await page.goto(URL)
  const words = () => page.getByTestId("first-event").evaluate(el => (el as HTMLElement).innerText)
  expect(wordCount(await words())).toBeLessThanOrEqual(60)
  await plan(page, "Spring dinner")
  const text = await words()
  expect(wordCount(text), text).toBeLessThanOrEqual(60)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})

test("on a phone the buffer control, Plan it, Back and Continue are at least 44px", async ({ page, isMobile }) => {
  test.skip(!isMobile, "finger sizes")
  await plan(page)
  const boxes = await Promise.all([...[1, 2, 3, 5, 7].map(n => page.getByRole("button", { name: `${n} ${n === 1 ? "day" : "days"}` })), page.getByRole("button", { name: c.cta }), page.getByRole("button", { name: onboardingCopy.back }), page.getByRole("button", { name: onboardingCopy.next })].map(l => l.boundingBox()))
  for (const b of boxes) { expect(b!.height).toBeGreaterThanOrEqual(44); expect(b!.width).toBeGreaterThanOrEqual(44) }
  // A long chain scrolls inside its own box, not the page.
  const box = await chain(page).evaluate(el => ({ client: el.clientWidth, page: document.documentElement.scrollWidth, inner: window.innerWidth }))
  expect(box.page).toBeLessThanOrEqual(box.inner)
})

test.describe("no accessibility problems", () => {
  test("light: asking, planned, details open", async ({ page }) => {
    await page.goto(URL)
    expect(await scan(page)).toEqual([])
    await plan(page)
    expect(await scan(page)).toEqual([])
    await page.locator("details.ob6-details summary").click()
    expect(await scan(page)).toEqual([])
  })
  test("dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await plan(page)
    await page.locator("details.ob6-details summary").click()
    expect(await scan(page)).toEqual([])
  })
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("the whole chain is there at once: every dot fully visible, nothing animating", async ({ page }) => {
    await page.goto(URL)
    await page.getByRole("button", { name: "Welcome mixer" }).click()
    // Sample on the very first frame the chain exists.
    const r = await page.evaluate(async () => {
      (Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Plan it") as HTMLButtonElement).click()
      for (let i = 0; i < 300 && !document.querySelector(".ob6-chain"); i++) await new Promise(requestAnimationFrame)
      const dots = [...document.querySelectorAll(".ob6-dot")]
      return { count: dots.length, opacities: dots.map(d => getComputedStyle(d).opacity), names: dots.map(d => getComputedStyle(d).animationName), lines: [...document.querySelectorAll(".ob6-node")].map(li => getComputedStyle(li, "::before").animationName) }
    })
    expect(r.count).toBeGreaterThanOrEqual(3)
    expect(r.opacities.every(o => o === "1")).toBe(true)
    expect(r.names.every(n => n === "none")).toBe(true)
    expect(r.lines.every(n => n === "none")).toBe(true)
  })
})

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })
  /** Press Plan it inside the page and sample every frame for about a second: per dot opacity and per line scaleX. */
  const drawOnce = (page: Page) => page.evaluate(async () => {
    (Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Plan it") as HTMLButtonElement).click()
    for (let i = 0; i < 600 && !document.querySelector(".ob6-chain"); i++) await new Promise(requestAnimationFrame)
    const frames: { t: number; o: number[]; s: number[]; names: string[] }[] = []
    const t0 = performance.now()
    while (performance.now() - t0 < 1000) {
      frames.push({
        t: performance.now() - t0,
        o: [...document.querySelectorAll(".ob6-dot")].map(d => Number(getComputedStyle(d).opacity)),
        s: [...document.querySelectorAll(".ob6-node")].map(li => new DOMMatrix(getComputedStyle(li, "::before").transform).a),
        names: [...document.querySelectorAll(".ob6-dot")].map(d => getComputedStyle(d).animationName),
      })
      await new Promise(requestAnimationFrame)
    }
    return frames
  })
  const ready = async (page: Page) => { await page.goto(URL); await page.getByRole("button", { name: "Welcome mixer" }).click() }

  test("the chain draws once: dots appear in order through in-between opacities, lines grow, the whole thing is over within about a second", async ({ page }) => {
    await ready(page)
    const frames = await drawOnce(page)
    const n = frames[0].o.length
    expect(n).toBeGreaterThanOrEqual(3)
    expect(frames[0].names.every(x => x === "ob6-dot-in")).toBe(true)
    expect(frames.some(f => f.o.some(o => o > 0.05 && o < 0.95)), "a dot is caught between 0 and 1").toBe(true)
    expect(frames.some(f => f.s.some(s => s > 0.05 && s < 0.95)), "a line is caught part-grown").toBe(true)
    const firstFull = (i: number) => frames.findIndex(f => f.o[i] >= 0.99)
    for (let i = 1; i < n; i++) expect(firstFull(i), `dot ${i} is full after dot ${i - 1}`).toBeGreaterThanOrEqual(firstFull(i - 1))
    expect(firstFull(n - 1)).toBeGreaterThan(firstFull(0))
    const done = frames.find(f => f.o.every(o => o >= 0.99) && f.s.slice(1).every(s => s >= 0.99))
    expect(done, "everything fully drawn").toBeTruthy()
    expect(done!.t).toBeLessThan(800)
    expect(frames[frames.length - 1].names.every(x => x === "none"), "the animation class is gone afterwards").toBe(true)
  })

  test("pressing Plan it again in the middle restarts the drawing at once, and the buffer never replays it", async ({ page }) => {
    await ready(page)
    await page.getByRole("button", { name: c.cta }).click()
    await expect(chain(page)).toBeVisible()
    await expect.poll(() => page.locator(".ob6-dot").first().evaluate(d => getComputedStyle(d).animationName)).toBe("none")   // finished
    // Interrupt: press again, then look straight away; the first dot starts over (hidden or small), not at rest.
    const restarted = await page.evaluate(async () => {
      (Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Plan it") as HTMLButtonElement).click()
      for (let i = 0; i < 600 && !document.querySelector(".ob6-chain.is-drawing"); i++) await new Promise(requestAnimationFrame)
      const mid = [...document.querySelectorAll(".ob6-dot")].map(d => Number(getComputedStyle(d).opacity))
      // …and press once more while it is still drawing.
      const again = Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Plan it") as HTMLButtonElement
      again.click()
      for (let i = 0; i < 600 && document.querySelectorAll(".ob6-chain.is-drawing").length === 0; i++) await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
      return { mid, afterSecondPress: [...document.querySelectorAll(".ob6-dot")].map(d => Number(getComputedStyle(d).opacity)), drawing: !!document.querySelector(".ob6-chain.is-drawing") }
    })
    expect(restarted.mid[restarted.mid.length - 1]).toBeLessThan(1)         // the last dot has not appeared yet: it is drawing
    expect(restarted.drawing).toBe(true)
    expect(Math.min(...restarted.afterSecondPress)).toBeLessThan(1)         // started over, not queued behind the first run
    await expect.poll(() => page.locator(".ob6-dot").last().evaluate(d => getComputedStyle(d).animationName)).toBe("none")
    // The buffer answers at once and leaves the chain alone: the same list element, no animation class.
    await page.locator(".ob6-chain").evaluate(el => { (el as HTMLElement & { mark?: boolean }).mark = true })
    await page.getByRole("button", { name: "5 days" }).click()
    await expect(page.getByRole("button", { name: "5 days" })).toHaveAttribute("aria-pressed", "true")
    expect(await page.locator(".ob6-chain").evaluate(el => ({ same: (el as HTMLElement & { mark?: boolean }).mark === true, drawing: el.classList.contains("is-drawing") }))).toEqual({ same: true, drawing: false })
  })

  test("typing and turning the buffer add no movement: nothing but opacity or transform ever animates on this screen", async ({ page }) => {
    await ready(page)
    await page.getByRole("button", { name: c.cta }).click()
    await expect(chain(page)).toBeVisible()
    const props = await page.getByTestId("first-event").evaluate(root => {
      const bad: string[] = []
      for (const el of root.querySelectorAll("*")) {
        const cs = getComputedStyle(el)
        if (cs.transitionDuration.split(",").every(d => parseFloat(d) === 0)) continue      // nothing is timed here
        for (const p of cs.transitionProperty.split(",").map(x => x.trim())) if (!["opacity", "transform", "background-color", "border-color", "color", "box-shadow"].includes(p)) bad.push(`${el.tagName}.${(el as HTMLElement).className}: ${p}`)
      }
      return bad
    })
    expect(props).toEqual([])
  })
})

test("the buffer example is computed by the engine and changes with every choice", async ({ page }) => {
  await plan(page)
  const example = page.getByTestId("buffer-example")
  const seen: string[] = []
  for (const n of [1, 2, 3, 5, 7]) {
    await page.getByRole("button", { name: `${n} ${n === 1 ? c.day : c.days}` }).click()
    await expect(page.getByRole("button", { name: `${n} ${n === 1 ? c.day : c.days}` })).toHaveAttribute("aria-pressed", "true")
    seen.push((await example.innerText()).trim())
  }
  expect(new Set(seen).size).toBe(5)                         // five buffers, five different club dates
  expect(seen.every(t => /^ASU deadline \w{3}, \w{3} \d+, club deadline \w{3}, \w{3} \d+\.$/.test(t))).toBe(true)
})
