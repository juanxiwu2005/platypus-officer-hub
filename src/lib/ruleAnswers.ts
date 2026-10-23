import { RULES } from "../data/rules"
export const RULE_REFUSAL = "I could not find an answer in the checked rule book, so I will not guess. Ask the Tempe Student Organizations office (tempeclubs@asu.edu); for funding, ask USG, and for rooms or catering, ask Student Unions. Exact event dates must be calculated in Events."
export interface RuleAnswer { inScope: boolean; answer: string; citations: string[]; model: string | null; provider?: string; sourcesChecked: typeof RULES }
/** The model selects rules, never authors policy claims or dates. Unknown fields are discarded. */
export function groundedAnswer(raw: unknown, model: string | null, provider?: string): RuleAnswer {
  const d = raw && typeof raw === "object" ? raw as Record<string,unknown> : {}
  const citations = [...new Set((Array.isArray(d.citations) ? d.citations : []).filter((id): id is string => typeof id === "string" && RULES.some(r=>r.id===id)))].slice(0,3)
  const valid = d.inScope === true && Number(d.confidence) >= .7 && citations.length > 0
  const answer = valid ? citations.map(id=>{const r=RULES.find(r=>r.id===id)!;return `${r.text}${r.limit !== "—" ? ` Timing: ${r.limit}.` : ""}${r.note ? ` ${r.note}` : ""} [${r.id}]`}).join("\n") : RULE_REFUSAL
  return {inScope:valid,answer,citations:valid?citations:[],model,provider,sourcesChecked:RULES}
}
