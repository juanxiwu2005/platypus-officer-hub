import type { DemoState, Event, StepTemplate } from "../../data/types"
import { computeSchedule } from "../../engine/schedule"
import { orderedWorkflowSteps, sequenceTeamSteps } from "../../engine/workflowSequence"
import { stepsAsNodes } from "../../engine/workflow"
import { addDays, daysBetween } from "../../lib/dates"
import type { BuilderPolicy, BuilderSnapshot } from "./model"
import { routeTaskDependencies } from "./routing"

export interface BuilderTeam { id: string; name: string }
export interface TaskBox { step: StepTemplate; x: number; y: number; width: number; height: number; start: number; finish: number; col: number; teamId: string }
export interface TeamRow { team: BuilderTeam; top: number; height: number; boxes: TaskBox[] }
export const LABEL_WIDTH = 164
export const HEADER_HEIGHT = 40
export const CARD_WIDTH = 132
export const CARD_HEIGHT = 52
export const SLOT_WIDTH = 156
export const TEAM_ROW_HEIGHT = 96

/** Columns express dependency order, not elapsed time. Only the engine dates a card. */
export function buildTimeline(state: DemoState, snapshot: BuilderSnapshot, teams: BuilderTeam[], policy: BuilderPolicy = "custom", previewDate = addDays(state.today, 42)) {
  const steps = orderedWorkflowSteps(sequenceTeamSteps(snapshot.steps, snapshot.stepTeams))
  const date = /^\d{4}-\d{2}-\d{2}$/.test(previewDate) ? previewDate : addDays(state.today, 42)
  const event: Event = { id: "workflow-editor-preview", name: "Workflow preview", date, type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: `workflow-editor-${policy}`, workflowBranches: snapshot.branches }
  const nodes = stepsAsNodes(steps, event.id).map((node, index) => ({ ...node, ...(steps[index].timing ? { timing: { ...steps[index].timing! } } : {}) }))
  const schedule = computeSchedule({ ...state, people: [], events: [event], nodes })
  const columns = new Map<string, number>()
  for (const step of steps) columns.set(step.key, Math.max(0, ...(step.dependsOn ?? []).map(id => (columns.get(id) ?? -1) + 1)))
  const xOf = (column: number) => LABEL_WIDTH + 20 + column * SLOT_WIDTH
  const rows: TeamRow[] = teams.map((team, index) => {
    const top = HEADER_HEIGHT + index * TEAM_ROW_HEIGHT
    const boxes: TaskBox[] = steps.filter(step => snapshot.stepTeams[step.key] === team.id).map(step => {
      const plan = schedule.nodes[step.key]
      const col = columns.get(step.key) ?? 0
      return { step, col, teamId: team.id, x: xOf(col), y: top + (TEAM_ROW_HEIGHT - CARD_HEIGHT) / 2, width: CARD_WIDTH, height: CARD_HEIGHT, start: plan ? daysBetween(date, plan.latestStart) : -7, finish: plan ? daysBetween(date, plan.club) : 0 }
    })
    return { team, top, height: TEAM_ROW_HEIGHT, boxes }
  })
  const boxes = rows.flatMap(row => row.boxes)
  const routes = routeTaskDependencies(boxes.map(box => ({ id: box.step.key, x: box.x, y: box.y, width: box.width, height: box.height })), boxes.flatMap(box => (box.step.dependsOn ?? []).map(from => ({ from, to: box.step.key }))), LABEL_WIDTH)
  const width = Math.max(720, ...boxes.map(box => box.x + box.width + 24))
  return { rows, boxes, routes, width, height: HEADER_HEIGHT + teams.length * TEAM_ROW_HEIGHT, schedule, ticks: [] as number[], xOf }
}
