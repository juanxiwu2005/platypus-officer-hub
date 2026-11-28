import { completeSetup, validateClub, type ClubDraft, type FirstEvent } from "../../../data/settings"
import type { DemoState, StepTemplate } from "../../../data/types"
import { callApi } from "../../../lib/api"
import { commandContext, humanEventDate, parseCommand, sanitizeOps, validDate } from "../../../lib/commands"
import { onboardingCopy } from "../../copy"

/** The most dots the witness chain ever draws (strategy section 5: at most 8; fewer keeps the screen within its word budget). */
export const MAX_DOTS = 6
export interface ChainDot { id: string; title: string; date: string }
export type Prepared = { ok: true; event: FirstEvent; date: string; source: string } | { ok: false; notice: string }

/**
 * Turn one sentence into a first event. Same rule as the classic setup page: with AI on, ask the existing /api/command (it answers with
 * checked operations only); if that fails or AI is off, the local grammar reads it. Dates are never taken from the model: the event date is
 * read from the person's own sentence by humanEventDate, and every step date comes later from the rule engine.
 */
export async function prepareEvent(state: DemoState, club: ClubDraft, sentence: string): Promise<Prepared> {
  const ctx = commandContext({ ...state, people: club.people, roles: club.roles, events: [], nodes: [] })
  let ops = [] as ReturnType<typeof sanitizeOps>, source = "Platypus · AI off"
  if (state.aiEnabled) {
    try { const result = await callApi<{ ops: unknown; source: string }>("/command", { sentence, context: ctx }); ops = sanitizeOps(result.ops, ctx); source = result.source === "ai" ? "AI draft · review below" : "Platypus" }
    catch { ops = parseCommand(sentence, ctx); source = "Local demo fallback · server unavailable" }
  } else ops = parseCommand(sentence, ctx)
  if (ops.length !== 1 || ops[0].op !== "create_event") return { ok: false, notice: onboardingCopy.founder.firstEvent.notEvent }
  return { ok: true, event: ops[0], date: humanEventDate(sentence, state.today), source }
}

/** The workspace this event would create, or null while anything is missing or refused. The buffer is passed in, so changing it re-plans every date. */
export function previewFor(state: DemoState, club: ClubDraft, event: FirstEvent | null, date: string, inviteCode: string, steps: StepTemplate[], buffer: number): DemoState | null {
  // The name and mission change no date. The screen opened on its own (before they were typed) still shows the plan; Confirm checks them for real.
  const dated = { ...club, name: club.name.trim() || "Your club", mission: club.mission.trim() || "Your mission" }
  if (!event || !validDate(date) || date < state.today || validateClub(dated)) return null
  const next = completeSetup(state, dated, event, date, inviteCode, undefined, buffer, steps)
  return next === state ? null : next
}

/** The first few steps in date order, each with the club deadline the rule engine gave it. Nothing here makes up a date. */
export function chainDots(preview: DemoState | null, max = MAX_DOTS): ChainDot[] {
  if (!preview) return []
  return preview.nodes
    .flatMap((n, i) => n.clubDeadline ? [{ id: n.id, title: n.title, date: n.clubDeadline, i }] : [])
    .sort((a, b) => a.date.localeCompare(b.date) || a.i - b.i)
    .slice(0, Math.min(max, 8))
    .map(({ id, title, date }) => ({ id, title, date }))
}

/** Words a person sees: runs of letters or digits. The same measure the screen's word check uses. */
export const wordCount = (text: string) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’&-]*/gu) ?? []).length
