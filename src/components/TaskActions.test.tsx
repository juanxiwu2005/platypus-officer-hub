import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { webcrypto } from "node:crypto"
import { TaskActions } from "./TaskActions"
import { seedDemo } from "../data/seed"
import { reducer, STORAGE_KEY, StoreProvider, useStore, type Action } from "../data/store"
import type { DemoState, Node } from "../data/types"
import { applySchedule } from "../engine/schedule"
import { addDays } from "../lib/dates"
import { grantToken, makeOfficerGrant } from "../lib/officerLinks"

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
beforeEach(() => localStorage.clear())
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())
const ID = "action-test"
function fixture(patch: Partial<Node> = {}) {
  const base = seedDemo(undefined, "v2"), source = base.nodes.find(n => n.stepKey === "venue")!
  const state = applySchedule({ ...base, viewerId: "jordan", nodes: [{ ...source, id: ID, ownerId: "jordan", status: "accepted" as const, dependsOn: [], waitingOn: null, waitingOnPersonId: null, ...patch }], nudges: [], protocolLog: [], silenceCases: [], notifications: [], extensionRequests: [] })
  return reducer({ ...state, viewerId: "alex" }, { type: "upgradeReminderPlan" })
}
let latest: DemoState
let dispatch: (action: Action) => void
function Live({ actorId, token, initialReply }: { actorId: string; token?: string; initialReply?: string }) {
  const store = useStore(); latest = store.state; dispatch = store.dispatch
  return <TaskActions node={latest.nodes[0]} actorId={actorId} token={token} initialReply={initialReply} />
}
function show(initial = fixture(), actorId = "jordan", token?: string, initialReply?: string) {
  return render(<MemoryRouter><StoreProvider initial={{ ...initial, viewerId: token ? initial.viewerId : actorId }}><Live actorId={actorId} token={token} initialReply={initialReply} /></StoreProvider></MemoryRouter>)
}
function enterWaiting(detail: string, target = "sam") {
  fireEvent.click(screen.getByRole("button", { name: "Waiting on" }))
  fireEvent.change(screen.getByRole("combobox", { name: "Waiting on" }), { target: { value: target } })
  fireEvent.change(screen.getByRole("textbox", { name: "What help or input is needed?" }), { target: { value: detail } })
}

describe("task actions use actual persisted state", () => {
  it("records Working, Stuck and Done without using an extension as Working", async () => {
    show()
    fireEvent.click(screen.getByRole("button", { name: "Working on it" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("in_progress"))
    expect(latest.extensionRequests).toEqual([])
    expect(screen.getByRole("status").textContent).not.toContain("follow-up has stopped")
    fireEvent.click(screen.getByRole("button", { name: "Stuck" }))
    expect(latest.nodes[0].status).toBe("blocked")
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }))
    expect(latest.nodes[0].status).toBe("done")
    expect(screen.queryByRole("button", { name: "Working on it" })).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).nodes[0].status).toBe("done")
  })

  it.each(["sam", "other"])("stores a concrete waiting description for %s without changing the owner", async target => {
    const base = fixture()
    show({ ...base, people: base.people.map(p => p.id === "maya" ? { ...p, leftOn: base.today } : p) })
    enterWaiting("Please confirm the accessible room requirements", target)
    const chooser = screen.getByRole("combobox", { name: "Waiting on" })
    expect(within(chooser).queryByRole("option", { name: "Maya Chen" })).toBeNull()
    expect(within(chooser).queryByRole("option", { name: "Jordan Patel" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("waiting"))
    expect(latest.nodes[0]).toMatchObject({ ownerId: "jordan", waitingOn: "Please confirm the accessible room requirements", waitingOnPersonId: target === "other" ? null : target })
    expect(latest.reminderRuntime!.waitingRequests.at(-1)?.recipientId).toBe(target === "other" ? null : target)
  })

  it("prefills saved waiting details, retains the same request on unchanged save, and discards cancelled edits", () => {
    const waiting = reducer({ ...fixture(), viewerId: "jordan" }, { type: "replyTask", nodeId: ID, reply: "waiting", input: { waitingOn: "Please confirm room access", waitingOnPersonId: "sam" } })
    show(waiting)
    const original = latest.reminderRuntime!.waitingRequests
    fireEvent.click(screen.getByRole("button", { name: "Waiting on" }))
    expect((screen.getByRole("textbox", { name: "What help or input is needed?" }) as HTMLTextAreaElement).value).toBe("Please confirm room access")
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    expect(latest.reminderRuntime!.waitingRequests).toEqual(original)
    enterWaiting("Discard this draft")
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    act(() => dispatch({ type: "replyTask", nodeId: ID, reply: "waiting", input: { waitingOn: "Please confirm projector access", waitingOnPersonId: "maya" } }))
    fireEvent.click(screen.getByRole("button", { name: "Waiting on" }))
    expect((screen.getByRole("combobox", { name: "Waiting on" }) as HTMLSelectElement).value).toBe("maya")
    expect((screen.getByRole("textbox", { name: "What help or input is needed?" }) as HTMLTextAreaElement).value).toBe("Please confirm projector access")
  })

  it("requires concrete help text before recording a named waiting request", () => {
    show(); enterWaiting("")
    fireEvent.submit(screen.getByRole("button", { name: "Save waiting status" }).closest("form")!)
    expect(screen.getByRole("alert").textContent).toContain("Describe the help")
    expect(latest.nodes[0].status).toBe("accepted")
  })

  it("keeps a failed waiting draft for retry instead of showing Saved", async () => {
    show(); enterWaiting("Please confirm room access")
    const write = Storage.prototype.setItem
    const failure = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) { if (key === STORAGE_KEY) throw new Error("Storage unavailable"); return write.call(this, key, value) })
    try {
      fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
      expect(latest.nodes[0].status).toBe("accepted")
      expect(screen.getAllByRole("alert").some(n => n.textContent?.includes("not saved"))).toBe(true)
      expect((screen.getByRole("textbox", { name: "What help or input is needed?" }) as HTMLTextAreaElement).value).toBe("Please confirm room access")
      expect(screen.queryByText("Your update is saved. Thank you.")).toBeNull()
    } finally { failure.mockRestore() }
    fireEvent.click(screen.getByRole("button", { name: "Save waiting status" }))
    await waitFor(() => expect(latest.nodes[0].status).toBe("waiting"))
    expect(screen.getByText("Your update is saved. Thank you.")).toBeTruthy()
  })

  it("does not claim success after a cross-tab conflict", () => {
    const state = fixture(); show(state)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, today: addDays(state.today, 1) }))
    fireEvent.click(screen.getByRole("button", { name: "Working on it" }))
    expect(latest.nodes[0].status).toBe("accepted")
    expect(screen.queryByText("Your update is saved. Thank you.")).toBeNull()
  })

  it("claims before accepting status updates", () => {
    show(fixture({ status: "unclaimed", acceptedOn: null }))
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "I've got it" }))
    expect(latest.nodes[0]).toMatchObject({ ownerId: "jordan", status: "accepted" })
    expect(screen.getByRole("button", { name: "Working on it" })).toBeTruthy()
  })

  it("keeps archived responsibility data inert after the approved matching rollback", () => {
    const state = fixture({ status: "unclaimed", acceptedOn: null, matching: { workflowId: "missing-workflow", stepId: "venue", responsibilityId: "missing-duty", reason: "primary_candidate" } })
    show({ ...state, matching: undefined })
    expect((screen.getByRole("button", { name: "I've got it" }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "I've got it" }))
    expect(latest.nodes[0].status).toBe("accepted")
    expect(screen.queryByRole("button", { name: "Working on it" })).toBeTruthy()
  })

  it.each(["maya", "sam"])("does not give %s permission to update another member's task", actor => {
    show(fixture(), actor)
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Working on it" })).toBeNull()
    expect(screen.getByText("Only the owner or president can update this task.")).toBeTruthy()
  })

  it("allows the president to report progress while keeping the real owner", () => {
    show(fixture(), "alex")
    fireEvent.click(screen.getByRole("button", { name: "Working on it" }))
    expect(latest.nodes[0]).toMatchObject({ ownerId: "jordan", status: "in_progress" })
    expect(latest.reminderRuntime!.updates.at(-1)).toMatchObject({ actorId: "alex", ownerReply: false })
  })

  it("does not grant a vice president permission to report another member's status", () => {
    const state = fixture(), roleId = state.people.find(p => p.id === "maya")!.roleId
    show({ ...state, roles: state.roles.map(r => r.id === roleId ? { ...r, fn: "vice_president" as const } : r) }, "maya")
    expect(screen.queryByRole("button", { name: "Working on it" })).toBeNull()
    expect(screen.getByText("Only the owner or president can update this task.")).toBeTruthy()
  })

  it("keeps finance completion inside Event Budget", () => {
    show(fixture({ stepKey: "budgetRequest" }))
    expect((screen.getByRole("button", { name: "Mark done" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Mark done" }))
    expect(latest.nodes[0].status).toBe("accepted")
    expect(screen.getByRole("button", { name: "Open Event Budget" })).toBeTruthy()
  })

  it("updates the internal target without approval and keeps school dates unchanged", () => {
    const initial = fixture(), due = initial.nodes[0].clubDeadline!
    show(initial)
    fireEvent.click(screen.getByRole("button", { name: "Need more time" }))
    expect(screen.queryByLabelText("Current draft link")).toBeNull()
    fireEvent.change(screen.getByRole("textbox", { name: "Message (optional)" }), { target: { value: "Waiting for confirmation" } })
    fireEvent.change(screen.getByLabelText("New target date"), { target: { value: addDays(due, 2) } })
    fireEvent.click(screen.getByRole("button", { name: "Update date & notify" }))
    expect(latest.extensionRequests).toHaveLength(0)
    expect(latest.nodes[0].clubDeadline).toBe(addDays(due, 2))
    expect(latest.nodes[0].officialDeadline).toBe(initial.nodes[0].officialDeadline)
    expect(screen.getByRole("status").textContent).toContain("Target date updated")
  })

  it("keeps a legacy token action scoped and consumes it only after a saved update", async () => {
    const initial = fixture(), grant = await makeOfficerGrant(initial, ID)
    const state = reducer(initial, { type: "issueOfficerGrant", grant })
    show(state, "jordan", grantToken(grant), "waiting")
    expect(screen.getByRole("textbox", { name: "What help or input is needed?" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    fireEvent.click(screen.getByRole("button", { name: "Stuck" }))
    expect(latest.nodes[0].status).toBe("blocked")
    expect(latest.officerGrants.find(g => g.id === grant.id)?.usedOn).toBe(state.today)
    expect(latest.viewerId).toBe("alex")
  })
})
