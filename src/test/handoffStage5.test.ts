import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { handbookSources, sourceFingerprint } from "../lib/handbook"
import { handoffQuestions, MAX_QUESTIONS, questionCandidates, READBACK_PROMPTS, readBackFlags } from "../lib/handoffQuestions"
import { roleDossier } from "../lib/roleDossier"
import { normalizeTerms } from "../data/roleTerms"
import type { DemoState } from "../data/types"
import type { HandoffAction, Successor } from "../data/handoff"

/** Handoff stage 5 (docs/HANDOFF_EXECUTION_PLAN.md §7): gap questions, the new officer's reading and read-back, the shadow task and the check-ins. */
const act = (s: DemoState, action: HandoffAction) => reducer(s, { type: "handoffAction", action })
const as = (s: DemoState, viewerId: string) => ({ ...s, viewerId })
const rec = (s: DemoState, roleId = "r-fin") => s.handoffRoles.find(r => r.roleId === roleId)!
const holder = (s: DemoState, roleId = "r-fin") => s.roles.find(r => r.id === roleId)!.holderId

function season(): DemoState {
  const s = seedDemo()
  return act({ ...s, handoff: null, handoffRoles: [] }, { kind: "start", from: s.today, to: "2026-11-21" })
}
/** A drafted, confirmed and approved Treasurer handbook with Taylor named as the next officer. */
function named(): DemoState {
  let s = season()
  const src = handbookSources(s, "r-fin")
  s = act(s, { kind: "draft", roleId: "r-fin", raw: { entries: src.slice(0, 6).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(src), model: null, source: "t" })
  s = act(as(s, "maya"), { kind: "confirm", roleId: "r-fin" })
  s = act(as(s, "alex"), { kind: "approve", roleId: "r-fin" })
  return act(s, { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Taylor Example" } })
}
const taylor = (s: DemoState) => rec(s).incomingId!
const finish = (s: DemoState, successor?: Successor) => act(as(s, "alex"), { kind: "complete", roleId: "r-fin", successor })
const later = (s: DemoState, days: number) => ({ ...s, today: new Date(Date.parse(s.today) + days * 86_400_000).toISOString().slice(0, 10) })

describe("questions from the records", () => {
  it("every question is worked out from a record with a hole, then the few every handoff should answer", () => {
    const s0 = seedDemo(undefined, "v2")
    const s = {
      ...s0,
      nodes: s0.nodes.map(n => n.id === "t-usg" ? { ...n, why: "" } : n),
      extensionRequests: [{ id: "x1", nodeId: "t-recon", ownerId: "maya", requestedOn: s0.today, requestedDate: s0.today, previousDeadline: null, draftLink: "", reason: "", status: "approved" as const }],
      silenceCases: [{ id: "q1", nodeId: "t-sponsor", ownerId: "maya", startedOn: s0.today, closedOn: null }],
      contacts: s0.contacts.map(c => c.id === "c-caterer" ? { ...c, lastContact: null } : c),
    }
    const ids = questionCandidates(s, "r-fin").map(q => q.id)
    expect(ids).toEqual(expect.arrayContaining(["q:purpose:t-usg", "q:reason:x1", "q:quiet:q1", "q:contact:c-caterer", "q:generic:wrong", "q:generic:help"]))
    expect(ids.length).toBeLessThanOrEqual(MAX_QUESTIONS)
    expect(new Set(ids).size).toBe(ids.length)
    expect(questionCandidates(s, "r-fin")).toEqual(questionCandidates(s, "r-fin")) // the same every time
  })

  it("asks for the first month when there is no interview yet, and never invents anything for an unknown role", () => {
    const s = season()
    expect(questionCandidates(s, "r-fin").map(q => q.id)).toContain("q:generic:first")
    expect(questionCandidates(s, "nope")).toEqual([])
  })

  it("a leads-only contact is never asked about", () => {
    const s0 = seedDemo(undefined, "v2")
    const s = { ...s0, contacts: s0.contacts.map(c => c.id === "c-caterer" ? { ...c, visibility: "leads" as const, lastContact: null } : c) }
    expect(questionCandidates(s, "r-fin").map(q => q.id)).not.toContain("q:contact:c-caterer")
  })
})

describe("answering questions", () => {
  const first = (s: DemoState) => handoffQuestions(s, rec(s)).find(q => q.status === "open")!

  it("the outgoing officer's answer joins the interview and the old handbook draft is withdrawn", () => {
    const s0 = as(named(), "maya")
    const q = first(s0)
    const s = act(s0, { kind: "answerQuestion", roleId: "r-fin", id: q.id, answer: "Always reconcile within two days." })
    expect(rec(s).interview.at(-1)).toBe(`Q: ${q.text} A: Always reconcile within two days.`)
    expect(rec(s)).toMatchObject({ entries: [], fingerprint: "", confirmed: false, approved: false })
    expect(handoffQuestions(s, rec(s)).find(x => x.id === q.id)).toMatchObject({ status: "answered", answer: "Always reconcile within two days." })
    expect(handbookSources(s, "r-fin").some(x => x.kind === "interview" && x.text.includes("reconcile within two days"))).toBe(true)
  })

  it("skipping leaves it unresolved and keeps the handbook", () => {
    const s0 = as(named(), "maya")
    const s = act(s0, { kind: "answerQuestion", roleId: "r-fin", id: first(s0).id, skip: true })
    expect(handoffQuestions(s, rec(s)).some(q => q.status === "skipped")).toBe(true)
    expect(rec(s).entries.length).toBe(rec(s0).entries.length)
    expect(rec(s).interview).toEqual(rec(s0).interview)
  })

  it("is refused for: anyone but the outgoing officer, an empty answer, an unknown question, a second answer, a finished handoff", () => {
    const s0 = as(named(), "maya")
    const id = first(s0).id
    expect(act(as(s0, "jordan"), { kind: "answerQuestion", roleId: "r-fin", id, answer: "x" })).toEqual(as(s0, "jordan"))
    expect(act(as(s0, taylor(s0)), { kind: "answerQuestion", roleId: "r-fin", id, answer: "x" })).toEqual(as(s0, taylor(s0)))
    expect(act(s0, { kind: "answerQuestion", roleId: "r-fin", id, answer: "   " })).toEqual(s0)
    expect(act(s0, { kind: "answerQuestion", roleId: "r-fin", id: "q:made-up", answer: "x" })).toEqual(s0)
    const once = act(s0, { kind: "answerQuestion", roleId: "r-fin", id, answer: "x" })
    expect(act(once, { kind: "answerQuestion", roleId: "r-fin", id, answer: "y" })).toEqual(once)
    const done = finish(named())
    expect(act(as(done, "maya"), { kind: "answerQuestion", roleId: "r-fin", id, answer: "x" })).toEqual(as(done, "maya"))
  })

  it("for a role nobody holds, the president answers", () => {
    let s = act(as(seedDemo(), "alex"), { kind: "start", from: "2026-10-31", to: "2026-11-21" })
    s = normalizeTerms({ ...s, roles: s.roles.map(r => r.id === "r-fin" ? { ...r, holderId: null } : r), handoffRoles: s.handoffRoles.map(h => h.roleId === "r-fin" ? { ...h, outgoingId: null } : h) })
    const id = handoffQuestions(s, rec(s))[0].id
    expect(act(as(s, "jordan"), { kind: "answerQuestion", roleId: "r-fin", id, answer: "x" })).toEqual(as(s, "jordan"))
    expect(rec(act(as(s, "alex"), { kind: "answerQuestion", roleId: "r-fin", id, answer: "From the president." })).interview).toHaveLength(1)
  })
})

describe("the new officer reads and reads back", () => {
  it("only the next officer marks reading; 'Unclear' becomes a question the outgoing officer can answer", () => {
    const s0 = named()
    const t = taylor(s0)
    expect(act(as(s0, "maya"), { kind: "readSection", roleId: "r-fin", section: "Calendar", mark: "got" })).toEqual(as(s0, "maya"))
    let s = act(as(s0, t), { kind: "readSection", roleId: "r-fin", section: "Calendar", mark: "unclear" })
    expect(rec(s).reading).toEqual({ Calendar: "unclear" })
    const q = handoffQuestions(s, rec(s)).find(x => x.kind === "unclear")!
    expect(q.text).toContain("Calendar")
    s = act(as(s, "maya"), { kind: "answerQuestion", roleId: "r-fin", id: q.id, answer: "The USG dates move every term." })
    expect(handoffQuestions(s, rec(s)).find(x => x.id === q.id)!.status).toBe("answered")
    s = act(as(s, t), { kind: "readSection", roleId: "r-fin", section: "Calendar", mark: "unclear" })
    expect(handoffQuestions(s, rec(s)).filter(x => x.kind === "unclear")).toHaveLength(1) // not asked twice
  })

  it("read-back flags an answer the handbook does not seem to cover, without scoring anything", () => {
    const s0 = named()
    const t = taylor(s0)
    const covered = rec(s0).entries.map(e => e.text).join(" ").match(/[A-Za-z]{6,}/)![0]
    const s = act(as(s0, t), { kind: "readBack", roleId: "r-fin", answers: [`Start with ${covered}.`, "Quokkas zeppelin xylophone", `Be careful with ${covered}.`] })
    expect(rec(s).readBack!.answers).toHaveLength(READBACK_PROMPTS.length)
    expect(rec(s).readBack!.flags.map(f => f.flagged)).toEqual([false, true, false])
    expect(JSON.stringify(rec(s).readBack)).not.toMatch(/score|grade/i)
  })

  it("is refused for: anyone but the next officer, the wrong number of answers, answers that are too long, no handbook yet", () => {
    const s0 = named()
    const ok = ["a", "b", "c"]
    expect(act(as(s0, "maya"), { kind: "readBack", roleId: "r-fin", answers: ok })).toEqual(as(s0, "maya"))
    expect(act(as(s0, taylor(s0)), { kind: "readBack", roleId: "r-fin", answers: ["a", "b"] })).toEqual(as(s0, taylor(s0)))
    expect(act(as(s0, taylor(s0)), { kind: "readBack", roleId: "r-fin", answers: ["a", "b", "c".repeat(501)] })).toEqual(as(s0, taylor(s0)))
    const bare = act(as(season(), "alex"), { kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Taylor Example" } })
    expect(act(as(bare, taylor(bare)), { kind: "readBack", roleId: "r-fin", answers: ok })).toEqual(as(bare, taylor(bare)))
  })

  it("the outgoing officer can add a flagged answer to the handbook or leave it; an unflagged one is not theirs to resolve", () => {
    const s0 = named()
    let s = act(as(s0, taylor(s0)), { kind: "readBack", roleId: "r-fin", answers: ["Quokkas zeppelin xylophone", "Quokkas zeppelin xylophone", "Quokkas zeppelin xylophone"] })
    expect(rec(s).readBack!.flags.every(f => f.flagged)).toBe(true)
    s = act(as(s, "maya"), { kind: "resolveReadBack", roleId: "r-fin", index: 0, add: true })
    expect(rec(s).interview.at(-1)).toContain("Read-back: Q: " + READBACK_PROMPTS[0])
    expect(rec(s).approved).toBe(false) // the handbook has to be drafted again
    s = act(as(s, "maya"), { kind: "resolveReadBack", roleId: "r-fin", index: 1, add: false })
    expect(rec(s).readBack!.flags.map(f => f.resolved)).toEqual([true, true, false])
    expect(act(as(s, "maya"), { kind: "resolveReadBack", roleId: "r-fin", index: 1, add: false })).toEqual(as(s, "maya")) // already looked at
    expect(act(as(s, "jordan"), { kind: "resolveReadBack", roleId: "r-fin", index: 2, add: false })).toEqual(as(s, "jordan"))
  })

  it("the word check ignores short and common words", () => {
    const sources = [{ id: "task:a", kind: "task" as const, text: "Reconcile the receipts every month." }]
    expect(readBackFlags(["The thing", "reconcile receipts", "Zeppelins"], sources, ["task:a"])).toEqual([false, false, true])
    expect(readBackFlags([""], sources, ["task:a"])).toEqual([false])
  })
})

describe("the shadow task", () => {
  it("the president picks a light task the outgoing officer still does; the next officer is told and the task stays put", () => {
    const s0 = named()
    expect(act(as(s0, "maya"), { kind: "startShadow", roleId: "r-fin" })).toEqual(as(s0, "maya"))
    const s = act(as(s0, "alex"), { kind: "startShadow", roleId: "r-fin" })
    const task = s.nodes.find(n => n.id === rec(s).shadowNodeId)!
    expect(task).toMatchObject({ ownerId: "maya" })
    expect(task.status).not.toBe("done")
    const lightExists = s0.nodes.some(n => n.ownerId === "maya" && n.status !== "done" && n.status !== "blocked" && n.tier === "light")
    if (lightExists) expect(task.tier).toBe("light") // a light task is preferred when there is one
    expect(s.notifications.some(n => n.recipientId === taylor(s) && n.text.includes("shadowing"))).toBe(true)
    expect(act(as(s, "alex"), { kind: "startShadow", roleId: "r-fin" })).toEqual(as(s, "alex")) // one at a time
  })

  it("needs a named next officer, and is closed once the role is handed over", () => {
    const bare = as(season(), "alex")
    expect(act(bare, { kind: "startShadow", roleId: "r-fin" })).toEqual(bare)
    const done = finish(named())
    expect(act(done, { kind: "startShadow", roleId: "r-fin" })).toEqual(done)
  })
})

describe("day 7 and day 30 check-ins", () => {
  const handedOver = () => finish(named())
  const scores = { clarity: 4, confidence: 3, welcome: 5, missing: "Who approves the USG forms." }

  it("opens on the day; only the new officer can give scores, in 1–5, once", () => {
    const done = handedOver()
    const t = holder(done)!
    const day7 = (viewer: string, over: object = {}, s = later(done, 30)) => act(as(s, viewer), { kind: "review", roleId: "r-fin", day: 7, ...scores, ...over })
    expect(rec(day7(t, {}, done)).reviews ?? []).toEqual([]) // too early
    const s = day7(t)
    expect(rec(s).reviews).toEqual([expect.objectContaining({ day: 7, clarity: 4, confidence: 3, welcome: 5, accepted: false })])
    expect(day7("alex")).toEqual(as(later(done, 30), "alex")) // the president reads, does not write
    expect(rec(day7(t, { clarity: 6 })).reviews ?? []).toEqual([])
    expect(rec(day7(t, { welcome: 0 })).reviews ?? []).toEqual([])
    expect(rec(day7(t, { missing: "x".repeat(501) })).reviews ?? []).toEqual([])
    expect(act(as(s, t), { kind: "review", roleId: "r-fin", day: 7, ...scores })).toEqual(as(s, t)) // not twice
    expect(rec(s).reviewed).toBe(false)
  })

  it("day 30 also completes the old 'reviewed' step; the president can still record it without scores", () => {
    const done = later(handedOver(), 40)
    const t = holder(done)!
    expect(rec(act(as(done, t), { kind: "review", roleId: "r-fin", day: 30, ...scores })).reviewed).toBe(true)
    expect(rec(act(as(done, "alex"), { kind: "review", roleId: "r-fin" })).reviewed).toBe(true)
    expect(rec(act(as(done, "jordan"), { kind: "review", roleId: "r-fin" })).reviewed).toBe(false)
    const early = handedOver()
    expect(rec(act(as(early, "alex"), { kind: "review", roleId: "r-fin" })).reviewed).toBe(false)
  })

  it("what was missing reaches the dossier only when the president adds it, and stays for the next round", () => {
    const done = later(handedOver(), 40)
    const t = holder(done)!
    let s = act(as(done, t), { kind: "review", roleId: "r-fin", day: 30, ...scores })
    expect(roleDossier(s, "r-fin").blocks.lessons.some(r => r.id.startsWith("lesson:review:"))).toBe(false)
    expect(act(as(s, t), { kind: "acceptReview", roleId: "r-fin", day: 30 })).toEqual(as(s, t)) // not the new officer's call
    s = act(as(s, "alex"), { kind: "acceptReview", roleId: "r-fin", day: 30 })
    const row = roleDossier(s, "r-fin").blocks.lessons.find(r => r.id === "lesson:review:r-fin:30")!
    expect(row.text).toContain("Who approves the USG forms.")
    expect(handbookSources(s, "r-fin").map(x => x.id)).toContain("lesson:review:r-fin:30")
    s = act(as(s, "alex"), { kind: "startRole", roleId: "r-fin" }) // a new round
    expect(rec(s).completed).toBe(false)
    expect(roleDossier(s, "r-fin").blocks.lessons.some(r => r.id === "lesson:review:r-fin:30")).toBe(true)
  })
})
