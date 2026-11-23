/** Shared story data for the Mission: Speaker Night sample. No dates are computed here; the engine supplies the clock. */
import type { SampleScene, SampleStage } from "./model"

export interface PrologueShot { image: "empty" | "crew"; caption: string }

/** Four captioned stills; "{days}" is replaced with clock.horizon by the DOM caption. */
export const PROLOGUE_SHOTS: readonly PrologueShot[] = [
  { image: "empty", caption: "A quiet room. A night to build." },
  { image: "empty", caption: "Speaker Night. {days} days. It's yours." },
  { image: "crew", caption: "Meet the crew. Bring everyone together." },
  { image: "crew", caption: "Your first move: lock the date." },
] as const

export const SCENE_TITLES: Record<SampleScene, string> = {
  prologue: "Mission: Speaker Night", hq: "Club HQ", booking: "Open the room request", timeline: "Lock the Date",
  advisor: "Invite the advisor", handoff: "The publicity handoff", promotion: "Make it official", venue: "Set the Stage",
}

/** Rule ids each stage teaches; venue checks are sourced separately by the parent. */
export const STAGE_RULES: Record<SampleStage, readonly string[]> = {
  booking: ["2.3"], timeline: ["2.1", "2.2", "2.4", "2.5"], advisor: ["2.6"],
  handoff: ["5.1"], promotion: ["5.2", "5.3", "5.4"], venue: [],
}
