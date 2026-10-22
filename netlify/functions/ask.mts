import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { fail, json, readJSON, str, BadRequest } from "../lib/http.mts"

/**
 * POST /api/ask
 * in:  { question, rules: [{ id, text, limit }] }
 * out: { inScope, confidence, answer, citations: [ruleId], model }
 *
 * Guardrail: the model may answer ONLY from the rule book it is given and must cite rule ids.
 * Answers that are out of scope, unsure (< 0.5), or cite no real rule are turned into a refusal here,
 * so the page never shows an uncited policy claim.
 */
const REFUSAL = "I couldn't find this in the rule book, so I won't guess. For ASU student-organization policy, ask the Tempe Student Organizations office at tempeclubs@asu.edu. If it's about club money, ask USG."

const SYSTEM = `You answer questions from ASU student-organization officers using ONLY the rule book provided.
Rules:
- If the rule book does not answer the question, set "inScope" to false and leave "answer" empty. Never use outside knowledge.
- Otherwise answer in 1-3 short plain-English sentences and put the rule id in square brackets after each claim, like [R06].
- "confidence" is 0 to 1: how sure you are that the cited rules answer the question.
Return ONLY a JSON object: {"inScope": boolean, "confidence": number, "answer": string, "citations": ["R06"]}. Output json only.`

export default async (req: Request) => {
  try {
    const body = await readJSON(req, 40_000)
    const question = str(body.question, 500)
    if (!question) throw new BadRequest("Missing question.")
    const rules = (Array.isArray(body.rules) ? body.rules : []).slice(0, 60).map(r => r as Record<string, unknown>)
      .map(r => ({ id: str(r.id, 10), text: str(r.text, 600), limit: str(r.limit, 200) })).filter(r => /^R\d{2,3}$/.test(r.id) && r.text)
    if (!rules.length) throw new BadRequest("Missing rule book.")
    const ids = new Set(rules.map(r => r.id))
    const book = rules.map(r => `[${r.id}] ${r.text} Time limit: ${r.limit || "none"}`).join("\n")

    const { data, model } = await chatJSON({ system: SYSTEM, user: `Rule book:\n${book}\n\nQuestion: ${question}`, maxTokens: 500 })
    const d = (data ?? {}) as Record<string, unknown>
    const citations = (Array.isArray(d.citations) ? d.citations : []).map(String).filter(id => ids.has(id))
    const confidence = Math.max(0, Math.min(1, Number(d.confidence) || 0))
    let answer = str(d.answer, 1200)
    // drop any [Rxx] tag that is not a real rule
    answer = answer.replace(/\s*\[(R\d{2,3})\]/g, (m, id) => (ids.has(id) ? m : "")).replace(/\s+([.,;])/g, "$1")
    const inScope = d.inScope === true && confidence >= 0.5 && citations.length > 0 && answer.length > 0
    return json(inScope
      ? { inScope: true, confidence, answer, citations, model }
      : { inScope: false, confidence: Math.min(confidence, 0.49), answer: REFUSAL, citations: [], model })
  } catch (e) {
    return fail(e)
  }
}

export const config: Config = { path: "/api/ask", method: "POST" }
