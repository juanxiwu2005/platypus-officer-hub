import { type PlaybookAction, PLAYBOOK_CATEGORIES, playbookOf } from "../../data/playbook"
import { canLead, isOfficer } from "../../data/permissions"
import type { DemoState, PlaybookAnswer } from "../../data/types"

/** What the viewer may do on the Playbook page. The model (changePlaybook) enforces the same rules; this only hides what would be refused. */
export interface PlaybookViewer {
  id: string
  /** A current officer: may add questions and experience. */
  officer: boolean
  /** President or vice president: club practice, hide, edit any answer. */
  lead: boolean
  /** Current officers and incoming officers may vote; a former officer only reads. */
  canVote: boolean
  /** The role this viewer reads for by default (an incoming officer: the role they are taking over). */
  roleId: string | null
}

export function playbookViewer(s: DemoState): PlaybookViewer {
  const me = s.people.find(p => p.id === s.viewerId)
  const officer = !!me && isOfficer(me)
  const roleId = me?.incomingFor ?? (me && !me.leftOn ? me.roleId : null)
  return { id: s.viewerId, officer, lead: officer && canLead(s), canVote: officer || !!me?.incomingFor, roleId: roleId && s.roles.some(r => r.id === roleId) ? roleId : null }
}

/** The store action for a Playbook action. */
export const playbookDispatch = (a: PlaybookAction) => ({ type: "playbookAction" as const, action: a })

/** The seven universal categories, then the club's own. */
export const categoriesOf = (s: DemoState): { id: string; label: string }[] => [...PLAYBOOK_CATEGORIES, ...(playbookOf(s).categories ?? [])]
export const categoryLabel = (s: DemoState, id: string) => categoriesOf(s).find(c => c.id === id)?.label ?? id

export const KIND_LABEL: Record<PlaybookAnswer["kind"], string> = { rule: "School rule", club: "Club practice", experience: "Experience" }

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
