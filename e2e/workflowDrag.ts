import { expect, type Locator, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

/** A rendered drop diamond, in page coordinates. */
export interface DropSlot { index: number; branchId: string; targetId: string | null; before: string | null; x: number; y: number }
export interface DragInput { down(x: number, y: number): Promise<void>; move(x: number, y: number): Promise<void>; up(): Promise<void> }

/** Real browser input: the mouse on desktop, CDP touch events on the mobile project. */
export async function dragInput(page: Page, touch: boolean): Promise<DragInput> {
  if (!touch) return {
    down: async (x, y) => { await page.mouse.move(x, y); await page.mouse.down() },
    move: async (x, y) => { await page.mouse.move(x, y) },
    up: async () => { await page.mouse.up() },
  }
  const cdp = await page.context().newCDPSession(page)
  return {
    down: async (x, y) => { await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] }) },
    move: async (x, y) => { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }) },
    up: async () => { await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await cdp.detach() },
  }
}

const canvas = (page: Page) => page.getByTestId("workflow-builder").getByRole("region", { name: "Workflow main line and team branches", exact: true })

/** Scroll only the canvas (never the page) so the element sits in the middle of it. */
export async function centerInCanvas(element: Locator) {
  await element.evaluate(node => {
    const scroller = node.closest(".wfx-scroll") as HTMLElement, box = node.getBoundingClientRect(), frame = scroller.getBoundingClientRect()
    scroller.scrollLeft += box.left + box.width / 2 - (frame.left + frame.width / 2)
    scroller.scrollTop += box.top + box.height / 2 - (frame.top + frame.height / 2)
  })
}

export const dropSlots = (page: Page): Promise<DropSlot[]> => page.getByTestId("workflow-drop-slot").evaluateAll(elements => elements.map((element, index) => {
  const box = element.getBoundingClientRect()
  return { index, branchId: element.getAttribute("data-branch-id")!, targetId: element.getAttribute("data-target-id"), before: element.getAttribute("data-before"), x: box.left + box.width / 2, y: box.top + box.height / 2 }
}))

/** Press a task's dot and move far enough to start a drag, leaving the pointer down. */
export async function startDrag(page: Page, sourceTestId: string, touch: boolean) {
  await closeRail(page)
  await canvas(page).evaluate(node => node.scrollIntoView({ block: "center" }))
  const source = page.getByTestId(sourceTestId)
  await centerInCanvas(source)
  const dot = (await source.locator("i").boundingBox())!
  const x = dot.x + dot.width / 2, y = dot.y + dot.height / 2
  const input = await dragInput(page, touch)
  await input.down(x, y)
  await input.move(x + 6, y + 6)
  await input.move(x + 12, y + 12)
  await expect(page.getByTestId("workflow-drop-slot").first()).toBeAttached()
  return { input, source: { x, y } }
}

/** Move the held pointer onto one diamond (centred in the canvas first, so no auto-scroll interferes). */
export async function moveToSlot(page: Page, input: DragInput, slot: DropSlot) {
  const diamond = page.getByTestId("workflow-drop-slot").nth(slot.index)
  await centerInCanvas(diamond)
  const box = (await diamond.boundingBox())!
  await input.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(diamond).toHaveClass(/is-near/)
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/** Drag a task onto the matching diamond nearest to it and release. */
export async function dragToSlot(page: Page, sourceTestId: string, filter: (slot: DropSlot) => boolean, touch: boolean) {
  const { input, source } = await startDrag(page, sourceTestId, touch)
  const slots = (await dropSlots(page)).filter(filter).sort((a, b) => distance(a, source) - distance(b, source))
  expect(slots.length, "a matching diamond is shown").toBeGreaterThan(0)
  await moveToSlot(page, input, slots[0])
  await input.up()
  return slots[0]
}
