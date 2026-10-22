import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { fail, json, readJSON, str, BadRequest } from "../lib/http.mts"

/**
 * POST /api/replies/classify
 * in:  { text }               a short reply an officer sent about a task
 * out: { label, confidence }  label: done | waiting | help | other
 * The page sends low-confidence results (< 0.6) to the president instead of changing the task.
 */
const LABELS = ["done", "waiting", "help", "other"]

const SYSTEM = `Classify a student-organization officer's short reply about one task.
Labels: "done" (finished), "waiting" (submitted or sent, now waiting on someone else or an approval),
"help" (confused, stuck, asking a question or asking for help), "other" (none of these).
"confidence" is 0 to 1. Use a low confidence when the reply is ambiguous or mixes labels.
Return ONLY a JSON object: {"label": string, "confidence": number}. Output json only.`

export default async (req: Request) => {
  try {
    const body = await readJSON(req)
    const text = str(body.text, 400)
    if (!text) throw new BadRequest("Missing text.")
    const { data, model } = await chatJSON({ system: SYSTEM, user: `Reply: ${text}`, maxTokens: 60 })
    const d = (data ?? {}) as Record<string, unknown>
    const label = LABELS.includes(String(d.label)) ? String(d.label) : "other"
    const confidence = Math.max(0, Math.min(1, Number(d.confidence) || 0))
    return json({ label, confidence, model })
  } catch (e) {
    return fail(e)
  }
}

export const config: Config = { path: "/api/replies/classify", method: "POST" }
