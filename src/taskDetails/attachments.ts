import type { TaskAttachment } from "./contracts"
import { MAX_FILE_BYTES, validAttachment } from "./data"

export function readTaskAttachment(file: File): Promise<TaskAttachment> {
  if (file.size < 1 || file.size > MAX_FILE_BYTES) return Promise.reject(new Error("Choose a nonempty file up to 512 KB."))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}. Please choose it again.`))
    reader.onload = () => {
      const encoded = String(reader.result).split(",")[1]
      const result = { id: crypto.randomUUID(), name: file.name, size: file.size, dataUrl: `data:application/octet-stream;base64,${encoded}` }
      if (!validAttachment(result)) reject(new Error("Choose a PDF, Office document, text file, PNG, JPG or WebP image, up to 512 KB."))
      else resolve(result)
    }
    reader.readAsDataURL(file)
  })
}
export function downloadTaskAttachment(file: TaskAttachment) {
  if (!validAttachment(file)) throw new Error("This attachment is unavailable.")
  const bytes = Uint8Array.from(atob(file.dataUrl.split(",")[1]), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }))
  const link = document.createElement("a")
  link.href = url; link.download = file.name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
