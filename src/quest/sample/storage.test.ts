import { describe, expect, it } from "vitest"
import { questSchedule } from "../../engine/questSchedule"
import { PRACTICE_KEY, TASKS, emptyBoard, moveTask, slotKey } from "../foundation"
import { initialPromotion } from "./decisions"
import { type SampleDraft, type SampleState, initialSample, judge } from "./model"
import { SAMPLE_KEY, loadSample, saveSample } from "./storage"
import { type SampleAction, sampleReducer } from "./transitions"
import { type VenueLayout, checkVenue } from "./venue"
const clock = questSchedule()
const NOTICE = "Saved practice stays untouched. This visit will not save."
function store(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const written: string[] = []
  return {
    data, written,
    reader: { getItem: (key: string) => data.get(key) ?? null } satisfies Pick<Storage, "getItem">,
    writer: { setItem: (key: string, value: string) => { data.set(key, value); written.push(key) } } satisfies Pick<Storage, "setItem">,
  }
}
const run = (actions: SampleAction[]): SampleState =>
  actions.reduce((state, action) => sampleReducer(state, action, clock), sampleReducer(initialSample(clock), { type: "skipIntro" }, clock))

/** Fictional passing room: five straight rows, buffet inside, front reserved and accessible seats, no loose cables. */
function goodVenue(): VenueLayout {
  return {
    items: [
      { id: "left-0", kind: "row", x: 1, z: 3, turn: 0 }, { id: "left-1", kind: "row", x: 1, z: 4, turn: 0 }, { id: "left-2", kind: "row", x: 1, z: 5, turn: 0 },
      { id: "right-0", kind: "row", x: 7, z: 3, turn: 0 }, { id: "right-1", kind: "row", x: 7, z: 4, turn: 0 }, { id: "buffet", kind: "catering", x: 1, z: 0, turn: 0 },
      { id: "lectern", kind: "podium", x: 4, z: 0.2, turn: 0 }, { id: "access", kind: "accessible", x: 1, z: 6, turn: 0 }, { id: "front", kind: "reserved", x: 8, z: 2, turn: 0 },
    ],
    headcount: 40, name: "Speaker Night", theme: "teal", lighting: "warm", pattern: "plain", tablecloth: "cream",
  }
}
function venuePassedState(): SampleState {
  const snapshot: SampleDraft = { requestor: null, advisorStart: 1, advisorEnd: 1, wall: emptyBoard(clock), documents: [], promotion: initialPromotion(), venue: goodVenue() }
  const result = judge(snapshot, "venue", clock)
  const attempt = { ...result, stage: "venue" as const, number: 1, elapsedMs: 1000, snapshot }
  return { ...snapshot, version: 1, scene: "hq", shot: 3, seenIntro: true, completed: [], attempts: [attempt], outcome: null, plans: [{ number: 1, layout: structuredClone(snapshot.venue) }] }
}
const expectsRejected = (s: ReturnType<typeof store>, raw: string) => {
  expect(loadSample(s.reader, clock)).toEqual({ state: initialSample(clock), writable: false, notice: NOTICE })
  expect(s.data.get(SAMPLE_KEY)).toBe(raw)
  expect(s.written).toEqual([])
}

describe("sample storage", () => {
  it("returns the initial sample with no stored value", () => {
    expect(loadSample(store().reader, clock)).toEqual({ state: initialSample(clock), writable: true, notice: "" })
  })
  it("round-trips a valid partial journey and leaves other keys byte-identical", () => {
    const wall = TASKS.reduce((board, task) => moveTask(board, task.id, slotKey(49)), emptyBoard(clock))
    const state = run([
      { type: "go", scene: "booking" }, { type: "edit", values: { requestor: "riley" } }, { type: "check", elapsedMs: 1200 },
      { type: "next" }, { type: "edit", values: { wall } }, { type: "check", elapsedMs: 1400 },
    ])
    expect(state).toMatchObject({ scene: "timeline", completed: ["booking", "timeline"], outcome: { stage: "timeline", passed: true } })
    const s = store({ [PRACTICE_KEY]: "p4-original", "platypus.club.example": "club-original" })
    expect(saveSample(s.writer, state)).toBe(true)
    expect(loadSample(s.reader, clock)).toEqual({ state, writable: true, notice: "" })
    expect(s.written).toEqual([SAMPLE_KEY])
    expect(s.data.get(PRACTICE_KEY)).toBe("p4-original"); expect(s.data.get("platypus.club.example")).toBe("club-original")
  })
  it("round-trips a failed advisor-account attempt", () => {
    const state = run([{ type: "go", scene: "booking" }, { type: "edit", values: { requestor: "advisor" } }, { type: "check", elapsedMs: 800 }])
    expect(state.outcome?.passed).toBe(false)
    const s = store(); expect(saveSample(s.writer, state)).toBe(true)
    expect(loadSample(s.reader, clock)).toEqual({ state, writable: true, notice: "" })
  })
  it("round-trips a passed venue plan", () => {
    expect(checkVenue(goodVenue()).every(check => check.passed)).toBe(true)
    const state = venuePassedState()
    expect(state.attempts[0].passed).toBe(true)
    const s = store(); expect(saveSample(s.writer, state)).toBe(true)
    expect(loadSample(s.reader, clock).state).toEqual(state)
  })
  it("rejects an unknown version, malformed text, or an oversized value while preserving the original", () => {
    const valid = JSON.stringify(run([{ type: "go", scene: "booking" }, { type: "edit", values: { requestor: "riley" } }, { type: "check", elapsedMs: 1200 }]))
    for (const raw of [JSON.stringify({ ...JSON.parse(valid), version: 2 }), "{not json", "", "x".repeat(2000001)]) expectsRejected(store({ [SAMPLE_KEY]: raw }), raw)
  })
  it("rejects a tampered passed flag, completed unlock, or plan entry with the original preserved", () => {
    const failedState = run([{ type: "go", scene: "booking" }, { type: "edit", values: { requestor: "advisor" } }, { type: "check", elapsedMs: 800 }])
    const flag = structuredClone(failedState)
    flag.attempts[0] = { ...flag.attempts[0], passed: true }; flag.outcome = flag.attempts.at(-1) ?? null
    const passedState = run([{ type: "go", scene: "booking" }, { type: "edit", values: { requestor: "riley" } }, { type: "check", elapsedMs: 1200 }])
    const unlock = structuredClone(passedState); unlock.completed = [...unlock.completed, "timeline"]
    const plan = structuredClone(venuePassedState())
    plan.plans = [{ number: 1, layout: { ...venuePassedState().plans[0].layout, headcount: 41 } }]
    for (const tampered of [flag, unlock, plan]) expectsRejected(store({ [SAMPLE_KEY]: JSON.stringify(tampered) }), JSON.stringify(tampered))
  })
  it("reports a blocked read and a failed write", () => {
    expect(loadSample({ getItem: () => { throw new Error("blocked") } }, clock)).toEqual({ state: initialSample(clock), writable: false, notice: NOTICE })
    expect(saveSample({ setItem: () => { throw new Error("quota") } }, initialSample(clock))).toBe(false)
  })
})
