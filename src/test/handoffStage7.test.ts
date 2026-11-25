import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { appendUiLog, loggedReducer, reducer } from "../data/store"
import { firstQuestions, MAX_FIRST_QUESTIONS } from "../lib/firstQuestions"
import { handbookSources, sourceFingerprint } from "../lib/handbook"
import type { Action } from "../data/store"
import type { DemoState, LogEntry } from "../data/types"

/**
 * Handoff stage 7 (docs/HANDOFF_EXECUTION_PLAN.md §8). Juanxi (Q3): the product's question record and the research log are one; nothing new is
 * recorded. So this reads the log that is already kept, and these tests use the REAL logging functions, so the shape read here is the shape written.
 */
type Root = Parameters<typeof loggedReducer>[0]
/** Every source file under a folder (none while it does not exist yet). */
const filesIn = (dir: string): string[] => existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String).filter(f => /\.(ts|tsx|mts)$/.test(f)).map(f => join(dir, f)).sort() : []
const T = 1_800_000_000_000
const handoff = (action: object): Action => ({ type: "handoffAction", action } as unknown as Action)

/** A log with real entries: the president drafts and approves the Treasurer handbook and names Taylor, then people ask Ask questions. */
function story() {
  let s: DemoState = seedDemo()
  s = reducer({ ...s, handoff: null, handoffRoles: [] }, handoff({ kind: "start", from: s.today, to: "2026-11-21" }))
  const src = handbookSources(s, "r-fin")
  let root: Root = { app: s, log: [] }
  let t = T
  const run = (action: Action, viewer?: string) => { root = loggedReducer({ ...root, app: viewer ? { ...root.app, viewerId: viewer } : root.app }, { action, at: (t += 1000) }) }
  const ask = (actor: string, question: string) => { root = { ...root, log: appendUiLog(root.log, actor, { type: "ui.ask", payload: { question, via: "typed", route: "/" } }, (t += 1000)) } }
  return { root: () => root, log: () => root.log, run, ask, src }
}

function named() {
  const h = story()
  const { src, run, ask } = h
  run(handoff({ kind: "draft", roleId: "r-fin", raw: { entries: src.slice(0, 8).map(x => ({ sourceId: x.id })) }, fingerprint: sourceFingerprint(src), model: null, source: "t" }), "alex")
  run(handoff({ kind: "confirm", roleId: "r-fin" }), "maya")
  run(handoff({ kind: "approve", roleId: "r-fin" }), "alex")
  ask("alex", "An old question before anyone was named")
  run(handoff({ kind: "setIncoming", roleId: "r-fin", successor: { kind: "new", name: "Taylor Example" } }), "alex")
  const taylor = h.root().app.handoffRoles.find(r => r.roleId === "r-fin")!.incomingId!
  return { ...h, taylor, record: () => h.root().app.handoffRoles.find(r => r.roleId === "r-fin")! }
}

describe("what the next officer asked, read from the study log", () => {
  it("only their questions, only after they were named, newest last", () => {
    const h = named()
    h.ask(h.taylor, "Where do I find the USG form?")
    h.ask("jordan", "Somebody else's question")
    h.ask(h.taylor, "Who signs the reimbursement?")
    const q = firstQuestions(h.log(), h.record())
    expect(q.map(x => x.text)).toEqual(["Where do I find the USG form?", "Who signs the reimbursement?"])
    expect(q[0].at).toBeLessThan(q[1].at)
  })

  it("marks a question covered when the handbook shares a meaningful word with it, and flags the rest", () => {
    const h = named()
    const covered = h.record().entries.map(e => e.text).join(" ").match(/[A-Za-z]{7,}/)![0]
    h.ask(h.taylor, `Tell me about ${covered}`)
    h.ask(h.taylor, "Quokkas zeppelin xylophone?")
    expect(firstQuestions(h.log(), h.record()).map(x => x.covered)).toEqual([true, false])
  })

  it("is empty when nobody is named yet, or the log has no sign of the naming", () => {
    const h = story()
    h.ask("taylor", "Anything")
    expect(firstQuestions(h.log(), h.root().app.handoffRoles.find(r => r.roleId === "r-fin")!)).toEqual([]) // nobody named
    const n = named()
    n.ask(n.taylor, "A question")
    expect(firstQuestions([], n.record())).toEqual([])
  })

  it("counts from the latest naming, ignores refused namings and other roles", () => {
    const h = named()
    h.ask(h.taylor, "First round question")
    h.run(handoff({ kind: "clearIncoming", roleId: "r-fin" }), "alex")
    h.run(handoff({ kind: "setIncoming", roleId: "r-fin", successor: { kind: "existing", personId: h.taylor } }), "alex") // Taylor's person was removed: refused
    h.run(handoff({ kind: "setIncoming", roleId: "r-mkt", successor: { kind: "new", name: "Riley Example" } }), "alex") // another role
    h.run(handoff({ kind: "setIncoming", roleId: "r-fin", successor: { kind: "existing", personId: "sam" } }), "alex")
    h.ask("sam", "Sam's question as the next Treasurer")
    expect(firstQuestions(h.log(), h.record()).map(x => x.text)).toEqual(["Sam's question as the next Treasurer"])
  })

  it("keeps the latest questions up to a limit and skips entries with no question text", () => {
    const h = named()
    for (let i = 0; i < MAX_FIRST_QUESTIONS + 5; i++) h.ask(h.taylor, `Question number ${i}`)
    const log: LogEntry[] = [...h.log(), { seq: 9_999, at: T, actor: h.taylor, type: "ui.ask", payload: { question: 42 }, applied: true }, { seq: 10_000, at: T, actor: h.taylor, type: "ui.ask", payload: null, applied: true }]
    const q = firstQuestions(log, h.record())
    expect(q).toHaveLength(MAX_FIRST_QUESTIONS)
    expect(q[q.length - 1].text).toBe(`Question number ${MAX_FIRST_QUESTIONS + 4}`)
  })

  it("does not change the log or the club's data", () => {
    const h = named()
    h.ask(h.taylor, "Where is the form?")
    const log = JSON.stringify(h.log()), state = JSON.stringify(h.root().app)
    firstQuestions(h.log(), h.record())
    expect(JSON.stringify(h.log())).toBe(log)
    expect(JSON.stringify(h.root().app)).toBe(state)
  })
})

describe("the log stays out of the handoff data and the AI (hard rule: no research data in prompts)", () => {
  // These files build what is stored, shown in a handbook or dossier, or sent to the AI. None may read the log.
  const FILES = [
    "src/data/handoff.ts", "src/data/roleChanges.ts", "src/data/roleTerms.ts", "src/data/permissions.ts",
    "src/lib/handbook.ts", "src/lib/handbookDraft.ts", "src/lib/roleDossier.ts", "src/lib/handoffQuestions.ts", "src/lib/handoffRisk.ts",
    "netlify/functions/handbook-draft.mts",
    // Playbook (phase 1): the library is stored club data and later feeds Ask, so it never reads the log either.
    "src/data/playbook.ts", "src/data/playbookStarter.ts", "src/lib/playbookMatch.ts", "src/data/playbookSeed.ts", "src/pages/Playbook.tsx",
    ...filesIn("src/components/playbook"),
  ]
  it.each(FILES)("%s does not use the log", file => {
    const text = readFileSync(file, "utf8")
    expect(text).not.toMatch(/\bgetLog\b|interactionLog|firstQuestions|\buiLog\b|LogEntry|loadLog|"ui\.ask"/)
  })

  it("the only file that reads the log for this is firstQuestions.ts, and only the Handoff screens use it", () => {
    const users = ["src/pages/HandoffNewOfficer.tsx", "src/pages/Handoff.tsx", "src/pages/HandoffRoleChanges.tsx"].filter(f => /firstQuestions/.test(readFileSync(f, "utf8")))
    expect(users).toEqual(["src/pages/HandoffNewOfficer.tsx"])
  })
})
