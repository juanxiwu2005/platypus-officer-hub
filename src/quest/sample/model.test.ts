import { describe, expect, it } from "vitest"
import { questSchedule } from "../../engine/questSchedule"
import { type Board, emptyBoard, moveTask, slotKey } from "../foundation"
import { type SampleStage, type SampleState, STAGE_FIELDS, canEnter, draftOf, initialSample, judge } from "./model"

const clock = questSchedule()
const orderedBoard = (day: number): Board => (["registry", "approval", "room", "ritm", "publicity"] as const).reduce<Board>((board, id) => moveTask(board, id, slotKey(day)), emptyBoard(clock))
const withStages = (stages: SampleStage[]): SampleState => ({ ...initialSample(clock), completed: stages })

describe("initialSample", () => {
  it("starts at the prologue with empty progress", () => {
    const state = initialSample(clock)
    expect(state.version).toBe(1)
    expect(state.scene).toBe("prologue")
    expect(state.shot).toBe(0)
    expect(state.seenIntro).toBe(false)
    expect(state.requestor).toBeNull()
    expect(state.advisorStart).toBe(1)
    expect(state.advisorEnd).toBe(1)
    expect(state.wall.tray).toHaveLength(5)
    expect(state.documents).toEqual([])
    expect(state.completed).toEqual([])
    expect(state.attempts).toEqual([])
    expect(state.outcome).toBeNull()
    expect(state.plans).toEqual([])
  })
})

describe("canEnter", () => {
  it("accepts only the opening scenes from a fresh state and rejects unknown scenes", () => {
    const state = initialSample(clock)
    expect(canEnter(state, "prologue")).toBe(true)
    expect(canEnter(state, "hq")).toBe(true)
    expect(canEnter(state, "booking")).toBe(true)
    expect(canEnter(state, "timeline")).toBe(false)
    expect(canEnter(state, "advisor")).toBe(false)
    expect(canEnter(state, "venue")).toBe(false)
    expect(canEnter(state, "green-room")).toBe(false)
  })

  it("unlocks only the stage after each completed prefix", () => {
    expect(canEnter(withStages(["booking"]), "timeline")).toBe(true)
    expect(canEnter(withStages(["booking"]), "advisor")).toBe(false)
    expect(canEnter(withStages(["booking", "timeline"]), "advisor")).toBe(true)
    expect(canEnter(withStages(["booking", "timeline"]), "handoff")).toBe(false)
    expect(canEnter(withStages(["booking", "timeline", "advisor"]), "handoff")).toBe(true)
    expect(canEnter(withStages(["booking", "timeline", "advisor"]), "promotion")).toBe(false)
    expect(canEnter(withStages(["booking", "timeline", "advisor", "handoff"]), "promotion")).toBe(true)
    expect(canEnter(withStages(["booking", "timeline", "advisor", "handoff"]), "venue")).toBe(false)
    expect(canEnter(withStages(["booking", "timeline", "advisor", "handoff", "promotion"]), "venue")).toBe(true)
  })
})

describe("judge", () => {
  it("passes the timeline with all four rule ids when the five tasks are ordered on day 49", () => {
    const draft = { ...initialSample(clock), wall: orderedBoard(49) }
    const result = judge(draft, "timeline", clock)
    expect(result.passed).toBe(true)
    expect(result.rules).toEqual(["2.1", "2.2", "2.4", "2.5"])
    expect(result.failed).toEqual([])
  })

  it("fails a late registry and keeps the engine message", () => {
    const result = judge({ ...initialSample(clock), wall: orderedBoard(7) }, "timeline", clock)
    expect(result.passed).toBe(false)
    expect(result.failed).toEqual(["2.1"])
    expect(result.message).toBe("The request arrived too late for this event.")
  })

  it("reports venue-prefixed failures for the initial layout without scored rules", () => {
    const result = judge(initialSample(clock), "venue", clock)
    expect(result.passed).toBe(false)
    expect(result.rules).toEqual([])
    expect(result.failed.length).toBeGreaterThan(0)
    expect(result.failed.every(id => id.startsWith("venue."))).toBe(true)
    expect(result.message).toBe("Room staff cannot confirm this layout yet.")
  })
})

describe("draftOf", () => {
  it("clones only the seven draft fields, independent of later edits", () => {
    const state = initialSample(clock)
    const snapshot = draftOf(state)
    expect(Object.keys(snapshot).sort()).toEqual(["advisorEnd", "advisorStart", "documents", "promotion", "requestor", "venue", "wall"])
    state.requestor = "riley"
    state.documents.push("approval")
    state.venue.items[0]!.x = 9
    expect(snapshot.requestor).toBeNull()
    expect(snapshot.documents).toEqual([])
    expect(snapshot.venue.items[0]!.x).not.toBe(9)
  })
})

describe("STAGE_FIELDS", () => {
  it("maps each stage to its own draft keys", () => {
    expect({ ...STAGE_FIELDS }).toEqual({ booking: ["requestor"], timeline: ["wall"], advisor: ["advisorStart", "advisorEnd"], handoff: ["documents"], promotion: ["promotion"], venue: ["venue"] })
  })
})
