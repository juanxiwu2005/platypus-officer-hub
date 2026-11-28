import type { DigestEdit, PreparedDigest } from "./digestContracts"
import { BODY_LIMIT, SUBJECT_LIMIT, TOKEN_LIKE, draftIssues, fromTokens, missingLinks, strayTokens, toTokens, draftLinks, type DraftLink, type DraftProblemCode, type DraftTask } from "./draftLinks"

export * from "./draftLinks"

export interface DraftProblem { code: DraftProblemCode; message: string; nodeId?: string }
const thousands = (n: number) => n.toLocaleString("en-US")
/** draftIssues, worded for the page: what stops an edited email, in display order. */
export function draftProblems(subject: string, body: string, links: DraftLink[]): DraftProblem[] {
  return draftIssues(subject, body, links).map(({ code, link, token, size = 0 }) => ({ code, ...(link ? { nodeId: link.nodeId } : {}), message:
    code === "missing_link" ? `Missing link: ${link!.title}`
    : code === "repeated_link" ? `Use the link to ${link!.title} once.`
    : code === "stray_link" ? `${token} is not a task link in this email. Put back links replaces it.`
    : code === "subject_empty" ? "Add a subject."
    : code === "subject_long" ? `Shorten the subject to ${SUBJECT_LIMIT} characters (now ${thousands(size)}).`
    : code === "subject_line" ? "Keep the subject on one line."
    : code === "body_long" ? `Shorten the email to ${thousands(BODY_LIMIT)} characters (now ${thousands(size)}).`
    : "Remove the web address. Only the task links can be links in this email." }))
}

/**
 * Editable reminder emails (R-S0 §4, Juanxi 2026-11-27): a president or VP may adjust a person's email before it goes out.
 *
 * - The box shows each task link as a readable token on its own line, `[Open task: <title>]`, never the signed address.
 *   Tokens become the exact signed URLs only when the email is recorded or handed to Gmail (`fromTokens`).
 * - A deleted or altered token counts as a missing link; sending stops until it is back (`draftProblems`, `putBackLinks`).
 * - Undo and Redo keep their own history. Typing is grouped into one step until a pause of about 500 ms, a new word, a
 *   jump of the caret or a change of field; a paste, cut, Put back or Restore is always one step of its own.
 *   (Approach studied, no code copied: the merge rules of Lexical's history plugin, facebook/lexical packages/lexical-history.)
 *
 * Drafts live only in memory for this browser tab (the module-level store at the end of this file), keyed by digest group
 * id, so collapsing a row, opening another row or visiting another page keeps the edit and the Gmail "draft opened" flag.
 * A reload loses unsent edits on purpose: typed text is never saved to the browser or written to the research log.
 * Drafts belong to one club and one viewer: a demo reset, an import, first-time setup and "View as" clear them all, and a
 * change of sending mode forgets every "draft opened in Gmail" (the store calls draftsAfterAction, src/reminders/draftLoader.ts).
 */

/** At least 100 steps per email are required; older steps beyond this are dropped. */
export const HISTORY_LIMIT = 200
/** Typing after a pause this long starts a new undo step. */
export const GROUP_PAUSE_MS = 500
const swap = (text: string, from: string, to: string) => text.split(from).join(to)

/**
 * Put every missing token back at the end of the body. An altered token ("[Open task: …]" that matches no task) is removed,
 * because the right one is put back; a line it leaves empty goes with it. Everything else stays as typed.
 */
export function putBackLinks(body: string, links: DraftLink[]): string {
  const missing = missingLinks(body, links)
  const stray = new Set(strayTokens(body, links))
  if (!missing.length && !stray.size) return body
  const kept = stray.size ? body.split("\n").flatMap(line => {
    const next = line.replace(TOKEN_LIKE, token => stray.has(token) ? "" : token)
    return next !== line && !next.trim() ? [] : [next]
  }).join("\n") : body
  if (!missing.length) return kept
  const text = kept.replace(/\s+$/, "")
  return `${text}${text ? "\n\n" : ""}${missing.map(link => link.token).join("\n")}`
}

/* ---------- One email's draft and its undo history (pure; the store below holds them) ---------- */

export type DraftField = "subject" | "body"
export interface DraftCaret { field: DraftField; start: number; end: number }
interface Snapshot { subject: string; body: string; caret: DraftCaret | null }
interface LastChange { field: DraftField; kind: "insert" | "delete"; at: number; pos: number; space: boolean }
/** What the draft was made from: the rule-written email as prepared, with its real task URLs. */
export interface DraftBase {
  groupId: string; recipientId: string; day: string; intendedEmail: string | null
  subject: string; body: string; taskUrls: string[]; nodeIds: string[]
}
export interface ReminderDraft {
  base: DraftBase
  links: DraftLink[]
  subject: string
  body: string
  /** Where the caret belongs after a change the person did not type (undo, redo, put back, restore). */
  caret: DraftCaret | null
  undo: Snapshot[]
  redo: Snapshot[]
  last: LastChange | null
  /**
   * Open in Gmail was used for this exact text; it shows "I sent this". Any change to the text afterwards (typing, undo, redo,
   * Put back, Restore original, Use new email, a changed rule-written email) clears it, so only what Gmail got can be recorded.
   */
  gmailOpened: boolean
  /** "changed": the rule-written email changed and the edit was kept; "replaced": it changed and the edit was replaced. */
  notice: "changed" | "replaced" | null
  /**
   * The rule-written email changed after an edit and the person has not seen the box since (it changed while the row was
   * closed, for example during Send all). Sending waits until the row is opened; the open box clears it.
   */
  needsReview: boolean
}

const tasksOf = (base: DraftBase, titleOf: (nodeId: string) => string): DraftTask[] =>
  base.nodeIds.map((nodeId, index) => ({ nodeId, title: titleOf(nodeId), url: base.taskUrls[index] ?? "" }))

export function createDraft(base: DraftBase, titleOf: (nodeId: string) => string): ReminderDraft {
  const links = draftLinks(tasksOf(base, titleOf))
  return { base, links, subject: base.subject, body: toTokens(base.body, links), caret: null, undo: [], redo: [], last: null, gmailOpened: false, notice: null, needsReview: false }
}

/** What a draft is made from: a freshly prepared email. */
export function draftBase(prepared: { groupId: string; digest: PreparedDigest["digest"] }): DraftBase {
  const d = prepared.digest
  return { groupId: prepared.groupId, recipientId: d.recipientId, day: d.preparedOn, intendedEmail: d.intendedEmail,
    subject: d.subject, body: d.body, taskUrls: [...d.taskUrls], nodeIds: [...d.nodeIds] }
}

/** The rule-written email as the box shows it. */
export const originalText = (draft: ReminderDraft) => ({ subject: draft.base.subject, body: toTokens(draft.base.body, draft.links) })
export const isEdited = (draft: ReminderDraft) => {
  const original = originalText(draft)
  return draft.subject !== original.subject || draft.body !== original.body
}
/** An untouched draft is the rule-written email, which the rules already checked: only an edit can have problems. */
export const draftProblemsOf = (draft: ReminderDraft) => isEdited(draft) ? draftProblems(draft.subject, draft.body, draft.links) : []
/** The email with real addresses, as Gmail or the record gets it. */
export const draftEmail = (draft: ReminderDraft): DigestEdit => ({ subject: draft.subject, body: fromTokens(draft.body, draft.links) })

const snapshot = (draft: ReminderDraft, caret: DraftCaret | null): Snapshot => ({ subject: draft.subject, body: draft.body, caret })
const capped = (list: Snapshot[]) => list.length > HISTORY_LIMIT ? list.slice(list.length - HISTORY_LIMIT) : list

/** A change that is always one undo step of its own (put back, restore, use new email). */
function step(draft: ReminderDraft, next: { subject: string; body: string }, caret: DraftCaret | null): ReminderDraft {
  if (next.subject === draft.subject && next.body === draft.body) return draft
  return { ...draft, ...next, caret, undo: capped([...draft.undo, snapshot(draft, draft.caret)]), redo: [], last: null, gmailOpened: false }
}

/**
 * The person typed, deleted, pasted or cut in one field. `at` is the time in milliseconds (for grouping only).
 * Consecutive one-character inserts (or deletes) at the caret within GROUP_PAUSE_MS form one step; a new word after a
 * space starts the next step; anything bigger (paste, cut, replacing a selection) is a step of its own.
 */
export function typeInto(draft: ReminderDraft, field: DraftField, value: string, at: number): ReminderDraft {
  const before = draft[field]
  if (value === before) return draft
  let start = 0
  while (start < before.length && start < value.length && before[start] === value[start]) start++
  let end = 0
  while (end < before.length - start && end < value.length - start && before[before.length - 1 - end] === value[value.length - 1 - end]) end++
  const removed = before.slice(start, before.length - end), inserted = value.slice(start, value.length - end)
  const kind: LastChange["kind"] | null = !removed && inserted.length === 1 ? "insert" : !inserted && removed.length === 1 ? "delete" : null
  const pos = kind === "delete" ? start : start + inserted.length
  const last = draft.last
  const space = kind === "insert" && /\s/.test(inserted)
  const merge = !!kind && !!last && last.kind === kind && last.field === field && at - last.at < GROUP_PAUSE_MS
    && (kind === "insert" ? start === last.pos && !(last.space && !space) : start === last.pos || start + 1 === last.pos)
  const caret: DraftCaret = { field, start: pos, end: pos }
  const next = { ...draft, [field]: value, caret, last: kind ? { field, kind, at, pos, space } : null, notice: draft.notice === "replaced" ? null : draft.notice, gmailOpened: false }
  if (merge) return next
  const restoreAt = start + removed.length
  return { ...next, undo: capped([...draft.undo, snapshot(draft, { field, start: restoreAt, end: restoreAt })]), redo: [] }
}

export function undoDraft(draft: ReminderDraft): ReminderDraft {
  const previous = draft.undo.at(-1)
  if (!previous) return draft
  return { ...draft, subject: previous.subject, body: previous.body, caret: previous.caret, undo: draft.undo.slice(0, -1),
    redo: capped([...draft.redo, snapshot(draft, draft.caret)]), last: null, gmailOpened: false }
}

export function redoDraft(draft: ReminderDraft): ReminderDraft {
  const next = draft.redo.at(-1)
  if (!next) return draft
  return { ...draft, subject: next.subject, body: next.body, caret: next.caret, redo: draft.redo.slice(0, -1),
    undo: capped([...draft.undo, snapshot(draft, draft.caret)]), last: null, gmailOpened: false }
}

export function putBack(draft: ReminderDraft): ReminderDraft {
  const body = putBackLinks(draft.body, draft.links)
  return step(draft, { subject: draft.subject, body }, { field: "body", start: body.length, end: body.length })
}

/** Restore original (and "Use new email"): the rule-written email, as one undoable step. */
export function restoreOriginal(draft: ReminderDraft): ReminderDraft {
  const restored = step(draft, originalText(draft), { field: "body", start: 0, end: 0 })
  return restored.notice ? { ...restored, notice: null } : restored
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
const sameBase = (a: DraftBase, b: DraftBase) => a.groupId === b.groupId && a.recipientId === b.recipientId && a.day === b.day
  && a.intendedEmail === b.intendedEmail && a.subject === b.subject && a.body === b.body && sameList(a.taskUrls, b.taskUrls) && sameList(a.nodeIds, b.nodeIds)

/**
 * The rule-written email was prepared again. Unchanged: nothing happens. Changed and not edited: the box shows the new email.
 * Changed after an edit: the edit is kept only when the same tasks still apply on the same day (each token is renamed to
 * its task's new token, in the history too) and the page says the tasks changed; otherwise (other tasks, or an edit from an
 * earlier day) the new email replaces the edit and says so. Either way sending waits until the box is seen (needsReview).
 * A Gmail draft opened from the old email no longer counts. A new signed address alone (a reissued link) changes no text.
 */
export function syncDraft(draft: ReminderDraft, base: DraftBase, titleOf: (nodeId: string) => string): ReminderDraft {
  if (sameBase(draft.base, base)) return draft
  const fresh = createDraft(base, titleOf)
  if (!isEdited(draft)) return fresh
  if (draft.base.day !== base.day || !sameList([...draft.base.nodeIds].sort(), [...base.nodeIds].sort())) return { ...fresh, notice: "replaced", needsReview: true }
  const renamed = new Map(draft.links.map(old => [old.token, fresh.links.find(link => link.nodeId === old.nodeId)!.token]))
  // Two passes, so a new token that equals another task's old token is never renamed twice.
  const marks = [...renamed.keys()]
  const rename = (text: string) => marks.reduce((out, token, i) => swap(out, `\u0000${i}\u0000`, renamed.get(token)!),
    marks.reduce((out, token, i) => swap(out, token, `\u0000${i}\u0000`), text))
  const move = (s: Snapshot): Snapshot => ({ ...s, subject: rename(s.subject), body: rename(s.body) })
  const before = originalText(draft), after = originalText(fresh)
  // A field the person did not touch follows the new email; an edited field keeps the edit.
  const subject = draft.subject === before.subject ? after.subject : rename(draft.subject)
  const body = draft.body === before.body ? after.body : rename(draft.body)
  const changed = before.subject !== after.subject || rename(before.body) !== after.body
  return { ...draft, base, links: fresh.links, subject, body, undo: draft.undo.map(move), redo: draft.redo.map(move), last: null,
    gmailOpened: false, notice: changed ? "changed" : draft.notice, needsReview: changed || draft.needsReview }
}

/**
 * Why this draft cannot go out as part of the email whose tasks are `nodeIds` on `day`, or null. `first` names the person
 * (Send all: "Put back the task link in Jordan's email first.").
 */
export function draftBlocker(draft: ReminderDraft, email: { nodeIds: string[]; day?: string }, first?: string): string | null {
  const { nodeIds, day } = email
  const review = `${first ? `${first}'s` : "This"} email changed. Open it and review before sending.`
  if (draft.needsReview) return review
  // An edit from an earlier day is replaced when the row opens; until then it holds the send, so it is never lost silently.
  if (day && draft.base.day !== day) return isEdited(draft) ? review : null
  const problems = draftProblemsOf(draft)
  const missing = problems.filter(p => p.code === "missing_link").length
  if (missing) return `Put back the task link${missing > 1 ? "s" : ""}${first ? ` in ${first}'s email` : ""} first.`
  if (problems.length) return first ? `Check ${first}'s email first. ${problems[0].message}` : problems[0].message
  if (isEdited(draft) && !sameList([...draft.base.nodeIds].sort(), [...nodeIds].sort())) return `${first ? `${first}'s` : "This"} email's tasks changed. Review it before sending.`
  return null
}

/** The edit to record for an email with these task URLs (by task), or null when the draft equals the rule-written email. */
export function draftEditFor(draft: ReminderDraft, email: { nodeIds: string[]; taskUrls: string[] }): DigestEdit | null {
  if (!isEdited(draft)) return null
  const urls = new Map(email.nodeIds.map((id, i) => [id, email.taskUrls[i]]))
  const links = draft.links.map(link => ({ ...link, url: urls.get(link.nodeId) ?? link.url }))
  return { subject: draft.subject, body: fromTokens(draft.body, links) }
}

/* ---------- The in-memory store: this tab only, never saved, never logged ---------- */

const drafts = new Map<string, ReminderDraft>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(listener => listener())
/** For useSyncExternalStore (src/reminders/draftLoader.ts). */
export const subscribeDrafts = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

/**
 * The draft of this group, else of an earlier version of this person's email today (its group id changed with its tasks),
 * else one left from an earlier day (the demo clock moved), which the next prepare replaces and says so.
 */
export function findDraft(groupId: string | null | undefined, recipientId: string, day: string): ReminderDraft | undefined {
  if (!groupId) return undefined
  const exact = drafts.get(groupId)
  if (exact) return exact
  let earlier: ReminderDraft | undefined
  for (const draft of drafts.values()) {
    if (draft.base.recipientId !== recipientId) continue
    if (draft.base.day === day) return draft
    earlier ??= draft
  }
  return earlier
}

/** Make or update the draft for a freshly prepared email. */
export function openDraft(base: DraftBase, titleOf: (nodeId: string) => string): ReminderDraft {
  const existing = findDraft(base.groupId, base.recipientId, base.day)
  const next = existing ? syncDraft(existing, base, titleOf) : createDraft(base, titleOf)
  if (next === existing) return next
  if (existing && existing.base.groupId !== base.groupId) drafts.delete(existing.base.groupId)
  drafts.set(base.groupId, next)
  emit()
  return next
}

export function changeDraft(groupId: string, change: (draft: ReminderDraft) => ReminderDraft): void {
  const draft = drafts.get(groupId)
  if (!draft) return
  const next = change(draft)
  if (next !== draft) { drafts.set(groupId, next); emit() }
}

/** After an email is recorded, its draft is gone. */
export function dropDrafts(groupIds: string[]): void {
  let changed = false
  for (const id of groupIds) changed = drafts.delete(id) || changed
  if (changed) emit()
}

/** A demo reset, an import, first-time setup or another viewer (src/reminders/draftLoader.ts), and tests. */
export function clearDrafts(): void { if (drafts.size) { drafts.clear(); emit() } }

/** The sending mode changed: no Gmail draft opened before counts any more, so "I sent this" waits for Open in Gmail again. */
export function forgetGmail(): void {
  let changed = false
  for (const [id, draft] of drafts) if (draft.gmailOpened) { drafts.set(id, { ...draft, gmailOpened: false }); changed = true }
  if (changed) emit()
}

/** The person's name as Send all uses it: "Jordan's email". */
const firstOf = (name: string) => name.split(/\s+/)[0] || name

/**
 * Resolve this person's draft against a freshly prepared email, just before it is recorded (row Send, I sent this, Send all).
 * The same stale-draft rule as an opened row runs first (syncDraft, saved, so the row shows its note when it opens): an
 * untouched draft follows the new email; an edit whose email changed waits for review, named; task links always become the
 * prepared email's own addresses, never the ones the draft was made from. `gmail`: the text must still be the one handed to
 * Gmail. No draft: the rule-written email goes out.
 */
export function resolveDraft(prepared: { groupId: string; digest: PreparedDigest["digest"] }, titleOf: (nodeId: string) => string,
  options: { first?: string; gmail?: boolean } = {}): { edit: DigestEdit | null; blocker: string | null } {
  const d = prepared.digest
  if (!findDraft(prepared.groupId, d.recipientId, d.preparedOn)) return { edit: null, blocker: null }
  const draft = openDraft(draftBase(prepared), titleOf)
  const blocker = draftBlocker(draft, { nodeIds: d.nodeIds, day: d.preparedOn }, options.first)
    ?? (options.gmail && !draft.gmailOpened ? "This email changed after it was opened in Gmail. Open it in Gmail again, then choose I sent this." : null)
  return blocker ? { edit: null, blocker } : { edit: draftEditFor(draft, d), blocker: null }
}

/**
 * Send all, after every email was prepared: each person's current draft (edited or not) against their prepared email.
 * One that cannot go out stops the whole send with a reason naming the person; every draft is still brought up to date.
 */
export function resolveDrafts(prepared: PreparedDigest[], titleOf: (nodeId: string) => string): { edits: Record<string, DigestEdit>; blocker: string | null } {
  const edits: Record<string, DigestEdit> = {}
  let blocker: string | null = null
  for (const p of prepared) {
    const result = resolveDraft(p, titleOf, { first: firstOf(p.digest.recipientName) })
    if (result.blocker) blocker ??= result.blocker
    else if (result.edit) edits[p.groupId] = result.edit
  }
  return blocker ? { edits: {}, blocker } : { edits, blocker: null }
}

/** Why Send all is off right now (a missing link, a limit, an edit waiting for review), naming the person, or null. */
export function sendAllBlocker(groups: { id: string; recipientId: string; recipientName: string; candidates: { nodeId: string }[] }[], day: string): string | null {
  for (const group of groups) {
    const draft = findDraft(group.id, group.recipientId, day)
    const blocker = draft && draftBlocker(draft, { nodeIds: group.candidates.map(c => c.nodeId), day }, firstOf(group.recipientName))
    if (blocker) return blocker
  }
  return null
}
