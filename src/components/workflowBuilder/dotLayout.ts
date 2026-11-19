import type { StepTemplate } from "../../data/types"
import { orderedDotSteps } from "./dotModel"
import { compileTeamLanes } from "../../teamWorkflow/lanes"

export interface DotTeam { id: string; name: string }
export interface DotPoint { step: StepTemplate; teamId: string; x: number; y: number; col: number; track: number }
export interface DotLane { team: DotTeam; row: number; top: number; height: number; points: DotPoint[]; path: string }
export interface DotLayout { width: number; height: number; lanes: DotLane[]; points: DotPoint[]; links: { from: string; to: string; path: string }[]; unassigned: StepTemplate[]; start: { x: number; y: number }; done: { x: number; y: number } }

export const DOTS_PER_TRACK = 8
export const DOT_GAP = 92
export const DOT_LEFT = 140
export const DOT_TRACK_HEIGHT = 96
const LANE_GAP = 18, LANE_TOP = 88, LABEL_TOP = 58

/** Team tracks are compact presentation. Their geometry never changes a date or a dependency. */
export function buildDotLayout(steps: StepTemplate[], stepTeams: Record<string, string>, teams: DotTeam[]): DotLayout {
  const graph = compileTeamLanes("dot-editor", orderedDotSteps(steps), { teams: teams.map(team => ({ ...team, leadRoleId: null })), roles: [], people: [] }, { version: 1, workflowId: "dot-editor", stepTeams })
  const most = Math.min(DOTS_PER_TRACK, Math.max(1, ...graph.lanes.map(lane => lane.steps.length)))
  const width = Math.max(640, DOT_LEFT * 2 + (most - 1) * DOT_GAP)
  const start = { x: 32, y: 32 }, done = { x: width - 32, y: 32 }
  const trackLeft = DOT_LEFT - 36, trackRight = width - trackLeft
  let top = LANE_TOP
  const lanes: DotLane[] = graph.lanes.map(lane => {
    const tracks = Math.max(1, Math.ceil(lane.steps.length / DOTS_PER_TRACK))
    const height = LABEL_TOP + tracks * DOT_TRACK_HEIGHT
    const points = lane.steps.map((step, index) => {
      const track = Math.floor(index / DOTS_PER_TRACK), slot = index % DOTS_PER_TRACK
      const col = track % 2 ? most - 1 - slot : slot
      return { step, teamId: lane.team.id, x: DOT_LEFT + col * DOT_GAP, y: top + LABEL_TOP + track * DOT_TRACK_HEIGHT, col, track }
    })
    const firstY = top + LABEL_TOP
    let path = `M${start.x} ${start.y} C${start.x + 28} ${start.y} ${start.x + 20} ${firstY} ${trackLeft} ${firstY}`
    for (let track = 0; track < tracks; track++) {
      const y = firstY + track * DOT_TRACK_HEIGHT, right = track % 2 === 0
      path += ` H${right ? trackRight : trackLeft}`
      if (track < tracks - 1) {
        const side = right ? trackRight : trackLeft, turn = side + (right ? 22 : -22), nextY = y + DOT_TRACK_HEIGHT
        path += ` C${turn} ${y} ${turn} ${nextY} ${side} ${nextY}`
      }
    }
    const finalY = firstY + (tracks - 1) * DOT_TRACK_HEIGHT
    if (tracks % 2 === 0) path += ` C${trackLeft - 24} ${finalY} ${trackLeft - 24} ${top + height - 10} ${trackLeft} ${top + height - 10} H${trackRight}`
    const exitY = tracks % 2 ? finalY : top + height - 10
    path += ` C${width - 48} ${exitY} ${done.x - 28} ${done.y} ${done.x} ${done.y}`
    const result = { team: lane.team, row: lane.row, top, height, points, path }
    top += height + LANE_GAP
    return result
  })
  const points = lanes.flatMap(lane => lane.points), byKey = new Map(points.map(point => [point.step.key, point]))
  const links = graph.links.flatMap(link => {
    const a = byKey.get(link.fromStep), b = byKey.get(link.toStep)
    if (!a || !b) return []
    // A selected cross-team prerequisite uses the free space above/below its station labels.
    const direction = b.x >= a.x ? 1 : -1
    const ax = a.x + direction * 12, bx = b.x - direction * 16
    const bend = Math.max(32, Math.abs(bx - ax) / 2)
    return [{ from: link.fromStep, to: link.toStep, path: `M${ax} ${a.y} C${ax + direction * bend} ${a.y} ${bx - direction * bend} ${b.y} ${bx} ${b.y}` }]
  })
  const missing = new Set(graph.unassignedStepIds)
  return { width, height: Math.max(128, top), lanes, points, links, unassigned: steps.filter(step => missing.has(step.key)), start, done }
}

/** Drop geometry uses unscaled canvas coordinates, with gaps and the outer margin rejected. */
export function dotDropTarget(layout: DotLayout, key: string, x: number, y: number): { teamId: string; targetId?: string; before?: boolean } | null {
  if (x < 72 || x > layout.width - 72) return null
  const lane = layout.lanes.find(item => y >= item.top && y <= item.top + item.height)
  if (!lane) return null
  const closest = lane.points.filter(point => point.step.key !== key).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]
  return { teamId: lane.team.id, ...(closest ? { targetId: closest.step.key, before: closest.track % 2 ? x > closest.x : x < closest.x } : {}) }
}
