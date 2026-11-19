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

  it("groups one person's tasks into one email, with a reason chip per task and the person's other open work", () => {
    const s = fixture()
    show({ ...s, today: s.nodes[0].clubDeadline! })
    expect(people()).toHaveLength(1)
    const jordan = within(people()[0])
    expect(people()[0].dataset.recipient).toBe("jordan")
    expect(jordan.getByText("Jordan Patel")).toBeTruthy()
    expect(jordan.getByText("Up next")).toBeTruthy()
    expect(jordan.getAllByTestId("rq-person-task").map(t => t.dataset.node)).toEqual(["room", "room-two"])
    expect(jordan.getAllByText("Due today")).toHaveLength(2)
    expect(section("rq-summary").getByText("Review 1 email")).toBeTruthy()
    expect(screen.getByTestId("rq-summary").textContent).toContain("2 tasks · 0 sent today")
    expect(screen.queryByTestId("rq-fix")).toBeNull()
    expect(screen.queryByTestId("rq-history")).toBeNull()
  })

  it("counts emails as people and keeps problems apart under Fix first (seed club: 3 emails, 5 tasks, 8 to fix)", () => {
    const s = seedClub()
    show(s)
    const groups = digest.planReminderDigests(s).groups
    expect(people().map(p => p.dataset.recipient)).toEqual(groups.map(g => g.recipientId))
    expect(section("rq-summary").getByText(`Review ${groups.length} emails`)).toBeTruthy()
    expect(screen.getByTestId("rq-summary").textContent).toContain(`${groups.reduce((n, g) => n + g.candidates.length, 0)} tasks`)
    expect(screen.getAllByTestId("rq-person-task")).toHaveLength(5)
    const fix = within(screen.getByTestId("rq-fix"))
    expect(screen.getByRole("heading", { name: /Fix first/ }).textContent).toBe("Fix first8")
    expect(fix.getAllByTestId("rq-row")).toHaveLength(8)
    expect(fix.getAllByText("Pick who it waits on").length).toBeGreaterThan(0)
    expect(fix.getAllByText("No owner")).toHaveLength(2)
    expect(fix.getAllByText("Stuck")).toHaveLength(2)
    const fixed = new Set(fix.getAllByTestId("rq-row").map(r => r.dataset.node))
    expect(screen.getAllByTestId("rq-person-task").some(t => fixed.has(t.dataset.node))).toBe(false)
    // B3: today's tasks are not repeated as coming up; one quiet line instead of a list.
    expect(screen.queryByTestId("rq-this-week")).toBeNull()
    expect(screen.getByTestId("rq-next").textContent).toMatch(/^Next check: (Mon|Tue|Wed|Thu|Fri|Sat|Sun), Nov \d+ · \d+ planned this week$/)
    expect(screen.getByText("Also has 26 other open tasks")).toBeTruthy()
  })

  it("review_then_auto: Send all N emails records every group through the digest service and says nothing was sent", async () => {
    sendAllSucceeds()
    const s = seedClub("review_then_auto")
    show(s)
    const ids = digest.planReminderDigests(s).groups.map(g => g.id)
    fireEvent.click(screen.getByRole("button", { name: "Send all 3 emails" }))
    await screen.findByText("3 emails recorded. Demo: nothing is sent.")
    expect(sendAll).toHaveBeenCalledTimes(1)
    expect(sendAll.mock.calls[0].slice(1, 4)).toEqual([ids, window.location.origin, "platypus"])
    expect(fetch).not.toHaveBeenCalled()
  })

  it("shows the service's error in the status line instead of claiming success", async () => {
    sendAll.mockResolvedValueOnce({ recordedGroupIds: [], failedGroupIds: ["x"], error: "Not implemented yet." })
    show(seedClub("review_then_auto"))
    fireEvent.click(screen.getByTestId("send-all-digests"))
    await screen.findByText("0 emails recorded. Demo: nothing is sent. Not implemented yet.")
  })

  it("review_then_self: Open draft 1 of N opens the first person's email in the rail", async () => {
    show(seedClub("review_then_self"))
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Open draft 1 of 3" }))
    expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "maya" })
    const panel = within(await screen.findByTestId("digest-panel"))
    expect(panel.getByText("Email 1 of 3 · to Maya")).toBeTruthy()
    expect(people()[0].dataset.state).toBe("reviewing")
    await panel.findByText("1 Platypus task need you")
  })

  it("auto_email shows no review button and says Platypus sends; no mode links to the choice", () => {
    show(seedClub("auto_email"))
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("open-first-draft")).toBeNull()
    expect(screen.getAllByText("Platypus sends these automatically. Demo: nothing is sent.").length).toBeGreaterThan(0)
    cleanup()
    show(seedClub(null))
    expect(screen.getByTestId("choose-mode").getAttribute("href")).toBe("/settings?reminders=1")
    expect(screen.queryByTestId("send-all-digests")).toBeNull()
    expect(screen.queryByTestId("open-first-draft")).toBeNull()
  })

  it("the rail panel previews the real email, Send & next records it and opens the next person", async () => {
    const s = seedClub("review_then_auto")
    show(s)
    fireEvent.click(within(people()[0]).getByRole("button", { name: /Maya Chen/ }))
    const panel = await screen.findByTestId("digest-panel")
    await within(panel).findByText("To: maya@example.org")
    expect(within(panel).getAllByRole("link", { name: "Open task" })).toHaveLength(1)
    expect(within(panel).getByRole("heading", { name: "Maya Chen" })).toBe(document.activeElement)
    expect(within(panel).getByText(/Maya’s open tasks/).textContent).toContain(`(${s.nodes.filter(n => n.ownerId === "maya" && n.status !== "done").length})`)
    fireEvent.click(within(panel).getByTestId("digest-send-next"))
    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0][1].map(p => p.recipientId)).toEqual(["maya"])
    expect(record.mock.calls[0][2]).toBe("platypus")
    await waitFor(() => expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "jordan" }))
    await screen.findByText("Email 2 of 3 · to Jordan")
    expect(screen.getByText("Email to Maya recorded. Demo: nothing is sent.")).toBeTruthy()
    fireEvent.click(screen.getByTestId("digest-skip"))
    await waitFor(() => expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "priya" }))
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })) })
    expect(rail.detail).toBeNull()
  })

  it("a failed record keeps the panel on the same person with the error", async () => {
    record.mockReturnValueOnce({ recordedGroupIds: [], failedGroupIds: ["x"], error: "This email changed. Please review the latest plan." })
    show(seedClub("review_then_auto"))
    fireEvent.click(within(people()[1]).getByRole("button", { name: /Jordan Patel/ }))
    const panel = await screen.findByTestId("digest-panel")
    await within(panel).findByText("To: jordan@example.org")
    fireEvent.click(within(panel).getByTestId("digest-send-next"))
    await within(panel).findByText("This email changed. Please review the latest plan.")
    expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "jordan" })
  })

  it("a preparation error is shown and nothing can be sent", async () => {
    prepare.mockResolvedValue({ error: "Not implemented yet." })
    show(seedClub("review_then_auto"))
    fireEvent.click(within(people()[0]).getByRole("button", { name: /Maya Chen/ }))
    const panel = await screen.findByTestId("digest-panel")
    await within(panel).findByText("Not implemented yet.")
    expect(within(panel).getByTestId("digest-send-next").hasAttribute("disabled")).toBe(true)
  })

  it("review_then_self: I sent this email appears only after the Gmail draft was opened, then records as manual", async () => {
    show(seedClub("review_then_self"))
    fireEvent.click(screen.getByTestId("open-first-draft"))
    const panel = within(await screen.findByTestId("digest-panel"))
    const draft = await panel.findByTestId("digest-open-draft")
    await waitFor(() => expect(draft.getAttribute("href")).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm/))
    expect(draft.getAttribute("target")).toBe("_blank")
    expect(panel.queryByTestId("digest-sent-self")).toBeNull()
    expect(panel.queryByTestId("digest-send-next")).toBeNull()
    fireEvent.click(draft)
    fireEvent.click(panel.getByTestId("digest-sent-self"))
    expect(record.mock.calls[0][2]).toBe("manual")
    await waitFor(() => expect(rail.detail).toEqual({ kind: "reminderDigest", recipientId: "jordan" }))
  })

  it("auto_email: the panel is a read-only preview", async () => {
    show(seedClub("auto_email"))
    fireEvent.click(within(people()[0]).getByRole("button", { name: /Maya Chen/ }))
    const panel = within(await screen.findByTestId("digest-panel"))
    await panel.findByText("To: maya@example.org")
    expect(panel.queryAllByRole("button", { name: /Send|Skip|I sent/ })).toHaveLength(0)
    expect(panel.queryByTestId("digest-open-draft")).toBeNull()
  })

  it("an email recorded today stays listed as Sent ✓ and fills a progress segment", () => {
    const s = seedClub("review_then_auto")
    show(recordedToday(s, 0))
    const maya1 = screen.getAllByTestId("rq-person").find(p => p.dataset.recipient === "maya")!
    expect(maya1.dataset.state).toBe("sent")
    expect(within(maya1).getByText("Sent ✓")).toBeTruthy()
    expect(screen.getByTestId("rq-summary").textContent).toContain("1 sent today")
    expect(screen.getByTestId("rq-summary").querySelectorAll(".dg-steps i.on")).toHaveLength(1)
    expect(screen.getByTestId("rq-history").textContent).toContain("1 sent this week")
    fireEvent.click(screen.getByRole("button", { name: "History" }))
    const history = within(screen.getByTestId("rq-sent"))
    expect(history.getByText(/1 task ·/).textContent).toBeTruthy()
    expect(history.getAllByTestId("rq-row")).toHaveLength(1)
  })

  it("Fix first buttons open task details; the legacy row keeps its explicit review", async () => {
    const s = fixture("review_then_self", false)
    const old = { id: "old", nodeId: "room", channel: "email" as const, text: "Earlier mail", sentBy: "alex", sentOn: s.today, response: null }
    show({ ...s, reminderRuntime: { ...createReminderRuntime(s.today), legacyUnresolvedNodeIds: ["room"] }, nudges: [old] })
    expect(screen.queryByTestId("rq-summary")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Enable updated reminders" }))
    await screen.findByText("Updated reminders are enabled.")
    expect(latest.org.settings).toEqual(s.org.settings)
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

  it("failed activation and legacy review keep their prior saved state", async () => {
    const s = fixture("review_then_self", false)
    show(s)
    const original = Storage.prototype.setItem
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("No storage")
      original.call(this, key, value)
    })
    fireEvent.click(screen.getByRole("button", { name: "Enable updated reminders" }))
    await screen.findByText("The reminder plan was not saved. Restore saving and try again.")
    expect(latest.reminderRuntime).toBeUndefined()
    expect(screen.queryByText("Updated reminders are enabled.")).toBeNull()
    write.mockRestore(); cleanup(); localStorage.clear()
    const active = fixture("review_then_self")
    show({ ...active, reminderRuntime: { ...active.reminderRuntime!, legacyUnresolvedNodeIds: ["room"] } })
    const block = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("No storage") })
    fireEvent.click(screen.getByRole("button", { name: "I checked · allow future reminders" }))
    await screen.findByText("This review was not saved. Check the current assignment and browser saving.")
    expect(latest.reminderRuntime!.legacyUnresolvedNodeIds).toEqual(["room"])
    expect(latest.reminderRuntime!.deliveries).toEqual([])
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
  })
})
