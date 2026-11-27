import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent } from "react"
import { composeUrl } from "../lib/nudges"
import { changeDraft, draftEmail, draftProblemsOf, isEdited, putBack, redoDraft, restoreOriginal, typeInto, undoDraft, type ReminderDraft } from "./draft"
import "./draft-editor.css"

/**
 * A plain, Gmail-like compose box for one person's reminder email (R-S0 §4): To (read only), Subject, the body, and a small
 * toolbar with Undo, Redo, Restore original and the sending mode's own action. No formatting, attachments or CC.
 * Task links show as `[Open task: <title>]` tokens; a missing one is listed with one "Put back links" button.
 * What is typed stays in the in-memory draft (src/reminders/draft.ts); it is never logged (src/lib/uiLog.ts reads no
 * typed value, and every button here has a fixed name and data-testid).
 */
/** The "I send it myself" actions: Open in Gmail hands over the draft (links expanded, To filled); then I sent this. */
export interface GmailActions { primary: boolean; blocked: boolean; sentDisabled: boolean; onSent: (clicks: number) => void }

export default function DraftEditor({ draft, name, gmail }: { draft: ReminderDraft; name: string; gmail?: GmailActions }) {
  const id = useId()
  const subjectRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  /** Set by a toolbar button or shortcut, so the caret goes where that change happened. */
  const pending = useRef<{ focus: boolean } | null>(null)
  const groupId = draft.base.groupId
  const problems = draftProblemsOf(draft)
  const links = problems.filter(p => p.code === "missing_link" || p.code === "stray_link")
  const missing = problems.filter(p => p.code === "missing_link")
  const limits = problems.filter(p => p.code !== "missing_link" && p.code !== "stray_link")
  const edited = isEdited(draft)
  const apply = (change: (d: ReminderDraft) => ReminderDraft, focus = false) => { pending.current = { focus }; changeDraft(groupId, change) }

  useLayoutEffect(() => {
    const want = pending.current
    pending.current = null
    if (!want || !draft.caret) return
    const field = draft.caret.field === "subject" ? subjectRef.current : bodyRef.current
    if (!field) return
    if (want.focus) field.focus()
    if (document.activeElement === field) field.setSelectionRange(draft.caret.start, draft.caret.end)
  }, [draft])

  // The body grows with its text (no scrolling box inside the page); nothing animates its height.
  const grow = () => {
    const field = bodyRef.current
    if (!field) return
    field.style.height = "auto"
    field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`
  }
  useLayoutEffect(grow, [draft.body])
  useEffect(() => { window.addEventListener("resize", grow); return () => window.removeEventListener("resize", grow) }, [])

  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    const redo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey)
    if (key !== "z" && !redo) return
    event.preventDefault()
    apply(redo ? redoDraft : undoDraft, true)
  }
  const press = (enabled: boolean, change: (d: ReminderDraft) => ReminderDraft) => () => { if (enabled) apply(change) }
  const problemsId = `${id}-problems`
  return <section className="dg-draft" aria-label={`Email to ${name}`} data-testid="rq-draft" data-edited={edited || undefined}>
    <p className="dg-draft-row"><span className="dg-draft-label">To</span>{" "}
      <span className="dg-draft-to" data-testid="rq-draft-to">{draft.base.intendedEmail ?? "no valid email address"}</span></p>
    <div className="dg-draft-row">
      <label className="dg-draft-label" htmlFor={`${id}-subject`}>Subject</label>
      <input ref={subjectRef} id={`${id}-subject`} className="dg-draft-subject" data-testid="rq-draft-subject" type="text" autoComplete="off" spellCheck
        value={draft.subject} aria-describedby={problemsId} aria-invalid={limits.some(p => p.code.startsWith("subject")) || undefined}
        onKeyDown={keys} onChange={event => { const value = event.target.value.replace(/[\r\n]+/g, " "); changeDraft(groupId, d => typeInto(d, "subject", value, Date.now())) }} />
    </div>
    <label className="sr-only" htmlFor={`${id}-body`}>Message</label>
    <textarea ref={bodyRef} id={`${id}-body`} className="dg-draft-body" data-testid="rq-draft-body" rows={8} spellCheck
      value={draft.body} aria-describedby={problemsId} aria-invalid={problems.some(p => !p.code.startsWith("subject")) || undefined}
      onKeyDown={keys} onChange={event => { const value = event.target.value; changeDraft(groupId, d => typeInto(d, "body", value, Date.now())) }} />
    {/* Always mounted, so a missing link or a limit is announced when it appears. */}
    <div className="dg-draft-problems" id={problemsId} aria-live="polite" data-testid="rq-draft-problems">
      {draft.notice === "changed" && <p className="dg-draft-notice" data-testid="rq-draft-changed">This email's tasks changed. Review it before sending.{" "}
        <button type="button" className="btn small" data-testid="rq-draft-use-new" onClick={() => apply(restoreOriginal)}>Use new email</button></p>}
      {draft.notice === "replaced" && <p className="dg-draft-notice" data-testid="rq-draft-replaced">This email's tasks changed, so your edit was replaced.</p>}
      {links.length > 0 && <div className="dg-draft-missing" data-testid="rq-draft-missing">
        <ul>{links.map(p => <li key={p.message}>{p.message}</li>)}</ul>
        <button type="button" className="btn small" data-testid="rq-draft-putback" onClick={() => apply(putBack)}>Put back links</button>
      </div>}
      {limits.length > 0 && <ul className="dg-draft-limits" data-testid="rq-draft-limits">{limits.map(p => <li key={p.code}>{p.message}</li>)}</ul>}
      {missing.length > 0 && <p className="sr-only">Sending waits until every task link is back.</p>}
    </div>
    <div className="dg-draft-bar" role="group" aria-label="Edit email">
      <button type="button" className="btn btn-quiet small" data-testid="rq-draft-undo" aria-keyshortcuts="Control+Z Meta+Z"
        aria-disabled={!draft.undo.length} onClick={press(draft.undo.length > 0, undoDraft)}>Undo</button>
      <button type="button" className="btn btn-quiet small" data-testid="rq-draft-redo" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        aria-disabled={!draft.redo.length} onClick={press(draft.redo.length > 0, redoDraft)}>Redo</button>
      <button type="button" className="btn btn-quiet small" data-testid="rq-draft-restore" aria-disabled={!edited} onClick={press(edited, restoreOriginal)}>Restore original</button>
      {gmail && <span className="dg-draft-actions">
        {gmail.blocked ? <button type="button" className={gmailClass(gmail)} data-testid="rq-person-gmail" aria-disabled="true" aria-describedby={problemsId}>Open in Gmail</button>
          : <a className={gmailClass(gmail)} data-testid="rq-person-gmail" target="_blank" rel="noreferrer"
            href={composeUrl("email", draftEmail(draft).body, draft.subject, draft.base.intendedEmail ?? undefined)}
            onClick={() => changeDraft(groupId, d => d.gmailOpened ? d : { ...d, gmailOpened: true })}>Open in Gmail</a>}
        {draft.gmailOpened && <button type="button" className="btn small" data-testid="rq-person-sent-self" disabled={gmail.sentDisabled || gmail.blocked}
          onClick={event => gmail.onSent(event.detail)}>I sent this</button>}
      </span>}
    </div>
  </section>
}

/** Outlined, except in "I review, then I send", where Open in Gmail is the screen's one filled button. */
const gmailClass = (gmail: GmailActions) => gmail.primary ? "btn btn-primary small" : "btn small"
