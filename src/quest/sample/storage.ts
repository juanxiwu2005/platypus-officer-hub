/** Versioned persistence boundary for the "Mission: Speaker Night" sample: loading validates every stored field, never rewrites or migrates a stored original, and never touches other keys. */
import type { QuestClock } from "../../engine/questSchedule"
import { loadPractice } from "../foundation"
import { type PromotionDraft, DOCUMENTS, REQUESTORS } from "./decisions"
import { type SampleAttempt, type SampleDraft, type SampleStage, type SampleState, STAGES, STAGE_FIELDS, canEnter, draftOf, initialSample, judge } from "./model"
import { validVenue } from "./venue"

export const SAMPLE_KEY = "platypus.quest.sample.v1"
const REJECT_NOTICE = "Saved practice stays untouched. This visit will not save."
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const isStage = (value: unknown): value is SampleStage => (STAGES as readonly string[]).includes(value as string)
const isSafe = (value: unknown, min: number, max: number) => Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max
const isObject = (value: unknown) => typeof value === "object" && value !== null
function validPromotion(value: unknown): value is PromotionDraft {
  if (!isObject(value)) return false
  const { namingFixed, markRemoved, logoFlag, artworkAttached, printCount, vendor } = value as PromotionDraft
  return typeof namingFixed === "boolean" && typeof markRemoved === "boolean" && typeof logoFlag === "boolean" && typeof artworkAttached === "boolean" && isSafe(printCount, 0, 150) && (vendor === null || vendor === "licensed" || vendor === "unverified")
}
/** Delegates wall validation to the foundation loader through a read-only in-memory adapter; no real storage or practice value is used. */
const validWall = (wall: unknown, clock: QuestClock): boolean =>
  loadPractice({ getItem: () => JSON.stringify({ version: 1, scene: "countdown", board: wall, attempts: [], outcome: null }) }, clock).writable
function validDraft(value: unknown, clock: QuestClock): value is SampleDraft {
  if (!isObject(value)) return false
  const d = value as SampleDraft
  return (d.requestor === null || REQUESTORS.some(person => person.id === d.requestor)) && isSafe(d.advisorStart, 0, 2) && isSafe(d.advisorEnd, 0, 2) && d.advisorStart <= d.advisorEnd && validWall(d.wall, clock) && Array.isArray(d.documents) && d.documents.length <= 3 && d.documents.every(doc => DOCUMENTS.includes(doc)) && new Set(d.documents).size === d.documents.length && validPromotion(d.promotion) && validVenue(d.venue)
}
/** A stored attempt is valid only when its recorded verdict exactly matches a fresh judge run on its own snapshot. */
function validAttempt(value: unknown, index: number, clock: QuestClock): boolean {
  if (!isObject(value) || !isStage((value as SampleAttempt).stage)) return false
  const a = value as SampleAttempt
  if (a.number !== index + 1 || !isSafe(a.elapsedMs, 0, 86400000) || !validDraft(a.snapshot, clock)) return false
  const result = judge(a.snapshot, a.stage, clock)
  return a.passed === result.passed && same(a.rules, result.rules) && same(a.failed, result.failed) && a.message === result.message
}

export function loadSample(storage: Pick<Storage, "getItem">, clock: QuestClock): { state: SampleState; writable: boolean; notice: string } {
  let raw: string | null
  try { raw = storage.getItem(SAMPLE_KEY) } catch { return { state: initialSample(clock), writable: false, notice: REJECT_NOTICE } }
  if (raw === null) return { state: initialSample(clock), writable: true, notice: "" }
  try {
    const parsed: unknown = raw.length > 2000000 ? null : JSON.parse(raw)
    if (!isObject(parsed)) throw new Error("Unsupported sample")
    const v = parsed as SampleState
    if (v.version !== 1 || !(v.scene === "prologue" || v.scene === "hq" || isStage(v.scene)) || !isSafe(v.shot, 0, 3) || typeof v.seenIntro !== "boolean" || !validDraft(v, clock)) throw new Error("Invalid sample")
    if (!Array.isArray(v.completed) || !same(v.completed, STAGES.slice(0, v.completed.length))) throw new Error("Invalid sample")
    if (!Array.isArray(v.attempts) || !v.attempts.every((attempt, index) => validAttempt(attempt, index, clock)) || !Array.isArray(v.plans)) throw new Error("Invalid sample")
    const unlocked = v.completed.every(stage => judge(v, stage, clock).passed && v.attempts.some(attempt => attempt.passed && attempt.stage === stage && STAGE_FIELDS[stage].every(key => same(v[key], attempt.snapshot[key]))))
    const outcomeOk = v.outcome === null || (v.attempts.length > 0 && v.outcome !== null && same(v.outcome, v.attempts.at(-1)) && v.scene === v.outcome.stage && same(draftOf(v), v.outcome.snapshot))
    const venuePassed = v.attempts.filter(attempt => attempt.passed && attempt.stage === "venue"), plansOk = v.plans.length === venuePassed.length && v.plans.every((plan, index) => !!plan && plan.number === venuePassed[index].number && same(plan.layout, venuePassed[index].snapshot.venue))
    if (!unlocked || !outcomeOk || !plansOk || !canEnter(v, v.scene)) throw new Error("Invalid sample")
    return { state: v, writable: true, notice: "" }
  } catch { return { state: initialSample(clock), writable: false, notice: REJECT_NOTICE } }
}
export function saveSample(storage: Pick<Storage, "setItem">, state: SampleState): boolean {
  try { storage.setItem(SAMPLE_KEY, JSON.stringify(state)); return true } catch { return false }
}
