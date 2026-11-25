import { describe, expect, it } from "vitest"
import type { DemoState, Playbook, PlaybookAnswer } from "../data/types"
import { SCHEMA_VERSION, seedDemo } from "../data/seed"
import { appendLog, reducer } from "../data/store"
import {
  answerSet, canEditAnswer, canEditQuestion, changePlaybook, compareAnswers, hiddenAnswers, isQuestionHidden, isRead, liveQuestion, MAX_ANSWER_TEXT, MAX_ANSWERS,
  MAX_QUESTION_TEXT, MAX_QUESTIONS, newPlaybookId, playbookOf, playbookRights, questionsFor, type PlaybookAction,
} from "../data/playbook"

const base = () => seedDemo(undefined, "v2")
const as = (s: DemoState, viewerId: string): DemoState => ({ ...s, viewerId })
/** The model reducer itself (the store adds role-term upkeep to hand-made states); one test below goes through the store. */
const act = (s: DemoState, action: PlaybookAction) => changePlaybook(s, action)
const pb = (s: DemoState) => playbookOf(s)
const ans = (s: DemoState, id: string) => pb(s).answers.find(a => a.id === id)!
const q = (s: DemoState, id: string) => pb(s).questions.find(x => x.id === id)!
/** Jordan (Events lead) as vice president. */
const withVp = (s = base()): DemoState => ({ ...s, roles: s.roles.map(r => r.id === "r-events" ? { ...r, fn: "vice_president" } : r) })
const former = (s: DemoState, id = "maya") => as({ ...s, people: s.people.map(p => p.id === id ? { ...p, leftOn: "2026-10-01" } : p) }, id)
/** Riley, named as the next Treasurer but not an officer yet. */
const incoming = (s = base()): DemoState => as({ ...s, people: [...s.people, { ...s.people.find(p => p.id === "maya")!, id: "riley", name: "Riley Example", email: "riley.example@example.org", incomingFor: "r-fin" }] }, "riley")
const addQ = (id = "pq-50", text = "Where do we store the banner?"): PlaybookAction => ({ kind: "addQuestion", id, text, category: "tools", roleIds: "all" })
const addA = (id: string, questionId: string, answerKind: "club" | "experience" = "experience", text = "In the storage room, shelf two."): PlaybookAction => ({ kind: "addAnswer", id, questionId, answerKind, text })
const withPlaybook = (s: DemoState, patch: Partial<Playbook>): DemoState => ({ ...s, playbook: { ...pb(s), ...patch } })

describe("Playbook model: basics", () => {
  it("keeps SCHEMA_VERSION 23 and reads an old save without a Playbook as empty", () => {
    expect(SCHEMA_VERSION).toBe(23)
    const old = { ...base(), playbook: undefined }
    expect(pb(old)).toEqual({ questions: [], answers: [] })
    expect(questionsFor(old)).toEqual([])
    expect(answerSet(old, "pq-1")).toEqual({ rule: undefined, club: undefined, experience: undefined, alternates: [] })
  })

  it("returns the stored Playbook itself when nothing needs fixing, and the same view on every call", () => {
    const s = base()
    expect(pb(s)).toBe(s.playbook)
    expect(pb(s)).toBe(pb({ ...s, viewerId: "maya" }))
  })

  it("lets an officer add a question to an old save that had no Playbook", () => {
    const s = as({ ...base(), playbook: undefined }, "maya")
    const next = act(s, addQ())
    expect(pb(next).questions.map(x => x.id)).toEqual(["pq-50"])
    expect(q(next, "pq-50")).toMatchObject({ createdBy: "maya", createdOn: s.today, origin: "club", roleIds: "all", category: "tools" })
  })

  it("the store's playbookAction runs the model reducer, also for a viewer who is not an officer", () => {
    const s = base()
    const next = reducer(s, { type: "playbookAction", action: addQ() })
    expect(pb(next).questions.map(x => x.id)).toContain("pq-50")
    const maya = as(s, "maya")
    const read = reducer(maya, { type: "playbookAction", action: { kind: "markRead", questionId: "pq-1" } })
    expect(isRead(read, "maya", "pq-1")).toBe(true)
    const riley = incoming(s)
    const refused = reducer(riley, { type: "playbookAction", action: addQ() })
    expect(pb(refused).questions.map(x => x.id)).not.toContain("pq-50")
  })

  it("newPlaybookId skips taken ids", () => {
    const s = base()
    expect(newPlaybookId(s, "pq-")).toBe("pq-13")
    expect(newPlaybookId(s, "pa-")).toBe("pa-22")
  })
})

describe("Playbook model: permissions (contract item 2)", () => {
  it("any current officer may add a question, add an experience answer, vote and mark read", () => {
    let s = as(base(), "sam")
    s = act(s, addQ())
    s = act(s, addA("pa-50", "pq-50"))
    s = act(s, { kind: "vote", answerId: "pa-1", vote: 1 })
    s = act(s, { kind: "markRead", questionId: "pq-1" })
    expect(q(s, "pq-50").createdBy).toBe("sam")
    expect(ans(s, "pa-50")).toMatchObject({ kind: "experience", authorId: "sam", on: s.today, status: "active", votes: { up: [], down: [] } })
    expect(ans(s, "pa-1").votes.up).toEqual(["sam"])
    expect(isRead(s, "sam", "pq-1")).toBe(true)
    expect(playbookRights(s)).toEqual({ markRead: true, vote: true, write: true, lead: false })
  })

  it("only the president or VP may add or edit a club answer", () => {
    const s = base()
    const officer = as(s, "maya")
    expect(act(officer, addA("pa-50", "pq-1", "club"))).toBe(officer)
    expect(act(officer, { kind: "editAnswer", answerId: "pa-2", text: "Changed." })).toBe(officer)
    const pres = act(s, addA("pa-50", "pq-1", "club"))
    expect(ans(pres, "pa-50").kind).toBe("club")
    const vp = as(withVp(), "jordan")
    expect(playbookRights(vp).lead).toBe(true)
    const edited = act(vp, { kind: "editAnswer", answerId: "pa-2", text: "We submit 6 weeks ahead." })
    expect(ans(edited, "pa-2")).toMatchObject({ text: "We submit 6 weeks ahead.", on: vp.today })
    // The author of a club answer who is no longer president or VP cannot edit it.
    const demoted = as({ ...pres, roles: pres.roles.map(r => r.id === "r-pres" ? { ...r, holderId: "priya" } : r) }, "alex")
    expect(act(demoted, { kind: "editAnswer", answerId: "pa-50", text: "Changed." })).toBe(demoted)
  })

  it("the author or the president/VP may edit an experience answer; other officers may not", () => {
    const s = base()
    const author = act(as(s, "maya"), { kind: "editAnswer", answerId: "pa-3", text: "Send all quotes together." })
    expect(ans(author, "pa-3").text).toBe("Send all quotes together.")
    const other = as(s, "sam")
    expect(act(other, { kind: "editAnswer", answerId: "pa-3", text: "Mine now." })).toBe(other)
    expect(canEditAnswer(other, ans(s, "pa-3"))).toBe(false)
    const pres = act(s, { kind: "editAnswer", answerId: "pa-3", text: "Edited by the president." })
    expect(ans(pres, "pa-3").text).toBe("Edited by the president.")
    // Unchanged text is not an edit.
    const maya = as(s, "maya")
    expect(act(maya, { kind: "editAnswer", answerId: "pa-3", text: ` ${ans(s, "pa-3").text} ` })).toBe(maya)
  })

  it("rule answers are read-only for everyone, the president included", () => {
    const s = base()
    expect(act(s, { kind: "editAnswer", answerId: "pa-1", text: "Changed." })).toBe(s)
    expect(act(s, { kind: "hideAnswer", answerId: "pa-1", hidden: true })).toBe(s)
    expect(canEditAnswer(s, ans(s, "pa-1"))).toBe(false)
    expect(act(s, { kind: "addAnswer", id: "pa-50", questionId: "pq-1", answerKind: "rule" as "club", text: "A made-up rule." })).toBe(s)
  })

  it("only the president or VP may hide or unhide answers and questions, and merge questions", () => {
    const s = base(), officer = as(s, "maya")
    for (const a of [
      { kind: "hideAnswer", answerId: "pa-3", hidden: true },
      { kind: "hideQuestion", questionId: "pq-9", hidden: true },
      { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" },
      { kind: "importStarter" },
    ] as PlaybookAction[]) expect(act(officer, a)).toBe(officer)
    const hidden = act(s, { kind: "hideAnswer", answerId: "pa-3", hidden: true })
    expect(ans(hidden, "pa-3").status).toBe("hidden")
    expect(act(hidden, { kind: "hideAnswer", answerId: "pa-3", hidden: true })).toBe(hidden)
    const shown = act(as(withVp(hidden), "jordan"), { kind: "hideAnswer", answerId: "pa-3", hidden: false })
    expect(ans(shown, "pa-3").status).toBe("active")
  })

  it("an incoming officer may read, mark read and vote, nothing else", () => {
    const s = incoming()
    expect(playbookRights(s)).toEqual({ markRead: true, vote: true, write: false, lead: false })
    const read = act(s, { kind: "markRead", questionId: "pq-1" })
    expect(isRead(read, "riley", "pq-1")).toBe(true)
    const voted = act(s, { kind: "vote", answerId: "pa-3", vote: -1 })
    expect(ans(voted, "pa-3").votes.down).toEqual(["riley"])
    for (const a of [addQ(), addA("pa-50", "pq-1"), { kind: "editAnswer", answerId: "pa-3", text: "x" }, { kind: "hideAnswer", answerId: "pa-3", hidden: true },
      { kind: "editQuestion", questionId: "pq-1", text: "x?", category: "funding", roleIds: "all" }, { kind: "hideQuestion", questionId: "pq-1", hidden: true },
      { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" }, { kind: "importStarter" }] as PlaybookAction[]) expect(act(s, a)).toBe(s)
  })

  it("a former officer may only read", () => {
    const s = former(base())
    expect(playbookRights(s)).toEqual({ markRead: false, vote: false, write: false, lead: false })
    for (const a of [{ kind: "markRead", questionId: "pq-1" }, { kind: "vote", answerId: "pa-1", vote: 1 }, addQ(), addA("pa-50", "pq-1"),
      { kind: "editAnswer", answerId: "pa-3", text: "x" }] as PlaybookAction[]) expect(act(s, a)).toBe(s)
    // A former president keeps no lead rights.
    const formerPres = former(base(), "alex")
    expect(playbookRights(formerPres).lead).toBe(false)
    expect(act(formerPres, { kind: "hideAnswer", answerId: "pa-3", hidden: true })).toBe(formerPres)
  })

  it("an unknown viewer can do nothing", () => {
    const s = as(base(), "nobody")
    expect(act(s, { kind: "markRead", questionId: "pq-1" })).toBe(s)
    expect(act(s, addQ())).toBe(s)
  })
})

describe("Playbook model: actions", () => {
  it("addQuestion trims and caps text, checks the category and roles, and refuses a taken or bad id", () => {
    const s = as(base(), "maya")
    const long = act(s, { kind: "addQuestion", id: "pq-50", text: `  ${"x".repeat(200)}  `, category: "funding", roleIds: ["r-fin", "r-fin", "r-gone"], policyIds: ["ASU-R-038", "ASU-R-038"] })
    expect(q(long, "pq-50")).toMatchObject({ text: "x".repeat(MAX_QUESTION_TEXT), roleIds: ["r-fin"], policyIds: ["ASU-R-038"] })
    expect(act(s, { ...addQ(), category: "nope" } as PlaybookAction)).toBe(s)
    expect(act(s, { ...addQ(), roleIds: ["r-gone"] } as PlaybookAction)).toBe(s)
    expect(act(s, { ...addQ(), roleIds: [] } as PlaybookAction)).toBe(s)
    expect(act(s, addQ("pq-1"))).toBe(s)
    expect(act(s, addQ("bad id with spaces"))).toBe(s)
    expect(act(s, { ...addQ(), text: "   " } as PlaybookAction)).toBe(s)
    // A club category may be used once the club has it.
    const club = withPlaybook(s, { categories: [{ id: "cat:merch", label: "Merch" }] })
    expect(q(act(club, { ...addQ(), category: "cat:merch" } as PlaybookAction), "pq-50").category).toBe("cat:merch")
  })

  it("addAnswer caps text at 400, follows a merged question and refuses a missing or hidden one", () => {
    const s = base()
    const long = act(s, addA("pa-50", "pq-9", "experience", "y".repeat(500)))
    expect(ans(long, "pa-50").text).toHaveLength(MAX_ANSWER_TEXT)
    const merged = act(s, { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" })
    expect(ans(act(merged, addA("pa-50", "pq-5")), "pa-50").questionId).toBe("pq-4")
    expect(act(s, addA("pa-50", "pq-404"))).toBe(s)
    expect(act(s, addA("pa-1", "pq-1"))).toBe(s)
    const hidden = act(s, { kind: "hideQuestion", questionId: "pq-9", hidden: true })
    const maya = as(hidden, "maya")
    expect(act(maya, addA("pa-50", "pq-9"))).toBe(maya)
  })

  it("editQuestion: the creator or the president/VP; seed questions only by the president/VP", () => {
    let s = as(base(), "maya")
    s = act(s, addQ())
    const edit: PlaybookAction = { kind: "editQuestion", questionId: "pq-50", text: "Where is the club banner kept?", category: "people", roleIds: ["r-fin"] }
    const mine = act(s, edit)
    expect(q(mine, "pq-50")).toMatchObject({ text: "Where is the club banner kept?", category: "people", roleIds: ["r-fin"], createdBy: "maya" })
    expect(act(mine, edit)).toBe(mine)
    const sam = as(s, "sam")
    expect(act(sam, edit)).toBe(sam)
    expect(canEditQuestion(sam, q(s, "pq-50"))).toBe(false)
    const maya = as(base(), "maya")
    expect(act(maya, { kind: "editQuestion", questionId: "pq-9", text: "When is the Treasurer busy?", category: "timeline", roleIds: ["r-fin"] })).toBe(maya)
    const pres = act(base(), { kind: "editQuestion", questionId: "pq-9", text: "When is the Treasurer busy?", category: "timeline", roleIds: ["r-fin"] })
    expect(q(pres, "pq-9").text).toBe("When is the Treasurer busy?")
    const b = base()
    expect(act(b, { kind: "editQuestion", questionId: "pq-9", text: "x?", category: "bad", roleIds: "all" })).toBe(b)
  })

  it("editQuestion keeps the fields it leaves out, and still validates the ones it sends", () => {
    const s = base()
    const textOnly = act(s, { kind: "editQuestion", questionId: "pq-9", text: "When is the Treasurer busy?" })
    expect(q(textOnly, "pq-9")).toMatchObject({ text: "When is the Treasurer busy?", category: "timeline", roleIds: ["r-fin"] })
    const catOnly = act(s, { kind: "editQuestion", questionId: "pq-9", category: "funding" })
    expect(q(catOnly, "pq-9")).toMatchObject({ text: q(s, "pq-9").text, category: "funding" })
    const rolesOnly = act(s, { kind: "editQuestion", questionId: "pq-9", roleIds: "all" })
    expect(q(rolesOnly, "pq-9").roleIds).toBe("all")
    expect(act(s, { kind: "editQuestion", questionId: "pq-9" })).toBe(s)
    expect(act(s, { kind: "editQuestion", questionId: "pq-9", text: "  " })).toBe(s)
    expect(act(s, { kind: "editQuestion", questionId: "pq-9", roleIds: ["r-gone"] })).toBe(s)
    expect(act(s, { kind: "editQuestion", questionId: "pq-404", text: "x?" })).toBe(s)
  })

  it("an unknown or malformed action changes nothing (never wipes the state)", () => {
    const s = base()
    expect(act(s, { kind: "explode" } as unknown as PlaybookAction)).toBe(s)
    expect(act(s, null as unknown as PlaybookAction)).toBe(s)
    expect(act(s, { kind: "vote" } as unknown as PlaybookAction)).toBe(s)
    expect(act(s, { kind: "addQuestion", id: "pq-50", text: 5, category: "tools", roleIds: "all" } as unknown as PlaybookAction)).toBe(s)
    expect(reducer(s, { type: "playbookAction", action: { kind: "explode" } as unknown as PlaybookAction }).playbook).toBe(s.playbook)
  })

  it("hiddenAnswers lists hidden answers for the president or VP only, so they can be unhidden", () => {
    const hidden = act(base(), { kind: "hideAnswer", answerId: "pa-3", hidden: true })
    expect(answerSet(hidden, "pq-1").alternates.map(a => a.id)).not.toContain("pa-3")
    expect(hiddenAnswers(hidden, "pq-1").map(a => a.id)).toEqual(["pa-3"])
    expect(hiddenAnswers(as(withVp(hidden), "jordan"), "pq-1").map(a => a.id)).toEqual(["pa-3"])
    expect(hiddenAnswers(as(hidden, "maya"), "pq-1")).toEqual([])
    expect(hiddenAnswers(incoming(hidden), "pq-1")).toEqual([])
    expect(hiddenAnswers(base(), "pq-1")).toEqual([])
  })

  it("hideQuestion removes a question from the lists until it is unhidden; the president or VP can still list it", () => {
    const s = base()
    const hidden = act(s, { kind: "hideQuestion", questionId: "pq-9", hidden: true })
    expect(isQuestionHidden(q(hidden, "pq-9"))).toBe(true)
    expect(questionsFor(hidden).map(x => x.id)).not.toContain("pq-9")
    expect(questionsFor(hidden, { includeHidden: true }).map(x => x.id)).toContain("pq-9")
    expect(act(hidden, { kind: "hideQuestion", questionId: "pq-9", hidden: true })).toBe(hidden)
    const back = act(hidden, { kind: "hideQuestion", questionId: "pq-9", hidden: false })
    expect(isQuestionHidden(q(back, "pq-9"))).toBe(false)
    expect("hidden" in q(back, "pq-9")).toBe(false)
    expect(questionsFor(back).map(x => x.id)).toEqual(questionsFor(s).map(x => x.id))
    // An officer cannot mark a hidden question read; the president still can.
    const maya = as(hidden, "maya")
    expect(act(maya, { kind: "markRead", questionId: "pq-9" })).toBe(maya)
    expect(isRead(act(hidden, { kind: "markRead", questionId: "pq-9" }), "alex", "pq-9")).toBe(true)
  })

  it("vote toggles like, dislike and none, and an unchanged vote changes nothing", () => {
    let s = as(base(), "sam")
    s = act(s, { kind: "vote", answerId: "pa-3", vote: 1 })
    expect(ans(s, "pa-3").votes).toEqual({ up: ["alex", "sam"], down: [] })
    expect(act(s, { kind: "vote", answerId: "pa-3", vote: 1 })).toBe(s)
    s = act(s, { kind: "vote", answerId: "pa-3", vote: -1 })
    expect(ans(s, "pa-3").votes).toEqual({ up: ["alex"], down: ["sam"] })
    s = act(s, { kind: "vote", answerId: "pa-3", vote: 0 })
    expect(ans(s, "pa-3").votes).toEqual({ up: ["alex"], down: [] })
    expect(act(s, { kind: "vote", answerId: "pa-3", vote: 2 as 1 })).toBe(s)
    expect(act(s, { kind: "vote", answerId: "pa-404", vote: 1 })).toBe(s)
    const hidden = as(act(base(), { kind: "hideAnswer", answerId: "pa-3", hidden: true }), "sam")
    expect(act(hidden, { kind: "vote", answerId: "pa-3", vote: 1 })).toBe(hidden)
  })

  it("markRead is per person and idempotent, and marks the live question of a merged one", () => {
    const s = as(base(), "maya")
    const read = act(s, { kind: "markRead", questionId: "pq-1" })
    expect(act(read, { kind: "markRead", questionId: "pq-1" })).toBe(read)
    expect(isRead(read, "maya", "pq-1")).toBe(true)
    expect(isRead(read, "sam", "pq-1")).toBe(false)
    expect(act(s, { kind: "markRead", questionId: "pq-404" })).toBe(s)
    const merged = as(act(base(), { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" }), "maya")
    const viaOld = act(merged, { kind: "markRead", questionId: "pq-5" })
    expect(pb(viaOld).reads).toEqual({ maya: ["pq-4"] })
    expect(isRead(viaOld, "maya", "pq-5")).toBe(true)
  })

  it("every write copies the demo day and never computes a date", () => {
    const s = { ...as(base(), "maya"), today: "2027-01-15" }
    const next = act(act(s, addQ()), addA("pa-50", "pq-50"))
    expect(q(next, "pq-50").createdOn).toBe("2027-01-15")
    expect(ans(next, "pa-50").on).toBe("2027-01-15")
  })
})

describe("Playbook model: merge following", () => {
  it("mergeQuestion moves the answers and old links follow the chain", () => {
    let s = base()
    s = act(s, { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" })
    expect(q(s, "pq-5").mergedInto).toBe("pq-4")
    expect(ans(s, "pa-10").questionId).toBe("pq-4")
    expect(questionsFor(s).map(x => x.id)).not.toContain("pq-5")
    expect(answerSet(s, "pq-5")).toEqual(answerSet(s, "pq-4"))
    // pq-4 has two rule answers now: the older one becomes an alternate.
    expect(answerSet(s, "pq-4").rule?.id).toBe("pa-10")
    expect(answerSet(s, "pq-4").alternates.map(a => a.id)).toEqual(["pa-8"])
    // A chain: pq-4 into pq-6; pq-5 follows two hops.
    s = act(s, { kind: "mergeQuestion", fromId: "pq-4", intoId: "pq-6" })
    expect(liveQuestion(pb(s), "pq-5")?.id).toBe("pq-6")
    // Merging into a merged question goes to its live target; merging a question already merged, into itself, or into a hidden one is refused.
    s = act(s, { kind: "mergeQuestion", fromId: "pq-7", intoId: "pq-5" })
    expect(q(s, "pq-7").mergedInto).toBe("pq-6")
    expect(act(s, { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-1" })).toBe(s)
    expect(act(s, { kind: "mergeQuestion", fromId: "pq-6", intoId: "pq-5" })).toBe(s)
    const hidden = act(s, { kind: "hideQuestion", questionId: "pq-1", hidden: true })
    expect(act(hidden, { kind: "mergeQuestion", fromId: "pq-2", intoId: "pq-1" })).toBe(hidden)
  })
})

describe("Playbook model: ranking (contract item 4)", () => {
  const answer = (id: string, patch: Partial<PlaybookAnswer> = {}): PlaybookAnswer => ({ id, questionId: "pq-9", kind: "experience", text: `Answer ${id}`, authorId: "maya", on: "2026-01-01", status: "active", votes: { up: [], down: [] }, ...patch })
  const order = (answers: PlaybookAnswer[]) => {
    const s = withPlaybook(base(), { answers })
    const set = answerSet(s, "pq-9")
    return [set.experience?.id, ...set.alternates.map(a => a.id)]
  }

  it("highest net votes first (likes minus dislikes)", () => {
    expect(order([
      answer("pa-a", { votes: { up: ["alex", "sam"], down: ["jordan"] } }),
      answer("pa-b", { votes: { up: ["alex", "sam"], down: [] } }),
      answer("pa-c", { votes: { up: [], down: ["alex"] } }),
    ])).toEqual(["pa-b", "pa-a", "pa-c"])
  })

  it("ties on votes: most recent verifiedOn ?? on", () => {
    expect(order([
      answer("pa-a", { on: "2026-03-01" }),
      answer("pa-b", { on: "2026-01-01", verifiedOn: "2026-05-01" }),
      answer("pa-c", { on: "2026-04-01" }),
    ])).toEqual(["pa-b", "pa-c", "pa-a"])
  })

  it("ties on votes and date: id", () => {
    expect(order([answer("pa-c"), answer("pa-a"), answer("pa-b")])).toEqual(["pa-a", "pa-b", "pa-c"])
    expect(compareAnswers(answer("pa-a"), answer("pa-a"))).toBe(0)
  })

  it("one primary per kind, alternates in kind order (rule, club, experience), hidden never shown", () => {
    const set = answerSet(withPlaybook(base(), { answers: [
      answer("pa-e1"), answer("pa-e2", { on: "2026-02-01" }), answer("pa-h", { on: "2026-09-01", status: "hidden" }),
      answer("pa-c1", { kind: "club", authorId: "alex" }), answer("pa-c2", { kind: "club", authorId: "alex", votes: { up: ["maya"], down: [] } }),
      answer("pa-r1", { kind: "rule", authorId: null, policyId: "ASU-R-004" }), answer("pa-r2", { kind: "rule", authorId: null, policyId: "ASU-R-004", on: "2026-06-01" }),
      answer("pa-st", { on: "2026-08-01", status: "stale" }),
    ] }), "pq-9")
    expect(set.rule?.id).toBe("pa-r2")
    expect(set.club?.id).toBe("pa-c2")
    expect(set.experience?.id).toBe("pa-st")
    expect(set.alternates.map(a => a.id)).toEqual(["pa-r1", "pa-c1", "pa-e2", "pa-e1"])
  })

  it("the sample Playbook ranks pq-1 as expected", () => {
    const set = answerSet(base(), "pq-1")
    expect([set.rule?.id, set.club?.id, set.experience?.id, set.alternates.map(a => a.id)]).toEqual(["pa-1", "pa-2", "pa-3", ["pa-4"]])
  })
})

describe("Playbook model: damaged data (contract item 1)", () => {
  const damaged = (playbook: unknown): DemoState => ({ ...base(), playbook: playbook as Playbook })

  it("never throws on a damaged Playbook, whatever its shape", () => {
    for (const bad of [null, 42, "text", [], {}, { questions: "x", answers: {} }, { questions: [null, 1, "q", { id: 5 }], answers: [null, { id: "pa-1" }] }]) {
      const s = damaged(bad)
      expect(() => pb(s)).not.toThrow()
      expect(pb(s).questions).toEqual([])
      expect(pb(s).answers).toEqual([])
      expect(() => answerSet(s, "pq-1")).not.toThrow()
      expect(() => questionsFor(s, { roleId: "r-fin", category: "funding" })).not.toThrow()
      expect(() => changePlaybook(s, { kind: "markRead", questionId: "pq-1" })).not.toThrow()
    }
  })

  it("drops unknown answer kinds, orphan answers, duplicate ids and empty text; normalizes unknown categories, origins and statuses", () => {
    const s = damaged({
      questions: [
        { id: "pq-1", text: "  A   question?  ", category: "mystery", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "alien", createdOn: "yesterday", createdBy: 7 },
        { id: "pq-1", text: "Duplicate", category: "funding", roleIds: "all" },
        { id: "pq-2", text: "", category: "funding", roleIds: "all" },
        { id: "pq-3", text: "Has a club category?", category: "cat:merch", roleIds: ["r-fin", 3, "r-fin"] },
      ],
      answers: [
        { id: "pa-1", questionId: "pq-1", kind: "rumor", text: "x", votes: { up: [], down: [] } },
        { id: "pa-2", questionId: "pq-404", kind: "experience", text: "Orphan" },
        { id: "pa-3", questionId: "pq-1", kind: "experience", text: "z".repeat(900), status: "weird", on: "2026-01-01", votes: null },
        { id: "pa-3", questionId: "pq-1", kind: "experience", text: "Duplicate id" },
        { id: "pa-4", questionId: "pq-1", kind: "club", text: "   " },
      ],
      categories: [{ id: "cat:merch", label: "Merch" }, { id: "funding", label: "Shadow" }, { id: "cat:merch", label: "Again" }, { id: 3 }],
    })
    const p = pb(s)
    expect(p.questions.map(x => x.id)).toEqual(["pq-1", "pq-3"])
    expect(p.questions[0]).toMatchObject({ text: "A question?", category: "timeline", origin: "club", createdOn: "", createdBy: null })
    expect(p.questions[1]).toMatchObject({ category: "cat:merch", roleIds: ["r-fin"] })
    expect(p.categories).toEqual([{ id: "cat:merch", label: "Merch" }])
    expect(p.answers.map(a => a.id)).toEqual(["pa-3"])
    expect(p.answers[0]).toMatchObject({ status: "active", votes: { up: [], down: [] }, authorId: null })
    expect(p.answers[0].text).toHaveLength(MAX_ANSWER_TEXT)
  })

  it("dedupes votes, removes unknown people from votes and reads, and drops someone who both liked and disliked", () => {
    const s = damaged({
      questions: [{ id: "pq-1", text: "Q?", category: "funding", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "seed", createdOn: "2026-10-29", createdBy: null }],
      answers: [{ id: "pa-1", questionId: "pq-1", kind: "experience", text: "A", authorId: "maya", on: "2026-10-29", status: "active", votes: { up: ["alex", "alex", "ghost", "sam"], down: ["sam", "jordan", 4] } }],
      reads: { maya: ["pq-1", "pq-1", "pq-404"], ghost: ["pq-1"], sam: [] , jordan: "pq-1" },
    })
    const p = pb(s)
    expect(p.answers[0].votes).toEqual({ up: ["alex"], down: ["jordan"] })
    expect(p.reads).toEqual({ maya: ["pq-1"] })
  })

  it("breaks mergedInto cycles and drops links to missing questions, so every question resolves", () => {
    const qn = (id: string, mergedInto?: string) => ({ id, text: `${id}?`, category: "funding", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "seed", createdOn: "2026-10-29", createdBy: null, ...(mergedInto ? { mergedInto } : {}) })
    const s = damaged({
      questions: [qn("pq-1", "pq-2"), qn("pq-2", "pq-3"), qn("pq-3", "pq-1"), qn("pq-4", "pq-4"), qn("pq-5", "pq-404"), qn("pq-6", "pq-2")],
      answers: [{ id: "pa-1", questionId: "pq-3", kind: "experience", text: "A", authorId: null, on: "2026-10-29", status: "active", votes: { up: [], down: [] } }],
    })
    const p = pb(s)
    expect(p.questions.find(x => x.id === "pq-1")!.mergedInto).toBeUndefined()
    expect(p.questions.find(x => x.id === "pq-4")!.mergedInto).toBeUndefined()
    expect(p.questions.find(x => x.id === "pq-5")!.mergedInto).toBeUndefined()
    for (const x of p.questions) expect(liveQuestion(p, x.id)?.mergedInto).toBeUndefined()
    expect(liveQuestion(p, "pq-6")?.id).toBe("pq-1")
    // The answer on a merged question is read under the live one.
    expect(p.answers[0].questionId).toBe("pq-1")
    expect(questionsFor(s).map(x => x.id)).toEqual(["pq-1", "pq-4", "pq-5"])
  })

  it("an action on a damaged save writes back the sanitized Playbook", () => {
    const s = damaged({ questions: [{ id: "pq-1", text: "Q?", category: "funding", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "seed", createdOn: "2026-10-29", createdBy: null }, { bad: true }], answers: [] })
    const next = changePlaybook(s, { kind: "markRead", questionId: "pq-1" })
    expect(next.playbook!.questions).toHaveLength(1)
    expect(next.playbook!.reads).toEqual({ alex: ["pq-1"] })
  })

  it("caps a damaged save at the size limits when reading", () => {
    const questions = Array.from({ length: MAX_QUESTIONS + 5 }, (_, i) => ({ id: `pq-${i + 1}`, text: `Q ${i}?`, category: "funding", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "club", createdOn: "2026-10-29", createdBy: null }))
    expect(pb(damaged({ questions, answers: [] })).questions).toHaveLength(MAX_QUESTIONS)
  })
})

describe("Playbook model: limits (contract item 7)", () => {
  const filled = (nq: number, na: number): DemoState => withPlaybook(base(), {
    questions: Array.from({ length: nq }, (_, i) => ({ id: `pq-${i + 1}`, text: `Q ${i}?`, category: "funding", roleIds: "all", policyIds: [], checklistItemIds: [], origin: "club", createdOn: "2026-10-29", createdBy: null })),
    answers: Array.from({ length: na }, (_, i) => ({ id: `pa-${i + 1}`, questionId: "pq-1", kind: "experience", text: `A ${i}`, authorId: "maya", on: "2026-10-29", status: "active", votes: { up: [], down: [] } })),
  })

  it("refuses a question past 500 and an answer past 2,000", () => {
    const full = filled(MAX_QUESTIONS, MAX_ANSWERS)
    expect(act(full, addQ("pq-9999"))).toBe(full)
    expect(act(full, addA("pa-9999", "pq-1"))).toBe(full)
    const room = filled(MAX_QUESTIONS - 1, MAX_ANSWERS - 1)
    expect(pb(act(room, addQ("pq-9999"))).questions).toHaveLength(MAX_QUESTIONS)
    expect(pb(act(room, addA("pa-9999", "pq-1"))).answers).toHaveLength(MAX_ANSWERS)
  })

  it("refuses a starter import that would go past the limits", () => {
    const full = filled(MAX_QUESTIONS, 0)
    expect(act(full, { kind: "importStarter" })).toBe(full)
  })
})

describe("Playbook model: the research log never holds question or answer text", () => {
  it("logs kinds and IDs only, for every action", () => {
    const QTEXT = "Secret question wording?", ATEXT = "Secret answer wording."
    const actions: PlaybookAction[] = [
      { kind: "addQuestion", id: "pq-50", text: QTEXT, category: "tools", roleIds: "all" },
      { kind: "editQuestion", questionId: "pq-50", text: `${QTEXT} edited`, category: "tools", roleIds: "all" },
      { kind: "addAnswer", id: "pa-50", questionId: "pq-50", answerKind: "club", text: ATEXT },
      { kind: "editAnswer", answerId: "pa-50", text: `${ATEXT} edited` },
      { kind: "vote", answerId: "pa-50", vote: 1 },
      { kind: "markRead", questionId: "pq-50" },
      { kind: "hideAnswer", answerId: "pa-50", hidden: true },
      { kind: "hideQuestion", questionId: "pq-50", hidden: true },
      { kind: "mergeQuestion", fromId: "pq-5", intoId: "pq-4" },
      { kind: "importStarter" },
    ]
    let s = base(), log: ReturnType<typeof appendLog> = []
    for (const a of actions) {
      const next = act(s, a)
      expect(next).not.toBe(s)
      log = appendLog(log, s, next, { type: "playbookAction", action: a }, 1_800_000_000_000)
      s = next
    }
    const text = JSON.stringify(log)
    expect(text).not.toMatch(/Secret|What did the last|Example \(fictional\)/)
    expect(log.every(e => e.applied)).toBe(true)
    expect(log.map(e => (e.payload as { kind: string }).kind)).toEqual(actions.map(a => a.kind))
  })
})
