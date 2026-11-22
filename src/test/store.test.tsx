import { afterEach, describe, expect, it, beforeEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { HashRouter } from "react-router-dom"
import { reducer, loadState, loadStateWithNotice, saveState, STORAGE_KEY, StoreProvider } from "../data/store"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { ensureWorkflowPresetTeams } from "../data/workflowTeamDefaults"
import App from "../App"

// Unmount the rendered app after each test so its timers (e.g. the side-panel exit delay) do not fire after the test environment is gone.
afterEach(cleanup)

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
    // A v17 save predates FB-6, so its nodes carry no calibrated timing: the check-in anchor still dates them.
    const v17 = { ...base, schemaVersion: 17, nodes: base.nodes.map(({ timing: _timing, ...node }) => node.stepKey === "checkin" ? { ...node, anchor: null } : node) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(v17))
    const repaired = loadState()
    for (const node of repaired.nodes.filter(node => node.stepKey === "checkin")) {
      expect(node.anchor).toEqual({ kind: "target", days: 1, unit: "business", label: "Check-in materials ready" })
    }
    expect(repaired.nodes.find(node => node.id === "e-founder:checkin")?.clubDeadline).toBe("2026-12-02")
  })

  it.each([12, 14, 15, 17, 18, 19])("completes only the saved v%i Spring Speaker Night plan and preserves other work", (version) => {
    const current = seedDemo(undefined, "v2")
    const saved = { ...current, schemaVersion: version, viewerId: "maya", nodes: current.nodes.map(node => node.id === "e-speaker:plan" ? { ...node, status: "accepted" as const, completedOn: undefined } : node.id === "e-speaker:backup" ? { ...node, title: "Keep my backup notes", status: "in_progress" as const } : node) }
    saveState(saved)
    const { state, notice } = loadStateWithNotice()
    expect(notice).toBeNull()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.nodes.find(node => node.id === "e-speaker:plan")).toMatchObject({ status: "done", completedOn: saved.today })
    expect(state.nodes.map(node => ({ id: node.id, title: node.title, status: node.status }))).toEqual(saved.nodes.map(node => ({ id: node.id, title: node.title, status: node.id === "e-speaker:plan" ? "done" : node.status })))
    expect(state.events).toEqual(saved.events)
    expect(state.org).toEqual(ensureWorkflowPresetTeams(saved).org)
    expect(state.people).toEqual(saved.people)
    expect(state.viewerId).toBe("maya")
    saveState({ ...state, nodes: state.nodes.map(node => node.id === "e-speaker:plan" ? { ...node, status: "accepted" as const, completedOn: undefined } : node) })
    expect(loadState().nodes.find(node => node.id === "e-speaker:plan")?.status).toBe("accepted")
  })

  it("does not change an already completed plan or a different organization's saved plan", () => {
    const current = seedDemo(undefined, "v2")
    const done = { ...current, schemaVersion: 18, nodes: current.nodes.map(node => node.id === "e-speaker:plan" ? { ...node, completedOn: "2026-10-30", lastUpdate: "2026-10-30" } : node) }
    saveState(done)
    expect(loadState().nodes.find(node => node.id === "e-speaker:plan")).toMatchObject({ status: "done", completedOn: "2026-10-30", lastUpdate: "2026-10-30" })
    saveState({ ...done, org: { ...done.org, id: "another-club" }, nodes: done.nodes.map(node => node.id === "e-speaker:plan" ? { ...node, status: "accepted" as const, completedOn: undefined } : node) })
    expect(loadState().nodes.find(node => node.id === "e-speaker:plan")?.status).toBe("accepted")
  })

  it("completes the plan after rebuilding a legacy event graph without resetting the club", () => {
    const saved = { ...seedDemo(undefined, "legacy"), schemaVersion: 11, viewerId: "maya" }
    saveState(saved)
    const { state, notice } = loadStateWithNotice()
    expect(notice).toBeNull()
    expect(state.nodes.find(node => node.id === "e-speaker:plan")).toMatchObject({ status: "done", completedOn: saved.today })
    expect(state.events.map(event => event.id)).toEqual(saved.events.map(event => event.id))
    expect(state.people).toEqual(saved.people)
    expect(state.viewerId).toBe("maya")
  })
})

describe("app shell", () => {
  // FB-8: the home page is the reminder centre, titled Reminders.
  it("renders the home page (Reminders) with its short page title", () => {
    render(<StoreProvider initial={seedDemo("2026-10-22")}><HashRouter><App /></HashRouter></StoreProvider>)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Reminders")
  })
})
