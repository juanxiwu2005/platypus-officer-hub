import { describe, expect, it } from "vitest"
import { questSchedule } from "../../engine/questSchedule"
import { TASKS, emptyBoard, moveTask } from "../foundation"
import { initialPromotion } from "./decisions"
import { addProp, checkVenue, initialVenue, moveProp } from "./venue"
import { STAGES, initialSample } from "./model"
import type { SampleState } from "./model"
import { sampleReducer } from "./transitions"
import type { SampleAction } from "./transitions"

const clock = questSchedule()
const run = (from: SampleState, ...actions: SampleAction[]) => actions.reduce((state, action) => sampleReducer(state, action, clock), from)
const wallAt49 = () => TASKS.reduce((board, task) => moveTask(board, task.id, "day:49"), emptyBoard(clock))
const venueFixture = () => {
  let layout = { ...initialVenue(), headcount: 80 }
  for (const [id, x, z] of [["left-0", 1, 3], ["welcome", 1, 1], ["buffet", 9, 1], ["round", 7, 1], ["access", 4, 2], ["front", 3, 2], ["photo", 0, 0]] as const) layout = moveProp(layout, id, x, z)
  return addProp(layout, "cover", 5, 4)
}
const booking = (id: string, ms: number) => [{ type: "go", scene: "booking" } as const, { type: "edit", values: { requestor: id } } as const, { type: "check", elapsedMs: ms } as const]

describe("sampleReducer", () => {
  it("guards scenes, shots and skipIntro", () => {
    const state = run(initialSample(clock), { type: "go", scene: "venue" })
    expect(state.scene).toBe("prologue")
    expect(run(state, { type: "shot", shot: 4 })).toBe(state)
    expect(run(state, { type: "shot", shot: 1.5 })).toBe(state)
    expect(run(state, { type: "skipIntro" })).toMatchObject({ scene: "hq", shot: 3, seenIntro: true })
  })

  it("fails an advisor requestor, freezes edits, rewind keeps the draft for repair", () => {
    let state = run(initialSample(clock), ...booking("advisor", 5))
    expect(state.outcome).toMatchObject({ passed: false, failed: ["2.3"] })
    expect(state.attempts).toHaveLength(1)
    const frozen = run(state, { type: "edit", values: { requestor: "riley" } })
    expect(frozen).toBe(state)
    expect(run(state, { type: "next" })).toBe(state)
    state = run(state, { type: "rewind" })
    expect(state.outcome).toBeNull()
    expect(state.requestor).toBe("advisor")
    expect(state.attempts).toHaveLength(1)
    state = run(state, { type: "edit", values: { requestor: "riley" } }, { type: "check", elapsedMs: 6 }, { type: "next" })
    expect(state.scene).toBe("timeline")
    expect(state.completed).toEqual(["booking"])
    expect(state.attempts).toHaveLength(2)
  })

  it("ignores off-stage keys and creates no attempt while the tray is not empty", () => {
    let state = run(initialSample(clock), ...booking("riley", 1), { type: "next" })
    state = sampleReducer(state, { type: "edit", values: { documents: ["room"] } }, clock)
    expect(state.documents).toEqual([])
    const stuck = sampleReducer(state, { type: "check", elapsedMs: 1 }, clock)
    expect(stuck).toBe(state)
    expect(stuck.attempts).toHaveLength(1)
  })

  it("clamps invalid elapsed times and keeps snapshots independent", () => {
    const nan = run(initialSample(clock), ...booking("sam", Number.NaN))
    expect(nan.outcome?.elapsedMs).toBe(0)
    expect(run(initialSample(clock), ...booking("sam", 9e9)).outcome?.elapsedMs).toBe(86400000)
    const moved = run(nan, { type: "rewind" }, { type: "edit", values: { requestor: "riley" } })
    expect(nan.attempts[0].snapshot.requestor).toBe("sam")
    expect(moved.requestor).toBe("riley")
    expect(nan.attempts[0].snapshot.requestor).toBe("sam")
  })

  it("completes the full journey with one immutable plan", () => {
    expect(checkVenue(venueFixture()).every(check => check.passed)).toBe(true)
    let state = run(initialSample(clock),
      ...booking("riley", 100), { type: "next" },
      { type: "edit", values: { wall: wallAt49() } }, { type: "check", elapsedMs: 200 }, { type: "next" },
      { type: "edit", values: { advisorStart: 0, advisorEnd: 2 } }, { type: "check", elapsedMs: 300 }, { type: "next" },
      { type: "go", scene: "handoff" }, { type: "edit", values: { documents: ["approval", "ritm", "room"] } }, { type: "check", elapsedMs: 400 }, { type: "next" },
      { type: "edit", values: { promotion: { ...initialPromotion(), namingFixed: true, markRemoved: true, printCount: 100, vendor: "licensed", logoFlag: true, artworkAttached: true } } }, { type: "check", elapsedMs: 500 }, { type: "next" },
      { type: "edit", values: { venue: venueFixture() } }, { type: "check", elapsedMs: 600 })
    expect(state.outcome?.passed).toBe(true)
    expect(state.completed).toEqual([...STAGES])
    expect([...new Set(state.attempts.flatMap(attempt => attempt.rules))].sort()).toEqual(["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "5.1", "5.2", "5.3", "5.4"])
    expect(state.attempts.map(attempt => attempt.number)).toEqual([1, 2, 3, 4, 5, 6])
    expect(state.attempts[0].snapshot.wall.tray).toHaveLength(5)
    expect(state.wall.tray).toHaveLength(0)
    expect(state.plans).toEqual([{ number: 6, layout: venueFixture() }])
    const plan = state.plans[0].layout
    state = run(state, { type: "next" }, { type: "go", scene: "timeline" }, { type: "edit", values: { wall: emptyBoard(clock) } })
    expect(state.completed).toEqual(["booking"])
    expect(state.attempts).toHaveLength(6)
    expect(state.plans[0].layout).toBe(plan)
    expect(state.plans).toHaveLength(1)
  })

  it("cannot save a plan from a forged venue scene", () => {
    const forged = { ...initialSample(clock), scene: "venue" as const, venue: venueFixture() }
    const state = sampleReducer(forged, { type: "check", elapsedMs: 1 }, clock)
    expect(state).toBe(forged)
    expect(state.plans).toHaveLength(0)
    expect(state.attempts).toHaveLength(0)
  })

  it("restart keeps every attempt and plan", () => {
    let state = run(initialSample(clock), ...booking("riley", 1), { type: "next" }, { type: "edit", values: { wall: wallAt49() } }, { type: "check", elapsedMs: 2 })
    state = sampleReducer(state, { type: "restart" }, clock)
    expect(state).toMatchObject({ scene: "hq", seenIntro: true, requestor: null, completed: [], outcome: null, wall: emptyBoard(clock) })
    expect(state.attempts).toHaveLength(2)
  })
})
