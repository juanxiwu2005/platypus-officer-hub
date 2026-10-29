/**
 * Read a constitution file in the browser: PDF, Word (.docx), .txt or .md. Nothing is uploaded.
 * Limits are generous on purpose (a real constitution can run to dozens of pages); the AI step only ever receives
 * the most relevant excerpt (see `relevantExcerpt` in constitution.ts), so a long document never slows setup down.
 */
export const MAX_FILE_BYTES = 25_000_000
export const MAX_PDF_PAGES = 200
export const MAX_DOC_CHARS = 400_000

export async function readDocumentFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Use a file smaller than 25 MB.")
  const ext = file.name.split(".").pop()?.toLowerCase()
  let text = ""
  if (ext === "pdf") {
    const pdf = await import("pdfjs-dist")
    pdf.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default
    const task = pdf.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    try {
      const doc = await task.promise
      if (doc.numPages > MAX_PDF_PAGES) throw new Error(`Use a constitution of ${MAX_PDF_PAGES} pages or fewer.`)
      const pages: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const content = await (await doc.getPage(i)).getTextContent()
        pages.push(content.items.map(item => "str" in item ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ") : "").join(""))
      }
      text = pages.join("\n\n")
    } finally { await task.destroy() }
  } else if (ext === "docx") {
    const mammoth = await import("mammoth")
    text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value
  } else if (ext === "txt" || ext === "md") text = await file.text()
  else throw new Error("Choose a PDF, Word (.docx), .txt or .md file. Google Docs connections come later.")
  text = text.replace(/\r\n?/g, "\n").trim()
  if (text.length < 20) throw new Error("No readable text was found. For a scanned PDF, paste its text or upload a text-based PDF or Word file.")
  if (text.length > MAX_DOC_CHARS) throw new Error("This document is very long. Paste the sections about officers and departments instead.")
  return text
}

/** Hide emails and phone numbers, refuse documents that contain credentials, and fingerprint the result. */
export async function documentSource(text: string, fileName: string) {
  const clean = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact redacted]").replace(/\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone redacted]")
  if (/(?:api[_ -]?key|password|secret)\s*[:=]\s*\S+/i.test(clean)) throw new Error("Remove credentials before uploading this fictional document.")
  let checksum = ""
  try { checksum = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clean)))].map(n => n.toString(16).padStart(2, "0")).join("") } catch { /* fingerprint is optional */ }
  return { fileName, text: clean, checksum: checksum || `${clean.length}-${fileName}`, uploadedAt: new Date().toISOString() }
}
