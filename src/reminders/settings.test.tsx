import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Settings from "../pages/Settings"
import { seedDemo } from "../data/seed"
import { reducer, STORAGE_KEY, StoreProvider, useStore } from "../data/store"
import type { DemoState } from "../data/types"

let current: ReturnType<typeof useStore>
function Probe() { current = useStore(); return null }
function fixture(): DemoState {
  const s = seedDemo(undefined, "v2")
  return reducer({...s, nodes: [], nudges: [], protocolLog: [], org: {...s.org, settings: {...s.org.settings, reminderMode: "review_then_self", maxRemindersPerTask: 2, silenceProtocol: {...s.org.settings.silenceProtocol, nudgeDays: [4, 6]}}}}, {type: "upgradeReminderPlan"})
}
const show = (state: DemoState) => render(<MemoryRouter initialEntries={["/settings"]}><StoreProvider initial={state}><Probe /><Settings /></StoreProvider></MemoryRouter>)
beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

describe("saved reminder settings and migration explanation", () => {
  it("explains the new schedule while retaining custom task limits and earlier member days", () => {
    const s = fixture()
    show(s)
    expect(screen.getByTestId("reminder-plan-settings").textContent).toContain("2 per task and recipient")
    expect(screen.getByTestId("reminder-plan-settings").textContent).toContain("3 days overdue")
    expect((screen.getByLabelText("Legacy reminder 1 day") as HTMLInputElement).value).toBe("4")
    expect((screen.getByLabelText("Legacy reminder 2 day") as HTMLInputElement).disabled).toBe(true)
    expect(current.state.org.settings).toEqual(s.org.settings)
    expect((screen.getByLabelText("Private check day") as HTMLInputElement).disabled).toBe(false)
  })

  it("a failed sending-mode save leaves the old mode active, keeps the draft, and can be retried", async () => {
    const s = fixture()
    show(s)
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy())
    const original = Storage.prototype.setItem
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("Storage full")
      original.call(this, key, value)
    })
    const automatic = screen.getByTestId("settings-reminder-mode-auto_email") as HTMLInputElement
    fireEvent.click(automatic)
    await screen.findByText("Saving failed. Your changes are kept here.")
    expect(automatic.checked).toBe(true)
    expect(current.state.org.settings.reminderMode).toBe("review_then_self")
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).org.settings.reminderMode).toBe("review_then_self")
    failure.mockRestore()
    fireEvent.click(screen.getByRole("button", {name: "Retry saving"}))
    await waitFor(() => expect(current.state.org.settings.reminderMode).toBe("auto_email"))
    expect(current.state.org.settings.silenceProtocol.nudgeDays).toEqual([4, 6])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).org.settings.reminderMode).toBe("auto_email")
  })
})
