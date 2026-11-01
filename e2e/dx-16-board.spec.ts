import { expect, test, type Page } from "@playwright/test"

// DX-16: on a computer an empty board column folds into a strip so all six columns fit; a phone is left alone.
async function openBoard(page: Page) {
  await page.goto("/#/tasks")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("task-board")).toBeVisible()
}
const boxes = (page: Page) => page.evaluate(() => {
  const board = document.querySelector("[data-testid=task-board]")!.getBoundingClientRect()
  return {
    board: { left: Math.round(board.left), right: Math.round(board.right) },
    cols: [...document.querySelectorAll(".board-col")].map(c => { const r = c.getBoundingClientRect(); return { name: c.getAttribute("aria-label"), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), folded: c.classList.contains("is-folded") } }),
  }
})

test.describe("computer", () => {
  test.skip(({ isMobile }) => isMobile, "folding is for a computer")
  test.use({ viewport: { width: 1440, height: 900 } })
  test("all six columns are on screen, empty ones are strips, the Done column is visible", async ({ page }) => {
    await openBoard(page)
    const b = await boxes(page)
    expect(b.cols).toHaveLength(6)
    for (const c of b.cols) expect(c.right, `${c.name} is inside the board`).toBeLessThanOrEqual(b.board.right + 1)
    const folded = b.cols.filter(c => c.folded)
    expect(folded.length).toBeGreaterThan(0)
    for (const c of folded) expect(c.w).toBe(56)
    const open = b.cols.filter(c => !c.folded)
    for (const c of open) expect(c.w).toBeGreaterThan(120)
    const tall = await page.evaluate(() => Math.min(...[...document.querySelectorAll(".board-col")].map(c => Math.round(c.getBoundingClientRect().height))))
    expect(tall).toBeGreaterThanOrEqual(Math.min(520, Math.round(900 * 0.6)))   // on a computer the columns are tall drop targets
    expect(b.cols.find(c => c.name === "Done")).toBeTruthy()
  })
  test("pressing a strip opens it, pressing again folds it; the keyboard can do it too", async ({ page }) => {
    await openBoard(page)
    const strip = page.getByRole("button", { name: /Not claimed, no tasks\. Show column/ })
    await strip.click()
    await expect(page.locator(".board-col", { has: page.getByRole("heading", { name: "Not claimed" }) })).not.toHaveClass(/is-folded/)
    const hide = page.getByRole("button", { name: /Not claimed, no tasks\. Hide column/ })
    await expect(hide).toHaveAttribute("aria-expanded", "true")
    await hide.focus(); await page.keyboard.press("Enter")
    await expect(page.locator(".board-col", { has: page.getByRole("heading", { name: "Not claimed" }) })).toHaveClass(/is-folded/)
  })
  test("dragging a card over a folded column opens it and the card can be dropped there", async ({ page }) => {
    await openBoard(page)
    const card = page.getByTestId("board-card").first()
    const target = page.getByRole("region", { name: "Working on it", exact: true })
    await expect(target).toHaveClass(/is-folded/)
    await card.dragTo(target, { targetPosition: { x: 20, y: 60 } })
    await expect(page.getByRole("region", { name: "Working on it", exact: true }).getByTestId("board-card")).toHaveCount(1)
  })
  test("+ Add task still works in a folded column and opens it", async ({ page }) => {
    await openBoard(page)
    const col = page.locator(".board-col.is-folded").first()
    const name = (await col.getAttribute("aria-label"))!
    await page.getByRole("region", { name, exact: true }).getByRole("button", { name: "+ Add task", exact: true }).click()
    const same = page.getByRole("region", { name, exact: true })
    await expect(same).not.toHaveClass(/is-folded/)
    await expect(same.getByLabel("New task name")).toBeVisible()
  })
  test("the six headings are still there", async ({ page }) => {
    await openBoard(page)
    await expect(page.getByTestId("task-board").getByRole("heading")).toHaveCount(6)
  })
})

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone only")
  test("nothing folds: six wide columns that scroll sideways", async ({ page }) => {
    await openBoard(page)
    const widths = await page.evaluate(() => [...document.querySelectorAll(".board-col")].map(c => Math.round(c.getBoundingClientRect().width)))
    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBeGreaterThan(250)
    // No dragging on a phone, so no tall drop targets: an empty column is short, not a huge grey block.
    const heights = await page.evaluate(() => [...document.querySelectorAll(".board-col")].map(c => Math.round(c.getBoundingClientRect().height)))
    expect(Math.min(...heights)).toBeLessThan(260)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
})
