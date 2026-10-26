import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { fail, json, readJSON, str, BadRequest } from "../lib/http.mts"

/**
 * POST /api/plan/draft
 * in:  { brief: {name,date,headcount,venue,food,funding,speaker,budget}, ruleSteps: [{key,title,role}], roles: [string] }
 * out: { suggestions: [{ title, role, daysBefore, minutes, why }], model }
 *
 * The AI only proposes EXTRA team-practice steps (no ASU rules, no deadlines).
 * Rule-based steps and every date are computed by the rule engine in the page.
 */
const SYSTEM = `You help a student-organization president plan an event.
The ASU rule-based steps are already scheduled; you must NOT repeat them and must NOT state ASU rules or official deadlines.
Suggest up to 3 extra team-practice steps that make this specific event go well (for example preparation, outreach, day-of logistics, follow-up).
Each step must be assigned to one of the given roles.
Return ONLY a JSON object: {"suggestions":[{"title": short imperative step (max 70 characters),
"role": one of the given roles, "daysBefore": whole days before the event when it should be finished (0-60; use -1..-14 for after the event),
"minutes": estimated minutes of work (5-180), "why": one plain sentence (max 140 characters)}]}. Output json only.`

export default async (req: Request) => {
  try {
    const body = await readJSON(req)
    const brief = (body.brief ?? {}) as Record<string, unknown>
    const roles = (Array.isArray(body.roles) ? body.roles : []).map(r => str(r, 40)).filter(Boolean).slice(0, 12)
    const ruleSteps = (Array.isArray(body.ruleSteps) ? body.ruleSteps : []).slice(0, 30)
      .map(s => `- ${str((s as Record<string, unknown>).title, 90)} (${str((s as Record<string, unknown>).role, 40)})`).join("\n")
    if (!roles.length) throw new BadRequest("Missing roles.")

    const user = `Event: ${str(brief.name, 80)} on ${str(brief.date, 10)}, about ${Number(brief.headcount) || "?"} people, venue: ${str(brief.venue, 20)}, food: ${str(brief.food, 20)}, funding: ${str(brief.funding, 20)}, guest speaker: ${brief.speaker ? "yes" : "no"}, budget: $${Number(brief.budget) || 0}.
Roles: ${roles.join(", ")}
Already scheduled:
${ruleSteps || "(none)"}`

    const { data, model } = await chatJSON({ task: "plan_draft", system: SYSTEM, user, maxTokens: 600, temperature: 0.3 })
    const raw = ((data ?? {}) as { suggestions?: unknown[] }).suggestions ?? []
    const suggestions = raw.slice(0, 3).map(s => s as Record<string, unknown>)
      .filter(s => roles.includes(String(s.role)) && str(s.title, 70))
      .map(s => ({
        title: str(s.title, 70),
        role: String(s.role),
        daysBefore: Math.max(-14, Math.min(60, Math.round(Number(s.daysBefore) || 7))),
        minutes: Math.max(5, Math.min(180, Math.round(Number(s.minutes) || 30))),
        why: str(s.why, 160),
      }))
    return json({ suggestions, model })
  } catch (e) {
    return fail(e)
  }
}

export const config: Config = { path: "/api/plan/draft", method: "POST" }
