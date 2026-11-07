#!/usr/bin/env node
// Turn one "Export my data" JSON file into a CSV timeline (one row per event) for Excel or R.
// See docs/PHASE3_DATA_DICTIONARY.md for what each column means.
//
//   node scripts/export-to-csv.mjs platypus-export-2026-11-07-15-00-00.json            → writes platypus-export-….csv next to it
//   node scripts/export-to-csv.mjs in.json out.csv
//   node scripts/export-to-csv.mjs in.json out.csv --no-bom                              (no Excel byte-order mark; for R's read.csv)
//
// It reads the file only and writes the CSV only. Nothing is sent anywhere. Works with formatVersion 1, 2 and 3 files
// (version 1 has no `timeline`; one is built here from the interaction log and the onboarding record).
// Times: `time_iso` is UTC; `time_az` is Arizona time (America/Phoenix, UTC-7 all year, no daylight saving).
// `elapsed_s` counts from the study session's start (formatVersion 3), or from the first row when the file has no session.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export const COLUMNS = ["row", "time_iso", "time_az", "time_ms", "elapsed_s", "gap_s", "source", "seq", "attempt", "actor", "type", "route", "name", "target", "external", "applied", "description", "payload_json", "before_json"]

/** One row per event, oldest first. */
export function toRows(file) {
  if (!file || file.format !== "platypus-export") throw new Error("This is not a Platypus export file (format must be \"platypus-export\").")
  const entries = file.interactionLog?.entries ?? []
  const bySeq = new Map(entries.map(e => [e.seq, e]))
  const timeline = Array.isArray(file.timeline) ? file.timeline : legacyTimeline(entries, file.onboarding)
  const startedAt = Number.isFinite(file.session?.startedAtMs) ? file.session.startedAtMs : null
  const first = startedAt ?? (timeline.length ? timeline[0].at : 0)
  return timeline.map((r, i) => {
    const e = r.seq === null || r.seq === undefined ? undefined : bySeq.get(r.seq)
    const p = e && e.payload && typeof e.payload === "object" ? e.payload : {}
    return {
      row: i + 1,
      time_iso: r.time ?? new Date(r.at).toISOString(),
      time_az: azTime(r.at),
      time_ms: r.at,
      elapsed_s: round((r.at - first) / 1000),
      gap_s: i === 0 ? 0 : round((r.at - timeline[i - 1].at) / 1000),
      source: r.source,
      seq: r.seq ?? "",
      attempt: r.attempt ?? "",
      actor: r.actor ?? "",
      type: r.type,
      route: r.route ?? "",
      name: typeof p.name === "string" ? p.name : typeof p.question === "string" ? p.question : "",
      target: typeof p.href === "string" ? p.href : typeof p.to === "string" ? p.to : typeof p.value === "string" ? p.value : "",
      external: p.external === true ? "TRUE" : "",
      applied: r.applied === null || r.applied === undefined ? "" : r.applied ? "TRUE" : "FALSE",
      description: r.desc ?? "",
      payload_json: e ? JSON.stringify(e.payload ?? null) : "",
      before_json: e && e.before !== undefined ? JSON.stringify(e.before) : "",
    }
  })
}

const round = n => Math.round(n * 1000) / 1000

/** Arizona time, e.g. "2026-11-07 10:46:40.337". Arizona keeps UTC-7 all year, so a fixed offset is exact. Same as azTime in src/lib/studySession.ts. */
export function azTime(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return ""
  return new Date(ms - 7 * 3600_000).toISOString().replace("T", " ").replace("Z", "")
}

/** For formatVersion 1 files: the same merge the app now does, with the entry type as the description. */
function legacyTimeline(entries, onboarding) {
  const rows = entries.map(e => ({ at: e.at, source: "log", seq: e.seq, type: e.type, actor: e.actor, route: e.payload?.route ?? null, applied: e.applied, attempt: null, desc: e.type }))
  for (const a of onboarding?.attempts ?? []) {
    rows.push({ at: a.startedAt, source: "onboarding", seq: null, type: "onboarding.start", actor: null, route: null, applied: null, attempt: a.id, desc: `Walkthrough attempt started: ${a.entry}` })
    for (const s of a.steps ?? []) rows.push({ at: s.at, source: "onboarding", seq: null, type: `onboarding.${s.event}`, actor: null, route: null, applied: null, attempt: a.id, desc: `Walkthrough screen ${s.step}: ${s.event}` })
    if (a.finishedAt) rows.push({ at: a.finishedAt, source: "onboarding", seq: null, type: "onboarding.finish", actor: null, route: null, applied: null, attempt: a.id, desc: `Walkthrough attempt ended: ${a.outcome ?? "unknown"}` })
  }
  return rows.map((r, i) => ({ r, i })).sort((a, b) => a.r.at - b.r.at || a.i - b.i).map(x => ({ ...x.r, time: new Date(x.r.at).toISOString() }))
}

/** One CSV cell. Text that a spreadsheet would run as a formula (=, +, -, @ at the start) is prefixed with ' so it stays text. */
export function cell(value) {
  let s = value === null || value === undefined ? "" : String(value)
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(file, { bom = true } = {}) {
  const lines = [COLUMNS.join(","), ...toRows(file).map(r => COLUMNS.map(c => cell(r[c])).join(","))]
  return `${bom ? "﻿" : ""}${lines.join("\r\n")}\r\n`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2).filter(a => !a.startsWith("--"))
  const bom = !process.argv.includes("--no-bom")
  if (!args[0]) { console.error("Usage: node scripts/export-to-csv.mjs <export.json> [out.csv] [--no-bom]"); process.exit(2) }
  const out = args[1] ?? `${args[0].replace(/\.json$/i, "")}.csv`
  const file = JSON.parse(readFileSync(args[0], "utf8"))
  const csv = toCsv(file, { bom })
  writeFileSync(out, csv)
  console.log(`Wrote ${toRows(file).length} rows to ${out}`)
}
