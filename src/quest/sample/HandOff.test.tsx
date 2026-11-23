/** @vitest-environment jsdom */
/** P5-06AT: HandOff regression. Real CommsScenes adapter, HandOff and callbacks; no component, drag-helper or judge mocks. Pointer/touch dragging is planner browser work. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { questSchedule } from "../../engine/questSchedule"
import CommsScenes from "./CommsScenes"
import { DOCUMENTS } from "./decisions"
import { draftOf, initialSample, type SampleDraft } from "./model"
const LABELS: Readonly<Record<string, string>> = { approval: "Approval", ritm: "RITM number", room: "Confirmed room" }
const untouched = draftOf(initialSample(questSchedule()))
function setup() {
  let draft: SampleDraft = draftOf(initialSample(questSchedule()))
  const onEdit = vi.fn((values: Partial<SampleDraft>) => { draft = { ...draft, ...values } })
  const onCheck = vi.fn()
  const scene = (d: SampleDraft) => <CommsScenes stage="handoff" draft={d} onEdit={onEdit} onCheck={onCheck} />
  const view = render(scene(draft))
  return {
    view, onEdit, onCheck, getDraft: () => draft, sync: () => view.rerender(scene(draft)),
    paper: (id: string) => view.getByRole("button", { name: LABELS[id] }) as HTMLButtonElement,
    target: (dest: "tray" | "morgan") => view.getByRole("button", { name: dest === "morgan" ? "Morgan's desk" : "Riley's tray" }) as HTMLButtonElement,
    drop: (dest: string) => view.container.querySelector(`[data-drop-col="${dest}"]`) as HTMLElement,
    ids: () => [...view.container.querySelectorAll("[data-drag-id]")].map((el) => el.getAttribute("data-drag-id")),
    status: () => view.getByRole("status").textContent ?? "",
  }
}
// Minimal platform stubs, restored after each test.
let stubbedMatchMedia = false
let stubbedAnimate = false
beforeEach(() => {
  if (typeof window.matchMedia !== "function") {
    stubbedMatchMedia = true
    window.matchMedia = () => ({ matches: false, media: "", onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })
  }
  if (typeof Element.prototype.animate !== "function") {
    stubbedAnimate = true
    Element.prototype.animate = vi.fn(() => ({ cancel: () => {}, finished: Promise.resolve() }) as unknown as Animation)
  }
})
afterEach(() => {
  if (stubbedMatchMedia) { stubbedMatchMedia = false; delete (window as { matchMedia?: unknown }).matchMedia }
  if (stubbedAnimate) { stubbedAnimate = false; delete (Element.prototype as { animate?: unknown }).animate }
  cleanup()
})
/** Real browsers fire a button's click after an Enter keydown the component did not preventDefault; jsdom does not, so model the activation explicitly. */
const enter = (el: HTMLElement, activate: boolean) => {
  fireEvent.keyDown(el, { key: "Enter" })
  if (activate) fireEvent.click(el)
}
describe("HandOff (via CommsScenes handoff stage)", () => {
  it("moves the three unique papers to Morgan and one back, with exact lists, IDs, labels and one node each", () => {
    const t = setup()
    expect(DOCUMENTS).toEqual(["approval", "ritm", "room"]); expect(t.getDraft().documents).toEqual([]); expect(t.ids()).toEqual(["approval", "ritm", "room"])
    for (const label of ["Approval", "RITM number", "Confirmed room"]) {
      expect(t.drop("tray").textContent).toContain(label); expect(t.drop("morgan").textContent).not.toContain(label); expect(t.view.getAllByRole("button", { name: label })).toHaveLength(1)
    }
    for (const id of DOCUMENTS) { fireEvent.click(t.paper(id)); fireEvent.click(t.target("morgan")); t.sync() }
    expect(t.onEdit).toHaveBeenLastCalledWith({ documents: ["approval", "ritm", "room"] }); expect(t.getDraft().documents).toEqual(["approval", "ritm", "room"]); expect(t.ids()).toEqual(["approval", "ritm", "room"])
    expect(t.drop("morgan").querySelectorAll(".sample-comms-handoff-paper")).toHaveLength(3); expect(t.drop("tray").querySelectorAll(".sample-comms-handoff-paper")).toHaveLength(0)
    expect(t.onCheck).not.toHaveBeenCalled(); fireEvent.click(t.paper("ritm")); fireEvent.click(t.target("tray")); t.sync(); expect(t.getDraft().documents).toEqual(["approval", "room"])
    expect(t.drop("tray").querySelectorAll(".sample-comms-handoff-paper")).toHaveLength(1); expect(t.drop("tray").textContent).toContain("RITM number"); expect(t.drop("morgan").textContent).not.toContain("RITM number")
    // Original required inputs stay untouched; only the documents field is patched.
    expect(t.getDraft().requestor).toBe(untouched.requestor); expect(t.getDraft().promotion).toEqual(untouched.promotion); expect(t.getDraft().venue).toEqual(untouched.venue)
  })
  it("hands over with missing docs through the parent callback only; movement never auto-checks", () => {
    const t = setup()
    fireEvent.click(t.paper("approval")); fireEvent.click(t.target("morgan")); t.sync(); expect(t.onCheck).not.toHaveBeenCalled(); fireEvent.click(t.view.getByRole("button", { name: "Hand over" }))
    expect(t.onCheck).toHaveBeenCalledTimes(1); expect(t.onEdit).toHaveBeenCalledTimes(1) // only the movement patch, nothing from the button
  })
  it("paper-focus keyboard: Enter picks, ArrowRight moves the cursor, Enter places; Escape cancels", () => {
    const t = setup()
    const el = t.paper("approval")
    el.focus()
    enter(el, true) // Enter activates the button: pick
    expect(el.getAttribute("aria-pressed")).toBe("true"); expect(t.status()).toContain("picked"); fireEvent.keyDown(el, { key: "ArrowRight" }); expect(t.status()).toBe("Morgan's desk")
    expect(document.activeElement).toBe(el)
    enter(el, false) // picked: HandOff handles Enter and prevents the activation click
    t.sync()
    expect(t.getDraft().documents).toEqual(["approval"]); expect(t.onCheck).not.toHaveBeenCalled(); expect(t.drop("morgan").textContent).toContain("Approval")
    const el2 = t.paper("ritm")
    fireEvent.click(el2); fireEvent.keyDown(el2, { key: "Escape" }); expect(el2.getAttribute("aria-pressed")).toBe("false"); expect(document.activeElement).toBe(el2); expect(t.status()).toBe("Cancelled.")
    expect(t.getDraft().documents).toEqual(["approval"])
  })
  it("Enter/Enter after a noninitial destination keeps the current destination", () => {
    const t = setup()
    fireEvent.click(t.paper("approval")); fireEvent.click(t.target("morgan")); t.sync()
    const el = t.paper("approval")
    expect(document.activeElement).toBe(el) // focus restored after the reparent
    const edits = t.onEdit.mock.calls.length
    enter(el, true) // pick again; the cursor starts at the paper's current destination
    expect(el.getAttribute("aria-pressed")).toBe("true")
    enter(el, false) // picked: same-destination placement
    expect(t.getDraft().documents).toEqual(["approval"]); expect(t.onEdit.mock.calls.length).toBe(edits)
    expect(document.activeElement).toBe(el)
    expect(el.getAttribute("aria-pressed")).toBe("false")
    expect(t.status()).toBe("Approval stays at Morgan's desk.")
  })
  it("a same-destination click keeps the unique focused paper and clears the selection", () => {
    const t = setup()
    fireEvent.click(t.paper("room"))
    const edits = t.onEdit.mock.calls.length
    fireEvent.click(t.target("tray"))
    expect(t.onEdit.mock.calls.length).toBe(edits)
    expect(document.activeElement).toBe(t.paper("room"))
    expect(t.paper("room").getAttribute("aria-pressed")).toBe("false")
    expect(t.status()).toBe("Confirmed room stays at Riley's tray.")
    expect(t.view.getAllByRole("button", { name: "Confirmed room" })).toHaveLength(1)
  })
  it("Tab to a target: arrows change the focused destination, Enter places, Escape restores the picked paper", () => {
    const t = setup()
    const el = t.paper("approval")
    fireEvent.click(el)
    fireEvent.keyDown(el, { key: "Tab", shiftKey: true }) // tab order: the tray target precedes the tray papers
    fireEvent.focus(t.target("tray"))
    expect(t.target("tray").getAttribute("aria-pressed")).toBe("true")
    fireEvent.keyDown(t.target("tray"), { key: "ArrowRight" })
    expect(document.activeElement).toBe(t.target("morgan"))
    expect(t.status()).toBe("Morgan's desk")
    fireEvent.keyDown(t.target("morgan"), { key: "ArrowLeft" })
    expect(document.activeElement).toBe(t.target("tray"))
    fireEvent.keyDown(t.target("tray"), { key: "ArrowRight" })
    enter(t.target("morgan"), true) // the target ignores Enter, so the activation click places the picked paper
    t.sync()
    expect(t.getDraft().documents).toEqual(["approval"])
    expect(document.activeElement).toBe(t.paper("approval"))
    // Escape from a target cancels and restores the picked paper.
    const el2 = t.paper("ritm")
    fireEvent.click(el2)
    fireEvent.keyDown(el2, { key: "Tab", shiftKey: true })
    fireEvent.focus(t.target("tray"))
    fireEvent.keyDown(t.target("tray"), { key: "Escape" })
    expect(el2.getAttribute("aria-pressed")).toBe("false")
    expect(document.activeElement).toBe(el2)
    expect(t.getDraft().documents).toEqual(["approval"])
  })
  it("Escape still cancels after Tab reaches a different paper", () => {
    const t = setup()
    const first = t.paper("approval")
    fireEvent.click(first)
    expect(first.getAttribute("aria-pressed")).toBe("true")
    fireEvent.keyDown(first, { key: "Tab" })
    const second = t.paper("ritm")
    fireEvent.focus(second)
    fireEvent.keyDown(second, { key: "Escape" })
    expect(first.getAttribute("aria-pressed")).toBe("false")
    expect(second.getAttribute("aria-pressed")).toBe("false")
    expect(document.activeElement).toBe(first)
    expect(t.status()).toBe("Cancelled.")
    expect(t.getDraft().documents).toEqual([])
  })
})
