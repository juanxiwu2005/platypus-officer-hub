import type { Config } from "@netlify/functions"
import { chatJSON, syncAiBudgetMs } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON, str } from "../lib/http.mts"
import { parseCommand } from "../../src/lib/commands.ts"
import { CHAT_SYSTEM, sanitizeCards } from "../../src/lib/chatCards.ts"
import { RULES } from "../../src/data/rules.ts"
import { SHARED_POOL } from "../../src/data/sharedPool.ts"
import { formSnapshot, knownDates } from "../../src/lib/aiContext.ts"
import { cleanData, contextFrom } from "../lib/clean.mts"

/**
 * /api/chat — the single entry point behind the Ask panel (v1.1).
 * The model sees the signed-in officer's club data (src/lib/aiContext.ts) and the read-only shared pool.
 * It may only return the card shapes in src/lib/chatCards.ts; everything is re-checked here and again in
 * the browser. A date the model writes survives only if it already appears in the club data.
 */
export default async (req: Request) => {
  try {
    // Room for a busy club's full snapshot (the demo club is about 30 KB). Over this, Ask falls back to
    // local keyword answers. Juanxi 2026-10-27: 128 KB, not 40 KB.
    const body = await readJSON(req, 128_000)
    const message = str(body.message, 1000)
    if (!message) throw new BadRequest("Please type a message.")
    const ctx = contextFrom(body.context)
    // New tasks and events go to the model, which fills the form from the whole message (M2b).
    const local = parseCommand(message, ctx).filter(op => op.op !== "answer_question" && op.op !== "create_event" && op.op !== "add_node")
    if (local.length) return json({ cards: [{ kind: "changes", ops: local }], source: "rules", model: null })
    const focus = body.focus && typeof body.focus === "object" ? { kind: str((body.focus as Record<string, unknown>).kind, 20), id: str((body.focus as Record<string, unknown>).id, 120), title: str((body.focus as Record<string, unknown>).title, 160) } : null
    // "form": the browser already shows the new event/task form and only wants it filled in from the message.
    // The model then needs the club, roles, people and events, not every task, the shared pool or the rule text.
    const formOnly = body.purpose === "form"
    const data = formOnly ? formSnapshot(cleanData(body.data)) : cleanData(body.data)
    const allowedDates = knownDates(data)
    const history = (Array.isArray(body.history) ? body.history : []).slice(-6).map(h => ({ role: h?.role === "assistant" ? "assistant" : "user", text: str(h?.text, 400) })).filter(h => h.text)
    const user = formOnly
      ? { message, page: str(body.page, 40), focus, history, clubData: data }
      : { message, page: str(body.page, 40), focus, history, clubData: data, sharedPool: SHARED_POOL, rules: RULES.map(({ id, short, text }) => ({ id, short, text })) }
    const { data: reply, model, provider } = await chatJSON({ task: "chat",
      system: CHAT_SYSTEM,
      user: JSON.stringify(user),
      // A reply is at most three short cards (a filled form is about 200 tokens). ASU AIR writes roughly 30 tokens a
      // second (2026-11-07 log: 700 tokens in 21 s), so a bigger allowance could not finish inside the budget anyway.
      maxTokens: formOnly ? 400 : 600,
      temperature: 0.2,
      // Production 2026-11-07: with 55 s here Netlify killed the function at about 30 s (504, then 502, no ai_usage
      // line) and the browser waited for nothing. Stop in time and answer with a clean error; the browser falls back.
      timeoutMs: syncAiBudgetMs(),
    })
    return json({ cards: sanitizeCards(reply, ctx, allowedDates), source: "ai", model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/chat", method: "POST" }
