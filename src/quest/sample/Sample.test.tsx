import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Sample from "./Sample"
import { SAMPLE_KEY } from "./storage"
import { PRACTICE_KEY } from "../foundation"
import { questSchedule } from "../../engine/questSchedule"
let reduced = false
const media = (query: string) => ({ matches: reduced && query.includes("reduce"), media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true }) as MediaQueryList
type DialogProto = Pick<HTMLDialogElement, "showModal" | "close">
const dialogProto = Object.getPrototypeOf(document.createElement("dialog")) as DialogProto
// jsdom has no native modal behavior; model close-time focus restoration, which browsers refuse for triggers inside a hidden subtree.
const nativeDialog: DialogProto = { showModal: dialogProto.showModal, close: dialogProto.close }
const prevOf = (el: object) => (el as { __prev?: HTMLElement }).__prev
beforeEach(() => {
  reduced = false
  localStorage.clear()
  window.matchMedia = media
  Element.prototype.scrollIntoView = vi.fn()
  dialogProto.showModal = function (this: HTMLDialogElement) {
    if (this.open) return
    ;(this as { __prev?: HTMLElement }).__prev = document.activeElement as HTMLElement
    this.setAttribute("open", "")
    this.querySelector<HTMLElement>("select, button")?.focus()
  }
  dialogProto.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    const prev = prevOf(this)
    const canRestore = !!prev?.isConnected && !prev.closest("[hidden]")
    this.removeAttribute("open")
    this.dispatchEvent(new Event("close"))
    if (canRestore) prev?.focus()
  }
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); dialogProto.showModal = nativeDialog.showModal; dialogProto.close = nativeDialog.close })
const mount = () => render(<MemoryRouter><Sample /></MemoryRouter>)
const hq = () => fireEvent.click(screen.getByRole("button", { name: "Skip intro" }))
/** Hands the room request to the named desk and runs the booking check. */
const book = (desk: RegExp) => {
  fireEvent.click(screen.getByRole("button", { name: /Room request/ }))
  fireEvent.click(screen.getByRole("button", { name: desk }))
  fireEvent.click(screen.getByRole("button", { name: /Send request/ }))
}
describe("playable Speaker Night sample shell", () => {
  it("starts the prologue paused, skips to HQ and replays from the first shot", () => {
    mount()
    expect(screen.getByRole("heading", { name: "Mission: Speaker Night" })).toBeTruthy()
    expect(screen.getByText("A quiet room. A night to build.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Switch on HQ" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Sound off" }).getAttribute("aria-pressed")).toBe("false")
    fireEvent.click(screen.getByRole("button", { name: "Next frame" }))
    expect(screen.getByText("Speaker Night. 49 days. It's yours.")).toBeTruthy()
    hq()
    expect(screen.getByRole("heading", { name: "Club HQ" })).toBeTruthy()
    expect((screen.getByRole("button", { name: /Venue Table/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: /Countdown Wall/ }))
    expect(screen.getByRole("heading", { name: "Open the room request" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "HQ" }))
    fireEvent.click(screen.getByRole("button", { name: "Replay intro" }))
    expect(screen.getByText("A quiet room. A night to build.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Switch on HQ" })).toBeTruthy()
  })
  it("pauses auto-advance on Pause, hidden tabs and reduced motion", () => {
    vi.useFakeTimers()
    mount()
    fireEvent.click(screen.getByRole("button", { name: "Switch on HQ" }))
    act(() => { vi.advanceTimersByTime(10000) })
    expect(screen.getByText("Speaker Night. 49 days. It's yours.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.queryByText("Meet the crew. Bring everyone together.")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Resume" }))
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true })
    fireEvent(document, new Event("visibilitychange"))
    act(() => { vi.advanceTimersByTime(30000) })
    expect(screen.queryByText("Meet the crew. Bring everyone together.")).toBeNull()
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false })
    fireEvent.click(screen.getByRole("button", { name: "Resume" }))
    act(() => { vi.advanceTimersByTime(10000) })
    expect(screen.getByText("Meet the crew. Bring everyone together.")).toBeTruthy()
    cleanup(); localStorage.clear(); reduced = true; mount()
    fireEvent.click(screen.getByRole("button", { name: "Switch on HQ" }))
    act(() => { vi.advanceTimersByTime(40000) })
    expect(screen.getByText("A quiet room. A night to build.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Next frame" }))
    expect(screen.getByText("Speaker Night. 49 days. It's yours.")).toBeTruthy()
    hq()
    expect(screen.getByRole("heading", { name: "Club HQ" })).toBeTruthy()
  })
  it("books with the wrong account, rewinds, recovers and cites one source", () => {
    mount(); hq()
    fireEvent.click(screen.getByRole("button", { name: /Countdown Wall/ }))
    book(/Dr\. Lee/)
    expect(screen.getByRole("heading", { name: "A moment to rewind." })).toBeTruthy()
    expect(screen.getByText("The request cannot move. Use a registered officer account.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Rewind/ }))
    expect(screen.getByRole("button", { name: /Room request/ }).closest("[data-drop-col]")?.getAttribute("data-drop-col")).toBe("advisor")
    expect(JSON.parse(localStorage.getItem(SAMPLE_KEY)!).attempts).toHaveLength(1)
    const why = screen.getByRole("button", { name: "Why?" })
    why.focus()
    fireEvent.click(why)
    expect(document.querySelectorAll("blockquote")).toHaveLength(1)
    expect(screen.queryByRole("button", { name: /Send request/ })).toBeNull()
    expect(document.querySelector('[aria-label="Open the room request"]')!.hasAttribute("hidden")).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(document.querySelector("dialog")).toBeNull()
    expect(document.querySelector('[aria-label="Open the room request"]')!.hasAttribute("hidden")).toBe(false)
    expect(document.activeElement).toBe(why)
    book(/Riley/)
    expect(screen.getByText("Riley can start the room request.")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    expect(screen.getByRole("heading", { name: "Lock the Date" })).toBeTruthy()
  })

  it("keeps unknown versions and other keys untouched, degrades on quota and reloads progress", () => {
    const unknown = JSON.stringify({ version: 99, doNotOverwrite: true })
    localStorage.setItem(SAMPLE_KEY, unknown)
    mount()
    expect(screen.getByText(/Saved practice stays untouched/)).toBeTruthy()
    hq()
    expect(screen.getByRole("heading", { name: "Club HQ" })).toBeTruthy()
    expect(localStorage.getItem(SAMPLE_KEY)).toBe(unknown)
    cleanup(); localStorage.clear()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota") })
    mount()
    expect(screen.getByText(/Practice stays in this tab/)).toBeTruthy()
    vi.restoreAllMocks()
    localStorage.clear()
    localStorage.setItem(PRACTICE_KEY, "p4-original")
    localStorage.setItem("platypus.some-club", "club-original")
    cleanup(); mount(); hq()
    fireEvent.click(screen.getByRole("button", { name: /Countdown Wall/ }))
    book(/Riley/)
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    expect(localStorage.getItem(PRACTICE_KEY)).toBe("p4-original")
    expect(localStorage.getItem("platypus.some-club")).toBe("club-original")
    expect(JSON.parse(localStorage.getItem(SAMPLE_KEY)!).attempts).toHaveLength(1)
    cleanup(); mount()
    expect(screen.getByRole("heading", { name: "Lock the Date" })).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(SAMPLE_KEY)!).attempts[0].passed).toBe(true)
  })

  it("returns focus to the venue check that opened a native source dialog", () => {
    const clock = questSchedule()
    mount(); hq()
    fireEvent.click(screen.getByRole("button", { name: /Countdown Wall/ }))
    book(/Riley/)
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    // Timeline: place every task at the latest engine slot that still meets its deadline.
    const earliest = (min: number) => [...clock.slots].sort((a, b) => a - b).find(day => day >= min)!
    const place = (id: string, day: number) => {
      fireEvent.click(document.querySelector(`[data-quest-task="${id}"]`) as HTMLButtonElement)
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`Place selected task ${day === 0 ? "★" : day} ${day === 0 ? "Event" : "days"}`) }))
    }
    place("registry", earliest(clock.deadlines.registry.daysBefore))
    place("approval", 21)
    place("room", earliest(clock.deadlines.room.daysBefore))
    place("ritm", earliest(clock.deadlines.ritm.daysBefore))
    place("publicity", 7)
    fireEvent.click(screen.getByRole("button", { name: /Rehearse timeline/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    fireEvent.change(screen.getByLabelText("Dr. Lee joins"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("Dr. Lee leaves"), { target: { value: "2" } })
    fireEvent.click(screen.getByRole("button", { name: /Invite Dr. Lee/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    fireEvent.click(screen.getByRole("button", { name: /Venue Table/ }))
    for (const paper of ["Approval", "RITM number", "Confirmed room"]) {
      fireEvent.click(screen.getByRole("button", { name: paper }))
      fireEvent.click(screen.getByRole("button", { name: "Morgan's desk" }))
    }
    fireEvent.click(screen.getByRole("button", { name: "Hand over" }))
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    fireEvent.click(screen.getByRole("button", { name: "Desert Founders Society @ ASU" }))
    fireEvent.click(screen.getByRole("button", { name: "Reserved university mark" }))
    fireEvent.click(screen.getByRole("button", { name: "Merchandise order" }))
    fireEvent.click(screen.getByRole("button", { name: "Licensed vendor" }))
    fireEvent.change(screen.getByRole("spinbutton", { name: "Print count" }), { target: { value: "100" } })
    fireEvent.click(screen.getByRole("button", { name: "Artwork proof" }))
    fireEvent.click(screen.getByRole("button", { name: "RFF folder" }))
    fireEvent.click(screen.getByRole("button", { name: "Expense Includes Logo" }))
    fireEvent.click(screen.getByRole("button", { name: "Send for review" }))
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    expect(screen.getByRole("heading", { name: "Set the Stage" })).toBeTruthy()
    const capacity = screen.getByRole("button", { name: /Capacity: needs work/ })
    capacity.focus()
    fireEvent.click(capacity)
    expect(screen.getByRole("heading", { name: "Behind the moment" })).toBeTruthy()
    expect(document.querySelectorAll("blockquote")).toHaveLength(1)
    expect(document.querySelector('section[aria-label="Set the Stage"]')!.hasAttribute("hidden")).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(document.querySelector("dialog")).toBeNull()
    expect(document.querySelector('section[aria-label="Set the Stage"]')!.hasAttribute("hidden")).toBe(false)
    expect(document.activeElement).toBe(capacity)
  })
  it("gates the venue station and keeps attempt history across a new rehearsal", () => {
    mount(); hq()
    const venue = screen.getByRole("button", { name: /Venue Table/ }) as HTMLButtonElement
    expect(venue.disabled).toBe(true)
    fireEvent.click(venue)
    expect(screen.getByRole("heading", { name: "Club HQ" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Countdown Wall/ }))
    book(/Dr\. Lee/)
    fireEvent.click(screen.getByRole("button", { name: /Rewind/ }))
    book(/Riley/)
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }))
    fireEvent.click(screen.getByRole("button", { name: "Mission: Speaker Night" }))
    fireEvent.click(screen.getByRole("button", { name: "New rehearsal" }))
    expect(screen.getByRole("heading", { name: "Club HQ" })).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem(SAMPLE_KEY)!)
    expect(saved.attempts.map((a: { passed: boolean }) => a.passed)).toEqual([false, true])
    expect(saved.completed).toEqual([])
    expect(saved.requestor).toBe(null)
  })
})
