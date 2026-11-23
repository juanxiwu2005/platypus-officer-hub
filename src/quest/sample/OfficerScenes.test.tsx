/** P5-05T regression gate for the officer scenes: pointer picks, paired keyboard placement, and advisor range bounds. All people are fictional sample data. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import { OfficerScenes } from "./OfficerScenes"
import { draftOf, initialSample, type SampleDraft } from "./model"
import { questSchedule } from "../../engine/questSchedule"
const clock = questSchedule()
/** Minimal stubs for browser platform APIs the jsdom-style test window lacks; originals are restored after each test. */
let savedRaf: typeof window.requestAnimationFrame | undefined
let savedCaf: typeof window.cancelAnimationFrame | undefined
let savedMatchMedia: typeof window.matchMedia | undefined
beforeEach(() => {
  savedRaf = window.requestAnimationFrame; savedCaf = window.cancelAnimationFrame; savedMatchMedia = window.matchMedia
  window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame
  window.matchMedia = (() => ({ matches: true, media: "", onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
})
afterEach(() => {
  window.requestAnimationFrame = savedRaf as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = savedCaf as typeof window.cancelAnimationFrame
  window.matchMedia = savedMatchMedia as typeof window.matchMedia
  cleanup()
})
/** Controlled wrapper over initialSample(questSchedule()); the parent merges edits and never checks on its own. */
function renderScene(stage: "booking" | "advisor") {
  const onEdit = vi.fn((_values: Partial<SampleDraft>) => { })
  const onCheck = vi.fn(() => { })
  const initial = draftOf(initialSample(clock))
  let current: SampleDraft = initial
  function Scene() {
    const [draft, setDraft] = useState(initial)
    current = draft
    const edit = (values: Partial<SampleDraft>) => { onEdit(values); setDraft(state => ({ ...state, ...values })) }
    return <OfficerScenes stage={stage} draft={draft} onEdit={edit} onCheck={onCheck} />
  }
  render(<Scene />)
  return { onEdit, onCheck, draft: () => current }
}
const paper = () => screen.getByRole("button", { name: "Room request" })
const desk = (name: string) => screen.getByRole("button", { name })
const columnOf = (element: HTMLElement) => element.closest<HTMLElement>("[data-drop-col]")?.dataset.dropCol
const assertUniqueFocusedPaper = (column: string) => {
  expect(screen.getAllByRole("button", { name: "Room request" })).toHaveLength(1); expect(columnOf(paper())).toBe(column); expect(document.activeElement).toBe(paper())
}
describe("OfficerScenes booking stage", () => {
  it("moves the paper to Dr. Lee then Riley without auto-checking, keeping one focused paper", () => {
    const { onEdit, onCheck, draft } = renderScene("booking")
    expect(draft().requestor).toBe(null); expect(columnOf(paper())).toBe("tray")
    fireEvent.click(paper())
    fireEvent.click(desk("Dr. LeeAdvisor"))
    expect(onEdit).toHaveBeenCalledWith({ requestor: "advisor" })
    expect(draft().requestor).toBe("advisor")
    assertUniqueFocusedPaper("advisor")
    fireEvent.click(paper())
    fireEvent.click(desk("RileyEvents"))
    expect(onEdit).toHaveBeenLastCalledWith({ requestor: "riley" })
    expect(draft().requestor).toBe("riley")
    assertUniqueFocusedPaper("riley")
    expect(onCheck).not.toHaveBeenCalled()
  })
  it("keeps the paper on the same desk and clears selection on a repeat pick", () => {
    const { onEdit, onCheck, draft } = renderScene("booking")
    fireEvent.click(paper())
    fireEvent.click(desk("RileyEvents"))
    expect(draft().requestor).toBe("riley")
    fireEvent.click(paper())
    expect(paper().getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(desk("RileyEvents"))
    expect(onEdit).toHaveBeenLastCalledWith({ requestor: "riley" })
    expect(draft().requestor).toBe("riley")
    expect(paper().getAttribute("aria-pressed")).toBe("false")
    assertUniqueFocusedPaper("riley")
    expect(onCheck).not.toHaveBeenCalled()
  })
  it("Enter picks and Enter again keeps the paper on the current desk; arrows move and Escape cancels", () => {
    const { onEdit, onCheck, draft } = renderScene("booking")
    fireEvent.click(paper())
    fireEvent.click(desk("Dr. LeeAdvisor"))
    expect(draft().requestor).toBe("advisor")
    fireEvent.keyDown(paper(), { key: "Enter" })
    expect(paper().getAttribute("aria-pressed")).toBe("true")
    fireEvent.keyDown(paper(), { key: "Enter" })
    expect(onEdit).toHaveBeenLastCalledWith({ requestor: "advisor" })
    assertUniqueFocusedPaper("advisor")
    fireEvent.keyDown(paper(), { key: "Enter" })
    fireEvent.keyDown(paper(), { key: "ArrowRight" })
    expect(screen.getByText("Dr. Lee desk. Enter to place.")).toBeTruthy()
    fireEvent.keyDown(paper(), { key: "ArrowLeft" })
    expect(screen.getByText("Sam desk. Enter to place.")).toBeTruthy()
    fireEvent.keyDown(paper(), { key: "Escape" })
    expect(paper().getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByText("Placement cancelled.")).toBeTruthy()
    assertUniqueFocusedPaper("advisor")
    fireEvent.keyDown(paper(), { key: "Escape" })
    expect(screen.getByText("Placement cancelled.")).toBeTruthy()
    expect(draft().requestor).toBe("advisor")
    fireEvent.keyDown(paper(), { key: "Enter" })
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(paper(), { key: "ArrowLeft" })
    expect(screen.getByText("Riley desk. Enter to place.")).toBeTruthy()
    fireEvent.keyDown(paper(), { key: "Enter" })
    expect(onEdit).toHaveBeenLastCalledWith({ requestor: "riley" })
    assertUniqueFocusedPaper("riley")
    expect(onCheck).not.toHaveBeenCalled()
  })
  it("target keyboard: arrows move focus between desks, native Enter places, Escape returns to the paper", () => {
    const { onEdit, onCheck, draft } = renderScene("booking")
    fireEvent.click(paper())
    const riley = desk("RileyEvents")
    fireEvent.focus(riley)
    expect(riley.getAttribute("aria-pressed")).toBe("true")
    fireEvent.keyDown(riley, { key: "ArrowRight" })
    const alex = desk("AlexPresident")
    expect(document.activeElement).toBe(alex)
    expect(alex.getAttribute("aria-pressed")).toBe("true")
    expect(riley.getAttribute("aria-pressed")).toBe("false")
    expect(onEdit).not.toHaveBeenCalled()
    expect(draft().requestor).toBe(null)
    // Native Enter activates the focused target button; the keydown is not prevented.
    if (fireEvent.keyDown(alex, { key: "Enter" })) fireEvent.click(alex)
    expect(onEdit).toHaveBeenLastCalledWith({ requestor: "alex" })
    expect(draft().requestor).toBe("alex")
    assertUniqueFocusedPaper("alex")
    expect(paper().getAttribute("aria-pressed")).toBe("false")
    // Same-destination target Enter after a fresh pick keeps the paper on the desk.
    fireEvent.click(paper())
    fireEvent.focus(alex)
    if (fireEvent.keyDown(alex, { key: "Enter" })) fireEvent.click(alex)
    expect(onEdit).toHaveBeenLastCalledWith({ requestor: "alex" })
    assertUniqueFocusedPaper("alex")
    expect(paper().getAttribute("aria-pressed")).toBe("false")
    // Escape from a target cancels the pick, keeps the draft and restores paper focus.
    fireEvent.click(paper())
    const sam = desk("SamSecretary")
    fireEvent.focus(sam)
    fireEvent.keyDown(sam, { key: "Escape" })
    expect(paper().getAttribute("aria-pressed")).toBe("false")
    expect(document.activeElement).toBe(paper())
    expect(screen.getByText("Placement cancelled.")).toBeTruthy()
    expect(draft().requestor).toBe("alex")
    // Escape from the Send request button cancels too, without checking.
    fireEvent.click(paper())
    const send = screen.getByRole("button", { name: "Send request" })
    fireEvent.focus(send)
    fireEvent.keyDown(send, { key: "Escape" })
    expect(paper().getAttribute("aria-pressed")).toBe("false")
    expect(document.activeElement).toBe(paper())
    expect(draft().requestor).toBe("alex")
    expect(onCheck).not.toHaveBeenCalled()
  })
  it("calls the parent check callback from the booking actions", () => {
    const { onEdit, onCheck } = renderScene("booking")
    fireEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(onCheck).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
describe("OfficerScenes advisor stage", () => {
  it("reaches the full 0..2 shift and keeps the range bounds ordered", () => {
    const { onEdit, onCheck, draft } = renderScene("advisor")
    const start = screen.getByLabelText("Dr. Lee joins") as HTMLInputElement
    const end = screen.getByLabelText("Dr. Lee leaves") as HTMLInputElement
    const segments = screen.getByRole("list", { name: "Evening segments" })
    expect(start.value).toBe("1")
    expect(end.value).toBe("1")
    fireEvent.change(start, { target: { value: "0" } })
    expect(onEdit).toHaveBeenCalledWith({ advisorStart: 0 })
    expect(draft().advisorStart).toBe(0)
    expect(start.value).toBe("0")
    fireEvent.change(end, { target: { value: "2" } })
    expect(onEdit).toHaveBeenLastCalledWith({ advisorEnd: 2 })
    expect(draft().advisorEnd).toBe(2)
    expect(end.value).toBe("2")
    expect(segments.querySelectorAll("[aria-current='true']")).toHaveLength(3)
    fireEvent.change(start, { target: { value: "2" } })
    expect(onEdit).toHaveBeenLastCalledWith({ advisorStart: 2 })
    fireEvent.change(end, { target: { value: "0" } })
    expect(onEdit).toHaveBeenLastCalledWith({ advisorStart: 0, advisorEnd: 0 })
    expect(draft().advisorStart).toBe(0)
    expect(draft().advisorEnd).toBe(0)
    expect(start.value).toBe("0")
    expect(end.value).toBe("0")
    fireEvent.change(start, { target: { value: "2" } })
    expect(onEdit).toHaveBeenLastCalledWith({ advisorStart: 2, advisorEnd: 2 })
    expect(draft().advisorStart).toBe(2)
    expect(draft().advisorEnd).toBe(2)
    expect(onCheck).not.toHaveBeenCalled()
  })
  it("calls the parent check callback from the advisor actions", () => {
    const { onEdit, onCheck } = renderScene("advisor")
    fireEvent.click(screen.getByRole("button", { name: "Invite Dr. Lee" }))
    expect(onCheck).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
