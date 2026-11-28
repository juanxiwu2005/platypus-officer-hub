/**
 * Review option B (Juanxi, 2026-11-28): changes are one list. Each row can be unticked; one button applies the ticked rows and
 * leaves the unticked ones not applied; Discard applies none.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { DemoState } from "../data/types"
import { seedDemo } from "../data/seed"
import { ChangeCard } from "../components/rail/ChangeCard"

const store = vi.hoisted(() => { const s = { state: undefined as unknown as DemoState, dispatch: vi.fn(), getState: () => s.state }; return s })
const rail = vi.hoisted(() => ({ requestReview: vi.fn(), show: vi.fn() }))
vi.mock("../data/store", async () => {
  const actual = await vi.importActual<typeof import("../data/store")>("../data/store")
  store.dispatch.mockImplementation(a => { store.state = actual.reducer(store.state, a) })
  return { ...actual, useStore: () => store, useViewer: () => ({ person: { id: "alex", name: "Alex Example" } }) }
})
vi.mock("../components/rail/RailContext", () => ({ useRail: () => rail }))

beforeEach(() => {
  const s = seedDemo(undefined, "v2")
  store.state = { ...s, changeSets: [{ id: "two-edits", sentence: "Fictional request: make the newsletter heavy and grow the event", status: "pending", ops: [
    { op: "set_tier", nodeId: "t-news", tier: "heavy" },
    { op: "update_event", eventId: s.events[0].id, headcount: 80 },
  ] }] }
})
afterEach(cleanup)

const view = () => render(<MemoryRouter><ChangeCard id="two-edits" /></MemoryRouter>)
const review = () => store.state.changeSets.find(c => c.id === "two-edits")!

describe("the change list", () => {
  it("lists every change with its consequence and one Apply button for the ticked rows", async () => {
    view()
    expect(await screen.findAllByTestId("review-row")).toHaveLength(2)
    expect(screen.getByText("2 changes from your message")).toBeTruthy()
    expect(screen.getByText(/→ 80 people/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Apply 2 changes" })).toBeTruthy()
  })

  it("an unticked row says it will not be applied, and Apply leaves it rejected while the ticked row applies", async () => {
    view()
    const [, second] = await screen.findAllByRole("checkbox")
    fireEvent.click(second)
    expect(screen.getByText("Not applied: unticked")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Apply 1 change" }))
    expect(review().reviews).toMatchObject({ 0: "applied", 1: "rejected" })
    expect(store.state.nodes.find(n => n.id === "t-news")?.tier).toBe("heavy")
    expect(store.state.events[0].headcount).not.toBe(80)
  })

  it("nothing ticked means nothing to apply", async () => {
    view()
    for (const box of await screen.findAllByRole("checkbox")) fireEvent.click(box)
    expect((screen.getByRole("button", { name: "Apply 0 changes" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("Discard applies none of the changes", async () => {
    const before = store.state.nodes.find(n => n.id === "t-news")?.tier
    view()
    fireEvent.click(await screen.findByRole("button", { name: "Discard" }))
    expect(review().reviews).toMatchObject({ 0: "rejected", 1: "rejected" })
    expect(store.state.nodes.find(n => n.id === "t-news")?.tier).toBe(before)
  })
})
