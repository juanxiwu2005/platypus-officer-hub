import { useState } from "react"
import { SAMPLE_CONSTITUTION } from "../../lib/sampleConstitution"
import { MAX_DOC_CHARS, documentSource, readDocumentFile } from "../../lib/readDocument"

export interface ConstitutionDoc { fileName: string; text: string; checksum: string }

/** Prepare text for setup: read the file in this browser, hide emails and phone numbers, and fingerprint it. Nothing is sent anywhere here. */
async function prepare(fileName: string, text: string, file?: File): Promise<ConstitutionDoc> {
  const raw = file ? await readDocumentFile(file) : text.replace(/\r\n?/g, "\n").trim()
  if (raw.length < 20) throw new Error("Add a little more text: at least a sentence or two.")
  if (raw.length > MAX_DOC_CHARS) throw new Error("This document is very long. Paste the sections about officers and departments.")
  const src = await documentSource(raw, fileName)
  return { fileName, text: src.text, checksum: src.checksum }
}

/** Step 1: choose the constitution. The AI reads it after Continue; until then it only sits in this page. */
export function ConstitutionStep({ doc, onChange }: { doc: ConstitutionDoc | null; onChange: (d: ConstitutionDoc | null) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState("")
  const run = async (task: () => Promise<ConstitutionDoc>) => {
    setBusy(true); setError("")
    try { onChange(await task()); setPasting(false); setPaste("") }
    catch (e) { setError(e instanceof Error ? e.message : "This file could not be read.") }
    finally { setBusy(false) }
  }
  return <section className="upload-box" data-testid="constitution-upload" aria-labelledby="const-h">
    <h3 id="const-h">Upload your constitution <span className="muted">(optional)</span></h3>
    {doc ? <div className="doc-chip" data-testid="constitution-chip"><b>{doc.fileName}</b><span>{doc.text.split(/\s+/).length.toLocaleString("en-US")} words ready</span><button type="button" className="btn small" onClick={() => onChange(null)}>Remove</button></div> : <>
      <label>Constitution file<input type="file" accept=".pdf,.docx,.txt,.md" disabled={busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void run(() => prepare(f.name, "", f)) }} /></label>
      <p className="small muted">PDF, Word (.docx), .txt or .md. It is read in your browser.</p>
      <div className="action-row">
        <button type="button" className="btn small" disabled={busy} onClick={() => void run(() => prepare("Sample constitution (fictional).txt", SAMPLE_CONSTITUTION))}>Use the sample constitution</button>
        <button type="button" className="btn small" disabled={busy} onClick={() => setPasting(!pasting)} aria-expanded={pasting}>Paste text instead</button>
      </div>
      {pasting && <><label>Constitution text<textarea rows={6} maxLength={MAX_DOC_CHARS} value={paste} onChange={e => setPaste(e.target.value)} /></label><button type="button" className="btn small" disabled={busy || paste.trim().length < 20} onClick={() => void run(() => prepare("Pasted constitution.txt", paste))}>Use this text</button></>}
    </>}
    {busy && <p className="small" role="status">Reading the file…</p>}
    {error && <p role="alert" className="small">{error}</p>}
    <p className="small muted">After you press Continue, AI reads it in the background to find departments, roles and duties. It is also saved in this browser. Fictional example only: never add a real constitution or member details.</p>
  </section>
}
