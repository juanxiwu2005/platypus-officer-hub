import type { Config } from "@netlify/functions"
import { chatJSON, SYNC_AI_BUDGET_MS } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON, str } from "../lib/http.mts"
import { cleanData, contextFrom } from "../lib/clean.mts"
import { EVENT_REVIEW_SYSTEM, sanitizeReview } from "../../src/lib/eventReview.ts"
import { knownDates } from "../../src/lib/aiContext.ts"

/**
 * /api/event/review — after a new event is approved, the model reads the playbook's steps and everything the
 * organizer wrote, and suggests risks and extra steps (M2b). Its reply is re-checked here and in the browser:
 * steps become ordinary add_node changes for a person to review, and any date it writes is masked.
 * Time budget: SYNC_AI_BUDGET_MS (Netlify stops a request at about 30 s); the browser then shows the rule engine's own check.
 * At most 4 risks and 6 steps fit in about 400 tokens; 700 leaves room without running past the budget.
 */
export default async (req: Request) => {
  try {
    const body = await readJSON(req, 64_000)
    const eventId = str(body.eventId, 120)
    if (!eventId) throw new BadRequest("Missing event.")
    const ctx = contextFrom(body.context)
    if (!ctx.events.some(e => e.id === eventId)) throw new BadRequest("Unknown event.")
    const data = cleanData(body.data) as { steps?: { title?: unknown }[] } | null
    const titles = (Array.isArray(data?.steps) ? data.steps : []).map(s => str(s?.title, 120)).filter(Boolean)
    const { data: reply, model, provider } = await chatJSON({ task: "event_review", system: EVENT_REVIEW_SYSTEM, user: JSON.stringify(data), maxTokens: 700, temperature: 0.2, timeoutMs: SYNC_AI_BUDGET_MS })
    return json({ ...sanitizeReview(reply, ctx, eventId, titles, knownDates(data)), source: "ai", model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/event/review", method: "POST" }
