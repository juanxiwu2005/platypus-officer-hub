import { chatJSON } from "../lib/ai.mts";
import { BadRequest, fail, json, readJSON } from "../lib/http.mts";
import { CONSTITUTION_DUTIES_SYSTEM, CONSTITUTION_STRUCTURE_SYSTEM, DUTY_BATCH, relevantExcerpt, sanitizeDuties, sanitizeRead } from "../../src/lib/constitution.ts";
/**
 * /api/setup/constitution — the president pressed Continue after choosing a constitution (M4). The browser has already read
 * the file and sends only its text, in short requests one after another: part "structure" (positions, departments, who reports
 * to whom), then part "duties" for a few named positions at a time. Each finishes inside the 30 seconds a request lasts here.
 * One long answer did not, and two at once did not either, because ASU AIR answers one request at a time (Netlify log, 2026-10-29:
 * structure 17 s, a second parallel request got no reply in 26 s). Replies are cut down by `sanitizeRead` / `sanitizeDuties`
 * (unknown fields dropped, dates removed, sizes capped) and checked again in the browser. A long text is cut to its most relevant
 * paragraphs. It uses the fast model; Gemma took 56 seconds on a real constitution.
 * Nothing is stored here: no database, no archive, no log of the text. Fictional documents only.
 */
const MAX_TEXT = 60000;
// Under 30 seconds in total, counting a cold start: if the AI is slower than this, answer with a clear message
// instead of letting the platform cut the request off with an empty 502/504.
const TIMEOUT_MS = 21000;
export default async (req) => {
    try {
        const body = await readJSON(req, MAX_TEXT + 4000);
        const raw = typeof body.text === "string" ? body.text : "";
        const part = body.part === "duties" ? "duties" : "structure";
        if (raw.trim().length < 20)
            throw new BadRequest("Add some constitution text first.");
        if (raw.length > MAX_TEXT)
            throw new BadRequest("This text is too long to send. The browser sends the relevant parts only.");
        const text = relevantExcerpt(raw.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone]"));
        if (part === "structure") {
            const { data, model, provider } = await chatJSON({ task: "constitution_read", system: CONSTITUTION_STRUCTURE_SYSTEM, user: JSON.stringify({ text }), maxTokens: 1200, temperature: 0.1, timeoutMs: TIMEOUT_MS });
            return json({ ...sanitizeRead(data, "ai"), part, model, provider });
        }
        const items = (Array.isArray(body.items) ? body.items : []).slice(0, DUTY_BATCH).flatMap((i) => {
            const x = i && typeof i === "object" ? i : {};
            const name = typeof x.name === "string" ? x.name.replace(/\s+/g, " ").trim().slice(0, 60) : "";
            return name ? [{ name }] : [];
        });
        if (!items.length)
            throw new BadRequest("Name the positions to read.");
        const { data, model, provider } = await chatJSON({ task: "constitution_read", system: CONSTITUTION_DUTIES_SYSTEM, user: JSON.stringify({ text, items }), maxTokens: 900, temperature: 0.1, timeoutMs: TIMEOUT_MS });
        return json({ part, items: [...sanitizeDuties(data, items)].map(([name, duties]) => ({ name, duties })), model, provider });
    }
    catch (e) {
        return fail(e);
    }
};
export const config = { path: "/api/setup/constitution", method: "POST" };
