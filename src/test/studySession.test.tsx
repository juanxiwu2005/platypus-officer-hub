import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { seedDemo } from "../data/seed"
import type { LogEntry } from "../data/types"
import { appendUiLog, buildExport, keepSession, LOG_KEY, LOG_LIMIT, StoreProvider, useStore } from "../data/store"
import { firstEventChoice, loadOnboardingRecord, recordStep, startAttempt, type OnboardingAttempt } from "../lib/onboardingRecord"
import { azTime, beginSession, currentSession, resetSessionForTests, SESSION_KEY } from "../lib/studySession"
import { beginWalkthrough, endWalkthrough, forgetWalkthrough, recordEvent, recordSetup } from "../onboarding/record"
import { emitUi } from "../lib/uiLog"

// Study sessions (docs/PHASE3_DATA_DICTIONARY.md): a recorded walkthrough begins a session; the log then holds only that session,
// and the export holds only that session's entries and attempts, with counts (never content) of what came before. Fictional data only.
const T = Date.UTC(2026, 10, 7, 17, 46, 40, 337)   // 10:46:40.337 in Arizona
const old = (n: number, at = T - 86_400_000): LogEntry[] => Array.from({ length: n }, (_, i) => ({ seq: i + 1, at: at + i, actor: "alex", type: "ui.click", payload: { route: "/", role: "button", name: `Old ${i}` }, applied: true }))

beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); resetSessionForTests() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function mount(initialLog?: LogEntry[]) {
  let api!: ReturnType<typeof useStore>
  const Probe = () => { api = useStore(); return null }
  render(initialLog ? <StoreProvider initial={seedDemo("2026-10-22")} initialLog={initialLog}><Probe /></StoreProvider> : <StoreProvider><Probe /></StoreProvider>)
  return () => api
}

describe("a study session begins with a recorded walkthrough", () => {
  it("drops the earlier log entries (count kept), restarts numbering, and tags every new entry with the session id", () => {
    const store = mount(old(49))
    act(() => emitUi("ui.click", { route: "/", role: "button", name: "Before the study" }))
    expect(store().getLog()).toHaveLength(50)
    let attemptId = ""
    act(() => { attemptId = beginWalkthrough() })
    const session = currentSession()!
    expect(session.id).toMatch(/^s-[0-9a-f]{16}$/)
    expect(session.previousEntriesCleared).toBe(50)
    expect(store().getLog()).toEqual([])
    act(() => emitUi("ui.navigate", { from: "/welcome/start", to: "/welcome/founder/name" }))
    act(() => store().dispatch({ type: "setAi", enabled: false }))
    const log = store().getLog()
    expect(log.map(e => [e.seq, e.type, e.session])).toEqual([[1, "ui.navigate", session.id], [2, "setAi", session.id]])
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!)).toHaveLength(2)
    expect(loadOnboardingRecord().attempts.find(a => a.id === attemptId)!.sessionId).toBe(session.id)
    // the id is random and says nothing about a person: nothing typed, no name, no time
    expect(JSON.parse(window.localStorage.getItem(SESSION_KEY)!)).toEqual({ id: session.id, startedAt: session.startedAt, previousEntriesCleared: 50 })
  })

  it("a second walkthrough begins a fresh session again", () => {
    const store = mount([])
    act(() => { beginWalkthrough() })
    const first = currentSession()!.id
    act(() => emitUi("ui.click", { route: "/", role: "button", name: "One" }))
    act(() => emitUi("ui.click", { route: "/", role: "button", name: "Two" }))
    act(() => { beginWalkthrough() })
    expect(currentSession()!.id).not.toBe(first)
    expect(currentSession()!.previousEntriesCleared).toBe(2)
    expect(store().getLog()).toEqual([])
    const attempts = loadOnboardingRecord().attempts
    expect(attempts).toHaveLength(2)
    expect(attempts[0]).toMatchObject({ sessionId: first, outcome: "exited" })   // the open attempt ended when the link was opened again
  })

  it("the Demo menu's Test buttons start no session and record no setup", () => {
    mount([])
    forgetWalkthrough()
    recordSetup("start-workspace")
    expect(currentSession()).toBeNull()
    expect(loadOnboardingRecord().attempts).toEqual([])
  })

  it("a log loaded later keeps only the current session's entries and adds the rest to the count", () => {
    const s = beginSession(T)
    const mine = { seq: 1, at: T + 5, actor: "alex", type: "ui.click", payload: { name: "Mine" }, applied: true, session: s.id }
    window.localStorage.setItem(LOG_KEY, JSON.stringify([...old(3), mine]))   // e.g. another tab still open wrote older entries
    const store = mount()
    expect(store().getLog()).toEqual([mine])
    expect(currentSession()!.previousEntriesCleared).toBe(3)
    expect(keepSession([mine], s.id).cleared).toBe(0)
  })

  it("the 2,000-entry cap applies to the session: a full log from before does not use it up", () => {
    const store = mount(old(LOG_LIMIT))
    act(() => { beginWalkthrough() })
    expect(currentSession()!.previousEntriesCleared).toBe(LOG_LIMIT)
    const id = currentSession()!.id
    let log: LogEntry[] = store().getLog()
    for (let i = 0; i < LOG_LIMIT + 5; i++) log = appendUiLog(log, "alex", { type: "ui.click", payload: { route: "/", role: "button", name: `B${i}` } }, T + i * 1000, id)
    expect(log).toHaveLength(LOG_LIMIT)
    expect(log[0].seq).toBe(6)
    expect(log.every(e => e.session === id)).toBe(true)
  })
})

describe("setup is recorded on its own, apart from how the attempt ends", () => {
  it("Start workspace, then Exit in the officer preview: setupCompletedAt is set, the outcome stays exited", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(T)
    beginWalkthrough()
    now.mockReturnValue(T + 60_000); recordSetup("start-workspace")
    now.mockReturnValue(T + 61_000); recordSetup("start-workspace")   // a second press (double click) keeps the first time
    now.mockReturnValue(T + 90_000); recordEvent("member.you", "exit"); endWalkthrough("exited")
    const a = loadOnboardingRecord().attempts[0]
    expect(a).toMatchObject({ outcome: "exited", setupCompletedAt: T + 60_000, setupChoice: "start-workspace" })
  })

  it("Keep current demo counts as finishing setup too, with its own choice", () => {
    vi.spyOn(Date, "now").mockReturnValue(T)
    beginWalkthrough()
    recordSetup("keep-demo"); recordEvent("founder.confirm", "exit"); endWalkthrough("exited")
    expect(loadOnboardingRecord().attempts[0]).toMatchObject({ outcome: "exited", setupCompletedAt: T, setupChoice: "keep-demo" })
  })

  it("firstEventChoice comes from the step events only: skip vs planned, the last forward move wins", () => {
    const at = (steps: [string, OnboardingAttempt["steps"][number]["event"]][]): OnboardingAttempt => ({ id: "ob-x", entry: "start", flowVersion: "ob-3", replay: 0, startedAt: T, steps: steps.map(([step, event], i) => ({ step, event, at: T + i })) })
    const FE = "founder.first-event", C = "founder.confirm"
    expect(firstEventChoice(at([[FE, "enter"], [FE, "skip"], [FE, "leave"], [C, "enter"]]))).toBe("skipped")
    expect(firstEventChoice(at([[FE, "enter"], [FE, "leave"], [C, "enter"]]))).toBe("planned")
    expect(firstEventChoice(at([[FE, "enter"], [FE, "skip"], [FE, "leave"], [C, "back"], [FE, "enter"], [FE, "leave"]]))).toBe("planned")
    expect(firstEventChoice(at([[FE, "enter"], [FE, "leave"], [C, "back"], [FE, "enter"], [FE, "skip"], [FE, "leave"]]))).toBe("skipped")
    expect(firstEventChoice(at([[FE, "enter"], [FE, "back"]]))).toBeNull()
    expect(firstEventChoice(undefined)).toBeNull()
  })
})

describe("the export holds one session", () => {
  it("only this session's entries and attempts, counts of older ones, and the session summary in UTC and Arizona time", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(T - 3_600_000)
    const explored = startAttempt("explore", "ob-3")                      // an earlier visit, before the study link
    now.mockReturnValue(T)
    const store = mount(old(49))
    act(() => { beginWalkthrough() })
    const session = currentSession()!
    const attempt = loadOnboardingRecord().attempts.at(-1)!
    recordStep(attempt.id, "founder.first-event", "enter")
    now.mockReturnValue(T + 1000); recordStep(attempt.id, "founder.first-event", "skip"); recordStep(attempt.id, "founder.first-event", "leave")
    now.mockReturnValue(T + 2000); recordSetup("start-workspace")
    now.mockReturnValue(T + 3000); endWalkthrough("exited")
    act(() => emitUi("ui.click", { route: "/", role: "button", name: "Now" }))
    // a stray older entry that another tab wrote into this log after the session began
    const log = [{ seq: 99, at: T, actor: "alex", type: "ui.click", payload: {}, applied: true }, ...store().getLog()]
    const out = buildExport(seedDemo("2026-10-22"), log, T + 5000)
    expect(out.formatVersion).toBe(3)
    expect(out.interactionLog.entries.map(e => e.payload)).toEqual([expect.objectContaining({ name: "Now" })])
    expect(out.interactionLog).toMatchObject({ count: 1, firstSeq: 1, droppedEarlier: 0 })
    expect(out.onboarding.attempts.map(a => a.id)).toEqual([attempt.id])
    expect(out.onboarding.attempts.map(a => a.id)).not.toContain(explored)
    expect(out.session).toEqual({
      id: session.id, startedAt: "2026-11-07T17:46:40.337Z", startedAtMs: T, startedAtAz: "2026-11-07 10:46:40.337",
      attempt: attempt.id, outcome: "exited",
      setupCompletedAt: new Date(T + 2000).toISOString(), setupCompletedAtMs: T + 2000, setupCompletedAtAz: "2026-11-07 10:46:42.337", setupChoice: "start-workspace",
      firstEventChoice: "skipped",
      previousEntriesCleared: 49, olderEntriesLeftOut: 50, olderAttemptsLeftOut: 1,
    })
    expect(out.timeline[0]).toMatchObject({ source: "session", type: "session.start", time: "2026-11-07T17:46:40.337Z", timeAz: "2026-11-07 10:46:40.337" })
    expect(out.timeline.map(r => r.type)).toContain("onboarding.setup")
    expect(JSON.stringify(out)).not.toContain("Old 1")   // older content never appears, only counts
  })

  it("Arizona time is UTC−7 all year (no daylight saving)", () => {
    expect(azTime(Date.UTC(2026, 6, 1, 0, 30))).toBe("2026-06-30 17:30:00.000")
    expect(azTime(Date.UTC(2026, 0, 1, 6, 59, 59, 999))).toBe("2025-12-31 23:59:59.999")
    expect(azTime(undefined)).toBe("")
  })
})
