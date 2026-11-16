import { afterEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { StoreProvider, useStore } from "../data/store"
import { RailProvider } from "../components/rail/RailContext"
import { TaskDetail } from "../components/TaskDetail"
import { seedDemo } from "../data/seed"
import { computeSchedule } from "../engine/schedule"
import { isBudgetControlledNode } from "../engine/eventBudget"
import { addDays, fmtShort } from "../lib/dates"
import type { DemoState, Node } from "../data/types"

/**
 * FB-4 (PLAN.md §6.2): the task details in three zones. Replaces nodePanel.test.tsx along with the unused NodePanel:
 * the same rule is still checked — editing is for the president or VP only, and an officer is not offered edits.
 * Nodes are picked by their properties, not by date or fixed id, because FB-6 re-times the event template.
 */
const base = seedDemo()
const sched = computeSchedule(base)
const open = (n: Node) => n.status !== "done" && n.status !== "unclaimed"
const ownedBy = (id: string, extra: (n: Node) => boolean = () => true) => base.nodes.find(n => n.ownerId === id && open(n) && !isBudgetControlledNode(n) && extra(n))!
const president = base.roles.find(r => r.fn === "president")!.holderId!
const officer = base.nodes.find(n => n.ownerId && n.ownerId !== president && open(n) && !isBudgetControlledNode(n) && n.eventId && sched.nodes[n.id]?.official)!.ownerId!
const another = base.people.find(p => p.id !== president && p.id !== officer && base.roles.some(r => r.holderId === p.id && r.fn !== "vice_president"))!.id

let latest: DemoState
function Spy() { latest = useStore().state; return null }
function Live({ nodeId, actorId }: { nodeId: string; actorId: string }) {
  const node = useStore().state.nodes.find(n => n.id === nodeId)!
  return <TaskDetail node={node} actorId={actorId} />
}
const show = (viewerId: string, nodeId: string) => render(<MemoryRouter><StoreProvider initial={{ ...base, viewerId }}><RailProvider><Spy /><Live nodeId={nodeId} actorId={viewerId} /></RailProvider></StoreProvider></MemoryRouter>)
const nextStep = () => screen.getByRole("region", { name: "Your next step" })
const primary = () => nextStep().querySelectorAll(".btn-primary")

afterEach(cleanup)

describe("FB-4 task details: the header", () => {
  it("shows the event, the title, the status, the owner and one Due from the engine; no other date labels", () => {
    const n = ownedBy(officer, x => !!x.eventId && !!sched.nodes[x.id]?.official)
    show(officer, n.id)
    const detail = screen.getByTestId("task-detail")
    expect(screen.getByRole("heading", { level: 2, name: n.title })).toBeTruthy()
    expect(screen.getByTestId("task-due").textContent).toContain(`Due ${fmtShort(sched.nodes[n.id].club)}`)
    // The header and the next step carry one date; the ASU deadline only appears under the folded "Why this date".
    expect(detail.querySelector(".td-head")!.textContent! + nextStep().textContent).not.toMatch(/Start by|Club deadline|ASU|Due date/)
    expect(detail.textContent).toContain(base.events.find(e => e.id === n.eventId)!.name)
    expect(detail.textContent).toContain(base.people.find(p => p.id === officer)!.name)
  })

  it("only someone else who may send reminders gets a Remind <first name> button", () => {
    const n = ownedBy(officer)
    const first = base.people.find(p => p.id === officer)!.name.split(" ")[0]
    show(president, n.id)
    expect(screen.getByRole("button", { name: `Remind ${first}` })).toBeTruthy()
    cleanup()
    show(officer, n.id)
    expect(screen.queryByRole("button", { name: /^Remind/ })).toBeNull()
    cleanup()
    show(another, n.id)
    expect(screen.queryByRole("button", { name: /^Remind/ })).toBeNull()
  })
})

describe("FB-4 task details: Your next step has exactly one primary button", () => {
  it("the owner: Mark done, with the other replies as small buttons", () => {
    show(officer, ownedBy(officer).id)
    expect(primary()).toHaveLength(1)
    expect(primary()[0].textContent).toBe("Mark done")
    const row = within(nextStep()).getByRole("group", { name: "Update task status" })
    expect(within(row).getAllByRole("button").map(b => b.textContent)).toEqual(["Waiting on…", "Need help", "Need more time"])
  })

  it("the president on someone else's task: the same, plus Edit", () => {
    show(president, ownedBy(officer).id)
    expect(primary()).toHaveLength(1)
    expect(primary()[0].textContent).toBe("Mark done")
    expect(screen.getByTestId("task-edit")).toBeTruthy()
  })

  it("another officer: no buttons, the existing sentence, and no Edit", () => {
    show(another, ownedBy(officer).id)
    expect(primary()).toHaveLength(0)
    expect(nextStep().textContent).toContain("Only the owner or president can update this task.")
    expect(screen.queryByTestId("task-edit")).toBeNull()
  })

  it("a Not claimed task: I've got it is the one primary button", () => {
    const s = { ...base, nodes: base.nodes.map(n => n.id === ownedBy(officer).id ? { ...n, status: "unclaimed" as const, ownerId: null } : n) }
    render(<MemoryRouter><StoreProvider initial={{ ...s, viewerId: another }}><TaskDetail node={s.nodes.find(n => n.id === ownedBy(officer).id)!} actorId={another} /></StoreProvider></MemoryRouter>)
    expect(primary()).toHaveLength(1)
    expect(primary()[0].textContent).toBe("I've got it")
  })

  it("a budget step: Mark done is disabled and points to Event Budget", () => {
    // The demo's budget steps are already done, so reopen one (status only; its dates still come from the engine).
    const done = base.nodes.find(x => isBudgetControlledNode(x) && x.ownerId)!
    const s = { ...base, viewerId: done.ownerId!, nodes: base.nodes.map(x => x.id === done.id ? { ...x, status: "accepted" as const, completedOn: undefined } : x) }
    render(<MemoryRouter><StoreProvider initial={s}><Live nodeId={done.id} actorId={done.ownerId!} /></StoreProvider></MemoryRouter>)
    expect((primary()[0] as HTMLButtonElement).disabled).toBe(true)
    expect(nextStep().textContent).toContain("Complete this step in Event Budget.")
    expect(within(nextStep()).getByRole("button", { name: "Open Event Budget" })).toBeTruthy()
  })
})

describe("FB-4 task details: Why this date and Edit", () => {
  it("a step with an ASU rule says when ASU needs it; a step without one does not", () => {
    const ruled = ownedBy(officer, x => !!sched.nodes[x.id]?.official)
    show(officer, ruled.id)
    expect(screen.getByTestId("asu-sentence").textContent).toContain(`ASU needs this by ${fmtShort(sched.nodes[ruled.id].official!)}.`)
    expect(screen.getByTestId("why-date").textContent).toContain(`Reminder goes out ${fmtShort(sched.nodes[ruled.id].latestStart)}.`)
    cleanup()
    const plain = base.nodes.find(x => open(x) && x.ownerId && !sched.nodes[x.id]?.official)!
    show(plain.ownerId!, plain.id)
    expect(screen.queryByTestId("asu-sentence")).toBeNull()
  })

  it("someone else's task does not show when the owner's reminder goes out", () => {
    const n = ownedBy(officer)
    show(president, n.id)
    expect(screen.getByTestId("why-date").textContent).not.toContain(fmtShort(sched.nodes[n.id].latestStart))
    expect(screen.getByTestId("why-date").textContent).toContain("private planning preferences")
  })

  it("the president changes the owner and the Due through updateNode, and can put both back", () => {
    const n = ownedBy(officer)
    show(president, n.id)
    const edit = screen.getByTestId("task-edit")
    act(() => { fireEvent.change(within(edit).getByTestId("owner-select"), { target: { value: another } }) })
    expect(latest.nodes.find(x => x.id === n.id)!.ownerId).toBe(another)
    act(() => { fireEvent.change(within(edit).getByTestId("owner-select"), { target: { value: officer } }) })
    expect(latest.nodes.find(x => x.id === n.id)!.ownerId).toBe(officer)
    act(() => { fireEvent.change(within(edit).getByTestId("due-input"), { target: { value: addDays(sched.nodes[n.id].club, 1) } }) })
    const moved = latest.nodes.find(x => x.id === n.id)!
    expect(moved.clubDeadlineOverride).toBeTruthy()
    expect(screen.getByTestId("task-due").textContent).toContain(fmtShort(moved.clubDeadline!))
    const recommended = within(edit).getByRole("button", { name: `Use recommended (${fmtShort(sched.nodes[n.id].recommendedClub)})` })
    act(() => { fireEvent.click(recommended) })
    expect(latest.nodes.find(x => x.id === n.id)!.clubDeadlineOverride).toBeNull()
    expect(screen.getByTestId("task-due").textContent).toContain(fmtShort(sched.nodes[n.id].club))
  })
})
