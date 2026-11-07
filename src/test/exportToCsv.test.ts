import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { seedDemo } from "../data/seed"
import type { LogEntry } from "../data/types"
import { buildExport } from "../data/store"
import { cell, COLUMNS, toCsv, toRows } from "../../scripts/export-to-csv.mjs"

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
const file = () => JSON.parse(JSON.stringify(buildExport(seedDemo("2026-10-22"), log, T + 20000, onboarding)))

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
    expect(rows[0]).toMatchObject({ row: 1, time_iso: new Date(T).toISOString(), elapsed_s: 0, attempt: "ob-test" })
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

  it("reads a version-1 file too (no timeline field)", () => {
    const v1 = file(); delete v1.timeline; v1.formatVersion = 1
    const rows = toRows(v1)
    expect(rows).toHaveLength(10)
    expect(rows.filter(r => r.source === "log").map(r => r.seq)).toEqual([1, 2, 3, 4, 5, 6])
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
