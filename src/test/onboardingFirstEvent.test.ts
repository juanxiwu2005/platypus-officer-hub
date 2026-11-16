import { afterEach, describe, expect, it, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import stylelint from "stylelint"
import { clubDraft, BUFFER_CHOICES } from "../data/settings"
import { seedDemo } from "../data/seed"
import { orgSteps } from "../engine/playbooks"
import { withOwners } from "../engine/workflow"
import { onboardingCopy } from "../onboarding/copy"
import { MAX_DOTS, chainDots, prepareEvent, previewFor, wordCount } from "../onboarding/founder/firstEvent/plan"
import { BUFFER_OPTIONS, MAX_BUFFER_ROWS, bufferBinds, bufferRows, isNamedBuffer } from "../onboarding/founder/firstEvent/bufferRows"
import { shiftWork } from "../engine/calendar"

// OB-06: the witness screen's logic (the sentence becomes an event, the rule engine dates the chain, the buffer re-plans it) and its style file.
const c = onboardingCopy.founder.firstEvent
const state = seedDemo(undefined, "v2")
const club = clubDraft(state)
const steps = withOwners(orgSteps(state), club.roles)
const CODE = "11111111-2222-3333-4444-555555555555"
const eventOf = async (sentence: string) => { const r = await prepareEvent(state, club, sentence); if (!r.ok) throw new Error(r.notice); return r }

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe("the sentence becomes one event", () => {
  it("reads every example sentence as an event with a date that is not in the past", async () => {
    for (const x of c.examples) {
      const r = await eventOf(x.sentence)
      expect(r.event.op).toBe("create_event")
      expect(r.date >= state.today, x.label).toBe(true)
    }
  })
  it("refuses a sentence that is not one event, with the same message as the classic page", async () => {
    expect(await prepareEvent(state, club, "What is the budget deadline?")).toEqual({ ok: false, notice: c.notEvent })
  })
  it("with AI on, uses the existing /command and drops any date the model returns (the date comes from the person's sentence)", async () => {
    const ai = { ...state, aiEnabled: true }
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => ({ source: "ai", ops: [{ op: "create_event", name: "Mixer", type: "social", headcount: 20, venue: "campus", food: "none", funding: "none", speaker: false, date: "2030-01-01", clubDeadline: "2030-01-01" }] }) }))
    vi.stubGlobal("fetch", fetchMock)
    const r = await prepareEvent(ai, club, "Plan Mixer on Nov 20, 20 people")
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(["/api/command"])
    expect(r.ok && r.date).toBe("2026-11-20")
    expect(JSON.stringify(r.ok && r.event)).not.toContain("2030")
  })
  it("with AI on but the server failing, falls back to the local grammar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline") }))
    const r = await prepareEvent({ ...state, aiEnabled: true }, club, "Plan Welcome Mixer on Nov 20, 40 people")
    expect(r.ok && r.source).toMatch(/fallback/)
  })
})

describe("the chain", () => {
  it("draws at most MAX_DOTS (never more than 8) dots, in date order, each date exactly the node's club deadline", async () => {
    const { event, date } = await eventOf(c.examples[0].sentence)
    const preview = previewFor(state, club, event, date, CODE, steps, 3)!
    expect(preview).not.toBeNull()
    const dots = chainDots(preview)
    expect(dots.length).toBeGreaterThan(2)
    expect(dots.length).toBeLessThanOrEqual(MAX_DOTS)
    expect(MAX_DOTS).toBeLessThanOrEqual(8)
    expect(chainDots(preview, 50).length).toBeLessThanOrEqual(8)
    expect(dots.map(d => d.date)).toEqual([...dots.map(d => d.date)].sort())
    for (const d of dots) expect(preview.nodes.find(n => n.id === d.id)!.clubDeadline).toBe(d.date)
  })
  it("turning the buffer re-plans the dates: a bigger buffer never makes a date later, and some date moves earlier", async () => {
    // The standard workflow dates every step from a target, so the buffer is never the binding rule there (next test). A workflow whose steps
    // are dated by the ASU rules alone shows the buffer at work.
    const byRule = steps.map(s => s.anchor?.kind === "target" ? { ...s, anchor: undefined } : s)
    const { event, date } = await eventOf(c.examples[0].sentence)
    const at = (b: number) => previewFor(state, club, event, date, CODE, byRule, b)!.nodes.map(n => n.clubDeadline!)
    const small = at(1), big = at(7)
    expect(big.every((d, i) => d <= small[i])).toBe(true)
    expect(big.some((d, i) => d < small[i])).toBe(true)
    for (const b of BUFFER_CHOICES) expect(previewFor(state, club, event, date, CODE, byRule, b)).not.toBeNull()
  })
  // FB-6 changed this engine fact: with the calibrated workflow a larger buffer can move a club deadline earlier, but only where an
  // ASU deadline binds (a step with one, or a step that must finish before it). It never moves a deadline later.
  it("known engine fact: with the standard workflow a larger buffer only moves club deadlines earlier, and only through ASU deadlines", async () => {
    for (const x of c.examples) {
      const { event, date } = await eventOf(x.sentence)
      const at = (b: number) => previewFor(state, club, event, date, CODE, steps, b)!.nodes
      const one = at(1), seven = at(7)
      seven.forEach((n, i) => expect(n.clubDeadline! <= one[i].clubDeadline!, `${x.label}: ${n.title}`).toBe(true))
      const moved = seven.filter((n, i) => n.clubDeadline !== one[i].clubDeadline)
      if (moved.length) expect(moved.some(n => !!n.officialDeadline), x.label).toBe(true)
    }
  })
  it("has no chain for a missing date, a past date, an invalid date or an event that is not there", async () => {
    const { event } = await eventOf(c.examples[0].sentence)
    for (const bad of ["", "2020-01-01", "2026-02-31", "tomorrow"]) expect(previewFor(state, club, event, bad, CODE, steps, 3), bad).toBeNull()
    expect(previewFor(state, club, null, "2026-11-20", CODE, steps, 3)).toBeNull()
    expect(chainDots(null)).toEqual([])
  })
  it("a buffer outside the five choices is refused", async () => {
    const { event, date } = await eventOf(c.examples[0].sentence)
    expect(previewFor(state, club, event, date, CODE, steps, 4)).toBeNull()
  })
})

// FB-3 (docs/feedback-fix/PLAN.md 5.2): the buffer you can see working.
describe("the buffer block", () => {
  it("offers Tight 1 / Standard 3 (recommended) / Safe 5, all among the stored choices; 2 and 7 are Custom", () => {
    expect(BUFFER_OPTIONS.map(o => [o.id, o.days, o.recommended])).toEqual([["tight", 1, false], ["standard", 3, true], ["safe", 5, false]])
    for (const o of BUFFER_OPTIONS) expect(BUFFER_CHOICES as readonly number[]).toContain(o.days)
    expect(BUFFER_CHOICES.filter(b => !isNamedBuffer(b))).toEqual([2, 7])
  })
  it("lists at most three steps of this event that have an ASU deadline, with exactly the engine's two dates", async () => {
    for (const x of c.examples) {
      const { event, date } = await eventOf(x.sentence)
      const preview = previewFor(state, club, event, date, CODE, steps, 3)!
      const rows = bufferRows(preview)
      expect(rows.length, x.label).toBeGreaterThan(0)
      expect(rows.length).toBeLessThanOrEqual(MAX_BUFFER_ROWS)
      for (const r of rows) {
        const n = preview.nodes.find(y => y.title === r.title && y.officialDeadline === r.official)!
        expect(n.clubDeadline).toBe(r.club)
        expect(r.moved).toBeNull()
      }
      expect(rows.map(r => r.official)).toEqual([...rows.map(r => r.official)].sort())
    }
  })
  it("marks a row moved earlier or later only when the engine moved it between two choices", async () => {
    const { event, date } = await eventOf(c.examples[2].sentence)
    const at = (b: number) => previewFor(state, club, event, date, CODE, steps, b)
    const safe = bufferRows(at(5), at(3)), back = bufferRows(at(3), at(5)), same = bufferRows(at(3), at(3))
    expect(safe.some(r => r.moved === "earlier")).toBe(true)
    expect(safe.every(r => r.moved !== "later")).toBe(true)
    expect(back.filter(r => r.moved === "later").map(r => r.key)).toEqual(safe.filter(r => r.moved === "earlier").map(r => r.key))
    expect(same.every(r => r.moved === null)).toBe(true)
    safe.forEach((r, i) => expect(r.moved !== null).toBe(r.club !== back[i].club))
  })
  it("says the buffer works only when it sets a row's date (the engine's own rule), otherwise that nothing moves", async () => {
    const { event, date } = await eventOf(c.examples[2].sentence)
    const at = (b: number) => bufferRows(previewFor(state, club, event, date, CODE, steps, b))
    expect(bufferBinds(at(5), 5)).toBe(true)
    expect(at(5).some(r => r.club === shiftWork(r.official, -5))).toBe(true)
    expect(bufferBinds(at(1), 1)).toBe(false)                    // Tight: the plan already finishes earlier, so nothing moves
    expect(bufferBinds([], 3)).toBe(false)
  })
  it("has no rows for an event whose steps have no ASU deadline (the screen then shows the general example)", async () => {
    // The engine keeps every ASU step in a workflow (checkWorkflow), so such an event is made here by removing the ASU dates from a real plan.
    const { event, date } = await eventOf(c.examples[0].sentence)
    const p = previewFor(state, club, event, date, CODE, steps, 3)!
    expect(bufferRows(p).length).toBeGreaterThan(0)
    expect(bufferRows({ ...p, nodes: p.nodes.map(n => ({ ...n, officialDeadline: null })) })).toEqual([])
    expect(bufferRows(null)).toEqual([])
  })
})

describe("words and copy", () => {
  it("counts words the way a person reads them", () => {
    expect(wordCount("Plan it")).toBe(2)
    expect(wordCount("Nov 20 · 3 days")).toBe(4)
    expect(wordCount("")).toBe(0)
  })
  it("the always-visible copy of this screen fits in 110 words together with a full chain (FB-3: was 60 before the Why line and the buffer rows)", async () => {
    const { event, date } = await eventOf(c.examples[0].sentence)
    const dots = chainDots(previewFor(state, club, event, date, CODE, steps, 3))
    const chain = dots.map(d => `${d.title} Nov 20`).join(" ")
    const rowsText = bufferRows(previewFor(state, club, event, date, CODE, steps, 3)).map(r => `${r.title} ${c.asuDeadline} · ${c.clubFinishes} ${c.movedEarlier}`).join(" ")
    const glance = [c.title, "Why:", c.why, ...c.examples.map(x => x.label), c.cta, chain, c.buffer, c.bufferHint, `${c.bufferOptions.tight} · 1 day ${c.bufferOptions.standard} · 3 days ${c.recommended} ${c.bufferOptions.safe} · 5 days`, rowsText, c.bufferEffect, c.details, onboardingCopy.back, onboardingCopy.next].join(" ")
    expect(wordCount(glance)).toBeLessThanOrEqual(110)
  })
})

// The ob-NN files are not under the dx-NN override in .stylelintrc.json, so this test applies the same motion rules to this package's file.
const root = path.resolve(__dirname, "../..")
const base = JSON.parse(fs.readFileSync(path.join(root, ".stylelintrc.json"), "utf8")) as { rules: Record<string, unknown>; overrides: { rules: Record<string, unknown> }[] }
const strict = { rules: { ...base.rules, ...base.overrides[0].rules } }
async function problems(code: string) {
  const r = await stylelint.lint({ code, codeFilename: path.join(root, "src/styles/ob-06-first-event.css"), config: strict })
  return r.results[0].warnings.map(w => w.text)
}
describe("ob-06 style guard", () => {
  it("the real file passes the motion rules: tokens only, no !important, no transition: all, no layout transitions", async () => {
    expect(await problems(fs.readFileSync(path.join(root, "src/styles/ob-06-first-event.css"), "utf8"))).toEqual([])
  })
  it("goes red for a raw time, transition: all, !important, a layout transition and a hex colour (so the guard is real)", async () => {
    expect((await problems(".a { animation: ob6-dot-in 150ms; }")).length).toBeGreaterThan(0)
    expect((await problems(".a { animation-delay: .1s; }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition: all var(--dur-fast); }")).length).toBeGreaterThan(0)
    expect((await problems(".a { color: var(--ink) !important; }")).length).toBeGreaterThan(0)
    expect((await problems(".a { transition: width var(--dur-fast); }")).length).toBeGreaterThan(0)
    expect((await problems(".a { color: #fff; }")).length).toBeGreaterThan(0)
  })
  it("only moves transform and opacity in its keyframes", () => {
    const css = fs.readFileSync(path.join(root, "src/styles/ob-06-first-event.css"), "utf8")
    const frames = [...css.matchAll(/@keyframes[^{]+\{((?:[^{}]|\{[^}]*\})*)\}/g)].map(m => m[1])
    expect(frames.length).toBeGreaterThan(0)
    for (const body of frames) for (const prop of body.matchAll(/([a-z-]+)\s*:/g)) expect(["transform", "opacity"]).toContain(prop[1])
  })
})
