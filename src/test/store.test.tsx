import { describe, expect, it, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { HashRouter } from "react-router-dom"
import { reducer, loadState, saveState, STORAGE_KEY, StoreProvider } from "../data/store"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import App from "../App"

describe("store reducer", () => {
  const base = seedDemo("2026-10-22")

  it("setViewer switches to an existing person and ignores unknown ids", () => {
    expect(reducer(base, { type: "setViewer", viewerId: "maya" }).viewerId).toBe("maya")
    expect(reducer(base, { type: "setViewer", viewerId: "nobody" })).toBe(base)
  })

  it("setAi toggles AI features", () => {
    expect(reducer(base, { type: "setAi", enabled: false }).aiEnabled).toBe(false)
  })

  it("updateNode accepts only editable fields and re-runs the engine", () => {
    const s = reducer(base, { type: "updateNode", id: "e-night:usg", patch: { clubDeadlineOverride: "2026-11-02", title: "  Submit the USG food form  ", status: "done", officialDeadline: "2027-01-01" } as never })
    const n = s.nodes.find(x => x.id === "e-night:usg")!
    expect(n.title).toBe("Submit the USG food form")
    expect(n.status).toBe(base.nodes.find(x => x.id === "e-night:usg")!.status)
    expect(n.officialDeadline).toBe("2026-11-04")
    expect(n.clubDeadline).toBe("2026-11-02")
    expect(n.latestStart).toBe("2026-10-29")
  })

  it("updateEvent ignores a malformed date", () => {
    expect(reducer(base, { type: "updateEvent", id: "e-night", patch: { date: "next week" } })).toBe(base)
  })

  it("reset returns a fresh seed", () => {
    const changed = { ...base, viewerId: "sam", nodes: [] }
    const r = reducer(changed, { type: "reset" })
    expect(r.viewerId).toBe("alex")
    expect(r.nodes.length).toBe(base.nodes.length)
  })
})

describe("storage", () => {
  beforeEach(() => window.localStorage.clear())

  it("round-trips state through localStorage", () => {
    const s = { ...seedDemo("2026-10-22"), viewerId: "jordan" }
    saveState(s)
    expect(loadState().viewerId).toBe("jordan")
  })

  it("falls back to the seed on corrupt or old data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json")
    expect(loadState().viewerId).toBe("alex")
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1 }))
    expect(loadState().schemaVersion).toBe(SCHEMA_VERSION)
  })
})

describe("app shell", () => {
  it("renders Today with its short page title", () => {
    render(<StoreProvider initial={seedDemo("2026-10-22")}><HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></HashRouter></StoreProvider>)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Today")
  })
})
