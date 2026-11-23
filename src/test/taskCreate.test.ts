import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { canMoveTask, startStatus } from "../data/board"

/**
 * Audit §6.4: creating a task used to land somewhere else without saying so, and creating in Done
 * handed any officer a finished task, going round the rule that only a lead reopens one.
 */
const base = seedDemo("2026-10-22")
const as = (id: string) => ({ ...base, viewerId: id })
const added = (s = base, title = "Order name tags", status: Parameters<typeof startStatus>[1] = "accepted") => {
  const next = reducer(s, { type: "addTask", title, status })
  return { next, task: next.nodes.at(-1)! }
}

describe("creating a task lands where startStatus says (audit §6.4a)", () => {
  it("an officer's new task is their own in To do", () => {
    const { task } = added(as("maya"), "Order name tags", "unclaimed")
    expect(task.status).toBe("accepted")
    expect(task.ownerId).toBe("maya")
  })

  it("a lead posting in Not claimed leaves it unclaimed and unowned", () => {
    const { task } = added(base, "Order name tags", "unclaimed")
    expect(task.status).toBe("unclaimed")
    expect(task.ownerId).toBeNull()
  })
})

describe("creating a task cannot finish it (audit §6.4b)", () => {
  it("a new task asked for as Done starts in To do, with no completion date", () => {
    for (const who of ["alex", "maya"]) {
      const { task } = added(as(who), "Pretend this is finished", "done")
      expect(task.status).toBe("accepted")
      expect(task.completedOn).toBeUndefined()
    }
  })

  it("credits nobody for a task that was only just created", () => {
    const { next } = added(as("maya"), "Pretend this is finished", "done")
    expect(next.contributions).toHaveLength(base.contributions.length)
  })

  it("leaves the reopen rule in force: the officer still needs a lead to undo a finished task", () => {
    const { next, task } = added(as("maya"), "Real work", "done")
    const finished = reducer(next, { type: "moveTask", nodeId: task.id, status: "done" })
    const done = finished.nodes.find(n => n.id === task.id)!
    expect(done.status).toBe("done")
    expect(canMoveTask(finished, done, "accepted")).toMatch(/reopen a finished task/)
    expect(canMoveTask({ ...finished, viewerId: "alex" }, done, "accepted")).toBeNull()
  })

  it("startStatus never returns done", () => {
    const statuses = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"] as const
    for (const s of statuses) for (const who of ["alex", "maya"]) expect(startStatus(as(who), s)).not.toBe("done")
  })
})
