import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MenuButton } from "./MenuButton"

afterEach(cleanup)
const setup = () => {
  const first = vi.fn(), second = vi.fn()
  render(<div><MenuButton label="More" items={[{ label: "First", onSelect: first }, { label: "Blocked", onSelect: vi.fn(), disabled: true }, { label: "Second", onSelect: second }]} /><button type="button">Outside</button></div>)
  return { first, second, trigger: screen.getByRole("button", { name: "More" }) }
}

describe("disclosure menu", () => {
  it("opens a menu, moves focus to the first item and closes after choosing", () => {
    const { first, trigger } = setup()
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("menu")).toBeNull()
    fireEvent.click(trigger)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "First" }))
    expect((screen.getByRole("menuitem", { name: "Blocked" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("menuitem", { name: "First" }))
    expect(first).toHaveBeenCalledOnce()
    expect(screen.queryByRole("menu")).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it("skips disabled items with arrow keys and closes on Escape with focus back on the trigger", () => {
    const { second, trigger } = setup()
    fireEvent.click(trigger)
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" })
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Second" }))
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
    expect(screen.queryByRole("menu")).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(second).not.toHaveBeenCalled()
  })

  it("closes on an outside click", () => {
    const { trigger } = setup()
    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }))
    expect(screen.queryByRole("menu")).toBeNull()
  })
})
