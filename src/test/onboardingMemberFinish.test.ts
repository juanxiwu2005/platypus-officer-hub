import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { MAX_BUSY_WEEKS, parseExtra } from "../onboarding/member/finish/extra"
import { weekKind, weeksFrom } from "../onboarding/member/finish/weeks"
import { fromISO } from "../lib/dates"

// OB-08: the busy-weeks strip, the staged values, and a guard on the three screens' files.
describe("OB-08 weeks", () => {
  it("starts with the week of today and gives 18 Mondays", () => {
    const weeks = weeksFrom("2026-10-22")
    expect(weeks).toHaveLength(18)
    expect(weeks[0].monday).toBe("2026-10-19")
    for (const w of weeks) expect(fromISO(w.monday).getDay()).toBe(1)
  })
  it("marks finals, the gap between semesters and holidays from the ASU calendar", () => {
    expect(weekKind("2026-12-07")).toBe("finals")
    expect(weekKind("2026-12-14")).toBe("between")
    expect(weekKind("2026-11-23")).toBe("holiday")
    expect(weekKind("2026-10-12")).toBe("break")
    expect(weekKind("2026-11-02")).toBeNull()
  })
})
describe("OB-08 staged values", () => {
  it("keeps only the known fields with the right types", () => {
    const out = parseExtra(JSON.stringify({ v: 1, personId: "maya", busyWeeks: ["2026-11-02", "2026-11-02", 5, "x"], careerGoal: "Finance", interests: 3, extra: "no" }))
    expect(out).toEqual({ v: 1, personId: "maya", busyWeeks: ["2026-11-02"], careerGoal: "Finance" })
  })
  it("drops answers over 500 characters, caps the weeks at 20, and rejects other shapes", () => {
    expect(parseExtra(JSON.stringify({ v: 1, personId: "a", interests: "x".repeat(501) }))).toEqual({ v: 1, personId: "a" })
    const many = Array.from({ length: 30 }, (_, i) => `2027-01-${String(i + 1).padStart(2, "0")}`)
    expect(parseExtra(JSON.stringify({ v: 1, personId: "a", busyWeeks: many }))?.busyWeeks).toHaveLength(MAX_BUSY_WEEKS)
    for (const bad of [null, "", "nope", "[]", JSON.stringify({ v: 2, personId: "a" }), JSON.stringify({ v: 1 })]) expect(parseExtra(bad)).toBeNull()
  })
})

// Guard: only Done saves, and only with saveProfile; nothing here sets the viewer, asks for an ASU ID or touches the server.
const SHARED_RULES: { name: string; pattern: RegExp }[] = [
  { name: "sets the viewer", pattern: /setViewer/ },
  { name: "asks for an ASU ID", pattern: /ASU\s+ID|<input[^>]*asu/i },
  { name: "calls the org or workspace server", pattern: /\/api\/(org|workspace)/ },
  { name: "fetches from the network", pattern: /\bfetch\s*\(|XMLHttpRequest|sendBeacon/ },
  { name: "writes to localStorage or IndexedDB", pattern: /localStorage|indexedDB/ },
]
const NO_SAVE_RULES = [{ name: "saves to the club", pattern: /\bdispatch\b|saveProfile/ }]
const CSS_RULES: { name: string; pattern: RegExp }[] = [
  { name: "!important", pattern: /!important/ },
  { name: "transition: all", pattern: /transition(-property)?\s*:[^;]*\ball\b/ },
  { name: "a bare time in a transition or animation", pattern: /(transition|animation)(-duration|-delay)?\s*:[^;]*(^|[\s,])\d*\.?\d+m?s\b/ },
  { name: "a hex colour", pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "motion on a layout property", pattern: /transition(-property)?\s*:[^;]*\b(left|top|right|bottom|width|height|margin|padding)\b/ },
]
const scan = (text: string, rules: { name: string; pattern: RegExp }[]) => rules.filter(r => r.pattern.test(text)).map(r => r.name)
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
const root = join(__dirname, "..")
const member = join(root, "onboarding/member")
const finishDir = join(member, "finish")
const finishFiles = readdirSync(finishDir).map(f => join(finishDir, f))
const read = (f: string) => strip(readFileSync(f, "utf8"))

describe("OB-08 guard: only the Done screen saves, and only a profile", () => {
  it("has no forbidden call in the three screens or the finish helpers", () => {
    for (const file of [join(member, "BusyWeeks.tsx"), join(member, "About.tsx"), join(member, "Done.tsx"), ...finishFiles]) expect(scan(read(file), SHARED_RULES), file).toEqual([])
  })
  it("keeps Busy weeks, About you and the helpers from saving to the club", () => {
    for (const file of [join(member, "BusyWeeks.tsx"), join(member, "About.tsx"), ...finishFiles]) expect(scan(read(file), NO_SAVE_RULES), file).toEqual([])
  })
  it("has Done save exactly once through saveProfile, with the club's invite code, and nothing else", () => {
    const done = read(join(member, "Done.tsx"))
    expect(done.match(/dispatch\(/g)).toHaveLength(1)
    expect(done).toMatch(/dispatch\(\{ type: "saveProfile", personId: person\.id, patch: plan\.patch, invite: state\.org\.inviteCode \}\)/)
    expect(done).toMatch(/endWalkthrough\("completed"\)/)
    expect(done).toMatch(/navigate\("\/tasks"\)/)
  })
  it("catches each violation (these samples must be flagged)", () => {
    const bad: Record<string, string> = {
      "sets the viewer": "{ type: 'setViewer', viewerId: id }",
      "asks for an ASU ID": "<label>ASU ID<input /></label>",
      "calls the org or workspace server": "fetch('/api/org/state')",
      "fetches from the network": "await fetch(url)",
      "writes to localStorage or IndexedDB": "localStorage.setItem('k', v)",
    }
    for (const rule of SHARED_RULES) expect(scan(bad[rule.name], SHARED_RULES), rule.name).toContain(rule.name)
    expect(scan("dispatch({ type: 'saveProfile' })", NO_SAVE_RULES)).toContain("saves to the club")
    expect(scan(strip("const ok = 1 // dispatch is not called here"), NO_SAVE_RULES)).toEqual([])
  })
  it("keeps the stylesheet to tokens and no layout motion", () => {
    expect(scan(read(join(root, "styles/ob-08-member-finish.css")), CSS_RULES)).toEqual([])
  })
  it("catches each stylesheet violation (these samples must be flagged)", () => {
    const bad: Record<string, string> = {
      "!important": ".a { color: red !important; }",
      "transition: all": ".a { transition: all var(--dur-fast); }",
      "a bare time in a transition or animation": ".a { animation: x 300ms; }",
      "a hex colour": ".a { color: #fff; }",
      "motion on a layout property": ".a { transition: width var(--dur-fast) var(--ease-out); }",
    }
    for (const rule of CSS_RULES) expect(scan(bad[rule.name], CSS_RULES), rule.name).toContain(rule.name)
    expect(scan(".a { transition: background-color var(--dur-press) var(--ease-out); animation: x var(--dur-slow) var(--ease-out) both; }", CSS_RULES)).toEqual([])
  })
})
