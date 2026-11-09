import type { LogEntry, RoleHandoff } from "../data/types"
import { words } from "./handoffQuestions"

/**
 * Handoff stage 7: what the next officer asked Ask after they were named, read from the study log that is already kept (Juanxi, Q3: the
 * product's question record and the research log are one; nothing new is recorded). This only READS the log, when a page is drawn:
 * the result is never stored in the club's data, never put in a handbook or dossier, and never sent to the AI. Keep it out of the
 * reducer, handbook and server files (src/test/handoffStage7.test.ts checks that none of them can see the log).
 */
export interface FirstQuestion { at: number; text: string; covered: boolean }
export const MAX_FIRST_QUESTIONS = 40

/** The log entry where this role's next officer was named (or, failing that, where the role was handed over): their questions count from there. */
function startOf(log: LogEntry[], roleId: string): number {
  const about = (kinds: string[]) => log.map((e, i) => ({ e, i })).filter(({ e }) => {
    const a = e.type === "handoffAction" && e.applied ? (e.payload as { action?: { kind?: unknown; roleId?: unknown } } | null)?.action : undefined
    return !!a && a.roleId === roleId && typeof a.kind === "string" && kinds.includes(a.kind)
  }).map(({ i }) => i)
  const named = about(["setIncoming"]), done = about(["complete"])
  return named.length ? named[named.length - 1] : done.length ? done[done.length - 1] : -1
}

/** The questions asked by `record.incomingId` since then, each marked as covered by the handbook (it shares a meaningful word with it) or not. */
export function firstQuestions(log: LogEntry[], record: RoleHandoff): FirstQuestion[] {
  if (!record.incomingId) return []
  const start = startOf(log, record.roleId)
  if (start < 0) return []
  const book = new Set(record.entries.flatMap(e => words(e.text)))
  return log.slice(start + 1)
    .filter(e => e.type === "ui.ask" && e.actor === record.incomingId && typeof (e.payload as { question?: unknown } | null)?.question === "string")
    .slice(-MAX_FIRST_QUESTIONS)
    .map(e => { const text = ((e.payload as { question: string }).question).trim(); const w = words(text); return { at: e.at, text, covered: w.length === 0 || w.some(x => book.has(x)) } })
    .filter(q => q.text)
}
