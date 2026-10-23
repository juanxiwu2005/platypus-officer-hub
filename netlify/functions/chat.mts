import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON, str } from "../lib/http.mts"
import { parseCommand, type CommandContext } from "../../src/lib/commands.ts"
import { CHAT_SYSTEM, sanitizeCards } from "../../src/lib/chatCards.ts"
import { RULES } from "../../src/data/rules.ts"

/**
 * /api/chat — the single entry point behind the Ask panel (v1.1).
 * The model may only return the six card shapes in src/lib/chatCards.ts; everything is re-checked here
 * and again in the browser. Dates are never taken from the model.
 */
export default async (req: Request) => {
  try {
    const body = await readJSON(req, 90_000)
    const message = str(body.message, 1000)
    if (!message) throw new BadRequest("Please type a message.")
    const c = body.context as Record<string, unknown> | undefined
    const rows = (value: unknown, key: string, cap: number) => (Array.isArray(value) ? value : []).slice(0, cap).filter(v => v && typeof v === "object").map(v => ({ id: str(v.id, 100), [key]: str(v[key], 120) })).filter(v => v.id)
    const ctx = { events: rows(c?.events, "name", 40), nodes: rows(c?.nodes, "title", 400), people: rows(c?.people, "name", 50) } as CommandContext
    const local = parseCommand(message, ctx).filter(op => op.op !== "answer_question" && op.op !== "create_event")
    if (local.length) return json({ cards: [{ kind: "changes", ops: local }], source: "rules", model: null })
    const focus = body.focus && typeof body.focus === "object" ? { kind: str((body.focus as Record<string, unknown>).kind, 20), id: str((body.focus as Record<string, unknown>).id, 120), title: str((body.focus as Record<string, unknown>).title, 160) } : null
    const sum = body.summary as Record<string, unknown> | undefined
    const STATUSES = ["unclaimed", "accepted", "in_progress", "waiting", "blocked"]
    const known = new Set(ctx.nodes.map(n => n.id)), people = new Set(ctx.people.map(p => p.id)), events = new Set(ctx.events.map(e => e.id))
    const summary = {
      nodes: (Array.isArray(sum?.nodes) ? sum.nodes : []).slice(0, 150).filter(n => n && known.has(n.id)).map(n => ({ id: str(n.id, 100), status: STATUSES.includes(n.status) ? n.status : "unknown", owner: people.has(n.owner) ? n.owner : null, event: events.has(n.eventId) ? n.eventId : null, risk: ["red", "yellow", "green"].includes(n.risk) ? n.risk : null, overdue: n.overdue === true })),
      workload: (Array.isArray(sum?.workload) ? sum.workload : []).slice(0, 20).filter(w => w && people.has(w.personId)).map(w => ({ personId: w.personId, band: ["Light", "Balanced", "Heavy"].includes(w.band) ? w.band : "unknown" })),
    }
    const history = (Array.isArray(body.history) ? body.history : []).slice(-6).map(h => ({ role: h?.role === "assistant" ? "assistant" : "user", text: str(h?.text, 400) })).filter(h => h.text)
    const { data, model, provider } = await chatJSON({
      system: CHAT_SYSTEM,
      user: JSON.stringify({ message, page: str(body.page, 40), focus, history, context: ctx, summary, rules: RULES.map(({ id, short, text }) => ({ id, short, text })) }),
      maxTokens: 900,
      temperature: 0.2,
    })
    return json({ cards: sanitizeCards(data, ctx), source: "ai", model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/chat", method: "POST" }
