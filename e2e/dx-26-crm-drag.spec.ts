import { expect, test, type Page } from "@playwright/test"
import { closeRail, viewAs } from "./helpers"

// DX-26: the Partners board uses the same pointer drag as the task board (src/lib/dragSort.ts). Dragging a contact to another stage
// changes its stage; Escape puts it back; Alt + arrow moves it by keyboard; someone who may not edit a contact cannot drag it; the stage
// menu on each card still works. The data underneath (the store's updateContact) is unchanged.
test.skip(({ isMobile }) => isMobile, "mouse dragging; the stage menu is the phone path and is covered by crm.spec.ts")
test.use({ reducedMotion: "no-preference" })

async function openBoard(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/#/partners")
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole("button", { name: "Board", exact: true }).click()
  await expect(page.getByTestId("crm-board")).toBeVisible()
}
const stage = (page: Page, name: RegExp) => page.getByTestId("crm-board").getByRole("region", { name })
const morgan = (page: Page) => page.getByTestId("crm-card").filter({ hasText: "Morgan Hale" })
const savedStage = (page: Page, id: string) => page.evaluate(i => JSON.parse(localStorage.getItem("platypus.v1.demo")!).contacts.find((c: { id: string }) => c.id === i)?.stage, id)

test("dragging a contact onto another stage changes its stage", async ({ page }) => {
  await openBoard(page)
  await expect(stage(page, /Cold/)).toContainText("Morgan Hale")
  const c = (await morgan(page).boundingBox())!
  const t = (await stage(page, /Warm/).boundingBox())!
  await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
  await page.mouse.move(t.x + 20, t.y + 60, { steps: 10 })
  await expect(stage(page, /Warm/)).toHaveClass(/over/)                 // the stage under the card is outlined
  await expect(morgan(page)).toHaveClass(/is-dragging/)
  // What the person sees while holding it: the card lifts with a shadow, the stage it would land in gets the accent outline.
  expect(await morgan(page).evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
  const accent = await page.evaluate(() => { const d = document.createElement("i"); d.style.color = "var(--accent)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c })
  expect(await stage(page, /Warm/).evaluate(el => getComputedStyle(el).borderTopColor)).toBe(accent)
  await page.mouse.up()
  await expect(stage(page, /Warm/)).toContainText("Morgan Hale")
  await expect(stage(page, /Cold/)).not.toContainText("Morgan Hale")
  expect(await savedStage(page, "c-sponsor")).toBe("warm")
})

test("Escape in the middle of a drag, or letting go over nothing, changes nothing", async ({ page }) => {
  await openBoard(page)
  const c = (await morgan(page).boundingBox())!
  const t = (await stage(page, /Warm/).boundingBox())!
  await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
  await page.mouse.move(t.x + 20, t.y + 60, { steps: 8 })
  await page.keyboard.press("Escape")
  await page.mouse.up()
  await expect(morgan(page)).not.toHaveClass(/is-dragging/)
  expect(await savedStage(page, "c-sponsor")).toBe("cold")
  const c2 = (await morgan(page).boundingBox())!
  await page.mouse.move(c2.x + 30, c2.y + 20); await page.mouse.down()
  await page.mouse.move(c2.x + 30, 890, { steps: 6 })                   // below the board, on the page background
  await page.mouse.up()
  expect(await savedStage(page, "c-sponsor")).toBe("cold")
  await expect(stage(page, /Cold/)).toContainText("Morgan Hale")
})

test("a plain click on the name still opens the profile, and the stage menu still moves the card", async ({ page }) => {
  await openBoard(page)
  await morgan(page).getByRole("button", { name: /Morgan Hale/ }).click()
  await expect(page.getByRole("region", { name: "Details" })).toBeVisible()
  await morgan(page).getByLabel("Move Morgan Hale (fictional) to stage").selectOption("active")
  await expect(stage(page, /Active/)).toContainText("Morgan Hale")
})

test("keyboard: Alt + → moves the contact to the next stage and says so; Alt + ← at the first stage says it cannot", async ({ page }) => {
  await openBoard(page)
  await morgan(page).getByRole("button", { name: /Morgan Hale/ }).focus()
  await page.keyboard.press("Alt+ArrowLeft")                            // Cold is the first stage
  await expect(page.getByTestId("crm-announce")).toContainText("It cannot move that way.")
  await page.keyboard.press("Alt+ArrowRight")
  await expect(page.getByTestId("crm-announce")).toContainText("Moved Morgan Hale (fictional) to Warm.")
  await expect(stage(page, /Warm/)).toContainText("Morgan Hale")
  expect(await savedStage(page, "c-sponsor")).toBe("warm")
})

test("someone who may not edit a contact cannot drag it", async ({ page }) => {
  await openBoard(page)
  await closeRail(page)
  await viewAs(page, "maya")
  const locked = page.getByTestId("crm-card").and(page.locator('[data-editable="false"]'))
  expect(await locked.count(), "this viewer has at least one contact they may not edit, so the check below means something").toBeGreaterThan(0)
  const card = locked.first()
  const id = (await card.getAttribute("data-drag-id")) // only cards that may be dragged carry the drag marker
  expect(id).toBeNull()
  const before = await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))
  const c = (await card.boundingBox())!
  const t = (await stage(page, /Cold/).boundingBox())!
  await page.mouse.move(c.x + 30, c.y + 20); await page.mouse.down()
  await page.mouse.move(t.x + 20, t.y + 60, { steps: 8 })
  await expect(card).not.toHaveClass(/is-dragging/)
  await page.mouse.up()
  expect(await page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).toBe(before)
  await expect(card.getByLabel(/Move .* to stage/)).toBeDisabled()
})

test("leads-only contacts stay out of the board for other officers", async ({ page }) => {
  await openBoard(page)
  await closeRail(page)
  await viewAs(page, "maya")
  await expect(page.getByTestId("crm-board")).not.toContainText("Morgan Hale")
})
