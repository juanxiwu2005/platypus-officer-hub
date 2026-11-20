import { describe, expect, it } from "vitest"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { seedDemo } from "../data/seed"
import type { DemoState, Event, EventChecks, Node } from "../data/types"
import { isBusinessDay, shiftWork } from "../engine/calendar"
import { buildEventNodes } from "../engine/playbooks"
import { computeSchedule } from "../engine/schedule"
import { addDays, fromISO } from "../lib/dates"

/**
 * FB-6 guard (docs/feedback-fix/PLAN.md §7.4): the owner's timing table, read from the repository, against the rule engine for the
 * same event (Fri Apr 16, 2027; 60 people; outside caterer; USG funding; default settings). Every date must match the file, except
 * the differences listed in DIFFERENCES below, each with its reason. The comparison tables in CALIBRATION_REPORT.md are generated
 * from this engine output: run `WRITE_CALIBRATION_REPORT=1 npx vitest run src/test/calibration.test.ts` after a change, never edit them by hand.
 */
const TSV = resolve(__dirname, "../../docs/feedback-fix/event-workflow-calibrated-2027-04-16.tsv")
const REPORT = resolve(__dirname, "../../docs/feedback-fix/CALIBRATION_REPORT.md")
const EVENT_DAY = "2027-04-16"

interface Row { lane: string; title: string; dependsOn: string[]; effort: number; official: string | null; start: string; due: string }
function readTable(): Row[] {
  const [, ...lines] = readFileSync(TSV, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim())
  return lines.map(l => {
    const c = l.split("\t")
    return { lane: c[0], title: c[1], dependsOn: c[2] ? c[2].split(";").map(x => x.trim()).filter(x => x && x !== "Event Day") : [], effort: Number(c[3]), official: c[6] || null, start: c[8], due: c[9] }
  })
}

type Reason = "closed" | "close-phase" | "last-three"
const REASON_TEXT: Record<Reason, string> = {
  "closed": "The file date falls on a weekend or holiday: move the deadline to the previous business day (the next business day for post-event work), and the start to the previous officer workday.",
  "close-phase": "Closeout starts no earlier than the first business day after the event (plan 7.2, rule 4: Friday 4/16 is followed by Monday 4/19).",
  "last-three": "The final three steps retain the intended offsets of 5 business days, 7 business days, and 14 days after the event, rather than the file's 129/132/129 days caused by the old engine pushing closeout past finals and summer.",
}
/** The only allowed differences from the file: [engine start, engine deadline, reasons]. */
const DIFFERENCES: Record<string, { start?: string; due?: string; reasons: Reason[] }> = {
  "Budget": { due: "2027-02-19", reasons: ["closed"] },
  "Food Exception Permit": { due: "2027-02-19", reasons: ["closed"] },
  "Content Creation": { due: "2027-02-26", reasons: ["closed"] },
  "Promotion Items": { start: "2027-02-26", reasons: ["closed"] },
  "Check-in Forms Photo Release Liability": { start: "2027-04-09", reasons: ["closed"] },
  "Thank You Note": { start: "2027-04-19", due: "2027-04-19", reasons: ["close-phase", "closed"] },
  "Feedback": { start: "2027-04-19", due: "2027-04-19", reasons: ["close-phase", "closed"] },
  "Post Marketing": { start: "2027-04-19", due: "2027-04-19", reasons: ["close-phase", "closed"] },
  "Photo Backup": { start: "2027-04-19", reasons: ["close-phase"] },
  "Invoice": { start: "2027-04-19", reasons: ["close-phase"] },
  "Attendance Submit": { start: "2027-04-19", reasons: ["close-phase"] },
  "Paid Reimbursed": { start: "2027-04-19", due: "2027-04-23", reasons: ["last-three"] },
  "Finance Record": { start: "2027-04-19", due: "2027-04-27", reasons: ["last-three"] },
  "Documentation": { start: "2027-04-19", due: "2027-04-30", reasons: ["last-three"] },
}
/** Links that differ from the file's "Depends on" column, with the reason. */
const LINK_DIFFERENCES: Record<string, string> = {
  "Budget": "The file notes say “Needs Event Plan as prerequisite”, so Budget depends on Event Plan.",
}

const CHECKS: EventChecks = { food: true, externalFood: true, funding: true }
const ALL_CHECKS: EventChecks = { food: true, externalFood: true, funding: true, speaker: true, partner: true, travel: true, parking: true, advisor: true, access: true, safety: true, outdoor: true, alcohol: true, drone: true, media: true, prize: true, schoolApproval: true, content: true, rsvp: true }
const event = (checks: EventChecks, patch: Partial<Event> = {}): Event => ({ id: "cal", name: "Calibration event", date: EVENT_DAY, type: "social", headcount: 60, venue: "campus", food: "offsite", funding: "usg", speaker: false, checks, goalId: null, playbookId: "seo-event", ...patch })

/** The sample club's roles with default officer settings: one-day personal buffer, no busy weeks, no history. */
function world(ev: Event, today = "2027-01-04"): DemoState {
  const base = seedDemo(today, "v2")
  return { ...base, today, events: [ev], nodes: buildEventNodes(ev, base.roles), contributions: [], funding: [], people: base.people.map(p => ({ ...p, personalBufferDays: 1, personalBufferEnabled: true, busyWeeks: [] })) }
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const day = (d: string | null) => (d ? `${d} (${WEEKDAY[fromISO(d).getDay()]})` : "—")
const table = (head: string[], rows: string[][]) => [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map(r => `| ${r.join(" | ")} |`)].join("\n")

const rows = readTable()
const s = world(event(CHECKS))
const sched = computeSchedule(s)
const byTitle = new Map(s.nodes.map(n => [n.title, n]))
const nodeFor = (title: string): Node => byTitle.get(title)!

function comparisonTable(): string {
  return table(["Step", "File start", "Engine start", "File due", "Engine due", "ASU deadline (engine)", "Reason for difference"], rows.map(r => {
    const n = nodeFor(r.title), p = sched.nodes[n.id], diff = DIFFERENCES[r.title]
    return [r.title, day(r.start), day(p.latestStart), day(r.due), day(p.club), day(p.official), diff ? diff.reasons.map(x => REASON_TEXT[x]).join("; ") : "Matches"]
  }))
}

function conditionalTable(): string {
  const all = world(event(ALL_CHECKS, { speaker: true }))
  const plan = computeSchedule(all)
  return table(["Conditional step", "Start", "Due", "ASU deadline", "Deadline source (engine explanation)"], all.nodes.filter(n => !n.timing).map(n => {
    const p = plan.nodes[n.id]
    return [n.title, day(p.latestStart), day(p.club), day(p.official), p.explain.club.replace(/\|/g, "/")]
  }))
}

function section(text: string, name: string, body: string): string {
  const a = `<!-- ${name}:start -->`, b = `<!-- ${name}:end -->`
  const i = text.indexOf(a), j = text.indexOf(b)
  if (i < 0 || j < 0) throw new Error(`CALIBRATION_REPORT.md is missing the ${name} markers`)
  return `${text.slice(0, i + a.length)}\n${body}\n${text.slice(j)}`
}

describe("FB-6: the engine against the owner's timing table", () => {
  it("builds the same 32 steps as the file", () => {
    expect(rows).toHaveLength(32)
    expect(s.nodes.filter(n => n.eventId === "cal").map(n => n.title).sort()).toEqual(rows.map(r => r.title).sort())
    for (const n of s.nodes) expect(n.timing, n.title).toBeDefined()
  })

  for (const r of rows) {
    it(`${r.title}: start and deadline`, () => {
      const p = sched.nodes[nodeFor(r.title).id]
      const diff = DIFFERENCES[r.title]
      expect([p.latestStart, p.club]).toEqual([diff?.start ?? r.start, diff?.due ?? r.due])
    })
  }

  it("every listed difference really differs, for the reason it gives", () => {
    const afterEvent = shiftWork(EVENT_DAY, 1)
    for (const [title, diff] of Object.entries(DIFFERENCES)) {
      const r = rows.find(x => x.title === title)!
      expect(diff.start !== undefined || diff.due !== undefined).toBe(true)
      if (diff.start !== undefined) expect(diff.start, title).not.toBe(r.start)
      if (diff.due !== undefined) expect(diff.due, title).not.toBe(r.due)
      if (diff.reasons.includes("closed")) expect(!isBusinessDay(r.due) || !isBusinessDay(r.start), title).toBe(true)
      if (diff.reasons.includes("close-phase")) expect([r.start, diff.start], title).toEqual([EVENT_DAY, afterEvent])
      if (diff.reasons.includes("last-three")) expect(r.due > "2027-08-01", title).toBe(true)
    }
    const exact = rows.filter(r => !DIFFERENCES[r.title]).length
    expect(exact).toBe(18)
  })

  it("matches the file's effort days and ASU deadlines", () => {
    for (const r of rows) {
      const n = nodeFor(r.title)
      expect(n.estDays, r.title).toBe(r.effort)
      expect(sched.nodes[n.id].official, r.title).toBe(r.official)
    }
  })

  it("matches the file's links, except the listed ones", () => {
    for (const r of rows) {
      const deps = nodeFor(r.title).dependsOn.map(id => s.nodes.find(n => n.id === id)!.title)
      const fileDeps = r.dependsOn.map(d => (d === "Materials" ? "Event Materials PPT Decorations" : d))
      if (LINK_DIFFERENCES[r.title]) expect(deps, r.title).not.toEqual(fileDeps)
      else expect(deps.sort(), r.title).toEqual(fileDeps.sort())
    }
  })

  it("a freshly created event has no warnings, and no step is dated after a step that waits for it", () => {
    for (const n of s.nodes) expect(sched.nodes[n.id].issues.filter(i => i.severity !== "info"), n.title).toEqual([])
    for (const n of s.nodes) for (const d of n.dependsOn) expect(sched.nodes[d].club <= sched.nodes[n.id].club, `${n.title} waits for ${d}`).toBe(true)
  })

  it("conditional steps (not in the file) are dated from their neighbours and do not move a calibrated step", () => {
    const all = world(event(ALL_CHECKS, { speaker: true }))
    const plan = computeSchedule(all)
    for (const n of all.nodes.filter(x => x.timing)) {
      const base = sched.nodes[n.id]
      expect([plan.nodes[n.id].latestStart, plan.nodes[n.id].club], n.title).toEqual([base.latestStart, base.club])
    }
    for (const n of all.nodes) expect(plan.nodes[n.id].latestStart <= plan.nodes[n.id].club, n.title).toBe(true)
  })

  it("on any event day, a fresh standard event has no pushed steps, no missed deadlines and keeps finish order", () => {
    const bad: string[] = []
    for (let d = "2026-11-02"; d <= "2028-04-28"; d = addDays(d, 1)) {
      for (const [checks, patch] of [[CHECKS, {}], [ALL_CHECKS, { speaker: true }]] as const) {
        const w = world(event(checks, { date: d, ...patch }), "2026-08-20")
        const plan = computeSchedule(w)
        for (const n of w.nodes) {
          const p = plan.nodes[n.id]
          // A push between two uncalibrated steps follows the old rule and is out of scope here (for an event on Nov 2-3, 2026 with every
          // situation route, the ~40-working-day safety chain would have to start before Fall 2026 classes, so the old rule pushes it).
          const calibratedPush = !!n.timing || !!(p.pushedBy && w.nodes.find(x => x.id === p.pushedBy)?.timing)
          const hit = p.issues.filter(i => ["official_missed", "after_event", "loop"].includes(i.code) || (i.code === "pushed" && calibratedPush)).map(i => i.code)
          if (hit.length || p.latestStart > p.club) bad.push(`${d} ${n.title}: ${hit.join(",") || "starts after its deadline"}`)
          for (const u of n.dependsOn) if (n.timing && w.nodes.find(x => x.id === u)?.timing && plan.nodes[u].club > p.club) bad.push(`${d} ${n.title} is due before ${u}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it("the report's tables are the engine's output", () => {
    let text = readFileSync(REPORT, "utf8")
    const next = section(section(text, "comparison", comparisonTable()), "conditional", conditionalTable())
    if (process.env.WRITE_CALIBRATION_REPORT) { writeFileSync(REPORT, next); text = next }
    expect(text).toBe(next)
  })
})
