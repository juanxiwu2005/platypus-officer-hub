import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { seedDemo } from "../data/seed"
import type { LogEntry } from "../data/types"
import { buildExport } from "../data/store"
import { azTime, cell, COLUMNS, toCsv, toRows } from "../../scripts/export-to-csv.mjs"
import { azTime as appAzTime } from "../lib/studySession"

// scripts/export-to-csv.mjs: one exported JSON → one CSV timeline. Synthetic, fictional data only.
const T = Date.UTC(2026, 10, 7, 15, 0, 0)
const log: LogEntry[] = [
  { seq: 1, at: T + 100, actor: "alex", type: "ui.navigate", payload: { from: null, to: "/" }, applied: true },
  { seq: 2, at: T + 4100, actor: "alex", type: "ui.ask", payload: { question: "=HYPERLINK(\"x\") What do outside caterers need, \"exactly\"?", via: "typed", route: "/" }, applied: true },
  { seq: 3, at: T + 4900, actor: "alex", type: "ui.answer", payload: { answer: "rule-answer", cards: ["rule-answer"], citations: ["R06"], source: "Matched by keywords · AI unavailable", fallback: true, ms: 800 }, applied: true },
  { seq: 4, at: T + 9000, actor: "alex", type: "ui.click", payload: { route: "/", role: "link", name: "R06 source ↗", area: "answer", external: true, href: "asu.example.edu/handbook.pdf" }, applied: true },
  { seq: 5, at: T + 15000, actor: "alex", type: "updateEvent", payload: { id: "e-night", patch: { headcount: 77 } }, before: { headcount: 60 }, applied: true },
  { seq: 6, at: T + 16000, actor: "maya", type: "setViewer", payload: { viewerId: "nobody" }, before: { viewerId: "maya" }, applied: false },
]
const onboarding = { attempts: [{ id: "ob-test", entry: "start" as const, flowVersion: "ob-2", replay: 0, startedAt: T, finishedAt: T + 3000, outcome: "exited" as const, steps: [{ step: "founder.name", event: "enter" as const, at: T + 50 }, { step: "founder.name", event: "exit" as const, at: T + 3000 }] }] }
const file = () => JSON.parse(JSON.stringify(buildExport(seedDemo("2026-10-22"), log, T + 20000, onboarding, { sessions: [], seqCleared: 0 })))
/**
 * formatVersion 3 with two study sessions in one sitting: S1 began 2 s before the first event (entries 1–3), entry 4 came after S1's sitting
 * marker was lost (no session), S2 began at +10 s (entries 5–6, the study link opened again). An entry and an attempt from a day earlier are
 * left out of the file; a session from that day is not listed.
 */
const S1 = "s-0123456789abcdef", S2 = "s-fedcba9876543210", OLD = "s-ffffffffffffffff"
const sess = (id: string, startedAt: number, previousEntriesCleared = 0) => ({ id, startedAt, previousEntriesCleared, previousAttemptsCleared: 0 })
const v3 = () => JSON.parse(JSON.stringify(buildExport(seedDemo("2026-10-22"),
  [{ seq: 7, at: T - 30 * 3600_000, actor: "alex", type: "ui.click", payload: { name: "Old" }, applied: true }, ...log.map(e => ({ ...e, ...(e.seq <= 3 ? { session: S1 } : e.seq >= 5 ? { session: S2 } : {}) }))], T + 20000,
  { attempts: [{ ...onboarding.attempts[0], id: "ob-old", startedAt: T - 30 * 3600_000, finishedAt: undefined, steps: [], sessionId: OLD }, { ...onboarding.attempts[0], sessionId: S1, setupCompletedAt: T + 2500, setupChoice: "start-workspace" as const }] },
  { sessions: [sess(OLD, T - 30 * 3600_000), sess(S1, T - 2000, 49), sess(S2, T + 10_000)], seqCleared: 0 })))

/** A small RFC 4180 reader, enough to read our own output back. */
function parse(csv: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ""; let q = false
  const text = csv.replace(/^﻿/, "")
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) { if (ch === '"' && text[i + 1] === '"') { f += '"'; i++ } else if (ch === '"') q = false; else f += ch }
    else if (ch === '"') q = true
    else if (ch === ",") { row.push(f); f = "" }
    else if (ch === "\r") continue
    else if (ch === "\n") { row.push(f); rows.push(row); row = []; f = "" }
    else f += ch
  }
  return rows
}

describe("export → CSV timeline", () => {
  it("one row per event, merged by time, with elapsed seconds, the joined payload and earlier values", () => {
    const rows = toRows(file())
    expect(rows.map(r => `${r.source}:${r.type}`)).toEqual([
      "onboarding:onboarding.start", "onboarding:onboarding.enter", "log:ui.navigate", "onboarding:onboarding.exit", "onboarding:onboarding.finish",
      "log:ui.ask", "log:ui.answer", "log:ui.click", "log:updateEvent", "log:setViewer",
    ])
    expect(rows[0]).toMatchObject({ row: 1, time_iso: new Date(T).toISOString(), time_az: "2026-11-07 08:00:00.000", elapsed_s: 0, attempt: "ob-test" })
    const click = rows.find(r => r.type === "ui.click")!
    expect(click).toMatchObject({ seq: 4, name: "R06 source ↗", target: "asu.example.edu/handbook.pdf", external: "TRUE", applied: "TRUE", elapsed_s: 9, gap_s: 4.1 })
    expect(rows.find(r => r.type === "updateEvent")).toMatchObject({ before_json: '{"headcount":60}', payload_json: '{"id":"e-night","patch":{"headcount":77}}' })
    expect(rows.find(r => r.type === "setViewer")).toMatchObject({ applied: "FALSE", actor: "maya" })
  })

  it("writes valid CSV: header, quoting, an Excel byte-order mark (optional), and no formulas from typed text", () => {
    const csv = toCsv(file())
    expect(csv.startsWith("﻿")).toBe(true)
    expect(toCsv(file(), { bom: false }).startsWith("row,")).toBe(true)
    const table = parse(csv)
    expect(table[0]).toEqual(COLUMNS)
    expect(table).toHaveLength(11)
    expect(table.every(r => r.length === COLUMNS.length)).toBe(true)
    const ask = table.find(r => r[COLUMNS.indexOf("type")] === "ui.ask")!
    expect(ask[COLUMNS.indexOf("name")]).toBe("'=HYPERLINK(\"x\") What do outside caterers need, \"exactly\"?")
    expect(cell("-1")).toBe("'-1"); expect(cell(-1)).toBe("-1"); expect(cell("a,b")).toBe('"a,b"')
  })

  it("formatVersion 3: Arizona time next to UTC, a session column, seconds since the row's session began; two sessions in one file", () => {
    const f = v3()
    expect(f.sessions.map((s: { id: string; entries: number }) => [s.id, s.entries])).toEqual([[S1, 3], [S2, 2]])
    expect(f.sessions[0]).toMatchObject({ startedAtAz: "2026-11-07 07:59:58.000", setupChoice: "start-workspace", previousEntriesCleared: 49 })
    expect(f.session).toMatchObject({ id: S2, olderEntriesLeftOut: 50, olderAttemptsLeftOut: 1 })
    const rows = toRows(f)
    expect(COLUMNS.slice(0, 8)).toEqual(["row", "time_iso", "time_az", "time_ms", "elapsed_s", "gap_s", "source", "session"])
    expect(rows[0]).toMatchObject({ source: "session", type: "session.start", session: S1, time_iso: "2026-11-07T14:59:58.000Z", time_az: "2026-11-07 07:59:58.000", elapsed_s: 0 })
    expect(rows.find(r => r.type === "onboarding.start")).toMatchObject({ session: S1, elapsed_s: 2, time_az: "2026-11-07 08:00:00.000" })
    expect(rows.find(r => r.type === "onboarding.setup")).toMatchObject({ elapsed_s: 4.5, description: "Setup finished: Start workspace" })
    expect(rows.find(r => r.type === "ui.click")).toMatchObject({ session: "", elapsed_s: "", time_az: "2026-11-07 08:00:09.000" })   // outside every session
    expect(rows.filter(r => r.type === "session.start").map(r => [r.session, r.elapsed_s])).toEqual([[S1, 0], [S2, 0]])
    expect(rows.find(r => r.type === "updateEvent")).toMatchObject({ session: S2, elapsed_s: 5 })
    expect(rows.filter(r => r.source === "log").map(r => r.seq)).toEqual([1, 2, 3, 4, 5, 6])
    expect(rows.some(r => r.attempt === "ob-old" || r.name === "Old" || r.session === OLD)).toBe(false)
    expect(parse(toCsv(f)).every(r => r.length === COLUMNS.length)).toBe(true)
  })

  it("Arizona time: the script and the app agree, UTC−7 all year", () => {
    for (const ms of [T, Date.UTC(2026, 6, 4, 3, 2, 1, 9), Date.UTC(2027, 0, 1, 0, 0, 0)]) expect(azTime(ms)).toBe(appAzTime(ms))
    expect(azTime(Date.UTC(2027, 0, 1, 0, 0, 0))).toBe("2026-12-31 17:00:00.000")
    expect(azTime(undefined)).toBe("")
  })

  it("reads a version-2 file (no session: seconds count from the first row)", () => {
    const v2 = file(); delete v2.session; delete v2.sessions; v2.formatVersion = 2; for (const r of v2.timeline) { delete r.timeAz; delete r.session }
    const rows = toRows(v2)
    expect(rows).toHaveLength(10)
    expect(rows[0]).toMatchObject({ elapsed_s: 0, time_az: "2026-11-07 08:00:00.000" })
  })

  it("reads a version-1 file too (no timeline field)", () => {
    const v1 = file(); delete v1.timeline; delete v1.session; delete v1.sessions; v1.formatVersion = 1
    const rows = toRows(v1)
    expect(rows).toHaveLength(10)
    expect(rows.filter(r => r.source === "log").map(r => r.seq)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it("the name column falls back to `field` (a ui.edit row keeps its label there, never what was typed)", () => {
    const f = file()
    f.interactionLog.entries.push({ seq: 7, at: T + 17000, actor: "alex", type: "ui.edit", payload: { route: "/settings", field: "Club name", area: "main" }, applied: true })
    f.timeline.push({ time: new Date(T + 17000).toISOString(), at: T + 17000, source: "log", seq: 7, type: "ui.edit", actor: "alex", route: "/settings", applied: true, attempt: null, session: null, desc: "Started editing" })
    expect(toRows(f).find(r => r.type === "ui.edit")).toMatchObject({ name: "Club name", route: "/settings" })
  })

  it("refuses a file that is not a Platypus export", () => {
    expect(() => toRows({ hello: "world" })).toThrow(/not a Platypus export/)
  })

  it("runs from the command line and writes the CSV next to the JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "platypus-csv-"))
    try {
      const input = join(dir, "platypus-export-fictional.json")
      writeFileSync(input, JSON.stringify(file()))
      const out = execFileSync(process.execPath, ["scripts/export-to-csv.mjs", input], { encoding: "utf8" })
      expect(out).toContain("Wrote 10 rows")
      expect(parse(readFileSync(join(dir, "platypus-export-fictional.csv"), "utf8"))).toHaveLength(11)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
