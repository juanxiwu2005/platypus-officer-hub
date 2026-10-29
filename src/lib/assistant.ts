import type { ChangeSet, DemoState, Node } from "../data/types"
import { callApi } from "./api"
import { commandContext, humanEventDate, isSmallOp, parseCommand, type CommandOp } from "./commands"
import { groundedAnswer, RULE_REFUSAL, type RuleAnswer } from "./ruleAnswers"
import { aiSnapshot, knownDates } from "./aiContext"
import { sanitizeCards, type PlanPrefill, type TaskScope, type WireCard } from "./chatCards"
import { computeForecast, forecastQueue } from "../engine/forecast"
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
  | { kind: "form"; id: string; prefill: Partial<PlanPrefill>; date: string; done?: boolean }
  | { kind: "tasks"; title: string; nodeIds: string[]; remind?: boolean }
  | { kind: "changes"; changeSetId: string }
  | { kind: "applied"; changeSetId: string }
  | { kind: "nudge"; nodeId: string }
  | { kind: "rule"; question: string; answer: string; citations: string[]; inScope: boolean; label: string }
export interface ChatMsg { id: string; role: "user" | "assistant"; text?: string; cards?: ChatCard[]; source?: string }
export interface Focus { kind: "node" | "event" | "page"; id: string; title: string }
export interface Reply { cards: ChatCard[]; source: string; changeSet?: ChangeSet; autoSet?: ChangeSet }

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
const canLeadAs = (s: DemoState, id: string) => {
  const p = s.people.find(x => x.id === id), r = s.roles.find(x => x.id === p?.roleId)
  return r?.holderId === id && (r.fn === "president" || r.fn === "vice_president")
}

export const PLAN_RE = /\b(plan|organi[sz]e|host|throw|set up|put on)\b.*\b(event|night|dinner|workshop|mixer|panel|talk|social|meetup|party|fundraiser|lunch|breakfast|showcase|hackathon|session)\b|^plan (a |an )?(new )?event|策划|办.*活动/i
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

function planDefaults(text: string, s: DemoState): { prefill: Partial<PlanPrefill>; date: string } {
  const op = parseCommand(/^plan|^create|^schedule|^organize/i.test(text.trim()) ? text : `Plan ${text}`, commandContext(s)).find(o => o.op === "create_event") as Extract<CommandOp, { op: "create_event" }> | undefined
  const generic = !op || /^(a |an )?(new )?event$/i.test(op.name.trim()) || op.name.length > 60
  const prefill: Partial<PlanPrefill> = op ? { ...op, name: generic ? "" : op.name } : { name: "" }
  delete (prefill as { op?: string }).op
  return { prefill, date: humanEventDate(text, s.today) }
}

function rankMine(s: DemoState, personId: string, limit: number): Node[] {
  const forecast = computeForecast(s)
  const mine = s.nodes.filter(n => n.ownerId === personId && n.status !== "done")
  const score = (n: Node) => [(n.clubDeadline ?? "9999") < s.today ? 0 : 1, forecast.nodes[n.id]?.probability ?? 1, n.latestStart ?? "9999"] as const
  return mine.sort((a, b) => {
    const x = score(a), y = score(b)
    return x[0] - y[0] || x[1] - y[1] || String(x[2]).localeCompare(String(y[2]))
  }).slice(0, limit)
}

export function taskList(s: DemoState, viewerId: string, scope: TaskScope, limit: number, focusEventId?: string): { title: string; nodes: Node[]; remind?: boolean } {
  const forecast = computeForecast(s)
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
    if (c.kind === "form") out.push({ kind: "form", id: uid(), prefill: c.prefill, date: humanEventDate(text, s.today) })
    if (c.kind === "tasks") out.push(tasksCard(s, viewerId, c.scope, c.limit, focus?.kind === "event" ? focus.id : undefined))
    if (c.kind === "nudge") out.push({ kind: "nudge", nodeId: c.nodeId })
    if (c.kind === "rule") { const a = groundedAnswer({ inScope: c.inScope, confidence: 1, citations: c.citations }, null); out.push({ kind: "rule", question: text, answer: a.answer, citations: a.citations, inScope: a.inScope, label: source }) }
    if (c.kind === "changes" && !changeSet && !autoSet) { const r = splitChanges(text, c.ops, source); changeSet = r.changeSet; autoSet = r.autoSet; out.push(...r.cards) }
  }
  return { cards: out, source, changeSet, autoSet }
}

const HELP = "I can rank your top tasks, plan an event, draft a reminder, or check an ASU rule. Try one of the suggestions below."

/**
 * Answer one message. Clear requests are answered by the app itself (no AI needed); anything else goes to
 * /api/chat when AI is on. Every AI reply is re-checked by sanitizeCards() before it is shown.
 */
export async function respond(text: string, s: DemoState, viewerId: string, focus: Focus | null, page: string, history: ChatMsg[]): Promise<Reply> {
  const t = text.trim()
  const focusNode = focus?.kind === "node" ? s.nodes.find(n => n.id === focus.id) : undefined
  const focusEvent = focus?.kind === "event" ? s.events.find(e => e.id === focus.id) : focusNode?.eventId ? s.events.find(e => e.id === focusNode.eventId) : undefined
  const limit = Math.max(1, Math.min(10, Number(t.match(/\b(\d{1,2})\b/)?.[1] ?? 5)))

  if (PLAN_RE.test(t)) {
    const { prefill, date } = planDefaults(t, s)
    return { cards: [textCard("Happy to help. Check these five details and I'll draft the plan from the club playbook."), { kind: "form", id: uid(), prefill, date }], source: "Platypus" }
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
    const snap = aiSnapshot(s)
    try {
      const r = await callApi<{ cards: unknown; source: string; model?: string; provider?: string }>("/chat", {
        message: t, page, focus, context: commandContext(s), data: snap,
        history: history.slice(-6).map(m => ({ role: m.role, text: m.text ?? m.cards?.map(c => c.kind === "text" ? c.text : c.kind).join(" ") ?? "" })),
      })
      const cards = sanitizeCards(r.cards, commandContext(s), knownDates(snap))
      const label = r.source === "ai" ? `AI draft${r.model ? ` · ${r.model}` : ""}` : "Checked command grammar"
      if (cards.length) return fromWire(cards, t, s, viewerId, label, focus ?? null)
    } catch {
      if (RULE_Q_RE.test(t)) return ruleReply(t, s)
      return { cards: [textCard(`The AI service is unavailable right now. ${HELP}`)], source: "Local fallback · server unavailable" }
    }
  }
  if (RULE_Q_RE.test(t)) return { cards: [{ kind: "rule", question: t, answer: RULE_REFUSAL, citations: [], inScope: false, label: "Matched by keywords · AI off" }], source: "Rule book" }
  return { cards: [textCard(s.aiEnabled ? `I couldn't safely match that. ${HELP}` : `AI is off, so I can only handle set requests. ${HELP}`)], source: "Platypus" }
}

export const SUGGESTIONS: Record<string, string[]> = {
  "/": ["What are my top 5 tasks?", "Plan a new event", "Who needs a nudge?"],
  "/events": ["What is at risk in this event?", "Who is up next?", "Plan a new event"],
  "/tasks": ["What are my top 5 tasks?", "What is stuck?", "Who needs a nudge?"],
  "/team": ["Who is overloaded?", "Who needs a nudge?", "What are my top 5 tasks?"],
  "/funding": ["What's missing in this request?", "When is the USG food request due?", "Plan a new event"],
  "/handoff": ["What does a new officer need in week one?", "What are my top 5 tasks?", "Who needs a nudge?"],
  "/partners": ["Who needs a touch?", "Plan a new event", "What are my top 5 tasks?"],
  "/rules": ["Can we use an outside caterer?", "Can we run a raffle?", "Does the advisor need to attend?"],
  "/settings": ["How are deadlines calculated?", "Who is overloaded?", "What are my top 5 tasks?"],
  "/help": ["What are my top 5 tasks?", "Plan a new event", "Can we serve homemade food?"],
}
export const ruleById = (id: string) => RULES.find(r => r.id === id)
