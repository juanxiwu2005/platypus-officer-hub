import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { Node } from "../data/types"
import { useStore } from "../data/store"
import { isOfficer, isPresident } from "../data/permissions"
import { isBudgetControlledNode } from "../engine/eventBudget"
import { Link } from "react-router-dom"
import { MAX_FILES, safeTaskUrl, taskWork } from "./data"
import { downloadTaskAttachment, readTaskAttachment } from "./attachments"
import type { TaskAttachment, TaskAuthorization } from "./contracts"

export function TaskSubmission({ node, actorId, authorization }: { node: Node; actorId: string; authorization?: TaskAuthorization }) {
  const { state, tryDispatch, getState } = useStore()
  const detailsId = useId()
  const initial = useMemo(() => taskWork(node), [node]), latest = initial?.submissions.at(-1)
  const ownDraft = initial?.drafts.find(d => d.authorId === actorId)
  const initialRecord = ownDraft ?? latest
  const [details, setDetails] = useState(initialRecord?.details ?? "")
  const [files, setFiles] = useState<TaskAttachment[]>((initialRecord?.attachmentIds ?? []).flatMap(id => initial?.files.find(f => f.id === id) ?? []))
  const [revision, setRevision] = useState(initial?.revision ?? 0)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null), section = useRef<HTMLElement>(null), alive = useRef(true)
  const assignment = useRef({ id: node.ownerId, version: node.ownerVersion ?? 0 })
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const editable = !!initial && state.people.some(p => p.id === actorId && isOfficer(p)) && (node.ownerId === actorId || isPresident(state, actorId)) && node.status !== "unclaimed"
  async function addFiles(chosen: FileList | null) {
    if (!chosen?.length || busy) return
    if (chosen.length + files.length > MAX_FILES) { setError("Attach up to 5 files."); if (input.current) input.current.value = ""; return }
    setBusy(true); setError(""); setNotice("")
    try {
      const added = await Promise.all(Array.from(chosen, readTaskAttachment))
      if ([...files, ...added].reduce((sum, f) => sum + f.size, 0) > 2_000_000) throw new Error("Keep the attached files within 2 MB in total.")
      if (alive.current) setFiles(current => [...current, ...added])
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "These files could not be read. Please try again.") }
    finally { if (alive.current) setBusy(false); if (input.current) input.current.value = "" }
  }
  function save(submit: boolean) {
    setError(""); setNotice("")
    if (submit && !details.trim() && !files.length) { setError("Add some details or an attachment before submitting."); return }
    const retainedIds = new Set([...(initial?.submissions ?? []), ...(initial?.drafts.filter(d => d.authorId !== actorId) ?? [])].flatMap(r => r.attachmentIds))
    const retained = initial?.files.filter(f => retainedIds.has(f.id) && !files.some(current => current.id === f.id)) ?? []
    if ([...retained, ...files].reduce((sum, f) => sum + f.size, 0) > 2_000_000) { setError("This task can keep up to 2 MB of attachments, including saved submissions. Choose smaller new files."); return }
    const accepted = tryDispatch({ type: "saveTaskWork", nodeId: node.id, authorization, input: { details, attachments: files, expectedRevision: revision, expectedOwnerId: assignment.current.id, expectedOwnerVersion: assignment.current.version, submit } })
    const current = getState().nodes.find(n => n.id === node.id), work = current && taskWork(current)
    const saved = submit ? work?.submissions.at(-1) : work?.drafts.find(d => d.authorId === actorId)
    if (!accepted || !work || work.revision !== revision + 1 || saved?.authorId !== actorId || saved.details !== details.trim() || JSON.stringify(saved.attachmentIds) !== JSON.stringify(files.map(f => f.id))) {
      setError("Your work was not saved. Your text and files are kept here. Restore browser saving or reload after checking for newer changes, then try again."); return
    }
    setRevision(work.revision)
    setNotice(submit ? "Your submission is saved. Thank you for your work." : "Draft saved. Your task status stays the same.")
    section.current?.focus()
  }
  function download(file: TaskAttachment) { try { downloadTaskAttachment(file) } catch { setError("This file could not be downloaded. Please try again.") } }
  const published = latest
  const showFiles = editable ? files : (published?.attachmentIds ?? []).flatMap(id => initial?.files.find(f => f.id === id) ?? [])
  return <section className="task-submission" aria-label="Task submission" ref={section} tabIndex={-1} data-testid="task-submission">
    {!initial ? <p role="alert">This saved submission needs recovery before it can be edited.</p> : <>
      <div className="task-details-field">{editable ? <><label htmlFor={detailsId}>Details</label><textarea id={detailsId} value={details} onChange={e => { setDetails(e.target.value); setNotice("") }} maxLength={20_000} rows={6} placeholder="Share the result, location, reference numbers or anything your team needs." /></> : <><span>Details</span><span className="task-submission-readback">{published?.details || "No details submitted yet."}</span></>}</div>
      {node.draftLink && safeTaskUrl(node.draftLink) && <a className="small" href={node.draftLink} target="_blank" rel="noreferrer">Open current draft ↗</a>}
      {showFiles.length > 0 && <ul className="task-file-list" aria-label="Attachments">{showFiles.map(file => <li key={file.id}><button type="button" className="task-file-download" onClick={() => download(file)} aria-label={`Download ${file.name}`}><span aria-hidden="true">▤</span><span>{file.name}</span></button>{editable && <button type="button" className="btn btn-quiet small" aria-label={`Remove ${file.name}`} disabled={busy} onClick={() => { setFiles(files.filter(f => f.id !== file.id)); setNotice("") }}>×</button>}</li>)}</ul>}
      {editable && <><input ref={input} className="sr-only" tabIndex={-1} type="file" multiple accept=".pdf,.txt,.md,.csv,.docx,.xlsx,.png,.jpg,.jpeg,.webp" aria-label="Attach files" onChange={e => void addFiles(e.target.files)} /><button type="button" className="btn task-add-files" disabled={busy || files.length >= MAX_FILES} onClick={() => input.current?.click()}>{busy ? "Reading files…" : "+ Add files"}</button><p className="small muted task-file-limit">Up to 5 files, 512 KB each; 2 MB total. Saved in this demo browser.</p></>}
      {published && <p className="small muted task-submission-author">Submitted by {state.people.find(p => p.id === published.authorId)?.name ?? "Former teammate"} · {published.savedOn}</p>}
      {editable && <div className="task-submit-actions"><button type="button" className="btn" disabled={busy} onClick={() => save(false)}>Save draft</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>{node.status === "done" ? "Update submission" : isBudgetControlledNode(node) ? "Submit result" : "Submit & mark done"}</button></div>}
      {isBudgetControlledNode(node) && node.eventId && <p className="small muted">Completion is managed in <Link to={`/events?event=${encodeURIComponent(node.eventId)}&view=budget`}>Event Budget</Link>.</p>}
      {node.status === "unclaimed" && <p className="small muted">Claim this task before adding your submission.</p>}
    </>}
    {notice && <p role="status" className="small good-text">{notice}</p>}{error && <p role="alert" className="small late-text">{error}</p>}
  </section>
}
