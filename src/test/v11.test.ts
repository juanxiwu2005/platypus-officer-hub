import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { canMoveTask } from "../data/board"
import { metroLayout, EVENT_KEY } from "../components/flow/metro"
import { computeSchedule } from "../engine/schedule"
import { sanitizeCards, stripDates } from "../lib/chatCards"
import { commandContext } from "../lib/commands"
import { keywordRules, respond, taskList } from "../lib/assistant"

const base = seedDemo("2026-10-22")
const as = (id: string) => ({ ...base, viewerId: id })

describe("task board (v1.1 decision 3)", () => {
  it("owners move their own tasks; leads move anyone's and the owner gets a private note", () => {
    const maya = as("maya")
    expect(canMoveTask(maya, maya.nodes.find(n => n.id === "t-recon")!, "done")).toBeNull()
    expect(canMoveTask(maya, maya.nodes.find(n => n.id === "t-news")!, "done")).toMatch(/your own tasks/)
    const moved = reducer(base, { type: "moveTask", nodeId: "t-news", status: "in_progress" })
    expect(moved.nodes.find(n => n.id === "t-news")!.status).toBe("in_progress")
    expect(moved.notifications.some(n => n.recipientId === "sam" && /moved/.test(n.text))).toBe(true)
  })
  it("keeps the claim handshake: a lead cannot claim on someone else's behalf", () => {
    const n = base.nodes.find(n => n.status === "unclaimed" && n.ownerId && n.ownerId !== "alex")!
    expect(canMoveTask(base, n, "accepted")).toMatch(/can claim/)
    expect(reducer(base, { type: "moveTask", nodeId: n.id, status: "accepted" })).toBe(base)
  })
  it("done by drag credits the owner once, through the normal workflow", () => {
    const s = reducer(as("maya"), { type: "moveTask", nodeId: "t-recon", status: "done" })
    expect(s.nodes.find(n => n.id === "t-recon")!.status).toBe("done")
    expect(s.contributions.filter(c => c.nodeId === "t-recon")).toHaveLength(1)
  })
  it("reorders inside a column and adds a task with an engine-computed date", () => {
    const s = reducer(base, { type: "moveTask", nodeId: "t-sdc", status: "accepted", beforeId: "e-night:review" })
    const col = s.nodes.filter(n => n.status === "accepted" && n.rank !== undefined).sort((a, b) => a.rank! - b.rank!)
    expect(col.findIndex(n => n.id === "t-sdc")).toBeLessThan(col.findIndex(n => n.id === "e-night:review"))
    const added = reducer(base, { type: "addTask", title: "Order name tags", status: "accepted" })
    const t = added.nodes.at(-1)!
    expect(t.title).toBe("Order name tags")
    expect(t.ownerId).toBe("alex")
    expect(t.clubDeadline).toBeTruthy()
  })
  it("saves custom status names, colours and tags only for leads", () => {
    const board = { labels: { accepted: "Ready" }, colors: { accepted: "#c2418d" }, tags: [{ id: "food", label: "Food", color: "#0f8a8a" }], fields: ["owner" as const] }
    expect(reducer(as("maya"), { type: "saveBoard", board })).toEqual(as("maya"))
    const s = reducer(base, { type: "saveBoard", board: { ...board, colors: { accepted: "red" } } })
    expect(s.org.board?.labels?.accepted).toBe("Ready")
    expect(s.org.board?.colors?.accepted).toBeUndefined()
    const tagged = reducer(s, { type: "updateNode", id: "t-sdc", patch: { tags: ["food", "unknown"] } })
    expect(tagged.nodes.find(n => n.id === "t-sdc")!.tags).toEqual(["food"])
  })
})

describe("single-main-line flow chart", () => {
  it("puts every step on the main line or exactly one branch, with the event day on the main line", () => {
    const L = metroLayout(base, computeSchedule(base), "e-night")
    const onMain = L.stations.filter(s => s.node).map(s => s.node!.id)
    const onBranch = L.branches.flatMap(b => b.nodes.map(x => x.node.id))
    const all = base.nodes.filter(n => n.eventId === "e-night").map(n => n.id)
    expect([...onMain, ...onBranch].sort()).toEqual([...all].sort())
    expect(new Set([...onMain, ...onBranch]).size).toBe(all.length)
    expect(L.stations.some(s => s.key === EVENT_KEY)).toBe(true)
    expect(onMain[0]).toBe("e-night:draft")
    // Branches leave the line and come back later; columns increase along the line.
    for (const b of L.branches) expect(b.to).toBeGreaterThan(b.from)
    for (let i = 1; i < L.stations.length; i++) expect(L.stations[i].col).toBeGreaterThan(L.stations[i - 1].col)
  })
  it("uses one side only on a phone", () => {
    const L = metroLayout(base, computeSchedule(base), "e-speaker", false)
    expect(L.branches.every(b => b.row > 0)).toBe(true)
  })
  it("groups a shared dependency window once, not once per owner, and keeps desktop zones meaningful", () => {
    const L = metroLayout(base, computeSchedule(base), "e-night")
    const windows = L.branches.map(b => `${b.from}:${b.to}`)
    expect(new Set(windows).size).toBe(windows.length)
    for (const b of L.branches) {
      const hasGate = b.nodes.some(x => x.node.ruleIds.length > 0 || x.node.phase === "plan" || x.node.phase === "money")
      expect(hasGate ? -b.row : b.row).toBeGreaterThan(0)
    }
  })
})

describe("Ask panel cards", () => {
  const ctx = commandContext(base)
  it("drops unknown cards, unknown ids and any date the model writes", () => {
    const cards = sanitizeCards({ cards: [
      { kind: "text", text: "Submit it by Nov 4 or 2026-11-04." },
      { kind: "delete_everything" },
      { kind: "nudge", nodeId: "nope" },
      { kind: "changes", ops: [{ op: "assign_owner", nodeId: "t-news", ownerId: "priya", date: "2099-01-01" }] },
      { kind: "form", intent: "plan_event", prefill: { name: "Dinner", date: "2099-01-01", headcount: 40 } },
    ] }, ctx)
    expect(cards.map(c => c.kind)).toEqual(["text", "changes", "form"])
    expect(JSON.stringify(cards)).not.toMatch(/2099|2026-11-04|Nov 4/)
    expect(stripDates("due 10/30")).toBe("due [date in plan]")
  })
  it("answers clear requests locally: a plan form, ranked tasks and keyword rules", async () => {
    const off = { ...base, aiEnabled: false }
    const plan = await respond("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding", off, "alex", null, "/", [])
    const form = plan.cards.find(c => c.kind === "form")
    expect(form && form.kind === "form" && form.date).toBe("2026-11-19")
    expect(form && form.kind === "form" && form.prefill.food).toBe("offsite")
    const top = await respond("What are my top 5 tasks?", off, "alex", null, "/", [])
    const list = top.cards[0]
    expect(list.kind === "tasks" && list.nodeIds.length).toBeGreaterThan(0)
    expect(list.kind === "tasks" && list.nodeIds.every(id => base.nodes.find(n => n.id === id)!.ownerId === "alex")).toBe(true)
    const rule = await respond("Can we serve homemade food?", off, "alex", null, "/rules", [])
    expect(rule.cards[0].kind === "rule" && rule.cards[0].citations).toEqual(["R08"])
    expect(keywordRules("Which tax form should we file?")).toEqual([])
    const cmd = await respond("Assign Send the October newsletter to Priya", off, "alex", null, "/", [])
    expect(cmd.changeSet?.ops[0]).toMatchObject({ op: "assign_owner", nodeId: "t-news", ownerId: "priya" })
  })
  it("ranks the team risk list from the forecast", () => {
    const r = taskList(base, "alex", "risk", 3)
    expect(r.nodes.length).toBeLessThanOrEqual(3)
    expect(r.remind).toBe(true)
  })
})
