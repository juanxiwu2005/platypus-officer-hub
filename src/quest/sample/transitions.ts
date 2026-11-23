/** Pure reducer for the "Mission: Speaker Night" sample journey. All dates come from the engine clock; no side effects. */
import type { QuestClock } from "../../engine/questSchedule"
import { STAGE_FIELDS, STAGES, canEnter, draftOf, initialSample, judge } from "./model"
import type { SampleDraft, SampleScene, SampleStage, SampleState } from "./model"

export type SampleAction = { type: "go"; scene: SampleScene } | { type: "shot"; shot: number } | { type: "skipIntro" } | { type: "edit"; values: Partial<SampleDraft> } | { type: "check"; elapsedMs: number } | { type: "rewind" } | { type: "next" } | { type: "restart" }

const NEXT: Record<SampleStage, SampleScene> = { booking: "timeline", timeline: "advisor", advisor: "hq", handoff: "promotion", promotion: "venue", venue: "hq" }
const stageOf = (scene: SampleScene): SampleStage | null => (STAGES as readonly string[]).includes(scene) ? scene as SampleStage : null
const elapsedOf = (ms: number) => Number.isFinite(ms) && ms >= 0 ? Math.min(Math.round(ms), 86400000) : 0

export function sampleReducer(state: SampleState, action: SampleAction, clock: QuestClock): SampleState {
  switch (action.type) {
    case "go": return canEnter(state, action.scene) ? { ...state, scene: action.scene, outcome: null } : state
    case "shot": return Number.isSafeInteger(action.shot) && action.shot >= 0 && action.shot <= 3 ? { ...state, shot: action.shot } : state
    case "skipIntro": return { ...state, seenIntro: true, scene: "hq", shot: 3, outcome: null }
    case "edit": {
      const stage = stageOf(state.scene)
      if (!stage || state.outcome) return state
      const keys = STAGE_FIELDS[stage].filter(key => key in action.values)
      const pick = (source: Partial<SampleDraft>) => Object.fromEntries(keys.map(key => [key, source[key]]))
      if (!keys.length || JSON.stringify(pick(state)) === JSON.stringify(pick(action.values))) return state
      const patch = structuredClone(pick(action.values)) as Partial<SampleDraft>
      return { ...state, ...patch, completed: state.completed.filter(item => STAGES.indexOf(item) < STAGES.indexOf(stage)) }
    }
    case "check": {
      const stage = stageOf(state.scene)
      if (!stage || state.outcome || !canEnter(state, stage) || (stage === "timeline" && state.wall.tray.length)) return state
      const result = judge(state, stage, clock)
      const attempt = { ...result, stage, number: state.attempts.length + 1, elapsedMs: elapsedOf(action.elapsedMs), snapshot: draftOf(state) }
      return {
        ...state, attempts: [...state.attempts, attempt], outcome: attempt,
        completed: result.passed && !state.completed.includes(stage) ? [...state.completed, stage] : state.completed,
        plans: result.passed && stage === "venue" ? [...state.plans, { number: attempt.number, layout: structuredClone(state.venue) }] : state.plans,
      }
    }
    case "rewind": return { ...state, outcome: null }
    case "next": return state.outcome?.passed ? { ...state, scene: NEXT[state.outcome.stage], outcome: null } : state
    case "restart": return { ...initialSample(clock), scene: "hq", seenIntro: true, attempts: state.attempts, plans: state.plans }
  }
}
