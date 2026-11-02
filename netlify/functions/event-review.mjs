import { chatJSON } from "../lib/ai.mts";
import { BadRequest, fail, json, readJSON, str } from "../lib/http.mts";
import { cleanData, contextFrom } from "../lib/clean.mts";
import { EVENT_REVIEW_SYSTEM, sanitizeReview } from "../../src/lib/eventReview.ts";
import { knownDates } from "../../src/lib/aiContext.ts";
/**
 * /api/event/review — after a new event is approved, the model reads the playbook's steps and everything the
 * organizer wrote, and suggests risks and extra steps (M2b). Its reply is re-checked here and in the browser:
 * steps become ordinary add_node changes for a person to review, and any date it writes is masked.
 */
export default async (req) => {
    try {
        const body = await readJSON(req, 64000);
        const eventId = str(body.eventId, 120);
        if (!eventId)
            throw new BadRequest("Missing event.");
        const ctx = contextFrom(body.context);
        if (!ctx.events.some(e => e.id === eventId))
            throw new BadRequest("Unknown event.");
        const data = cleanData(body.data);
        const titles = (Array.isArray(data?.steps) ? data.steps : []).map(s => str(s?.title, 120)).filter(Boolean);
        const { data: reply, model, provider } = await chatJSON({ task: "event_review", system: EVENT_REVIEW_SYSTEM, user: JSON.stringify(data), maxTokens: 900, temperature: 0.2, timeoutMs: 55000 });
        return json({ ...sanitizeReview(reply, ctx, eventId, titles, knownDates(data)), source: "ai", model, provider });
    }
    catch (e) {
        return fail(e);
    }
};
export const config = { path: "/api/event/review", method: "POST" };
