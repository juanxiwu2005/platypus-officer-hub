import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { seedDemo } from "../data/seed"
import { clubDraft } from "../data/settings"
import type { OnboardingDraft } from "../onboarding/draft"
import { onboardingCopy } from "../onboarding/copy"
import { prepareDoc } from "../onboarding/founder/constitution/prepare"
import { applyRead, bindDraft, runReading, stopReading } from "../onboarding/founder/constitution/useReading"
import { SAMPLE_CONSTITUTION } from "../lib/sampleConstitution"

// OB-04: the background constitution reading, and a source guard for this package's files (with samples that must turn it red).
const copy = onboardingCopy.founder.constitution
const REPLY = { mission: "Help students build real startups.", roles: [
  { title: "President", reportsTo: null, isAdvisor: false },
  { title: "Director of Marketing", reportsTo: "President", isAdvisor: false },
  { title: "Treasurer", reportsTo: "President", isAdvisor: false },
], notes: [] }
const DUTIES = { items: [{ name: "President", duties: "Leads the club." }, { name: "Director of Marketing", duties: "Leads promotion." }, { name: "Treasurer", duties: "Keeps the budget." }] }
const doc = (text = SAMPLE_CONSTITUTION, checksum = "sum-1") => ({ fileName: "sample.txt", text, checksum })

let current: OnboardingDraft
const fresh = (over: Partial<OnboardingDraft> = {}): OnboardingDraft => ({
  club: clubDraft(seedDemo()), doc: doc(), reading: { status: "idle" }, applied: false, structureTouched: false, missionTouched: false,
  steps: [], workflowTouched: false, buffer: 3, sentence: "", event: null, date: "", source: "", confirmed: false, reminderMode: null, inviteCode: "x", skipped: [], ...over,
})
let calls: { part?: string; text?: string }[] = []
function mockFetch(handler: (body: { part?: string }) => { status: number; json: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); calls.push(body)
    const r = handler(body)
    return { ok: r.status < 400, status: r.status, json: async () => r.json } as Response
  }))
}
beforeEach(() => { calls = []; current = fresh(); stopReading(); bindDraft(fn => { current = fn(current) }) })
afterEach(() => { vi.unstubAllGlobals(); stopReading() })

describe("OB-04 background reading", () => {
  it("with AI off reads in the browser, applies the roles, and sends nothing", async () => {
    mockFetch(() => ({ status: 200, json: {} }))
    await runReading(doc(), { aiEnabled: false })
    expect(calls).toEqual([])
    expect(current.reading).toMatchObject({ status: "ready", retry: false, note: copy.aiOff })
    expect(current.applied).toBe(true)
    expect(current.club.roles.length).toBeGreaterThan(1)
  })
  it("with AI on asks for the structure first, then the duties, and puts both on the roles", async () => {
    mockFetch(b => ({ status: 200, json: b.part === "duties" ? DUTIES : REPLY }))
    await runReading(doc(), { aiEnabled: true })
    expect(calls.map(c => c.part)).toEqual(["structure", "duties"])
    expect(current.reading).toMatchObject({ status: "ready", pending: 0, retry: false, note: copy.suggested })
    expect(current.club.roles.find(r => r.displayName === "Director of Marketing")?.duties).toBe("Leads promotion.")
    expect(current.club.mission).toBe("Help students build real startups.")
  })
  it("never overwrites roles the president already edited", async () => {
    current = fresh({ structureTouched: true })
    const before = current.club.roles
    mockFetch(b => ({ status: 200, json: b.part === "duties" ? DUTIES : REPLY }))
    await runReading(doc(), { aiEnabled: true })
    expect(current.applied).toBe(false)
    expect(current.reading.status).toBe("ready")                      // kept for the Team screen's "Use these suggestions"
    expect(current.club.roles.map(r => r.displayName)).toEqual(before.map(r => r.displayName))
  })
  it("when AI fails, shows the new sentence with no status code and falls back to the browser reading", async () => {
    mockFetch(() => ({ status: 404, json: { message: "HTTP 404 not found" } }))
    await runReading(doc(), { aiEnabled: true })
    expect(current.reading).toMatchObject({ status: "ready", retry: true, note: copy.aiFailed })
    expect(copy.aiFailed).not.toMatch(/HTTP|\d{3}/)
    expect(current.applied).toBe(true)
    expect(calls.map(c => c.part)).toEqual(["structure"])             // a refusal is not asked again
  })
  it("with nothing readable on the page, offers the standard roles instead of an AI message", async () => {
    mockFetch(() => ({ status: 404, json: {} }))
    await runReading(doc("This document has no titles in it at all, only some plain sentences about snacks."), { aiEnabled: true })
    expect(current.reading).toMatchObject({ status: "ready", note: copy.noTitles })
  })
  it("a reading that was stopped writes nothing, and one for another document is ignored", async () => {
    mockFetch(() => ({ status: 200, json: REPLY }))
    const job = runReading(doc(), { aiEnabled: true })
    stopReading()                                                    // the president removed the document
    await job
    expect(current.reading.status).toBe("reading")                   // only the first "reading" mark was written
    expect(current.applied).toBe(false)
    current = fresh({ doc: doc(SAMPLE_CONSTITUTION, "another") })
    stopReading()
    await runReading(doc(), { aiEnabled: false })
    expect(current.reading.status).toBe("idle")
    expect(current.applied).toBe(false)
  })
  it("does not start the same document twice, but starts again on request", async () => {
    mockFetch(b => ({ status: 200, json: b.part === "duties" ? DUTIES : REPLY }))
    await runReading(doc(), { aiEnabled: true })
    await runReading(doc(), { aiEnabled: true })
    expect(calls.length).toBe(2)
    await runReading(doc(), { aiEnabled: true, again: true })
    expect(calls.length).toBe(4)
  })
  it("hides emails and phone numbers before anything can be sent", async () => {
    const prepared = await prepareDoc("pasted.txt", "The President leads the club. Write to boss@example.org or call 480-555-0107 about dues.")
    expect(prepared.text).not.toContain("boss@example.org"); expect(prepared.text).not.toContain("480-555-0107")
    expect(prepared.text).toContain("[contact redacted]")
    mockFetch(b => ({ status: 200, json: b.part === "duties" ? DUTIES : REPLY }))
    await runReading(prepared, { aiEnabled: true })
    expect(JSON.stringify(calls)).not.toMatch(/example\.org|555-0107/)
    await expect(prepareDoc("short.txt", "Too short")).rejects.toThrow(copy.tooShort)
  })
  it("applyRead keeps an earlier applied reading", () => {
    const d = fresh({ applied: true })
    expect(applyRead(d, { mission: "", roles: [], notes: [], source: "template" })).toBe(d)
  })
})

// ---- the source guard: this package's files must not break the rules that no tool checks for ob-*.css and src/onboarding ----
const root = path.resolve(__dirname, "../..")
const read = (p: string) => readFileSync(path.join(root, p), "utf8")
/** What a file of this package must never contain. Returns the names of the broken rules. */
export function breaks(file: string, source: string): string[] {
  const out: string[] = []
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
  if (/\/api\/(org|workspace)/.test(code)) out.push("server storage endpoint")
  if (file.endsWith(".css")) {
    if (/!important/.test(code)) out.push("!important")
    if (/transition(-property)?\s*:[^;]*\ball\b/.test(code)) out.push("transition: all")
    if (/(transition|animation)[a-z-]*\s*:[^;]*\b\d*\.?\d+m?s\b/.test(code.replace(/\b0m?s\b/g, ""))) out.push("raw time")
    if (/#[0-9a-fA-F]{3,8}\b/.test(code)) out.push("hex colour")
    if (/transition[a-z-]*\s*:[^;]*\b(left|top|right|bottom|width|height|margin|padding)\b/.test(code)) out.push("animated layout property")
    for (const m of code.matchAll(/font-size\s*:\s*([^;]+);/g)) if (!/^var\(--fs-[a-z0-9]+\)$/.test(m[1].trim()) && m[1].trim() !== "inherit") out.push("font-size not a token")
    for (const m of code.matchAll(/border-radius\s*:\s*([^;]+);/g)) if (!/^(0|inherit|var\(--r-[a-z]+\))$/.test(m[1].trim())) out.push("radius not a token")
  } else {
    if (/\bstyle=\{\{/.test(code)) out.push("inline style")
    if (/\b(HTTP|status code)\b/i.test(code.replace(/\/\/.*$/gm, "").replace(/`[^`]*`/g, ""))) out.push("status code wording")
  }
  return out
}
const ownFiles = (): string[] => {
  const walk = (dir: string): string[] => readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`])
  return ["src/onboarding/founder/Name.tsx", "src/onboarding/founder/name/mission.ts", "src/styles/ob-04-name-constitution.css", ...walk("src/onboarding/founder/constitution")]
}
describe("OB-04 source guard", () => {
  it("passes on this package's own files", () => {
    for (const f of ownFiles()) expect(breaks(f, read(f)), f).toEqual([])
  })
  it("the screen wording has no status code (copy)", () => {
    const text = JSON.stringify(onboardingCopy.founder.constitution) + JSON.stringify(onboardingCopy.founder.name)
    expect(text).not.toMatch(/HTTP|\b[45]\d\d\b/)
  })
  it("turns red on deliberate violations", () => {
    expect(breaks("x.css", ".a { color: red !important; }")).toContain("!important")
    expect(breaks("x.css", ".a { transition: all var(--dur-fast); }")).toContain("transition: all")
    expect(breaks("x.css", ".a { transition: opacity 150ms; }")).toContain("raw time")
    expect(breaks("x.css", ".a { animation: pop .3s; }")).toContain("raw time")
    expect(breaks("x.css", ".a { color: #fff; }")).toContain("hex colour")
    expect(breaks("x.css", ".a { transition: left var(--dur-fast); }")).toContain("animated layout property")
    expect(breaks("x.css", ".a { font-size: 12px; }")).toContain("font-size not a token")
    expect(breaks("x.css", ".a { border-radius: 6px; }")).toContain("radius not a token")
    expect(breaks("x.tsx", 'fetch("/api/org/state")')).toContain("server storage endpoint")
    expect(breaks("x.ts", 'const n = "/api/workspace"')).toContain("server storage endpoint")
    expect(breaks("x.tsx", "<div style={{ color: 'red' }} />")).toContain("inline style")
    expect(breaks("x.ts", 'const note = "AI could not read it (HTTP 404)"')).toContain("status code wording")
  })
})
