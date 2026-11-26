import { afterEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { seedDemo } from "../data/seed"
import { StoreProvider } from "../data/store"
import type { Cheer, DemoState } from "../data/types"
import { RailProvider, useRail } from "../components/rail/RailContext"
import { YourCheers } from "../components/cheers/YourCheers"
import GiveCheer from "../components/cheers/GiveCheer"
import { CardsHost } from "../components/cheers/CardsHost"
import { joinNames, mondayOf, otherLabel, pointsLabel } from "../components/cheers/shared"

// Cheers R1 interface (docs/feedback-fix/CHEERS_R1_CONTRACT.md §5). These run against src/data/cheers.ts as it is, so they
// check what the screens show and keep private, not the model's rules (src/test/cheers*.test.ts covers those).
afterEach(() => { cleanup(); localStorage.clear() })

const NOTE = "Room booked two weeks early, so the caterer could confirm."
const cheer = (over: Partial<Cheer>): Cheer => ({ id: "ch-1", fromId: "maya", toIds: ["jordan"], points: 25, note: NOTE, card: "star", on: "2026-10-31", seenBy: ["jordan"], ...over })
function demo(viewerId: string, cheers: Cheer[]): DemoState {
  const s = seedDemo(undefined, "v2")
  return { ...s, viewerId, cheers: { cheers } }
}
function mount(state: DemoState, children: ReactNode, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}><StoreProvider initial={state}><RailProvider>{children}</RailProvider></StoreProvider></MemoryRouter>)
}

describe("shared display helpers", () => {
  it("finds the Monday of the demo week and joins names", () => {
    expect(mondayOf("2026-10-31")).toBe("2026-10-26")
    expect(mondayOf("2026-10-26")).toBe("2026-10-26")
    expect(mondayOf("2026-11-01")).toBe("2026-10-26")
    expect(joinNames(["Maya"])).toBe("Maya")
    expect(joinNames(["Jordan", "Maya"])).toBe("Jordan and Maya")
    expect(joinNames(["Jordan", "Maya", "Sam"])).toBe("Jordan, Maya and Sam")
  })
  it("labels a cheer from the viewer's side: sent costs points × recipients, received adds points", () => {
    const s = demo("maya", [])
    const sent = cheer({ toIds: ["jordan", "sam"], points: 50 })
    expect(pointsLabel(sent, "maya")).toBe("−100")
    expect(pointsLabel(sent, "jordan")).toBe("+50")
    expect(otherLabel(s, sent, "maya")).toBe("Jordan +1")
    expect(otherLabel(s, sent, "sam")).toBe("Maya")
  })
})

describe("Your cheers (F1)", () => {
  it("shows the viewer's latest three cheers with their notes, and no Contributions board", () => {
    const list = [cheer({ id: "ch-1", on: "2026-10-27" }), cheer({ id: "ch-2", fromId: "jordan", toIds: ["maya"], on: "2026-10-28", seenBy: ["maya"], note: "The quote was attached, thank you." }), cheer({ id: "ch-3", on: "2026-10-29" }), cheer({ id: "ch-4", on: "2026-10-31" })]
    mount(demo("maya", list), <YourCheers />)
    expect(screen.getByRole("heading", { name: "Your cheers" })).toBeTruthy()
    expect(screen.getByText("Only you see this")).toBeTruthy()
    const rows = screen.getAllByTestId("cheer-row")
    expect(rows.map(r => r.getAttribute("data-cheer"))).toEqual(["ch-4", "ch-3", "ch-2"])
    expect(rows[0].textContent).toContain("Today")
    expect(rows[2].textContent).toContain("From Jordan")
    expect(rows[2].textContent).toContain("+25")
    expect(screen.queryByTestId("contribution-board")).toBeNull()
    expect(screen.getByRole("button", { name: "View history" })).toBeTruthy()
    expect(screen.getByRole("meter", { name: "Points left this week" })).toBeTruthy()
  })
  it("shows a third officer nothing of another pair's cheers", () => {
    mount(demo("sam", [cheer({})]), <YourCheers />)
    expect(screen.queryAllByTestId("cheer-row")).toHaveLength(0)
    expect(screen.getByTestId("your-cheers").textContent).not.toContain(NOTE)
    expect(screen.getByText(/No cheers yet/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Give points" })).toBeTruthy()
  })
  it("opens the history dialog and closes it with Escape", async () => {
    mount(demo("maya", [cheer({})]), <YourCheers />)
    fireEvent.click(screen.getByRole("button", { name: "View history" }))
    const dialog = await screen.findByRole("dialog", { name: "Cheers history" })
    expect(dialog.textContent).toContain("Only you and the other person in each cheer can see it.")
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy()
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("Give points (F2)", () => {
  function Opened({ toIds, nodeId }: { toIds?: string[]; nodeId?: string }) {
    const rail = useRail()
    return <><button type="button" onClick={() => rail.show({ kind: "cheer", toIds, nodeId })}>open</button><GiveCheer toIds={toIds} nodeId={nodeId} /></>
  }
  it("keeps Send off until the note is long enough, and marks the note for the research log by a fixed name", () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    const send = screen.getByTestId("cheer-send") as HTMLButtonElement
    const note = screen.getByTestId("cheer-note") as HTMLTextAreaElement
    expect(note.getAttribute("data-log-name")).toBe("cheer-note")
    expect(note.required).toBe(true)
    expect(send.disabled).toBe(true)
    fireEvent.change(note, { target: { value: "Thanks" } })
    expect(send.disabled).toBe(true)
    expect(screen.getByTestId("cheer-problem").textContent).toBe("Write at least 10 characters.")
    fireEvent.change(note, { target: { value: NOTE } })
    expect(send.disabled).toBe(false)
    expect(screen.getByText(`${NOTE.length} / 280`)).toBeTruthy()
  })
  it("prefills the recipients and the task, and shows chips with remove buttons for several people", () => {
    const s = demo("alex", [])
    const node = s.nodes[0]
    mount(s, <Opened toIds={["maya", "jordan"]} nodeId={node.id} />)
    expect((screen.getByTestId("cheer-task") as HTMLSelectElement).value).toBe(node.id)
    expect(screen.getByRole("button", { name: "Remove Maya Chen" })).toBeTruthy()
    expect(screen.getByText("Points each")).toBeTruthy()
    expect(screen.getByTestId("cheer-send").textContent).toBe("Send 2 cheers")
    fireEvent.click(screen.getByRole("button", { name: "Remove Maya Chen" }))
    expect(screen.getByTestId("cheer-send").textContent).toBe("Send")
  })
  it("a quick start adds its phrase to the note without replacing what was written", () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    const note = screen.getByTestId("cheer-note") as HTMLTextAreaElement
    fireEvent.click(screen.getByRole("button", { name: "Clear details" }))
    expect(note.value).toBe("Clear details: ")
    fireEvent.change(note, { target: { value: "You attached the quote" } })
    fireEvent.click(screen.getByRole("button", { name: "Helped me out" }))
    expect(note.value).toBe("You attached the quote. Helped me out.")
  })
  it("points and card styles are pressed buttons with one choice", () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    expect(screen.getByRole("button", { name: "25" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "100" }))
    expect(screen.getByRole("button", { name: "100" }).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "25" }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: "Star card" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Teamwork card" }))
    expect(screen.getByRole("button", { name: "Teamwork card" }).getAttribute("aria-pressed")).toBe("true")
  })
})

describe("received cards (F5)", () => {
  const unseen = (id: string, on: string): Cheer => cheer({ id, on, note: `${NOTE} ${id}`, seenBy: [] })
  it("shows unseen cards oldest first, at most three, with a pager and the rest counted", async () => {
    mount(demo("jordan", [unseen("ch-1", "2026-10-27"), unseen("ch-2", "2026-10-28"), unseen("ch-3", "2026-10-29"), unseen("ch-4", "2026-10-30")]), <CardsHost />)
    const dialog = await screen.findByRole("dialog", { name: "Thank you, Jordan!" })
    expect(dialog.textContent).toContain(`${NOTE} ch-1`)
    expect(screen.getByTestId("cheer-card-count").textContent).toBe("1 of 3 new cheers")
    fireEvent.click(screen.getByTestId("cheer-card-next"))
    fireEvent.click(screen.getByTestId("cheer-card-next"))
    expect(screen.getByTestId("cheer-card-count").textContent).toBe("3 of 3 new cheers")
    expect(screen.getByRole("link", { name: "1 more on Team" })).toBeTruthy()
    act(() => { fireEvent.click(screen.getByTestId("cheer-card-close")) })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
  it("opens a linked card for its sender, and nothing for anyone else", async () => {
    const first = mount(demo("maya", [cheer({})]), <CardsHost />, "/?cheer=ch-1")
    expect((await screen.findByRole("dialog", { name: "Thank you, Jordan!" })).textContent).toContain(NOTE)
    first.unmount()
    mount(demo("sam", [cheer({})]), <CardsHost />, "/?cheer=ch-1")
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByRole("dialog")).toBeNull()
  })
  it("shows nothing when the viewer has no unseen card and no link", () => {
    mount(demo("jordan", [cheer({})]), <CardsHost />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
