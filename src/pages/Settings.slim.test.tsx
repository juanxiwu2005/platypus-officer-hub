import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Settings from "./Settings"
import { seedDemo } from "../data/seed"
import { StoreProvider, useStore } from "../data/store"
import type { DemoState } from "../data/types"
import { personalBuffer } from "../engine/schedule"

// S6: Settings keeps fewer controls. What it no longer edits stays stored and readable.
let current: ReturnType<typeof useStore>
function Probe() { current = useStore(); return null }
const show = (state: DemoState, entry = "/settings") => render(<MemoryRouter initialEntries={[entry]}><StoreProvider initial={state}><Probe /><Settings /></StoreProvider></MemoryRouter>)
const nav = () => screen.getByRole("navigation", { name: "Settings sections" })
beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); localStorage.clear(); delete document.documentElement.dataset.theme })

describe("slimmer Settings", () => {
  it("has no Links & files tab; ?tab=links opens Club, where Planning notes saves and the stored links stay", async () => {
    const s = seedDemo(undefined, "v2")
    show(s, "/settings?tab=links")
    expect(within(nav()).getAllByRole("button").map(b => b.textContent)).toEqual(["Club", "Roles & teams", "Workflow", "Onboarding", "My preferences", "Admin"])
    expect(screen.getByRole("heading", { name: "Club", level: 2 })).toBeTruthy()
    expect(screen.queryByLabelText(/Calendar link|Drive folder|messaging channel|planning files/i)).toBeNull()
    expect(screen.queryByText("Semester goals")).toBeNull()
    fireEvent.change(screen.getByLabelText("Planning notes"), { target: { value: "We book rooms first." } })
    await waitFor(() => expect(current.state.org.workspace.planningNotes).toBe("We book rooms first."))
    expect(current.state.org.workspace.calendarUrl).toBe(s.org.workspace.calendarUrl)
    expect(current.state.org.workspace.files).toEqual(s.org.workspace.files)
    expect(current.state.org.goals).toEqual(s.org.goals)
  })

  it("keeps reminder mode and club buffer in view and the rarely used numbers behind More", () => {
    show(seedDemo(undefined, "v2"))
    const more = screen.getByTestId("tasks-events-settings")
    expect(more.tagName).toBe("DETAILS")
    expect(more.querySelector("summary")?.textContent).toBe("More")
    for (const label of ["Usual task length", "Reminder limit per task", "Private check day", "Temporary owner day", "Recovery day"]) expect(within(more).getByLabelText(label)).toBeTruthy()
    expect(within(more).getByText("Who can create events")).toBeTruthy()
    expect(more.contains(screen.getByTestId("settings-reminder-mode"))).toBe(false)
    expect(more.contains(screen.getByLabelText("Days early before ASU deadlines"))).toBe(false)
  })

  it("My preferences: plain labels, no career fields, and the private buffer from the engine", async () => {
    const s = seedDemo(undefined, "v2")
    show(s, "/settings?tab=me")
    const mine = screen.getByTestId("my-settings")
    expect(mine.textContent).not.toMatch(/\d · /)
    expect(within(mine).queryByLabelText("Career goal")).toBeNull()
    expect(within(mine).queryByLabelText("Interests")).toBeNull()
    expect(within(mine).queryByLabelText("Expectations for this role")).toBeNull()
    expect(mine.textContent).not.toContain("Use a fictional 555-01xx number")
    const viewer = s.people.find(p => p.id === s.viewerId)!
    const days = personalBuffer(s, viewer).days
    expect(screen.getByTestId("my-buffer").textContent).toBe(`Private: ${days} extra ${days === 1 ? "day" : "days"}.`)
    fireEvent.change(within(mine).getByLabelText("Fictional name"), { target: { value: `${viewer.name} Jr` } })
    await waitFor(() => expect(current.state.people.find(p => p.id === viewer.id)!.name).toBe(`${viewer.name} Jr`))
    const saved = current.state.people.find(p => p.id === viewer.id)!
    expect([saved.careerGoal, saved.interests, saved.expectations]).toEqual([viewer.careerGoal, viewer.interests, viewer.expectations])
  })

  it("My preferences: Appearance starts on Follow system and applies a choice at once, outside the demo state", () => {
    show(seedDemo(undefined, "v2"), "/settings?tab=me")
    const box = within(screen.getByTestId("settings-appearance"))
    expect(box.getAllByRole("radio").map(r => r.closest("label")!.textContent)).toEqual(["Follow system", "Always light", "Always dark"])
    expect((box.getByRole("radio", { name: "Follow system" }) as HTMLInputElement).checked).toBe(true)
    expect(document.documentElement.dataset.theme).toBeUndefined()
    const before = JSON.stringify(current.state)
    fireEvent.click(box.getByRole("radio", { name: "Always dark" }))
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(localStorage.getItem("platypus.v1.appearance")).toBe("dark")
    fireEvent.click(box.getByRole("radio", { name: "Always light" }))
    expect(document.documentElement.dataset.theme).toBe("light")
    fireEvent.click(box.getByRole("radio", { name: "Follow system" }))
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(localStorage.getItem("platypus.v1.appearance")).toBeNull()
    expect(JSON.stringify(current.state)).toBe(before)
  })
})
