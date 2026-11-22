import type { TaskAttachment } from "./contracts"
import { MAX_FILE_BYTES, validAttachment } from "./data"
import { taskAttachmentBlob } from "./fileStorage"

/** The draft transaction writes this reference and the raw File together. */
export function taskFileReference(file: File): TaskAttachment {
  const id = crypto.randomUUID(), result = { id, blobKey: id, name: file.name, size: file.size }
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: choose a nonempty file up to 2 MB.`)
  if (!validAttachment(result)) throw new Error(`${file.name}: choose a PDF, Office document, text file, PNG, JPG or WebP image.`)
  return result
}
export async function downloadTaskAttachment(file: TaskAttachment, pendingBlob?: Blob) {
  const blob = pendingBlob ?? await taskAttachmentBlob(file)
  const url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }))
  const link = document.createElement("a")
  link.href = url; link.download = file.name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
