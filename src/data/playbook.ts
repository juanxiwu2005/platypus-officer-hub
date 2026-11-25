import type { DemoState, Playbook, PlaybookAnswer, PlaybookCategory, PlaybookQuestion } from "./types"
import { canLead, isOfficer } from "./permissions"

/**
 * Playbook (phase 1). Stage A baseline written by the main agent; the model agent (P1-M) owns this file from here and completes it
 * to docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md without changing the exported names or signatures below.
 */

export const PLAYBOOK_CATEGORIES: readonly { id: PlaybookCategory; label: string }[] = [
  { id: "funding", label: "Funding" },
  { id: "venues", label: "Venues & registration" },
  { id: "food", label: "Food" },
  { id: "promotion", label: "Promotion" },
  { id: "people", label: "People & contacts" },
  { id: "timeline", label: "Timeline" },
  { id: "tools", label: "Tools & accounts" },
]
export const MAX_QUESTION_TEXT = 140
export const MAX_ANSWER_TEXT = 400
/** At most this many questions show per category (or in "For your role") before "Show N more". */
export const QUESTIONS_PER_VIEW = 8

export type PlaybookAction =
  | { kind: "addQuestion"; id: string; text: string; category: string; roleIds: string[] | "all"; policyIds?: string[] }
  | { kind: "addAnswer"; id: string; questionId: string; answerKind: "club" | "experience"; text: string }
  | { kind: "editAnswer"; answerId: string; text: string }
  | { kind: "hideAnswer"; answerId: string; hidden: boolean }
  | { kind: "vote"; answerId: string; vote: 1 | -1 | 0 }
  | { kind: "markRead"; questionId: string }
  | { kind: "mergeQuestion"; fromId: string; intoId: string }

export const emptyPlaybook = (): Playbook => ({ questions: [], answers: [] })
export const playbookOf = (s: DemoState): Playbook => s.playbook ?? emptyPlaybook()

/** Follows mergedInto links to the question that is shown. */
export function liveQuestion(p: Playbook, id: string): PlaybookQuestion | undefined {
  let q = p.questions.find(x => x.id === id)
  for (let hops = 0; q?.mergedInto && hops < 10; hops++) q = p.questions.find(x => x.id === q!.mergedInto)
  return q
}

/** Questions for a role (or all roles), optionally one category; merged questions are left out. Newest last. */
export function questionsFor(s: DemoState, opts: { roleId?: string | null; category?: string | null } = {}): PlaybookQuestion[] {
  return playbookOf(s).questions.filter(q => !q.mergedInto
    && (!opts.category || q.category === opts.category)
    && (!opts.roleId || q.roleIds === "all" || q.roleIds.includes(opts.roleId)))
}

const net = (a: PlaybookAnswer) => a.votes.up.length - a.votes.down.length
/** Primary answer per kind plus collapsed alternates. Ranking (baseline): rule as stored; others by net votes, then newest. */
export function answerSet(s: DemoState, questionId: string): { rule?: PlaybookAnswer; club?: PlaybookAnswer; experience?: PlaybookAnswer; alternates: PlaybookAnswer[] } {
  const all = playbookOf(s).answers.filter(a => a.questionId === questionId && a.status !== "hidden")
  const pick = (kind: PlaybookAnswer["kind"]) => all.filter(a => a.kind === kind).sort((a, b) => net(b) - net(a) || b.on.localeCompare(a.on))
  const rule = pick("rule"), club = pick("club"), experience = pick("experience")
  return { rule: rule[0], club: club[0], experience: experience[0], alternates: [...rule.slice(1), ...club.slice(1), ...experience.slice(1)] }
}

export const isRead = (s: DemoState, viewerId: string, questionId: string) => !!playbookOf(s).reads?.[viewerId]?.includes(questionId)

const nextId = (prefix: string, taken: string[]) => { let n = taken.length + 1; while (taken.includes(`${prefix}${n}`)) n++; return `${prefix}${n}` }
export const newPlaybookId = (s: DemoState, prefix: "pq-" | "pa-") => nextId(prefix, prefix === "pq-" ? playbookOf(s).questions.map(q => q.id) : playbookOf(s).answers.map(a => a.id))

/** The Playbook reducer. Returns the same state when the action is not allowed or changes nothing. */
export function changePlaybook(s: DemoState, a: PlaybookAction): DemoState {
  const p = playbookOf(s), me = s.people.find(x => x.id === s.viewerId)
  if (!me) return s
  const officer = isOfficer(me), lead = canLead(s)
  const put = (next: Playbook): DemoState => ({ ...s, playbook: next })
  switch (a.kind) {
    case "markRead": {
      if (!p.questions.some(q => q.id === a.questionId) || p.reads?.[me.id]?.includes(a.questionId)) return s
      return put({ ...p, reads: { ...p.reads, [me.id]: [...(p.reads?.[me.id] ?? []), a.questionId] } })
    }
    case "vote": {
      const ans = p.answers.find(x => x.id === a.answerId)
      if (!ans) return s
      const up = ans.votes.up.filter(id => id !== me.id), down = ans.votes.down.filter(id => id !== me.id)
      const votes = { up: a.vote === 1 ? [...up, me.id] : up, down: a.vote === -1 ? [...down, me.id] : down }
      return put({ ...p, answers: p.answers.map(x => x === ans ? { ...x, votes } : x) })
    }
    case "addQuestion": {
      const text = a.text.trim().slice(0, MAX_QUESTION_TEXT)
      if (!officer || !text || p.questions.some(q => q.id === a.id)) return s
      const q: PlaybookQuestion = { id: a.id, text, category: a.category, roleIds: a.roleIds, policyIds: a.policyIds ?? [], checklistItemIds: [], origin: "club", createdOn: s.today, createdBy: me.id }
      return put({ ...p, questions: [...p.questions, q] })
    }
    case "addAnswer": {
      const text = a.text.trim().slice(0, MAX_ANSWER_TEXT)
      if (!officer || !text || (a.answerKind === "club" && !lead) || !liveQuestion(p, a.questionId) || p.answers.some(x => x.id === a.id)) return s
      const ans: PlaybookAnswer = { id: a.id, questionId: liveQuestion(p, a.questionId)!.id, kind: a.answerKind, text, authorId: me.id, on: s.today, status: "active", votes: { up: [], down: [] } }
      return put({ ...p, answers: [...p.answers, ans] })
    }
    case "editAnswer": {
      const ans = p.answers.find(x => x.id === a.answerId), text = a.text.trim().slice(0, MAX_ANSWER_TEXT)
      if (!ans || ans.kind === "rule" || !text || text === ans.text || !(ans.authorId === me.id || lead)) return s
      return put({ ...p, answers: p.answers.map(x => x === ans ? { ...x, text, on: s.today } : x) })
    }
    case "hideAnswer": {
      const ans = p.answers.find(x => x.id === a.answerId)
      if (!ans || ans.kind === "rule" || !lead) return s
      const status = a.hidden ? "hidden" : "active"
      return ans.status === status ? s : put({ ...p, answers: p.answers.map(x => x === ans ? { ...x, status } : x) })
    }
    case "mergeQuestion": {
      const from = p.questions.find(q => q.id === a.fromId), into = liveQuestion(p, a.intoId)
      if (!lead || !from || !into || from.id === into.id || from.mergedInto) return s
      return put({ ...p, questions: p.questions.map(q => q === from ? { ...q, mergedInto: into.id } : q), answers: p.answers.map(x => x.questionId === from.id ? { ...x, questionId: into.id } : x) })
    }
  }
}
