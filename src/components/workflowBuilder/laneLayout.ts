import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { WORKFLOW_DONE, WORKFLOW_START } from "../../engine/workflowMilestones"

export type LaneBranch = WorkflowMilestoneGraph["teamBranches"][number]
export type LaneSide = "above" | "below"
export type LanePhaseId = "plan" | "prepare" | "event" | "close"
export interface LaneStation { id: string; title: string; kind: "endpoint" | "day" | "task"; x: number; y: number; step?: StepTemplate; dayIndex?: number }
/** `row` is the wrapped dot row inside its lane (0 unless the branch has more than LANE_MAX steps). */
export interface LanePoint { step: StepTemplate; branchId: string; x: number; y: number; row: number; col: number; index: number }
export interface Lane { branch: LaneBranch; side: LaneSide; stack: number; x: number; y: number; width: number; height: number; rows: number; points: LanePoint[]; path: string }
export interface LanePhase { id: LanePhaseId; label: string; x0: number; x1: number }
export interface LaneLayout { width: number; height: number; mainY: number; stations: LaneStation[]; lanes: Lane[]; points: LanePoint[]; phases: LanePhase[]; unplaced: StepTemplate[] }
export interface LaneDropTarget { branchId: string; targetId?: string; before?: boolean }

/** A branch stays on one horizontal row up to this many steps; only longer branches wrap. */
export const LANE_MAX = 10
export const COL = 108
export const EDGE = 44
/** Height reserved at the top of the layout for the sticky phase header. */
export const PHASE_HEADER = 40
export const LANE_HEIGHT = 112
export const LANE_GAP = 16
/** Distance from a lane card's top to its first dot centre, and between wrapped dot rows. */
export const LANE_DOT_Y = 57
/** Branch curves reach the dot row just inside the card edge, clear of the team pill. */
const ROW_STEP = 84, RETURN_EXTRA = 16, CURVE_IN = 10
const MARGIN_X = 64, TOP_PAD = 16, BOTTOM_PAD = 24, ABOVE_CLEARANCE = 56, BELOW_CLEARANCE = 72, LANE_INSET = 24

const laneHeight = (rows: number) => LANE_HEIGHT + (rows - 1) * ROW_STEP + (rows > 1 && rows % 2 === 0 ? RETURN_EXTRA : 0)
const round = (value: number) => Math.round(value * 100) / 100

/** Spacing depends only on readable dot spacing per branch, never on a duration or task status. */
export function buildLaneLayout(steps: readonly StepTemplate[], graph: WorkflowMilestoneGraph, options: { availableWidth?: number } = {}): LaneLayout {
  const byKey = new Map(steps.map(step => [step.key, step])), indices = new Map(graph.spine.map((id, index) => [id, index]))
  const intervals = graph.teamBranches.flatMap(branch => {
    const start = indices.get(branch.fromId), end = indices.get(branch.toId)
    return start !== undefined && end !== undefined && start < end ? [{ branch, start, end }] : []
  })
  // Only real, not-yet-placed tasks become dots; duplicates and missing references fall through to `unplaced`.
  const placed = new Set(graph.spine.filter(id => byKey.has(id)))
  const branchSteps = new Map(intervals.map(({ branch }) => [branch.id, branch.stepIds.flatMap(key => {
    const step = byKey.get(key)
    if (!step || placed.has(key)) return []
    placed.add(key)
    return [step]
  })]))

  const widths = Array.from({ length: Math.max(0, graph.spine.length - 1) }, () => COL)
  for (const { branch, start, end } of intervals) {
    const count = branchSteps.get(branch.id)!.length
    const desired = Math.min(LANE_MAX, Math.max(1, count)) * COL + 2 * EDGE
    const extra = desired - widths.slice(start, end).reduce((total, width) => total + width, 0)
    if (extra > 0) for (let index = start; index < end; index++) widths[index] += extra / (end - start)
  }
  const natural = widths.reduce((total, width) => total + width, 0)
  const target = (options.availableWidth ?? 0) - 2 * MARGIN_X
  if (natural > 0 && target > natural) for (let index = 0; index < widths.length; index++) widths[index] *= target / natural
  const positions = new Map<string, number>()
  let cursor = MARGIN_X
  graph.spine.forEach((id, index) => { positions.set(id, round(cursor)); cursor += widths[index] ?? 0 })
  const stretched = natural > 0 && target > natural
  if (stretched) positions.set(graph.spine.at(-1)!, round(options.availableWidth! - MARGIN_X))
  const width = stretched ? options.availableWidth! : round(cursor + MARGIN_X)
  const xOf = (id: string) => positions.get(id) ?? MARGIN_X

  // Each branch goes to the shorter side; a row on that side is reused when its intervals do not overlap.
  type Row = { spans: { start: number; end: number }[]; height: number }
  const sides: Record<LaneSide, Row[]> = { above: [], below: [] }
  const stackHeight = (rows: Row[]) => rows.reduce((total, row) => total + row.height, 0) + Math.max(0, rows.length - 1) * LANE_GAP
  const assigned = intervals.map(item => {
    const rows = Math.max(1, Math.ceil(branchSteps.get(item.branch.id)!.length / LANE_MAX)), height = laneHeight(rows)
    const side: LaneSide = stackHeight(sides.below) < stackHeight(sides.above) ? "below" : "above"
    const stack = sides[side].findIndex(row => row.spans.every(span => item.end <= span.start || item.start >= span.end))
    const index = stack < 0 ? sides[side].length : stack
    const row = sides[side][index] ?? (sides[side][index] = { spans: [], height: 0 })
    row.spans.push({ start: item.start, end: item.end }); row.height = Math.max(row.height, height)
    return { ...item, rows, height, side, stack: index }
  })
  const aboveHeight = stackHeight(sides.above), belowHeight = stackHeight(sides.below)
  const mainY = PHASE_HEADER + TOP_PAD + aboveHeight + ABOVE_CLEARANCE
  const height = mainY + BELOW_CLEARANCE + belowHeight + BOTTOM_PAD

  const stations: LaneStation[] = graph.spine.flatMap(id => {
    const step = byKey.get(id), dayIndex = graph.eventDays.findIndex(day => day.id === id)
    const endpoint = id === WORKFLOW_START ? graph.start : id === WORKFLOW_DONE ? graph.done : null
    if (!step && dayIndex < 0 && !endpoint) return []
    return [{ id, title: endpoint?.title ?? step?.title ?? graph.eventDays[dayIndex].title, kind: endpoint ? "endpoint" as const : step ? "task" as const : "day" as const, x: xOf(id), y: mainY, ...(step ? { step } : {}), ...(dayIndex >= 0 ? { dayIndex } : {}) }]
  })

  const lanes: Lane[] = assigned.map(({ branch, rows, height: own, side, stack }) => {
    const from = xOf(branch.fromId), to = xOf(branch.toId), prior = sides[side].slice(0, stack).reduce((total, row) => total + row.height + LANE_GAP, 0)
    const y = side === "above" ? mainY - ABOVE_CLEARANCE - prior - own : mainY + BELOW_CLEARANCE + prior
    const x = from + LANE_INSET, laneWidth = to - from - 2 * LANE_INSET
    const items = branchSteps.get(branch.id)!, perRow = Math.min(LANE_MAX, Math.max(1, items.length))
    const left = x + EDGE, right = x + laneWidth - EDGE
    const points = items.map((step, index): LanePoint => {
      const row = Math.floor(index / LANE_MAX), slot = index % LANE_MAX, col = row % 2 ? perRow - 1 - slot : slot
      return { step, branchId: branch.id, x: round(perRow === 1 ? x + laneWidth / 2 : left + (right - left) * col / (perRow - 1)), y: y + LANE_DOT_Y + row * ROW_STEP, row, col, index }
    })
    return { branch, side, stack, x: round(x), y, width: round(laneWidth), height: own, rows, points, path: lanePath(from, to, mainY, y + LANE_DOT_Y, rows, round(x + CURVE_IN), round(x + laneWidth - CURVE_IN)) }
  })
  const points = lanes.flatMap(lane => lane.points)
  return { width, height, mainY, stations, lanes, points, phases: lanePhases(graph, positions, lanes, width), unplaced: steps.filter(step => !placed.has(step.key)) }
}

/** Horizontal tangents at both ends make each branch leave and rejoin the main line smoothly. */
function lanePath(from: number, to: number, mainY: number, rowY: number, rows: number, left: number, right: number): string {
  const bend = (left - from) * 0.55
  let path = `M${from} ${mainY} C${round(from + bend)} ${mainY} ${round(left - bend)} ${rowY} ${left} ${rowY}`
  for (let row = 0; row < rows; row++) {
    const lineY = rowY + row * ROW_STEP, edge = row % 2 ? left : right, turn = row % 2 ? -16 : 16
    path += ` H${edge}`
    if (row < rows - 1) path += ` C${edge + turn} ${lineY} ${edge + turn} ${lineY + ROW_STEP} ${edge} ${lineY + ROW_STEP}`
  }
  let exitY = rowY + (rows - 1) * ROW_STEP
  if (rows % 2 === 0) {
    const returnY = exitY + ROW_STEP / 2 + RETURN_EXTRA
    path += ` C${left - 16} ${exitY} ${left - 16} ${returnY} ${left} ${returnY} H${right}`
    exitY = returnY
  }
  return `${path} C${round(right + bend)} ${exitY} ${round(to - bend)} ${mainY} ${to} ${mainY}`
}

function lanePhases(graph: WorkflowMilestoneGraph, positions: Map<string, number>, lanes: Lane[], width: number): LanePhase[] {
  const spine = graph.spine, x = (index: number) => positions.get(spine[index]) ?? 0
  const startX = x(0), doneX = x(spine.length - 1)
  const dayIndices = graph.eventDays.map(day => spine.indexOf(day.id)).filter(index => index >= 0).sort((a, b) => a - b)
  if (!dayIndices.length) return [{ id: "prepare", label: "Prepare", x0: startX, x1: doneX || width }]
  const first = dayIndices[0], last = dayIndices.at(-1)!
  const eventX0 = round((x(first) + x(Math.max(0, first - 1))) / 2), eventX1 = round((x(last) + x(Math.min(spine.length - 1, last + 1))) / 2)
  const phases: LanePhase[] = []
  let planEnd = -Infinity
  for (const lane of lanes) {
    if (spine.indexOf(lane.branch.toId) > first) continue
    const leading = lane.points.filter(point => point.row === 0)
    let lastPlan: LanePoint | undefined
    for (const point of leading) { if (point.step.phase !== "plan") break; lastPlan = point }
    if (lastPlan) planEnd = Math.max(planEnd, lastPlan.x + COL / 2)
  }
  if (planEnd > startX && planEnd < eventX0) phases.push({ id: "plan", label: "Plan", x0: startX, x1: round(planEnd) })
  const prepareStart = phases.length ? phases[0].x1 : startX
  if (eventX0 > prepareStart) phases.push({ id: "prepare", label: "Prepare", x0: prepareStart, x1: eventX0 })
  phases.push({ id: "event", label: dayIndices.length > 1 ? "Event days" : "Event day", x0: eventX0, x1: eventX1 })
  if (doneX > eventX1) phases.push({ id: "close", label: "Close", x0: eventX1, x1: doneX })
  return phases
}

/** Accept an empty lane as well as a populated one; shared spine nodes stay on the main line. */
export function laneDropTarget(layout: LaneLayout, stepId: string, x: number, y: number): LaneDropTarget | null {
  const lane = layout.lanes.find(item => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height)
  if (!lane) return null
  const point = lane.points.filter(item => item.step.key !== stepId).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]
  return { branchId: lane.branch.id, ...(point ? { targetId: point.step.key, before: point.row % 2 ? x > point.x : x < point.x } : {}) }
}
