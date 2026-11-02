import { useRef, useState } from "react"
import { Info } from "../../components/ui"
import type { ConstitutionDoc } from "../../components/setup/ConstitutionStep"
import { useStore } from "../../data/store"
import { MAX_DOC_CHARS } from "../../lib/readDocument"
import { SAMPLE_CONSTITUTION } from "../../lib/sampleConstitution"
import { onboardingCopy } from "../copy"
import { useOnboardingDraft } from "../draft"
import { useFlow } from "../engine/useFlow"
import { prepareDoc } from "./constitution/prepare"
import { useReading } from "./constitution/useReading"

const text = onboardingCopy.founder.constitution
const ID = "founder.constitution"

/**
 * Screen 2 of the founder flow (optional): where the officer roles come from. Choosing a document starts the AI reading in the background and
 * Continue is available at once; the result is applied to the roles as soon as it arrives (see constitution/useReading.ts).
 */
export function Constitution() {
  const { draft, update, patch } = useOnboardingDraft()
  const { state } = useStore()
  const flow = useFlow()
  const reader = useReading()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [pasting, setPasting] = useState(false)
  const [paste, setPaste] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const { doc, reading } = draft

  /** Remember the document, take this step off the skipped list, and let the AI start reading. */
  const choose = (next: ConstitutionDoc) => {
    update(d => ({ ...d, doc: next, applied: false, skipped: d.skipped.filter(id => id !== ID) }))
    void reader.start(next)
  }
  const run = async (task: () => Promise<ConstitutionDoc>) => {
    setBusy(true); setError("")
    try { choose(await task()); setPasting(false); setPaste("") }
    catch (e) { setError(e instanceof Error ? e.message : text.unreadable) }
    finally { setBusy(false) }
  }
  const remove = () => { reader.stop(); patch({ doc: null, reading: { status: "idle" }, applied: false }); setError("") }
  const skip = () => { reader.stop(); patch({ doc: null, reading: { status: "idle" }, applied: false }); flow?.skip() }
  const words = doc ? doc.text.split(/\s+/).filter(Boolean).length : 0

  return <section className="ob-card ob-const" aria-labelledby="ob-const-h">
    <h1 id="ob-const-h">{text.title}</h1>
    <p className="ob-const-lead">{text.lead}<Info label="How your text is used">{text.leadMore}</Info></p>
    {doc ? <div className="doc-chip" data-testid="constitution-chip">
      <b>{doc.fileName}</b><span>{words.toLocaleString("en-US")} {text.words}</span>
      <button type="button" className="btn small" onClick={remove}>{text.remove}</button>
    </div> : <>
      <ul className="ob-const-options">
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
      </ul>
    </>}
    {error && <p role="alert" className="ob-const-error">{error}</p>}
    {doc && reading.status === "reading" && <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />{text.reading}</p>}
    {doc && reading.status === "ready" && <p className="notice ai-note" role="status" data-testid="reading-note">
      {reading.pending > 0 && <span className="spin" aria-hidden="true" />}{reading.pending > 0 ? text.reading2 : reading.note}
      {reading.pending === 0 && reading.retry && state.aiEnabled && <button type="button" className="btn small" onClick={() => void reader.start(doc, true)}>{text.retry}</button>}
    </p>}
    <div className="ob-actions ob-const-actions">
      <button type="button" className="btn" onClick={() => flow?.back()}>{onboardingCopy.back}</button>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => flow?.next()}>{onboardingCopy.next}</button>
    </div>
    <div className="ob-const-skip">
      <button type="button" className="btn btn-quiet" onClick={skip}>{text.skip}</button>
      {!doc && <p className="small muted">{onboardingCopy.skipHint}</p>}
    </div>
  </section>
}
