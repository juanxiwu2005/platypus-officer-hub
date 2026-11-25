import { describe, expect, it } from "vitest"
import type { DemoState, RoleHandoff } from "../data/types"
import { seedDemo } from "../data/seed"
import { answerSet, changePlaybook, playbookOf, questionsFor, type PlaybookAction } from "../data/playbook"
import { starterPlaybook, starterQuestionId, starterQuestionText } from "../data/playbookStarter"
import { SAMPLE_INTERVIEWS } from "../data/sampleScenario"

const base = () => seedDemo(undefined, "v2")
const act = (s: DemoState, action: PlaybookAction) => changePlaybook(s, action)
/** The import as the page sends it: the starter computed from the state, then the reducer. */
const imp = (s: DemoState) => act(s, { kind: "importStarter", ...starterPlaybook(s, playbookOf(s)) })
const record = (roleId: string, outgoingId: string | null, interview: string[]): RoleHandoff => ({ roleId, outgoingId, interview, entries: [], sources: [], fingerprint: "", source: "", model: null, confirmed: false, approved: false, checks: [], completed: true, reviewed: false, incomingId: null })

describe("Playbook starter questions (contract item 5)", () => {
  it("makes one timeline question per role with interview lines, answered by that role's outgoing officer", () => {
    const s = base(), next = imp(s)
    const added = playbookOf(next).questions.filter(q => q.origin === "handoff")
    // The sample season has interview lines for the Treasurer, Events lead and Secretary only; empty roles get no question.
    expect(added.map(q => q.id)).toEqual(["pq-start-r-fin", "pq-start-r-events", "pq-start-r-sec"])
    expect(added[0]).toMatchObject({ text: "What did the last Treasurer want the next one to know?", category: "timeline", roleIds: ["r-fin"], createdOn: s.today, createdBy: null, policyIds: [] })
    const fin = playbookOf(next).answers.filter(a => a.questionId === "pq-start-r-fin")
    expect(fin.map(a => a.text)).toEqual(SAMPLE_INTERVIEWS.finance)
    expect(fin.every(a => a.kind === "experience" && a.authorId === "maya" && a.on === s.today && a.status === "active")).toBe(true)
    expect(questionsFor(next, { roleId: "r-fin", category: "timeline" }).map(q => q.id)).toContain("pq-start-r-fin")
    expect(answerSet(next, "pq-start-r-fin").experience).toBeDefined()
  })

  it("is idempotent: a second import changes nothing", () => {
    const once = imp(base())
    expect(imp(once)).toBe(once)
    expect(starterPlaybook(once, playbookOf(once))).toEqual({ questions: [], answers: [] })
  })

  it("adds only new lines later, includes finished rounds from handoffHistory, and skips empty lines", () => {
    const once = imp(base())
    const later: DemoState = {
      ...once,
      handoffHistory: [{ ...record("r-mkt", "sam", ["  Keep the brand kit in the shared drive.  ", "", "   "]), season: "season:2026-04-01" }],
      handoffRoles: once.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, interview: [...h.interview, "Ask the advisor to sign off early."] } : h),
    }
    const next = imp(later)
    const p = playbookOf(next)
    expect(p.answers.filter(a => a.questionId === "pq-start-r-fin").map(a => a.text).at(-1)).toBe("Ask the advisor to sign off early.")
    expect(p.answers.filter(a => a.questionId === "pq-start-r-fin")).toHaveLength(SAMPLE_INTERVIEWS.finance!.length + 1)
    expect(p.answers.filter(a => a.questionId === "pq-start-r-mkt").map(a => [a.text, a.authorId])).toEqual([["Keep the brand kit in the shared drive.", "sam"]])
    expect(imp(next)).toBe(next)
  })

  it("leaves out lines naming a leads-only contact (name, email or phone) and read-back lines", () => {
    const s = base()
    const sponsor = s.contacts.find(c => c.visibility === "leads")!
    const withPhone: DemoState = { ...s, contacts: s.contacts.map(c => c.id === sponsor.id ? { ...c, email: "morgan@sponsor.example.org", phone: "480-555-0199" } : c) }
    const lines = [
      `Call ${sponsor.name.replace(/\s*\(.*\)/, "")} about the spring sponsorship.`,
      "Email MORGAN@sponsor.example.org for the logo.",
      "Text (480) 555-0199 before noon.",
      "Read-back: Q: What is due first? A: The budget.",
      "Book the room early.",
    ]
    const next = imp({ ...withPhone, handoffRoles: withPhone.handoffRoles.map(h => h.roleId === "r-mkt" ? { ...h, interview: lines } : h) })
    expect(playbookOf(next).answers.filter(a => a.questionId === "pq-start-r-mkt").map(a => a.text)).toEqual(["Book the room early."])
    expect(JSON.stringify(playbookOf(next))).not.toMatch(/Morgan|morgan@|555-0199/)
  })

  it("caps long lines at 400 characters and long role names in the question", () => {
    const s = base()
    const long = { ...s, roles: s.roles.map(r => r.id === "r-fin" ? { ...r, displayName: "Treasurer ".repeat(20) } : r), handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, interview: ["w".repeat(1500)] } : h) }
    const next = imp(long)
    const q = playbookOf(next).questions.find(x => x.id === "pq-start-r-fin")!
    expect(q.text.length).toBeLessThanOrEqual(100)
    expect(q.text).toMatch(/^What did the last Treasurer .*… want the next one to know\?$/)
    const a = playbookOf(next).answers.find(x => x.questionId === "pq-start-r-fin")!
    expect(a.text).toHaveLength(400)
    expect(a.text.endsWith("…")).toBe(true)
    expect(starterQuestionText("")).toBe("What did the last officer want the next one to know?")
  })

  it("does not bring back a line the president hid, skips a hidden starter question, and follows a merged one", () => {
    const once = imp(base())
    const firstFin = playbookOf(once).answers.find(a => a.questionId === "pq-start-r-fin")!
    const hidden = act(once, { kind: "hideAnswer", answerId: firstFin.id, hidden: true })
    expect(imp(hidden)).toBe(hidden)

    const more = (s: DemoState): DemoState => ({ ...s, handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, interview: [...h.interview, "A new line."] } : h) })
    const hiddenQ = act(once, { kind: "hideQuestion", questionId: "pq-start-r-fin", hidden: true })
    expect(imp(more(hiddenQ)).playbook).toBe(more(hiddenQ).playbook)

    const merged = act(once, { kind: "mergeQuestion", fromId: "pq-start-r-fin", intoId: "pq-9" })
    const next = imp(more(merged))
    const added = playbookOf(next).answers.filter(a => a.text === "A new line.")
    expect(added.map(a => a.questionId)).toEqual(["pq-9"])
    expect(playbookOf(next).questions.filter(q => q.id === starterQuestionId("r-fin"))).toHaveLength(1)
  })

  it("only the president or VP may import, and a roleless or empty season adds nothing", () => {
    const maya = { ...base(), viewerId: "maya" }
    expect(imp(maya)).toBe(maya)
    const empty = { ...base(), handoffRoles: [], handoffHistory: [] }
    expect(imp(empty)).toBe(empty)
  })

  it("re-importing never brings back a line that was edited: answers are matched by a stable id (role, round, line), not by text", () => {
    const once = imp(base())
    const fin = playbookOf(once).answers.filter(a => a.questionId === "pq-start-r-fin")
    expect(fin.map(a => a.id)).toEqual([0, 1, 2].map(i => `pa-start-r-fin-${once.handoff!.id.replace(/^season:/, "")}.0-${i}`))
    const edited = act(once, { kind: "editAnswer", answerId: fin[1].id, text: "Reimbursements took two weeks this year." })
    expect(starterPlaybook(edited, playbookOf(edited))).toEqual({ questions: [], answers: [] })
    expect(imp(edited)).toBe(edited)
    // The same id when the round finishes and moves to handoffHistory: still nothing to import.
    const finished: DemoState = { ...edited, handoffRoles: edited.handoffRoles.filter(h => h.roleId !== "r-fin"), handoffHistory: [...(edited.handoffHistory ?? []), ...edited.handoffRoles.filter(h => h.roleId === "r-fin").map(h => ({ ...h, completed: true, season: edited.handoff!.id }))] }
    expect(starterPlaybook(finished, playbookOf(finished)).answers).toEqual([])
    // Two rounds of the same role with the same line are two answers (each round's officer said it).
    const twice: DemoState = { ...base(), handoffHistory: [{ ...record("r-mkt", "sam", ["Same line."]), season: "season:2026-04-01" }, { ...record("r-mkt", "sam", ["Same line."]), season: "season:2025-04-01" }] }
    expect(starterPlaybook(twice, playbookOf(twice)).answers.filter(a => a.questionId === "pq-start-r-mkt").map(a => a.id)).toEqual(["pa-start-r-mkt-2026-04-01.0-0", "pa-start-r-mkt-2025-04-01.0-0"])
  })

  it("leaves out lines with a leads-only contact's first or last name (whole word, any case), email or phone digits", () => {
    const s = base()
    const sponsor = s.contacts.find(c => c.visibility === "leads")! // "Morgan Hale (fictional)"
    const withDetails: DemoState = { ...s, contacts: s.contacts.map(c => c.id === sponsor.id ? { ...c, email: "mh@sponsor.example.org", phone: "480 555 0199" } : c) }
    const lines = [
      "Ask Morgan about the banner.",
      "hale knows the venue manager.",
      "MORGAN'S team pays for pizza.",
      "Write to MH@Sponsor.example.org first.",
      "Call 480.555.0199 before noon.",
      "Halel and Morganite are not names.",
      "Book the room early.",
    ]
    const next = imp({ ...withDetails, handoffRoles: withDetails.handoffRoles.map(h => h.roleId === "r-mkt" ? { ...h, interview: lines } : h) })
    expect(playbookOf(next).answers.filter(a => a.questionId === "pq-start-r-mkt").map(a => a.text)).toEqual(["Halel and Morganite are not names.", "Book the room early."])
  })

  it("lines of an archived role (no longer in roles) are not imported", () => {
    const s = base()
    const next = imp({ ...s, handoffHistory: [{ ...record("r-closed", "maya", ["Old role note."]), season: null }] })
    expect(playbookOf(next).questions.some(q => q.id === "pq-start-r-closed")).toBe(false)
  })
})
