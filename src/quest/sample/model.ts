/** Pure state and judgments for the "Mission: Speaker Night" complete sample. No dates are computed here; the engine supplies the clock. */
import type { QuestClock } from "../../engine/questSchedule"
import { type Board, emptyBoard, evaluateWall } from "../foundation"
import { type DecisionResult, type PromotionDraft, decideAdvisor, decideHandoff, decidePromotion, decideRequestor, initialPromotion } from "./decisions"
import { type VenueLayout, checkVenue, initialVenue } from "./venue"

export const STAGES = ["booking", "timeline", "advisor", "handoff", "promotion", "venue"] as const
export type SampleStage = typeof STAGES[number]
export type SampleScene = SampleStage | "prologue" | "hq"
export interface SampleDraft { requestor: string | null; advisorStart: number; advisorEnd: number; wall: Board; documents: string[]; promotion: PromotionDraft; venue: VenueLayout }
export interface SampleAttempt extends DecisionResult { stage: SampleStage; number: number; elapsedMs: number; snapshot: SampleDraft }
export interface PracticePlan { number: number; layout: VenueLayout }
export interface SampleState extends SampleDraft { version: 1; scene: SampleScene; shot: number; seenIntro: boolean; completed: SampleStage[]; attempts: SampleAttempt[]; outcome: SampleAttempt | null; plans: PracticePlan[] }

/** Stage-to-draft-key map so persistence can validate a completed stage against its own snapshot fields. */
export const STAGE_FIELDS: Readonly<Record<SampleStage, readonly (keyof SampleDraft)[]>> = {
  booking: ["requestor"], timeline: ["wall"], advisor: ["advisorStart", "advisorEnd"], handoff: ["documents"], promotion: ["promotion"], venue: ["venue"],
}

export function initialSample(clock: QuestClock): SampleState {
  return { version: 1, scene: "prologue", shot: 0, seenIntro: false, requestor: null, advisorStart: 1, advisorEnd: 1, wall: emptyBoard(clock), documents: [], promotion: initialPromotion(), venue: initialVenue(), completed: [], attempts: [], outcome: null, plans: [] }
}

/** Clones exactly the seven draft fields; never captures attempts, plans or other state history. */
export function draftOf(state: SampleDraft): SampleDraft {
  const { requestor, advisorStart, advisorEnd, wall, documents, promotion, venue } = state
  return structuredClone({ requestor, advisorStart, advisorEnd, wall, documents, promotion, venue })
}

export function judge(draft: SampleDraft, stage: SampleStage, clock: QuestClock): DecisionResult {
  if (stage === "booking") return decideRequestor(draft.requestor)
  if (stage === "advisor") return decideAdvisor(draft.advisorStart, draft.advisorEnd)
  if (stage === "handoff") return decideHandoff(draft.documents)
  if (stage === "promotion") return decidePromotion(draft.promotion)
  if (stage === "timeline") {
    const outcome = evaluateWall(draft.wall, clock, 1)
    return { passed: outcome.passed, rules: outcome.passed ? ["2.1", "2.2", "2.4", "2.5"] : [], failed: outcome.failedRuleIds, message: outcome.message }
  }
  const failed = checkVenue(draft.venue).filter(check => !check.passed).map(check => `venue.${check.id}`)
  return failed.length ? { passed: false, rules: [], failed, message: "Room staff cannot confirm this layout yet." } : { passed: true, rules: [], failed: [], message: "The room is ready for the crew." }
}

/** Scenes open from the start, later stages need every preceding stage completed, unknown scenes are rejected. */
export function canEnter(state: SampleState, scene: string): scene is SampleScene {
  if (scene === "prologue" || scene === "hq" || scene === "booking") return true
  const index = STAGES.indexOf(scene as SampleStage)
  return index >= 0 && STAGES.slice(0, index).every(stage => state.completed.includes(stage))
}
