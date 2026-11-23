import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// OB-07 guard: the member preview's first two screens (Invitation, with name and email since ob-6, and Reminders) only look at the club, they never write to it, never ask for an ASU ID,
// and never touch the server. Each rule has a sample that must fail, so the guard cannot go quiet without anyone noticing.
const SOURCE_RULES: { name: string; pattern: RegExp }[] = [
  { name: "dispatches an action (the preview must not change the club)", pattern: /\bdispatch\b/ },
  { name: "saves a profile (that happens on OB-08's Done screen)", pattern: /saveProfile/ },
  { name: "sets the viewer", pattern: /setViewer/ },
  { name: "asks for an ASU ID", pattern: /ASU\s+ID|<input[^>]*asu/i },
  { name: "calls the org or workspace server", pattern: /\/api\/(org|workspace)/ },
  { name: "fetches from the network", pattern: /\bfetch\s*\(|XMLHttpRequest|sendBeacon/ },
  { name: "writes to localStorage or IndexedDB", pattern: /localStorage|indexedDB/ },
]
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
const screens = ["Invitation.tsx", "Reminders.tsx"].map(f => join(root, "onboarding/member", f))
const helperDir = join(root, "onboarding/member/invitation")
const sources = [...screens, ...readdirSync(helperDir).map(f => join(helperDir, f))]

describe("OB-07 guard: the member screens before Done only look, never write", () => {
  it("has no forbidden call or field in any of its files", () => {
    for (const file of sources) expect(scan(strip(readFileSync(file, "utf8")), SOURCE_RULES), file).toEqual([])
  })
  it("catches each violation (these samples must be flagged)", () => {
    const bad: Record<string, string> = {
      "dispatches an action (the preview must not change the club)": "dispatch({ type: 'x' })",
      "saves a profile (that happens on OB-08's Done screen)": "dispatch({ type: 'saveProfile' })",
      "sets the viewer": "{ type: 'setViewer', viewerId: id }",
      "asks for an ASU ID": '<label>ASU ID<input /></label>',
      "calls the org or workspace server": "fetch('/api/org/state')",
      "fetches from the network": "await fetch(url)",
      "writes to localStorage or IndexedDB": "localStorage.setItem('k', v)",
    }
    for (const rule of SOURCE_RULES) expect(scan(bad[rule.name], SOURCE_RULES), rule.name).toContain(rule.name)
    expect(scan(strip("const ok = state.people.find(p => p.id === id) // dispatch is not called here"), SOURCE_RULES)).toEqual([])
  })
  it("keeps the stylesheet to tokens, fades and no layout motion", () => {
    expect(scan(strip(readFileSync(join(root, "styles/ob-07-member-invitation.css"), "utf8")), CSS_RULES)).toEqual([])
  })
  it("catches each stylesheet violation (these samples must be flagged)", () => {
    const bad: Record<string, string> = {
      "!important": ".a { color: red !important; }",
      "transition: all": ".a { transition: all var(--dur-fast); }",
      "a bare time in a transition or animation": ".a { transition: opacity 150ms; }",
      "a hex colour": ".a { color: #fff; }",
      "motion on a layout property": ".a { transition: width var(--dur-fast) var(--ease-out); }",
    }
    for (const rule of CSS_RULES) expect(scan(bad[rule.name], CSS_RULES), rule.name).toContain(rule.name)
    expect(scan(".a { transition: opacity var(--dur-fast) var(--ease-out); animation: x var(--dur-fast) var(--ease-out) both; }", CSS_RULES)).toEqual([])
  })
})
