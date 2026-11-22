import { describe, expect, it } from "vitest"
import { questSchedule } from "../engine/questSchedule"
import { officialDeadline } from "../engine/schedule"
import { buildEventNodes } from "../engine/playbooks"
import type { Event, StepTemplate } from "../data/types"
import { TASKS, PRACTICE_KEY, emptyBoard, evaluateWall, initialQuest, loadPractice, moveTask, positionOf, questReducer, savePractice, slotKey, type TaskId } from "./foundation"

const clock = questSchedule()
const atStart = (order: TaskId[] = TASKS.map(t => t.id)) => order.reduce((board, id) => moveTask(board, id, slotKey(49)), emptyBoard(clock))
describe("Quest engine adapter", () => {
  it("uses the existing official engine, including closed-day shifts", () => {
    for (const origin of ["2026-10-31", "2026-11-02", "2026-11-05"]) {
      const value = questSchedule(origin)
      const ev: Event = { id: "test", name: "Test", date: value.eventDate, type: "social", headcount: 80, venue: "campus", food: "none", funding: "none", speaker: true, goalId: null, playbookId: "test" }
      const step: StepTemplate = { key: "ritm", title: "RITM", fn: "programs", phase: "prepare", anchor: { kind: "rule", ruleId: "R04", days: 14, unit: "calendar" }, estDays: 1, tier: "light", why: "test", source: "R04" }
      const node = buildEventNodes(ev, [], { steps: [step], mode: "custom", restoreMissingCore: false })[0]
      expect(value.deadlines.ritm.date).toBe(officialDeadline(node, ev)?.date)
      expect(value.slots).toContain(value.deadlines.ritm.daysBefore)
      expect(value.dates[49]).toBe(origin)
    }
    expect(clock.deadlines.ritm.daysBefore).toBe(15)
    expect(clock.deadlines.registry.daysBefore).toBe(30)
    expect(questSchedule("2026-11-02").deadlines.registry.daysBefore).toBe(31)
  })
})
describe("Countdown reference behavior", () => {
  it("allows same-day causal ordering without inventing approval turnaround", () => {
    expect(evaluateWall(atStart(), clock, 1).passed).toBe(true)
    expect(evaluateWall(atStart(["publicity", "registry", "approval", "room", "ritm"]), clock, 1).failedRuleIds).toEqual(["2.2"])
  })
  it.each(["registry", "room", "ritm"] as const)("enforces %s exact deadline and rejects one day later", id => {
    let board = atStart()
    // Move dependent tasks to event day so the tested official boundary is isolated from order.
    if (id === "registry") for (const child of ["approval", "room", "ritm", "publicity"] as const) board = moveTask(board, child, slotKey(0))
    if (id === "room") board = moveTask(board, "ritm", slotKey(0))
    board = moveTask(board, id, slotKey(clock.deadlines[id].daysBefore))
    // A specific task is accepted at its boundary even when another deliberately late task fails later.
    const allowed = evaluateWall(board, clock, 1)
    expect(allowed.taskId).not.toBe(id)
    board = moveTask(board, id, slotKey(clock.deadlines[id].daysBefore - 1))
    expect(evaluateWall(board, clock, 1).taskId).toBe(id)
  })
  it("keeps room and number behind their required handoffs", () => {
    expect(evaluateWall(atStart(["room", "registry", "approval", "ritm", "publicity"]), clock, 1).taskId).toBe("room")
    expect(evaluateWall(atStart(["registry", "ritm", "approval", "room", "publicity"]), clock, 1).taskId).toBe("ritm")
  })
  it("supports reordering within a day and rejects unknown destinations without losing a tile", () => {
    const board = atStart()
    expect(moveTask(board, "registry", "outside")).toBe(board)
    const moved = moveTask(board, "publicity", slotKey(49), "approval")
    expect(positionOf(moved, "publicity")?.order).toBe(1)
    expect(Object.values(moved).flat()).toHaveLength(5)
    expect(new Set(Object.values(moved).flat()).size).toBe(5)
  })
  it("rewinds without losing the plan or earlier attempt, then records repair success", () => {
    let state = { ...initialQuest(clock), board: atStart(["publicity", "registry", "approval", "room", "ritm"]) }
    state = questReducer(state, { type: "check" }, clock)
    expect(state.outcome?.passed).toBe(false)
    const failedBoard = state.board
    expect(questReducer(state, { type: "move", id: "publicity", dest: slotKey(0) }, clock)).toBe(state)
    state = questReducer(state, { type: "rewind" }, clock)
    expect(state.board).toBe(failedBoard)
    state = questReducer(state, { type: "move", id: "publicity", dest: slotKey(0) }, clock)
    state = questReducer(state, { type: "check" }, clock)
    expect(state.attempts.map(a => a.passed)).toEqual([false, true])
    const restarted = questReducer(state, { type: "restart" }, clock)
    expect(restarted.attempts).toHaveLength(2)
    expect(restarted.board.tray).toHaveLength(5)
  })
  it("does not count incomplete boards as attempts", () => {
    const state = initialQuest(clock)
    expect(questReducer(state, { type: "check" }, clock)).toBe(state)
  })
})
describe("isolated local practice persistence", () => {
  it("round-trips valid progress using only its own key", () => {
    const state = questReducer({ ...initialQuest(clock), board: atStart() }, { type: "check" }, clock)
    const values = new Map([["platypus.user-data", "untouched"]])
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
    expect(savePractice(storage, state)).toBe(true)
    expect(loadPractice(storage, clock).state).toEqual(state)
    expect(values.get("platypus.user-data")).toBe("untouched")
    expect(values.has(PRACTICE_KEY)).toBe(true)
  })
  it.each(["{broken", JSON.stringify({ version: 99 }), JSON.stringify({ ...initialQuest(clock), board: { tray: ["registry", "registry"] } })])("preserves invalid or newer data without enabling overwrites", raw => {
    const loaded = loadPractice({ getItem: () => raw }, clock)
    expect(loaded.writable).toBe(false)
    expect(loaded.state.board.tray).toHaveLength(5)
  })
  it("rejects a corrupted saved success claim", () => {
    const state = questReducer({ ...initialQuest(clock), board: atStart(["publicity", "registry", "approval", "room", "ritm"]) }, { type: "check" }, clock)
    state.attempts[0].passed = true
    expect(loadPractice({ getItem: () => JSON.stringify(state) }, clock).writable).toBe(false)
  })
  it("falls back safely when reads or writes are blocked", () => {
    expect(loadPractice({ getItem: () => { throw new Error("blocked") } }, clock).writable).toBe(false)
    expect(savePractice({ setItem: () => { throw new Error("quota") } }, initialQuest(clock))).toBe(false)
  })
})
