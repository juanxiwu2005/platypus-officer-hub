import type { StepTemplate, WorkflowMilestoneGraph } from "../../data/types"
import { WORKFLOW_DONE, WORKFLOW_START } from "../../engine/workflowMilestones"

export interface MilestoneStation { id: string; title: string; kind: "endpoint" | "day" | "task"; x: number; y: number; step?: StepTemplate; dayIndex?: number }
export interface MilestoneTaskPoint { step: StepTemplate; branchId: string; x: number; y: number; track: number; col: number }
export interface MilestoneSegment { branch: WorkflowMilestoneGraph["teamBranches"][number]; x: number; y: number; width: number; height: number; points: MilestoneTaskPoint[]; path: string }
export interface MilestoneLayout { width: number; height: number; mainY: number; stations: MilestoneStation[]; segments: MilestoneSegment[]; points: MilestoneTaskPoint[]; unplaced: StepTemplate[] }
export const MILESTONE_TASKS_PER_TRACK = 5
const GAP = 84, TRACK = 80, BETWEEN = 20, MAIN_CLEARANCE = 76, BELOW_CLEARANCE = 106

/** Main-line distance depends on readable station spacing, never on a duration or unfinished task. */
export function buildMilestoneLayout(steps: StepTemplate[], graph: WorkflowMilestoneGraph): MilestoneLayout {
  const byKey = new Map(steps.map(step => [step.key, step])), indices = new Map(graph.spine.map((id, i) => [id, i]))
  const widths = Array.from({ length: Math.max(0, graph.spine.length - 1) }, () => 112)
  const intervals = graph.teamBranches.flatMap(branch => {
    const start = indices.get(branch.fromId), end = indices.get(branch.toId)
    return start !== undefined && end !== undefined && start < end ? [{ branch, start, end }] : []
  })
  for (const { branch, start, end } of intervals) {
    const desired = Math.max(288, Math.min(MILESTONE_TASKS_PER_TRACK, branch.stepIds.length) * GAP + 78)
    const extra = desired - widths.slice(start, end).reduce((total, width) => total + width, 0)
    if (extra > 0) for (let i = start; i < end; i++) widths[i] += extra / (end - start)
  }
  const positions = new Map<string, number>(); let cursor = 44
  graph.spine.forEach((id, index) => { positions.set(id, cursor); cursor += widths[index] ?? 0 })
  const width = Math.max(640, cursor + 44)
  // Keep the boundary at the far right for tiny/empty workflows without changing intermediate stations.
  positions.set(WORKFLOW_DONE, width - 44)
  type Row = { start: number; end: number }[]
  const above: Row[] = [], below: Row[] = [], aboveHeights: number[] = [], belowHeights: number[] = []
  const assigned = intervals.map((item, index) => {
    const height = 48 + Math.max(1, Math.ceil(item.branch.stepIds.length / MILESTONE_TASKS_PER_TRACK)) * TRACK
    const preferred = index % 2 ? [below, above] : [above, below]
    const choose = (rows: Row[]) => {
      const index = rows.findIndex(row => row.every(other => item.end <= other.start || item.start >= other.end))
      return index < 0 ? rows.length : index
    }
    const first = choose(preferred[0]), second = choose(preferred[1])
    const rows = first <= second ? preferred[0] : preferred[1], row = Math.min(first, second)
    if (!rows[row]) rows[row] = []
    rows[row].push({ start: item.start, end: item.end })
    const heights = rows === above ? aboveHeights : belowHeights
    heights[row] = Math.max(heights[row] ?? 0, height)
    return { ...item, height, side: rows === above ? "above" : "below", row }
  })
  const stackHeight = (heights: number[]) => heights.reduce((total, height) => total + height + BETWEEN, 0)
  const mainY = 40 + MAIN_CLEARANCE + stackHeight(aboveHeights)
  const height = mainY + BELOW_CLEARANCE + stackHeight(belowHeights) + 28
  const placed = new Set<string>()
  const stations = graph.spine.flatMap(id => {
    const step = byKey.get(id), dayIndex = graph.eventDays.findIndex(day => day.id === id)
    const endpoint = id === WORKFLOW_START ? graph.start : id === WORKFLOW_DONE ? graph.done : null
    if (!step && dayIndex < 0 && !endpoint) return []
    if (step) placed.add(id)
    return [{ id, title: endpoint?.title ?? step?.title ?? graph.eventDays[dayIndex].title, kind: endpoint ? "endpoint" as const : step ? "task" as const : "day" as const, x: positions.get(id) ?? 44, y: mainY, ...(step ? { step } : {}), ...(dayIndex >= 0 ? { dayIndex } : {}) }]
  })
  const segments = assigned.map(({ branch, row, side, height }) => {
    const from = positions.get(branch.fromId)!, to = positions.get(branch.toId)!
    const heights = side === "above" ? aboveHeights : belowHeights
    const prior = heights.slice(0, row).reduce((sum, value) => sum + value + BETWEEN, 0)
    const y = side === "above" ? mainY - MAIN_CLEARANCE - prior - height : mainY + BELOW_CLEARANCE + prior
    const x = from + 20, span = to - from - 40, count = Math.min(MILESTONE_TASKS_PER_TRACK, Math.max(1, branch.stepIds.length))
    const points: MilestoneTaskPoint[] = []
    for (const key of branch.stepIds) {
      const step = byKey.get(key)
      if (!step || placed.has(key)) continue
      placed.add(key)
      const index = points.length, track = Math.floor(index / MILESTONE_TASKS_PER_TRACK), slot = index % MILESTONE_TASKS_PER_TRACK, col = track % 2 ? count - 1 - slot : slot
      points.push({ step, branchId: branch.id, x: x + 34 + (span - 68) * (col + 0.5) / count, y: y + 54 + track * TRACK, track, col })
    }
    const left = from + 32, right = to - 32, tracks = Math.max(1, Math.ceil(points.length / MILESTONE_TASKS_PER_TRACK)), firstY = y + 54
    let path = `M${from} ${mainY} C${from + 14} ${mainY} ${from + 10} ${firstY} ${left} ${firstY}`
    for (let track = 0; track < tracks; track++) {
      const lineY = firstY + track * TRACK, direction = track % 2 === 0 ? 1 : -1, edge = direction > 0 ? right : left
      path += ` H${edge}`
      if (track < tracks - 1) path += ` C${edge + direction * 12} ${lineY} ${edge + direction * 12} ${lineY + TRACK} ${edge} ${lineY + TRACK}`
    }
    const lastY = firstY + (tracks - 1) * TRACK
    if (tracks % 2 === 0) path += ` C${left - 12} ${lastY} ${left - 12} ${y + height - 10} ${left} ${y + height - 10} H${right}`
    const exitY = tracks % 2 ? lastY : y + height - 10
    path += ` C${to - 10} ${exitY} ${to - 14} ${mainY} ${to} ${mainY}`
    return { branch, x, y, width: span, height, points, path }
  })
  return { width, height, mainY, stations, segments, points: segments.flatMap(segment => segment.points), unplaced: steps.filter(step => !placed.has(step.key)) }
}

/** Accept an empty segment as well as a populated one; shared spine nodes stay on the main line. */
export function milestoneDropTarget(layout: MilestoneLayout, stepId: string, x: number, y: number): { branchId: string; targetId?: string; before?: boolean } | null {
  const segment = layout.segments.find(item => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height)
  if (!segment) return null
  const point = segment.points.filter(point => point.step.key !== stepId).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]
  return { branchId: segment.branch.id, ...(point ? { targetId: point.step.key, before: point.track % 2 ? x > point.x : x < point.x } : {}) }
}
