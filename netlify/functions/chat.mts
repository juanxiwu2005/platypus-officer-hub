import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON, str } from "../lib/http.mts"
import { parseCommand, type CommandContext } from "../../src/lib/commands.ts"
import { CHAT_SYSTEM, sanitizeCards } from "../../src/lib/chatCards.ts"
import { RULES } from "../../src/data/rules.ts"
import { SHARED_POOL } from "../../src/data/sharedPool.ts"
import { knownDates } from "../../src/lib/aiContext.ts"

/** The club data the browser sends (src/lib/aiContext.ts), re-checked: secrets dropped, sizes capped. */
const SECRET = /key|token|secret|password|signature|dataurl|grant|phone/i
function cleanData(value: unknown, depth = 0): unknown {
  if (depth > 6) return null
  if (typeof value === "string") return value.slice(0, 1500)
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value
  if (Array.isArray(value)) return value.slice(0, 600).map(v => cleanData(v, depth + 1))
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET.test(k)).slice(0, 60).map(([k, v]) => [k.slice(0, 60), cleanData(v, depth + 1)]))
  return null
}

/**
 * /api/chat — the single entry point behind the Ask panel (v1.1).
 * The model sees the signed-in officer's club data (src/lib/aiContext.ts) and the read-only shared pool.
 * It may only return the card shapes in src/lib/chatCards.ts; everything is re-checked here and again in
 * the browser. A date the model writes survives only if it already appears in the club data.
 */
export default async (req: Request) => {
  try {
    const body = await readJSON(req, 40_000)
    const message = str(body.message, 1000)
    if (!message) throw new BadRequest("Please type a message.")
    const c = body.context as Record<string, unknown> | undefined
    const rows = (value: unknown, key: string, cap: number) => (Array.isArray(value) ? value : []).slice(0, cap).filter(v => v && typeof v === "object").map(v => ({ id: str(v.id, 100), [key]: str(v[key], 120) })).filter(v => v.id)
    const ctx = {
      events: rows(c?.events, "name", 40), nodes: rows(c?.nodes, "title", 400), people: rows(c?.people, "name", 50),
      contacts: rows(c?.contacts, "name", 200), roles: rows(c?.roles, "displayName", 40), tags: rows(c?.tags, "label", 40),
      funding: (Array.isArray(c?.funding) ? c.funding : []).slice(0, 40).map(f => ({ eventId: str(f?.eventId, 100) })).filter(f => f.eventId),
    } as CommandContext
    const local = parseCommand(message, ctx).filter(op => op.op !== "answer_question" && op.op !== "create_event")
    if (local.length) return json({ cards: [{ kind: "changes", ops: local }], source: "rules", model: null })
    const focus = body.focus && typeof body.focus === "object" ? { kind: str((body.focus as Record<string, unknown>).kind, 20), id: str((body.focus as Record<string, unknown>).id, 120), title: str((body.focus as Record<string, unknown>).title, 160) } : null
    const data = cleanData(body.data)
    const allowedDates = knownDates(data)
    const history = (Array.isArray(body.history) ? body.history : []).slice(-6).map(h => ({ role: h?.role === "assistant" ? "assistant" : "user", text: str(h?.text, 400) })).filter(h => h.text)
    const { data: reply, model, provider } = await chatJSON({ endpoint: "chat", 
      system: CHAT_SYSTEM,
      user: JSON.stringify({ message, page: str(body.page, 40), focus, history, clubData: data, sharedPool: SHARED_POOL, rules: RULES.map(({ id, short, text }) => ({ id, short, text })) }),
      maxTokens: 1200,
      temperature: 0.2,
    })
    return json({ cards: sanitizeCards(reply, ctx, allowedDates), source: "ai", model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/chat", method: "POST" }
