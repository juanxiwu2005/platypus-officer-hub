import { useEffect, useId, useRef, useState } from "react"
import { documentSource, readDocumentFile } from "../../lib/readDocument"
import { MATCHING_TEXT_LIMIT, type MatchingSetupViewProps } from "../setupContracts"

export function SourcePanel(props: MatchingSetupViewProps) {
  const { document: workspace, busy, canEdit } = props
  const [source, setSource] = useState(workspace.source)
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState("")
  const [retryRole, setRetryRole] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)
  const sourceEdits = useRef(0)
  const id = useId()
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => setSource(workspace.source), [workspace.source.name, workspace.source.text])
  const tooLong = source.text.length > MATCHING_TEXT_LIMIT
  const canRead = canEdit && !busy && !fileBusy && !tooLong && source.text.trim().length >= 20
  const upload = async (file: File) => {
    setFileBusy(true); setFileError("")
    const editVersion = sourceEdits.current
    try {
      const text = await readDocumentFile(file)
      if (text.length > MATCHING_TEXT_LIMIT) throw new Error("Use 60,000 characters or fewer. Paste the relevant sections; nothing was cut automatically.")
      const prepared = await documentSource(text, file.name)
      if (!mounted.current) return
      if (sourceEdits.current !== editVersion) {
        setFileError("Your source changed while the file was being read. Your edits were kept; select the file again to replace them.")
        return
      }
      const next = { name: file.name, text: prepared.text }
      setSource(next); props.onSourceChange(next)
    } catch (error) { if (mounted.current) setFileError(error instanceof Error ? error.message : "This file could not be read. You can paste its text instead.") }
    finally { if (mounted.current) setFileBusy(false) }
  }
  return <section id="matching-source" className="card matching-section" aria-labelledby={`${id}-heading`}>
    <header><div><h2 id={`${id}-heading`}>1. Start with a source</h2><p>AI drafts responsibilities for your positions. You review every suggestion.</p></div></header>
    <div className="matching-source-grid">
      <div className="matching-form">
        <label htmlFor={`${id}-name`}>Source name</label>
        <input id={`${id}-name`} maxLength={180} value={source.name} disabled={!canEdit} onChange={event => { sourceEdits.current++; setSource({ ...source, name: event.target.value }) }} onBlur={() => props.onSourceChange(source)} />
        <label htmlFor={`${id}-text`}>Constitution text</label>
        <textarea id={`${id}-text`} rows={7} value={source.text} disabled={!canEdit} onChange={event => { sourceEdits.current++; setSource({ ...source, text: event.target.value }) }} onBlur={() => props.onSourceChange(source)} aria-describedby={`${id}-note`} />
        <p id={`${id}-note`} className="matching-muted">Use a fictional constitution for testing. Up to 60,000 characters. Text is saved before AI reads it; AI requests and replies are archived privately for this prototype.</p>
        {tooLong && <p role="alert" className="matching-error">This text exceeds 60,000 characters. Choose relevant sections before reading; nothing is cut automatically.</p>}
        <div className="matching-actions">
          <button type="button" className="btn" disabled={!canEdit || fileBusy} onClick={() => fileInput.current?.click()}>{fileBusy ? "Reading file…" : "Upload a document"}</button>
          <input ref={fileInput} className="matching-file-input" type="file" accept=".pdf,.docx,.txt,.md" aria-label="Upload constitution document" disabled={!canEdit || fileBusy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file) }} />
          <button type="button" className="btn btn-primary" disabled={!canRead} onClick={() => props.onRead(source)}>Draft responsibilities</button>
          {busy && <button type="button" className="btn" onClick={props.onStop}>Stop waiting</button>}
        </div>
        {busy && <p role="status">Reading your source. You can keep editing; changed inputs will need a new review. Stopping ends this wait; the AI service may still finish its request.</p>}
        {fileError && <p role="alert" className="matching-error">{fileError}</p>}
        <div className="matching-inline-form">
          <label htmlFor={`${id}-retry`}>Read one position again</label>
          <select id={`${id}-retry`} value={retryRole} disabled={!canEdit || busy} onChange={event => setRetryRole(event.target.value)}><option value="">Choose a position</option>{workspace.references.roles.map(role => <option key={role.id} value={role.id}>{role.title}</option>)}</select>
          <button type="button" className="btn" disabled={!canRead || !retryRole} onClick={() => props.onRead(source, [retryRole])}>Read selected position</button>
          <button type="button" className="btn" disabled={!canRead} onClick={() => props.onRead(source, [])}>Read general duties</button>
        </div>
      </div>
      <div className="matching-reading-results" aria-live="polite">
        <h3>Suggestions</h3>
        {!workspace.reads.length && <p className="matching-muted">Start a reading, or create responsibilities by hand below. AI is optional.</p>}
        {workspace.reads.slice().reverse().map(read => <article className="matching-read" key={read.id}>
          <p><strong>{read.status === "completed" ? "Reading complete" : read.status === "pending" ? "Reading…" : `Reading ${read.status}`}</strong></p>
          {read.message && <p className="matching-muted">{read.message}</p>}
          {read.response?.warnings.map((warning, index) => <p className="matching-warning" key={`${read.id}-warning-${index}`}>{warning}</p>)}
          {read.response?.proposals.map(proposal => {
            const decision = workspace.decisions.find(row => row.readId === read.id && row.proposalId === proposal.id)
            return <article className="matching-proposal" key={proposal.id}>
              <h4>{proposal.title}</h4><p>{proposal.description}</p><p><strong>Deliverable:</strong> {proposal.deliverable}</p>
              <span className={`matching-tag ${proposal.source.verified ? "is-confirmed" : "is-draft"}`}>{proposal.source.verified ? "Quote found in source" : "Suggestion · not verified in source"}</span>
              {proposal.source.quote && <blockquote>{proposal.source.quote}</blockquote>}
              <p className="matching-muted">{proposal.roleIds.length ? proposal.roleIds.map(roleId => workspace.references.roles.find(role => role.id === roleId)?.title ?? "Unknown position").join(" · ") : "General responsibility"}</p>
              {decision ? <p className="matching-muted">{decision.decision === "accepted" ? "Added as a draft. Review it below." : "Suggestion declined."}</p> : <div className="matching-actions">
                <button type="button" className="btn btn-primary" disabled={!canEdit || read.status !== "completed"} onClick={() => props.onProposal(read.id, proposal.id, "accepted")}>Use as draft</button>
                <button type="button" className="btn" disabled={!canEdit || read.status !== "completed"} onClick={() => props.onProposal(read.id, proposal.id, "rejected")}>Decline</button>
              </div>}
            </article>
          })}
          {read.status === "completed" && !read.response?.proposals.length && <p>No usable suggestions were returned. You can retry a position or continue manually.</p>}
        </article>)}
      </div>
    </div>
  </section>
}
