import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON } from "../lib/http.mts"
import { CONSTITUTION_SYSTEM, sanitizeRead } from "../../src/lib/constitution.ts"

/**
 * /api/setup/constitution — the president pressed Continue after choosing a constitution (M4). The browser has already read
 * the file and sends only its text. The model proposes departments, roles, who reports to whom, and duties; the reply is cut
 * down by `sanitizeRead` (unknown fields dropped, dates removed, sizes capped) and checked again in the browser.
 * Nothing is stored here: no database, no archive, no log of the text. Fictional documents only.
 */
const MAX_TEXT = 60_000
export default async (req: Request) => {
  try {
    const body = await readJSON(req, MAX_TEXT + 2_000)
    const raw = typeof body.text === "string" ? body.text : ""
    if (raw.trim().length < 20) throw new BadRequest("Add some constitution text first.")
    if (raw.length > MAX_TEXT) throw new BadRequest("This document is too long for the prototype.")
    const text = raw.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone]")
    const { data, model, provider } = await chatJSON({ task: "setup.constitution", system: CONSTITUTION_SYSTEM, user: JSON.stringify({ text }), maxTokens: 3000, temperature: 0.1, timeoutMs: 55_000 })
    return json({ ...sanitizeRead(data, "ai"), model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/setup/constitution", method: "POST" }
