import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { HashRouter } from "react-router-dom"
import * as schedule from "../engine/schedule"
import { computeForecast, forecastFor } from "../engine/forecast"
import { aiSnapshot } from "../lib/aiContext"
import { taskList } from "../lib/assistant"
import { reducer, StoreProvider } from "../data/store"
import { seedDemo } from "../data/seed"
import App from "../App"

// forecastClock is called exactly once at the start of every computeForecast run (forecast.ts) and
// nowhere else, so counting its calls counts full 1,000-run forecasts.
vi.mock("../engine/schedule", async importOriginal => {
  const m = await importOriginal<typeof import("../engine/schedule")>()
  return { ...m, forecastClock: vi.fn(m.forecastClock) }
})
// jsdom has no ResizeObserver; the Events flow chart only needs it for its width.
vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} })
const runs = () => vi.mocked(schedule.forecastClock).mock.calls.length

describe("S3: one forecast per state change", () => {
  beforeEach(() => { vi.mocked(schedule.forecastClock).mockClear(); window.localStorage.clear() })

  it("shares one result across the AI snapshot and every assistant ranking", () => {
    const s = seedDemo("2026-10-22")
    aiSnapshot(s)
    taskList(s, s.viewerId, "mine", 3)
    taskList(s, s.viewerId, "risk", 3)
    taskList(s, s.viewerId, "team", 3)
    expect(runs()).toBe(1)
    const next = reducer(s, { type: "advanceClock", days: 3 })
    aiSnapshot(next)
    taskList(next, next.viewerId, "risk", 3)
    expect(runs()).toBe(2)
  })

  it("returns exactly what computeForecast returns", () => {
    const s = seedDemo("2026-10-22")
    expect(forecastFor(s)).toEqual(computeForecast(s))
    expect(forecastFor(s)).toBe(forecastFor(s))
  })

  it("does not recompute when switching pages, and recomputes once per change", async () => {
    window.location.hash = "#/"
    render(<StoreProvider initial={seedDemo("2026-10-22")}><HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></HashRouter></StoreProvider>)
    await screen.findByTestId("risk-list")
    expect(runs()).toBe(1)
    fireEvent.click(screen.getByRole("link", { name: "Events" }))
    await screen.findByRole("heading", { level: 1, name: "Events" })
    fireEvent.click(screen.getByRole("link", { name: "Today" }))
    await screen.findByTestId("risk-list")
    expect(runs()).toBe(1)
    fireEvent.change(screen.getByLabelText("View as"), { target: { value: "maya" } })
    await screen.findByTestId("risk-list")
    expect(runs()).toBe(2)
  })
})
