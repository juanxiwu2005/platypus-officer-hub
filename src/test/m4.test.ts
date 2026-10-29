import { afterEach, describe, expect, it, vi } from "vitest"
const chat = vi.hoisted(() => vi.fn())
vi.mock("../../netlify/lib/ai.mts", async importOriginal => ({ ...await importOriginal<object>(), chatJSON: chat }))
vi.mock("@netlify/blobs", () => ({ getStore: vi.fn(() => { throw new Error("storage touched") }) }))
import { getStore } from "@netlify/blobs"
import constitutionFn from "../../netlify/functions/constitution.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup, saveClubSettings, validateClub, validateProfile, validateRoles, profilePatch, saveProfile } from "../data/settings"
import { DEFAULT_DEPARTMENTS, departmentsOf, fnForDepartment, fnForRole, hasReportingLoop, orderRoles, rederiveFn, setHolder } from "../data/structure"
import { readLocally, sanitizeRead, structureFromRead } from "../lib/constitution"
import { SAMPLE_CONSTITUTION } from "../lib/sampleConstitution"
import { aiSnapshot } from "../lib/aiContext"

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
  })
  it("falls back to the standard structure when no titles are found", () => {
    const r = readLocally("We meet on Tuesdays and like snacks and talking about plans for the semester.")
    expect(r.source).toBe("template"); expect(r.roles).toEqual([])
    const s = structureFromRead(r, { roles: base.roles, people: base.people })
    expect(s.departments.map(d => d.name)).toEqual(DEFAULT_DEPARTMENTS.map(d => d.name))
    expect(s.roles.filter(x => x.fn === "president")).toHaveLength(1)
  })
})

describe("M4 · structure from a reading", () => {
  const s = structureFromRead(readLocally(SAMPLE_CONSTITUTION), { roles: base.roles, people: base.people })
  const roleOf = (t: string) => s.roles.find(r => r.displayName === t)!
  it("builds departments, a reporting chain, one president and the advisor outside the chain", () => {
    expect(s.roles.filter(r => r.fn === "president")).toHaveLength(1)
    expect(s.roles[0].fn).toBe("president")
    expect(roleOf("Club Advisor").fn).toBe("advisor"); expect(roleOf("Club Advisor").reportsToId).toBeNull(); expect(s.roles.at(-1)!.fn).toBe("advisor")
    expect(roleOf("President").reportsToId).toBeNull()
    expect(roleOf("Vice President of Finance").reportsToId).toBe(roleOf("Executive Vice President").id)
    expect(roleOf("Marketing Associate").reportsToId).toBe(roleOf("Director of Marketing").id)
    expect(hasReportingLoop(s.roles)).toBe(false)
    expect(s.departments.map(d => d.name)).toEqual(expect.arrayContaining(["Leadership", "Finance", "Marketing", "Programs", "Outreach", "Records", "Advisory"]))
    expect(roleOf("Vice President of Finance").fn).toBe("finance"); expect(roleOf("Executive Vice President").fn).toBe("vice_president")
  })
  it("keeps today's officers in seats of the same function and gives vacant roles standard duties", () => {
    expect(roleOf("President").holderId).toBe("alex"); expect(roleOf("Vice President of Finance").holderId).toBe("maya")
    expect(roleOf("Director of Outreach").holderId).toBeNull()
    expect(s.people.every(p => s.roles.find(r => r.id === p.roleId)?.holderId === p.id)).toBe(true)
    const d = { ...clubDraft(base), departments: s.departments, roles: s.roles, people: s.people }
    expect(validateClub(d)).toBeNull()
  })
  it("a second President title becomes a vice president and event steps still find an owner", () => {
    const two = structureFromRead(sanitizeRead({ roles: [{ title: "President" }, { title: "Co-President", reportsTo: "President" }, { title: "Treasurer", department: "Finance", reportsTo: "President" }] }), { roles: [], people: [] })
    expect(two.roles.filter(r => r.fn === "president")).toHaveLength(1)
    expect(two.roles.find(r => r.displayName === "Treasurer")!.fn).toBe("finance")
  })
})

describe("M4 · the model's reply is cut down", () => {
  it("drops unknown fields, dates, emails, loops and invented bosses; caps sizes", () => {
    const r = sanitizeRead({
      mission: "Build things by 2099-01-01. Email a@b.org", hack: "x",
      departments: [{ name: "Finance", duties: "Budget." }, { name: "finance" }, { nope: 1 }],
      roles: [{ title: "President", reportsTo: "Ghost", duties: "Lead. See https://x.example/y on Dec 5" }, { title: "President" }, { title: "Treasurer", reportsTo: "Treasurer" }, ...Array.from({ length: 60 }, (_, i) => ({ title: `Role ${i}` }))],
      notes: ["a", "b", "c", "d", "e"],
    })
    expect(r.mission).not.toMatch(/2099|@/)
    expect(r.departments).toEqual([{ name: "Finance", duties: "Budget." }])
    expect(r.roles[0]).toMatchObject({ title: "President", reportsTo: null, duties: "Lead. See on" })
    expect(r.roles.find(x => x.title === "Treasurer")!.reportsTo).toBeNull()
    expect(r.roles.length).toBeLessThanOrEqual(24); expect(r.notes).toHaveLength(4)
    expect(Object.keys(r).sort()).toEqual(["departments", "mission", "notes", "roles", "source"])
  })
  it("the endpoint sends only the text, re-checks the reply and never touches storage", async () => {
    chat.mockResolvedValue({ data: { roles: [{ title: "President", duties: "Leads." }, { title: "Treasurer", department: "Finance", reportsTo: "President" }], departments: [{ name: "Finance", duties: "Money." }], evil: true }, model: "mock", provider: "mock" })
    const res = await post({ text: "The President leads the club. Contact me at boss@example.org or 480-555-0100. The Treasurer keeps the budget.", context: { people: [{ id: "x" }] } })
    const body = await res.json()
    expect(chat.mock.calls[0][0].task).toBe("constitution_read")
    const sent = JSON.parse(chat.mock.calls[0][0].user)
    expect(Object.keys(sent)).toEqual(["text"]); expect(sent.text).not.toMatch(/boss@|555-0100/)
    expect(body.roles.map((r: { title: string }) => r.title)).toEqual(["President", "Treasurer"]); expect(body.evil).toBeUndefined()
    expect(getStore).not.toHaveBeenCalled()
  })
  it("refuses empty or oversized text without calling the model", async () => {
    expect((await post({ text: "short" })).status).toBe(400)
    expect((await post({ text: "x".repeat(60_001) })).status).toBe(400)
    expect(chat).not.toHaveBeenCalled()
  })
})

describe("M4 · departments and roles reach every member", () => {
  it("older saves get default departments; seeded roles belong to them", () => {
    const old = structuredClone(base); delete old.org.departments; old.roles.forEach(r => { delete r.departmentId; delete r.reportsToId; delete r.duties })
    expect(departmentsOf(old).map(d => d.fn)).toEqual(expect.arrayContaining(["president", "finance", "programs", "marketing", "secretary"]))
    expect(validateClub({ ...clubDraft(old) })).toBeNull()
  })
  it("setup stores departments, the hierarchy, duties, the club buffer and every officer's contact fields", () => {
    const s = structureFromRead(readLocally(SAMPLE_CONSTITUTION), { roles: base.roles, people: base.people })
    const fin = s.roles.find(r => r.displayName === "Vice President of Finance")!
    const x = setHolder(s.roles, s.people, fin.id, { asuId: "9999000042", phone: "480-555-0142", email: "maya.chen@example.org" })
    const d = { ...clubDraft(base), departments: s.departments, roles: x.roles, people: x.people }
    expect(validateClub(d)).toBeNull()
    const event = { op: "create_event" as const, name: "Founder Dinner", type: "social" as const, headcount: 30, venue: "campus" as const, food: "offsite" as const, funding: "usg" as const, speaker: false }
    const next = completeSetup(base, d, event, "2026-11-19", crypto.randomUUID(), undefined, 5)
    expect(next.org.departments).toHaveLength(s.departments.length)
    expect(next.org.settings.clubBufferBusinessDays).toBe(5)
    expect(next.roles[0].fn).toBe("president")
    expect(next.roles.find(r => r.id === fin.id)).toMatchObject({ reportsToId: expect.any(String), duties: expect.stringMatching(/budget/i) })
    expect(next.people.find(p => p.id === fin.holderId)?.asuId).toBe("9999000042")
    expect(completeSetup(base, d, event, "2026-11-19", crypto.randomUUID(), undefined, 4)).toBe(base)
    expect(next.nodes.find(n => n.stepKey === "usg")?.fn).toBe("finance")
  })
  it("the president can edit departments and role details in Settings; others cannot", () => {
    const d = clubDraft(base)
    d.departments[2].duties = "Keeps the budget and the club's bank records."; d.roles[1].reportsToId = d.roles[0].id; d.roles[1].duties = "New duties."
    const next = saveClubSettings(base, d, base.org.settings)
    expect(next.org.departments![2].duties).toMatch(/bank records/); expect(next.roles.find(r => r.id === d.roles[1].id)!.duties).toBe("New duties.")
    expect(saveClubSettings({ ...base, viewerId: "maya" }, d, base.org.settings).org).toBe(base.org)
  })
  it("rejects reporting loops, unknown departments and a second president", () => {
    const roles = structuredClone(base.roles)
    roles[0].reportsToId = roles[1].id; roles[1].reportsToId = roles[0].id
    expect(validateRoles(roles, base.people)).toMatch(/loops/)
    const r2 = structuredClone(base.roles); r2[1].departmentId = "nope"
    expect(validateRoles(r2, base.people, departmentsOf(base))).toMatch(/existing department/)
    const r3 = structuredClone(base.roles); r3[1].fn = "president"
    expect(validateRoles(r3, base.people)).toBeTruthy()
    expect(hasReportingLoop(base.roles)).toBe(false)
  })
  it("roles can share a function; the head listed first gets the event steps", () => {
    const roles = structuredClone(base.roles)
    roles.push({ id: "r-fin2", displayName: "Finance Associate", fn: "finance", holderId: null, departmentId: "d-finance", reportsToId: "r-fin" })
    expect(validateRoles(roles, base.people, departmentsOf(base))).toBeNull()
    expect(orderRoles(roles.reverse())[0].id).toBe("r-pres")
    expect(rederiveFn(roles, { ...roles[0], displayName: "Treasurer" }, departmentsOf(base)).fn).toBe("finance")
    expect(fnForRole("Executive Vice President", { fn: "president" })).toBe("vice_president")
    expect(fnForRole("VP of Finance", { fn: "finance" })).toBe("finance")
    expect(fnForDepartment("Corporate Partnerships")).toBe("outreach")
  })
  it("the AI sees departments, who reports to whom and each role's duties, but never ASU IDs", () => {
    const ctx = aiSnapshot(base) as unknown as { roles: { department: string; reportsTo: string | null; duties: string }[]; departments: { name: string }[] }
    expect(ctx.roles.find(r => r.department === "Finance")).toMatchObject({ reportsTo: "President", duties: expect.stringMatching(/budget/i) })
    expect(ctx.departments.map(d => d.name)).toContain("Marketing")
    expect(JSON.stringify(ctx)).not.toMatch(/9999000|asuId/)
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
