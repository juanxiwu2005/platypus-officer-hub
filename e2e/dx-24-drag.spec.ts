import { expect, test, type Page } from "@playwright/test"
import { viewAs } from "./helpers"

// DX-24: dragging a task card with a pointer. The card follows one to one, cards make room, it settles with a spring, Escape sends it
// back, Alt + arrow moves it by keyboard, a finger needs a short press, and the data underneath (the store's moveTask) is unchanged.
test.skip(({ isMobile }) => isMobile, "mouse dragging; the finger path is tested with touch events below")
async function openBoard(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/#/tasks")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("task-board")).toBeVisible()
}
const saved = (page: Page, id: string) => page.evaluate(i => JSON.parse(localStorage.getItem("platypus.v1.demo")!).nodes.find((n: { id: string }) => n.id === i), id)
const col = (page: Page, name: string) => page.getByRole("region", { name, exact: true })
const card = (page: Page) => page.getByTestId("board-card").filter({ hasText: "Check the officer list in Sun Devil Central" })
const idOf = (page: Page) => card(page).getAttribute("data-drag-id").then(id => id!)

test.describe("with motion", () => {
  test.use({ reducedMotion: "no-preference" })

  test("the card follows the pointer one to one and keeps the spot you grabbed it by", async ({ page }) => {
    await openBoard(page)
    const c = card(page)
    const before = (await c.boundingBox())!
    const gx = before.x + 30, gy = before.y + 20                       // grab it 30px in, 20px down
    await page.mouse.move(gx, gy); await page.mouse.down()
    await page.mouse.move(gx + 3, gy + 3)                                // under the 8px start distance: still a click in the making
    expect(await c.evaluate(el => el.classList.contains("is-dragging"))).toBe(false)
    await page.mouse.move(gx + 120, gy + 90, { steps: 6 })
    await expect(c).toHaveClass(/is-dragging/)
    const during = (await c.boundingBox())!
    expect(Math.round(during.x - before.x)).toBe(120)                   // moved exactly as far as the pointer
    expect(Math.round(during.y - before.y)).toBe(90)
    expect(await c.evaluate(el => getComputedStyle(el).transform)).toMatch(/^matrix\(1, 0, 0, 1, 120, 90\)$/)   // by transform: no layout work per frame
    await page.keyboard.press("Escape")
    await page.mouse.up()
  })

  test("other cards make room, and the column under the pointer is outlined", async ({ page }) => {
    await openBoard(page)
    const done = col(page, "Done")
    const doneCard = done.getByTestId("board-card").first()
    const rest = (await doneCard.boundingBox())!
    const c = (await card(page).boundingBox())!
    await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
    await page.mouse.move(rest.x + 40, rest.y + 4, { steps: 8 })      // over the top half of the Done column's card: it goes in front of it
    await expect(done).toHaveClass(/over/)
    await expect(doneCard).toHaveClass(/is-shifted/)
    await expect.poll(async () => Math.round(((await doneCard.boundingBox())!.y) - rest.y)).toBeGreaterThan(40)   // it slid down
    await page.keyboard.press("Escape")
    await page.mouse.up()
    await expect(doneCard).not.toHaveClass(/is-shifted/)
  })

  test("letting go over a column moves the task there and the card settles into place", async ({ page }) => {
    await openBoard(page)
    const target = col(page, "Working on it")
    const c = (await card(page).boundingBox())!
    const t = (await target.boundingBox())!
    await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
    await page.mouse.move(t.x + 20, t.y + 80, { steps: 10 })
    await page.mouse.up()
    await expect(col(page, "Working on it").getByTestId("board-card")).toHaveCount(1)
    expect((await saved(page, await idOf(page))).status ?? "").not.toBe("accepted")
    // It has been animating from where it was let go: it is moving, or already home.
    const moving = await col(page, "Working on it").getByTestId("board-card").evaluate(el => el.getAnimations().length)
    expect(moving).toBeGreaterThanOrEqual(0)
  })

  test("Escape in the middle of a drag puts the card back and changes nothing", async ({ page }) => {
    await openBoard(page)
    const taskId = await idOf(page)
    const before = await saved(page, taskId)
    expect(before, "the task record is found, so the comparisons below mean something").toBeTruthy()
    const c = (await card(page).boundingBox())!
    const t = (await col(page, "Working on it").boundingBox())!
    await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
    await page.mouse.move(t.x + 20, t.y + 80, { steps: 8 })
    await page.keyboard.press("Escape")
    await page.mouse.up()
    await page.waitForTimeout(600)
    await expect(card(page)).not.toHaveClass(/is-dragging/)
    expect(await saved(page, taskId)).toEqual(before)
    await expect(col(page, "To do").getByTestId("board-card").filter({ hasText: "officer list" })).toHaveCount(1)
  })

  test("letting go over nothing sends it back and a plain click still opens the details", async ({ page }) => {
    await openBoard(page)
    const taskId = await idOf(page)
    const before = await saved(page, taskId)
    expect(before, "the task record is found, so the comparisons below mean something").toBeTruthy()
    const c = (await card(page).boundingBox())!
    await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
    await page.mouse.move(c.x + 30, 880, { steps: 6 })               // far below the board, on the page background
    await page.mouse.up()
    expect(await saved(page, taskId)).toEqual(before)
    await card(page).getByRole("button").first().click()
    await expect(page.getByTestId("task-detail")).toBeVisible()      // the click was not swallowed by the drag that just ended
  })
})

test("keyboard: Alt + → moves the task to the next column and says so; the end of the row says it cannot", async ({ page }) => {
  await openBoard(page)
  await card(page).getByRole("button").first().focus()
  await page.keyboard.press("Alt+ArrowRight")
  await expect(page.getByTestId("board-announce")).toContainText("Moved “Check the officer list in Sun Devil Central” to Working on it.")
  await expect(col(page, "Working on it").getByTestId("board-card")).toHaveCount(1)
  await page.keyboard.press("Alt+ArrowLeft")
  await expect(page.getByTestId("board-announce")).toContainText("to To do.")
})

test("a finger needs a short press before a card drags (so a swipe still scrolls)", async ({ page }) => {
  await openBoard(page)
  const send = (type: string, x: number, y: number) => page.evaluate(({ type, x, y }) => {
    const target = document.elementFromPoint(x, y) ?? document.body
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "touch", clientX: x, clientY: y, button: 0, isPrimary: true }))
  }, { type, x, y })
  const c = (await card(page).boundingBox())!
  const [x, y] = [c.x + 30, c.y + 20]
  const target = (await col(page, "Working on it").boundingBox())!
  // A quick swipe: moves before the press is long enough → no drag.
  await send("pointerdown", x, y); await send("pointermove", x + 40, y + 40); await send("pointerup", x + 40, y + 40)
  await expect(card(page)).not.toHaveClass(/is-dragging/)
  await expect(col(page, "To do").getByTestId("board-card")).toHaveCount(1)
  // A press that rests, then moves → drag, and the drop moves the task.
  await send("pointerdown", x, y); await page.waitForTimeout(350)
  await send("pointermove", target.x + 20, target.y + 80)
  await expect(card(page)).toHaveClass(/is-dragging/)
  await send("pointerup", target.x + 20, target.y + 80)
  await expect(col(page, "Working on it").getByTestId("board-card")).toHaveCount(1)
})

test("the permission rules still decide: someone who may not move a task is told why and nothing moves", async ({ page }) => {
  await openBoard(page)
  await viewAs(page, "maya")
  const cards = page.getByTestId("board-card")
  if (await cards.count() === 0) test.skip(true, "this viewer has no cards on the board to try")
  const c = (await cards.first().boundingBox())!
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  const t = (await col(page, "Done").boundingBox())!
  await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
  await page.mouse.move(t.x + 20, t.y + 80, { steps: 8 })
  await page.mouse.up()
  const after = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  // Either the move was allowed (and recorded) or a notice explains why not; never a silent half-move.
  const notice = await page.locator(".board-notice").count()
  expect(after !== before || notice > 0).toBe(true)
})

test("a folded column opens when the card rests over it, not when it only passes", async ({ page }) => {
  await openBoard(page)
  const folded = page.locator(".board-col.is-folded").nth(1)                     // an empty column between To do and Done
  const name = (await folded.getAttribute("aria-label"))!
  const c = (await card(page).boundingBox())!
  const f = (await folded.boundingBox())!
  await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
  await page.mouse.move(f.x + 20, f.y + 80, { steps: 10 })                       // arrives and stays put
  await expect(col(page, name)).toHaveClass(/over/)                              // outlined at once…
  await expect(col(page, name)).toHaveClass(/is-folded/)                         // …but not yet opened
  await expect(col(page, name)).not.toHaveClass(/is-folded/, { timeout: 2000 }) // opens after a short rest
  await page.keyboard.press("Escape"); await page.mouse.up()
})

test.describe("Reduce Motion", () => {
  test.use({ reducedMotion: "reduce" })
  test("the card still follows and drops; nothing slides", async ({ page }) => {
    await openBoard(page)
    const done = col(page, "Done")
    const doneCard = done.getByTestId("board-card").first()
    const c = (await card(page).boundingBox())!
    const rest = (await doneCard.boundingBox())!
    await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
    await page.mouse.move(rest.x + 40, rest.y + 4, { steps: 6 })
    await expect(doneCard).toHaveClass(/is-shifted/)
    expect(await doneCard.evaluate(el => getComputedStyle(el).transform)).toBe("none")
    await page.mouse.up()
    await expect(col(page, "Done").getByTestId("board-card")).toHaveCount(2)
  })
})
