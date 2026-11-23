import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Settings from "../pages/Settings"
import { seedDemo } from "../data/seed"
import { reducer, STORAGE_KEY, StoreProvider, useStore } from "../data/store"
import type { DemoState } from "../data/types"
import { PERSON_WEEKLY_EMAIL_LIMIT } from "./policy"
import { REMINDER_MODES } from "../data/reminderMode"

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
  it("states the weekly limit in one line, keeps custom task limits, and hides the retired legacy reminder days without dropping them", () => {
    const s = fixture()
    show(s)
    expect(screen.getByTestId("reminder-plan-settings").textContent).toBe(`At most ${PERSON_WEEKLY_EMAIL_LIMIT} reminders per person a week. Review plan`)
    expect(PERSON_WEEKLY_EMAIL_LIMIT).toBe(6)
    expect(screen.queryByLabelText("Legacy reminder 1 day")).toBeNull()
    expect(screen.queryByLabelText("Legacy reminder 2 day")).toBeNull()
    expect(screen.queryByText("Legacy days retained; leadership days apply.")).toBeNull()
    expect((screen.getByLabelText("Reminder limit per task") as HTMLInputElement).value).toBe("2")
    expect(current.state.org.settings).toEqual(s.org.settings)
    expect(current.state.org.settings.silenceProtocol.nudgeDays).toEqual([4, 6])
    expect((screen.getByLabelText("Private check day") as HTMLInputElement).disabled).toBe(false)
  })

  it("editing a leadership follow-up day saves it and keeps the stored legacy days", async () => {
    show(fixture())
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy())
    fireEvent.change(screen.getByLabelText("Recovery day"), { target: { value: "12" } })
    await waitFor(() => expect(current.state.org.settings.silenceProtocol.retroDay).toBe(12))
    expect(current.state.org.settings.silenceProtocol.nudgeDays).toEqual([4, 6])
  })

  it("a new club starts on I review, Platypus sends; an old save without a choice shows none ticked", () => {
    show(reducer(seedDemo(undefined, "v2"), { type: "reset" }))
    expect((screen.getByTestId("settings-reminder-mode-review_then_auto") as HTMLInputElement).checked).toBe(true)
    cleanup()
    const s = fixture(), { reminderMode: _gone, ...settings } = s.org.settings; void _gone
    show({ ...s, org: { ...s.org, settings } })
    expect(REMINDER_MODES.map(m => (screen.getByTestId(`settings-reminder-mode-${m}`) as HTMLInputElement).checked)).toEqual([false, false, false])
    expect(current.state.org.settings.reminderMode).toBeUndefined()
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
