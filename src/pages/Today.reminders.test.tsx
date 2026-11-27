import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { RailProvider, useRail } from "../components/rail/RailContext"
import { BtsProvider, useBts } from "../components/Bts"
import { StoreProvider, reducer, STORAGE_KEY, useStore } from "../data/store"
import { seedDemo } from "../data/seed"
import { applySchedule } from "../engine/schedule"
import type { DemoState, ReminderMode } from "../data/types"
import { createReminderRuntime } from "../reminders/engine"
import * as digest from "../reminders/digest"
import type { PreparedDigest, ReminderDigestSnapshot } from "../reminders/digestContracts"
import { ReminderHistoryPanel } from "../reminders/DigestPanel"
import { addDays } from "../lib/dates"
import type { ReminderDelivery } from "../reminders/contracts"
import Today from "./Today"

// The engine's prepare/record/send are owned elsewhere; the page is tested against the frozen contract.
// By default each mock calls the real function, so engine-driven paths (automatic mode) keep their real behaviour.
vi.mock("../reminders/digest", async importOriginal => {
  const real = await importOriginal<typeof import("../reminders/digest")>()
  return { ...real, prepareReminderDigest: vi.fn(real.prepareReminderDigest), recordReminderDigests: vi.fn(real.recordReminderDigests), sendReminderDigests: vi.fn(real.sendReminderDigests) }
})
const prepare = vi.mocked(digest.prepareReminderDigest), record = vi.mocked(digest.recordReminderDigests), sendAll = vi.mocked(digest.sendReminderDigests)
const actual = await vi.importActual<typeof import("../reminders/digest")>("../reminders/digest")

let latest: DemoState
let rail: ReturnType<typeof useRail>
function Observer() { latest = useStore().state; rail = useRail(); return null }
function HideNotes() { const {setOn} = useBts(); return <button type="button" onClick={() => setOn(false)}>Hide calculation notes</button> }
/** The reminder kind of the right rail (History), without the rest of the rail (Ask needs a server). */
function Details() {
  const r = useRail()
  if (r.detail?.kind === "reminderHistory") return <ReminderHistoryPanel />
  return r.detail ? <p data-testid="other-detail">{r.detail.kind}:{"id" in r.detail ? r.detail.id : ""}</p> : null
}
function fixture(mode: ReminderMode = "review_then_auto", active = true): DemoState {
  const s = seedDemo(undefined, "v2")
  const event = { ...s.events[0], id: "centre-event", name: "Speaker Night", date: "2026-11-19", headcount: 40, venue: "campus" as const, budgetItems: [] }
  const original = s.nodes.find(n => n.id === "t-room")!
  const nodes = ["room", "room-two"].map(id => ({ ...original, id, eventId: event.id, title: id === "room" ? "Reserve a room" : "Confirm the room layout", ownerVersion: 0,
    dependsOn: [], status: "accepted" as const, anchor: { kind: "fixed" as const, official: null, club: "2026-11-05" } }))
  const scheduled = applySchedule({ ...s, nodes, events: [event], nudges: [], protocolLog: [], notifications: [], funding: [], silenceCases: [], extensionRequests: [],
    org: { ...s.org, settings: { ...s.org.settings, reminderMode: mode } } })
  const state = { ...scheduled, today: scheduled.nodes[0].latestStart! }
  return active ? reducer(state, { type: "upgradeReminderPlan" }) : state
}
/** The shipped seed club on its demo day (Sat Oct 31): 3 people, 5 tasks, 8 to fix. */
const seedClub = (mode: ReminderMode | null = "review_then_auto") => reducer({ ...seedDemo(undefined, "v2"), org: { ...seedDemo(undefined, "v2").org, settings: { ...seedDemo(undefined, "v2").org.settings, reminderMode: mode ?? undefined } } }, { type: "upgradeReminderPlan" })
const show = (state = fixture(), path = "/") => render(<MemoryRouter initialEntries={[path]}><StoreProvider initial={state}><RailProvider><Observer /><Today /><Details /></RailProvider></StoreProvider></MemoryRouter>)
const feedback = () => screen.getByTestId("rq-feedback")
const section = (id: string) => within(screen.getByTestId(id))
const people = () => screen.getAllByTestId("rq-person")
const fakePrepared = (state: DemoState, groupId: string): PreparedDigest => {
  const group = digest.planReminderDigests(state).groups.find(g => g.id === groupId)!
  const urls = group.candidates.map((c, i) => `http://localhost/#/events?node=${c.nodeId}&access=t${i}`)
  const name = state.people.find(p => p.id === group.recipientId)!.name
  const subject = `${group.candidates.length} Platypus task${group.candidates.length === 1 ? "" : "s"} need you`
  const body = `Hi ${name.split(" ")[0]},\n\n${group.candidates.map((c, i) => `${i + 1}. ${state.nodes.find(n => n.id === c.nodeId)!.title}\nOpen task: ${urls[i]}`).join("\n\n")}\n\nThank you`
  return { groupId, recipientId: group.recipientId, entries: [], digest: { version: 1, groupId, recipientId: group.recipientId, recipientName: name, intendedEmail: `${group.recipientId}@example.org`,
    channel: "email", preparedOn: state.today, subject, body, text: `${subject}\n\n${body}`, taskUrls: urls, nodeIds: group.candidates.map(c => c.nodeId), wordCount: 20, checked: true, source: "rules" } }
}
/** A complete saved ledger in which one group was recorded today as one email (digest + one delivery per task). */
function recordedToday(state: DemoState, groupIndex: number, via: "platypus" | "automatic" = "platypus"): DemoState {
  const runtime = state.reminderRuntime!, group = digest.planReminderDigests(state).groups[groupIndex], base = runtime.sequence
  const id = `reminder-digest:${base + group.candidates.length + 1}`
  const name = state.people.find(p => p.id === group.recipientId)!.name
  const snap: ReminderDigestSnapshot = { version: 1, id, groupId: group.id, recipientId: group.recipientId, recipientName: name, intendedEmail: `${group.recipientId}@example.org`,
    channel: "email", preparedOn: state.today, sentOn: state.today, via, subject: "Your tasks", body: "Hi", text: "Your tasks\n\nHi",
    taskUrls: group.candidates.map((_, i) => `http://localhost/#/t${i}`), nodeIds: group.candidates.map(c => c.nodeId), wordCount: 1, checked: true, source: "rules" }
  const deliveries = group.candidates.map((c, i) => ({ id: `d${i}`, candidateId: c.id, nodeId: c.nodeId, recipientId: group.recipientId, ownerId: c.ownerId, ownerVersion: c.ownerVersion,
    planKey: c.planKey, reason: c.reason, scheduledOn: c.scheduledOn, sentOn: state.today, sequence: base + i + 1, via, recipientName: name,
    taskTitle: state.nodes.find(n => n.id === c.nodeId)!.title, eventName: null, due: c.due, outcome: "simulated" as const, digestId: id }))
  const sequence = base + group.candidates.length + 1
  return { ...state, reminderRuntime: { ...runtime, deliveries: [...runtime.deliveries, ...deliveries], digests: [snap], sequence, mailRequiredAfter: sequence } }
}
beforeEach(() => {
  localStorage.clear(); vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", vi.fn())
  prepare.mockImplementation(async (store, groupId) => fakePrepared(store.getState(), groupId))
  record.mockImplementation((_store, prepared) => ({ recordedGroupIds: prepared.map(p => p.groupId), failedGroupIds: [], error: null }))
})
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); prepare.mockReset(); record.mockReset(); sendAll.mockReset() })
const sendAllSucceeds = () => sendAll.mockImplementation(async (_store, groupIds) => ({ recordedGroupIds: groupIds, failedGroupIds: [], error: null }))

describe("reminder centre (concept F): one email per person", () => {
  it.each(["alex", "jordan"])("keeps optional calculation notes for %s and removes them from the DOM when off", viewerId => {
    localStorage.setItem("platypus.v1.bts", "1")
    render(<MemoryRouter><StoreProvider initial={{...fixture(), viewerId}}><BtsProvider><RailProvider><Today /><HideNotes /></RailProvider></BtsProvider></StoreProvider></MemoryRouter>)
    const area = screen.getByTestId(viewerId === "alex" ? "reminder-centre" : "your-reminders")
    expect(area.querySelectorAll(".bts").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", {name: "Hide calculation notes"}))
    expect(document.querySelector(".bts, .bts-row")).toBeNull()
  })

  it("groups one person's tasks into one row with a reason chip per task; the head is one short line", () => {
    const s = fixture()
    show({ ...s, today: s.nodes[0].clubDeadline! })
    expect(people()).toHaveLength(1)
    const jordan = within(people()[0])
    expect(people()[0].dataset.recipient).toBe("jordan")
    expect(jordan.getByText("Jordan Patel")).toBeTruthy()
    expect(jordan.getAllByTestId("rq-person-task").map(t => t.dataset.node)).toEqual(["room", "room-two"])
    expect(jordan.getAllByText("Due today")).toHaveLength(2)
    expect(within(screen.getByTestId("rq-summary")).getByText("1 person to remind")).toBeTruthy()
    // S2: no mode chip, progress dots, other-task count, reminder-limit line or next check while there is something to send.
    for (const id of ["reminder-mode-chip", "change-mode", "rq-held", "rq-next"]) expect(screen.queryByTestId(id)).toBeNull()
    expect(document.querySelector(".dg-steps, .dg-more")).toBeNull()
    expect(screen.queryByText(/other open task/)).toBeNull()
    expect(screen.queryByTestId("rq-fix")).toBeNull()
    expect(screen.queryByTestId("rq-history")).toBeNull()
  })

  it("counts people and keeps problems apart under Fix first (seed club: 3 people, 5 tasks, 8 to fix)", () => {
    const s = seedClub()
    show(s)
    const groups = digest.planReminderDigests(s).groups
    expect(people().map(p => p.dataset.recipient)).toEqual(groups.map(g => g.recipientId))
    expect(within(screen.getByTestId("rq-summary")).getByText(`${groups.length} people to remind`)).toBeTruthy()
    expect(screen.getAllByTestId("rq-person-task")).toHaveLength(5)
    const fix = within(screen.getByTestId("rq-fix"))
    // Step 0: the count is read as "Fix first, 8"; the comma is for screen readers only.
    expect(screen.getByRole("heading", { level: 2, name: "Fix first, 8" })).toBeTruthy()
    expect(fix.getAllByTestId("rq-row")).toHaveLength(8)
    // Each button names what it does and for which task; nothing reads as an in-place Assign or Help.
    const waits = fix.getAllByRole("button", { name: /^Choose who this waits on: / })
    expect(waits.length).toBeGreaterThan(0)
    for (const b of waits) expect(b.textContent).toBe("Choose")
    expect(fix.getAllByText("Waiting on whom?")).toHaveLength(waits.length)
    const opens = fix.getAllByRole("button", { name: /^Open task: / })
    expect(opens.length + waits.length).toBe(8)
    for (const b of opens) expect(b.textContent).toBe("Open task")
    expect(fix.queryAllByRole("button", { name: /^(Assign|Help|Review)\b/ })).toHaveLength(0)
    expect(fix.queryByText("Pick who it waits on")).toBeNull()
    // R-S0 W2: real task statuses use the fixed status pills ("No owner" is the Not claimed status); reasons are one neutral chip.
    expect(fix.queryByText("No owner")).toBeNull()
    expect(fix.getAllByText("Not claimed").map(el => [el.className, el.dataset.status])).toEqual([["pill", "unclaimed"], ["pill", "unclaimed"]])
    expect(fix.getAllByText("Stuck").map(el => [el.className, el.dataset.status])).toEqual([["pill", "blocked"], ["pill", "blocked"]])
    expect(document.querySelector(".dg-chip.late, .dg-chip.warn, .dg-chip.info")).toBeNull()
    // Person rows: no risk mark (RiskDot) and no "Late to start"; "At risk" is text after the title.
    expect(screen.getByTestId("rq-people").querySelector("[data-testid=forecast], .risk")).toBeNull()
    expect(screen.queryByText("Late to start")).toBeNull()
    expect(screen.getAllByText("No start update").every(el => el.className === "dg-chip")).toBe(true)
    expect(screen.getAllByTestId("rq-at-risk").length).toBeGreaterThan(0)
    for (const line of screen.getAllByTestId("rq-person-task")) {
      const risk = within(line).queryByTestId("rq-at-risk")
      if (risk) expect(risk.closest(".dg-task-title")!.textContent).toMatch(/ · At risk$/)
    }
    const fixed = new Set(fix.getAllByTestId("rq-row").map(r => r.dataset.node))
    expect(screen.getAllByTestId("rq-person-task").some(t => fixed.has(t.dataset.node))).toBe(false)
    // B3: today's tasks are not repeated as coming up; the next check shows only when nothing is left to send.
    expect(screen.queryByTestId("rq-this-week")).toBeNull()
    expect(screen.queryByTestId("rq-next")).toBeNull()
  })

  it("shows the next check only when there is nothing to send today", () => {
    const s = seedClub()
    const empty = { ...s, nodes: s.nodes.map(n => ({ ...n, status: "done" as const })) }
    show(empty)
    expect(screen.getByTestId("rq-summary").textContent).toContain("Nothing to send today.")
    expect(screen.queryAllByTestId("rq-person")).toHaveLength(0)
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
  })

  it("review_then_auto: Send all records every group through the digest service", async () => {
    sendAllSucceeds()
    const s = seedClub("review_then_auto")
    show(s)
    const ids = digest.planReminderDigests(s).groups.map(g => g.id)
    // Step 0: the button names its count, and its accessible name is the same.
    expect(screen.getAllByRole("button", { name: /^Send \d+ emails?$/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Send 3 emails" }))
    await waitFor(() => expect(feedback().textContent).toBe("Sent to all 3 today."))
    expect(feedback().getAttribute("role")).toBe("status")
    expect(within(screen.getByTestId("rq-summary")).getByTestId("rq-feedback")).toBe(feedback())
    // Focus goes to the summary line, never to the page body.
    expect(document.activeElement).toBe(screen.getByTestId("rq-summary-line"))
    expect(sendAll).toHaveBeenCalledTimes(1)
    expect(sendAll.mock.calls[0].slice(1, 4)).toEqual([ids, window.location.origin, "platypus"])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows the service's error in the status line instead of claiming success", async () => {
    sendAll.mockResolvedValueOnce({ recordedGroupIds: [], failedGroupIds: ["x"], error: "Not implemented yet." })
    show(seedClub("review_then_auto"))
    fireEvent.click(screen.getByTestId("send-all-digests"))
    await screen.findByText("Not implemented yet.")
    expect(screen.queryByText(/^Sent to/)).toBeNull()
  })

  it("a row expands in place to show that person's full email, without opening the rail", async () => {
    show(seedClub("review_then_auto"))
    const maya = within(people()[0])
    const toggle = maya.getByRole("button", { name: "Email to Maya Chen" })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    const region = document.getElementById(toggle.getAttribute("aria-controls")!)!
    expect(region.hidden).toBe(true)
    expect(prepare).not.toHaveBeenCalled()
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    expect(region.hidden).toBe(false)
    await within(region).findByText("To: maya@example.org")
    // R-S0 W2: the subject is plain text, not a heading.
    expect(within(region).getByTestId("digest-subject").textContent).toBe("1 Platypus task need you")
    expect(within(region).queryByRole("heading", { name: "1 Platypus task need you" })).toBeNull()
    expect(within(region).getAllByRole("link", { name: "Open task" })).toHaveLength(1)
    expect(prepare.mock.calls[0][3]).toBe("platypus")
    expect(rail.detail).toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(region.hidden).toBe(true)
  })

  it("review_then_auto: a row's Send records that person's email once through the same record action", async () => {
    const s = seedClub("review_then_auto")
    show(s)
    const send = within(people()[1]).getByRole("button", { name: "Send to Jordan" })
    expect(send.textContent).toBe("Send")
    // Collapsed: the email is prepared on demand, then recorded; a double click records nothing more.
    fireEvent.click(send, { detail: 1 })
    fireEvent.click(send, { detail: 2 })
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1))
    expect(record.mock.calls[0][1].map(p => p.recipientId)).toEqual(["jordan"])
    expect(record.mock.calls[0][2]).toBe("platypus")
    expect(prepare.mock.calls.map(c => c[3])).toEqual(["platypus"])
    // Expanded: the email on screen is the one recorded.
    const maya = within(people()[0])
    fireEvent.click(maya.getByRole("button", { name: "Email to Maya Chen" }))
    await maya.findByText("To: maya@example.org")
    fireEvent.click(maya.getByRole("button", { name: "Send to Maya" }))
    await waitFor(() => expect(record).toHaveBeenCalledTimes(2))
    expect(prepare).toHaveBeenCalledTimes(2)
    expect(record.mock.calls[1][1][0].digest.subject).toBe("1 Platypus task need you")
    await waitFor(() => expect(document.activeElement).toBe(maya.getByRole("button", { name: "Email to Maya Chen" })))
    expect(fetch).not.toHaveBeenCalled()
  })

  it("review_then_auto: a failed row Send shows the error on that row and records nothing", async () => {
    record.mockReturnValueOnce({ recordedGroupIds: [], failedGroupIds: ["x"], error: "This email changed. Please review the latest plan." })
    show(seedClub("review_then_auto"))
    fireEvent.click(within(people()[1]).getByRole("button", { name: "Send to Jordan" }))
    await within(people()[1]).findByText("This email changed. Please review the latest plan.")
    expect(latest.reminderRuntime!.digests ?? []).toEqual([])
  })

  it("review_then_auto: Send all is the one filled button; a row Send is outlined and announces who it was sent to", async () => {
    show(seedClub("review_then_auto"))
    const centre = screen.getByTestId("reminder-centre")
    expect([...centre.querySelectorAll(".btn-primary")]).toEqual([screen.getByTestId("send-all-digests")])
    const send = within(people()[1]).getByRole("button", { name: "Send to Jordan" })
    expect(send.className.split(" ")).toEqual(["btn", "small"])
    fireEvent.click(send, { detail: 1 })
    // The page's one status line announces it; the row itself keeps no "Sent to …" note.
    await waitFor(() => expect(feedback().textContent).toBe("Sent to Jordan."))
    expect(feedback().getAttribute("role")).toBe("status")
    expect(within(people()[1]).queryByText("Sent to Jordan.")).toBeNull()
    expect(screen.getByTestId("reminder-centre").querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(record).toHaveBeenCalledTimes(1)
  })

  it("review_then_auto: row Send is disabled while Send all runs", async () => {
    let finish: (v: { recordedGroupIds: string[]; failedGroupIds: string[]; error: null }) => void = () => {}
    sendAll.mockImplementation(() => new Promise(r => { finish = r }))
    show(seedClub("review_then_auto"))
    fireEvent.click(screen.getByTestId("send-all-digests"))
    await waitFor(() => expect(screen.getByTestId("send-all-digests").textContent).toBe("Sending…"))
    const sends = screen.getAllByTestId("rq-person-send")
    expect(sends.length).toBeGreaterThan(0)
    for (const b of sends) expect((b as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(sends[0], { detail: 1 })
    expect(prepare).not.toHaveBeenCalled()
    expect(record).not.toHaveBeenCalled()
    // aria-busy marks only the people list, not the whole page.
    expect(screen.getByTestId("rq-people").querySelector(".dg-list")!.getAttribute("aria-busy")).toBe("true")
    expect(screen.getByTestId("reminder-centre").hasAttribute("aria-busy")).toBe(false)
    finish({ recordedGroupIds: [], failedGroupIds: [], error: null })
    await waitFor(() => expect(screen.getByTestId("send-all-digests").textContent).toBe("Send 3 emails"))
    expect(screen.getByTestId("rq-people").querySelector(".dg-list")!.getAttribute("aria-busy")).toBe("false")
    for (const b of screen.getAllByTestId("rq-person-send")) expect((b as HTMLButtonElement).disabled).toBe(false)
  })

  it("review_then_self: each row opens in Gmail; I sent this appears only after the draft was opened, then records as manual", async () => {
    show(seedClub("review_then_self"))
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByRole("button", { name: /^Send/ })).toBeNull()
    const maya = within(people()[0])
    fireEvent.click(maya.getByRole("button", { name: "Email to Maya Chen" }))
    const draft = await maya.findByRole("link", { name: "Open in Gmail" })
    expect(draft.getAttribute("href")).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm/)
    expect(draft.getAttribute("target")).toBe("_blank")
    expect(maya.queryByRole("button", { name: "I sent this" })).toBeNull()
    expect(prepare.mock.calls[0][3]).toBe("manual")
    fireEvent.click(draft)
    fireEvent.click(maya.getByRole("button", { name: "I sent this" }))
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1))
    expect(record.mock.calls[0][2]).toBe("manual")
    expect(record.mock.calls[0][1].map(p => p.recipientId)).toEqual(["maya"])
    await waitFor(() => expect(feedback().textContent).toBe("Sent to Maya."))
    expect(maya.queryByText("Sent to Maya.")).toBeNull()
    // No summary action in this mode, so Open in Gmail is the row's filled button.
    expect(draft.className.split(" ")).toContain("btn-primary")
    expect(screen.queryByText(/The draft recipient is blank/)).toBeNull()
    cleanup()
    // With no mode chosen yet, the lead sends it themselves, as in the rail.
    show(seedClub(null))
    const first = within(people()[0])
    fireEvent.click(first.getByRole("button", { name: "Email to Maya Chen" }))
    // Here "Choose how reminders go out" is the screen's filled button, so the row's Open in Gmail is outlined.
    expect((await first.findByRole("link", { name: "Open in Gmail" })).className.split(" ")).toEqual(["btn", "small"])
    expect(first.queryByRole("button", { name: /^Send/ })).toBeNull()
  })

  it("auto_email shows no send button, only status; no mode links to the choice", async () => {
    show(seedClub("auto_email"))
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("open-first-draft")).toBeNull()
    expect(screen.queryAllByTestId("rq-person-send")).toHaveLength(0)
    expect(screen.queryByText(/Platypus sends these automatically/)).toBeNull()
    cleanup()
    // Step 0: the automatic count reads as one line and never sits beside "Nothing to send today.".
    show(recordedToday(seedClub("auto_email"), 0, "automatic"))
    expect(screen.getByTestId("rq-summary-line").textContent).toBe("Sent automatically to 1 person today.")
    expect(screen.getByTestId("rq-summary").textContent).not.toContain("Nothing to send today.")
    // The other two emails go out automatically; the count follows today's records.
    await waitFor(() => expect(screen.getByTestId("rq-summary-line").textContent).toBe("Sent automatically to 3 people today."), { timeout: 5000 })
    expect(screen.getByTestId("rq-summary").textContent).not.toContain("Nothing to send today.")
    expect(screen.queryByTestId("rq-auto-failed")).toBeNull()
    cleanup()
    show(seedClub(null))
    // With no sending mode, the primary action in the summary row is the one link to the choice.
    const choose = within(screen.getByTestId("rq-summary")).getAllByRole("link", { name: "Choose how reminders go out" })
    expect(choose).toHaveLength(1)
    expect(screen.getAllByTestId("choose-mode")).toEqual(choose)
    expect(choose[0].getAttribute("href")).toBe("/settings?reminders=1")
    expect(choose[0].className.split(" ")).toEqual(expect.arrayContaining(["btn", "btn-primary", "small"]))
    expect(choose[0].parentElement?.classList.contains("dg-top-row")).toBe(true)
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("open-first-draft")).toBeNull()
  })

  it("step 0: a row's Send marks that row Sent in place; rows keep the order of the first render, and Send all counts today", async () => {
    prepare.mockImplementation(actual.prepareReminderDigest)
    record.mockImplementation(actual.recordReminderDigests)
    sendAll.mockImplementation(actual.sendReminderDigests)
    show(seedClub("review_then_auto"))
    const order = people().map(p => p.dataset.recipient)
    expect(order).toEqual(["maya", "jordan", "priya"])
    fireEvent.click(within(people()[1]).getByRole("button", { name: "Send to Jordan" }), { detail: 1 })
    await waitFor(() => expect(people()[1].dataset.state).toBe("sent"), { timeout: 5000 })
    // Before step 0 the sent row jumped to the top under the pointer.
    expect(people().map(p => p.dataset.recipient)).toEqual(order)
    expect(latest.reminderRuntime!.digests).toHaveLength(1)
    expect(feedback().textContent).toBe("Sent to Jordan.")
    fireEvent.click(screen.getByRole("button", { name: "Send 2 emails" }))
    await waitFor(() => expect(feedback().textContent).toBe("Sent to 2 people. 1 was sent earlier today."), { timeout: 5000 })
    expect(people().map(p => p.dataset.recipient)).toEqual(order)
    for (const p of people()) expect(p.dataset.state).toBe("sent")
    expect(latest.reminderRuntime!.digests).toHaveLength(3)
    // Send all is gone; focus is on the summary line, not on the page body.
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(document.activeElement).toBe(screen.getByTestId("rq-summary-line"))
    expect(screen.getByTestId("rq-summary-line").getAttribute("tabindex")).toBe("-1")
  })

  it("step 0: each person's name is an h3 holding the disclosure button; a ?person= link opens and focuses that row", async () => {
    show(seedClub("review_then_auto"), "/?person=jordan")
    for (const p of people()) expect(within(p).getByRole("heading", { level: 3, name: /^Email to / }).querySelector("button")).toBe(within(p).getByTestId("rq-person-toggle"))
    const jordan = people().find(p => p.dataset.recipient === "jordan")!
    const toggle = within(jordan).getByRole("button", { name: "Email to Jordan Patel" })
    await waitFor(() => expect(toggle.getAttribute("aria-expanded")).toBe("true"))
    await waitFor(() => expect(document.activeElement).toBe(toggle))
    await within(jordan).findByText("To: jordan@example.org")
    for (const p of people().filter(p => p !== jordan)) expect(within(p).getByTestId("rq-person-toggle").getAttribute("aria-expanded")).toBe("false")
    expect(rail.detail).toBeNull()
  })

  it("step 0: History → Follow up opens that person's row here and closes a covering rail; the rail has no second send flow", async () => {
    sendAllSucceeds()
    const s = seedClub("review_then_auto")
    const jordanAt = digest.planReminderDigests(s).groups.findIndex(g => g.recipientId === "jordan")
    show(reducer(recordedToday(s, jordanAt), { type: "advanceClock", days: 3 }))
    fireEvent.click(screen.getByRole("button", { name: "History" }))
    const wait = within(await screen.findByTestId("rq-no-reply"))
    const follow = wait.getAllByRole("button", { name: "Follow up" })[0]
    expect(screen.queryByTestId("digest-panel")).toBeNull()
    fireEvent.click(follow)
    // jsdom has no wide screen, so the rail (which would cover the page) closes.
    await waitFor(() => expect(rail.detail).toBeNull())
    const jordan = people().find(p => p.dataset.recipient === "jordan")!
    const toggle = within(jordan).getByRole("button", { name: "Email to Jordan Patel" })
    await waitFor(() => expect(toggle.getAttribute("aria-expanded")).toBe("true"))
    await waitFor(() => expect(document.activeElement).toBe(toggle))
    expect(within(jordan).getByRole("button", { name: "Send to Jordan" })).toBeTruthy()
    expect(screen.queryByTestId("digest-send-next")).toBeNull()
    expect(screen.queryByTestId("digest-skip")).toBeNull()
  })

  it("a preparation error is shown on the open row and recorded nothing", async () => {
    prepare.mockResolvedValue({ error: "Not implemented yet." })
    show(seedClub("review_then_auto"))
    const maya = within(people()[0])
    fireEvent.click(maya.getByRole("button", { name: "Email to Maya Chen" }))
    expect((await maya.findByText("Not implemented yet.")).getAttribute("role")).toBe("alert")
    fireEvent.click(maya.getByRole("button", { name: "Send to Maya" }), { detail: 1 })
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2))
    expect(record).not.toHaveBeenCalled()
    expect(feedback().textContent).toBe("")
  })

  it("auto_email: an open row is a read-only preview", async () => {
    show(seedClub("auto_email"))
    const maya = within(people()[0])
    fireEvent.click(maya.getByRole("button", { name: "Email to Maya Chen" }))
    await maya.findByText("To: maya@example.org")
    expect(maya.queryAllByRole("button", { name: /Send|Skip|I sent/ })).toHaveLength(0)
    expect(maya.queryByRole("link", { name: "Open in Gmail" })).toBeNull()
  })

  it("step 0: a limit that moves tasks to a person's next email says so on that person's row", () => {
    const s = seedClub("review_then_auto"), runtime = s.reminderRuntime!
    const ready = Object.fromEntries(digest.planReminderDigests(s).groups.map(g => [g.recipientId, g.candidates.length]))
    // Earlier fictional emails without a saved mail: two to Maya today (daily limit), six to Jordan this week (weekly limit).
    const earlier = [
      ...[0, 1].map(i => ({ recipientId: "maya", recipientName: "Maya Chen", sentOn: s.today, i })),
      ...[1, 2, 3, 4, 5, 6].map(i => ({ recipientId: "jordan", recipientName: "Jordan Patel", sentOn: addDays(s.today, -i), i })),
    ].map(({ recipientId, recipientName, sentOn, i }, k): ReminderDelivery => ({
      id: `earlier-${recipientId}-${i}`, candidateId: `earlier-${recipientId}-${i}`, nodeId: `earlier-node-${recipientId}-${i}`, recipientId, ownerId: recipientId, ownerVersion: 0,
      planKey: "earlier", reason: "start", scheduledOn: sentOn, sentOn, sequence: runtime.sequence + k + 1, via: "platypus", recipientName,
      taskTitle: "Earlier fictional task", eventName: null, due: null, outcome: "simulated",
    }))
    const sequence = runtime.sequence + earlier.length
    show({ ...s, reminderRuntime: { ...runtime, sequence, mailRequiredAfter: sequence, deliveries: [...runtime.deliveries, ...earlier] } })
    const row = (id: string) => people().find(p => p.dataset.recipient === id)!
    expect(people().map(p => p.dataset.recipient)).toEqual(["priya", "maya", "jordan"])
    expect(within(row("maya")).getByTestId("rq-person-held").textContent).toBe(`+${ready.maya} in the next email`)
    expect(within(row("jordan")).getByTestId("rq-person-held").textContent).toBe(`+${ready.jordan} in the next email`)
    expect(within(row("priya")).queryByTestId("rq-person-held")).toBeNull()
    // A person with only held tasks has no email to open and no Send.
    expect(row("maya").dataset.state).toBe("held")
    expect(within(row("maya")).getByRole("heading", { level: 3, name: "Maya Chen" })).toBeTruthy()
    expect(within(row("maya")).queryByRole("button")).toBeNull()
    expect(within(screen.getByTestId("rq-summary")).getByText("1 person to remind")).toBeTruthy()
    expect(screen.queryByTestId("rq-held")).toBeNull()
  })

  it("an email recorded today stays listed as Sent and expands to the recorded email; History is one link", () => {
    const s = seedClub("review_then_auto")
    show(recordedToday(s, 0))
    const maya1 = screen.getAllByTestId("rq-person").find(p => p.dataset.recipient === "maya")!
    expect(maya1.dataset.state).toBe("sent")
    expect(within(maya1).getByText("Sent")).toBeTruthy()
    expect(within(maya1).queryByRole("button", { name: /^Send/ })).toBeNull()
    fireEvent.click(within(maya1).getByRole("button", { name: "Email to Maya Chen" }))
    expect(within(maya1).getByTestId("digest-subject").textContent).toBe("Your tasks")
    expect(screen.getByTestId("rq-summary").textContent).toBe("2 people to remindSend 2 emails")
    expect(screen.getByTestId("rq-history").textContent).toBe("History")
    fireEvent.click(screen.getByRole("button", { name: "History" }))
    const history = within(screen.getByTestId("rq-sent"))
    expect(history.getByText(/1 task ·/).textContent).toBeTruthy()
    expect(history.getAllByTestId("rq-row")).toHaveLength(1)
    expect(screen.queryByText(/not proof of email delivery/)).toBeNull()
  })

  it("Fix first buttons open task details; the legacy row keeps its explicit review", async () => {
    // Explicit upgrade (S2): until saves upgrade automatically on load, the test puts the plan into the updated state itself.
    const s = fixture("review_then_self", false)
    const old = { id: "old", nodeId: "room", channel: "email" as const, text: "Earlier mail", sentBy: "alex", sentOn: s.today, response: null }
    const legacy = { ...s, reminderRuntime: { ...createReminderRuntime(s.today), legacyUnresolvedNodeIds: ["room"] }, nudges: [old] }
    show(reducer(legacy, { type: "upgradeReminderPlan" }))
    expect(screen.queryByRole("button", { name: "Enable updated reminders" })).toBeNull()
    expect(latest.nudges).toEqual([old])
    const row = within(screen.getByTestId("rq-fix")).getAllByTestId("rq-row").find(r => r.dataset.node === "room")!
    expect(within(row).getByText("Check earlier reminders")).toBeTruthy()
    fireEvent.click(within(row).getByRole("button", { name: "I checked · allow future reminders" }))
    await screen.findByText("Future reminders are enabled for the current assignment. Earlier history is unchanged.")
    expect(latest.reminderRuntime!.legacyUnresolvedNodeIds).toEqual([])
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    fireEvent.click(screen.getByRole("button", { name: "History" }))
    expect(section("rq-sent").getByText("Earlier reminder · recipient not recorded")).toBeTruthy()
    cleanup()
    show(seedClub())
    // Step 0: the no-owner row only opens the task and never claims it for the viewer.
    const photos = latest.nodes.find(n => n.id === "t-photos")!
    fireEvent.click(screen.getByRole("button", { name: `Open task: ${photos.title}` }))
    expect(rail.detail).toEqual({ kind: "node", id: "t-photos" })
    expect(latest.nodes.find(n => n.id === "t-photos")).toEqual(photos)
    // An unresolved waiting task opens Task Details at its waiting-details editor.
    const wait = within(screen.getByTestId("rq-fix")).getAllByRole("button", { name: /^Choose who this waits on: / })[0]
    const node = wait.closest<HTMLElement>("[data-node]")!.dataset.node
    fireEvent.click(wait)
    expect(rail.detail).toEqual({ kind: "task", id: node, reply: "waiting" })
    cleanup()
    // A vice president who does not own the task cannot use that editor, so the button only opens the task, and says so.
    const vp = seedClub()
    show({ ...vp, roles: vp.roles.map(r => r.id === "r-pres" ? { ...r, fn: "vice_president" as const } : r) })
    const fix = within(screen.getByTestId("rq-fix"))
    expect(fix.getByRole("heading", { level: 2, name: "Fix first, 8" })).toBeTruthy()
    const others = latest.nodes.filter(n => n.ownerId !== "alex").map(n => n.title)
    for (const b of fix.queryAllByRole("button", { name: /^Choose who this waits on: / })) expect(others).not.toContain(b.getAttribute("aria-label")!.slice("Choose who this waits on: ".length))
    expect(fix.getAllByRole("button", { name: /^Open task: / }).length).toBeGreaterThan(5)
  })

  it("an older plan is not a blank page: a short reason and one way to update it, without enabling anything here", () => {
    const s = fixture("review_then_self", false)
    show(s)
    expect(screen.queryByRole("button", { name: "Enable updated reminders" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Enable updated reminders" })).toBeNull()
    const card = within(screen.getByTestId("reminder-plan-status"))
    expect(card.getByRole("heading", { name: "Reminders are paused" })).toBeTruthy()
    expect(card.getAllByRole("button").map(b => b.textContent)).toEqual(["Reload"])
    expect(card.getByRole("status")).toBe(feedback())
    expect(screen.queryByTestId("rq-summary")).toBeNull()
    expect(latest.reminderRuntime).toBeUndefined()
  })

  it("automatic preparation exposes a real failure and retries only on request", async () => {
    const original = Storage.prototype.setItem
    let fail = true
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY && fail) throw new Error("No storage")
      original.call(this, key, value)
    })
    const s = fixture("auto_email")
    show({ ...s, today: s.nodes[0].clubDeadline! })
    const retry = await screen.findByRole("button", { name: "Retry automatic reminders" })
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    // Failures are listed apart from what was sent.
    expect(screen.getByTestId("rq-auto-failed").textContent).toBe("Not sent: Jordan Patel")
    expect(screen.getByTestId("rq-summary-line").textContent).toBe("1 person to remind")
    const calls = write.mock.calls.length
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(write.mock.calls).toHaveLength(calls)
    fail = false
    fireEvent.click(retry)
    await waitFor(() => expect(latest.reminderRuntime!.deliveries).toHaveLength(2))
    expect(latest.reminderRuntime!.deliveries.every(d => !!d.message?.checked)).toBe(true)
    expect(screen.queryByRole("button", { name: "Retry automatic reminders" })).toBeNull()
    expect(screen.getByTestId("rq-summary-line").textContent).toBe("Sent automatically to 1 person today.")
    expect(screen.queryByTestId("rq-auto-failed")).toBeNull()
    expect(screen.getByTestId("rq-summary").textContent).not.toContain("Nothing to send today.")
    expect(screen.getByTestId("rq-history")).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    write.mockRestore()
  })


  it("a failed legacy review keeps its prior saved state, and a save failure is one short line", async () => {
    const active = fixture("review_then_self")
    show({ ...active, reminderRuntime: { ...active.reminderRuntime!, legacyUnresolvedNodeIds: ["room"] } })
    const block = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("No storage") })
    fireEvent.click(screen.getByRole("button", { name: "I checked · allow future reminders" }))
    await screen.findByText("This review was not saved. Check the current assignment and browser saving.")
    expect(latest.reminderRuntime!.legacyUnresolvedNodeIds).toEqual(["room"])
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    expect(screen.getAllByRole("alert").map(a => a.textContent)).toContain("Can't save in this browser.")
    block.mockRestore()
  })

  it.each([null, false, 0, "", { version: 12 }])("preserves an invalid saved plan and offers no overwrite (%j)", invalid => {
    show({ ...fixture(), reminderRuntime: invalid as unknown as NonNullable<DemoState["reminderRuntime"]> })
    expect(screen.getByRole("heading", { name: "Reminder plan needs review" })).toBeTruthy()
    // Not a dead end: one recovery action, which only downloads the saved data as it is.
    expect(within(screen.getByTestId("reminder-plan-status")).getAllByRole("button").map(b => b.textContent)).toEqual(["Download saved data"])
    expect(screen.queryByRole("button", { name: "Enable updated reminders" })).toBeNull()
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("rq-person")).toBeNull()
    expect(latest.reminderRuntime).toBe(invalid)
    expect(latest.taskAccessGrants).toBeUndefined()
  })

  it("a member sees today's email to them before Coming up, with no \"To <own name>\" (R-S0 W2)", () => {
    const s = seedClub()
    const group = digest.planReminderDigests(s).groups.find(g => g.recipientId === "maya")!
    const titles = group.candidates.map(c => s.nodes.find(n => n.id === c.nodeId)!.title)
    show({ ...s, viewerId: "maya" })
    const mine = screen.getByTestId("your-reminders")
    const today = within(mine).getByTestId("your-today")
    expect(today.textContent).toBe(`Today you get 1 email about: ${titles.join(", ")}`)
    expect(today.compareDocumentPosition(within(mine).getByRole("heading", { name: "Coming up" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(mine).queryByText("Maya Chen")).toBeNull()
    expect(mine.textContent).not.toMatch(/To Maya/)
    expect(mine.querySelector(".rq-mark")).toBeNull()
    // Read-only: nothing is prepared or recorded for the member.
    expect(prepare).not.toHaveBeenCalled()
    expect(latest.reminderRuntime!.digests ?? []).toHaveLength(0)
    cleanup()
    show({ ...s, viewerId: "sam" })
    expect(screen.queryByTestId("your-today")).toBeNull()
  })

  it("ordinary members cannot send, enable or review legacy reminders and only see their recorded recipient history", async () => {
    const s = fixture()
    show({ ...s, viewerId: "sam" })
    expect(screen.getByTestId("your-reminders")).toBeTruthy()
    expect(screen.queryByTestId("reminder-centre")).toBeNull()
    expect(screen.queryByRole("button", { name: /Send|Enable|allow future|draft/ })).toBeNull()
    expect(latest.reminderRuntime!.deliveries).toEqual([])
    cleanup()
    const recorded = { ...s, reminderRuntime: { ...createReminderRuntime(s.today), sequence: 1, deliveries: [{ id: "old-delivery", candidateId: "old", nodeId: "room", ownerId: "jordan", ownerVersion: 0, recipientId: "jordan", recipientName: "Jordan when sent", taskTitle: "Original room task", eventName: "Earlier event", due: s.today, reason: "start" as const, planKey: "old", scheduledOn: s.today, sentOn: s.today, sequence: 1, via: "manual" as const, outcome: "recorded_by_sender" as const }] } }
    show({ ...recorded, viewerId: "jordan", nodes: recorded.nodes.map(n => ({ ...n, ownerId: "sam", ownerVersion: 1 })) })
    // R-S0 W2: the viewer is the saved recipient, so the row has no "To <your own name>"; it is listed by the saved recipient, not the current owner.
    expect(section("your-reminders").getByText("Original room task")).toBeTruthy()
    expect(section("your-reminders").queryByText("Jordan when sent")).toBeNull()
    expect(section("your-reminders").queryByText(/^To /)).toBeNull()
    expect(section("your-reminders").queryByText("Sam Okafor")).toBeNull()
    expect(section("your-reminders").getByText("Sent", { exact: true })).toBeTruthy()
    expect(section("your-reminders").queryByText(/Recorded by sender|Approved demo|Automatic demo/)).toBeNull()
    expect(section("your-reminders").queryByText(/No reminders coming up/)).toBeNull()
  })
})
