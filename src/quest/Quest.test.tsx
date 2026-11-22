import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Quest from "./Quest"
import { PRACTICE_KEY } from "./foundation"

beforeEach(() => { localStorage.clear(); Element.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const start = () => { render(<MemoryRouter><Quest /></MemoryRouter>); fireEvent.click(screen.getByRole("button", { name: /Start at the wall/ })) }
const pick = (label: string, day = 49) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }))
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Place selected task ${day} days`) }))
}
describe("playable Quest reference", () => {
  it("starts muted at HQ and enters the playable wall with source text collapsed", () => {
    start()
    expect(screen.getByRole("button", { name: "Sound off" }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("heading", { name: "Lock the Date" })).toBeTruthy()
    expect(screen.queryByRole("complementary", { name: "Why this rule matters" })).toBeNull()
    expect((screen.getByRole("button", { name: /Run the night/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Why?" }))
    expect(screen.getByText("Events should be registered 30 days prior to the event.")).toBeTruthy()
    expect(screen.getAllByRole("link", { name: /Open source/ }).length).toBeGreaterThan(0)
  })
  it("plays click/tap placement through a successful plan without altering existing club data", () => {
    localStorage.setItem("platypus.existing-club", "original")
    start()
    for (const label of ["Event Registry", "Approval", "Room request", "RITM handoff", "Publicity"]) pick(label)
    fireEvent.click(screen.getByRole("button", { name: /Run the night/ }))
    expect(screen.getByRole("heading", { name: "Date locked." })).toBeTruthy()
    expect(document.activeElement?.textContent).toBe("Date locked.")
    expect(localStorage.getItem("platypus.existing-club")).toBe("original")
    expect(JSON.parse(localStorage.getItem(PRACTICE_KEY)!).attempts[0].passed).toBe(true)
  })
  it("shows consequence and Rewind, retaining the plan and first-try result for repair", () => {
    start()
    for (const label of ["Publicity", "Event Registry", "Approval", "Room request", "RITM handoff"]) pick(label)
    fireEvent.click(screen.getByRole("button", { name: /Run the night/ }))
    expect(screen.getByRole("heading", { name: "A night worth rewinding." })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: /Rewind/ }))
    expect(screen.getAllByRole("button", { name: /^(Event Registry|Approval|Room request|RITM handoff|Publicity)$/ })).toHaveLength(5)
    expect(document.activeElement?.textContent).toContain("Publicity")
    pick("Publicity")
    fireEvent.click(screen.getByRole("button", { name: /Run the night/ }))
    expect(JSON.parse(localStorage.getItem(PRACTICE_KEY)!).attempts.map((a: { passed: boolean }) => a.passed)).toEqual([false, true])
  })
  it("supports keyboard select, arrows, Enter placement and Escape cancellation", () => {
    start()
    const registry = screen.getByRole("button", { name: /Event Registry/ })
    fireEvent.keyDown(registry, { key: "Enter" })
    fireEvent.keyDown(registry, { key: "ArrowRight" })
    fireEvent.keyDown(registry, { key: "Enter" })
    expect(screen.getByRole("button", { name: /Event Registry/ }).closest("[data-drop-col]")?.getAttribute("data-drop-col")).toBe("day:42")
    const room = screen.getByRole("button", { name: /Room request/ })
    fireEvent.keyDown(room, { key: "Enter" }); fireEvent.keyDown(room, { key: "Escape" })
    expect(room.getAttribute("aria-pressed")).toBe("false")
    expect(room.closest("[data-drop-col]")?.getAttribute("data-drop-col")).toBe("tray")
  })
  it("restores a partial plan on reload and uses hint-only Pip", () => {
    start(); pick("Event Registry", 42); cleanup()
    render(<MemoryRouter><Quest /></MemoryRouter>)
    expect(screen.getByRole("button", { name: /Event Registry/ }).closest("[data-drop-col]")?.getAttribute("data-drop-col")).toBe("day:42")
    fireEvent.click(screen.getByRole("button", { name: "Pip's hint" }))
    expect(screen.getByText("Your room request will ask for a number.")).toBeTruthy()
  })
  it("keeps newer saved state untouched and remains playable in memory", () => {
    const original = JSON.stringify({ version: 99, doNotOverwrite: true })
    localStorage.setItem(PRACTICE_KEY, original); start(); pick("Event Registry")
    expect(localStorage.getItem(PRACTICE_KEY)).toBe(original)
    expect(screen.getByText(/Saved practice stays untouched/)).toBeTruthy()
  })
  it("stays usable when persistence quota fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota") })
    start(); pick("Event Registry")
    expect(screen.getByText(/Saving is unavailable/)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Event Registry/ }).closest("[data-drop-col]")?.getAttribute("data-drop-col")).toBe("day:49")
  })
})
