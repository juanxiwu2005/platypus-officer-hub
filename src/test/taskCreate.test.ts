import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { reducer } from "../data/store"
import { addTaskNotice, canMoveTask, startStatus } from "../data/board"

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

describe("creating a task says where it landed (audit §6.4a)", () => {
  it("an officer's new task is their own in To do, and the notice says so", () => {
    const maya = as("maya")
    const { task } = added(maya, "Order name tags", "unclaimed")
    expect(task.status).toBe("accepted")
    expect(task.ownerId).toBe("maya")
    expect(addTaskNotice(maya, "unclaimed")).toMatch(/is yours, so it is in To do/)
  })

  it("a lead posting in Not claimed leaves it unclaimed and unowned, with nothing to explain", () => {
    const { task } = added(base, "Order name tags", "unclaimed")
    expect(task.status).toBe("unclaimed")
    expect(task.ownerId).toBeNull()
    expect(addTaskNotice(base, "unclaimed")).toBeNull()
  })

  it("says nothing when the card lands in the column it was added from", () => {
    expect(addTaskNotice(as("maya"), "accepted")).toBeNull()
    expect(addTaskNotice(as("maya"), "in_progress")).toBeNull()
    expect(addTaskNotice(base, "waiting")).toBeNull()
  })

  it("uses the six fixed status names, even when an old save renamed them (S3)", () => {
    const renamed = { ...base, viewerId: "maya", org: { ...base.org, board: { labels: { accepted: "Ready", done: "Shipped" } } } }
    expect(addTaskNotice(renamed, "unclaimed")).toMatch(/in To do/)
    expect(addTaskNotice(renamed, "done")).toMatch(/cannot start as Done.*in To do.*move it to Done/)
    expect(addTaskNotice(renamed, "done")).not.toMatch(/Ready|Shipped/)
  })
})

describe("creating a task cannot finish it (audit §6.4b)", () => {
  it("a new task in the Done column starts in To do, with no completion date", () => {
    for (const who of ["alex", "maya"]) {
      const { task } = added(as(who), "Pretend this is finished", "done")
      expect(task.status).toBe("accepted")
      expect(task.completedOn).toBeUndefined()
      expect(addTaskNotice(as(who), "done")).toMatch(/cannot start as Done/)
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
