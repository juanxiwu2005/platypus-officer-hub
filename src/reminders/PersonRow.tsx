import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { useStore } from "../data/store"
import type { ReminderMode } from "../data/types"
import type { Forecast } from "../engine/forecast"
import { RiskDot } from "../components/ui"
import { firstName, type DigestPerson } from "./centre"
import { prepareReminderDigest, recordReminderDigests } from "./digest"
import type { ReminderDelivery } from "./contracts"
import { Mail, digestVia, usePreparedDigest } from "./DigestMail"
import { loadedDraftModule, useRowDraft } from "./draftLoader"

// The compose box loads when a row first opens, so it adds nothing to the startup bundle.
const DraftEditor = lazy(() => import("./DraftEditor"))

/**
 * One person's row: their tasks, a disclosure with the full email, and the mode's one action. Nothing is really sent.
 * Button rule: the summary card's action (Send all, or Choose how reminders go out) is the screen's one filled button, so
 * row actions are outlined. Only "I review, then I send" has no summary action; there Open in Gmail stays filled.
 * Row actions are disabled while Send all runs.
 * R-S0 (2026-11-27): in the review modes (and with no mode chosen) the open email is an editable draft (DraftEditor);
 * "Send automatically" and recorded emails keep the read-only preview.
 */
export function PersonRow({ p, mode, reviewing, forecast, sendingAll }: { p: DigestPerson; mode: ReminderMode | null; reviewing: boolean; forecast: Forecast; sendingAll: boolean }) {
  const { state, getState, tryDispatch, persistenceFailed } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const toggle = useRef<HTMLButtonElement>(null)
  // With no mode chosen yet, a lead sends the email themselves, as in the rail.
  const via = digestVia(mode)
  const editable = mode !== "auto_email"
  const { prepared, problem, retry } = usePreparedDigest(open ? p.group : null, p.recipientId, via)
  const today = state.today
  const { drafts, draft } = useRowDraft(editable && open && !!p.group, editable ? p.group?.id : null, p.recipientId, today)
  // A freshly prepared email makes (or updates) this person's draft; the draft outlives the row being collapsed.
  useEffect(() => {
    if (!editable || !prepared || !drafts) return
    const d = prepared.digest
    drafts.openDraft({ groupId: prepared.groupId, recipientId: d.recipientId, day: d.preparedOn, intendedEmail: d.intendedEmail,
      subject: d.subject, body: d.body, taskUrls: d.taskUrls, nodeIds: d.nodeIds }, drafts.draftTitleOf(getState()))
  }, [editable, prepared, drafts, getState])
  const blocker = drafts && draft && p.group ? drafts.draftBlocker(draft, p.group.candidates.map(c => c.nodeId)) : null
  const status = p.group ? reviewing ? "reviewing" : "next" : "sent"
  const first = firstName(p.name)
  const region = `dg-email-${p.recipientId.replace(/[^\w-]/g, "_")}`
  /** The same prepare-and-record path as the rail's Send & next: one recordReminderDigests action for this person's email. */
  const record = async (how: ReminderDelivery["via"], clicks: number) => {
    if (busy || sendingAll || persistenceFailed || !p.group || clicks > 1) return
    setBusy(true); setNote("")
    try {
      const ready = prepared ?? await prepareReminderDigest({ getState, tryDispatch }, p.group.id, window.location.origin, how)
      if ("error" in ready) { setNote(ready.error); return }
      if (how !== "manual" && !ready.digest.intendedEmail) { setNote("Add a valid email address for this person before sending."); return }
      // The person's current draft goes out (edited or not); one that cannot go out stops here and says why.
      const loadedDrafts = editable ? loadedDraftModule() : null
      const current = loadedDrafts?.findDraft(ready.groupId, p.recipientId, getState().today)
      const stop = current && loadedDrafts!.draftBlocker(current, ready.digest.nodeIds)
      if (stop) { setNote(stop); return }
      const edit = current && loadedDrafts!.draftEditFor(current, ready.digest)
      const result = recordReminderDigests({ getState, tryDispatch }, [ready], how, edit ? { [ready.groupId]: edit } : undefined)
      if (!result.recordedGroupIds.includes(ready.groupId)) { setNote(result.error ?? "This email changed. Review the new version, then try again."); retry(); return }
      if (current) loadedDrafts!.dropDrafts([current.base.groupId])
      setNote(`Sent to ${first}.`)
      toggle.current?.focus()
    } catch { setNote("This email was not sent. Please try again.") }
    finally { setBusy(false) }
  }
  const shown = open ? [note, problem].filter(Boolean).join(" ") : note || (blocker ?? "")
  const editing = editable && !!prepared && !!drafts && draft?.base.groupId === prepared.groupId ? draft : null
  const preparing = !problem && !persistenceFailed && <p className="small muted" role="status">Preparing the email…</p>
  // "I review, then I send" (and no mode yet): Open in Gmail with the draft, then I sent this. Drawn by the editor.
  const gmail = via === "manual" ? { primary: mode === "review_then_self", blocked: !!blocker, sentDisabled: busy || sendingAll || persistenceFailed,
    onSent: (clicks: number) => record("manual", clicks) } : undefined
  return <li className="dg-person" data-testid="rq-person" data-recipient={p.recipientId} data-state={status} data-open={open || undefined}>
    <div className="dg-person-head">
      <button ref={toggle} type="button" className="dg-person-toggle" aria-expanded={open} aria-controls={region} data-testid="rq-person-toggle" onClick={() => setOpen(o => !o)}>
        <span className="avatar dg-av" aria-hidden="true">{p.initials}</span>
        <span className="dg-name"><span className="sr-only">Email to</span>{" "}{p.name}</span>
        <span className="dg-caret" aria-hidden="true" />
      </button>
      {status === "sent" ? <span className="dg-state sent">Sent</span>
        : mode === "review_then_auto" ? <button type="button" className="btn small" data-testid="rq-person-send" aria-label={`Send to ${first}`} disabled={busy || sendingAll || persistenceFailed || !!blocker} onClick={event => record("platypus", event.detail)}>{busy ? "Sending…" : "Send"}</button>
        : null}
    </div>
    <ul className="dg-tasks">{p.tasks.map(t => <li key={t.id} className="dg-task" data-testid="rq-person-task" data-node={t.nodeId}>
      <span className="rq-mark">{t.risk && forecast.nodes[t.nodeId] && <RiskDot result={forecast.nodes[t.nodeId]} />}</span>
      <span className="dg-task-title">{t.title}</span>
      {t.chip && <span className={`dg-chip ${t.tone}`}>{t.chip}</span>}
    </li>)}</ul>
    <div id={region} className="dg-inline" data-testid="rq-person-email" hidden={!open}>
      {open && (p.group ? editable
        ? editing ? <Suspense fallback={preparing}><DraftEditor draft={editing} name={p.name} gmail={gmail} /></Suspense> : preparing
        : <>
          {prepared ? <Mail label={`Email to ${p.name}`} to={prepared.digest.intendedEmail} subject={prepared.digest.subject} body={prepared.digest.body} /> : preparing}
        </> : p.sent && <Mail label={`Email to ${p.name}`} to={p.sent.intendedEmail} subject={p.sent.subject} body={p.sent.body} />)}
    </div>
    {/* Always mounted so screen readers announce "Sent to …" and other notes when they appear. */}
    <p className="small dg-row-note" role="status">{shown}</p>
  </li>
}
