import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { webcrypto } from "node:crypto"
import { seedDemo } from "../data/seed"
import { buildExport, reducer } from "../data/store"
import type { DemoState } from "../data/types"
import { taskDefinitionKey, taskWork } from "./data"
import type { TaskWorkInput } from "./contracts"
import { makeTaskAccessGrant, taskAccessToken } from "../reminders/taskAccess"

beforeAll(() => vi.stubGlobal("crypto", webcrypto))
afterEach(() => localStorage.clear())
afterAll(() => vi.unstubAllGlobals())
function fixture(): DemoState {
  const s = seedDemo(undefined, "v2"), node = s.nodes.find(n => n.stepKey === "venue")!
  return { ...s, viewerId: "jordan", nodes: [{ ...node, ownerId: "jordan", ownerVersion: 0, status: "accepted", taskWork: undefined }], nudges: [], protocolLog: [], silenceCases: [], notifications: [] }
}
const file = { id: "file-1", name: "booking.txt", size: 5, dataUrl: "data:application/octet-stream;base64,aGVsbG8=" }
function input(s: DemoState, submit = false): TaskWorkInput {
  return { details: "Student Union, Room 204", attachments: [file], expectedRevision: s.nodes[0].taskWork?.revision ?? 0, expectedOwnerId: s.nodes[0].ownerId, expectedOwnerVersion: s.nodes[0].ownerVersion ?? 0, submit }
}
const save = (s: DemoState, i = input(s)) => reducer(s, { type: "saveTaskWork", nodeId: s.nodes[0].id, input: i })

describe("universal work on actual task nodes", () => {
  it("keeps drafts independent from status and stores a portable submission and files atomically with completion", () => {
    const start = fixture(), draft = save(start)
    expect(draft.nodes[0].status).toBe("accepted")
    expect(draft.nodes[0].lastUpdate).toBe(start.nodes[0].lastUpdate)
    expect(draft.nodes[0].taskWork?.submissions).toEqual([])
    const submitted = save(draft, input(draft, true))
    expect(submitted.nodes[0].status).toBe("done")
    expect(submitted.nodes[0].taskWork?.drafts).toEqual([])
    const exported = buildExport(submitted, [], Date.now()).state
    expect(JSON.parse(JSON.stringify(exported)).nodes[0].taskWork.files).toEqual([file])
    const restored = reducer(seedDemo(undefined, "v2"), { type: "replace", state: JSON.parse(JSON.stringify(exported)) })
    expect(restored.nodes[0].taskWork).toEqual(submitted.nodes[0].taskWork)
    expect(taskWork(submitted.nodes[0])?.submissions[0]).toMatchObject({ authorId: "jordan", details: "Student Union, Room 204", attachmentIds: [file.id] })
  })
  it("keeps previous submissions when a completed task's result is corrected", () => {
    const first = save(fixture(), input(fixture(), true))
    const corrected = save(first, { ...input(first, true), details: "Updated room: 205" })
    expect(corrected.nodes[0].taskWork?.submissions.map(s => s.details)).toEqual(["Student Union, Room 204", "Updated room: 205"])
    expect(corrected.nodes[0].taskWork?.files).toEqual([file])
  })
  it("rejects stale work, reassigned work, other members, former officers and unclaimed tasks", () => {
    const start = fixture(), original = input(start), draft = save(start)
    expect(save(draft, original)).toBe(draft)
    const reassigned = reducer({ ...start, viewerId: "alex" }, { type: "updateNode", id: start.nodes[0].id, patch: { ownerId: "sam" } })
    expect(save({ ...reassigned, viewerId: "jordan" }, original).nodes[0].taskWork).toBeUndefined()
    for (const s of [{ ...start, viewerId: "sam" }, { ...start, people: start.people.map(p => p.id === "jordan" ? { ...p, leftOn: start.today } : p) }, { ...start, nodes: start.nodes.map(n => ({ ...n, status: "unclaimed" as const })) }]) expect(save(s).nodes).toBe(s.nodes)
  })
  it("does not overwrite a corrupt or future-version submission", () => {
    const s = fixture()
    for (const work of [{ version: 3 }, { version: 1, revision: 0, files: [file], drafts: [], submissions: [{ authorId: "sam", details: "preserve", savedOn: s.today, attachmentIds: ["missing"] }] }]) {
      const bad = { ...s, nodes: s.nodes.map(n => ({ ...n, taskWork: work as unknown as typeof n.taskWork })) }
      expect(save(bad, input(s))).toBe(bad)
    }
  })
  it("rejects empty completion, mismatched file contents, executable files and excessive attachments", () => {
    const s = fixture()
    for (const change of [{ details: " ", attachments: [], submit: true }, { attachments: [{ ...file, size: 99 }] }, { attachments: [{ ...file, name: "run.html" }] }, { attachments: Array.from({ length: 6 }, (_, i) => ({ ...file, id: `file-${i}` })) }]) expect(save(s, { ...input(s), ...change })).toBe(s)
  })
  it("accepts three files totalling 5 MB, rejects either size limit, and keeps earlier submission files", () => {
    const s = fixture(), mb = 1024 * 1024
    const attachments = [2, 2, 1].map((size, i) => ({ id: `large-${i}`, blobKey: `blob-${i}`, name: `booking-${i}.pdf`, size: size * mb }))
    const first = save(s, { ...input(s, true), attachments })
    expect(first.nodes[0].taskWork).toMatchObject({ version: 2, files: attachments })
    for (const invalid of [attachments.map(f => ({ ...f, size: 2 * mb })), [{ ...attachments[0], size: 2 * mb + 1 }], [...attachments, { ...attachments[2], id: "fourth" }]]) expect(save(s, { ...input(s, true), attachments: invalid })).toBe(s)
    const second = save(first, { ...input(first, true), attachments: [{ ...attachments[0], id: "new-file", blobKey: "new-blob" }] })
    expect(taskWork(second.nodes[0])?.files).toHaveLength(4)
    expect(taskWork(second.nodes[0])?.submissions[0].attachmentIds).toEqual(attachments.map(f => f.id))
  })
  it("continues to read older five-file records after lowering the new upload count", () => {
    const s = fixture(), files = Array.from({ length: 5 }, (_, i) => ({ ...file, id: `old-${i}` }))
    s.nodes[0].taskWork = { version: 1, revision: 1, files, drafts: [{ authorId: "jordan", details: "Old draft", attachmentIds: files.map(f => f.id), savedOn: s.today }], submissions: [] }
    expect(taskWork(s.nodes[0])?.files).toHaveLength(5)
  })
  it("accepts evidence for a finance node without bypassing Event Budget", () => {
    const s = fixture(); s.nodes[0].stepKey = "budgetRequest"
    const next = save(s, input(s, true))
    expect(next.nodes[0].status).toBe("accepted")
    expect(next.nodes[0].taskWork?.submissions).toHaveLength(1)
  })
  it("writes the issued owner actor through the email entry, and rejects altered, waiting and reassigned grants", async () => {
    const start = fixture(), grant = await makeTaskAccessGrant({ ...start, viewerId: "alex" }, start.nodes[0].id)
    const issued = reducer({ ...start, viewerId: "alex" }, { type: "issueTaskAccessGrant", grant })
    const action = { type: "saveTaskWork" as const, nodeId: start.nodes[0].id, input: input(start, true), authorization: { kind: "access" as const, token: taskAccessToken(grant) } }
    const done = reducer(issued, action)
    expect(done.nodes[0].taskWork?.submissions[0].authorId).toBe("jordan")
    expect(done.viewerId).toBe("alex")
    expect(reducer(issued, { ...action, authorization: { ...action.authorization, token: "altered" } })).toBe(issued)
    const moved = reducer(issued, { type: "updateNode", id: start.nodes[0].id, patch: { ownerId: "sam" } })
    expect(reducer(moved, action)).toBe(moved)
    const enabled = reducer({ ...start, viewerId: "alex" }, { type: "upgradeReminderPlan" })
    const waiting = reducer({ ...enabled, viewerId: "jordan" }, { type: "replyTask", nodeId: start.nodes[0].id, reply: "waiting", input: { waitingOn: "Please confirm access", waitingOnPersonId: "sam" } })
    const request = waiting.reminderRuntime!.waitingRequests.at(-1)!
    const helperGrant = await makeTaskAccessGrant({ ...waiting, viewerId: "alex" }, start.nodes[0].id, request.id)
    const helper = reducer({ ...waiting, viewerId: "alex" }, { type: "issueTaskAccessGrant", grant: helperGrant })
    expect(reducer(helper, { ...action, input: input(helper), authorization: { kind: "access", token: taskAccessToken(helperGrant) } })).toBe(helper)
  })
  it("edits links atomically, refuses unsafe or stale edits and leaves templates and submissions intact", () => {
    const s = { ...save(fixture()), viewerId: "alex" }, id = s.nodes[0].id, expectedTask = taskDefinitionKey(s.nodes[0])
    const good = reducer(s, { type: "updateNode", id, expectedTask, patch: { title: "Book a room", externalLinks: [{ label: "My platform", url: "https://example.org/book" }] } })
    expect(good.nodes[0].externalLinks).toHaveLength(1)
    expect(good.nodes[0].taskWork).toEqual(s.nodes[0].taskWork)
    expect(good.org.eventWorkflow).toBe(s.org.eventWorkflow)
    expect(reducer(good, { type: "updateNode", id, expectedTask, patch: { title: "Stale" } })).toBe(good)
    expect(reducer(s, { type: "updateNode", id, patch: { externalLinks: [{ label: "Unsafe", url: "javascript:alert(1)" }] } })).toBe(s)
  })
})
