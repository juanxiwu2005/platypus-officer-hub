import type { DemoState, Event, NodeStatus, Tier } from "../data/types"
import { RULES } from "../data/rules"
import { visibleContacts } from "../data/crm"

/** Only these shapes may cross the AI boundary. Unknown keys (including all dates) disappear. */
export type CommandOp =
  | { op: "create_event"; name: string; type: Event["type"]; headcount: number; venue: Event["venue"]; food: Event["food"]; funding: Event["funding"]; speaker: boolean }
  | { op: "add_node"; title: string; eventId: string | null; ownerId: string | null; tier: Tier }
  | { op: "assign_owner"; nodeId: string; ownerId: string | null }
  | { op: "set_tier"; nodeId: string; tier: Tier }
  | { op: "link_dependency"; nodeId: string; dependsOnId: string }
  | { op: "propose_nudge"; nodeId: string }
  | { op: "answer_question"; answer: string; citations: string[] }
  // v1.2: more of the club's own data. Small ones apply at once (with Undo); the rest wait for review.
  | { op: "set_status"; nodeId: string; status: NodeStatus }
  | { op: "rename_task"; nodeId: string; title: string }
  | { op: "set_tags"; nodeId: string; tags: string[] }
  | { op: "mark_contacted"; contactId: string }
  | { op: "update_event"; eventId: string; name?: string; headcount?: number }
  | { op: "add_contact"; name: string; organization: string; relation: string; ownerRoleId: string; cadenceDays: number }
  | { op: "set_funding_amount"; eventId: string; amount: number }
  | { op: "advance_funding"; eventId: string }

/** Low-risk edits the assistant may apply straight away; each one can be undone (Juanxi, 2026-10-23). */
export const SMALL_OPS = ["set_status", "rename_task", "set_tags", "set_tier", "mark_contacted"] as const
export const isSmallOp = (op: CommandOp) => (SMALL_OPS as readonly string[]).includes(op.op)
export const STATUSES: NodeStatus[] = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"]

export type CommandContext = {
  events: { id: string; name: string }[]
  nodes: { id: string; title: string }[]
  people: { id: string; name: string }[]
  contacts?: { id: string; name: string }[]
  roles?: { id: string; displayName: string }[]
  tags?: { id: string; label: string }[]
  funding?: { eventId: string }[]
}
export const commandContext = (s: DemoState): CommandContext => ({
  events: s.events.map(({ id, name }) => ({ id, name })),
  nodes: s.nodes.map(({ id, title }) => ({ id, title })),
  people: s.people.map(({ id, name }) => ({ id, name })),
  contacts: visibleContacts(s).map(({ id, name }) => ({ id, name })),
  roles: s.roles.map(({ id, displayName }) => ({ id, displayName })),
  tags: (s.org.board?.tags ?? []).map(({ id, label }) => ({ id, label })),
  funding: s.funding.map(({ eventId }) => ({ eventId })),
})
const text = (v: unknown, max = 100) => typeof v === "string" ? v.trim().slice(0, max) : ""
const choose = <T extends string>(v: unknown, choices: readonly T[], fallback: T): T => choices.includes(v as T) ? v as T : fallback
export const TIERS = ["light", "medium", "heavy"] as const
export const REFUSAL = "I couldn't find this in the rule book. Please ask the Tempe Student Organizations office at tempeclubs@asu.edu, or USG for club funding."

export function sanitizeOps(raw: unknown, ctx: CommandContext): CommandOp[] {
  if (!Array.isArray(raw)) return []
  const node = (id: unknown) => typeof id === "string" && ctx.nodes.some(n => n.id === id)
  const owner = (id: unknown) => id === null || (typeof id === "string" && ctx.people.some(p => p.id === id))
  const event = (id: unknown) => typeof id === "string" && ctx.events.some(e => e.id === id)
  const funded = (id: unknown) => typeof id === "string" && (ctx.funding ?? []).some(f => f.eventId === id)
  const ops: CommandOp[] = []
  for (const value of raw.slice(0, 12)) {
    if (!value || typeof value !== "object") continue
    const d = value as Record<string, unknown>
    switch (d.op) {
      case "create_event":
        if (text(d.name)) ops.push({ op: d.op, name: text(d.name, 80), type: choose(d.type, ["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"], "social"), headcount: Math.max(1, Math.min(5000, Math.round(Number(d.headcount) || 30))), venue: choose(d.venue, ["campus", "offcampus"], "campus"), food: choose(d.food, ["none", "offsite", "dining", "onsite"], "none"), funding: choose(d.funding, ["none", "usg", "college", "dues", "sponsor"], "none"), speaker: d.speaker === true })
        break
      case "add_node":
        if (text(d.title) && (d.eventId === null || ctx.events.some(e => e.id === d.eventId)) && owner(d.ownerId)) ops.push({ op: d.op, title: text(d.title), eventId: d.eventId as string | null, ownerId: d.ownerId as string | null, tier: choose(d.tier, TIERS, "medium") })
        break
      case "assign_owner":
        if (node(d.nodeId) && owner(d.ownerId)) ops.push({ op: d.op, nodeId: d.nodeId as string, ownerId: d.ownerId as string | null })
        break
      case "set_tier":
        if (node(d.nodeId) && TIERS.includes(d.tier as Tier)) ops.push({ op: d.op, nodeId: d.nodeId as string, tier: d.tier as Tier })
        break
      case "link_dependency":
        if (node(d.nodeId) && node(d.dependsOnId) && d.nodeId !== d.dependsOnId) ops.push({ op: d.op, nodeId: d.nodeId as string, dependsOnId: d.dependsOnId as string })
        break
      case "propose_nudge":
        if (node(d.nodeId)) ops.push({ op: d.op, nodeId: d.nodeId as string })
        break
      case "set_status":
        if (node(d.nodeId) && STATUSES.includes(d.status as NodeStatus)) ops.push({ op: d.op, nodeId: d.nodeId as string, status: d.status as NodeStatus })
        break
      case "rename_task":
        if (node(d.nodeId) && text(d.title)) ops.push({ op: d.op, nodeId: d.nodeId as string, title: text(d.title) })
        break
      case "set_tags": {
        const tags = Array.isArray(d.tags) ? [...new Set(d.tags.filter((t): t is string => typeof t === "string" && (ctx.tags ?? []).some(x => x.id === t)))].slice(0, 6) : null
        if (node(d.nodeId) && tags) ops.push({ op: d.op, nodeId: d.nodeId as string, tags })
        break
      }
      case "mark_contacted":
        if (typeof d.contactId === "string" && (ctx.contacts ?? []).some(c => c.id === d.contactId)) ops.push({ op: d.op, contactId: d.contactId })
        break
      case "update_event": {
        if (!event(d.eventId)) break
        const op: Extract<CommandOp, { op: "update_event" }> = { op: d.op, eventId: d.eventId as string }
        if (text(d.name, 80)) op.name = text(d.name, 80)
        if (Number.isFinite(Number(d.headcount)) && d.headcount !== null && d.headcount !== undefined) op.headcount = Math.max(1, Math.min(5000, Math.round(Number(d.headcount))))
        if (op.name || op.headcount) ops.push(op)
        break
      }
      case "add_contact":
        if (text(d.name, 80) && typeof d.ownerRoleId === "string" && (ctx.roles ?? []).some(r => r.id === d.ownerRoleId)) ops.push({ op: d.op, name: text(d.name, 80), organization: text(d.organization, 80), relation: text(d.relation, 40) || "Partner", ownerRoleId: d.ownerRoleId, cadenceDays: Math.max(1, Math.min(365, Math.round(Number(d.cadenceDays) || 30))) })
        break
      case "set_funding_amount": {
        const amount = Math.round(Number(d.amount) * 100) / 100
        if (funded(d.eventId) && Number.isFinite(amount) && amount >= 0 && amount <= 1000000) ops.push({ op: d.op, eventId: d.eventId as string, amount })
        break
      }
      case "advance_funding":
        if (funded(d.eventId)) ops.push({ op: d.op, eventId: d.eventId as string })
        break
      case "answer_question": {
        const citations = Array.isArray(d.citations) ? [...new Set(d.citations.filter((id): id is string => RULES.some(r => r.id === id)))] : []
        // Render actual rule-book text, never an uncited AI policy claim.
        const answer = citations.length ? citations.map(id => { const r = RULES.find(r => r.id === id)!; return `${r.text} ${r.limit === "—" ? "" : r.limit} [${id}]` }).join(" ") : REFUSAL
        ops.push({ op: d.op, answer, citations })
        break
      }
    }
  }
  return ops
}

/** A deliberately small deterministic grammar; unrecognized language goes to the provider. */
export function parseCommand(sentence: string, ctx: CommandContext): CommandOp[] {
  const s = sentence.trim()
  const lower = s.toLowerCase()
  const namedNodes = ctx.nodes.filter(n => lower.includes(n.title.toLowerCase()) || lower.includes(n.id.toLowerCase()))
  const uniqueNode = namedNodes.length === 1 ? namedNodes[0] : undefined
  const people = ctx.people.filter(p => lower.includes(p.name.toLowerCase()) || new RegExp(`\\b${p.name.split(" ")[0].toLowerCase()}\\b`).test(lower))
  if (/^(assign|give|unassign|remove the owner)/i.test(s) && uniqueNode) {
    if (/^(unassign|remove the owner)/i.test(s)) return [{ op: "assign_owner", nodeId: uniqueNode.id, ownerId: null }]
    if (people.length === 1) return [{ op: "assign_owner", nodeId: uniqueNode.id, ownerId: people[0].id }]
  }
  const tier = TIERS.find(t => new RegExp(`\\b${t}\\b`).test(lower))
  if (/^(set|make|mark)/i.test(s) && uniqueNode && tier) return [{ op: "set_tier", nodeId: uniqueNode.id, tier }]
  if (/^(remind|nudge|draft a reminder)/i.test(s) && uniqueNode) return [{ op: "propose_nudge", nodeId: uniqueNode.id }]
  if (/^(make|link|connect)/i.test(s) && namedNodes.length === 2 && /depend on|depends on|after/i.test(s)) {
    const ordered = [...namedNodes].sort((a, b) => lower.indexOf(a.title.toLowerCase()) - lower.indexOf(b.title.toLowerCase()))
    return [{ op: "link_dependency", nodeId: ordered[0].id, dependsOnId: ordered[1].id }]
  }
  const added = s.match(/^(?:add|create) (?:a )?(?:task|node|step)\s*[:：]?\s*(.+)/i)
  if (added) {
    const events = ctx.events.filter(e => lower.includes(e.name.toLowerCase()))
    if (events.length > 1 || people.length > 1) return []
    const title = added[1].split(/\s+(?:for|to|assigned to)\s+/i)[0].trim().replace(/^["']|["']$/g, "")
    return sanitizeOps([{ op: "add_node", title, eventId: events[0]?.id ?? null, ownerId: people[0]?.id ?? null, tier: tier ?? "medium" }], ctx)
  }
  const event = s.match(/^(?:plan|create|schedule|organize)\s+(?:an?\s+)?(?:event\s*[:：]?\s*)?(.+?)(?:\s+on\s+|,|$)/i)
  if (event && !/^(task|node|step)\b/i.test(event[1])) {
    return sanitizeOps([{ op: "create_event", name: event[1], type: /speaker|panel/i.test(s) ? "speaker" : /workshop/i.test(s) ? "workshop" : /meeting/i.test(s) ? "meeting" : /fundraiser/i.test(s) ? "fundraiser" : "social", headcount: Number(s.match(/(\d+)\s*(?:people|attendees|students|guests)/i)?.[1] ?? 30), venue: /off[- ]campus/i.test(s) ? "offcampus" : "campus", food: /outside cater|external cater/i.test(s) ? "offsite" : /sun devil dining|aramark/i.test(s) ? "dining" : /prepared on site/i.test(s) ? "onsite" : "none", funding: /\busg\b|student government/i.test(s) ? "usg" : /college funding/i.test(s) ? "college" : /dues/i.test(s) ? "dues" : /sponsor/i.test(s) ? "sponsor" : "none", speaker: /speaker|panel/i.test(s) }], ctx)
  }
  if (/^(what|when|how|can|do|does|is|are)\b/i.test(s) || s.endsWith("?")) {
    const ids = /homemade/i.test(s) ? ["R08"] : /outside cater|food exception/i.test(s) ? ["R06"] : /raffle/i.test(s) ? ["R15"] : /final exam/i.test(s) ? ["R13"] : /usg.*(?:food|service)|(?:food|service).*usg/i.test(s) ? ["R09"] : /book.*(?:room|space)|reserve.*(?:room|space)/i.test(s) ? ["R03", "R04"] : null
    if (ids) return sanitizeOps([{ op: "answer_question", citations: ids }], ctx)
  }
  return []
}

/** Human date input only. This is never called on model output. Missing/relative dates need review. */
export function humanEventDate(sentence: string, today: string): string {
  const iso = sentence.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (iso) return validDate(iso[1]) ? iso[1] : ""
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
  const m = sentence.match(/\b(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i)
  if (!m) return ""
  const date = `${m[3] ?? today.slice(0, 4)}-${String(months.indexOf(m[1].slice(0, 3).toLowerCase()) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`
  return validDate(date) ? date : ""
}
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date
}

const STATUS_WORDS: Record<NodeStatus, string> = { unclaimed: "Not claimed", accepted: "Claimed", in_progress: "In progress", waiting: "Waiting", blocked: "Blocked", done: "Done" }
export function opLabel(op: CommandOp, ctx: CommandContext): string {
  const node = (id: string) => ctx.nodes.find(n => n.id === id)?.title ?? "Missing task"
  switch (op.op) {
    case "create_event": return `Create event: ${op.name}`
    case "add_node": return `Add task: ${op.title}`
    case "assign_owner": return `Assign ${node(op.nodeId)} to ${ctx.people.find(p => p.id === op.ownerId)?.name ?? "no owner"}`
    case "set_tier": return `Set ${node(op.nodeId)} to ${op.tier}`
    case "link_dependency": return `${node(op.nodeId)} depends on ${node(op.dependsOnId)}`
    case "propose_nudge": return `Draft a reminder: ${node(op.nodeId)}`
    case "answer_question": return "Rule-book answer"
    case "set_status": return `Move ${node(op.nodeId)} to ${STATUS_WORDS[op.status]}`
    case "rename_task": return `Rename ${node(op.nodeId)} to “${op.title}”`
    case "set_tags": return `Tags on ${node(op.nodeId)}: ${op.tags.map(t => ctx.tags?.find(x => x.id === t)?.label ?? t).join(", ") || "none"}`
    case "mark_contacted": return `Log contact with ${ctx.contacts?.find(c => c.id === op.contactId)?.name ?? "partner"}`
    case "update_event": return `Update ${ctx.events.find(e => e.id === op.eventId)?.name ?? "event"}: ${[op.name && `name “${op.name}”`, op.headcount && `${op.headcount} people`].filter(Boolean).join(", ")}`
    case "add_contact": return `Add partner: ${op.name}${op.organization ? ` (${op.organization})` : ""}`
    case "set_funding_amount": return `Set ${ctx.events.find(e => e.id === op.eventId)?.name ?? "event"} budget to $${op.amount.toLocaleString("en-US")}`
    case "advance_funding": return `Move ${ctx.events.find(e => e.id === op.eventId)?.name ?? "event"} funding to the next stage`
  }
}
