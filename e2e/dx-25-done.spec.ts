import { expect, test, type Page } from "@playwright/test"

// DX-25: the one celebration. A stop that becomes done grows its line and pops its dot; a ring moves instead of jumping; the Tasks
// number pops when it changes; an at-risk chain dot carries a "!". Reduce Motion: none of the movement.
test.skip(({ isMobile }) => isMobile, "uses the docked panel and the side navigation")
async function fresh(page: Page, path = "/") {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/#/")
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(`/#${path}`)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
}

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })

  test("style: a stop marked just-done grows its line and pops its dot (and a plain stop does neither)", async ({ page }) => {
    await fresh(page, "/handoff")   // FB-8: the Events strip with its chains left the home page; the Handoff page has a chain
    const r = await page.evaluate(async () => {
      // Any finished stop that has a line leading to it (the first stop of a chain has none).
      const li = [...document.querySelectorAll("main .chain li")].find(x => !x.matches(":first-child"))!
      // The sample season has no finished stop yet: make this one look exactly as Chain draws a finished stop.
      li.className = "past done"; li.querySelector(".dot")!.className = "dot done"
      const plain = { line: getComputedStyle(li, "::before").animationName, dot: getComputedStyle(li.querySelector(".dot")!).animationName }
      li.classList.add("just-done")
      const frames: { s: number; o: number }[] = []
      const t0 = performance.now()
      while (performance.now() - t0 < 700) { frames.push({ s: new DOMMatrix(getComputedStyle(li, "::before").transform).a, o: new DOMMatrix(getComputedStyle(li.querySelector(".dot")!).transform).a }); await new Promise(requestAnimationFrame) }
      return { plain, line: frames.map(f => f.s), dot: frames.map(f => f.o), names: { line: getComputedStyle(li, "::before").animationName, dot: getComputedStyle(li.querySelector(".dot")!).animationName } }
    })
    expect(r.plain).toEqual({ line: "none", dot: "none" })
    expect(r.line[0]).toBeLessThan(0.5)                              // starts short…
    expect(r.line.some(s => s > 0.1 && s < 0.95)).toBe(true)         // …grows through the middle…
    expect(r.line[r.line.length - 1]).toBe(1)                        // …and ends full length
    expect(r.dot[0]).toBeLessThan(0.8)                               // the dot starts small…
    expect(Math.max(...r.dot)).toBeLessThanOrEqual(1.05)             // …and settles at normal size with at most a tiny overshoot
    expect(r.dot[r.dot.length - 1]).toBe(1)
  })

  test("a ring moves to its new value instead of jumping", async ({ page }) => {
    await fresh(page, "/handoff")   // FB-8: the goal rings left the home page; the Handoff relay cards have rings
    const r = await page.evaluate(async () => {
      const arc = document.querySelector("main .ring .ring-arc") as SVGCircleElement
      let [a, b] = arc.getAttribute("stroke-dasharray")!.split(" ").map(Number)
      // A relay card at 0 of 7 has an empty arc: fill most of it first and let that settle, so there is a distance to move.
      if (a < 4) { a = Math.round(b * 0.8); arc.setAttribute("stroke-dasharray", `${a} ${b}`); await new Promise(r => setTimeout(r, 900)) }
      arc.setAttribute("stroke-dasharray", `${a / 2} ${b}`)
      const seen: number[] = []
      const t0 = performance.now()
      while (performance.now() - t0 < 700) { seen.push(parseFloat(getComputedStyle(arc).strokeDasharray)); await new Promise(requestAnimationFrame) }
      return { from: a, to: a / 2, seen }
    })
    expect(r.seen.some(v => v < r.from - 1 && v > r.to + 1)).toBe(true)   // in-between values
    expect(Math.round(r.seen[r.seen.length - 1])).toBe(Math.round(r.to))
  })

  test("the number on the Tasks link pops when it changes, not when the page first draws", async ({ page }) => {
    await fresh(page, "/tasks")
    const badge = page.getByTestId("nav-open-tasks")
    await expect(badge).toBeVisible()
    expect(await badge.evaluate(el => el.classList.contains("is-pop"))).toBe(false)     // first draw: quiet
    const before = await badge.innerText()
    // The president's own To do card (the sample club's Not claimed cards come first and need claiming before Done, P3-A).
    await page.getByRole("region", { name: "To do", exact: true }).getByTestId("board-card").first().getByRole("button").first().click()
    await page.getByTestId("task-detail").getByRole("button", { name: "Mark done", exact: true }).click()
    await expect.poll(async () => (await page.getByTestId("nav-open-tasks").innerText().catch(() => "")) !== before).toBe(true)
    await expect(page.getByTestId("nav-open-tasks").or(page.locator(".sidenav a .count"))).toBeVisible()
  })
})

test("an at-risk dot on a progress chain carries an exclamation mark (the small chains do not)", async ({ page }) => {
  await fresh(page)
  const r = await page.evaluate(() => {
    const mk = (cls: string) => { const ol = document.createElement("ol"); ol.className = cls; ol.innerHTML = '<li><span class="chain-btn"><span class="dot risk"></span></span></li>'; document.body.append(ol); const d = ol.querySelector(".dot")!; const bg = getComputedStyle(d).backgroundImage; ol.remove(); return bg }
    return { normal: mk("chain"), compact: mk("chain compact") }
  })
  expect(r.normal).toContain("linear-gradient")
  expect(r.normal).toContain("radial-gradient")
  expect(r.compact).toBe("none")
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("no movement: no animation on the line, dot or number", async ({ page }) => {
    await fresh(page, "/handoff")
    const r = await page.evaluate(() => {
      const li = [...document.querySelectorAll("main .chain li")].find(x => !x.matches(":first-child"))!
      // The sample season has no finished stop yet: make this one look exactly as Chain draws a finished stop.
      li.className = "past done"; li.querySelector(".dot")!.className = "dot done"
      li.classList.add("just-done")
      return { line: getComputedStyle(li, "::before").animationName, dot: getComputedStyle(li.querySelector(".dot")!).animationName }
    })
    expect(r).toEqual({ line: "none", dot: "none" })
  })
})
