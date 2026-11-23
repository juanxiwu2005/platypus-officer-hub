import { useRef, useState } from "react"
import { Info } from "../../components/ui"
import type { ConstitutionDoc } from "../../components/setup/ConstitutionStep"
import { useStore } from "../../data/store"
import { MAX_DOC_CHARS } from "../../lib/readDocument"
import { SAMPLE_CONSTITUTION } from "../../lib/sampleConstitution"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { prepareDoc } from "./constitution/prepare"
import { useReading } from "./constitution/useReading"

const text = onboardingCopy.founder.constitution

/**
 * Where the officer roles can come from: the sample, an uploaded file or pasted text. Up to ob-5 this was its own screen; since ob-6 (S6) it opens
 * inline on the Team screen ("Import roles from your constitution"). Choosing a document starts the AI reading in the background; the result is
 * applied to the roles as soon as it arrives, unless the president already edited them (see constitution/useReading.ts).
 */
export function ConstitutionImport({ id }: { id: string }) {
  const { draft, update, patch } = useOnboardingDraft()
  const { state } = useStore()
  const reader = useReading()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const { doc, reading } = draft

  /** Remember the document and let the AI start reading. */
  const choose = (next: ConstitutionDoc) => {
    update(d => ({ ...d, doc: next, applied: false }))
    void reader.start(next)
  }
  const run = async (task: () => Promise<ConstitutionDoc>) => {
    setBusy(true); setError("")
    try { choose(await task()); setPasting(false); setPaste("") }
    catch (e) { setError(e instanceof Error ? e.message : text.unreadable) }
    finally { setBusy(false) }
  }
  const remove = () => { reader.stop(); patch({ doc: null, reading: { status: "idle" }, applied: false }); setError("") }
  const words = doc ? doc.text.split(/\s+/).filter(Boolean).length : 0

  return <div id={id} className="ob-const" data-testid="constitution-import">
    <p className="ob-const-lead">{text.lead}<Info label={text.leadLabel}>{text.leadMore}</Info></p>
    {doc ? <div className="doc-chip" data-testid="constitution-chip">
      <b>{doc.fileName}</b><span>{words.toLocaleString("en-US")} {text.words}</span>
      <button type="button" className="btn small" onClick={remove}>{text.remove}</button>
    </div> : <ul className="ob-const-options">
      <li><button type="button" className="ob-const-option is-recommended" disabled={busy} onClick={() => void run(() => prepareDoc(text.sampleName, SAMPLE_CONSTITUTION))}>
        <b>{text.sample}</b><span><em>{text.recommended}</em> · {text.fictional}</span>
      </button></li>
      <li><button type="button" className="ob-const-option" disabled={busy} onClick={() => fileInput.current?.click()}><b>{text.upload}</b></button>
        <input ref={fileInput} type="file" hidden accept=".pdf,.docx,.txt,.md" aria-label={text.fileLabel} tabIndex={-1}
          onChange={event => { const f = event.target.files?.[0]; event.target.value = ""; if (f) void run(() => prepareDoc(f.name, "", f)) }} /></li>
      <li><button type="button" className="ob-const-option" aria-expanded={pasting} aria-controls="ob-const-paste" disabled={busy} onClick={() => setPasting(!pasting)}><b>{text.paste}</b></button>
        {pasting && <div id="ob-const-paste" className="ob-const-paste">
          <label className="field">{text.pasteLabel}<textarea rows={6} maxLength={MAX_DOC_CHARS} value={paste} aria-describedby="ob-const-paste-note" onChange={event => setPaste(event.target.value)} /></label>
          <p id="ob-const-paste-note" className="sr-only">{text.pasteFictional}</p>
          <button type="button" className="btn btn-primary small" disabled={busy || paste.trim().length < 20} onClick={() => void run(() => prepareDoc(text.pastedName, paste))}>{text.pasteUse}</button>
        </div>}
      </li>
    </ul>}
    {error && <p role="alert" className="ob-const-error">{error}</p>}
    {doc && reading.status === "reading" && <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />{text.reading}</p>}
    {doc && reading.status === "ready" && <p className="notice ai-note" role="status" data-testid="reading-note">
      {reading.pending > 0 && <span className="spin" aria-hidden="true" />}{reading.pending > 0 ? text.reading2 : reading.note}
      {reading.pending === 0 && reading.retry && state.aiEnabled && <button type="button" className="btn small" onClick={() => void reader.start(doc, true)}>{text.retry}</button>}
    </p>}
  </div>
}
