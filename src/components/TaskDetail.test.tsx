import { webcrypto } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { TaskDetail } from "./TaskDetail"
import { seedDemo } from "../data/seed"
import { StoreProvider, useStore, STORAGE_KEY } from "../data/store"
import type { DemoState, Node } from "../data/types"
import { applySchedule } from "../engine/schedule"
import { fmtShort } from "../lib/dates"

vi.mock("../taskDetails/fileStorage", async original => ({ ...await original<typeof import("../taskDetails/fileStorage")>(), ...await import("../test/taskFileStorageMock") }))

beforeEach(() => { localStorage.clear(); vi.stubGlobal("crypto", webcrypto) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
let store: ReturnType<typeof useStore>
function fixture(patch: Partial<Node> = {}, viewerId = "jordan"): DemoState {
  const s = seedDemo(undefined, "v2"), source = s.nodes.find(n => n.stepKey === "venue")!
  return applySchedule({ ...s, viewerId, today: "2027-03-28", events: s.events.map(e => e.id === source.eventId ? { ...e, name: "Speaker Night", headcount: 40, venue: "campus" } : e), nodes: [{ ...source, id: "details-task", ownerId: "jordan", status: "accepted", dependsOn: [], instructions: "Book an accessible room for 40 attendees.", ...patch }], nudges: [], protocolLog: [], silenceCases: [], notifications: [] })
}
function Live({ token }: { token?: string }) { store = useStore(); return <TaskDetail node={store.state.nodes[0]} actorId={store.state.viewerId} token={token} /> }
async function show(state = fixture(), token?: string) {
  const rendered = render(<MemoryRouter><StoreProvider initial={state}><Live token={token} /></StoreProvider></MemoryRouter>)
  await waitFor(() => expect(screen.queryByText("Opening draft…")).toBeNull())
  return rendered
}

describe("the universal task page and edit drawer", () => {
  it("shows task identity, one due, one requirement, the booking links and the universal form", async () => {
    const s = fixture(); await show(s)
    expect(screen.getByText("← Speaker Night")).toBeTruthy()
    expect(screen.getByRole("heading", { name: s.nodes[0].title })).toBeTruthy()
    expect(screen.getByTestId("task-due").textContent).toBe(`Due ${fmtShort(s.nodes[0].clubDeadline!)}`)
    expect(screen.getAllByText("Book an accessible room for 40 attendees.")).toHaveLength(1)
    expect(within(screen.getByRole("navigation", { name: "External task links" })).getAllByRole("link")).toHaveLength(3)
    expect(screen.getByLabelText("Details").tagName).toBe("TEXTAREA")
    expect(screen.queryByText("Reminder plan")).toBeNull()
    expect(screen.queryByText("Why it matters:")).toBeNull()
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
  })
  it("uses the same text-and-files form for custom workflow nodes, without injecting room-specific links", async () => {
    await show(fixture({ stepKey: "fictional-custom", title: "Prepare the demo", externalLinks: [{ label: "Custom platform", url: "https://example.org/work" }] }))
    expect(screen.getByLabelText("Details")).toBeTruthy()
    expect(screen.getByRole("link", { name: /Custom platform/ }).getAttribute("href")).toBe("https://example.org/work")
    expect(screen.queryByRole("link", { name: /Mazevo/ })).toBeNull()
  })
  it("does not inject campus booking links for an off-campus venue", async () => {
    const s = fixture(); await show({ ...s, events: s.events.map(e => ({ ...e, venue: "offcampus" })) })
    expect(screen.queryByRole("navigation", { name: "External task links" })).toBeNull()
  })
  it("retains existing draft materials without inventing a published submission", async () => {
    await show(fixture({ draftLink: "https://example.org/existing-materials" }))
    expect(screen.getByRole("link", { name: /Open current draft/ }).getAttribute("href")).toBe("https://example.org/existing-materials")
    expect(store.state.nodes[0].taskWork).toBeUndefined()
  })
  it("saves the draft without completion, restores it on refresh, and publishes files with completion", async () => {
    await show()
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Student Union, Room 204" } })
    fireEvent.change(screen.getByLabelText("Attach files"), { target: { files: [new File(["hello"], "booking.txt", { type: "text/plain" }), new File(["plan"], "room.txt", { type: "text/plain" })] } })
    await screen.findByRole("button", { name: "Download booking.txt" })
    await waitFor(() => expect(screen.getByTestId("task-autosave-status").textContent).toContain("Draft saved automatically"))
    expect(store.state.nodes[0].status).toBe("accepted")
    expect(store.state.nodes[0].taskWork).toBeUndefined()
    const draft = store.state; cleanup(); await show(draft)
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Student Union, Room 204")
    fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(store.state.nodes[0].status).toBe("done"))
    expect(store.state.nodes[0].taskWork?.submissions[0].authorId).toBe("jordan")
    expect(screen.getByText(/Submitted by Jordan/)).toBeTruthy()
  })
  it("lets a president read a member's submission while other members get a read-only result", async () => {
    await show(); fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Room 204, east entrance" } }); fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(store.state.nodes[0].status).toBe("done"))
    const saved = store.state; cleanup(); await show({ ...saved, viewerId: "sam" })
    expect(screen.getByText("Room 204, east entrance")).toBeTruthy()
    expect(screen.queryByRole("textbox", { name: "Details" })).toBeNull()
    expect(screen.queryByRole("button", { name: /Submit|Save draft|Edit/ })).toBeNull()
    cleanup(); await show({ ...saved, viewerId: "alex" })
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Room 204, east entrance")
    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy()
  })
  it("keeps text and files after a refused storage write without claiming completion", async () => {
    await show(); fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Keep this result" } })
    fireEvent.change(screen.getByLabelText("Attach files"), { target: { files: [new File(["hello"], "booking.txt")] } })
    await screen.findByRole("button", { name: "Download booking.txt" })
    const write = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) { if (key === STORAGE_KEY) throw new Error("Storage full"); write.call(this, key, value) })
    fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(within(screen.getByTestId("task-submission")).getByRole("alert").textContent).toContain("not saved"))
    expect(store.state.nodes[0].status).toBe("accepted")
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Keep this result")
    expect(screen.getByRole("button", { name: "Download booking.txt" })).toBeTruthy()
  })
  it("rejects unsupported files while preserving the current draft", async () => {
    await show(); fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Keep me" } })
    fireEvent.change(screen.getByLabelText("Attach files"), { target: { files: [new File(["script"], "bad.html")] } })
    expect((await screen.findByRole("alert")).textContent).toContain("choose a PDF")
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Keep me")
  })
  it("edits a task in a separate drawer, saves once, and leaves its submission and template intact", async () => {
    await show(fixture({}, "alex")); fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Unsubmitted member result" } })
    const template = store.state.org.eventWorkflow
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    const editor = screen.getByRole("dialog", { name: "Edit task" })
    fireEvent.change(within(editor).getByLabelText("Task name"), { target: { value: "Room confirmed" } })
    fireEvent.change(within(editor).getByLabelText("Link 2 URL"), { target: { value: "https://example.org/rooms" } })
    expect(store.state.nodes[0].title).not.toBe("Room confirmed")
    fireEvent.click(within(editor).getByRole("button", { name: "Save changes" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(store.state.nodes[0].title).toBe("Room confirmed")
    expect(store.state.nodes[0].externalLinks?.[1].url).toBe("https://example.org/rooms")
    expect(store.state.org.eventWorkflow).toBe(template)
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Unsubmitted member result")
  })
  it("cancels editing and refuses a stale drawer after another task edit", async () => {
    await show(fixture({}, "alex")); const old = store.state.nodes[0].title
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Discard me" } })
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(store.state.nodes[0].title).toBe(old)
    fireEvent.click(screen.getByRole("button", { name: "Edit" }))
    act(() => store.dispatch({ type: "updateNode", id: "details-task", patch: { title: "Newer edit" } }))
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(screen.getByRole("alert").textContent).toContain("not saved")
    expect(store.state.nodes[0].title).toBe("Newer edit")
  })
  it("withholds editing and claiming through an invalid legacy link", async () => {
    await show(fixture({ status: "unclaimed" }), "not-an-issued-token")
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull()
    expect(screen.queryByLabelText("Details")).toBeNull()
    expect(screen.queryByRole("button", { name: "I've got it" })).toBeNull()
  })
  it("retains an unknown reminder runtime during ordinary edits and updates", async () => {
    const s = fixture(), runtime = { opaque: "preserve" } as unknown as DemoState["reminderRuntime"]
    await show({ ...s, reminderRuntime: runtime })
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "in_progress" } })
    await waitFor(() => expect(store.state.nodes[0].status).toBe("in_progress"))
    expect(store.state.reminderRuntime).toEqual(runtime)
  })
  it("undoes accidental completion, preserves the submitted files and supports status changes after reload", async () => {
    await show()
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Room 204, awaiting the final check" } })
    fireEvent.change(screen.getByLabelText("Attach files"), { target: { files: [new File(["proof"], "proof.txt")] } })
    fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    const undo = await screen.findByRole("button", { name: "Undo mark done" })
    await waitFor(() => expect((undo as HTMLButtonElement).disabled).toBe(false))
    expect(store.state.nodes[0].status).toBe("done")
    const write = Storage.prototype.setItem
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) { if (key === STORAGE_KEY) throw new Error("Storage unavailable"); write.call(this, key, value) })
    fireEvent.click(undo)
    expect(store.state.nodes[0].status).toBe("done")
    expect(within(screen.getByTestId("task-submission")).getByRole("alert").textContent).toContain("not reopened")
    blocked.mockRestore()
    fireEvent.click(undo)
    expect(store.state.nodes[0].status).toBe("accepted")
    expect(store.state.nodes[0].completedOn).toBeUndefined()
    expect(store.state.nodes[0].taskWork?.submissions).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Download proof.txt" })).toBeTruthy()
    expect(store.state.contributions.filter(c => c.nodeId === "details-task")).toHaveLength(0)
    fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await waitFor(() => expect(store.state.nodes[0].taskWork?.submissions).toHaveLength(2))
    const saved = store.state; cleanup(); await show(saved)
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "blocked" } })
    expect(store.state.nodes[0].status).toBe("blocked")
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toContain("Room 204")
  })
  it("keeps Undo mark done after Task Details is closed and reopened, until a reload or a newer change (S3)", async () => {
    await show(fixture({ id: "undo-reopen" }))
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Room 204" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit & mark done" }))
    await screen.findByRole("button", { name: "Undo mark done" })
    const finished = store.state
    cleanup(); await show({ ...finished, nodes: finished.nodes.map(n => ({ ...n, ownerVersion: (n.ownerVersion ?? 0) + 1 })) })
    expect(screen.queryByRole("button", { name: "Undo mark done" })).toBeNull()
    cleanup(); await show(finished)
    fireEvent.click(await screen.findByRole("button", { name: "Undo mark done" }))
    expect(store.state.nodes[0].status).toBe("accepted")
    const reopened = store.state; cleanup(); await show(reopened)
    expect(screen.queryByRole("button", { name: "Undo mark done" })).toBeNull()
  })
  it("updates a target directly with selected teammates, preserves failed input, and removes the approval step", async () => {
    await show()
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Keep my work" } })
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), { target: { value: "extension" } })
    expect(screen.queryByLabelText("Current draft link")).toBeNull()
    fireEvent.change(screen.getByLabelText("New target date"), { target: { value: "2027-05-03" } })
    fireEvent.change(screen.getByLabelText("Message (optional)"), { target: { value: "We are waiting for the room office." } })
    fireEvent.click(screen.getByRole("checkbox", { name: /Alex Rivera/ }))
    fireEvent.click(screen.getByRole("button", { name: "+ Add teammate" }))
    fireEvent.change(screen.getByRole("combobox", { name: "Teammate" }), { target: { value: "sam" } })
    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    const due = store.state.nodes[0].clubDeadline, notices = store.state.notifications
    const write = Storage.prototype.setItem
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(this: Storage, key, value) { if (key === STORAGE_KEY) throw new Error("Storage unavailable"); write.call(this, key, value) })
    fireEvent.click(screen.getByRole("button", { name: "Update date & notify" }))
    expect(store.state.nodes[0].clubDeadline).toBe(due)
    expect(store.state.notifications).toEqual(notices)
    expect(screen.getByRole("textbox", { name: "Message (optional)" }).getAttribute("maxlength")).toBe("300")
    expect((screen.getByRole("checkbox", { name: /Sam Okafor/ }) as HTMLInputElement).checked).toBe(true)
    blocked.mockRestore()
    fireEvent.click(screen.getByRole("button", { name: "Update date & notify" }))
    expect(store.state.nodes[0]).toMatchObject({ status: "accepted", clubDeadline: "2027-05-03" })
    expect(store.state.nodes[0].targetDates?.changes[0].notifiedPersonIds).toEqual(["sam"])
    expect(store.state.notifications.filter(n => n.kind === "info" && n.text.includes("We are waiting for the room office."))).toHaveLength(1)
    expect(store.state.extensionRequests).toHaveLength(0)
    expect(screen.queryByRole("button", { name: /Approve extension|Request extension/ })).toBeNull()
    expect((screen.getByLabelText("Details") as HTMLTextAreaElement).value).toBe("Keep my work")
  })
})
