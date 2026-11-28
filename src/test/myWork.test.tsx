import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { DEMO_TODAY, seedDemo } from "../data/seed"
import { StoreProvider } from "../data/store"
import { RailProvider } from "../components/rail/RailContext"
import { SideNav } from "../components/chrome/SideNav"
import Tasks from "../pages/Tasks"
import { workload } from "../engine/team"
import { canAssignOpenWork, myOpenWork, myOpenWorkCount, myTaskListOpen, unclaimedOpenWork } from "../data/myWork"
import { planEntryPath, rememberPlanView } from "../routes"
import type { DemoState } from "../data/types"

/**
 * Audit D1 + I1 (2026-11-27): the Plan badge, Tasks > My tasks and Team > Workload count the same open work.
 * Rule: mine = I own it or a teammate waits on me for it, unfinished, in the two-week action horizon. The president and
 * VP also carry open work with no owner (they assign it); Team shows each person's own load, without unowned work.
 */
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })
beforeEach(() => sessionStorage.clear())

const seeds: [string, () => DemoState][] = [["v2 seed on the demo clock", () => seedDemo(undefined, "v2")], ["legacy seed", () => seedDemo()]]
const ids = (nodes: { id: string }[]) => nodes.map(n => n.id).sort()

describe.each(seeds)("one count of my open work: %s", (_, seed) => {
  it("runs on the demo clock", () => { expect(seedDemo(undefined, "v2").today).toBe(DEMO_TODAY) })

  it("gives every person the same number in the badge, My tasks and Team", () => {
    const s = seed()
    for (const p of s.people) {
      const badge = myOpenWorkCount(s, p.id)
      expect(badge, p.id).toBe(myTaskListOpen(s, p.id).length)
      expect(ids(workload(s, p.id).nodes), p.id).toEqual(ids(myOpenWork(s, p.id)))
      const unowned = canAssignOpenWork(s, p.id) ? unclaimedOpenWork(s).length : 0
      expect(workload(s, p.id).nodes.length + unowned, p.id).toBe(badge)
    }
  })

  it("draws the badge number as the open rows of My tasks for every person", () => {
    const base = seed()
    for (const p of base.people) {
      const s = { ...base, viewerId: p.id }
      render(<MemoryRouter initialEntries={["/tasks"]}><StoreProvider initial={s}><RailProvider><SideNav /><Tasks /></RailProvider></StoreProvider></MemoryRouter>)
      const badge = screen.queryByTestId("nav-open-tasks")
      const shown = badge ? Number(badge.firstChild!.textContent) : 0
      // Each open group heading carries its row count (folded groups too); the Done group is not open work.
      const counts = [...screen.getByTestId("my-tasks").querySelectorAll(".group-btn:not([data-testid=done-group]) .count")]
      const rows = counts.reduce((sum, c) => sum + Number(c.textContent), 0)
      expect(shown, p.id).toBe(rows)
      expect(shown, p.id).toBe(myOpenWorkCount(s, p.id))
      cleanup()
    }
  })
})

describe("what counts as mine", () => {
  const demo = () => seedDemo(undefined, "v2")
  it("matches the audit's demo numbers after the fix (badge = My tasks = Team for officers; leads add unowned work)", () => {
    const s = demo()
    const row = (id: string) => [myOpenWorkCount(s, id), myTaskListOpen(s, id).length, workload(s, id).nodes.length]
    expect(row("maya")).toEqual([3, 3, 3])
    expect(row("jordan")).toEqual([8, 8, 8])
    expect(row("sam")).toEqual([2, 2, 2])
    expect(unclaimedOpenWork(s).length).toBe(2)
    expect(row("alex")).toEqual([4, 4, 2]) // the president also holds the two open tasks nobody owns yet
  })

  it("counts a task a teammate is waiting on me for, in my badge and my load; its owner keeps it too", () => {
    const s = demo()
    const n = s.nodes.find(x => x.ownerId === "maya" && x.status !== "done" && myOpenWork(s, "maya").includes(x))!
    const before = myOpenWorkCount(s, "sam")
    const next = { ...s, nodes: s.nodes.map(x => x.id === n.id ? { ...x, status: "waiting" as const, waitingOn: "Sam's flyer", waitingOnPersonId: "sam" } : x) }
    expect(myOpenWorkCount(next, "sam")).toBe(before + 1)
    expect(workload(next, "sam").nodes.map(x => x.id)).toContain(n.id)
    expect(myOpenWork(next, "maya").map(x => x.id)).toContain(n.id)
  })

  it("leaves work beyond the two-week horizon out of every count", () => {
    const s = demo()
    const n = myOpenWork(s, "maya")[0]
    const far = { ...s, nodes: s.nodes.map(x => x.id === n.id ? { ...x, latestStart: "2027-03-01", clubDeadline: "2027-03-05" } : x) }
    expect(myOpenWorkCount(far, "maya")).toBe(myOpenWorkCount(s, "maya") - 1)
    expect(workload(far, "maya").nodes.length).toBe(workload(s, "maya").nodes.length - 1)
  })

  it("keeps open work with no owner out of an officer's own list, but in Team tasks", () => {
    const s = { ...demo(), viewerId: "sam" }
    const open = unclaimedOpenWork(s)
    expect(canAssignOpenWork(s, "sam")).toBe(false)
    expect(canAssignOpenWork(s, "alex")).toBe(true)
    render(<MemoryRouter initialEntries={["/tasks"]}><StoreProvider initial={s}><RailProvider><Tasks /></RailProvider></StoreProvider></MemoryRouter>)
    for (const n of open) expect(screen.queryByText(n.title)).toBeNull()
    fireEvent.change(screen.getByRole("combobox", { name: "Task scope" }), { target: { value: "team" } })
    // Team tasks shows every task in the horizon, so the open ones can still be found and claimed.
    expect(open.length).toBeGreaterThan(0)
    for (const n of open) expect(screen.getAllByText(n.title).length).toBeGreaterThan(0)
  })
})

describe("the Plan item opens the task list its count describes", () => {
  it("opens Tasks by default and in this tab remembers the last Events | Tasks choice", () => {
    expect(planEntryPath()).toBe("/tasks")
    rememberPlanView("/events")
    expect(planEntryPath()).toBe("/events")
    rememberPlanView("/team")
    expect(planEntryPath()).toBe("/events")
    rememberPlanView("/tasks")
    expect(planEntryPath()).toBe("/tasks")
  })

  it("links the badged Plan item to /tasks", () => {
    render(<MemoryRouter initialEntries={["/"]}><StoreProvider initial={seedDemo(undefined, "v2")}><SideNav /></StoreProvider></MemoryRouter>)
    const plan = screen.getByTestId("nav-open-tasks").closest("a")!
    expect(plan.getAttribute("href")).toBe("/tasks")
  })
})
