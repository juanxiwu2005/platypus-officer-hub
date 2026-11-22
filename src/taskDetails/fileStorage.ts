import type { TaskAttachment } from "./contracts"
import { validAttachment } from "./data"

export interface SavedTaskDraft {
  key: string
  version: 1
  revision: number
  nodeId: string
  authorId: string
  ownerId: string | null
  ownerVersion: number
  baseWorkRevision: number
  details: string
  files: TaskAttachment[]
  hasDraft: boolean
  updatedAt: number
}
export class DraftConflict extends Error { constructor() { super("Another tab saved a newer draft. Your text and files are kept here; check that copy before retrying.") } }
const DB = "platypus.task-work", FILES = "files", DRAFTS = "drafts"
let opening: Promise<IDBDatabase> | undefined
function open(): Promise<IDBDatabase> {
  if (opening) return opening
  opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Browser file storage is unavailable. Your changes have not been saved.")); return }
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore(FILES, { keyPath: "key" }); request.result.createObjectStore(DRAFTS, { keyPath: "key" }) }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error("Close other old versions of this page to enable file saving."))
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); opening = undefined }; resolve(request.result) }
  }).catch(e => { opening = undefined; throw e })
  return opening
}
export async function draftNamespace(workspaceKey: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(workspaceKey))
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("")
}
export async function readTaskDraft(key: string): Promise<SavedTaskDraft | undefined> {
  const db = await open()
  return new Promise((resolve, reject) => { const tx = db.transaction(DRAFTS), req = tx.objectStore(DRAFTS).get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); tx.onabort = () => reject(tx.error) })
}
/** Both raw files and the draft reference commit in one database transaction. */
export async function writeTaskDraft(draft: SavedTaskDraft, expectedRevision: number, files: { ref: TaskAttachment; blob: Blob }[] = []): Promise<SavedTaskDraft> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([FILES, DRAFTS], "readwrite"), store = tx.objectStore(DRAFTS)
    let error: Error | null = null
    const request = store.get(draft.key)
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== expectedRevision) { error = new DraftConflict(); tx.abort(); return }
      try {
        for (const { ref, blob } of files) {
          if (!validAttachment(ref) || !ref.blobKey || blob.size !== ref.size) { error = new Error("This attachment could not be saved."); tx.abort(); return }
          tx.objectStore(FILES).put({ key: ref.blobKey, name: ref.name, size: ref.size, blob })
        }
        store.put({ ...draft, revision: expectedRevision + 1 })
      } catch (cause) { error = cause instanceof Error ? cause : new Error("File saving failed."); tx.abort() }
    }
    tx.oncomplete = () => resolve({ ...draft, revision: expectedRevision + 1 })
    tx.onabort = tx.onerror = () => reject(error ?? tx.error ?? new Error("Browser file saving failed. Your changes are kept here; please retry."))
  })
}
export async function taskAttachmentBlob(file: TaskAttachment): Promise<Blob> {
  if (!validAttachment(file)) throw new Error("This attachment is unavailable.")
  if (file.dataUrl) return new Blob([Uint8Array.from(atob(file.dataUrl.split(",")[1]), c => c.charCodeAt(0))], { type: "application/octet-stream" })
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = db.transaction(FILES).objectStore(FILES).get(file.blobKey!)
    req.onsuccess = () => { const r = req.result; if (r?.blob instanceof Blob && r.blob.size === file.size && r.name === file.name) resolve(r.blob); else reject(new Error(`The saved file ${file.name} is unavailable. Keep this browser's site data or restore its full export.`)) }
    req.onerror = () => reject(req.error)
  })
}
export async function listTaskDrafts(namespace: string): Promise<SavedTaskDraft[]> {
  const db = await open()
  return new Promise((resolve, reject) => { const req = db.transaction(DRAFTS).objectStore(DRAFTS).getAll(); req.onsuccess = () => resolve(req.result.filter((d: SavedTaskDraft) => d.key.startsWith(`${namespace}:`))); req.onerror = () => reject(req.error) })
}
