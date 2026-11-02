import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { clubDraft } from "../data/settings"
import { seedDemo } from "../data/seed"
import { summaryLine } from "../onboarding/founder/confirm/summary"
import { emailHref, inviteMessage, inviteUrl, officerRows, whatsappHref } from "../onboarding/founder/invite/links"

// OB-09: the Confirm sentence, the invitation links and the officer list, plus a guard on the two screens' files.
const state = seedDemo(undefined, "v2")
const club = clubDraft(state)

describe("OB-09 confirm sentence", () => {
  it("names the club, the officers who have a name, the event and a readable date", () => {
    const named = club.people.filter(p => p.name.trim()).length
    const line = summaryLine({ ...club, name: "  Maple Club " }, "Welcome Mixer", "2027-03-05")
    expect(line).toBe(`This creates Maple Club with ${named} officers and Welcome Mixer on Fri, Mar 5.`)
  })
  it("does not count open positions, and says 1 officer for one", () => {
    const one = { ...club, people: club.people.map((p, i) => i === 0 ? p : { ...p, name: "" }) }
    expect(summaryLine(one, "E", "2027-03-05")).toContain("with 1 officer and")
  })
})

describe("OB-09 invitation links", () => {
  const link = inviteUrl("a b&c", "https://example.org", "/app/")
  it("is the Settings link: origin, path, #/join?invite=<encoded code>", () => expect(link).toBe("https://example.org/app/#/join?invite=a%20b%26c"))
  it("writes one English sentence with the club and the link, in both channels", () => {
    expect(inviteMessage("Maple Club", link)).toBe(`Join Maple Club on Platypus as an officer: ${link}`)
    expect(whatsappHref("Maple Club", link)).toBe(`https://wa.me/?text=${encodeURIComponent(inviteMessage("Maple Club", link))}`)
    const mail = emailHref("Maple Club", link)
    expect(mail.startsWith("mailto:?subject=")).toBe(true)
    expect(decodeURIComponent(mail)).toContain(link)
  })
  it("never carries an officer's email or phone", () => {
    const text = decodeURIComponent(whatsappHref(club.name, link) + emailHref(club.name, link))
    for (const p of state.people) { if (p.email) expect(text).not.toContain(p.email); if (p.phone) expect(text).not.toContain(p.phone) }
  })
})

describe("OB-09 officer list", () => {
  it("lists every role but the president; open positions have no status; Joined follows setupCompletedOn", () => {
    const roles = state.roles.slice(0, 4).map((r, i) => i === 0 ? { ...r, fn: "president" as const } : r)
    const people = state.people.map(p => ({ ...p, setupCompletedOn: null as string | null }))
    const rows = officerRows(roles, people)
    expect(rows).toHaveLength(3)
    const open = officerRows([{ id: "r", fn: "treasurer", displayName: "Treasurer", holderId: null }], people)
    expect(open).toEqual([{ id: "r", role: "Treasurer", name: "", status: "open" }])
    const holder = roles[1].holderId!
    const joined = officerRows(roles, people.map(p => p.id === holder ? { ...p, setupCompletedOn: "2026-11-02" } : p))
    expect(joined.find(r => r.id === roles[1].id)?.status).toBe("joined")
    expect(joined.filter(r => r.status === "invited").length + joined.filter(r => r.status === "open").length).toBe(2)
  })
})

// Guard: the two screens never call the server or storage, never ask for contact details, and Start is guarded against a double click.
const root = join(__dirname, "..")
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
const read = (f: string) => strip(readFileSync(join(root, f), "utf8"))
const SCREEN_RULES: { name: string; pattern: RegExp }[] = [
  { name: "calls the org or workspace server", pattern: /\/api\/(org|workspace)/ },
  { name: "fetches from the network", pattern: /\bfetch\s*\(|XMLHttpRequest|sendBeacon/ },
  { name: "writes to localStorage or IndexedDB", pattern: /localStorage|indexedDB/ },
  { name: "uses next() at the last step", pattern: /flow(\?)?\.next\(/ },
  { name: "asks for an ASU ID", pattern: /ASU\s+ID/i },
]
const CSS_RULES: { name: string; pattern: RegExp }[] = [
  { name: "!important", pattern: /!important/ },
  { name: "transition: all", pattern: /transition(-property)?\s*:[^;]*\ball\b/ },
  { name: "a bare time in a transition or animation", pattern: /(transition|animation)(-duration|-delay)?\s*:[^;]*(^|[\s,])\d*\.?\d+m?s\b/ },
  { name: "a hex colour", pattern: /#[0-9a-fA-F]{3,8}\b/ },
  { name: "motion on a layout property", pattern: /transition(-property)?\s*:[^;]*\b(left|top|right|bottom|width|height|margin|padding)\b/ },
]
const scan = (text: string, rules: { name: string; pattern: RegExp }[]) => rules.filter(r => r.pattern.test(text)).map(r => r.name)

describe("OB-09 guard", () => {
  const files = ["onboarding/founder/Confirm.tsx", "onboarding/founder/Invite.tsx", "onboarding/founder/confirm/summary.ts", "onboarding/founder/invite/links.ts"]
  it("keeps the screens off the server and storage, and off next()", () => { for (const f of files) expect(scan(read(f), SCREEN_RULES), f).toEqual([]) })
  it("has Confirm create the workspace once, with the classic page's arguments, behind a ref", () => {
    const confirm = read("onboarding/founder/Confirm.tsx")
    expect(confirm.match(/dispatch\(/g)).toHaveLength(1)
    expect(confirm).toMatch(/dispatch\(\{ type: "completeSetup", draft: \{ \.\.\.draft\.club, people: fillEmails\(draft\.club\.people\) \}, event, date, inviteCode: draft\.inviteCode, clubBufferBusinessDays: draft\.buffer, workflow: draft\.steps \}\)/)
    expect(confirm).toMatch(/if \(started\.current\) return/)
    expect(confirm).toMatch(/started\.current = true/)
  })
  it("has Invite open links in a new tab with rel=noopener noreferrer", () => { expect(read("onboarding/founder/Invite.tsx").match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(2) })
  it("catches each violation (these samples must be flagged)", () => {
    const bad: Record<string, string> = {
      "calls the org or workspace server": "fetch('/api/org/state')",
      "fetches from the network": "await fetch(url)",
      "writes to localStorage or IndexedDB": "localStorage.setItem('k', v)",
      "uses next() at the last step": "flow.next()",
      "asks for an ASU ID": "<label>ASU ID</label>",
    }
    for (const rule of SCREEN_RULES) expect(scan(bad[rule.name], SCREEN_RULES), rule.name).toContain(rule.name)
  })
  it("keeps the stylesheet to tokens and no layout motion", () => { expect(scan(read("styles/ob-09-confirm-invite.css"), CSS_RULES)).toEqual([]) })
  it("catches each stylesheet violation (these samples must be flagged)", () => {
    const bad: Record<string, string> = {
      "!important": ".a { color: red !important; }",
      "transition: all": ".a { transition: all var(--dur-fast); }",
      "a bare time in a transition or animation": ".a { animation: x 300ms; }",
      "a hex colour": ".a { color: #fff; }",
      "motion on a layout property": ".a { transition: width var(--dur-fast) var(--ease-out); }",
    }
    for (const rule of CSS_RULES) expect(scan(bad[rule.name], CSS_RULES), rule.name).toContain(rule.name)
    expect(scan(".a { animation: x var(--dur-base) var(--ease-out) both; }", CSS_RULES)).toEqual([])
  })
})
