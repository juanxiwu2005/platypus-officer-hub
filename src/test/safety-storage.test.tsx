import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { FLOW_VERSION } from "../onboarding/record"
import type { LogEntry } from "../data/types"
import {
  appendLog, buildExport, loadLog, loadStateWithNotice, LOG_KEY, LOG_LIMIT, loggedReducer, STORAGE_KEY, StoreProvider, useStore, type Action,
} from "../data/store"

const BACKUP = `${STORAGE_KEY}.backup.`
const base = () => seedDemo("2026-10-22")
const OLD = JSON.stringify({ schemaVersion: SCHEMA_VERSION - 1, marker: "my club's work, typed by a participant" })

beforeEach(() => window.localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe("A7 · saved data is never thrown away silently", () => {
  it("keeps the old data, untouched, under a key that names its version", () => {
    window.localStorage.setItem(STORAGE_KEY, OLD)
    const { state, notice } = loadStateWithNotice()
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(notice).toMatchObject({ kind: "restored_demo", why: "version", fromVersion: SCHEMA_VERSION - 1, backupKey: `${BACKUP}v${SCHEMA_VERSION - 1}` })
    expect(window.localStorage.getItem(`${BACKUP}v${SCHEMA_VERSION - 1}`)).toBe(OLD)
  })

  it("loading twice (React development mode does) does not make duplicate backups; different data gets its own key", () => {
    window.localStorage.setItem(STORAGE_KEY, OLD)
    loadStateWithNotice(); loadStateWithNotice()
    expect(Object.keys(window.localStorage).filter(k => k.startsWith(BACKUP))).toHaveLength(1)
    const other = JSON.stringify({ schemaVersion: SCHEMA_VERSION - 1, marker: "a second, different save" })
    window.localStorage.setItem(STORAGE_KEY, other)
    expect(loadStateWithNotice().notice).toMatchObject({ backupKey: `${BACKUP}v${SCHEMA_VERSION - 1}.2` })
    expect(window.localStorage.getItem(`${BACKUP}v${SCHEMA_VERSION - 1}`)).toBe(OLD)
  })

  it("unreadable (damaged) data is kept too, and the person is told it was damaged", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json")
    const { notice } = loadStateWithNotice()
    expect(notice).toMatchObject({ kind: "restored_demo", why: "unreadable", backupKey: `${BACKUP}unreadable` })
    expect(window.localStorage.getItem(`${BACKUP}unreadable`)).toBe("{not json")
  })

  it("current-version data loads with no notice", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base(), viewerId: "jordan" }))
    const { state, notice } = loadStateWithNotice()
    expect(state.viewerId).toBe("jordan")
    expect(notice).toBeNull()
  })

  it("shows a visible message when old data was restored, naming where it is kept", () => {
    window.localStorage.setItem(STORAGE_KEY, OLD)
    render(<StoreProvider><p>app</p></StoreProvider>)
    const banner = screen.getByTestId("storage-banner")
    expect(banner.textContent).toContain("could not be opened")
    expect(banner.textContent).toContain(`${BACKUP}v${SCHEMA_VERSION - 1}`)
    expect(screen.getByRole("button", { name: "Download previous data" })).toBeTruthy()
    // the old copy is still there after the app has saved its new data
    expect(window.localStorage.getItem(`${BACKUP}v${SCHEMA_VERSION - 1}`)).toBe(OLD)
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION)
  })

  it("if the backup itself cannot be written, the old data stays in place and nothing overwrites it", () => {
    window.localStorage.setItem(STORAGE_KEY, OLD)
    const real = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.includes(".backup.")) throw new DOMException("full", "QuotaExceededError")
      return real.call(this, k, v)
    })
    render(<StoreProvider><p>app</p></StoreProvider>)
    expect(screen.getByTestId("storage-banner").textContent).toContain("could NOT be backed up")
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(OLD)
  })

  it("tells the person when saving fails, and the message goes away once saving works again", () => {
    let full = true
    const real = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      if (full) throw new DOMException("quota", "QuotaExceededError")
      return real.call(this, k, v)
    })
    let dispatch!: (a: Action) => void
    const Probe = () => { dispatch = useStore().dispatch; return null }
    render(<StoreProvider initial={base()}><Probe /></StoreProvider>)
    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("could not be saved")
    expect(screen.getByRole("button", { name: "Download my data" })).toBeTruthy()
    full = false
    act(() => dispatch({ type: "setAi", enabled: false }))
    expect(screen.queryByRole("alert")).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).aiEnabled).toBe(false)
  })
})

describe("A7b · append-only interaction log", () => {
  const T = 1_800_000_000_000
  const run = (actions: Action[]) => {
    let root = { app: base(), log: [] as LogEntry[] }
    actions.forEach((action, i) => { root = loggedReducer(root, { action, at: T + i * 1000 }) })
    return root
  }

  it("five different actions leave five entries, in order, with the right earlier values", () => {
    const seed = base()
    const oldDeadline = seed.nodes.find(n => n.id === "e-night:usg")!.clubDeadlineOverride
    const oldHeadcount = seed.events.find(e => e.id === "e-night")!.headcount
    const { app, log } = run([
      { type: "updateNode", id: "e-night:usg", patch: { clubDeadlineOverride: "2026-11-02" } },
      { type: "updateEvent", id: "e-night", patch: { headcount: 77 } },
      { type: "setAi", enabled: false },
      { type: "addTask", title: "Order name tags", status: "accepted" },
      { type: "setViewer", viewerId: "maya" },
    ])
    expect(log).toHaveLength(5)
    expect(log.map(e => e.seq)).toEqual([1, 2, 3, 4, 5])
    expect(log.map(e => e.type)).toEqual(["updateNode", "updateEvent", "setAi", "addTask", "setViewer"])
    expect(log.map(e => e.at)).toEqual([T, T + 1000, T + 2000, T + 3000, T + 4000])
    expect(log.map(e => e.actor)).toEqual(["alex", "alex", "alex", "alex", "alex"]) // who was "viewing as" when it ran
    expect(log[0].before).toEqual({ clubDeadlineOverride: oldDeadline ?? null })
    expect(log[1].before).toEqual({ headcount: oldHeadcount })
    expect(log[2].before).toEqual({ aiEnabled: true })
    expect(log[3].before).toBeUndefined() // creating something: nothing existed before
    expect(log[4].before).toEqual({ viewerId: "alex" })
    expect(log[0].payload).toEqual({ id: "e-night:usg", patch: { clubDeadlineOverride: "2026-11-02" } })
    expect(log[3].payload).toEqual({ title: "Order name tags", status: "accepted" })
    expect(log.every(e => e.applied)).toBe(true)
    expect(app.viewerId).toBe("maya")
    // The screen's dates still follow the fixed demo clock, not the real clock the log uses.
    expect(app.today).toBe("2026-10-22")
  })

  it("records actions the app ignored, marked as not applied", () => {
    const { log } = run([{ type: "setViewer", viewerId: "nobody" }])
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ type: "setViewer", applied: false, actor: "alex" })
  })

  it("keeps only the newest 2000 entries and keeps numbering", () => {
    const full: LogEntry[] = Array.from({ length: LOG_LIMIT }, (_, i) => ({ seq: i + 1, at: T, actor: "alex", type: "setAi", payload: {}, applied: true }))
    const s = base()
    const next = appendLog(full, s, s, { type: "setAi", enabled: true }, T + 1)
    expect(next).toHaveLength(LOG_LIMIT)
    expect(next[0].seq).toBe(2)
    expect(next[LOG_LIMIT - 1].seq).toBe(LOG_LIMIT + 1)
  })

  it("never writes tokens, signatures or long text into the log", () => {
    const s = base()
    const grant = { id: "g1", nodeId: "t-news", ownerId: "priya", ownerVersion: 0, issuedOn: "2026-10-22", signature: "a".repeat(64), usedOn: null } as never
    const secret = "TOKEN-123456789"
    const log = [
      appendLog([], s, s, { type: "officerAction", token: secret, reply: "done" }, T),
      appendLog([], s, s, { type: "issueOfficerGrant", grant }, T),
      appendLog([], s, s, { type: "reportOutput", outputId: "x".repeat(5000), text: "y".repeat(5000) }, T),
    ].flat()
    const text = JSON.stringify(log)
    expect(text).not.toContain(secret)
    expect(text).not.toContain("a".repeat(64))
    expect(text.length).toBeLessThan(1500)
  })

  it("is saved with the app, keeps the real clock for `at`, and survives Reset demo and a data-version change", () => {
    let dispatch!: (a: Action) => void
    const Probe = () => { dispatch = useStore().dispatch; return null }
    const before = Date.now()
    render(<StoreProvider initial={base()}><Probe /></StoreProvider>)
    act(() => dispatch({ type: "setAi", enabled: false }))
    act(() => dispatch({ type: "reset" }))
    const saved = JSON.parse(window.localStorage.getItem(LOG_KEY)!) as LogEntry[]
    expect(saved.map(e => e.type)).toEqual(["setAi", "reset"])
    expect(saved[0].at).toBeGreaterThanOrEqual(before)
    expect(saved[0].at).toBeLessThanOrEqual(Date.now())
    // a later visit with a changed data structure: the app data is backed up, the log is untouched
    window.localStorage.setItem(STORAGE_KEY, OLD)
    expect(loadStateWithNotice().notice?.kind).toBe("restored_demo")
    expect(loadLog().map(e => e.seq)).toEqual([1, 2])
  })

  it("a damaged log is backed up, not erased", () => {
    window.localStorage.setItem(LOG_KEY, "[{broken")
    expect(loadLog()).toEqual([])
    expect(window.localStorage.getItem(`${BACKUP}log-unreadable`)).toBe("[{broken")
  })
})

describe("A7c · export", () => {
  it("bundles the current data and the whole log, and says how many early entries were dropped", () => {
    const s = { ...base(), demoLinkKey: "secret-demo-key" }
    const log: LogEntry[] = [{ seq: 41, at: 5, actor: "alex", type: "setAi", payload: { enabled: false }, before: { aiEnabled: true }, applied: true }, { seq: 42, at: 6, actor: "alex", type: "reset", payload: {}, applied: true }]
    const out = buildExport(s, log, Date.UTC(2026, 10, 9, 12, 0, 0))
    // formatVersion 2 (Phase 3 logging) keeps every version-1 field and adds build info, the demo date, the flow version and a merged timeline.
    expect(out).toMatchObject({ format: "platypus-export", formatVersion: 2, exportedAt: "2026-11-09T12:00:00.000Z", schemaVersion: SCHEMA_VERSION, demoToday: s.today, onboardingFlowVersion: FLOW_VERSION })
    expect(Object.keys(out.build).sort()).toEqual(["branch", "commit", "context", "version"])
    expect(out.timeline.map(r => [r.source, r.seq, r.type])).toEqual([["log", 41, "setAi"], ["log", 42, "reset"]])
    expect(out.interactionLog).toMatchObject({ limit: LOG_LIMIT, count: 2, firstSeq: 41, lastSeq: 42, droppedEarlier: 40 })
    expect(out.interactionLog.entries).toEqual(log)
    expect(out.state.nodes).toHaveLength(s.nodes.length)
    expect(JSON.stringify(out)).not.toContain("secret-demo-key")
  })
})
