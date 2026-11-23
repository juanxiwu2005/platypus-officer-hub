import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { seedDemo } from "../data/seed"
import type { LogEntry } from "../data/types"
import { appendUiLog, buildExport, keepSitting, LOG_KEY, LOG_LIMIT, StoreProvider, useStore } from "../data/store"
import { firstEventChoice, loadOnboardingRecord, recordStep, reminderModeChoice, startAttempt, type OnboardingAttempt } from "../lib/onboardingRecord"
import { buildTimeline } from "../lib/timeline"
import { azTime, currentSession, keeper, loadBook, resetSessionForTests, SESSION_KEY, SITTING_MS } from "../lib/studySession"
import { beginWalkthrough, endWalkthrough, forgetWalkthrough, recordEvent, recordSetup } from "../onboarding/record"
import { emitUi } from "../lib/uiLog"

// Study sessions (docs/PHASE3_DATA_DICTIONARY.md §1.1): a recorded walkthrough begins a session. Its start removes only data from an earlier
// sitting (older than 6 hours), counted; the last 6 hours stay, so opening the study link again mid-session loses nothing. Fictional data only.
const T = Date.UTC(2026, 10, 7, 17, 46, 40, 337)   // 10:46:40.337 in Arizona
const H = 3600_000
const entries = (n: number, at: number, from = 1, session?: string): LogEntry[] => Array.from({ length: n }, (_, i) => ({ seq: from + i, at: at + i, actor: "alex", type: "ui.click", payload: { route: "/", role: "button", name: `Click ${from + i}` }, applied: true, ...(session ? { session } : {}) }))
let now = T

beforeEach(() => {
  window.localStorage.clear(); window.sessionStorage.clear(); resetSessionForTests()
  now = T
  vi.spyOn(Date, "now").mockImplementation(() => now)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

function mount(initialLog?: LogEntry[]) {
  let api!: ReturnType<typeof useStore>
  const Probe = () => { api = useStore(); return null }
  render(initialLog ? <StoreProvider initial={seedDemo("2026-10-22")} initialLog={initialLog}><Probe /></StoreProvider> : <StoreProvider><Probe /></StoreProvider>)
  return () => api
}
const click = (name: string) => act(() => emitUi("ui.click", { route: "/", role: "button", name }))

describe("a study session begins with a recorded walkthrough", () => {
  it("removes only entries older than 6 hours (counted), keeps the last 6 hours, and tags new entries; numbering goes on", () => {
    const store = mount([...entries(49, T - 24 * H), ...entries(3, T - 1 * H, 50)])   // a different day, then browsing just before the link
    act(() => { beginWalkthrough() })
    const session = currentSession()!
    expect(session.id).toMatch(/^s-[0-9a-f]{16}$/)
    expect(session).toMatchObject({ startedAt: T, previousEntriesCleared: 49, previousAttemptsCleared: 0 })
    expect(store().getLog().map(e => e.seq)).toEqual([50, 51, 52])
    now = T + 1000; click("After the link")
    act(() => store().dispatch({ type: "setAi", enabled: false }))
    expect(store().getLog().slice(-2).map(e => [e.seq, e.session])).toEqual([[53, session.id], [54, session.id]])
    expect(JSON.parse(window.localStorage.getItem(LOG_KEY)!)).toHaveLength(5)
    // only counts and a random id are kept about the session
    expect(JSON.parse(window.localStorage.getItem(SESSION_KEY)!)).toEqual({ sessions: [session], seqCleared: 49 })
  })

  it("opening the study link again mid-session loses nothing: the export holds both sessions", () => {
    const store = mount([])
    act(() => { beginWalkthrough() })
    const first = currentSession()!.id
    now = T + 60_000; click("One"); click("Two")
    now = T + 20 * 60_000
    act(() => { beginWalkthrough() })
    const second = currentSession()!
    expect(second.id).not.toBe(first)
    expect(second.previousEntriesCleared).toBe(0)
    now = T + 21 * 60_000; click("Three")
    expect(store().getLog().map(e => [e.seq, e.session])).toEqual([[1, first], [2, first], [3, second.id]])
    const out = buildExport(seedDemo("2026-10-22"), store().getLog(), now)
    expect(out.sessions.map(s => [s.id, s.entries])).toEqual([[first, 2], [second.id, 1]])
    expect(out.session).toMatchObject({ id: second.id, olderEntriesLeftOut: 0, olderAttemptsLeftOut: 0 })
    expect(out.onboarding.attempts.map(a => [a.sessionId, a.outcome])).toEqual([[first, "exited"], [second.id, undefined]])   // the first attempt ended when the link was opened again
    expect(out.timeline.filter(r => r.type === "session.start").map(r => r.session)).toEqual([first, second.id])
  })

  it("a session lasts one sitting: after 6 hours new entries carry none, and the next start removes the old sitting", () => {
    const store = mount([])
    act(() => { beginWalkthrough() })
    const old = currentSession()!.id
    now = T + 1000; click("Morning")
    now = T + 7 * H; click("Evening, no session")
    expect(store().getLog().map(e => e.session)).toEqual([old, undefined])
    act(() => { beginWalkthrough() })
    expect(currentSession()!.previousEntriesCleared).toBe(1)
    expect(currentSession()!.previousAttemptsCleared).toBe(1)
    expect(store().getLog().map(e => e.payload)).toEqual([expect.objectContaining({ name: "Evening, no session" })])
    expect(loadOnboardingRecord().attempts).toHaveLength(1)
  })

  it("the Demo menu's Test buttons start no session and record no setup", () => {
    mount([])
    forgetWalkthrough()
    recordSetup("start-workspace")
    expect(currentSession()).toBeNull()
    expect(loadOnboardingRecord().attempts).toEqual([])
  })

  it("the keep rule: the last 6 hours, or a session that began within them", () => {
    const keep = keeper([{ id: "s-aaaa", startedAt: T - 7 * H, previousEntriesCleared: 0, previousAttemptsCleared: 0 }, { id: "s-bbbb", startedAt: T - 5 * H, previousEntriesCleared: 0, previousAttemptsCleared: 0 }], T)
    expect(keep(T - SITTING_MS, null)).toBe(true)
    expect(keep(T - SITTING_MS - 1, null)).toBe(false)
    expect(keep(T - SITTING_MS - 1, "s-aaaa")).toBe(false)
    expect(keep(T - SITTING_MS - 1, "s-bbbb")).toBe(true)   // clock moved back: the session's own start decides
    expect(keepSitting(entries(2, T), keep).cleared).toBe(0)
  })
})

describe("the 2,000-entry cap covers the whole kept log", () => {
  it("oldest dropped first across sessions, and the export tells cap drops apart from the 6-hour clean-up", () => {
    const store = mount([...entries(10, T - 24 * H), ...entries(LOG_LIMIT, T - H, 11, "s-1111")])
    act(() => { beginWalkthrough() })
    const id = currentSession()!.id
    expect(currentSession()!.previousEntriesCleared).toBe(10)
    expect(loadBook().seqCleared).toBe(10)
    let log: LogEntry[] = store().getLog()
    for (let i = 0; i < 15; i++) log = appendUiLog(log, "alex", { type: "ui.click", payload: { route: "/", role: "button", name: `B${i}` } }, T + i * 1000, id)
    expect(log).toHaveLength(LOG_LIMIT)
    expect(log[0].seq).toBe(26)                                        // 10 cleared by age, then the 15 oldest dropped by the cap
    const out = buildExport(seedDemo("2026-10-22"), log, T + 60_000)
    expect(out.interactionLog).toMatchObject({ count: LOG_LIMIT, firstSeq: 26, droppedEarlier: 15 })
    expect(out.session).toMatchObject({ id, previousEntriesCleared: 10, olderEntriesLeftOut: 10 })
  })
})

describe("setup is recorded on its own, apart from how the attempt ends", () => {
  it("Start workspace, then Exit in the officer preview: setupCompletedAt is set, the outcome stays exited", () => {
    beginWalkthrough()
    now = T + 60_000; recordSetup("start-workspace")
    now = T + 61_000; recordSetup("start-workspace")   // a second press (double click) keeps the first time
    now = T + 90_000; recordEvent("member.you", "exit"); endWalkthrough("exited")
    expect(loadOnboardingRecord().attempts[0]).toMatchObject({ outcome: "exited", setupCompletedAt: T + 60_000, setupChoice: "start-workspace" })
  })

  it("Keep current demo counts as finishing setup too, with its own choice", () => {
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

  it("reminderModeChoice (P3-H): skip from the step events; a choice from the last tick on the screen before it was left; the saved value only as a fallback", () => {
    type Ev = OnboardingAttempt["steps"][number]["event"]
    const R = "founder.reminders", C = "founder.confirm"
    const at = (steps: [string, Ev, number][], extra: Partial<OnboardingAttempt> = {}): OnboardingAttempt => ({ id: "ob-r", entry: "start", flowVersion: "ob-4", replay: 0, startedAt: T, sessionId: "s-1", steps: steps.map(([step, event, ms]) => ({ step, event, at: T + ms })), ...extra })
    const tick = (seq: number, ms: number, testid: string, extra: Record<string, unknown> = {}, session = "s-1"): LogEntry => ({ seq, at: T + ms, actor: "alex", type: "ui.change", payload: { route: "/welcome/founder/reminders", role: "radio", name: "x", testid, checked: true, group: "How should reminders go out?", ...extra }, applied: true, session })
    const log = [tick(1, 10, "reminder-mode-auto_email"), tick(2, 20, "reminder-mode-review_then_auto"), tick(3, 90, "reminder-mode-review_then_self")]
    // Continue after two ticks: the last tick before leaving counts (the third came after, from a later visit).
    expect(reminderModeChoice(at([[R, "enter", 0], [R, "leave", 30], [C, "enter", 30]]), log)).toBe("review_then_auto")
    // Back from Confirm, change of mind, Continue again: the later tick wins.
    expect(reminderModeChoice(at([[R, "enter", 0], [R, "leave", 30], [C, "back", 50], [R, "enter", 50], [R, "leave", 95]]), log)).toBe("review_then_self")
    // Skip for now, even after a tick.
    expect(reminderModeChoice(at([[R, "enter", 0], [R, "skip", 30], [R, "leave", 30]]), log)).toBe("skipped")
    // Never left forward: null.
    expect(reminderModeChoice(at([[R, "enter", 0], [R, "back", 30]]), log)).toBeNull()
    expect(reminderModeChoice(undefined, log)).toBeNull()
    // Ticks from another session, another page, or an untick do not count; then the saved value is the fallback, and nothing else is.
    const others = [tick(1, 10, "reminder-mode-auto_email", {}, "s-2"), tick(2, 12, "reminder-mode-auto_email", { route: "/settings" }), tick(3, 14, "reminder-mode-auto_email", { checked: false })]
    const left = at([[R, "enter", 0], [R, "leave", 30]])
    expect(reminderModeChoice(left, others)).toBeNull()
    expect(reminderModeChoice(left, others, "review_then_self")).toBe("review_then_self")
    expect(reminderModeChoice(left, others, "anything")).toBeNull()
    // Leaving after setup ended does not count (setup is what the answer was for).
    expect(reminderModeChoice(at([[R, "enter", 0], [R, "leave", 30]], { setupCompletedAt: T + 5 }), log)).toBeNull()
    // The timeline's setup row says it in plain words.
    const done = at([[R, "enter", 0], [R, "leave", 30]], { setupCompletedAt: T + 40, setupChoice: "start-workspace" })
    expect(buildTimeline(log, { attempts: [done] }).find(r => r.type === "onboarding.setup")?.desc).toBe("Setup finished: Start workspace; reminders: review_then_auto")
    // ob-5 (S2) has no Reminders screen: its attempts have no answer, even with the club's stored default and old ticks in the log.
    const ob5 = { ...at([[C, "enter", 0]], { setupCompletedAt: T + 40, setupChoice: "start-workspace" }), flowVersion: "ob-5" }
    expect(reminderModeChoice(ob5, log, "review_then_auto")).toBeNull()
    expect(buildTimeline(log, { attempts: [ob5] }).find(r => r.type === "onboarding.setup")?.desc).toBe("Setup finished: Start workspace")
  })
})

describe("the export", () => {
  it("lists the sessions, the latest as `session` with counts, in UTC and Arizona time; older content never appears", () => {
    now = T - 24 * H
    const explored = startAttempt("explore", "ob-3")                      // a visit the day before
    now = T
    const store = mount(entries(49, T - 24 * H))
    act(() => { beginWalkthrough() })
    const session = currentSession()!
    const attempt = loadOnboardingRecord().attempts.at(-1)!
    recordStep(attempt.id, "founder.name", "enter")   // ob-6: the first event is on screen 1
    now = T + 1000; recordStep(attempt.id, "founder.name", "skip"); recordStep(attempt.id, "founder.name", "leave")
    now = T + 2000; recordSetup("start-workspace")
    now = T + 3000; endWalkthrough("exited")
    click("Now")
    // a stray older entry that a stale tab wrote back into this log after the session began
    const log = [...entries(1, T - 30 * H, 99), ...store().getLog()]
    const out = buildExport(seedDemo("2026-10-22"), log, T + 5000)
    expect(out.formatVersion).toBe(3)
    expect(out.interactionLog.entries.map(e => e.payload)).toEqual([expect.objectContaining({ name: "Now" })])
    expect(out.onboarding.attempts.map(a => a.id)).toEqual([attempt.id])
    expect(out.onboarding.attempts.map(a => a.id)).not.toContain(explored)
    const item = {
      id: session.id, startedAt: "2026-11-07T17:46:40.337Z", startedAtMs: T, startedAtAz: "2026-11-07 10:46:40.337",
      attempt: attempt.id, outcome: "exited",
      setupCompletedAt: new Date(T + 2000).toISOString(), setupCompletedAtMs: T + 2000, setupCompletedAtAz: "2026-11-07 10:46:42.337", setupChoice: "start-workspace",
      firstEventChoice: "skipped", reminderModeChoice: null, entries: 1, previousEntriesCleared: 49, previousAttemptsCleared: 1,
    }
    expect(out.sessions).toEqual([item])
    expect(out.session).toEqual({ ...item, olderEntriesLeftOut: 50, olderAttemptsLeftOut: 1 })
    expect(out.timeline[0]).toMatchObject({ source: "session", type: "session.start", session: session.id, time: "2026-11-07T17:46:40.337Z", timeAz: "2026-11-07 10:46:40.337" })
    expect(out.timeline.find(r => r.type === "onboarding.setup")).toMatchObject({ session: session.id, desc: "Setup finished: Start workspace" })
    expect(JSON.stringify(out)).not.toContain("Click 1\"")   // older content never appears, only counts
  })

  it("with no session in this browser, everything is exported as before", () => {
    const out = buildExport(seedDemo("2026-10-22"), entries(3, T - 48 * H, 5), T)
    expect(out).toMatchObject({ session: null, sessions: [], interactionLog: { count: 3, droppedEarlier: 4 } })
  })

  it("Arizona time is UTC−7 all year (no daylight saving)", () => {
    expect(azTime(Date.UTC(2026, 6, 1, 0, 30))).toBe("2026-06-30 17:30:00.000")
    expect(azTime(Date.UTC(2026, 0, 1, 6, 59, 59, 999))).toBe("2025-12-31 23:59:59.999")
    expect(azTime(undefined)).toBe("")
  })
})
