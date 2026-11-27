import type { DemoState } from "../data/types"
import type { ChatCard } from "./assistant"
import { addDays, daysBetween } from "./dates"
import { answerSet, PLAYBOOK_CATEGORIES, playbookOf, questionsFor } from "../data/playbook"
import { officers } from "../data/permissions"
import { workload } from "../engine/team"
import { visibleContacts } from "../data/crm"
import { checkPreflight, EMPTY_PACKAGE } from "./preflight"
import { WEEK_ONE } from "./handbook"

/** Local Ask answers that respond (assistant.ts) imports on first use, so they stay out of the startup bundle. */
const textCard = (text: string): ChatCard => ({ kind: "text", text })

/** The viewer's open tasks whose Due date (the rule engine's club deadline) falls within the next 7 days, late ones included. */
export function dueThisWeek(s: DemoState, viewerId: string): ChatCard {
  const end = addDays(s.today, 7)
  const nodes = s.nodes.filter(n => n.ownerId === viewerId && n.status !== "done" && n.clubDeadline && n.clubDeadline <= end)
    .sort((a, b) => a.clubDeadline!.localeCompare(b.clubDeadline!) || a.id.localeCompare(b.id))
  return nodes.length ? { kind: "tasks", title: "Due this week", nodeIds: nodes.map(n => n.id) } : textCard("Nothing of yours is due in the next 7 days.")
}

const cut = (text: string, max = 140) => text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
const PLAYBOOK_LIST = 5

/** "Summarize the funding answers": each question in the named Playbook category with its best answer (club, then school rule, then tip). */
export function playbookSummary(t: string, s: DemoState): ChatCard {
  const lower = t.toLowerCase()
  const category = [...PLAYBOOK_CATEGORIES, ...(playbookOf(s).categories ?? [])].find(c => lower.includes(c.label.toLowerCase()) || lower.includes(c.id.toLowerCase()))
  const questions = questionsFor(s, { category: category?.id ?? null })
  const label = category?.label ?? "Playbook"
  if (!questions.length) return textCard(`No ${label} questions in the Playbook yet.`)
  const lines = questions.slice(0, PLAYBOOK_LIST).map((q, i) => {
    const a = answerSet(s, q.id), best = a.club ?? a.rule ?? a.experience
    return `${i + 1}. ${q.text} ${best ? cut(best.text) : "No answer yet."}`
  })
  const more = questions.length - PLAYBOOK_LIST
  return textCard([`${label}: ${questions.length} question${questions.length === 1 ? "" : "s"}.`, ...lines, ...(more > 0 ? [`${more} more on the Playbook page.`] : [])].join("\n"))
}

/** "What should a new treasurer read first?": the Playbook questions tagged for that role (the viewer's own when none is named), then those for everyone. */
export function playbookReadFirst(t: string, s: DemoState, viewerId: string): ChatCard {
  const lower = t.toLowerCase()
  const role = s.roles.find(r => lower.includes(r.displayName.toLowerCase())) ?? s.roles.find(r => r.id === s.people.find(p => p.id === viewerId)?.roleId)
  const all = questionsFor(s)
  const forRole = role ? all.filter(q => q.roleIds !== "all" && q.roleIds.includes(role.id)) : []
  const picks = [...forRole, ...all.filter(q => q.roleIds === "all")].slice(0, PLAYBOOK_LIST)
  if (!picks.length) return textCard("The Playbook has no questions yet.")
  return textCard([`Start with these${role ? ` for the ${role.displayName}` : ""}:`, ...picks.map((q, i) => `${i + 1}. ${q.text}`)].join("\n"))
}

/** "Who is overloaded?": the officers whose next two weeks need support, else who has the most work. */
export function overloadAnswer(s: DemoState): ChatCard {
  const rows = officers(s).map(p => ({ p, w: workload(s, p.id) })).sort((a, b) => b.w.load - a.w.load)
  const needingSupport = rows.filter(r => r.w.band === "Needs support")
  return textCard(needingSupport.length ? `${needingSupport.map(r => r.p.name.split(" ")[0]).join(", ")} could use help in the next two weeks.` : `No one needs support in the next two weeks. ${rows[0].p.name.split(" ")[0]} has the most work.`)
}

/** "Who needs a touch?": the partners past their contact interval. */
export function partnersDue(s: DemoState): ChatCard {
  const due = visibleContacts(s).filter(c => !c.lastContact || daysBetween(c.lastContact, s.today) >= c.cadenceDays)
  return textCard(due.length ? `Due for a touch: ${due.map(c => c.name).join(", ")}.` : "Every partner is within their contact interval.")
}

/** "What's missing in this request?": the pre-submission check of the event's funding request (else the first one); undefined with none. */
export function fundingMissing(s: DemoState, eventId: string | undefined): ChatCard | undefined {
  const f = s.funding.find(x => x.eventId === eventId) ?? s.funding[0]
  if (!f) return undefined
  const e = s.events.find(x => x.id === f.eventId)
  const r = checkPreflight({ ...EMPTY_PACKAGE, amount: f.amount, attendees: e?.headcount ?? 0, ...f.application })
  return textCard(r.ready ? `${e?.name}: the checklist is complete. The office still reviews it.` : `${e?.name} still needs: ${r.issues.map(i => i.text).join(" ")}`)
}

/** "What does a new officer need in week one?" */
export const weekOne = (): ChatCard => textCard(WEEK_ONE.map((w, i) => `${i + 1}. ${w.text}`).join("\n"))
