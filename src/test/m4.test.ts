import { afterEach, describe, expect, it, vi } from "vitest"
const chat = vi.hoisted(() => vi.fn())
vi.mock("../../netlify/lib/ai.mts", async importOriginal => ({ ...await importOriginal<object>(), chatJSON: chat }))
vi.mock("@netlify/blobs", () => ({ getStore: vi.fn(() => { throw new Error("storage touched") }) }))
import { getStore } from "@netlify/blobs"
import constitutionFn from "../../netlify/functions/constitution.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup, saveClubSettings, validateClub, validateProfile, validateRoles, profilePatch, saveProfile } from "../data/settings"
import { fnForRole, hasReportingLoop, orderRoles, rederiveFn, setHolder } from "../data/structure"
import { DUTY_BATCH, applyDuties, chunk, dutyItems, readLocally, relevantExcerpt, sanitizeDuties, sanitizeRead, structureFromRead } from "../lib/constitution"
import { SAMPLE_CONSTITUTION } from "../lib/sampleConstitution"
import { aiSnapshot } from "../lib/aiContext"
import { orgChart } from "../engine/orgChart"

const base = seedDemo()
afterEach(() => { chat.mockReset(); resetRateLimit(); vi.mocked(getStore).mockClear() })
const post = (body: unknown) => constitutionFn(new Request("https://example.org/api/setup/constitution", { method: "POST", body: JSON.stringify(body) }))

describe("M4 · reading a constitution without AI", () => {
  const read = readLocally(SAMPLE_CONSTITUTION)
  it("finds every officer title once, with the chain from the text", () => {
    expect(read.source).toBe("local")
    expect(read.roles.map(r => r.title)).toEqual(["President", "Club Advisor", "Executive Vice President", "Vice President of Programs", "Vice President of Finance", "Director of Marketing", "Director of Outreach", "Secretary", "Marketing Associate", "Events Associate"])
    const boss = (t: string) => read.roles.find(r => r.title === t)?.reportsTo
    expect(boss("Executive Vice President")).toBe("President")
    expect(boss("Vice President of Finance")).toBe("Executive Vice President")
    expect(boss("Marketing Associate")).toBe("Director of Marketing")
    expect(boss("Events Associate")).toBe("Vice President of Programs")
    expect(read.roles.find(r => r.title === "Club Advisor")?.isAdvisor).toBe(true)
    expect(read.roles.find(r => r.title === "Director of Marketing")?.duties).toMatch(/^Leads promotion/)
    expect(read.mission).toMatch(/^To help students learn how startups/)
    expect(Object.keys(read).sort()).toEqual(["mission", "notes", "roles", "source"])                   // no departments
    expect(Object.keys(read.roles[0]).sort()).toEqual(["duties", "isAdvisor", "reportsTo", "title"])
  })
  it("reads a constitution that lists duties as 'Section N Title' with A. B. C. items, even after a page break", () => {
    const text = "Article V - Duties\n\f\nSection 1   President\n   A. Provide overall leadership.\n   B. Chair board meetings.\n\nSection 2   Vice President of Finance\n   A. Manage the budget\n      across all events.\n   B. Report to the board.\n   C. Keep records.\n   D. Ignored fourth item.\n\nArticle VI - Advisors\nSection 1  There shall be one advisor, who shall oversee the club's funding."
    const r = readLocally(text)
    expect(r.roles.find(x => x.title === "President")!.duties).toBe("Provide overall leadership. Chair board meetings.")
    expect(r.roles.find(x => x.title === "Vice President of Finance")!.duties).toBe("Manage the budget across all events. Report to the board. Keep records.")
    expect(r.roles.find(x => x.isAdvisor)!.duties).toMatch(/^Oversee the club's funding/)
  })
  it("falls back to the standard roles when no titles are found", () => {
    const r = readLocally("We meet on Tuesdays and like snacks and talking about plans for the semester.")
    expect(r.source).toBe("template"); expect(r.roles).toEqual([])
    const s = structureFromRead(r, { roles: base.roles, people: base.people })
    expect(s.roles.map(x => x.displayName)).toEqual(["President", "Events lead", "Treasurer", "Marketing lead", "Outreach lead", "Secretary"])
    expect(s.roles.filter(x => x.fn === "president")).toHaveLength(1)
  })
})

describe("M4 · roles from a reading", () => {
  const s = structureFromRead(readLocally(SAMPLE_CONSTITUTION), { roles: base.roles, people: base.people })
  const roleOf = (t: string) => s.roles.find(r => r.displayName === t)!
  it("builds a reporting chain with one president, and the advisor beside it, last", () => {
    expect(s.roles.filter(r => r.fn === "president")).toHaveLength(1)
    expect(s.roles[0].fn).toBe("president")
    expect(roleOf("Club Advisor").fn).toBe("advisor"); expect(roleOf("Club Advisor").reportsToId).toBeNull(); expect(s.roles.at(-1)!.fn).toBe("advisor")
    expect(roleOf("President").reportsToId).toBeNull()
    expect(roleOf("Vice President of Finance").reportsToId).toBe(roleOf("Executive Vice President").id)
    expect(roleOf("Marketing Associate").reportsToId).toBe(roleOf("Director of Marketing").id)
    expect(hasReportingLoop(s.roles)).toBe(false)
    expect(s.roles.every(r => !("departmentId" in r))).toBe(true)
  })
  it("the checklist function comes from the title, so event steps still find an owner", () => {
    expect(roleOf("Vice President of Finance").fn).toBe("finance"); expect(roleOf("Executive Vice President").fn).toBe("vice_president")
    expect(roleOf("Director of Marketing").fn).toBe("marketing"); expect(roleOf("Vice President of Programs").fn).toBe("programs")
    expect(fnForRole("Vice President of Professional Development")).toBe("programs")
    expect(fnForRole("Vice President of Network Relations")).toBe("outreach")
    expect(fnForRole("Treasurer")).toBe("finance"); expect(fnForRole("Finance Intern")).toBe("finance"); expect(fnForRole("Historian")).toBe("programs")
    expect(fnForRole("Vice President")).toBe("vice_president"); expect(fnForRole("Faculty Advisor")).toBe("advisor")
  })
  it("keeps today's officers in seats of the same function and gives vacant roles standard duties", () => {
    expect(roleOf("President").holderId).toBe("alex"); expect(roleOf("Vice President of Finance").holderId).toBe("maya")
    expect(roleOf("Director of Outreach").holderId).toBeNull()
    expect(roleOf("Director of Outreach").duties).toMatch(/^Finds and keeps relationships|^Finds and keeps/)
    expect(s.people.every(p => s.roles.find(r => r.id === p.roleId)?.holderId === p.id)).toBe(true)
    expect(validateClub({ ...clubDraft(base), roles: s.roles, people: s.people })).toBeNull()
  })
  it("a second President title becomes a vice president", () => {
    const two = structureFromRead(sanitizeRead({ roles: [{ title: "President" }, { title: "Co-President", reportsTo: "President" }, { title: "Treasurer", reportsTo: "President" }] }), { roles: [], people: [] })
    expect(two.roles.filter(r => r.fn === "president")).toHaveLength(1)
    expect(two.roles.find(r => r.displayName === "Treasurer")!.fn).toBe("finance")
  })
})

describe("M4 · the model's reply is cut down", () => {
  it("drops unknown fields, dates, emails, loops and invented bosses; caps sizes", () => {
    const r = sanitizeRead({
      mission: "Build things by 2099-01-01. Email a@b.org", hack: "x", departments: [{ name: "Finance" }],
      roles: [{ title: "President", reportsTo: "Ghost", duties: "Lead. See https://x.example/y on Dec 5", department: "Leadership" }, { title: "President" }, { title: "Treasurer", reportsTo: "Treasurer" }, ...Array.from({ length: 60 }, (_, i) => ({ title: `Role ${i}` }))],
      notes: ["a", "b", "c", "d", "e"],
    })
    expect(r.mission).not.toMatch(/2099|@/)
    expect(r.roles[0]).toEqual({ title: "President", reportsTo: null, duties: "Lead. See on", isAdvisor: false })
    expect(r.roles.find(x => x.title === "Treasurer")!.reportsTo).toBeNull()
    expect(r.roles.length).toBeLessThanOrEqual(24); expect(r.notes).toHaveLength(4)
    expect(Object.keys(r).sort()).toEqual(["mission", "notes", "roles", "source"])
  })
  it("the endpoint answers the structure and then a few positions' duties per request, sends only text, re-checks replies and never touches storage", async () => {
    chat.mockResolvedValueOnce({ data: { roles: [{ title: "President" }, { title: "Treasurer", reportsTo: "President" }], evil: true }, model: "mock", provider: "mock" })
    chat.mockResolvedValueOnce({ data: { items: [{ name: "Treasurer", duties: "Keeps the budget by 2099-01-01." }, { name: "Ghost", duties: "Invented." }] }, model: "mock", provider: "mock" })
    const text = "The President leads the club. Contact me at boss@example.org or 480-555-0100. The Treasurer keeps the budget."
    const a = await (await post({ text, part: "structure", context: { people: [{ id: "x" }] } })).json()
    const items = [{ name: "Treasurer" }, ...Array.from({ length: 10 }, (_, i) => ({ name: `Extra ${i}` }))]
    const b = await (await post({ text, part: "duties", items })).json()
    expect(chat.mock.calls.map(c => c[0].task)).toEqual(["constitution_read", "constitution_read"])
    expect(chat.mock.calls[0][0].system).toMatch(/Do not write duties/); expect(chat.mock.calls[0][0].system).not.toMatch(/department/i)
    expect(JSON.parse(chat.mock.calls[1][0].user).items).toHaveLength(DUTY_BATCH)                  // at most six positions per request
    expect(chat.mock.calls.every(c => c[0].timeoutMs <= 25_000 && c[0].maxTokens <= 1200)).toBe(true) // finishes, or fails clearly, before the platform's 30 seconds (FB-1: 26 s default budget minus 1 s)
    for (const c of chat.mock.calls) { const sent = JSON.parse(c[0].user); expect(sent.text).not.toMatch(/boss@|555-0100/); expect(Object.keys(sent).every(k => ["text", "items"].includes(k))).toBe(true) }
    expect(a.roles.map((r: { title: string }) => r.title)).toEqual(["President", "Treasurer"]); expect(a.evil).toBeUndefined()
    expect(b.items).toEqual([{ name: "treasurer", duties: "Keeps the budget by." }])   // unknown names and dates are dropped
    expect((await post({ text, part: "duties", items: [] })).status).toBe(400)
    expect(getStore).not.toHaveBeenCalled()
  })
  it("duties go onto the roles in batches of six, replacing standard text only, never what the president wrote", () => {
    const read = readLocally(SAMPLE_CONSTITUTION)
    expect(dutyItems(read)).toHaveLength(read.roles.length)
    expect(chunk(dutyItems(read), DUTY_BATCH).every(c => c.length <= DUTY_BATCH)).toBe(true)
    const built = structureFromRead(sanitizeRead({ roles: [{ title: "President" }, { title: "Treasurer", reportsTo: "President" }] }), { roles: [], people: [] })
    built.roles.find(r => r.displayName === "President")!.duties = "Written by the president."
    const found = sanitizeDuties({ items: [{ name: "President", duties: "AI text." }, { name: "Treasurer", duties: "Keeps the budget." }] }, [{ name: "President" }, { name: "Treasurer" }])
    const next = applyDuties({ roles: built.roles }, found)
    expect(next.roles.find(r => r.displayName === "President")!.duties).toBe("Written by the president.")
    expect(next.roles.find(r => r.displayName === "Treasurer")!.duties).toBe("Keeps the budget.")
  })
  it("refuses empty or oversized text without calling the model", async () => {
    expect((await post({ text: "short" })).status).toBe(400)
    expect((await post({ text: "x".repeat(60_001), part: "duties" })).status).toBe(400)
    expect(chat).not.toHaveBeenCalled()
  })
  it("a long constitution is cut to the paragraphs about officers and duties", () => {
    const filler = "We hold a picnic every spring and everyone brings a snack to share with friends. ".repeat(20)
    const long = Array.from({ length: 60 }, (_, i) => i % 10 === 3 ? `Section ${i}. The Director of Outreach leads partnerships and reports to the President.` : filler).join("\n\n")
    const cut = relevantExcerpt(long, 3000)
    expect(cut.length).toBeLessThanOrEqual(3000); expect(cut).toContain("Director of Outreach")
    expect(relevantExcerpt("short text", 3000)).toBe("short text")
  })
})

describe("M4 · roles, duties and reporting lines reach every member", () => {
  it("setup stores the hierarchy, duties, the club buffer and every officer's contact fields", () => {
    const s = structureFromRead(readLocally(SAMPLE_CONSTITUTION), { roles: base.roles, people: base.people })
    const fin = s.roles.find(r => r.displayName === "Vice President of Finance")!
    const x = setHolder(s.roles, s.people, fin.id, { asuId: "9999000042", phone: "480-555-0142", email: "maya.chen@example.org" })
    const d = { ...clubDraft(base), roles: x.roles, people: x.people }
    expect(validateClub(d)).toBeNull()
    const event = { op: "create_event" as const, name: "Founder Dinner", type: "social" as const, headcount: 30, venue: "campus" as const, food: "offsite" as const, funding: "usg" as const, speaker: false }
    const next = completeSetup(base, d, event, "2026-11-19", crypto.randomUUID(), undefined, 5)
    expect(next.org.settings.clubBufferBusinessDays).toBe(5)
    expect(next.roles[0].fn).toBe("president")
    expect(next.roles.find(r => r.id === fin.id)).toMatchObject({ reportsToId: expect.any(String), duties: expect.stringMatching(/budget/i) })
    expect(next.people.find(p => p.id === fin.holderId)?.asuId).toBe("9999000042")
    expect(completeSetup(base, d, event, "2026-11-19", crypto.randomUUID(), undefined, 4)).toBe(base)
    expect(next.nodes.find(n => n.stepKey === "purchaseRequest")?.fn).toBe("finance")
  })
  it("the president can edit titles, reporting lines and duties in Settings; others cannot", () => {
    const d = clubDraft(base)
    d.roles[1].reportsToId = d.roles[0].id; d.roles[1].duties = "New duties."; d.roles[2].displayName = "Programs Chair"
    const next = saveClubSettings(base, d, base.org.settings)
    expect(next.roles.find(r => r.id === d.roles[1].id)!.duties).toBe("New duties."); expect(next.roles.find(r => r.id === d.roles[2].id)!.displayName).toBe("Programs Chair")
    expect(saveClubSettings({ ...base, viewerId: "maya" }, d, base.org.settings).org).toBe(base.org)
  })
  it("rejects reporting loops and a second president", () => {
    const roles = structuredClone(base.roles)
    roles[0].reportsToId = roles[1].id; roles[1].reportsToId = roles[0].id
    expect(validateRoles(roles, base.people)).toMatch(/loops/)
    const r3 = structuredClone(base.roles); r3[1].fn = "president"
    expect(validateRoles(r3, base.people)).toBeTruthy()
    expect(hasReportingLoop(base.roles)).toBe(false)
  })
  it("roles can share a function; the head listed first gets the event steps", () => {
    const roles = structuredClone(base.roles)
    roles.push({ id: "r-fin2", displayName: "Finance Associate", fn: "finance", holderId: null, reportsToId: "r-fin" })
    expect(validateRoles(roles, base.people)).toBeNull()
    expect(orderRoles(roles.reverse())[0].id).toBe("r-pres")
    expect(rederiveFn(roles, { ...roles[0], displayName: "Treasurer" }).fn).toBe("finance")
  })
  it("the AI sees every role's duties and who it reports to (no departments), but never ASU IDs", () => {
    const ctx = aiSnapshot(base) as unknown as { roles: { title: string; reportsTo: string | null; duties: string }[]; departments?: unknown }
    expect(ctx.roles.find(r => r.title === "Treasurer")).toMatchObject({ reportsTo: "President", duties: expect.stringMatching(/budget/i) })
    expect(ctx.departments).toBeUndefined()
    expect(JSON.stringify(ctx)).not.toMatch(/9999000|asuId|department/i)
  })
})

describe("M4 · the organization chart", () => {
  it("puts the president on top, each role one level under its boss and centered over its reports, with a line to the boss", () => {
    const s = structureFromRead(readLocally(SAMPLE_CONSTITUTION), { roles: base.roles, people: base.people })
    const chart = orgChart(s.roles)
    const n = (t: string) => chart.nodes.find(x => x.title === t)!
    expect(chart.nodes).toHaveLength(s.roles.length)
    expect([n("President").level, n("Executive Vice President").level, n("Vice President of Finance").level]).toEqual([0, 1, 2])
    expect(n("Director of Marketing").level).toBe(2); expect(n("Marketing Associate").level).toBe(3); expect(n("Secretary").level).toBe(1)
    const kids = chart.edges.filter(e => e.from === s.roles.find(r => r.displayName === "Executive Vice President")!.id).map(e => chart.nodes.find(x => x.id === e.to)!.col)
    expect(n("Executive Vice President").col).toBeCloseTo((Math.min(...kids) + Math.max(...kids)) / 2)
    expect(chart.edges).toContainEqual({ from: s.roles.find(r => r.displayName === "President")!.id, to: s.roles.find(r => r.displayName === "Secretary")!.id })
    expect(chart.edges.filter(e => !e.kind)).toHaveLength(s.roles.filter(r => r.reportsToId).length)
    // The advisor is joined to the president by a dashed (advisory) line, not by a reporting line.
    expect(chart.edges.filter(e => e.kind === "advisory")).toEqual([{ from: s.roles.find(r => r.displayName === "President")!.id, to: s.roles.find(r => r.displayName === "Club Advisor")!.id, kind: "advisory" }])
    const adv = n("Club Advisor"); expect(adv.advisor).toBe(true); expect(adv.level).toBe(0); expect(adv.col).toBeGreaterThan(n("President").col)
    const cols = chart.nodes.filter(x => x.level === 3).map(x => x.col); expect(new Set(cols).size).toBe(cols.length)   // cards on a level never overlap
  })
  it("never loses a role: broken or looping links are shown at the top", () => {
    const roles = structuredClone(base.roles)
    roles[1].reportsToId = "ghost"; roles[2].reportsToId = roles[3].id; roles[3].reportsToId = roles[2].id
    const chart = orgChart(roles)
    expect(chart.nodes.map(x => x.id).sort()).toEqual(roles.map(r => r.id).sort())
    expect(orgChart([]).nodes).toEqual([])
  })
})

describe("M4 · ASU ID", () => {
  it("accepts a fictional 9999 ID or nothing, and saves with the profile", () => {
    const p = profilePatch(base.people[0])
    expect(p.asuId).toBe("9999000001")
    expect(validateProfile({ ...p, asuId: "" })).toBeNull()
    expect(validateProfile({ ...p, asuId: "1234567890" })).toMatch(/fictional/)
    expect(validateProfile({ ...p, asuId: "99990001" })).toMatch(/fictional/)
    expect(saveProfile(base, "alex", { ...p, asuId: "9999123456" }).people[0].asuId).toBe("9999123456")
  })
})
