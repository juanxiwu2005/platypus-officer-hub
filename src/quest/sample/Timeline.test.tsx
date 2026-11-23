// @vitest-environment jsdom
import { beforeAll, afterEach, describe, expect, it } from "vitest"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { useState } from "react"
import Timeline from "./Timeline"
import { emptyBoard, slotKey, TASKS, type Board, type TaskId } from "../foundation"
import { questSchedule, type QuestClock } from "../../engine/questSchedule"
const clock: QuestClock = questSchedule()
let root: Root | null = null
const host = () => { const el = document.createElement("div"); document.body.appendChild(el); return el }
function render(onCheck: () => void, focusId: TaskId | null = null) {
  const el = host()
  function Harness() {
    const [board, setBoard] = useState<Board>(() => emptyBoard(clock))
    return <Timeline board={board} clock={clock} onChange={setBoard} onCheck={onCheck} focusId={focusId} />
  }
  root = createRoot(el)
  act(() => { root!.render(<Harness />) })
  return el
}
const taskButton = (el: HTMLElement | ParentNode, id: TaskId) => el.querySelector<HTMLButtonElement>(`[data-quest-task="${id}"]`)!
const day = (el: HTMLElement | ParentNode, n: number) => el.querySelector(`[data-drop-col="${slotKey(n)}"]`)!
const checkButton = (el: HTMLElement | ParentNode) => [...el.querySelectorAll("button")].find(b => b.textContent?.includes("Rehearse timeline"))!
/** Click a task, then a day: the touch path rehearsed with the same two taps. */
const tap = (el: HTMLElement, id: TaskId, n: number) => { act(() => { taskButton(el, id).click() }); act(() => { day(el, n).querySelector("button")!.click() }) }
const press = (el: HTMLElement, id: TaskId, key: string) => act(() => { taskButton(el, id).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })) })
beforeAll(() => { (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true; Element.prototype.scrollIntoView = () => {} })
afterEach(() => { act(() => { root?.unmount() }); root = null; document.body.innerHTML = "" })
describe("Timeline", () => {
  it("keeps Rehearse timeline disabled until every task is placed, then fires onCheck once", () => {
    let checks = 0
    const el = render(() => { checks++ })
    expect(checkButton(el).disabled).toBe(true); tap(el, "registry", 49); expect(checkButton(el).disabled).toBe(true); tap(el, "approval", 49); tap(el, "room", 49); tap(el, "ritm", 49)
    expect(checkButton(el).disabled).toBe(true); tap(el, "publicity", 49); expect(el.querySelector('[data-drop-col="day:49"] [data-quest-task="publicity"]')).not.toBeNull()
    expect(day(el, 49).textContent).toContain("Instagram teaser"); expect(checkButton(el).disabled).toBe(false)
    act(() => { checkButton(el).click() })
    expect(checks).toBe(1); expect(el.querySelector(".quest-task.is-selected")).toBeNull()
  })
  it("moves Registry to 42 days by keyboard and keeps focus, and Escape cancels a placement", () => {
    const el = render(() => {})
    press(el, "registry", "Enter"); press(el, "registry", "ArrowRight")
    press(el, "registry", "Enter")
    expect(day(el, 42).querySelector('[data-quest-task="registry"]')).not.toBeNull()
    expect(document.activeElement).toBe(taskButton(el, "registry"))
    press(el, "approval", "Enter")
    press(el, "approval", "Escape")
    act(() => { day(el, 30).querySelector("button")!.click() })
    expect(day(el, 30).querySelector('[data-quest-task="approval"]')).toBeNull()
    expect(el.querySelector('[aria-label="Unscheduled tasks"] [data-quest-task="approval"]')).not.toBeNull()
  })
  it("marks days later than the RITM deadline as too late, using the engine clock", () => {
    const el = render(() => {})
    press(el, "ritm", "Enter")
    const late = clock.slots.find(d => d < clock.deadlines.ritm.daysBefore)!
    const ok = clock.slots.find(d => d === clock.deadlines.ritm.daysBefore)!
    expect(day(el, late).className).toContain("is-late")
    expect(day(el, late).textContent).toContain("Too late")
    expect(day(el, ok).className).not.toContain("is-late")
    expect(day(el, ok).textContent).not.toContain("Too late")
  })
  it("announces each task with its label and shows the placed counter", () => {
    const el = render(() => {})
    expect(el.querySelector(".quest-board-title")!.textContent).toContain(`0/${TASKS.length} placed`)
    act(() => { taskButton(el, "publicity").click() })
    expect(el.querySelector("#quest-keys")!.textContent).toContain("Instagram teaser selected. Choose a day.")
    tap(el, "publicity", 49)
    expect(el.querySelector(".quest-board-title")!.textContent).toContain(`1/${TASKS.length} placed`)
  })
})
