import type { DemoState } from "../data/types"
import type { TaskAttachment } from "./contracts"
import { taskWork, validAttachment } from "./data"
import { draftNamespace, listTaskDrafts, taskAttachmentBlob, writeTaskDraft, readTaskDraft, type SavedTaskDraft } from "./fileStorage"
import { draftKeySuffix, flushWorkspaceDrafts } from "./drafts"

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(`data:application/octet-stream;base64,${String(reader.result).split(",")[1]}`); reader.onerror = () => reject(new Error("An attachment could not be exported.")); reader.readAsDataURL(blob) })
}
/** A complete export embeds actual bytes, including automatically saved private drafts. */
export async function taskWorkArchive(state: DemoState): Promise<{ state: DemoState; taskDrafts: SavedTaskDraft[] }> {
  await flushWorkspaceDrafts(state.demoLinkKey)
  const cache = new Map<TaskAttachment, TaskAttachment>()
  async function portable(file: TaskAttachment) {
    if (cache.has(file)) return cache.get(file)!
    const value = { id: file.id, name: file.name, size: file.size, dataUrl: file.dataUrl ?? await dataUrl(await taskAttachmentBlob(file)) }
    cache.set(file, value); return value
  }
  const nodes = []
  for (const node of state.nodes) {
    const work = taskWork(node)
    nodes.push(work && node.taskWork ? { ...node, taskWork: { ...work, files: await Promise.all(work.files.map(portable)) } } : node)
  }
  const drafts = typeof indexedDB === "undefined" ? [] : await listTaskDrafts(await draftNamespace(state.demoLinkKey))
  const taskDrafts = []
  for (const draft of drafts.filter(d => d.hasDraft)) taskDrafts.push({ ...draft, files: await Promise.all(draft.files.map(portable)) })
  return { state: { ...state, nodes }, taskDrafts }
}

/** Importers first stage file bytes in IndexedDB, then commit the returned small business snapshot. */
export async function restoreTaskWorkArchive(archive: { state: DemoState; taskDrafts?: SavedTaskDraft[] }): Promise<DemoState> {
  const namespace = await draftNamespace(archive.state.demoLinkKey), nodes = []
  const cache = new Map<string, TaskAttachment>()
  async function restoreFile(file: TaskAttachment): Promise<TaskAttachment> {
    if (!validAttachment(file) || !file.dataUrl) throw new Error("The export is missing an attachment's bytes.")
    if (cache.has(file.id)) return cache.get(file.id)!
    const blobKey = crypto.randomUUID(), ref = { id: file.id, name: file.name, size: file.size, blobKey }
    const key = `${namespace}:restored-file:${blobKey}`
    await writeTaskDraft({ key, version: 1, revision: 0, nodeId: "", authorId: "", ownerId: null, ownerVersion: 0, baseWorkRevision: 0, details: "", files: [], hasDraft: false, updatedAt: Date.now() }, 0, [{ ref, blob: await taskAttachmentBlob(file) }])
    cache.set(file.id, ref); return ref
  }
  for (const node of archive.state.nodes) {
    const work = taskWork(node)
    nodes.push(work && node.taskWork ? { ...node, taskWork: { ...work, version: 2 as const, files: await Promise.all(work.files.map(restoreFile)) } } : node)
  }
  for (const draft of archive.taskDrafts ?? []) {
    const key = `${namespace}:${draftKeySuffix({ nodeId: draft.nodeId, actorId: draft.authorId, ownerId: draft.ownerId, ownerVersion: draft.ownerVersion })}`
    const old = await readTaskDraft(key)
    if (old) await writeTaskDraft({ ...old, key: `${key}:backup:${crypto.randomUUID()}`, revision: 0 }, 0)
    await writeTaskDraft({ ...draft, key, files: await Promise.all(draft.files.map(restoreFile)) }, old?.revision ?? 0)
  }
  return { ...archive.state, nodes }
}
