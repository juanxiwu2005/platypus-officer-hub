import { changePlaybook, liveQuestion, MAX_ANSWERS, MAX_QUESTIONS, type PlaybookAction, PLAYBOOK_CATEGORIES, playbookOf, playbookRights } from "../../data/playbook"
import type { DemoState, PlaybookAnswer } from "../../data/types"

/** What the viewer may do on the Playbook page. The model (changePlaybook) enforces the same rules; this only hides what would be refused. */
export interface PlaybookViewer {
  id: string
  /** A current officer: may add questions and tips. */
  officer: boolean
  /** President or vice president: club rules, delete, edit any tip or club rule. */
  lead: boolean
  /** Current officers and incoming officers may vote; a former officer only reads (and sees no like or dislike). */
  canVote: boolean
  /** Current officers and incoming officers: opening a row marks it read. A former officer's reads are not recorded. */
  canMarkRead: boolean
}

/** The viewer's rights come from the model (playbookRights), so the page never offers what the reducer would refuse. */
export function playbookViewer(s: DemoState): PlaybookViewer {
  const rights = playbookRights(s)
  return { id: s.viewerId, officer: rights.write, lead: rights.lead, canVote: rights.vote, canMarkRead: rights.markRead }
}

/** The store action for a Playbook action. */
export const playbookDispatch = (a: PlaybookAction) => ({ type: "playbookAction" as const, action: a })

/**
 * Runs the model reducer on `actions` before they are sent (it is pure), so a save the model would refuse keeps its form open with
 * a short reason instead of closing and losing the text. Returns the state after all of them, or the reason for the first refusal.
 */
export function previewPlaybook(s: DemoState, actions: PlaybookAction[]): { next: DemoState; error: null } | { next: null; error: string } {
  let next = s
  for (const a of actions) {
    const after = changePlaybook(next, a)
    if (after === next) return { next: null, error: refusal(next, a) }
    next = after
  }
  return { next, error: null }
}
function refusal(s: DemoState, a: PlaybookAction): string {
  const p = playbookOf(s)
  if ((a.kind === "addQuestion" && p.questions.length >= MAX_QUESTIONS) || (a.kind === "addAnswer" && p.answers.length >= MAX_ANSWERS)) return "Not saved: the Playbook is full."
  if (a.kind === "addAnswer" && !liveQuestion(p, a.questionId)) return "Not saved: this question is no longer listed."
  return "Not saved: you can't add this to the Playbook."
}

/** Moves the focus once the page has rendered the change (a removed control would otherwise leave it on the page body). */
export const focusSoon = (target: () => HTMLElement | null | undefined) => requestAnimationFrame(() => target()?.focus())
/** A question row's own button (the toggle). */
export const rowButton = (questionId: string) => document.getElementById(`pb-q-${questionId}`)

/** The seven universal categories, then the club's own. */
export const categoriesOf = (s: DemoState): { id: string; label: string }[] => [...PLAYBOOK_CATEGORIES, ...(playbookOf(s).categories ?? [])]
export const categoryLabel = (s: DemoState, id: string) => categoriesOf(s).find(c => c.id === id)?.label ?? id

/** The short word on a row's category tag (the chips above the list keep the full label). */
const TAG: Record<string, string> = { funding: "Funding", venues: "Venues", food: "Food", promotion: "Promotion", people: "People", timeline: "Timeline", tools: "Tools" }
/**
 * A row's category tag: the short word and its colour class (`pb-tag-<id>`, or `pb-tag-club` for the club's own categories). A
 * club category's label (up to 40 characters, written by the club) is cut to its first two words there, so every row adds at most
 * the question, "New" and two words; the tag's fixed width ends it with an ellipsis when it is longer.
 */
export const rowTag = (s: DemoState, id: string): { label: string; tone: string } => {
  if (TAG[id]) return { label: TAG[id], tone: id }
  const parts = categoryLabel(s, id).split(/\s+/).filter(Boolean)
  return { label: parts.length > 2 ? `${parts.slice(0, 2).join(" ")}…` : parts.join(" "), tone: "club" }
}

/** The visible names of the three answer kinds (Juanxi, 2026-11-26); the stored kinds stay rule, club and experience. */
export const KIND_LABEL: Record<PlaybookAnswer["kind"], string> = { rule: "School rule", club: "Club rule", experience: "Tip" }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-09-08" → "Sep 2026" (no time zone involved). */
export const monthLabel = (iso: string) => {
  const [y, m] = iso.split("-")
  const i = Number(m) - 1
  return MONTHS[i] ? `${MONTHS[i]} ${y}` : ""
}

export const ThumbUp = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10v11H3V10zM7 10l4-7c1.7 0 3 1.3 3 3v3h5.5a2 2 0 012 2.3l-1.4 8A2 2 0 0118.1 21H7" /></svg>
export const ThumbDown = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17 14V3h4v11zM17 14l-4 7c-1.7 0-3-1.3-3-3v-3H4.5a2 2 0 01-2-2.3l1.4-8A2 2 0 015.9 3H17" /></svg>
export const Chevron = () => <svg className="pb-chev" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7 4l6 6-6 6" /></svg>
export const Spark = () => <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6L10 14.5l-1.6-4.4L4 8.5l4.4-1.6zM15.5 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></svg>
export const Dots = () => <svg className="pb-dots" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="4.5" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="15.5" cy="10" r="1.6" /></svg>
