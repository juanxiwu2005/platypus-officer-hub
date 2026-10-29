import type { ChangeSet, DemoState, Node } from "../data/types"
import { callApi } from "./api"
import { commandContext, eventFields, GATHERING, humanEventDate, isSmallOp, namesEvent, parseCommand, parseTaskIntent, TASK_WORD, type CommandOp } from "./commands"
import { groundedAnswer, RULE_REFUSAL, type RuleAnswer } from "./ruleAnswers"
import { aiSnapshot, knownDates } from "./aiContext"
import { sanitizeCards, type PlanPrefill, type TaskScope, type WireCard } from "./chatCards"
import { defaultTaskDue } from "../engine/taskDates"
import { checkReview, localReview, reviewPayload, type EventReview, type ReviewRisk } from "./eventReview"
import { forecastFor, forecastQueue } from "../engine/forecast"
import { computeSchedule } from "../engine/schedule"
import { workload } from "../engine/team"
import { eventStrip } from "./today"
import { visibleContacts } from "../data/crm"
import { checkPreflight, EMPTY_PACKAGE } from "./preflight"
import { WEEK_ONE } from "./handbook"
import { daysBetween } from "./dates"
import { RULES } from "../data/rules"

/** What the Ask panel shows. Cards are the "foundation" of the AI interaction (v1.1 plan, decision 1). */
export type ChatCard =
  | { kind: "text"; text: string }
  // `thinking`: the assistant is still reading the message; `ai`: what it filled in (only empty, untouched fields take it).
  | { kind: "form"; id: string; prefill: Partial<PlanPrefill>; date: string; done?: boolean; thinking?: boolean; ai?: Partial<PlanPrefill> }
  /** The new-task form (M2b). owners are person or role IDs; one task is made per person. */
  | { kind: "taskform"; id: string; title: string; owners: string[]; eventId: string | null; due: string; done?: boolean; changeSetId?: string; thinking?: boolean; ai?: { title: string; owners: string[]; eventId: string | null } }
  /** Move an event to a date the person typed. The rule engine recomputes every step after it. */
  | { kind: "eventdate"; eventId: string; date: string; done?: boolean }
  | { kind: "tasks"; title: string; nodeIds: string[]; remind?: boolean }
  | { kind: "changes"; changeSetId: string }
  | { kind: "applied"; changeSetId: string }
  | { kind: "nudge"; nodeId: string }
  | { kind: "rule"; question: string; answer: string; citations: string[]; inScope: boolean; label: string }
  /** The event review (M2b): risks for one new event; its suggested steps follow as a changes card. */
  | { kind: "review"; eventId: string; risks: ReviewRisk[]; label: string }
export interface ChatMsg { id: string; role: "user" | "assistant"; text?: string; cards?: ChatCard[]; source?: string }
export interface Focus { kind: "node" | "event" | "page"; id: string; title: string }
/**
 * `refine`: the assistant's reading of the same message, still on its way. The panel shows the reply at once and
 * lets the assistant fill in the form when it answers (ASU AIR can take tens of seconds; Juanxi wants speed).
 */
export interface Reply { cards: ChatCard[]; source: string; changeSet?: ChangeSet; autoSet?: ChangeSet; refine?: Promise<Reply | null> }

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const canLeadAs = (s: DemoState, id: string) => {
  const p = s.people.find(x => x.id === id), r = s.roles.find(x => x.id === p?.roleId)
  return r?.holderId === id && (r.fn === "president" || r.fn === "vice_president")
}

/**
 * A NEW gathering: a planning verb followed closely (at most three words) by a gathering word. Task words and
 * existing event names are checked separately (createIntent), so "Set up a task for the workshop" is a task and
 * "Plan the budget for Spring Speaker Night" is about an event that already exists.
 */
export const PLAN_RE = /\b(?:plan|organi[sz]e|host|throw|set up|put on|create|schedule|hold|run|arrange)\s+(?:(?:a|an|our|the|another|new|next|big|small|first)\s+)*(?:[\w'&-]+\s+){0,3}?(?:events?|night|dinner|workshop|mixer|panel|talk|social|meetup|meeting|party|fundraiser|lunch|breakfast|showcase|hackathon|session|conference|competition|trip|tour|visit|gala|banquet|festival|fair|tournament)\b|^plan (a |an )?(new )?event|策划|办.*活动/i
const BARE_EVENT = /^(?:plan|create|organi[sz]e|host|start)\s+(?:a\s+|an\s+)?(?:new\s+)?event[.!]?$/i
const BARE_TASK = /^(?:add|create|make|new|start)\s+(?:a\s+)?(?:new\s+)?task[.!]?$/i

/** Is the person making something new, and which kind? Task words win (strategy §3, step 1). */
export function createIntent(t: string, s: DemoState): "task" | "event" | null {
  if (parseTaskIntent(t, commandContext(s))) return "task"
  if (TASK_WORD.test(t) || namesEvent(t.toLowerCase(), commandContext(s))) return null
  // Repeating things and meeting one person are not one-time events; the assistant asks or makes a task.
  if (/\b(?:weekly|biweekly|monthly|every (?:week|month|day)|recurring)\b|每周|每月/i.test(t) || /\bmeet(?:ing)? with (?:our |the |my )?(?:advisor|adviser|sponsor|dean|professor|partner)\b/i.test(t)) return null
  return PLAN_RE.test(t) ? "event" : null
}
const TOP_RE = /\btop\s*\d*\s*(tasks?|things|priorit)|\bmost important\b|\bfocus on\b|\bpriorit|what should i (do|work)|my tasks|最需要|专注|优先/i
const NUDGE_RE = /\bneeds? a nudge\b|\bwho (needs|should).*(nudge|remind|push)|\bat risk\b|\bbehind\b|风险|催/i
const STUCK_RE = /\bstuck\b|\bblocked\b|\bneed(s)? help\b|卡住/i
const NEXT_RE = /\bup next\b|\bnext steps?\b|\bwhat'?s next\b|下一步/i
const OVERLOAD_RE = /\boverload|\bworkload\b|\btoo much\b|\bbusiest\b|工作量/i
const PARTNER_RE = /\bpartners?\b.*\b(touch|contact|reach)|\bneeds? a touch\b|\bwho should (we|i) (contact|call|email)\b|联系/i
const REMIND_RE = /^(remind|nudge|ping|chase)\b/i
const MISSING_RE = /\bwhat'?s missing\b|\bready to submit\b|\bmissing in (this|the) (request|application)\b/i
const WEEKONE_RE = /\bweek one\b|\bfirst week\b|\bnew officer\b|新干部|交接/i
const DATES_RE = /\bhow (are|do) (deadlines|dates).*(calculat|work|set)|\bwhy (this|that) date\b/i
const STEP_RE = /\babout this step\b|\bexplain this (step|task)\b|\bwhat should happen next\b/i
const EVENT_DATE_RE = /\b(?:change|move|reschedule|push|shift|set|update)\b.*\b(?:date|event|it|to)\b|改.*(?:日期|时间)|推迟|延期到/i
export const RULE_Q_RE = /\?\s*$|^(can|may|do|does|is|are|what|when|how|which|should|must)\b/i

const SYNONYMS: [RegExp, string[]][] = [
  [/outside cater|caterer|catering|food exception/i, ["R06"]], [/aramark|sun devil dining|memorial union/i, ["R05"]],
  [/homemade|home-made|bake|potluck/i, ["R08"]], [/permit|cook on site|prepared on site|grill/i, ["R07"]],
  [/raffle|drawing|lottery/i, ["R15"]], [/advisor|university rep/i, ["R02"]], [/final exam|finals/i, ["R13"]],
  [/contract|sign/i, ["R14"]], [/speaker|performer|sap\b/i, ["R10"]], [/register|registry|ritm/i, ["R01", "R04"]],
  [/room|space|mazevo|book/i, ["R03"]], [/reimburs|amazon|invoice|purchase/i, ["R11"]], [/meal|\$25|per person/i, ["R12"]],
  [/usg.*(food|service)|(food|service).*usg/i, ["R09"]], [/transition|new officers?|re-?register|handbook/i, ["R16"]],
]
/** Deterministic rule lookup for when AI is off or unavailable. It only selects rule IDs. */
export function keywordRules(q: string): string[] {
  const hits = SYNONYMS.filter(([re]) => re.test(q)).flatMap(([, ids]) => ids)
  return [...new Set(hits)].slice(0, 3)
}

/** The event form from the person's own words, without AI: name, size, food, speaker. Dates only from their text. */
function planDefaults(text: string, s: DemoState): { prefill: Partial<PlanPrefill>; date: string } {
  const m = text.trim().match(/^(?:(?:i want to|i'd like to|we want to|let's|lets|please)\s+)?(?:plan|organi[sz]e|host|throw|set up|put on|create|schedule|hold|run|arrange)\s+(?:(?:a|an|our|the|new)\s+)*(?:event\s*[:：]?\s*)?(.+?)(?:\s+(?:on|for|with|at|in|next|this|by)\s+|[,.;]|$)/i)
  const raw = m?.[1]?.trim() ?? ""
  const generic = !raw || /^(?:a |an )?(?:new )?event$/i.test(raw) || raw.length > 60 || !GATHERING.test(raw)
  // "…an event, name Jared Byrne Fireside Chat, December 12…", "called X", "titled X", or a quoted name.
  const said = text.match(/\b(?:name(?:d)?|called|titled|title)\s*(?:is\s*)?[:：]?\s*["“]?([^,;."”\n]{3,80}?)["”]?\s*(?:[,;.\n]|\s+on\s+|$)/i)?.[1] ?? text.match(/["“]([^"”]{3,80})["”]/)?.[1]
  const name = said?.trim() || (generic ? "" : raw[0].toUpperCase() + raw.slice(1))
  // A start time is not a date the engine uses; it goes into Details so it is not lost.
  const time = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))/i)?.[1]
  return { prefill: { ...eventFields(text), name, ...(time ? { details: `Starts at ${time.toUpperCase().replace(/\s+/, " ")}.` } : {}) }, date: humanEventDate(text, s.today) }
}

/** The task form from the person's own words, without AI. */
function taskDefaults(text: string, s: DemoState, focus: Focus | null): Extract<ChatCard, { kind: "taskform" }> {
  const t = parseTaskIntent(text, commandContext(s))
  // A "step" with no event named belongs to the event the person is looking at.
  const focusEvent = focus?.kind === "event" && /\bstep\b|this event/i.test(text) ? focus.id : null
  return { kind: "taskform", id: uid(), title: t?.title ?? "", owners: [...(t?.ownerIds ?? []), ...(t?.roleIds ?? [])], eventId: t?.eventId ?? focusEvent, due: humanEventDate(text, s.today) || defaultTaskDue(s) }
}

function rankMine(s: DemoState, personId: string, limit: number): Node[] {
  const forecast = forecastFor(s)
  const mine = s.nodes.filter(n => n.ownerId === personId && n.status !== "done")
  const score = (n: Node) => [(n.clubDeadline ?? "9999") < s.today ? 0 : 1, forecast.nodes[n.id]?.probability ?? 1, n.latestStart ?? "9999"] as const
  return mine.sort((a, b) => {
    const x = score(a), y = score(b)
    return x[0] - y[0] || x[1] - y[1] || String(x[2]).localeCompare(String(y[2]))
  }).slice(0, limit)
}

export function taskList(s: DemoState, viewerId: string, scope: TaskScope, limit: number, focusEventId?: string): { title: string; nodes: Node[]; remind?: boolean } {
  const forecast = forecastFor(s)
  if (scope === "risk") {
    const pool = focusEventId ? s.nodes.filter(n => n.eventId === focusEventId && n.status !== "done" && (forecast.nodes[n.id]?.probability ?? 1) < .8).sort((a, b) => forecast.nodes[a.id].probability - forecast.nodes[b.id].probability).slice(0, limit) : forecastQueue(s, forecast)
    return { title: focusEventId ? "At risk in this event" : "Needs a nudge", nodes: pool, remind: true }
  }
  if (scope === "stuck") return { title: "Stuck or waiting", nodes: s.nodes.filter(n => n.status === "blocked" || n.status === "waiting").slice(0, limit), remind: true }
  if (scope === "team") return { title: "Team priorities", nodes: s.nodes.filter(n => n.status !== "done").sort((a, b) => (forecast.nodes[a.id]?.probability ?? 1) - (forecast.nodes[b.id]?.probability ?? 1) || (a.latestStart ?? "9999").localeCompare(b.latestStart ?? "9999")).slice(0, limit), remind: true }
  const nodes = rankMine(s, viewerId, limit)
  return { title: `Your top ${nodes.length}`, nodes }
}

const textCard = (text: string): ChatCard => ({ kind: "text", text })
const tasksCard = (s: DemoState, viewerId: string, scope: TaskScope, limit: number, focusEventId?: string): ChatCard => {
  const t = taskList(s, viewerId, scope, limit, focusEventId)
  return { kind: "tasks", title: t.title, nodeIds: t.nodes.map(n => n.id), remind: t.remind && canLeadAs(s, viewerId) }
}

async function ruleReply(question: string, s: DemoState): Promise<Reply> {
  let answer: RuleAnswer, label: string
  try {
    if (!s.aiEnabled) throw new Error("AI off")
    const r = await callApi<RuleAnswer>("/ask", { question })
    answer = groundedAnswer({ ...r, confidence: 1 }, r.model, r.provider)
    label = `AI picked the rules · ${r.provider ?? "provider"}`
  } catch {
    const ids = keywordRules(question)
    answer = groundedAnswer({ inScope: ids.length > 0, confidence: 1, citations: ids }, null)
    label = s.aiEnabled ? "Matched by keywords · AI unavailable" : "Matched by keywords · AI off"
  }
  return { cards: [{ kind: "rule", question, answer: answer.answer, citations: answer.citations, inScope: answer.inScope, label }], source: label }
}

function draftSet(sentence: string, ops: CommandOp[], source: string): ChangeSet {
  return { id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, sentence, ops, status: "pending", source }
}

/** Small edits apply at once (with Undo); bigger ones become a change set to review (Juanxi, 2026-10-23). */
function splitChanges(sentence: string, ops: CommandOp[], source: string): { cards: ChatCard[]; changeSet?: ChangeSet; autoSet?: ChangeSet } {
  const small = ops.filter(isSmallOp), big = ops.filter(o => !isSmallOp(o))
  const autoSet = small.length ? draftSet(sentence, small, source) : undefined
  const changeSet = big.length ? { ...draftSet(sentence, big, source), id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 6)}b` } : undefined
  return { cards: [...(autoSet ? [{ kind: "applied", changeSetId: autoSet.id } as ChatCard] : []), ...(changeSet ? [{ kind: "changes", changeSetId: changeSet.id } as ChatCard] : [])], changeSet, autoSet }
}

/** Turn checked wire cards into panel cards (tasks are ranked here, change sets drafted for review). */
function fromWire(cards: WireCard[], text: string, s: DemoState, viewerId: string, source: string, focus: Focus | null): Reply {
  const out: ChatCard[] = []
  let changeSet: ChangeSet | undefined, autoSet: ChangeSet | undefined
  for (const c of cards) {
    if (c.kind === "text") out.push(textCard(c.text))
    if (c.kind === "form" && c.intent === "plan_event") out.push({ kind: "form", id: uid(), prefill: c.prefill, date: humanEventDate(text, s.today) })
    if (c.kind === "form" && c.intent === "add_task") out.push({ kind: "taskform", id: uid(), title: c.prefill.title, owners: c.prefill.owners, eventId: c.prefill.eventId, due: humanEventDate(text, s.today) || defaultTaskDue(s) })
    if (c.kind === "tasks") out.push(tasksCard(s, viewerId, c.scope, c.limit, focus?.kind === "event" ? focus.id : undefined))
    if (c.kind === "nudge") out.push({ kind: "nudge", nodeId: c.nodeId })
    if (c.kind === "rule") { const a = groundedAnswer({ inScope: c.inScope, confidence: 1, citations: c.citations }, null); out.push({ kind: "rule", question: text, answer: a.answer, citations: a.citations, inScope: a.inScope, label: source }) }
    if (c.kind === "changes" && !changeSet && !autoSet) { const r = splitChanges(text, c.ops, source); changeSet = r.changeSet; autoSet = r.autoSet; out.push(...r.cards) }
  }
  return { cards: out, source, changeSet, autoSet }
}

const HELP = "I can rank your top tasks, add a task, plan an event, draft a reminder, or check an ASU rule. Try one of the suggestions below."

/** ASU AIR can take most of a minute; the server stops at 55 s (Netlify allows 60 s), the browser just after. */
export const AI_WAIT_MS = 58_000

/** One /api/chat round. Returns null when the reply had no usable card; throws only when `rethrow` is set. */
async function aiReply(t: string, s: DemoState, viewerId: string, focus: Focus | null, page: string, history: ChatMsg[], rethrow = false): Promise<Reply | null> {
  const snap = aiSnapshot(s)
  try {
    const r = await callApi<{ cards: unknown; source: string; model?: string; provider?: string }>("/chat", {
      message: t, page, focus, context: commandContext(s), data: snap,
      history: history.slice(-6).map(m => ({ role: m.role, text: m.text ?? m.cards?.map(c => c.kind === "text" ? c.text : c.kind).join(" ") ?? "" })),
    }, AI_WAIT_MS)
    const cards = sanitizeCards(r.cards, commandContext(s), knownDates(snap))
    const label = r.source === "ai" ? `AI draft${r.model ? ` · ${r.model}` : ""}` : "Checked command grammar"
    return cards.length ? fromWire(cards, t, s, viewerId, label, focus ?? null) : null
  } catch (e) {
    if (rethrow) throw e
    return null
  }
}

/**
 * Answer one message. Clear requests are answered by the app itself (no AI needed); anything else goes to
 * /api/chat when AI is on. Every AI reply is re-checked by sanitizeCards() before it is shown.
 */
export async function respond(text: string, s: DemoState, viewerId: string, focus: Focus | null, page: string, history: ChatMsg[]): Promise<Reply> {
  const t = text.trim()
  const focusNode = focus?.kind === "node" ? s.nodes.find(n => n.id === focus.id) : undefined
  const focusEvent = focus?.kind === "event" ? s.events.find(e => e.id === focus.id) : focusNode?.eventId ? s.events.find(e => e.id === focusNode.eventId) : undefined
  const limit = Math.max(1, Math.min(10, Number(t.match(/\b(\d{1,2})\b/)?.[1] ?? 5)))

  // Making something new (M2b): the assistant reads the whole message and fills the form; the app's own
  // grammar answers only a bare "new event"/"new task", or when AI is off or unavailable.
  // The form appears at once from the person's own words; the assistant then reads the whole message and fills in
  // what is still empty (or, if it reads the message differently, says so in a new message).
  const intent = createIntent(t, s)
  if (intent) {
    const refine = s.aiEnabled && !BARE_EVENT.test(t) && !BARE_TASK.test(t) ? aiReply(t, s, viewerId, focus, page, history) : undefined
    const source = !s.aiEnabled ? "Local demo grammar · AI off" : refine ? "Platypus · AI is reading your message" : "Platypus"
    if (intent === "task") {
      const card = { ...taskDefaults(t, s, focus), thinking: !!refine }
      return { cards: [textCard(card.title ? "Here's the task. Check who owns it and when it's due." : "What's the task? Fill in the name and who owns it."), card], source, refine }
    }
    const { prefill, date } = planDefaults(t, s)
    return { cards: [textCard("Happy to help. Fill in what's missing and I'll draft the plan from the club playbook."), { kind: "form", id: uid(), prefill, date, thinking: !!refine }], source, refine }
  }
  // "Move the event to Jan 30 2027": a date the person typed, applied by a person, recomputed by the rule engine.
  const moved = EVENT_DATE_RE.test(t) ? humanEventDate(t, s.today) : ""
  if (moved) {
    const named = s.events.find(e => t.toLowerCase().includes(e.name.toLowerCase()))
    const ev = named ?? focusEvent ?? s.events.at(-1)
    if (ev) return { cards: [{ kind: "eventdate", eventId: ev.id, date: moved }], source: "Your date · the rule engine redoes the plan" }
  }
  if (STEP_RE.test(t) && focusNode) {
    const p = computeSchedule(s).nodes[focusNode.id]
    const up = s.nodes.filter(n => focusNode.dependsOn.includes(n.id) && n.status !== "done")
    const lines = [focusNode.why || "This step supports the club plan.", up.length ? `It waits for: ${up.map(n => n.title).join("; ")}.` : "Nothing upstream is blocking it.", p?.issues.find(i => i.severity !== "info")?.text].filter(Boolean)
    return { cards: [textCard(lines.join(" ")), { kind: "tasks", title: "This step", nodeIds: [focusNode.id], remind: canLeadAs(s, viewerId) && focusNode.status !== "done" }], source: "Platypus" }
  }
  if (TOP_RE.test(t)) return { cards: [tasksCard(s, viewerId, /team|club|everyone/i.test(t) ? "team" : "mine", limit)], source: "Ranked by risk, then start date" }
  if (STUCK_RE.test(t)) return { cards: [tasksCard(s, viewerId, "stuck", limit)], source: "Platypus" }
  if (NUDGE_RE.test(t)) return { cards: [tasksCard(s, viewerId, "risk", 3, focusEvent?.id)], source: "Forecast" }
  if (NEXT_RE.test(t) && focusEvent) return { cards: [{ kind: "tasks", title: `Next in ${focusEvent.name}`, nodeIds: eventStrip(s.nodes.filter(n => n.eventId === focusEvent.id)).map(n => n.id), remind: canLeadAs(s, viewerId) }], source: "Platypus" }
  if (OVERLOAD_RE.test(t)) {
    const rows = s.people.map(p => ({ p, w: workload(s, p.id) })).sort((a, b) => b.w.points - a.w.points)
    const heavy = rows.filter(r => r.w.band === "Heavy")
    return { cards: [textCard(heavy.length ? `${heavy.map(r => `${r.p.name.split(" ")[0]} (${r.w.points} points)`).join(", ")} ${heavy.length > 1 ? "are" : "is"} heavy for the next two weeks. Lightest: ${rows.at(-1)!.p.name.split(" ")[0]}.` : `Nobody is heavy for the next two weeks. Busiest: ${rows[0].p.name.split(" ")[0]} (${rows[0].w.points} points).`)], source: "Workload bands" }
  }
  if (PARTNER_RE.test(t)) {
    const due = visibleContacts(s).filter(c => !c.lastContact || daysBetween(c.lastContact, s.today) >= c.cadenceDays)
    return { cards: [textCard(due.length ? `Due for a touch: ${due.map(c => c.name).join(", ")}.` : "Every partner is within their contact interval.")], source: "Partners" }
  }
  if (MISSING_RE.test(t)) {
    const f = s.funding.find(x => x.eventId === focusEvent?.id) ?? s.funding[0]
    if (f) {
      const e = s.events.find(x => x.id === f.eventId)
      const r = checkPreflight({ ...EMPTY_PACKAGE, amount: f.amount, attendees: e?.headcount ?? 0, ...f.application })
      return { cards: [textCard(r.ready ? `${e?.name}: the checklist is complete. The office still reviews it.` : `${e?.name} still needs: ${r.issues.map(i => `${i.text} [${i.ruleId}]`).join(" ")}`)], source: "Pre-submission check" }
    }
  }
  if (WEEKONE_RE.test(t)) return { cards: [textCard(WEEK_ONE.map((w, i) => `${i + 1}. ${w.text}`).join("\n"))], source: "SEO onboarding + R16" }
  if (DATES_RE.test(t)) return { cards: [textCard(`Dates come only from the rule engine: the ASU rule, a ${s.org.settings.clubBufferBusinessDays}-day club buffer, each officer's buffer and busy weeks, and ASU holidays. Open any step to see why it has its date.`)], source: "Rule engine" }
  if (REMIND_RE.test(t)) {
    const lower = t.toLowerCase()
    const person = s.people.find(p => lower.includes(p.name.split(" ")[0].toLowerCase()))
    const words = lower.replace(REMIND_RE, "").split(/\W+/).filter(w => w.length > 3 && !["about", "their", "please"].includes(w))
    const candidates = s.nodes.filter(n => n.status !== "done" && n.ownerId && (!person || n.ownerId === person.id)).map(n => ({ n, score: words.filter(w => n.title.toLowerCase().includes(w)).length })).sort((a, b) => b.score - a.score)
    const pick = candidates[0]?.score ? candidates[0].n : focusNode && focusNode.status !== "done" ? focusNode : undefined
    if (pick) return { cards: [{ kind: "nudge", nodeId: pick.id }], source: "Platypus" }
  }
  const ops = parseCommand(t, commandContext(s))
  if (ops.length && ops.every(o => o.op === "answer_question") || (!ops.length && RULE_Q_RE.test(t) && keywordRules(t).length)) return ruleReply(t, s)
  if (ops.length && !ops.some(o => o.op === "answer_question")) {
    const source = s.aiEnabled ? "Checked command grammar" : "Local demo grammar · AI off"
    return { ...splitChanges(t, ops, source), source }
  }
  if (s.aiEnabled) {
    try {
      const ai = await aiReply(t, s, viewerId, focus, page, history, true)
      if (ai?.cards.length) return ai
    } catch {
      if (RULE_Q_RE.test(t)) return ruleReply(t, s)
      return { cards: [textCard(`The AI service is unavailable right now. ${HELP}`)], source: "Local fallback · server unavailable" }
    }
  }
  if (RULE_Q_RE.test(t)) return { cards: [{ kind: "rule", question: t, answer: RULE_REFUSAL, citations: [], inScope: false, label: "Matched by keywords · AI off" }], source: "Rule book" }
  return { cards: [textCard(s.aiEnabled ? `I couldn't safely match that. ${HELP}` : `AI is off, so I can only handle set requests. ${HELP}`)], source: "Platypus" }
}

/**
 * Review a newly approved event (M2b): the assistant reads the playbook's steps plus everything the organizer
 * wrote and suggests risks and extra steps. Without AI, the rule engine's own warnings are shown instead.
 */
export async function reviewEvent(s: DemoState, eventId: string): Promise<Reply> {
  const p = reviewPayload(s, eventId)
  if (!p) return { cards: [textCard("That event is no longer in the plan.")], source: "Platypus" }
  let review: EventReview, label: string
  if (s.aiEnabled) {
    try {
      const r = await callApi<{ risks: unknown; tasks: unknown; model?: string }>("/event/review", { eventId, data: p, context: commandContext(s) }, AI_WAIT_MS)
      review = checkReview(r, s, eventId)
      label = `AI review${r.model ? ` · ${r.model}` : ""}`
    } catch { review = localReview(s, eventId); label = "Rule engine check · AI unavailable" }
  } else { review = localReview(s, eventId); label = "Rule engine check · AI off" }
  const cards: ChatCard[] = [{ kind: "review", eventId, risks: review.risks, label }]
  let changeSet: ChangeSet | undefined
  if (review.tasks.length) {
    changeSet = draftSet(`Suggested steps for ${p.event.name}`, review.tasks, label)
    cards.push(textCard(`${review.tasks.length === 1 ? "One step" : `${review.tasks.length} steps`} the playbook didn't include. Add the ones you want:`), { kind: "changes", changeSetId: changeSet.id })
  }
  return { cards, source: label, changeSet }
}

export const SUGGESTIONS: Record<string, string[]> = {
  "/": ["What are my top 5 tasks?", "Plan a new event", "Who needs a nudge?"],
  "/events": ["What is at risk in this event?", "Who is up next?", "Plan a new event"],
  "/tasks": ["Add a task", "What are my top 5 tasks?", "What is stuck?"],
  "/team": ["Who is overloaded?", "Who needs a nudge?", "What are my top 5 tasks?"],
  "/funding": ["What's missing in this request?", "When is the USG food request due?", "Plan a new event"],
  "/handoff": ["What does a new officer need in week one?", "What are my top 5 tasks?", "Who needs a nudge?"],
  "/partners": ["Who needs a touch?", "Plan a new event", "What are my top 5 tasks?"],
  "/rules": ["Can we use an outside caterer?", "Can we run a raffle?", "Does the advisor need to attend?"],
  "/settings": ["How are deadlines calculated?", "Who is overloaded?", "What are my top 5 tasks?"],
  "/help": ["What are my top 5 tasks?", "Plan a new event", "Can we serve homemade food?"],
}
export const ruleById = (id: string) => RULES.find(r => r.id === id)
