import type { DemoState, Person, Playbook, PlaybookAnswer, PlaybookAsked, PlaybookCategory, PlaybookQuestion } from "./types"
import { canLead, isOfficer } from "./permissions"
import { starterPlaybook } from "./playbookStarter"

/**
 * Playbook (phase 1; docs/feedback-fix/PLAYBOOK_P1_CONTRACT.md). Pure model: sanitized reading, permissions, ranking and the reducer.
 * The exported names of Stage A are frozen; later exports and action members were added by the model agent (P1-M).
 * No AI and no computed dates: every date written here is a copy of `s.today`.
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
/** Size limits: actions that would go beyond them are refused, and damaged saves are cut to them when read. */
export const MAX_QUESTIONS = 500
export const MAX_ANSWERS = 2000

export type PlaybookAction =
  | { kind: "addQuestion"; id: string; text: string; category: string; roleIds: string[] | "all"; policyIds?: string[] }
  | { kind: "addAnswer"; id: string; questionId: string; answerKind: "club" | "experience"; text: string }
  | { kind: "editAnswer"; answerId: string; text: string }
  | { kind: "hideAnswer"; answerId: string; hidden: boolean }
  | { kind: "vote"; answerId: string; vote: 1 | -1 | 0 }
  | { kind: "markRead"; questionId: string }
  | { kind: "mergeQuestion"; fromId: string; intoId: string }
  /** Fields left out keep their current values. */
  | { kind: "editQuestion"; questionId: string; text?: string; category?: string; roleIds?: string[] | "all" }
  | { kind: "hideQuestion"; questionId: string; hidden: boolean }
  | { kind: "importStarter" }

/**
 * A hidden question. `PlaybookQuestion` in types.ts has no field for it yet, so the model stores an optional `hidden: true`
 * on the question and reads it only through `isQuestionHidden` (reported to the main agent as a needed type addition).
 */
type StoredQuestion = PlaybookQuestion
export const isQuestionHidden = (q: PlaybookQuestion) => q.hidden === true

const UNIVERSAL = new Set<string>(PLAYBOOK_CATEGORIES.map(c => c.id))
const FALLBACK_CATEGORY: PlaybookCategory = "timeline"
const ORIGINS = new Set<string>(["seed", "handoff", "club", "asked", "records", "community"])
const ANSWER_KINDS = new Set<string>(["rule", "club", "experience"])
const STATUSES = new Set<string>(["active", "stale", "hidden"])
const SHARES = new Set<string>(["none", "pending", "shared"])
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ID = /^[A-Za-z0-9:_.-]{1,120}$/
/** A reference to a role, policy, checklist item or person: any short single-line string. */
const REF = /^\S{1,120}$/
const MAX_REFS = 20

export const emptyPlaybook = (): Playbook => ({ questions: [], answers: [] })
const EMPTY: Playbook = emptyPlaybook()

const str = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : ""
const oneLine = (v: unknown, max: number) => typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""
const date = (v: unknown) => typeof v === "string" && DATE.test(v) ? v : ""
const idList = (v: unknown, keep: (id: string) => boolean = () => true, max = MAX_REFS): string[] => {
  const out: string[] = []
  if (Array.isArray(v)) for (const x of v) if (out.length < max && typeof x === "string" && REF.test(x) && keep(x) && !out.includes(x)) out.push(x)
  return out
}
const sameList = (a: unknown, b: string[]) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
/** Returns `orig` itself when `next` has the same top-level values, so clean data keeps its references. */
function keepIfSame<T extends object>(orig: unknown, next: T): T {
  if (!orig || typeof orig !== "object") return next
  const o = orig as Record<string, unknown>, n = next as Record<string, unknown>
  const keys = Object.keys(n)
  if (keys.length !== Object.keys(o).length) return next
  for (const k of keys) {
    const a = o[k], b = n[k]
    if (a === b) continue
    if (Array.isArray(b) && sameList(a, b as string[])) continue
    if (k === "votes" && a && typeof a === "object" && sameList((a as PlaybookAnswer["votes"]).up, (b as PlaybookAnswer["votes"]).up) && sameList((a as PlaybookAnswer["votes"]).down, (b as PlaybookAnswer["votes"]).down)) continue
    return next
  }
  return orig as T
}

/** Breaks `mergedInto` loops: in each loop the question that comes first in the list stops pointing anywhere. */
function breakMergeCycles(questions: StoredQuestion[]): StoredQuestion[] {
  const index = new Map(questions.map((q, i) => [q.id, i]))
  const clear = new Set<number>()
  const state = new Array<0 | 1 | 2>(questions.length).fill(0)
  for (let start = 0; start < questions.length; start++) {
    const path: number[] = []
    let i: number | undefined = start
    while (i !== undefined && state[i] === 0) { state[i] = 1; path.push(i); const to: string | undefined = questions[i].mergedInto; i = to ? index.get(to) : undefined }
    if (i !== undefined && state[i] === 1) clear.add(Math.min(...path.slice(path.indexOf(i))))
    for (const j of path) state[j] = 2
  }
  if (!clear.size) return questions
  return questions.map((q, i) => { if (!clear.has(i)) return q; const { mergedInto: _drop, ...rest } = q; return rest })
}

/** The sanitized Playbook (contract item 1). Never throws; keeps the original objects where nothing needed fixing. */
function sanitize(raw: Playbook, people: Person[]): Playbook {
  const known = new Set(people.map(p => p?.id))
  const r = raw as Partial<Record<keyof Playbook, unknown>>

  const categories: { id: string; label: string }[] = []
  if (Array.isArray(r.categories)) for (const c of r.categories as unknown[]) {
    const x = c as { id?: unknown; label?: unknown } | null
    const id = typeof x?.id === "string" && ID.test(x.id) ? x.id : "", label = oneLine(x?.label, 40)
    if (id && label && !UNIVERSAL.has(id) && !categories.some(y => y.id === id) && categories.length < MAX_REFS) categories.push(keepIfSame(c, { id, label }))
  }
  const categoryOk = (id: string) => UNIVERSAL.has(id) || categories.some(c => c.id === id)

  let questions: StoredQuestion[] = []
  const seenQ = new Set<string>(), seenA = new Set<string>()
  const rawQuestions = Array.isArray(r.questions) ? r.questions as unknown[] : []
  for (const v of rawQuestions) {
    const q = v as Partial<Record<keyof StoredQuestion, unknown>> | null
    if (!q || typeof q !== "object" || typeof q.id !== "string" || !ID.test(q.id) || seenQ.has(q.id)) continue
    const text = oneLine(q.text, MAX_QUESTION_TEXT)
    if (!text) continue
    const category = typeof q.category === "string" && categoryOk(q.category) ? q.category : FALLBACK_CATEGORY
    const next: StoredQuestion = {
      id: q.id, text, category, roleIds: q.roleIds === "all" ? "all" : idList(q.roleIds), policyIds: idList(q.policyIds), checklistItemIds: idList(q.checklistItemIds),
      origin: typeof q.origin === "string" && ORIGINS.has(q.origin) ? q.origin as PlaybookQuestion["origin"] : "club",
      ...(typeof q.mergedInto === "string" && q.mergedInto !== q.id ? { mergedInto: q.mergedInto } : {}),
      createdOn: date(q.createdOn), createdBy: typeof q.createdBy === "string" ? q.createdBy : null,
      ...(q.hidden === true ? { hidden: true as const } : {}),
    }
    questions.push(keepIfSame(v, next))
    seenQ.add(q.id)
    if (questions.length >= MAX_QUESTIONS) break
  }
  const qids = new Set(questions.map(q => q.id))
  questions = breakMergeCycles(questions.map(q => q.mergedInto && !qids.has(q.mergedInto) ? (({ mergedInto: _drop, ...rest }) => rest)(q) : q))
  const byId = new Map(questions.map(q => [q.id, q]))
  const live = (id: string) => { let q = byId.get(id); for (let hops = 0; q?.mergedInto && hops <= questions.length; hops++) q = byId.get(q.mergedInto); return q }

  const answers: PlaybookAnswer[] = []
  const rawAnswers = Array.isArray(r.answers) ? r.answers as unknown[] : []
  for (const v of rawAnswers) {
    const a = v as Partial<Record<keyof PlaybookAnswer, unknown>> | null
    if (!a || typeof a !== "object" || typeof a.id !== "string" || !ID.test(a.id) || seenA.has(a.id)) continue
    const text = str(a.text, MAX_ANSWER_TEXT), target = typeof a.questionId === "string" ? live(a.questionId) : undefined
    if (!text || !target || typeof a.kind !== "string" || !ANSWER_KINDS.has(a.kind)) continue
    const votes = (a.votes && typeof a.votes === "object" ? a.votes : {}) as { up?: unknown; down?: unknown }
    const up0 = idList(votes.up, id => known.has(id), known.size), down0 = idList(votes.down, id => known.has(id), known.size)
    // Someone listed as both liking and disliking: the vote is unclear, so neither counts.
    const up = up0.filter(id => !down0.includes(id)), down = down0.filter(id => !up0.includes(id))
    const next: PlaybookAnswer = {
      id: a.id, questionId: target.id, kind: a.kind as PlaybookAnswer["kind"], text, authorId: typeof a.authorId === "string" ? a.authorId : null,
      ...(typeof a.policyId === "string" && ID.test(a.policyId) ? { policyId: a.policyId } : {}),
      on: date(a.on), ...(date(a.verifiedOn) ? { verifiedOn: a.verifiedOn as string } : {}),
      status: typeof a.status === "string" && STATUSES.has(a.status) ? a.status as PlaybookAnswer["status"] : "active",
      votes: { up, down }, ...(typeof a.share === "string" && SHARES.has(a.share) ? { share: a.share as PlaybookAnswer["share"] } : {}),
    }
    answers.push(keepIfSame(v, next))
    seenA.add(a.id)
    if (answers.length >= MAX_ANSWERS) break
  }

  let reads: Record<string, string[]> | undefined
  if (r.reads && typeof r.reads === "object" && !Array.isArray(r.reads)) {
    reads = {}
    for (const [who, ids] of Object.entries(r.reads as Record<string, unknown>)) if (known.has(who)) { const list = Array.isArray(ids) ? ids.filter((x, i, all): x is string => typeof x === "string" && qids.has(x) && all.indexOf(x) === i) : []; if (list.length) reads[who] = sameList(ids, list) ? ids as string[] : list }
  }
  let asked: PlaybookAsked[] | undefined
  if (Array.isArray(r.asked)) {
    asked = []
    for (const v of r.asked as unknown[]) {
      const x = v as Partial<Record<keyof PlaybookAsked, unknown>> | null
      const questionText = oneLine(x?.questionText, MAX_QUESTION_TEXT)
      if (!x || typeof x.id !== "string" || !ID.test(x.id) || !questionText || typeof x.askedBy !== "string" || !known.has(x.askedBy) || asked.some(y => y.id === x.id)) continue
      asked.push(keepIfSame<PlaybookAsked>(v, { id: x.id, questionText, askedBy: x.askedBy, askedOn: date(x.askedOn), status: x.status === "answered" ? "answered" : "open", ...(typeof x.questionId === "string" && qids.has(x.questionId) ? { questionId: x.questionId } : {}) }))
      if (asked.length >= MAX_QUESTIONS) break
    }
  }

  const next: Playbook = { questions, answers, ...(Array.isArray(r.categories) ? { categories } : {}), ...(asked ? { asked } : {}), ...(reads ? { reads } : {}) }
  const sameItems = (a: unknown, b: unknown[]) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i])
  const clean = Object.keys(raw).length === Object.keys(next).length && sameItems(r.questions, questions) && sameItems(r.answers, answers)
    && (!r.categories || sameItems(r.categories, categories)) && (!r.asked || sameItems(r.asked, asked ?? []))
    && (!r.reads || (Object.keys(r.reads as object).length === Object.keys(reads ?? {}).length && Object.entries(reads ?? {}).every(([k, v]) => (r.reads as Record<string, unknown>)[k] === v)))
  return clean ? raw : next
}

const memo = new WeakMap<object, { people: Person[]; view: Playbook }>()
/** The club's Playbook, sanitized (never throws on damaged saves). Memoized by reference: cheap to call on every render. */
export function playbookOf(s: DemoState): Playbook {
  const raw = s.playbook as unknown
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY
  const people = Array.isArray(s.people) ? s.people : []
  const hit = memo.get(raw)
  if (hit && hit.people === people) return hit.view
  let view: Playbook
  try { view = sanitize(raw as Playbook, people) } catch { view = EMPTY }
  memo.set(raw, { people, view })
  return view
}

/** Follows mergedInto links to the question that is shown. */
export function liveQuestion(p: Playbook, id: string): PlaybookQuestion | undefined {
  let q = p.questions.find(x => x.id === id)
  for (let hops = 0; q?.mergedInto && hops <= p.questions.length; hops++) q = p.questions.find(x => x.id === q!.mergedInto)
  return q
}

/**
 * Questions for a role (or all roles), optionally one category; merged and hidden questions are left out
 * (`includeHidden` keeps hidden ones, for the president or VP to unhide). Newest last.
 */
export function questionsFor(s: DemoState, opts: { roleId?: string | null; category?: string | null; includeHidden?: boolean } = {}): PlaybookQuestion[] {
  return playbookOf(s).questions.filter(q => !q.mergedInto
    && (opts.includeHidden || !isQuestionHidden(q))
    && (!opts.category || q.category === opts.category)
    && (!opts.roleId || q.roleIds === "all" || q.roleIds.includes(opts.roleId)))
}

/** Likes minus dislikes. */
export const netVotes = (a: PlaybookAnswer) => a.votes.up.length - a.votes.down.length
const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
/** Answer order within one kind: highest net votes, then most recent `verifiedOn ?? on`, then id. */
export const compareAnswers = (a: PlaybookAnswer, b: PlaybookAnswer) => netVotes(b) - netVotes(a) || cmp(b.verifiedOn ?? b.on, a.verifiedOn ?? a.on) || cmp(a.id, b.id)

/** Primary answer per kind plus collapsed alternates (rule, then club, then experience, each in ranking order). Hidden answers never show. */
export function answerSet(s: DemoState, questionId: string): { rule?: PlaybookAnswer; club?: PlaybookAnswer; experience?: PlaybookAnswer; alternates: PlaybookAnswer[] } {
  const p = playbookOf(s), id = liveQuestion(p, questionId)?.id ?? questionId
  const all = p.answers.filter(a => a.questionId === id && a.status !== "hidden")
  const pick = (kind: PlaybookAnswer["kind"]) => all.filter(a => a.kind === kind).sort(compareAnswers)
  const rule = pick("rule"), club = pick("club"), experience = pick("experience")
  return { rule: rule[0], club: club[0], experience: experience[0], alternates: [...rule.slice(1), ...club.slice(1), ...experience.slice(1)] }
}

/** Hidden answers of a question (ranking order), for the president or VP to unhide; empty for everyone else. */
export function hiddenAnswers(s: DemoState, questionId: string): PlaybookAnswer[] {
  if (!playbookRights(s).lead) return []
  const p = playbookOf(s), id = liveQuestion(p, questionId)?.id ?? questionId
  return p.answers.filter(a => a.questionId === id && a.status === "hidden").sort(compareAnswers)
}

export const isRead = (s: DemoState, viewerId: string, questionId: string) => {
  const reads = playbookOf(s).reads?.[viewerId]
  return !!reads && (reads.includes(questionId) || reads.includes(liveQuestion(playbookOf(s), questionId)?.id ?? questionId))
}

const nextId = (prefix: string, taken: string[]) => { let n = taken.length + 1; while (taken.includes(`${prefix}${n}`)) n++; return `${prefix}${n}` }
export const newPlaybookId = (s: DemoState, prefix: "pq-" | "pa-") => nextId(prefix, prefix === "pq-" ? playbookOf(s).questions.map(q => q.id) : playbookOf(s).answers.map(a => a.id))

/** What the viewer may do in the Playbook (contract item 2). The interface uses it to show or hide controls; the reducer enforces it. */
export interface PlaybookRights {
  /** Current officer, incoming officer: mark questions read. */
  markRead: boolean
  /** Current officer, incoming officer. */
  vote: boolean
  /** Current officer: add questions and experience answers. */
  write: boolean
  /** President or VP: club answers, hide/unhide, merge, edit any question or answer, import the starter. */
  lead: boolean
}
export function playbookRights(s: DemoState): PlaybookRights {
  const me = s.people.find(x => x.id === s.viewerId)
  const officer = !!me && isOfficer(me), incoming = !!me && !me.leftOn && !!me.incomingFor
  return { markRead: officer || incoming, vote: officer || incoming, write: officer, lead: officer && canLead(s) }
}
/** May the viewer edit this answer? Rule answers: nobody. Club answers: the president or VP. Experience: its author or the president or VP. */
export function canEditAnswer(s: DemoState, a: PlaybookAnswer): boolean {
  const r = playbookRights(s)
  return a.kind === "club" ? r.lead : a.kind === "experience" ? r.lead || (r.write && a.authorId === s.viewerId) : false
}
/** May the viewer edit this question? Its creator (a current officer) or the president or VP. */
export const canEditQuestion = (s: DemoState, q: PlaybookQuestion): boolean => { const r = playbookRights(s); return r.lead || (r.write && !!q.createdBy && q.createdBy === s.viewerId) }

const validId = (v: unknown): v is string => typeof v === "string" && ID.test(v)
const categoryOf = (p: Playbook, v: unknown) => typeof v === "string" && (UNIVERSAL.has(v) || !!p.categories?.some(c => c.id === v)) ? v : null
const rolesOf = (s: DemoState, v: unknown): string[] | "all" | null => {
  if (v === "all") return "all"
  const ids = idList(v, id => s.roles.some(r => r.id === id))
  return ids.length ? ids : null
}

/** The Playbook reducer. Returns the same state when the action is not allowed or changes nothing. */
export function changePlaybook(s: DemoState, a: PlaybookAction): DemoState {
  if (!a || typeof a !== "object") return s
  const p = playbookOf(s), r = playbookRights(s), me = s.viewerId
  const put = (next: Playbook): DemoState => ({ ...s, playbook: next })
  const putAnswer = (ans: PlaybookAnswer, patch: Partial<PlaybookAnswer>) => put({ ...p, answers: p.answers.map(x => x === ans ? { ...x, ...patch } : x) })
  const putQuestion = (q: PlaybookQuestion, next: StoredQuestion) => put({ ...p, questions: p.questions.map(x => x === q ? next : x) })
  const answer = (id: unknown) => typeof id === "string" ? p.answers.find(x => x.id === id) : undefined
  const question = (id: unknown) => typeof id === "string" ? p.questions.find(x => x.id === id) : undefined
  const open = (q: PlaybookQuestion | undefined) => !!q && !q.mergedInto && (!isQuestionHidden(q) || r.lead)
  switch (a.kind) {
    case "markRead": {
      const q = question(a.questionId), target = q && liveQuestion(p, q.id)
      if (!r.markRead || !target || !open(target) || p.reads?.[me]?.includes(target.id)) return s
      return put({ ...p, reads: { ...p.reads, [me]: [...(p.reads?.[me] ?? []), target.id] } })
    }
    case "vote": {
      const ans = answer(a.answerId)
      if (!r.vote || !ans || ans.status === "hidden" || (a.vote !== 1 && a.vote !== -1 && a.vote !== 0)) return s
      const was = ans.votes.up.includes(me) ? 1 : ans.votes.down.includes(me) ? -1 : 0
      if (was === a.vote) return s
      const up = ans.votes.up.filter(id => id !== me), down = ans.votes.down.filter(id => id !== me)
      return putAnswer(ans, { votes: { up: a.vote === 1 ? [...up, me] : up, down: a.vote === -1 ? [...down, me] : down } })
    }
    case "addQuestion": {
      const text = oneLine(a.text, MAX_QUESTION_TEXT), category = categoryOf(p, a.category), roleIds = rolesOf(s, a.roleIds)
      if (!r.write || !text || !category || !roleIds || !validId(a.id) || question(a.id) || p.questions.length >= MAX_QUESTIONS) return s
      const q: PlaybookQuestion = { id: a.id, text, category, roleIds, policyIds: idList(a.policyIds), checklistItemIds: [], origin: "club", createdOn: s.today, createdBy: me }
      return put({ ...p, questions: [...p.questions, q] })
    }
    case "editQuestion": {
      const q = question(a.questionId)
      if (!q) return s
      const text = a.text === undefined ? q.text : oneLine(a.text, MAX_QUESTION_TEXT)
      const category = a.category === undefined ? q.category : categoryOf(p, a.category), roleIds = a.roleIds === undefined ? q.roleIds : rolesOf(s, a.roleIds)
      if (q.mergedInto || !text || !category || !roleIds || !canEditQuestion(s, q)) return s
      const next = keepIfSame(q, { ...q, text, category, roleIds })
      return next === q ? s : putQuestion(q, next)
    }
    case "hideQuestion": {
      const q = question(a.questionId)
      if (!r.lead || !q || q.mergedInto || typeof a.hidden !== "boolean" || isQuestionHidden(q) === a.hidden) return s
      const { hidden: _was, ...rest } = q as StoredQuestion
      return putQuestion(q, a.hidden ? { ...rest, hidden: true } : rest)
    }
    case "addAnswer": {
      const text = str(a.text, MAX_ANSWER_TEXT), target = question(a.questionId) && liveQuestion(p, a.questionId)
      if (!r.write || !text || (a.answerKind !== "club" && a.answerKind !== "experience") || (a.answerKind === "club" && !r.lead)) return s
      if (!target || !open(target) || !validId(a.id) || answer(a.id) || p.answers.length >= MAX_ANSWERS) return s
      const ans: PlaybookAnswer = { id: a.id, questionId: target.id, kind: a.answerKind, text, authorId: me, on: s.today, status: "active", votes: { up: [], down: [] } }
      return put({ ...p, answers: [...p.answers, ans] })
    }
    case "editAnswer": {
      const ans = answer(a.answerId), text = str(a.text, MAX_ANSWER_TEXT)
      if (!ans || !text || text === ans.text || !canEditAnswer(s, ans)) return s
      return putAnswer(ans, { text, on: s.today })
    }
    case "hideAnswer": {
      const ans = answer(a.answerId)
      if (!ans || ans.kind === "rule" || !r.lead || typeof a.hidden !== "boolean") return s
      const status = a.hidden ? "hidden" : "active"
      return ans.status === status || (!a.hidden && ans.status !== "hidden") ? s : putAnswer(ans, { status })
    }
    case "mergeQuestion": {
      const from = question(a.fromId), into = question(a.intoId) && liveQuestion(p, a.intoId)
      if (!r.lead || !from || !into || from.id === into.id || from.mergedInto || isQuestionHidden(into)) return s
      return put({ ...p, questions: p.questions.map(q => q === from ? { ...q, mergedInto: into.id } : q), answers: p.answers.map(x => x.questionId === from.id ? { ...x, questionId: into.id } : x) })
    }
    case "importStarter": {
      if (!r.lead) return s
      const add = starterPlaybook(s, p)
      if (!add.questions.length && !add.answers.length) return s
      if (p.questions.length + add.questions.length > MAX_QUESTIONS || p.answers.length + add.answers.length > MAX_ANSWERS) return s
      return put({ ...p, questions: [...p.questions, ...add.questions], answers: [...p.answers, ...add.answers] })
    }
  }
  // Anything else (an unknown kind from an old or damaged caller) changes nothing.
  return s
}
