import type { LogEntry } from "../data/types"
import type { OnboardingRecord } from "./onboardingRecord"

/**
 * One merged, time-ordered list for analysis (export field `timeline`, docs/PHASE3_DATA_DICTIONARY.md):
 * the interaction log and the onboarding walkthrough record side by side. Every row has the ISO time, the
 * milliseconds, where it came from and a short plain description. The full details stay in `interactionLog`
 * and `onboarding`; rows from the log carry `seq` so they can be joined back.
 */
export interface TimelineRow {
  /** Real time as an ISO string (UTC). */
  time: string
  /** The same time in milliseconds since 1970. */
  at: number
  source: "log" | "onboarding"
  /** The log entry's number (log rows only). */
  seq: number | null
  /** Log: the entry type ("ui.click", "updateNode" …). Onboarding: "onboarding.start", "onboarding.enter" … "onboarding.finish". */
  type: string
  /** "View as" person when it happened (log rows only). */
  actor: string | null
  /** The page it happened on, when known. */
  route: string | null
  /** false = not accepted (log rows); null when it does not apply. */
  applied: boolean | null
  /** The onboarding attempt id (onboarding rows only). */
  attempt: string | null
  desc: string
}

type P = Record<string, unknown>
const s = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : JSON.stringify(v))
const q = (v: unknown) => `"${s(v)}"`
const cut = (text: string, n = 160) => (text.length > n ? `${text.slice(0, n)}…` : text)
/** 1234 → "1.2 s"; 754000 → "12 min 34 s". */
const secs = (ms: unknown) => {
  const n = typeof ms === "number" && Number.isFinite(ms) ? Math.max(0, ms) : 0
  if (n < 60_000) return `${(n / 1000).toFixed(1)} s`
  const total = Math.round(n / 1000)
  return `${Math.floor(total / 60)} min ${total % 60} s`
}

/** A short description of one log entry. Never more than the entry itself holds. */
export function describeEntry(e: LogEntry): string {
  const p = (e.payload && typeof e.payload === "object" ? e.payload : {}) as P
  const on = p.route ? ` on ${s(p.route)}` : ""
  const times = typeof p.repeat === "number" && p.repeat > 1 ? ` (×${p.repeat})` : ""
  switch (e.type) {
    case "ui.navigate": return p.from ? `Went to ${s(p.to)} (from ${s(p.from)})` : `Opened the app at ${s(p.to)}`
    case "ui.click":
      if (p.external) return `Opened outside link ${q(p.name)} → ${s(p.href)}${on}${times}`
      if (p.to !== undefined) return `Clicked ${s(p.role)} ${q(p.name)} → ${s(p.to)}${on}${times}`
      return `Clicked ${s(p.role)} ${q(p.name)}${p.expanded === true ? " (opened)" : p.expanded === false ? " (closed)" : ""}${on}${times}${e.applied ? "" : " — disabled"}`
    case "ui.change":
      if (p.value !== undefined) return `Chose ${q(p.value)} in ${q(p.name)}${on}`
      return `${p.checked ? "Ticked" : "Unticked"} ${s(p.role)} ${q(p.name)}${p.group ? ` in ${q(p.group)}` : ""}${on}`
    case "ui.ask": return `Asked: ${q(p.question)}${p.via && p.via !== "typed" ? ` (${s(p.via)})` : ""}`
    case "ui.answer": {
      if (p.answer === "error") return `Answer failed${p.trigger ? ` (${s(p.trigger)})` : ""}`
      const cites = Array.isArray(p.citations) && p.citations.length ? `, cites ${p.citations.join(" ")}` : ""
      return `Answer shown: ${s(p.answer)}${cites}${p.fallback ? ", fallback (no AI)" : ""}${p.refine ? ", second look" : ""}${p.trigger ? ` (${s(p.trigger)})` : ""} · ${s(p.source)}`
    }
    case "ui.details": return p.action === "close" ? "Closed details" : `Opened details: ${s(p.kind)}${p.id ? ` ${s(p.id)}` : ""}`
    case "ui.reminder": return `Opened reminder composer for ${s(p.nodeId)}`
    case "ui.export": return `Exported data (${s(p.entries)} log entries)`
    // Phase 3 behaviour-only items (2026-11-07): study task markers, leaving the page, typing in a field, hover cards.
    case "ui.task":
      if (p.event === "start") return `Started study task ${s(p.task)}${on}`
      return `${p.implicit ? "Ended" : "Finished"} study task ${s(p.task)}${typeof p.ms === "number" ? ` after ${secs(p.ms)}` : ""}${p.implicit ? " (next task started)" : ""}`
    case "ui.visibility": {
      const where = p.via === "window" ? `another window${p.picker ? " (a picker)" : ""}` : p.via === "close" ? "page closed or reloaded" : "another tab or app"
      return p.state === "hidden" ? `Left the page: ${where}${on}` : `Came back after ${secs(p.awayMs)} away (${where})${on}`
    }
    case "ui.edit": return p.event === "end" ? `Stopped typing in ${q(p.field)} after ${secs(p.ms)}${on}` : `Started typing in ${s(p.kind)} field ${q(p.field)}${on}`
    case "ui.hover": return `Hover card ${q(p.name)}${p.near ? ` (under ${q(p.near)})` : ""} open ${secs(p.ms)}${on}`
  }
  const id = ["id", "nodeId", "eventId", "changeSetId", "personId", "viewerId"].map(k => p[k]).find(v => typeof v === "string")
  return `Data action ${e.type}${id ? ` ${s(id)}` : ""}${e.applied ? "" : " — not applied"}`
}

export function buildTimeline(log: LogEntry[], onboarding: OnboardingRecord): TimelineRow[] {
  const rows: TimelineRow[] = []
  const row = (r: Omit<TimelineRow, "time">): TimelineRow => ({ time: Number.isFinite(r.at) ? new Date(r.at).toISOString() : "", ...r })
  for (const e of log) {
    const p = (e.payload && typeof e.payload === "object" ? e.payload : {}) as P
    const route = typeof p.route === "string" ? p.route : e.type === "ui.navigate" && typeof p.to === "string" ? p.to : null
    rows.push(row({ at: e.at, source: "log", seq: e.seq, type: e.type, actor: e.actor, route, applied: e.applied, attempt: null, desc: cut(describeEntry(e)) }))
  }
  for (const a of onboarding.attempts) {
    rows.push(row({ at: a.startedAt, source: "onboarding", seq: null, type: "onboarding.start", actor: null, route: null, applied: null, attempt: a.id, desc: `Walkthrough attempt started: ${a.entry} (flow ${a.flowVersion}, replay ${a.replay})` }))
    for (const st of a.steps) rows.push(row({ at: st.at, source: "onboarding", seq: null, type: `onboarding.${st.event}`, actor: null, route: null, applied: null, attempt: a.id, desc: `Walkthrough screen ${st.step}: ${st.event}` }))
    if (a.finishedAt) rows.push(row({ at: a.finishedAt, source: "onboarding", seq: null, type: "onboarding.finish", actor: null, route: null, applied: null, attempt: a.id, desc: `Walkthrough attempt ended: ${a.outcome ?? "unknown"}` }))
  }
  // Stable: within the same millisecond the log comes first (a press is written in its capture phase, before the
  // screen's own handler records the walkthrough step it causes), and log rows keep their numbering.
  return rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.at - b.r.at || a.i - b.i).map(x => x.r)
}
