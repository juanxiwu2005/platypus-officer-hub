import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { Link } from "react-router-dom"
import type { Node, NodeStatus } from "../data/types"
import { useStore } from "../data/store"
import { isOfficer, isPresident } from "../data/permissions"
import { isBudgetControlledNode } from "../engine/eventBudget"
import { MAX_FILES, MAX_TOTAL_BYTES, safeTaskUrl, taskWork } from "./data"
import { downloadTaskAttachment } from "./attachments"
import { taskAttachmentBlob } from "./fileStorage"
import { taskDraftSession } from "./drafts"
import { taskWorkActor } from "./authorization"
import type { TaskAuthorization, TaskWork } from "./contracts"
import type { ReplyInput, TaskReply } from "../data/taskWorkflow"

export function TaskSubmission({ node, actorId, authorization }: { node: Node; actorId: string; authorization?: TaskAuthorization }) {
  const { state } = useStore()
  const work = useMemo(() => taskWork(node), [node])
  const editable = !!work && taskWorkActor(state, node.id, authorization) === actorId && state.people.some(p => p.id === actorId && isOfficer(p)) && (node.ownerId === actorId || isPresident(state, actorId)) && node.status !== "unclaimed"
  if (!work) return <section className="task-submission" data-testid="task-submission"><p role="alert">This saved submission needs recovery before it can be edited.</p></section>
  return editable ? <EditableSubmission key={`${node.id}:${actorId}:${node.ownerId}:${node.ownerVersion ?? 0}`} node={node} actorId={actorId} authorization={authorization} work={work} /> : <ReadSubmission node={node} work={work} />
}
function ReadSubmission({ node, work }: { node: Node; work: TaskWork }) {
  const { state } = useStore(), published = work.submissions.at(-1)
  const [error, setError] = useState("")
  return <section className="task-submission" aria-label="Task submission" data-testid="task-submission">
    <div className="task-details-field"><span>Details</span><span className="task-submission-readback">{published?.details || "No details submitted yet."}</span></div>
    {node.draftLink && safeTaskUrl(node.draftLink) && <a className="small" href={node.draftLink} target="_blank" rel="noreferrer">Open current draft ↗</a>}
    {!!published?.attachmentIds.length && <ul className="task-file-list" aria-label="Attachments">{work.files.filter(f => published.attachmentIds.includes(f.id)).map(file => <li key={file.id}><button type="button" className="task-file-download" aria-label={`Download ${file.name}`} onClick={() => { void downloadTaskAttachment(file).catch(() => setError("This saved file could not be downloaded. Please restore its full export or try again.")) }}><span aria-hidden="true">▤</span><span>{file.name}</span></button></li>)}</ul>}
    {published && <p className="small muted">Submitted by {state.people.find(p => p.id === published.authorId)?.name ?? "Former teammate"} · {published.savedOn}</p>}
    {node.status === "unclaimed" && <p className="small muted">Claim this task before adding your submission.</p>}
    {error && <p className="small late-text" role="alert">{error}</p>}
  </section>
}
function EditableSubmission({ node, actorId, authorization, work }: { node: Node; actorId: string; authorization?: TaskAuthorization; work: TaskWork }) {
  const { state, tryDispatch, getState } = useStore()
  const detailsId = useId(), input = useRef<HTMLInputElement>(null), section = useRef<HTMLElement>(null)
  const initialRecord = work.drafts.find(d => d.authorId === actorId) ?? work.submissions.at(-1)
  const session = useMemo(() => taskDraftSession({ workspaceKey: state.demoLinkKey, nodeId: node.id, actorId, ownerId: node.ownerId, ownerVersion: node.ownerVersion ?? 0, workRevision: work.revision, details: initialRecord?.details ?? "", files: (initialRecord?.attachmentIds ?? []).flatMap(id => work.files.find(f => f.id === id) ?? []), hasDraft: work.drafts.some(d => d.authorId === actorId) }), [state.demoLinkKey, node.id, node.ownerId, node.ownerVersion, actorId])
  const draft = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [submitting, setSubmitting] = useState(false)
  const [undo, setUndo] = useState<{ workspaceKey: string; status: NodeStatus; waitingOn: string | null; waitingOnPersonId: string | null; revision: number; ownerVersion: number; ownerId: string | null } | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; void session.flush().catch(() => {}) } }, [session])
  useEffect(() => { const published = work.submissions.at(-1); session.adoptPublished(published?.details ?? "", (published?.attachmentIds ?? []).flatMap(id => work.files.find(f => f.id === id) ?? []), work.revision) }, [session, work, draft.loading])
  function addFiles(selected: FileList | null) {
    if (!selected?.length) return
    setError(""); setNotice("")
    try { session.addFiles(Array.from(selected)) } catch (e) { setError(e instanceof Error ? e.message : "These files could not be added.") }
    finally { if (input.current) input.current.value = "" }
  }
  async function submit() {
    setError(""); setNotice(""); setSubmitting(true)
    const startingStatus = getState().nodes.find(n => n.id === node.id)?.status
    try {
      await session.flush()
      const current = session.getSnapshot()
      if (!current.details.trim() && !current.files.length) throw new Error("Add some details or an attachment before submitting.")
      if (current.files.length > MAX_FILES || current.files.reduce((sum, f) => sum + f.size, 0) > MAX_TOTAL_BYTES) throw new Error("Keep up to 3 current attachments, 2 MB each and 5 MB in total.")
      await Promise.all(current.files.map(taskAttachmentBlob))
      if (getState().demoLinkKey !== session.scope.workspaceKey || taskWorkActor(getState(), node.id, authorization) !== actorId) throw new Error("Your draft is saved, but the task viewer has changed. Return to the original task and member before submitting.")
      const before = getState().nodes.find(n => n.id === node.id)!
      if (before.status !== startingStatus) throw new Error("The task status changed while saving. Your draft is kept; please review it before submitting again.")
      const accepted = tryDispatch({ type: "saveTaskWork", nodeId: node.id, authorization, input: { details: current.details, attachments: current.files, expectedRevision: current.baseWorkRevision, expectedOwnerId: session.scope.ownerId, expectedOwnerVersion: session.scope.ownerVersion, submit: true } })
      const savedNode = getState().nodes.find(n => n.id === node.id), savedWork = savedNode && taskWork(savedNode), saved = savedWork?.submissions.at(-1)
      if (!accepted || !savedWork || savedWork.revision !== current.baseWorkRevision + 1 || saved?.authorId !== actorId || saved.details !== current.details.trim() || JSON.stringify(saved.attachmentIds) !== JSON.stringify(current.files.map(f => f.id))) throw new Error("Your submission was not saved. Your draft is kept. Restore browser saving or check for newer changes, then try again.")
      if (alive.current) {
        setNotice("Your submission is saved. Thank you for your work.")
        if (before.status !== "done" && savedNode?.status === "done" && authorization?.kind !== "legacy") setUndo({ workspaceKey: session.scope.workspaceKey, status: before.status, waitingOn: before.waitingOn, waitingOnPersonId: before.waitingOnPersonId ?? null, revision: savedWork.revision, ownerVersion: before.ownerVersion ?? 0, ownerId: before.ownerId })
        section.current?.focus()
      }
      await session.submitted(savedWork.revision)
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Saving failed. Your draft is kept; please retry.") }
    finally { if (alive.current) setSubmitting(false) }
  }
  function undoCompletion() {
    setError("")
    const current = getState().nodes.find(n => n.id === node.id)
    if (!undo || getState().demoLinkKey !== undo.workspaceKey || !current || current.status !== "done" || taskWork(current)?.revision !== undo.revision || current.ownerId !== undo.ownerId || (current.ownerVersion ?? 0) !== undo.ownerVersion || taskWorkActor(getState(), node.id, authorization) !== actorId) { setError("This task has changed. Please use its status menu to review and reopen it."); return }
    const reply: TaskReply = undo.status === "waiting" ? "waiting" : undo.status === "blocked" ? "help" : undo.status === "accepted" ? "todo" : "working"
    const input: ReplyInput = { waitingOn: undo.waitingOn ?? "", waitingOnPersonId: undo.waitingOnPersonId }
    const accepted = tryDispatch(authorization?.kind === "access" ? { type: "taskAccessAction", token: authorization.token, update: { kind: reply === "help" ? "stuck" : reply, ...input } } : { type: "replyTask", nodeId: node.id, reply, input })
    if (!accepted || getState().nodes.find(n => n.id === node.id)?.status !== undo.status) { setError("The task was not reopened. Your submission is kept. Please restore saving or check for newer changes, then try again."); return }
    setUndo(null); setNotice("Completion undone. Your details and attachments are kept.")
  }
  const published = work.submissions.at(-1)
  return <section className="task-submission" aria-label="Task submission" data-testid="task-submission" ref={section} tabIndex={-1}>
    <div className="task-details-field"><label htmlFor={detailsId}>Details</label><textarea id={detailsId} value={draft.details} disabled={draft.loading || submitting} onChange={e => { session.setDetails(e.target.value); setNotice("") }} maxLength={20_000} rows={6} placeholder="Share the result, location, reference numbers or anything your team needs." /></div>
    {node.draftLink && safeTaskUrl(node.draftLink) && <a className="small" href={node.draftLink} target="_blank" rel="noreferrer">Open current draft ↗</a>}
    {draft.files.length > 0 && <ul className="task-file-list" aria-label="Attachments">{draft.files.map(file => <li key={file.id}><button type="button" className="task-file-download" aria-label={`Download ${file.name}`} onClick={() => { void downloadTaskAttachment(file, session.pendingBlob(file)).catch(() => setError("This file could not be downloaded. Please try again.")) }}><span aria-hidden="true">▤</span><span>{file.name}</span></button><button type="button" className="btn btn-quiet small" aria-label={`Remove ${file.name}`} disabled={draft.loading || submitting} onClick={() => { session.removeFile(file.id); setNotice("") }}>×</button></li>)}</ul>}
    <input ref={input} className="sr-only" tabIndex={-1} type="file" multiple accept=".pdf,.txt,.md,.csv,.docx,.xlsx,.png,.jpg,.jpeg,.webp" aria-label="Attach files" disabled={draft.loading || submitting} onChange={e => addFiles(e.target.files)} />
    <button type="button" className="btn task-add-files" disabled={draft.loading || submitting || draft.files.length >= MAX_FILES} onClick={() => input.current?.click()}>+ Add files</button>
    <p className="small muted task-file-limit">Up to 3 files, 2 MB each; 5 MB total. Saved in this demo browser.</p>
    {published && <p className="small muted task-submission-author">Submitted by {state.people.find(p => p.id === published.authorId)?.name ?? "Former teammate"} · {published.savedOn}</p>}
    <div className="task-submit-actions"><span className="small muted" role="status" data-testid="task-autosave-status" aria-live="polite">{draft.loading ? "Opening draft…" : draft.error ? "Draft not saved." : draft.saving ? "Saving draft…" : draft.hasDraft ? "Draft saved automatically." : "Changes save automatically."}</span><button type="button" className="btn btn-primary" disabled={draft.loading || submitting} onClick={() => { void submit() }}>{submitting ? "Submitting…" : node.status === "done" ? "Update submission" : isBudgetControlledNode(node) ? "Submit result" : "Submit & mark done"}</button></div>
    {draft.error && <p className="small late-text" role="alert">{draft.error} <button type="button" className="btn small" onClick={() => { void session.flush().catch(() => {}) }}>Retry saving draft</button></p>}
    {isBudgetControlledNode(node) && node.eventId && <p className="small muted">Completion is managed in <Link to={`/events?event=${encodeURIComponent(node.eventId)}&view=budget`}>Event Budget</Link>.</p>}
    {notice && <p role="status" className="small good-text">{notice}</p>}{error && <p role="alert" className="small late-text">{error}</p>}
    {undo && node.status === "done" && <button type="button" className="btn small" disabled={submitting} onClick={undoCompletion}>Undo mark done</button>}
  </section>
}
