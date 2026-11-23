import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
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
import DigestPanel, { ReminderHistoryPanel } from "../reminders/DigestPanel"
import Today from "./Today"

// The engine's prepare/record/send are owned elsewhere; the page is tested against the frozen contract.
// By default each mock calls the real function, so engine-driven paths (automatic mode) keep their real behaviour.
vi.mock("../reminders/digest", async importOriginal => {
  const real = await importOriginal<typeof import("../reminders/digest")>()
  return { ...real, prepareReminderDigest: vi.fn(real.prepareReminderDigest), recordReminderDigests: vi.fn(real.recordReminderDigests), sendReminderDigests: vi.fn(real.sendReminderDigests) }
})
const prepare = vi.mocked(digest.prepareReminderDigest), record = vi.mocked(digest.recordReminderDigests), sendAll = vi.mocked(digest.sendReminderDigests)

let latest: DemoState
let rail: ReturnType<typeof useRail>
function Observer() { latest = useStore().state; rail = useRail(); return null }
function HideNotes() { const {setOn} = useBts(); return <button type="button" onClick={() => setOn(false)}>Hide calculation notes</button> }
/** The two reminder kinds of the right rail, without the rest of the rail (Ask needs a server). */
function Details() {
  const r = useRail()
  if (r.detail?.kind === "reminderDigest") return <DigestPanel recipientId={r.detail.recipientId} onClose={r.closeDetail} />
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
const show = (state = fixture()) => render(<MemoryRouter><StoreProvider initial={state}><RailProvider><Observer /><Today /><Details /></RailProvider></StoreProvider></MemoryRouter>)
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
function recordedToday(state: DemoState, groupIndex: number): DemoState {
  const runtime = state.reminderRuntime!, group = digest.planReminderDigests(state).groups[groupIndex], base = runtime.sequence
  const id = `reminder-digest:${base + group.candidates.length + 1}`
  const name = state.people.find(p => p.id === group.recipientId)!.name
  const snap: ReminderDigestSnapshot = { version: 1, id, groupId: group.id, recipientId: group.recipientId, recipientName: name, intendedEmail: `${group.recipientId}@example.org`,
    channel: "email", preparedOn: state.today, sentOn: state.today, via: "platypus", subject: "Your tasks", body: "Hi", text: "Your tasks\n\nHi",
    taskUrls: group.candidates.map((_, i) => `http://localhost/#/t${i}`), nodeIds: group.candidates.map(c => c.nodeId), wordCount: 1, checked: true, source: "rules" }
  const deliveries = group.candidates.map((c, i) => ({ id: `d${i}`, candidateId: c.id, nodeId: c.nodeId, recipientId: group.recipientId, ownerId: c.ownerId, ownerVersion: c.ownerVersion,
    planKey: c.planKey, reason: c.reason, scheduledOn: c.scheduledOn, sentOn: state.today, sequence: base + i + 1, via: "platypus" as const, recipientName: name,
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
    expect(screen.getByRole("heading", { name: /Fix first/ }).textContent).toBe("Fix first8")
    expect(fix.getAllByTestId("rq-row")).toHaveLength(8)
    expect(fix.getAllByRole("button", { name: /^Waiting on whom\?: / }).length).toBeGreaterThan(0)
    expect(fix.queryByText("Pick who it waits on")).toBeNull()
    expect(fix.getAllByText("No owner")).toHaveLength(2)
    expect(fix.getAllByText("Stuck")).toHaveLength(2)
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
    expect(screen.getAllByRole("button", { name: /^Send all/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Send all" }))
    await screen.findByText("Sent to 3 people.")
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
    expect(within(region).getByRole("heading", { name: "1 Platypus task need you" })).toBeTruthy()
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
    expect(screen.queryByText(/The draft recipient is blank/)).toBeNull()
    cleanup()
    // With no mode chosen yet, the lead sends it themselves, as in the rail.
    show(seedClub(null))
    const first = within(people()[0])
    fireEvent.click(first.getByRole("button", { name: "Email to Maya Chen" }))
    await first.findByRole("link", { name: "Open in Gmail" })
    expect(first.queryByRole("button", { name: /^Send/ })).toBeNull()
  })

  it("auto_email shows no send button, only status; no mode links to the choice", () => {
    show(seedClub("auto_email"))
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("open-first-draft")).toBeNull()
    expect(screen.queryAllByTestId("rq-person-send")).toHaveLength(0)
    expect(screen.queryByText(/Platypus sends these automatically/)).toBeNull()
    cleanup()
    show(recordedToday(seedClub("auto_email"), 0))
    expect(within(screen.getByTestId("rq-summary")).getByText("Sent automatically")).toBeTruthy()
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

  it("the rail panel previews the real email, Send & next records it and opens the next person", async () => {
    const s = seedClub("review_then_auto")
    show(s)
    act(() => rail.show({ kind: "reminderDigest", recipientId: "maya" }))
    const panel = await screen.findByTestId("digest-panel")
    await within(panel).findByText("To: maya@example.org")
    expect(people()[0].dataset.state).toBe("reviewing")
    expect(within(panel).getAllByRole("link", { name: "Open task" })).toHaveLength(1)
    expect(within(panel).getByRole("heading", { name: "Maya Chen" })).toBe(document.activeElement)
    expect(within(panel).queryByText(/Email \d of \d/)).toBeNull()
    expect(within(panel).queryByTestId("digest-send-all")).toBeNull()
    expect(within(panel).queryByText(/Demo: nothing is sent/)).toBeNull()
    expect(within(panel).getByText(/Maya’s open tasks/).textContent).toContain(`(${s.nodes.filter(n => n.ownerId === "maya" && n.status !== "done").length})`)
    fireEvent.click(within(panel).getByTestId("digest-send-next"))
    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0][1].map(p => p.recipientId)).toEqual(["maya"])
    expect(record.mock.calls[0][2]).toBe("platypus")
    await waitFor(() => expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "jordan" }))
    await screen.findByRole("heading", { name: "Jordan Patel" })
    expect(screen.getByText("Sent to Maya.")).toBeTruthy()
    fireEvent.click(screen.getByTestId("digest-skip"))
    await waitFor(() => expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "priya" }))
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })) })
    expect(rail.detail).toBeNull()
  })

  it("a failed record keeps the panel on the same person with the error", async () => {
    record.mockReturnValueOnce({ recordedGroupIds: [], failedGroupIds: ["x"], error: "This email changed. Please review the latest plan." })
    show(seedClub("review_then_auto"))
    act(() => rail.show({ kind: "reminderDigest", recipientId: "jordan" }))
    const panel = await screen.findByTestId("digest-panel")
    await within(panel).findByText("To: jordan@example.org")
    fireEvent.click(within(panel).getByTestId("digest-send-next"))
    await within(panel).findByText("This email changed. Please review the latest plan.")
    expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "jordan" })
  })

  it("a preparation error is shown and nothing can be sent", async () => {
    prepare.mockResolvedValue({ error: "Not implemented yet." })
    show(seedClub("review_then_auto"))
    act(() => rail.show({ kind: "reminderDigest", recipientId: "maya" }))
    const panel = await screen.findByTestId("digest-panel")
    await within(panel).findByText("Not implemented yet.")
    expect(within(panel).getByTestId("digest-send-next").hasAttribute("disabled")).toBe(true)
  })

  it("review_then_self in the rail: I sent this appears only after the Gmail draft was opened, then records as manual", async () => {
    show(seedClub("review_then_self"))
    act(() => rail.show({ kind: "reminderDigest", recipientId: "maya" }))
    const panel = within(await screen.findByTestId("digest-panel"))
    const draft = await panel.findByRole("link", { name: "Open in Gmail" })
    await waitFor(() => expect(draft.getAttribute("href")).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm/))
    expect(draft.getAttribute("target")).toBe("_blank")
    expect(panel.queryByTestId("digest-sent-self")).toBeNull()
    expect(panel.queryByTestId("digest-send-next")).toBeNull()
    expect(panel.queryByText(/The draft recipient is blank/)).toBeNull()
    fireEvent.click(draft)
    fireEvent.click(panel.getByRole("button", { name: "I sent this" }))
    expect(record.mock.calls[0][2]).toBe("manual")
    await waitFor(() => expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "jordan" }))
  })

  it("auto_email: the panel is a read-only preview", async () => {
    show(seedClub("auto_email"))
    act(() => rail.show({ kind: "reminderDigest", recipientId: "maya" }))
    const panel = within(await screen.findByTestId("digest-panel"))
    await panel.findByText("To: maya@example.org")
    expect(panel.queryAllByRole("button", { name: /Send|Skip|I sent/ })).toHaveLength(0)
    expect(panel.queryByTestId("digest-open-draft")).toBeNull()
    expect(panel.queryByText(/Platypus sends these automatically/)).toBeNull()
  })

  it("an email recorded today stays listed as Sent and expands to the recorded email; History is one link", () => {
    const s = seedClub("review_then_auto")
    show(recordedToday(s, 0))
    const maya1 = screen.getAllByTestId("rq-person").find(p => p.dataset.recipient === "maya")!
    expect(maya1.dataset.state).toBe("sent")
    expect(within(maya1).getByText("Sent")).toBeTruthy()
    expect(within(maya1).queryByRole("button", { name: /^Send/ })).toBeNull()
    fireEvent.click(within(maya1).getByRole("button", { name: "Email to Maya Chen" }))
    expect(within(maya1).getByRole("heading", { name: "Your tasks" })).toBeTruthy()
    expect(screen.getByTestId("rq-summary").textContent).toBe("2 people to remindSend all")
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
    fireEvent.click(screen.getAllByRole("button", { name: /^Assign: / })[0])
    expect(rail.detail).toEqual({ kind: "node", id: "t-photos" })
  })

  it("an older plan shows no Enable card on the home page (it upgrades on load elsewhere)", () => {
    const s = fixture("review_then_self", false)
    show(s)
    expect(screen.queryByRole("button", { name: "Enable updated reminders" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Enable updated reminders" })).toBeNull()
    expect(screen.queryByTestId("reminder-plan-status")).toBeNull()
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
    const calls = write.mock.calls.length
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(write.mock.calls).toHaveLength(calls)
    fail = false
    fireEvent.click(retry)
    await waitFor(() => expect(latest.reminderRuntime!.deliveries).toHaveLength(2))
    expect(latest.reminderRuntime!.deliveries.every(d => !!d.message?.checked)).toBe(true)
    expect(screen.queryByRole("button", { name: "Retry automatic reminders" })).toBeNull()
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
    expect(screen.queryByRole("button", { name: "Enable updated reminders" })).toBeNull()
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("rq-person")).toBeNull()
    expect(latest.reminderRuntime).toBe(invalid)
    expect(latest.taskAccessGrants).toBeUndefined()
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
    expect(section("your-reminders").getByText("Jordan when sent")).toBeTruthy()
    expect(section("your-reminders").getByText("Original room task")).toBeTruthy()
    expect(section("your-reminders").queryByText("Sam Okafor")).toBeNull()
    expect(section("your-reminders").getByText("Sent", { exact: true })).toBeTruthy()
    expect(section("your-reminders").queryByText(/Recorded by sender|Approved demo|Automatic demo/)).toBeNull()
    expect(section("your-reminders").queryByText(/No reminders coming up/)).toBeNull()
  })
})
