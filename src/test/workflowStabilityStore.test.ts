import { beforeEach, describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { loadStateWithNotice, reducer, STORAGE_KEY } from "../data/store"
import { saveWorkflow } from "../data/settings"
import { newObjects } from "../data/changeReview"
import { EVENT_STEPS } from "../engine/playbooks"
import { resolveBranches } from "../engine/workflowBranches"
import type { WorkflowBranch } from "../data/types"
import type { CommandOp } from "../lib/commands"

const branch: WorkflowBranch = { id: "speaker-checks", title: "Speaker checks", order: 20, side: "before_event", condition: "externalGuest", defaultRoleId: "r-events" }
const base = () => seedDemo(undefined, "v2")

describe("workflow stability · business persistence", () => {
  beforeEach(() => localStorage.clear())

  it("saves branch metadata without rebuilding existing events or tasks", () => {
    const s = base()
    const saved = saveWorkflow(s, EVENT_STEPS, [branch])
    expect(saved.org.eventWorkflow?.branches).toEqual([branch])
    expect(saved.nodes).toBe(s.nodes)
    expect(saved.events).toBe(s.events)
    branch.title = "Speaker checks"
    expect(saveWorkflow(saved, EVENT_STEPS).org.eventWorkflow?.branches).toEqual([branch])
  })

  it("new event keeps its own branch snapshot and scoped tasks", () => {
    const s = base()
    const custom = { ...EVENT_STEPS.find(x => x.key === "speakerPacket")!, key: "speaker-extra", title: "Speaker check", custom: true, cond: undefined, placement: { branchId: branch.id, order: 0 } }
    const saved = saveWorkflow(s, [...EVENT_STEPS, custom], [branch])
    const op: CommandOp = { op: "create_event", name: "Fictional speaker", type: "speaker", headcount: 30, venue: "campus", food: "none", funding: "dues", speaker: true, checks: { speaker: true } }
    const result = newObjects(saved, op, "created-speaker", { date: "2027-04-16" })
    const event = result.events!.find(e => e.id === "created-speaker")!
    expect(event.workflowBranches).toEqual([branch])
    expect(event.workflowBranches).not.toBe(saved.org.eventWorkflow?.branches)
    expect(result.nodes!.find(n => n.id === "created-speaker:speaker-extra")?.placement?.branchId).toBe(branch.id)
    const plain = newObjects(saved, { ...op, speaker: false, type: "social", checks: {} }, "created-plain", { date: "2027-04-16" })
    expect(plain.nodes!.some(n => n.id === "created-plain:speaker-extra")).toBe(false)
  })

  it("creates and undoes an event branch atomically while retaining later task content", () => {
    const s = base(), eventId = "e-speaker"
    const snapshot = s.nodes.filter(n => n.eventId === eventId)
    const previousBranches = resolveBranches(snapshot, s.events.find(e => e.id === eventId)?.workflowBranches)
    const added = reducer(s, { type: "addEventBranch", eventId, id: `${eventId}:branch-task`, branch, title: "Check speaker materials" })
    expect(added.nodes.some(n => n.id === `${eventId}:branch-task`)).toBe(true)
    expect(added.events.find(e => e.id === eventId)?.workflowBranches?.some(b => b.id === branch.id)).toBe(true)
    const updated = reducer(added, { type: "updateNode", id: `${eventId}:materials`, patch: { instructions: "Keep this newer instruction" } })
    const undone = reducer(updated, { type: "restoreEventNodes", eventId, nodes: snapshot, branches: previousBranches })
    expect(undone.nodes.some(n => n.id === `${eventId}:branch-task`)).toBe(false)
    expect(undone.events.find(e => e.id === eventId)?.workflowBranches?.some(b => b.id === branch.id)).toBe(false)
    expect(undone.nodes.find(n => n.id === `${eventId}:materials`)?.instructions).toBe("Keep this newer instruction")
  })

  it("refuses duplicate or unknown branch definitions with no orphan step", () => {
    const s = base()
    const result = reducer(s, { type: "addEventBranch", eventId: "e-speaker", id: "e-speaker:new", branch: { ...branch, id: "marketing" }, title: "No duplicate" })
    expect(result).toBe(s)
  })

  it("refuses hiding a core or ASU step through raw graph patches", () => {
    const s = base()
    for (const key of ["promotionItems", "foodCompliance", "finalcheck"]) {
      const next = reducer(s, { type: "applyStepEdits", eventId: "e-speaker", edits: [{ id: `e-speaker:${key}`, patch: { placement: { branchId: "speaker", order: 2 } } }] })
      expect(next).toBe(s)
    }
  })

  it("retains a valid v23 event missing Full Check verbatim on read", () => {
    const s = base()
    s.nodes = s.nodes.filter(n => n.id !== "e-speaker:finalcheck")
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    expect(loadStateWithNotice().state.nodes).toEqual(s.nodes)
  })

  it("rejects illegal effort and opts valid explicit edits into effort scheduling", () => {
    const s = base(), id = "e-speaker:marketingNeeds"
    const original = s.nodes.find(n => n.id === id)!
    const invalid = reducer(s, { type: "updateNode", id, patch: { estDays: 1.5 } })
    expect(invalid.nodes.find(n => n.id === id)?.estDays).toBe(original.estDays)
    const edited = reducer(s, { type: "updateNode", id, patch: { estDays: 10 } })
    expect(edited.nodes.find(n => n.id === id)?.startPolicy).toBe("effort")
    expect(edited.nodes.find(n => n.id === id)?.clubDeadline).toBe(original.clubDeadline)
    expect(edited.nodes.find(n => n.id === id)?.latestStart! < original.latestStart!).toBe(true)
  })
})
