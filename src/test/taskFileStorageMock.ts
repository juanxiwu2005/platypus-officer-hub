// Component tests use this small storage adapter; Playwright exercises real IndexedDB.
import type { TaskAttachment } from "../taskDetails/contracts"
import type { SavedTaskDraft } from "../taskDetails/fileStorage"

export const drafts = new Map<string, SavedTaskDraft>()
const files = new Map<string, Blob>()
export const draftNamespace = async (workspace: string) => `test-${workspace}`
export const readTaskDraft = async (key: string) => drafts.get(key)
export async function writeTaskDraft(draft: SavedTaskDraft, revision: number, added: { ref: TaskAttachment; blob: Blob }[] = []) {
  if ((drafts.get(draft.key)?.revision ?? 0) !== revision) throw new Error("Another tab saved a newer draft.")
  for (const file of added) files.set(file.ref.blobKey!, file.blob)
  const saved = { ...draft, revision: revision + 1 }
  drafts.set(draft.key, saved)
  return saved
}
export async function taskAttachmentBlob(file: TaskAttachment) {
  if (file.dataUrl) return new Blob([Uint8Array.from(atob(file.dataUrl.split(",")[1]), c => c.charCodeAt(0))])
  const blob = files.get(file.blobKey!)
  if (!blob) throw new Error("Missing saved attachment.")
  return blob
}
export const listTaskDrafts = async (namespace: string) => [...drafts.values()].filter(d => d.key.startsWith(`${namespace}:`))
