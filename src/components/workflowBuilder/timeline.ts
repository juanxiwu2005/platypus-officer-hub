import type { DemoState, Event, StepTemplate } from "../../data/types"
import { computeSchedule } from "../../engine/schedule"
import { stepsAsNodes } from "../../engine/workflow"
import { addDays, daysBetween } from "../../lib/dates"
import type { BuilderPolicy, BuilderSnapshot } from "./model"

export interface BuilderTeam { id: string; name: string }
export interface TaskBox { step: StepTemplate; x: number; y: number; width: number; start: number; finish: number }
export interface TeamRow { team: BuilderTeam; top: number; height: number; boxes: TaskBox[] }
export const LABEL_WIDTH = 164
export const HEADER_HEIGHT = 50
/** Horizontal dragging changes calendar-day offsets, never work estimates. */
export const TIMELINE_PIXELS_PER_DAY = 18

/** Dates are a rule-engine preview. Pixel layout and effort never calculate business dates. */
export function buildTimeline(state: DemoState, snapshot: BuilderSnapshot, teams: BuilderTeam[], policy: BuilderPolicy = "custom", previewDate = addDays(state.today, 42)) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(previewDate) ? previewDate : addDays(state.today, 42)
  const event: Event = { id: "workflow-editor-preview", name: "Workflow preview", date, type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: `workflow-editor-${policy}`, workflowBranches: snapshot.branches }
  const nodes = stepsAsNodes(snapshot.steps, event.id).map((node, index) => ({ ...node, ...(snapshot.steps[index].timing ? { timing: { ...snapshot.steps[index].timing! } } : {}) }))
  const schedule = computeSchedule({ ...state, people: [], events: [event], nodes })
  const dates = snapshot.steps.map(step => {
    const plan = schedule.nodes[step.key]
    return { step, start: plan ? daysBetween(date, plan.latestStart) : -7, finish: plan ? daysBetween(date, plan.club) : 0 }
  })
  const minimum = Math.floor(Math.min(-21, ...dates.map(item => item.start)) / 7) * 7
  const maximum = Math.ceil(Math.max(7, ...dates.map(item => item.finish)) / 7) * 7
  const width = Math.max(960, LABEL_WIDTH + (maximum - minimum) * TIMELINE_PIXELS_PER_DAY + 220)
  const xOf = (offset: number) => LABEL_WIDTH + 20 + (offset - minimum) * TIMELINE_PIXELS_PER_DAY
  let top = HEADER_HEIGHT
  const rows: TeamRow[] = teams.map(team => {
    const occupied: number[] = []
    const boxes = dates.filter(item => snapshot.stepTeams[item.step.key] === team.id).sort((a, b) => a.start - b.start || a.finish - b.finish || a.step.key.localeCompare(b.step.key)).map(item => {
      const x = xOf(item.start)
      const boxWidth = Math.max(176, (item.finish - item.start) * TIMELINE_PIXELS_PER_DAY)
      let track = occupied.findIndex(right => right + 24 <= x)
      if (track < 0) track = occupied.length
      occupied[track] = x + boxWidth
      return { ...item, x, y: top + 20 + track * 100, width: boxWidth }
    })
    const height = Math.max(120, occupied.length * 100 + 36)
    const row = { team, top, height, boxes }
    top += height
    return row
  })
  const stride = Math.max(7, Math.ceil((maximum - minimum) / 70) * 7)
  const ticks: number[] = []
  for (let day = minimum; day <= maximum; day += stride) ticks.push(day)
  return { rows, width, height: top, xOf, ticks, boxes: rows.flatMap(row => row.boxes), schedule }
}
