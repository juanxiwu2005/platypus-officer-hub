import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON } from "../lib/http.mts"
import { CONSTITUTION_DUTIES_SYSTEM, CONSTITUTION_STRUCTURE_SYSTEM, relevantExcerpt, sanitizeRead } from "../../src/lib/constitution.ts"

/**
 * /api/setup/constitution — the president pressed Continue after choosing a constitution (M4). The browser has already read
 * the file and sends only its text, in two requests that run side by side: part "structure" (positions, departments, who reports
 * to whom) and part "duties" (what each does). Two short answers finish inside the 30 seconds a request lasts here; one long
 * answer did not (Netlify log, 2026-10-29: 502 and 504 at 30 seconds). Each reply is cut down by `sanitizeRead` (unknown
 * fields dropped, dates removed, sizes capped) and checked again in the browser. A long text is cut to its most relevant paragraphs.
 * It uses the fast model; Gemma took 56 seconds on a real constitution.
 * Nothing is stored here: no database, no archive, no log of the text. Fictional documents only.
 */
const MAX_TEXT = 60_000
const PARTS = { structure: { system: CONSTITUTION_STRUCTURE_SYSTEM, maxTokens: 1200 }, duties: { system: CONSTITUTION_DUTIES_SYSTEM, maxTokens: 1800 } } as const
export default async (req: Request) => {
  try {
    const body = await readJSON(req, MAX_TEXT + 2_000)
    const raw = typeof body.text === "string" ? body.text : ""
    const part = body.part === "duties" ? "duties" : "structure"
    if (raw.trim().length < 20) throw new BadRequest("Add some constitution text first.")
    if (raw.length > MAX_TEXT) throw new BadRequest("This text is too long to send. The browser sends the relevant parts only.")
    const text = relevantExcerpt(raw.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone]"))
    // 26 s: if the AI is slower than that, answer with a clear message before the platform cuts the request off with an empty 502.
    const { data, model, provider } = await chatJSON({ task: "constitution_read", system: PARTS[part].system, user: JSON.stringify({ text }), maxTokens: PARTS[part].maxTokens, temperature: 0.1, timeoutMs: 26_000 })
    return json({ ...sanitizeRead(data, "ai"), part, model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/setup/constitution", method: "POST" }
