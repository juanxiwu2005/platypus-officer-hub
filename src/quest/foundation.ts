import type { QuestClock } from "../engine/questSchedule"

export const TASKS = [
  { id: "registry", label: "Event Registry", symbol: "01", rules: ["2.1"] },
  { id: "approval", label: "Approval", symbol: "02", rules: ["2.2"] },
  { id: "room", label: "Room request", symbol: "03", rules: ["2.4"] },
  { id: "ritm", label: "RITM handoff", symbol: "04", rules: ["2.5"] },
  { id: "publicity", label: "Publicity", symbol: "05", rules: ["2.2"] },
] as const
export type TaskId = typeof TASKS[number]["id"]
export type SceneId = "hq" | "countdown"
export interface SceneDefinition { id: SceneId; title: string; instruction: string; interaction: "timeline" | null; ruleIds: readonly string[] }
export const SCENES: Record<SceneId, SceneDefinition> = {
  hq: { id: "hq", title: "Club HQ", instruction: "Your crew. One night to bring everyone together.", interaction: null, ruleIds: [] },
  countdown: { id: "countdown", title: "Lock the Date", instruction: "Drag each task before its deadline.", interaction: "timeline", ruleIds: ["2.1", "2.2", "2.4", "2.5"] },
}
export type Board = Record<string, TaskId[]>
export interface InteractionResult { interactionId: "countdown-wall"; attempt: number; passed: boolean; failedRuleIds: string[]; taskId: TaskId | null; message: string; board: Board }
export interface QuestState { version: 1; scene: SceneId; board: Board; attempts: InteractionResult[]; outcome: InteractionResult | null }
export const PRACTICE_KEY = "platypus.quest.foundation.v1"
export const slotKey = (day: number) => `day:${day}`
export const task = (id: TaskId) => TASKS.find(item => item.id === id)!
export function emptyBoard(clock: QuestClock): Board { return Object.fromEntries([["tray", TASKS.map(t => t.id)], ...clock.slots.map(day => [slotKey(day), []])]) }
export function initialQuest(clock: QuestClock): QuestState { return { version: 1, scene: "hq", board: emptyBoard(clock), attempts: [], outcome: null } }
export function moveTask(board: Board, id: TaskId, dest: string, before: TaskId | null = null): Board {
  if (!TASKS.some(t => t.id === id) || !Object.hasOwn(board, dest)) return board
  if (id === before) return board
  const next = Object.fromEntries(Object.entries(board).map(([key, ids]) => [key, ids.filter(t => t !== id)]))
  const index = before ? next[dest].indexOf(before) : -1
  if (index < 0) next[dest].push(id); else next[dest].splice(index, 0, id)
  return next
}
export function positionOf(board: Board, id: TaskId): { day: number; order: number } | null {
  for (const [key, ids] of Object.entries(board)) {
    if (key === "tray") continue
    const order = ids.indexOf(id)
    if (order >= 0) return { day: Number(key.slice(4)), order }
  }
  return null
}
export function evaluateWall(board: Board, clock: QuestClock, attempt: number): InteractionResult {
  const fail = (taskId: TaskId, rule: string, message: string): InteractionResult => ({ interactionId: "countdown-wall", attempt, passed: false, failedRuleIds: [rule], taskId, message, board: structuredClone(board) })
  const before = (a: TaskId, b: TaskId) => {
    const x = positionOf(board, a), y = positionOf(board, b)
    return !!x && !!y && (x.day > y.day || (x.day === y.day && x.order < y.order))
  }
  for (const id of ["registry", "room", "ritm"] as const) {
    const position = positionOf(board, id)
    if (!position || position.day < clock.deadlines[id].daysBefore) return fail(id, task(id).rules[0], id === "ritm" ? "The number arrived late. The room was cancelled." : "The request arrived too late for this event.")
  }
  if (!before("registry", "approval")) return fail("approval", "2.2", "Approval needs a submitted event first.")
  if (!before("registry", "room")) return fail("room", "2.1", "The room request needs the registered event.")
  if (!before("registry", "ritm") || !before("room", "ritm")) return fail("ritm", "2.5", "The number needs its event and room request.")
  if (!before("approval", "publicity")) return fail("publicity", "2.2", "The teaser went out before approval. Event postponed.")
  return { interactionId: "countdown-wall", attempt, passed: true, failedRuleIds: [], taskId: null, message: "The date is locked. Your crew can move forward.", board: structuredClone(board) }
}
export type QuestAction = { type: "scene"; scene: SceneId } | { type: "move"; id: TaskId; dest: string; before?: TaskId | null } | { type: "check" } | { type: "rewind" } | { type: "restart" }
export function questReducer(state: QuestState, action: QuestAction, clock: QuestClock): QuestState {
  switch (action.type) {
    case "scene": return { ...state, scene: action.scene }
    case "move": return state.outcome ? state : { ...state, board: moveTask(state.board, action.id, action.dest, action.before) }
    case "check": {
      if (state.outcome || state.board.tray.length) return state
      const outcome = evaluateWall(state.board, clock, state.attempts.length + 1)
      return { ...state, outcome, attempts: [...state.attempts, outcome] }
    }
    case "rewind": return { ...state, outcome: null }
    case "restart": return { ...initialQuest(clock), attempts: state.attempts }
  }
}
function validBoard(value: unknown, clock: QuestClock): value is Board {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const board = value as Record<string, unknown>, keys = Object.keys(emptyBoard(clock))
  if (Object.keys(board).length !== keys.length || keys.some(key => !Object.hasOwn(board, key) || !Array.isArray(board[key]))) return false
  const all = keys.flatMap(key => board[key] as unknown[])
  return all.length === TASKS.length && new Set(all).size === TASKS.length && all.every(id => TASKS.some(t => t.id === id))
}
function validResult(value: unknown, clock: QuestClock): value is InteractionResult {
  if (!value || typeof value !== "object") return false
  const v = value as InteractionResult
  return v.interactionId === "countdown-wall" && Number.isSafeInteger(v.attempt) && v.attempt > 0 && typeof v.passed === "boolean" && typeof v.message === "string" && v.message.length < 200 && Array.isArray(v.failedRuleIds) && v.failedRuleIds.every(id => SCENES.countdown.ruleIds.includes(id)) && (v.taskId === null || TASKS.some(t => t.id === v.taskId)) && validBoard(v.board, clock)
}
export function loadPractice(storage: Pick<Storage, "getItem">, clock: QuestClock): { state: QuestState; writable: boolean; notice: string } {
  const fallback = initialQuest(clock)
  try {
    const raw = storage.getItem(PRACTICE_KEY)
    if (!raw) return { state: fallback, writable: true, notice: "" }
    if (raw.length > 200000) throw new Error("Oversized practice")
    const v = JSON.parse(raw) as QuestState
    if (v.version !== 1 || !["hq", "countdown"].includes(v.scene) || !validBoard(v.board, clock) || !Array.isArray(v.attempts) || !v.attempts.every((a, i) => validResult(a, clock) && a.attempt === i + 1 && !a.board.tray.length && a.passed === evaluateWall(a.board, clock, a.attempt).passed && JSON.stringify(a.failedRuleIds) === JSON.stringify(evaluateWall(a.board, clock, a.attempt).failedRuleIds)) || !(v.outcome === null || validResult(v.outcome, clock) && v.outcome.attempt === v.attempts.length && JSON.stringify(v.outcome) === JSON.stringify(v.attempts.at(-1)) && JSON.stringify(v.outcome.board) === JSON.stringify(v.board))) throw new Error("Unsupported practice")
    return { state: v, writable: true, notice: "" }
  } catch { return { state: fallback, writable: false, notice: "Saved practice stays untouched. This visit will not save." } }
}
export function savePractice(storage: Pick<Storage, "setItem">, state: QuestState): boolean {
  try { storage.setItem(PRACTICE_KEY, JSON.stringify(state)); return true } catch { return false }
}
