import { afterEach, describe, expect, it } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { seedDemo } from "../data/seed"
import { StoreProvider } from "../data/store"
import type { Cheer, DemoState } from "../data/types"
import { RailProvider, useRail } from "../components/rail/RailContext"
import { YourCheers } from "../components/cheers/YourCheers"
import GiveCheer from "../components/cheers/GiveCheer"
import CheerHistory from "../components/cheers/CheerHistory"
import { CardsHost } from "../components/cheers/CardsHost"
import { joinNames, mondayOf, otherLabel, pointsLabel } from "../components/cheers/shared"
import { PrivateInbox } from "../components/PrivateInbox"
import { useStore } from "../data/store"
import { CHEER_CARD_NAME, CHEER_CARDS } from "../data/cheerRules"
import { describeClick, describeHover, installUiCapture, type UiEvent } from "../lib/uiLog"

// Cheers interface (R1, docs/feedback-fix/CHEERS_R1_CONTRACT.md §5; R1.1 amendments §8). These run against src/data/cheers.ts
// as it is, so they check what the screens show and keep private, not the model's rules (src/test/cheers*.test.ts covers those).
afterEach(() => { cleanup(); localStorage.clear() })

const NOTE = "Room booked two weeks early, so the caterer could confirm."
const cheer = (over: Partial<Cheer>): Cheer => ({ id: "ch-1", fromId: "maya", toIds: ["jordan"], points: 250, note: NOTE, card: "star", on: "2026-10-31", seenBy: ["jordan"], ...over })
function demo(viewerId: string, cheers: Cheer[]): DemoState {
  const s = seedDemo(undefined, "v2")
  return { ...s, viewerId, cheers: { cheers } }
}
function mount(state: DemoState, children: ReactNode, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}><StoreProvider initial={state}><RailProvider>{children}</RailProvider></StoreProvider></MemoryRouter>)
}
let read: () => DemoState = () => { throw new Error("not mounted") }
function Probe() { const { getState } = useStore(); read = getState; return null }
/** Collects the status messages the Cheers screens send to the shared toast. */
function toasts() {
  const got: string[] = []
  const on = (e: Event) => got.push(String((e as CustomEvent).detail))
  window.addEventListener("platypus:toast", on)
  return { got, stop: () => window.removeEventListener("platypus:toast", on) }
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
  it("labels a cheer from the viewer's side: sent costs points × recipients, received adds points, shared shows them unsigned", () => {
    const s = demo("maya", [])
    const sent = cheer({ toIds: ["jordan", "sam"], points: 50, ccIds: ["alex"] })
    expect(pointsLabel(sent, "maya")).toBe("−100")
    expect(pointsLabel(sent, "jordan")).toBe("+50")
    expect(pointsLabel(sent, "alex")).toBe("50")
    expect(pointsLabel(cheer({ points: 1500 }), "jordan")).toBe("+1,500")
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
    expect(rows[2].textContent).toContain("+250")
    expect(screen.queryByTestId("contribution-board")).toBeNull()
    expect(screen.getByRole("button", { name: "View history" })).toBeTruthy()
    expect(screen.getByRole("meter", { name: "Points left this week" })).toBeTruthy()
    // The interim allowance (§8.3): Maya sent 3 × 250 this week.
    expect(screen.getByTestId("cheer-left").textContent).toContain("250 / 1,000")
  })
  it("shows a third officer nothing of another pair's cheers", () => {
    mount(demo("sam", [cheer({})]), <YourCheers />)
    expect(screen.queryAllByTestId("cheer-row")).toHaveLength(0)
    expect(screen.getByTestId("your-cheers").textContent).not.toContain(NOTE)
    expect(screen.getByText(/No cheers yet/)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Give points" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "View history" })).toBeNull()
  })
  it("keeps a cheer the viewer was let know of off the Team rows, and offers it in the history", () => {
    mount(demo("alex", [cheer({ ccIds: ["alex"] })]), <YourCheers />)
    expect(screen.queryAllByTestId("cheer-row")).toHaveLength(0)
    expect(screen.getByTestId("your-cheers").textContent).not.toContain(NOTE)
    expect(screen.getByRole("button", { name: "View history" })).toBeTruthy()
  })
  it("opens the history dialog and closes it with Escape", async () => {
    mount(demo("maya", [cheer({})]), <YourCheers />)
    fireEvent.click(screen.getByRole("button", { name: "View history" }))
    const dialog = await screen.findByRole("dialog", { name: "Cheers history" })
    expect(dialog.textContent).toContain("Only the people in each cheer can see it.")
    expect(screen.getByRole("heading", { name: "This week" })).toBeTruthy()
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("Give points (F2, R1.1)", () => {
  function Opened({ toIds, nodeId }: { toIds?: string[]; nodeId?: string }) {
    const rail = useRail()
    return <><button type="button" onClick={() => rail.show({ kind: "cheer", toIds, nodeId })}>open</button><Probe /><GiveCheer toIds={toIds} nodeId={nodeId} /></>
  }
  const note = () => screen.getByTestId("cheer-note") as HTMLTextAreaElement
  const points = () => screen.getByTestId("cheer-points") as HTMLInputElement

  it("keeps Send off until the note is long enough, and marks the note for the research log by a fixed name", () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    const send = screen.getByTestId("cheer-send") as HTMLButtonElement
    expect(note().getAttribute("data-log-name")).toBe("cheer-note")
    expect(note().required).toBe(true)
    expect(send.disabled).toBe(true)
    fireEvent.change(note(), { target: { value: "Thanks" } })
    expect(send.disabled).toBe(true)
    expect(screen.getByTestId("cheer-problem").textContent).toBe("Write at least 10 characters.")
    fireEvent.change(note(), { target: { value: NOTE } })
    expect(send.disabled).toBe(false)
    expect(screen.getByText(`${NOTE.length} / 280`)).toBeTruthy()
  })

  it("labels the note with the question and a small asterisk; screen readers hear that it is required", () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    const field = screen.getByLabelText(/What did they do, and how did it help\?/) as HTMLTextAreaElement
    expect(field).toBe(note())
    expect(field.getAttribute("aria-required")).toBe("true")
    const label = document.querySelector(`label[for="${field.id}"]`)!
    expect(label.querySelector(".ch-req")?.textContent).toBe("*")
    expect(label.querySelector(".ch-req")?.getAttribute("aria-hidden")).toBe("true")
    expect(label.querySelector(".sr-only")?.textContent).toMatch(/required/)
    expect(screen.queryByText("Required")).toBeNull()
  })

  it("has no task field and no quick starts; a task from the thank prompt is still sent with the cheer", async () => {
    const s = demo("alex", [])
    mount(s, <Opened toIds={["jordan"]} nodeId="t-checkin" />)
    expect(screen.queryByTestId("cheer-task")).toBeNull()
    expect(screen.queryByText(/For a task/)).toBeNull()
    for (const q of ["Delivered on time", "Clear details", "Helped me out", "Great teamwork"]) expect(screen.queryByRole("button", { name: q })).toBeNull()
    fireEvent.change(note(), { target: { value: NOTE } })
    fireEvent.click(screen.getByTestId("cheer-send"))
    fireEvent.click(await screen.findByTestId("cheer-confirm-send"))
    await waitFor(() => expect(read().cheers?.cheers).toHaveLength(1))
    expect(read().cheers!.cheers[0]).toMatchObject({ toIds: ["jordan"], nodeId: "t-checkin", points: 100, email: true })
  })

  it("prefills the recipients and shows chips with remove buttons for several people", () => {
    mount(demo("alex", []), <Opened toIds={["maya", "jordan"]} />)
    expect(screen.getByRole("button", { name: "Remove Maya Chen" })).toBeTruthy()
    expect(screen.getByLabelText("Points each")).toBe(points())
    expect(screen.getByTestId("cheer-send").textContent).toBe("Send 2 cheers")
    fireEvent.click(screen.getByRole("button", { name: "Remove Maya Chen" }))
    expect(screen.getByTestId("cheer-send").textContent).toBe("Send")
  })

  it("points: − and + move in steps of 50 from 100 up to what is left; any whole number from 100 can be typed", () => {
    // Maya has 1,000 a week; she already sent 700, so 300 are left.
    mount(demo("maya", [cheer({ points: 700, on: "2026-10-27" })]), <Opened toIds={["jordan"]} />)
    fireEvent.change(note(), { target: { value: NOTE } })
    const down = screen.getByRole("button", { name: "Fewer points" }) as HTMLButtonElement
    const up = screen.getByRole("button", { name: "More points" }) as HTMLButtonElement
    expect(points().value).toBe("100")
    expect(points()).toMatchObject({ type: "number", min: "100", step: "50", max: "300" })
    expect(down.disabled).toBe(true)
    fireEvent.click(up)
    expect(points().value).toBe("150")
    fireEvent.click(up); fireEvent.click(up); fireEvent.click(up)
    expect(points().value).toBe("300")
    expect(up.disabled).toBe(true)
    fireEvent.click(down)
    expect(points().value).toBe("250")
    // Typed: any whole number from 100, at most what is left; the buttons snap back onto steps of 50.
    fireEvent.change(points(), { target: { value: "130" } })
    expect(screen.getByTestId("cheer-problem").textContent).toBe("")
    fireEvent.click(up)
    expect(points().value).toBe("150")
    fireEvent.change(points(), { target: { value: "130" } })
    fireEvent.click(down)
    expect(points().value).toBe("100")
    for (const [typed, problem] of [["99", "Give at least 100 points."], ["150.5", "Enter whole points."], ["", "Enter whole points."], ["301", "Only 300 points left this week."]]) {
      fireEvent.change(points(), { target: { value: typed } })
      expect(screen.getByTestId("cheer-problem").textContent, typed).toBe(problem)
      expect((screen.getByTestId("cheer-send") as HTMLButtonElement).disabled, typed).toBe(true)
    }
    // From a typed value above what is left, − goes straight to the last step that fits.
    fireEvent.change(points(), { target: { value: "420" } })
    fireEvent.click(down)
    expect(points().value).toBe("300")
    fireEvent.change(points(), { target: { value: "100" } })
    expect(screen.getByTestId("cheer-problem").textContent).toBe("")
  })

  it("trophies are pressed buttons with one choice, the R1 emoji among them", () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    const group = screen.getByRole("group", { name: "Trophy" })
    const buttons = within(group).getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(8)
    expect(buttons.map(b => b.getAttribute("aria-label"))).toEqual(CHEER_CARDS.map(c => CHEER_CARD_NAME[c]))
    expect(group.textContent).toContain("🏆")
    for (const e of ["⭐", "🙌", "🤝"]) expect(group.textContent).toContain(e)
    expect(within(group).getByRole("button", { name: "Trophy" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(within(group).getByRole("button", { name: "Rocket" }))
    expect(within(group).getByRole("button", { name: "Rocket" }).getAttribute("aria-pressed")).toBe("true")
    expect(within(group).getByRole("button", { name: "Trophy" }).getAttribute("aria-pressed")).toBe("false")
  })

  it("Send asks first; Cancel and Escape go back to the form with focus on Send, and nothing is sent", async () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    fireEvent.change(note(), { target: { value: NOTE } })
    fireEvent.click(screen.getByRole("button", { name: "More points" }))
    fireEvent.click(screen.getByRole("button", { name: "More points" }))
    fireEvent.click(screen.getByRole("button", { name: "More points" })) // 250
    fireEvent.change(points(), { target: { value: "300" } })
    const send = screen.getByTestId("cheer-send")
    send.focus()
    fireEvent.click(send)
    const dialog = await screen.findByRole("dialog", { name: "Send 300 points to Jordan Patel?" })
    expect(dialog.textContent).toContain("You can't undo this.")
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }))
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(document.activeElement).toBe(send)
    fireEvent.click(send)
    await screen.findByRole("dialog")
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(document.activeElement).toBe(send)
    expect(read().cheers?.cheers).toEqual([])
  })

  it("Send in the dialog sends, records the email, and the toast says who will get one; there is no Also email", async () => {
    const t = toasts()
    mount(demo("maya", []), <Opened toIds={["jordan", "sam"]} />)
    expect(screen.queryByText("Also email")).toBeNull()
    expect(screen.queryByTestId("cheer-email")).toBeNull()
    fireEvent.change(note(), { target: { value: NOTE } })
    fireEvent.click(screen.getByTestId("cheer-send"))
    const dialog = await screen.findByRole("dialog", { name: "Send 100 points each to Jordan Patel and Sam Okafor?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Send" }))
    await waitFor(() => expect(read().cheers?.cheers).toHaveLength(1))
    expect(read().cheers!.cheers[0]).toMatchObject({ toIds: ["jordan", "sam"], points: 100, card: "trophy", email: true })
    expect(t.got).toEqual(["Cheer sent. Jordan and Sam will each get an email."])
    t.stop()
  })

  it("the toast names one recipient by first name", async () => {
    const t = toasts()
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    fireEvent.change(note(), { target: { value: NOTE } })
    fireEvent.click(screen.getByTestId("cheer-send"))
    fireEvent.click(await screen.findByTestId("cheer-confirm-send"))
    await waitFor(() => expect(t.got).toEqual(["Cheer sent. Jordan will get an email."]))
    t.stop()
  })

  it("let others know: the president first, chosen people as chips, never the sender or a recipient, sent with the cheer", async () => {
    mount(demo("maya", []), <Opened toIds={["jordan"]} />)
    const add = screen.getByLabelText("Let others know too (optional)") as HTMLSelectElement
    expect(add.getAttribute("data-log-value")).toBe("omit")
    expect(add.getAttribute("data-log-name")).toBe("cheer-cc-add")
    const groups = [...add.querySelectorAll("optgroup")].map(g => [g.label, [...g.querySelectorAll("option")].map(o => o.value)])
    expect(groups).toEqual([["Suggested", ["alex"]], ["Other officers", ["priya", "sam"]]])
    fireEvent.change(add, { target: { value: "alex" } })
    fireEvent.change(screen.getByLabelText("Let others know too (optional)"), { target: { value: "priya" } })
    const chips = screen.getByTestId("cheer-cc")
    expect(within(chips).getByRole("button", { name: "Do not tell Alex Rivera" }).getAttribute("data-log-name")).toBe("cheer-cc-remove")
    expect([...(screen.getByLabelText("Let others know too (optional)") as HTMLSelectElement).options].map(o => o.value)).toEqual(["", "sam"])
    fireEvent.change(note(), { target: { value: NOTE } })
    fireEvent.click(screen.getByTestId("cheer-send"))
    const dialog = await screen.findByRole("dialog")
    expect(dialog.textContent).toContain("Alex and Priya will see it too.")
    fireEvent.click(within(dialog).getByRole("button", { name: "Send" }))
    await waitFor(() => expect(read().cheers?.cheers).toHaveLength(1))
    expect(read().cheers!.cheers[0].ccIds).toEqual(["alex", "priya"])
  })
})

describe("history and the email text (F3, R1.1)", () => {
  it("has no Withdraw, and a small Email link that shows the email the recipient got", async () => {
    const s = demo("maya", [cheer({ email: true, nodeId: "e-night:venue" }), cheer({ id: "ch-2", fromId: "jordan", toIds: ["maya"], seenBy: ["maya"], on: "2026-10-29" })])
    mount(s, <CheerHistory onClose={() => {}} />)
    const dialog = screen.getByRole("dialog", { name: "Cheers history" })
    expect(within(dialog).queryByText("Withdraw")).toBeNull()
    expect(within(dialog).queryByTestId("cheer-withdraw")).toBeNull()
    // Only the cheer that was emailed (every cheer since R1.1) has the link; an R1 cheer without one does not.
    const toggles = within(dialog).getAllByRole("button", { name: "Email" })
    expect(toggles).toHaveLength(1)
    expect(toggles[0].getAttribute("aria-expanded")).toBe("false")
    expect(toggles[0].getAttribute("data-log-name")).toBe("cheer-email")
    fireEvent.click(toggles[0])
    expect(toggles[0].getAttribute("aria-expanded")).toBe("true")
    const text = within(dialog).getByTestId("cheer-email-text")
    expect(text.textContent).toContain("From Platypus to Jordan Patel")
    expect(text.textContent).toContain("⭐ Maya sent you 250 points")
    expect(text.textContent).toContain("Hi Jordan,")
    expect(text.textContent).toContain(`Why: “${NOTE}”`)
    expect(text.textContent).toContain("#/?cheer=ch-1")
    fireEvent.click(toggles[0])
    expect(within(dialog).queryByTestId("cheer-email-text")).toBeNull()
  })

  it("the recipient sees their own email from the card's Email link", async () => {
    mount(demo("jordan", [cheer({ email: true })]), <CardsHost />, "/?cheer=ch-1")
    const dialog = await screen.findByRole("dialog", { name: "Thank you, Jordan!" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Email" }))
    const text = within(dialog).getByTestId("cheer-email-text")
    expect(text.textContent).toContain("From Platypus to you")
    expect(text.textContent).toContain("Hi Jordan,")
  })

  it("a person let know sees the cheer under Shared with you, read-only, with no points of theirs and no email", async () => {
    const s = demo("alex", [cheer({ email: true, ccIds: ["alex"] }), cheer({ id: "ch-2", fromId: "sam", toIds: ["alex"], seenBy: ["alex"], on: "2026-10-29" })])
    mount(s, <CheerHistory onClose={() => {}} />)
    const dialog = screen.getByRole("dialog", { name: "Cheers history" })
    const shared = within(dialog).getByRole("region", { name: "Shared with you" })
    const row = within(shared).getByTestId("cheer-row")
    expect(row.getAttribute("data-dir")).toBe("cc")
    expect(row.textContent).toContain("From Maya to Jordan")
    expect(row.textContent).toContain(NOTE)
    expect(row.querySelector(".ch-pts")?.textContent).toBe("250")
    expect(within(row).queryByRole("button", { name: "Email" })).toBeNull()
    // Points are not counted for them: only Sam's 250 to Alex is received.
    expect(dialog.querySelector(".ch-stat b")?.textContent).toBe("250")
    fireEvent.click(within(dialog).getByRole("button", { name: "Shared with you" }))
    expect(within(dialog).getAllByTestId("cheer-row")).toHaveLength(1)
  })

  it("the notice to a person let know carries the note and opens the card read-only; a fourth person sees nothing", async () => {
    const s = demo("alex", [cheer({ email: true, ccIds: ["alex"] })])
    const notice = { id: "cheer-cc:ch-1:alex", recipientId: "alex", nodeId: "", kind: "cheer" as const, text: `Maya recognized Jordan: “${NOTE}”`, createdOn: "2026-10-31", read: false, cheerId: "ch-1" }
    const first = mount({ ...s, notifications: [...s.notifications, notice] }, <PrivateInbox />)
    const link = screen.getByTestId("inbox-cheer")
    expect(link.textContent).toBe(`Maya recognized Jordan: “${NOTE}”`)
    expect(link.getAttribute("href")).toContain("cheer=ch-1")
    expect(link.getAttribute("data-log-name")).toBe("inbox-cheer")
    first.unmount()
    const card = mount(s, <CardsHost />, "/?cheer=ch-1")
    const dialog = await screen.findByRole("dialog", { name: "Thank you, Jordan!" })
    expect(dialog.textContent).toContain(NOTE)
    expect(screen.getByTestId("cheer-card-count").textContent).toBe("Maya shared this with you.")
    expect(within(dialog).queryByRole("button", { name: "Email" })).toBeNull()
    expect(within(dialog).getAllByRole("button").map(b => b.textContent)).toEqual(["Close"])
    card.unmount()
    mount(demo("priya", [cheer({ email: true, ccIds: ["alex"] })]), <CardsHost />, "/?cheer=ch-1")
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByRole("dialog")).toBeNull()
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
  it("shows an R1 card value with its old emoji and a new trophy with its own", async () => {
    const first = mount(demo("jordan", [cheer({ card: "teamwork", points: 25 })]), <CardsHost />, "/?cheer=ch-1")
    const dialog = await screen.findByRole("dialog", { name: "Thank you, Jordan!" })
    expect(dialog.querySelector(".ch-deco")?.textContent).toBe("🤝")
    expect(dialog.querySelector(".ch-card-pts")?.textContent).toBe("+25")
    first.unmount()
    mount(demo("jordan", [cheer({ card: "rocket", points: 1500 })]), <CardsHost />, "/?cheer=ch-1")
    const next = await screen.findByRole("dialog", { name: "Thank you, Jordan!" })
    expect(next.querySelector(".ch-deco")?.textContent).toBe("🚀")
    expect(next.querySelector(".ch-card-pts")?.textContent).toBe("+1,500")
  })
  it("shows nothing when the viewer has no unseen card and no link", () => {
    mount(demo("jordan", [cheer({})]), <CardsHost />)
    expect(screen.queryByRole("dialog")).toBeNull()
  })
  it("closing marks the cards shown so far as seen, and only those", async () => {
    mount(demo("jordan", [unseen("ch-1", "2026-10-27"), unseen("ch-2", "2026-10-28"), unseen("ch-3", "2026-10-29"), unseen("ch-4", "2026-10-30")]), <><Probe /><CardsHost /></>)
    await screen.findByRole("dialog", { name: "Thank you, Jordan!" })
    fireEvent.click(screen.getByTestId("cheer-card-next"))
    fireEvent.click(screen.getByTestId("cheer-card-next"))
    act(() => { fireEvent.click(screen.getByTestId("cheer-card-close")) })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    const seen = (read().cheers?.cheers ?? []).filter(c => c.seenBy.includes("jordan")).map(c => c.id)
    expect(seen).toEqual(["ch-1", "ch-2", "ch-3"])
  })
})

describe("private inbox: cheer notices", () => {
  const notice = (id: string, cheerId: string, read = false) => ({ id, recipientId: "jordan", nodeId: "", kind: "cheer" as const, text: "Maya sent you 25 points.", createdOn: "2026-10-31", read, cheerId })
  it("hides the notice of a withdrawn or missing cheer, and does not count it as unread", () => {
    const s = demo("jordan", [cheer({ id: "ch-1" }), cheer({ id: "ch-2", withdrawnOn: "2026-10-31" })])
    const own = s.notifications.filter(n => n.recipientId === "jordan")
    mount({ ...s, notifications: [...own, notice("cheer:ch-1:jordan", "ch-1"), notice("cheer:ch-2:jordan", "ch-2"), notice("cheer:ch-9:jordan", "ch-9")] }, <PrivateInbox />)
    const links = screen.getAllByTestId("inbox-cheer")
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toContain("cheer=ch-1")
    const unread = own.filter(n => !n.read).length + 1
    expect(screen.getByText(`${unread} unread`)).toBeTruthy()
  })
})

describe("research log: Cheers never names who was cheered, who was let know, or the task", () => {
  it("the send form's choices, the confirmation, the Team row's hover card, the Email link and the inbox link are logged by fixed names only", async () => {
    const s = demo("alex", [cheer({ id: "ch-1", fromId: "maya", toIds: ["alex"], nodeId: "e-night:venue", seenBy: ["alex"], email: true })])
    const task = s.nodes.find(n => n.id === "e-night:venue")!
    const got: UiEvent[] = []
    const stop = installUiCapture(document, e => got.push(e), { trustedOnly: false })
    const notices = [{ id: "cheer:ch-1:alex", recipientId: "alex", nodeId: "e-night:venue", kind: "cheer" as const, text: "Maya sent you 250 points.", createdOn: "2026-10-31", read: false, cheerId: "ch-1" }]
    mount({ ...s, notifications: notices }, <><YourCheers /><PrivateInbox /><GiveCheer nodeId={task.id} /></>, "/team")
    // Give points: choose two people, then remove one; let two others know, then remove one; points and a trophy.
    fireEvent.change(screen.getByTestId("cheer-to"), { target: { value: "jordan" } })
    fireEvent.click(screen.getByRole("button", { name: "+ Add someone" }))
    fireEvent.change(screen.getByLabelText("Add a teammate"), { target: { value: "maya" } })
    fireEvent.click(screen.getByRole("button", { name: "Remove Maya Chen" }))
    fireEvent.change(screen.getByLabelText("Let others know too (optional)"), { target: { value: "sam" } })
    fireEvent.change(screen.getByLabelText("Let others know too (optional)"), { target: { value: "priya" } })
    fireEvent.click(screen.getByRole("button", { name: "Do not tell Priya Nair" }))
    fireEvent.click(screen.getByRole("button", { name: "More points" }))
    fireEvent.click(screen.getByRole("button", { name: "Heart" }))
    fireEvent.change(screen.getByTestId("cheer-note"), { target: { value: NOTE } })
    fireEvent.click(screen.getByTestId("cheer-send"))
    fireEvent.click(await screen.findByTestId("cheer-confirm-send"))
    // The history's Email link.
    fireEvent.click(screen.getByRole("button", { name: "View history" }))
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Cheers history" })).getAllByRole("button", { name: "Email" })[0])
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    // The inbox's cheer link.
    fireEvent.click(screen.getByTestId("inbox-cheer"))
    stop()
    // The Team row's hover card (written when it closes, here directly).
    const row = screen.getAllByTestId("cheer-row-who")[0].closest(".hover")!
    got.push(describeHover(row, 800, "mouse", "/team")!)
    const changes = got.filter(e => e.type === "ui.change")
    expect(changes.map(e => e.payload.name)).toEqual(["To", "Add a teammate", "cheer-cc-add", "cheer-cc-add"])
    for (const e of changes) expect(e.payload).not.toHaveProperty("value")
    const clicks = got.filter(e => e.type === "ui.click").map(e => e.payload.name)
    expect(clicks).toEqual(expect.arrayContaining(["cheer-remove", "cheer-cc-remove", "More points", "Heart", "Send", "cheer-email", "inbox-cheer"]))
    expect(got.find(e => e.type === "ui.hover")?.payload.name).toBe("cheer-row")
    expect(describeClick(screen.getByTestId("inbox-cheer"), "/", "http://localhost")?.payload.name).toBe("inbox-cheer")
    const text = JSON.stringify(got)
    for (const p of s.people) for (const part of p.name.split(" ")) expect(text, `${p.name} in the log`).not.toContain(part)
    expect(text).not.toContain(task.title)
    expect(text).not.toContain("caterer")
  })
})
