import { webcrypto } from "node:crypto"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { TaskDraftSession, type DraftScope } from "./drafts"
import { readTaskDraft, writeTaskDraft, taskAttachmentBlob, draftNamespace } from "./fileStorage"
import { taskWorkArchive, restoreTaskWorkArchive } from "./archive"
import { seedDemo } from "../data/seed"

vi.mock("./fileStorage", async original => ({ ...await original<typeof import("./fileStorage")>(), ...await import("../test/taskFileStorageMock") }))
beforeAll(() => { vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("indexedDB", {}) })
afterAll(() => vi.unstubAllGlobals())
const scope = (): DraftScope => ({ workspaceKey: crypto.randomUUID(), nodeId: "room", actorId: "jordan", ownerId: "jordan", ownerVersion: 0, workRevision: 0, details: "", files: [], hasDraft: false })
async function ready(session: TaskDraftSession) { await vi.waitFor(() => expect(session.getSnapshot().loading).toBe(false)) }

describe("durable automatic task drafts", () => {
  it("flushes the latest edits and files while a view is absent, restores them, and isolates tasks, people and assignments", async () => {
    const context = scope(), session = new TaskDraftSession(context)
    await ready(session)
    session.setDetails("Student Union, room 204")
    session.addFiles([new File(["confirmation"], "booking.txt")])
    session.setDetails("Student Union, room 204; east entrance")
    await session.flush()
    expect(session.getSnapshot()).toMatchObject({ saving: false, hasDraft: true, error: null })
    const reopened = new TaskDraftSession(context); await ready(reopened)
    expect(reopened.getSnapshot().details).toContain("east entrance")
    expect(await taskAttachmentBlob(reopened.getSnapshot().files[0])).toBeInstanceOf(Blob)
    for (const changed of [{ nodeId: "sap" }, { actorId: "alex" }, { ownerVersion: 1 }, { workspaceKey: crypto.randomUUID() }]) {
      const separate = new TaskDraftSession({ ...context, ...changed }); await ready(separate)
      expect(separate.getSnapshot().files).toEqual([])
      expect(separate.getSnapshot().details).toBe("")
    }
  })
  it("does not call a draft saved until its transaction completes, preserves failed edits and permits retry", async () => {
    const session = new TaskDraftSession(scope()); await ready(session)
    const original = writeTaskDraft
    let finish!: () => void
    const delayed = new Promise<void>(resolve => { finish = resolve })
    const storage = await import("./fileStorage")
    const write = vi.spyOn(storage, "writeTaskDraft").mockImplementationOnce(async (...args) => { await delayed; return original(...args) })
    session.addFiles([new File(["proof"], "proof.txt")])
    await vi.waitFor(() => expect(write).toHaveBeenCalled())
    expect(session.getSnapshot().saving).toBe(true)
    session.setDetails("Typed while the file was saving")
    write.mockRejectedValueOnce(new Error("Storage full"))
    finish()
    await expect(session.flush()).rejects.toThrow("Storage full")
    expect(session.getSnapshot()).toMatchObject({ details: "Typed while the file was saving", error: "Storage full", saving: false })
    expect(session.getSnapshot().files).toHaveLength(1)
    await session.flush()
    expect(session.getSnapshot()).toMatchObject({ error: null, saving: false })
    write.mockRestore()
  })
  it("rejects a stale tab instead of overwriting its newer draft", async () => {
    const context = scope(), first = new TaskDraftSession(context), stale = new TaskDraftSession(context)
    await Promise.all([ready(first), ready(stale)])
    first.setDetails("Newer saved result"); await first.flush()
    stale.setDetails("Keep this other copy")
    await expect(stale.flush()).rejects.toThrow("Another tab")
    const key = `${await draftNamespace(context.workspaceKey)}:${JSON.stringify(["room", "jordan", "jordan", 0])}`
    expect((await readTaskDraft(key))?.details).toBe("Newer saved result")
    expect(stale.getSnapshot().details).toBe("Keep this other copy")
  })
  it("exports the full bytes of published work and private drafts and stages a portable restore", async () => {
    const state = seedDemo(undefined, "v2"), node = state.nodes[0]
    const context = { ...scope(), workspaceKey: state.demoLinkKey, nodeId: node.id }, session = new TaskDraftSession(context)
    await ready(session)
    session.setDetails("Private unsubmitted result"); session.addFiles([new File(["complete bytes"], "booking.txt")]); await session.flush()
    const files = session.getSnapshot().files
    node.taskWork = { version: 2, revision: 1, files, drafts: [], submissions: [{ id: "s1", authorId: "jordan", ownerVersion: 0, details: "Published result", savedOn: state.today, attachmentIds: files.map(f => f.id) }] }
    const archive = await taskWorkArchive(state)
    expect(archive.taskDrafts[0]).toMatchObject({ details: "Private unsubmitted result", hasDraft: true })
    expect(archive.state.nodes[0].taskWork?.files[0].dataUrl).toBe(`data:application/octet-stream;base64,${btoa("complete bytes")}`)
    const restored = await restoreTaskWorkArchive({ ...archive, state: { ...archive.state, demoLinkKey: crypto.randomUUID() } })
    expect(restored.nodes[0].taskWork?.files[0].blobKey).toBeTruthy()
    expect(restored.nodes[0].taskWork?.files[0].dataUrl).toBeUndefined()
    const draft = new TaskDraftSession({ ...context, workspaceKey: restored.demoLinkKey }); await ready(draft)
    expect(draft.getSnapshot().details).toBe("Private unsubmitted result")
  })
})
