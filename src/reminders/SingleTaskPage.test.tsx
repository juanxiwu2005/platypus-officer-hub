import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { reducer, StoreProvider, STORAGE_KEY, useStore, type Action } from "../data/store"
import type { DemoState, Node } from "../data/types"
import { applySchedule, computeSchedule } from "../engine/schedule"
import { addDays, fmtShort } from "../lib/dates"
import { makeTaskAccessGrant, taskAccessToken, taskAccessUrl, usableTaskAccessGrant, verifyTaskAccessGrant } from "./taskAccess"
import type { ReminderRuntime } from "./contracts"
import { buildReminderFacts, buildReminderInput, reminderPeople } from "./facts"
import { buildReminderMail } from "./mail"
import { planReminders } from "./engine"
import SingleTaskPage from "./SingleTaskPage"

vi.mock("../taskDetails/fileStorage", async original => ({ ...await original<typeof import("../taskDetails/fileStorage")>(), ...await import("../test/taskFileStorageMock") }))

vi.mock("./taskAccess", async original => {
  const actual = await original<typeof import("./taskAccess")>()
  return { ...actual, verifyTaskAccessGrant: vi.fn(actual.verifyTaskAccessGrant) }
})

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
beforeEach(() => { localStorage.clear(); vi.mocked(verifyTaskAccessGrant).mockClear() })
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const NODE = "single-room"
function fixture(patch: Partial<Node> = {}): DemoState {
  const base = seedDemo(undefined, "v2")
  const source = base.nodes.find(n => n.stepKey === "venue" && n.ownerId)!
  const event = { ...base.events.find(e => e.id === source.eventId)!, name: "Speaker Night", date: "2027-04-16", headcount: 40, venue: "campus" as const, budgetItems: [] }
  const node: Node = { ...source, id: NODE, title: "Reserve a room", ownerId: "jordan", ownerVersion: 0, status: "accepted", dependsOn: [], waitingOn: null, waitingOnPersonId: null, completedOn: undefined, ...patch }
  return applySchedule({ ...base, today: "2027-03-28", viewerId: "alex", nodes: [node], events: [event], funding: [], notifications: [], nudges: [], protocolLog: [], silenceCases: [], extensionRequests: [] })
}
async function issued(state = fixture(), requestId?: string) {
  const grant = await makeTaskAccessGrant(state, NODE, requestId)
  const s = reducer(state, { type: "issueTaskAccessGrant", grant })
  expect(usableTaskAccessGrant(s, taskAccessToken(grant))?.id).toBe(grant.id)
  return { state: s, grant, token: taskAccessToken(grant) }
}
let latest: DemoState
let dispatch: (a: Action) => void
function Spy() { const store = useStore(); latest = store.state; dispatch = store.dispatch; return null }
function Host({ state, token }: { state: DemoState; token: string }) {
  return <MemoryRouter><StoreProvider initial={state}><Spy /><SingleTaskPage token={token} /></StoreProvider></MemoryRouter>
}
async function show(state: DemoState, token: string) {
  const result = render(<Host state={state} token={token} />)
  await screen.findByTestId("single-task-page")
  await waitFor(() => expect(screen.queryByText("Opening draft…")).toBeNull())
  return result
}
function waitingState(detail = "Please confirm the room requirements", personId: string | null = "sam") {
  const enabled = reducer(fixture(), { type: "enableReminderPlan" })
  const waiting = reducer({ ...enabled, viewerId: "jordan" }, { type: "replyTask", nodeId: NODE, reply: "waiting", input: { waitingOn: detail, waitingOnPersonId: personId } })
  return { ...waiting, viewerId: "alex" }
}
async function waitingFixture() {
  const state = waitingState()
  const request = state.reminderRuntime!.waitingRequests.find(r => !r.closedOn)!
  return { ...await issued(state, request.id), requestId: request.id }
}

describe("the standalone owner task", () => {
  it("opens only the authorized task, emphasizes one due date and keeps real requirements and an applicable action", async () => {
    const { state, token } = await issued()
    await show(state, token)
    const page = screen.getByTestId("single-task-page")
    const head = page.querySelector(".td-head")!
    expect(within(page).getByRole("heading", { level: 1 }).textContent).toBe("Reserve a room")
    expect(head.textContent).toContain("Speaker Night")
    expect(screen.getByTestId("single-task-due").textContent).toContain(fmtShort(computeSchedule(state).nodes[NODE].club))
    expect(head.textContent).not.toMatch(/Start by|ASU deadline|Latest start|Event date/)
    expect(page.textContent).toContain("40 attendees")
    expect(page.textContent).toContain("record the booking confirmation")
    expect(within(page).queryByRole("heading", { name: "Why it matters" })).toBeNull()
    const action = within(page).getByRole("link", { name: /Student Union requests/ }) as HTMLAnchorElement
    expect(action.href).toBe("https://eoss.asu.edu/student-unions/submit-a-space-request")
    expect(within(page).getByRole("navigation", { name: "External task links" }).querySelectorAll("a")).toHaveLength(3)
    expect(within(page).getByLabelText("Details")).toBeTruthy()
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Ask/ })).toBeNull()
    expect(latest).toBe(state)
    await waitFor(() => expect(document.activeElement).toBe(within(page).getByRole("heading", { level: 1 })))
  })

  it("saves Working on it then Done through the same reusable token and keeps the completed task readable", async () => {
    const { state, token } = await issued()
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "in_progress" } })
    await waitFor(() => expect(latest.nodes[0].status).toBe("in_progress"))
    expect((screen.getByRole("combobox", { name: "Task status" }) as HTMLSelectElement).value).toBe("in_progress")
    expect(screen.getByText("Your update is saved. Thank you.")).toBeTruthy()
    expect(usableTaskAccessGrant(latest, token)).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Room confirmed; reference saved." } }); fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("done"))
    expect(screen.queryByRole("group", { name: "Update task status" })).toBeNull()
    expect(usableTaskAccessGrant(latest, token)).toBeTruthy()
    const saved = latest
    cleanup()
    await show(saved, token)
    expect(screen.getByTestId("single-task-status").textContent).toBe("Done")
    expect(screen.getByRole("button", { name: "Update submission" })).toBeTruthy()
    expect(latest).toBe(saved)
  })

  it("records Stuck without pretending to request an extension", async () => {
    const { state, token } = await issued()
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "blocked" } })
    await waitFor(() => expect(latest.nodes[0].status).toBe("blocked"))
    expect(latest.extensionRequests).toEqual([])
    expect((screen.getByRole("combobox", { name: "Task status" }) as HTMLSelectElement).value).toBe("blocked")
  })

  it.each(["missing", "null"] as const)("retains a malformed reminder runtime with %s waitingRequests while saving an ordinary owner update", async shape => {
    const enabled = reducer(fixture(), { type: "enableReminderPlan" })
    const malformed: Record<string, unknown> = { ...enabled.reminderRuntime }
    if (shape === "missing") delete malformed.waitingRequests
    else malformed.waitingRequests = null
    const { state, token } = await issued({ ...enabled, reminderRuntime: malformed as unknown as ReminderRuntime })
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "in_progress" } })
    await waitFor(() => expect(latest.nodes[0].status).toBe("in_progress"))
    expect(screen.getByText("Your update is saved. Thank you.")).toBeTruthy()
    expect(within(screen.getByTestId("single-task-page")).queryByRole("alert")).toBeNull()
    expect(latest.reminderRuntime).toEqual(malformed)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as DemoState
    expect(saved.nodes[0].status).toBe("in_progress")
    expect(saved.reminderRuntime).toEqual(malformed)
  })

  it("requires the existing claim handshake before offering progress actions", async () => {
    const { state, token } = await issued(fixture({ status: "unclaimed", acceptedOn: null }))
    await show(state, token)
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "I've got it" }))
    await screen.findByRole("combobox", { name: "Task status" })
    expect(latest.nodes[0].status).toBe("accepted")
    expect(latest.nodes[0].ownerId).toBe("jordan")
    expect(usableTaskAccessGrant(latest, token)).toBeTruthy()
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "in_progress" } })
    await waitFor(() => expect(latest.nodes[0].status).toBe("in_progress"))
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Room confirmed; reference saved." } }); fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("done"))
    expect(usableTaskAccessGrant(latest, token)).toBeTruthy()
  })

  it("saves the actual waiting detail and target, while excluding self and former people from the chooser", async () => {
    const base = fixture()
    const stateWithFormer = { ...base, people: base.people.map(p => p.id === "maya" ? { ...p, leftOn: base.today } : p) }
    const { state, token } = await issued(reducer(stateWithFormer, { type: "enableReminderPlan" }))
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    const select = screen.getByRole("combobox", { name: "Waiting on" })
    expect(within(select).queryByRole("option", { name: "Jordan Patel" })).toBeNull()
    expect(within(select).queryByRole("option", { name: "Maya Chen" })).toBeNull()
    fireEvent.change(select, { target: { value: "sam" } })
    fireEvent.change(screen.getByRole("textbox", { name: /What help or input/ }), { target: { value: "Please confirm the room requirements" } })
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("waiting"))
    expect(latest.nodes[0]).toMatchObject({ ownerId: "jordan", waitingOnPersonId: "sam", waitingOn: "Please confirm the room requirements" })
    expect(latest.reminderRuntime!.waitingRequests.find(r => !r.closedOn)?.recipientId).toBe("sam")
    expect(latest.viewerId).toBe("alex")
    expect(latest.reminderRuntime!.updates.at(-1)).toMatchObject({ actorId: "jordan", ownerReply: true })
  })

  it("keeps an external dependency as text rather than guessing an email recipient", async () => {
    const { state, token } = await issued(reducer(fixture(), { type: "enableReminderPlan" }))
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    fireEvent.change(screen.getByRole("combobox", { name: "Waiting on" }), { target: { value: "other" } })
    fireEvent.change(screen.getByRole("textbox", { name: /What help or input/ }), { target: { value: "School room approval" } })
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("waiting"))
    expect(latest.nodes[0].waitingOnPersonId).toBeNull()
    expect(latest.reminderRuntime!.waitingRequests.find(r => !r.closedOn)?.recipientId).toBeNull()
  })

  it("prefills an existing waiting request and preserves its identity and delivered follow-up when saved unchanged", async () => {
    const detail = "Please confirm the accessible room requirements"
    const waiting = waitingState(detail)
    const candidate = planReminders(buildReminderInput(waiting, waiting.reminderRuntime!)).ready.find(c => c.reason === "waiting_on")!
    expect(candidate).toBeTruthy()
    const helper = await makeTaskAccessGrant(waiting, NODE, candidate.waitingRequestId)
    const prepared = reducer(waiting, {type: "issueTaskAccessGrant", grant: helper})
    const facts = buildReminderFacts(prepared, NODE)!, people = reminderPeople(prepared)
    const mail = buildReminderMail({today: waiting.today, facts, candidate, recipient: people.find(p => p.id === candidate.recipientId)!, request: prepared.reminderRuntime!.waitingRequests[0], requesterName: people.find(p => p.id === facts.ownerId)?.name, taskUrl: taskAccessUrl("https://demo.example.org", helper)})
    const delivered = reducer(prepared, { type: "confirmPlannedReminder", candidateId: candidate.id, via: "manual", message: {...mail, channel: "email", preparedOn: waiting.today, accessId: helper.id} })
    expect(delivered.reminderRuntime!.deliveries).toHaveLength(1)
    const { state, token } = await issued(delivered)
    const originalRequest = state.reminderRuntime!.waitingRequests[0]
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    expect((screen.getByRole("combobox", { name: "Waiting on" }) as HTMLSelectElement).value).toBe("sam")
    expect((screen.getByRole("textbox", { name: /What help or input/ }) as HTMLTextAreaElement).value).toBe(detail)
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await screen.findByText("Your update is saved. Thank you.")
    expect(latest.nodes[0].waitingOn).toBe(detail)
    expect(latest.reminderRuntime!.waitingRequests).toEqual([originalRequest])
    expect(latest.reminderRuntime!.deliveries).toEqual(state.reminderRuntime!.deliveries)
    const tomorrow = { ...latest, today: addDays(latest.today, 1) }
    expect(planReminders(buildReminderInput(tomorrow, tomorrow.reminderRuntime!)).ready.filter(c => c.reason === "waiting_on")).toEqual([])
  })

  it("reopens a cancelled waiting edit with the latest saved person and detail instead of the discarded draft", async () => {
    const { state, token } = await issued(waitingState())
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    fireEvent.change(screen.getByRole("textbox", { name: /What help or input/ }), { target: { value: "Discard this draft" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    act(() => dispatch({ type: "replyTask", nodeId: NODE, reply: "waiting", input: { waitingOn: "Please confirm the projector connection", waitingOnPersonId: "maya" } }))
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    expect((screen.getByRole("combobox", { name: "Waiting on" }) as HTMLSelectElement).value).toBe("maya")
    expect((screen.getByRole("textbox", { name: /What help or input/ }) as HTMLTextAreaElement).value).toBe("Please confirm the projector connection")
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await screen.findByText("Your update is saved. Thank you.")
    expect(latest.nodes[0]).toMatchObject({ waitingOn: "Please confirm the projector connection", waitingOnPersonId: "maya" })
  })

  it("prefills an existing external dependency without requiring a new person or replacing its saved detail", async () => {
    const detail = "School room approval"
    const { state, token } = await issued(waitingState(detail, null))
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    expect((screen.getByRole("combobox", { name: "Waiting on" }) as HTMLSelectElement).value).toBe("other")
    expect((screen.getByRole("textbox", { name: /What help or input/ }) as HTMLTextAreaElement).value).toBe(detail)
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await screen.findByText("Your update is saved. Thank you.")
    expect(latest.nodes[0]).toMatchObject({ waitingOn: detail, waitingOnPersonId: null })
    expect(latest.reminderRuntime!.waitingRequests).toEqual(state.reminderRuntime!.waitingRequests)
  })

  it("keeps the budget completion authority and does not dispatch a Done update for a finance step", async () => {
    const { state, token } = await issued(fixture({ stepKey: "budgetRequest", title: "Submit the event budget" }))
    await show(state, token)
    const submit = screen.getByRole("button", { name: "Submit result" })
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Application submitted" } })
    fireEvent.click(submit)
    await waitFor(() => expect(latest.nodes[0].taskWork?.submissions).toHaveLength(1))
    expect(latest.nodes[0].status).toBe("accepted")
    expect(screen.getByRole("link", { name: "Event Budget" }).getAttribute("href")).toContain("view=budget")
  })

  it("keeps ASU deadline risks visible outside the single-date heading", async () => {
    const s = fixture({ anchor: { kind: "rule", ruleId: "R03", days: 16, unit: "calendar" }, timing: undefined, ruleIds: ["R03"] })
    const official = computeSchedule(s).nodes[NODE].official!
    expect(official).toBeTruthy()
    const late = applySchedule({ ...s, today: addDays(official, 1), nodes: s.nodes.map(n => ({ ...n, clubDeadlineOverride: addDays(official, 2) })) })
    const { state, token } = await issued(late)
    await show(state, token)
    expect(screen.getByText(/Schedule notes/).parentElement!.textContent).toContain("ASU")
    expect(screen.getByTestId("single-task-page").querySelector(".td-head")!.textContent).not.toContain("ASU deadline")
  })

  it("shows the saved concrete instructions and completion criteria without replacing them with generic navigation", async () => {
    const { state, token } = await issued(fixture({ instructions: "Reserve an accessible room for 40 attendees and a projector.", completionCriteria: "Save the booking reference and confirmed room number.", why: "The invitation needs a confirmed accessible location." }))
    await show(state, token)
    expect(screen.getByText("Reserve an accessible room for 40 attendees and a projector.")).toBeTruthy()
    expect(screen.queryByText(/Save the booking reference and confirmed room number/)).toBeNull()
    expect(screen.queryByText("The invitation needs a confirmed accessible location.")).toBeNull()
    expect(screen.queryByText(/Open the platform and find/)).toBeNull()
  })

  it("reports a refused write instead of showing a local success when another tab has changed the saved club", async () => {
    const { state, token } = await issued()
    await show(state, token)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, org: { ...state.org, name: "Updated in another tab" } }))
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "in_progress" } })
    expect((await within(screen.getByTestId("single-task-page")).findByRole("alert")).textContent).toContain("not saved")
    expect(latest.nodes[0].status).toBe("accepted")
    expect(screen.queryByText("Your update is saved. Thank you.")).toBeNull()
  })

  it("keeps entered waiting details and the real task unchanged after a failed storage write, then saves on retry", async () => {
    const { state, token } = await issued(reducer(fixture(), { type: "enableReminderPlan" }))
    await show(state, token)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: latest.nodes[0].status === "waiting" ? "waiting-edit" : "waiting" } })
    fireEvent.change(screen.getByRole("combobox", { name: "Waiting on" }), { target: { value: "sam" } })
    fireEvent.change(screen.getByRole("textbox", { name: /What help or input/ }), { target: { value: "Confirm the accessible room entrance" } })
    const setItem = Storage.prototype.setItem
    const failedWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === STORAGE_KEY) throw new Error("Storage unavailable")
      return setItem.call(this, key, value)
    })
    try {
      fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
      const page = screen.getByTestId("single-task-page")
      expect((await within(page).findByRole("alert")).textContent).toContain("not saved")
      expect(latest.nodes[0].status).toBe("accepted")
      expect(latest.reminderRuntime!.waitingRequests).toEqual([])
      expect((screen.getByRole("textbox", { name: /What help or input/ }) as HTMLTextAreaElement).value).toBe("Confirm the accessible room entrance")
      expect(screen.queryByText("Your update is saved. Thank you.")).toBeNull()
    } finally { failedWrite.mockRestore() }
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("waiting"))
    expect(screen.getByText("Your update is saved. Thank you.")).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes[0]).toMatchObject({ status: "waiting", waitingOnPersonId: "sam", waitingOn: "Confirm the accessible room entrance" })
  })
})

describe("waiting requests stay separate from task ownership", () => {
  it("offers only request responses, records acknowledgements and provided input, and leaves the original task waiting", async () => {
    const { state, token, requestId } = await waitingFixture()
    await show(state, token)
    expect(screen.getByText("Please confirm the room requirements")).toBeTruthy()
    expect(screen.queryByRole("group", { name: "Update task status" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull()
    expect(screen.queryByRole("link", { name: /Open ASU space/ })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }))
    await waitFor(() => expect(latest.reminderRuntime!.waitingRequests.find(r => r.id === requestId)).toMatchObject({ response: "acknowledged", responseBy: "sam" }))
    expect(latest.nodes[0]).toMatchObject({ status: "waiting", ownerId: "jordan" })
    expect(usableTaskAccessGrant(latest, token)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Update provided" }))
    await waitFor(() => expect(latest.reminderRuntime!.waitingRequests.find(r => r.id === requestId)).toMatchObject({ response: "provided", responseBy: "sam" }))
    expect(latest.nodes[0]).toMatchObject({ status: "waiting", ownerId: "jordan" })
    expect(screen.queryByRole("group", { name: "Respond to help request" })).toBeNull()
    const saved = latest
    cleanup()
    await show(saved, token)
    expect(screen.getByTestId("single-task-status").textContent).toBe("Update provided")
  })

  it("turns a completed original task into a read-only closed request", async () => {
    const { state, token } = await waitingFixture()
    await show(state, token)
    act(() => dispatch({ type: "replyTask", nodeId: NODE, reply: "done" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("done"))
    expect(screen.queryByRole("button", { name: "Acknowledge" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Update provided" })).toBeNull()
    expect(screen.getByTestId("single-task-status").textContent).toBe("Request closed")
  })

  it("withdraws the old waiting target's controls when the owner chooses another person", async () => {
    const { state, token } = await waitingFixture()
    await show(state, token)
    act(() => dispatch({ type: "replyTask", nodeId: NODE, reply: "waiting", input: { waitingOn: "Please confirm the room requirements", waitingOnPersonId: "maya" } }))
    expect(screen.queryByTestId("single-task-page")).toBeNull()
    expect(screen.getByRole("heading", { name: "Check your task link" })).toBeTruthy()
  })
})

describe("authorization changes do not reuse old verification", () => {
  it("an unknown token shows a clear message and no task controls", async () => {
    render(<Host state={fixture()} token="not-issued" />)
    expect(await screen.findByRole("heading", { name: "Check your task link" })).toBeTruthy()
    expect(screen.queryByTestId("single-task-page")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("drops controls synchronously for a different pending token and ignores an obsolete successful verification", async () => {
    let resolve!: (ok: boolean) => void
    vi.mocked(verifyTaskAccessGrant).mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done }))
    const { state, token } = await issued()
    const view = render(<Host state={state} token={token} />)
    expect(screen.getByRole("heading", { name: "Opening your task…" })).toBeTruthy()
    view.rerender(<Host state={state} token="not-issued" />)
    expect(screen.getByRole("heading", { name: "Check your task link" })).toBeTruthy()
    await act(async () => resolve(true))
    expect(screen.queryByTestId("single-task-page")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("does not trust a valid first token while a second issued token is still being verified", async () => {
    const first = await issued()
    const grant = await makeTaskAccessGrant({ ...first.state, taskAccessGrants: [] }, NODE)
    const state = reducer(first.state, { type: "issueTaskAccessGrant", grant })
    const token = taskAccessToken(grant)
    const view = await show(state, first.token)
    let resolve!: (ok: boolean) => void
    vi.mocked(verifyTaskAccessGrant).mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done }))
    view.rerender(<Host state={state} token={token} />)
    expect(screen.queryByRole("group", { name: "Update task status" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Opening your task…" })).toBeTruthy()
    await act(async () => resolve(true))
    expect(screen.getByRole("combobox", { name: "Task status" })).toBeTruthy()
  })

  it("removes an old owner's controls immediately after reassignment", async () => {
    const { state, token } = await issued()
    await show(state, token)
    act(() => dispatch({ type: "updateNode", id: NODE, patch: { ownerId: "sam" } }))
    expect(screen.queryByTestId("single-task-page")).toBeNull()
    expect(screen.getByRole("heading", { name: "Check your task link" })).toBeTruthy()
  })

  it("does not display controls after signature verification fails", async () => {
    const { state, token } = await issued()
    vi.mocked(verifyTaskAccessGrant).mockResolvedValueOnce(false)
    render(<Host state={state} token={token} />)
    expect(await screen.findByRole("heading", { name: "Check your task link" })).toBeTruthy()
    expect(screen.queryByRole("group", { name: "Update task status" })).toBeNull()
  })

  it.each(["expired", "former"] as const)("rejects an %s recipient entry without showing its task", async reason => {
    const { state, token, grant } = await issued()
    const unavailable = reason === "expired" ? { ...state, today: addDays(grant.expiresOn, 1) }
      : { ...state, people: state.people.map(p => p.id === grant.recipientId ? { ...p, leftOn: state.today } : p) }
    render(<Host state={unavailable} token={token} />)
    expect(await screen.findByRole("heading", { name: "Check your task link" })).toBeTruthy()
    expect(screen.queryByTestId("single-task-page")).toBeNull()
  })
})
