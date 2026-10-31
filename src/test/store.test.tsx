import { describe, expect, it, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { HashRouter } from "react-router-dom"
import { reducer, loadState, saveState, STORAGE_KEY, StoreProvider } from "../data/store"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import App from "../App"

describe("store reducer", () => {
  const base = seedDemo("2026-10-22", "v2")

  it("setViewer switches to an existing person and ignores unknown ids", () => {
    expect(reducer(base, { type: "setViewer", viewerId: "maya" }).viewerId).toBe("maya")
    expect(reducer(base, { type: "setViewer", viewerId: "nobody" })).toBe(base)
  })

  it("setAi toggles AI features", () => {
    expect(reducer(base, { type: "setAi", enabled: false }).aiEnabled).toBe(false)
  })

  it("updateNode accepts only editable fields and re-runs the engine", () => {
    const s = reducer(base, { type: "updateNode", id: "e-night:purchaseRequest", patch: { clubDeadlineOverride: "2026-11-02", title: "  Submit the purchase request  ", status: "done", officialDeadline: "2027-01-01" } as never })
    const n = s.nodes.find(x => x.id === "e-night:purchaseRequest")!
    expect(n.title).toBe("Submit the purchase request")
    expect(n.status).toBe(base.nodes.find(x => x.id === "e-night:purchaseRequest")!.status)
    expect(n.officialDeadline).toBe(base.nodes.find(x => x.id === "e-night:purchaseRequest")!.officialDeadline)
    expect(n.clubDeadlineOverride).toBe("2026-11-02")
    expect(n.clubDeadline).toBe(base.nodes.find(x => x.id === "e-night:purchaseRequest")!.clubDeadline)
    expect(n.latestStart).toBe(base.nodes.find(x => x.id === "e-night:purchaseRequest")!.latestStart)
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

  it("repairs a verifiable missing event link and named waiting teammate from v14", () => {
    const base = seedDemo("2026-10-22", "v2")
    const v14 = {
      ...base,
      schemaVersion: 14,
      nodes: base.nodes.map(node => node.id === "e-night:quotes" ? { ...node, eventId: null } : node.id === "t-news" ? { ...node, waitingOn: "Priya Nair", waitingOnPersonId: undefined } : node),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v14))
    const repaired = loadState()
    expect(repaired.nodes.find(node => node.id === "e-night:quotes")?.eventId).toBe("e-night")
    expect(repaired.nodes.find(node => node.id === "t-news")?.waitingOnPersonId).toBe("priya")
  })

  it("restores only a missing core template step from v15 without replacing progress", () => {
    const base = seedDemo("2026-10-22", "v2")
    const v15 = { ...base, schemaVersion: 15, nodes: base.nodes.filter(node => node.id !== "e-night:orderPlaced") }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v15))
    const repaired = loadState()
    expect(repaired.nodes.find(node => node.id === "e-night:orderPlaced")).toMatchObject({ eventId: "e-night", stepKey: "orderPlaced", status: "accepted" })
    expect(repaired.nodes.find(node => node.id === "e-night:plan")?.status).toBe("done")
  })

  it("repairs every saved v17 check-in task to the pre-event business-day deadline", () => {
    const base = seedDemo(undefined, "v2")
    const v17 = { ...base, schemaVersion: 17, nodes: base.nodes.map(node => node.stepKey === "checkin" ? { ...node, anchor: null } : node) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v17))
    const repaired = loadState()
    for (const node of repaired.nodes.filter(node => node.stepKey === "checkin")) {
      expect(node.anchor).toEqual({ kind: "target", days: 1, unit: "business", label: "Check-in materials ready" })
    }
    expect(repaired.nodes.find(node => node.id === "e-founder:checkin")?.clubDeadline).toBe("2026-12-02")
  })
})

describe("app shell", () => {
  it("renders Today with its short page title", () => {
    render(<StoreProvider initial={seedDemo("2026-10-22")}><HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></HashRouter></StoreProvider>)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Today")
  })
})
