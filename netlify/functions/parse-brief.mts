import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { fail, json, readJSON, str, BadRequest } from "../lib/http.mts"

/**
 * POST /api/parse-brief
 * in:  { sentence, today: "YYYY-MM-DD" }
 * out: { brief: { name?, date?, headcount?, venue?, food?, funding?, speaker?, money?, budget? }, model }
 * Only fields the model is sure about come back; the page keeps its own values for the rest.
 */
const VENUE = ["campus", "offcampus"]
const FOOD = ["none", "offsite", "dining", "onsite"]
const FUNDING = ["usg", "dues", "sponsor", "none"]

const SYSTEM = `You turn a student-organization officer's one-sentence event description into structured fields.
Return ONLY a JSON object with these keys (use null when the sentence does not say):
- name: short event name (string)
- Do not return any dates. Event dates must be entered and confirmed by a person.
- headcount: expected attendance (integer)
- venue: "campus" (an ASU room) or "offcampus"
- food: "none", "offsite" (outside restaurant or caterer), "dining" (Sun Devil Dining / Aramark), or "onsite" (cooked or prepared at the event)
- funding: "usg" (student government), "dues", "sponsor", or "none"
- speaker: true if there is a guest speaker, panelist or performer
- money: true if tickets or items are sold
- budget: total budget in US dollars (number)
Do not invent details. Output json only.`

export default async (req: Request) => {
  try {
    const body = await readJSON(req)
    const sentence = str(body.sentence, 600)
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body.today)) ? String(body.today) : new Date().toISOString().slice(0, 10)
    if (!sentence) throw new BadRequest("Missing sentence.")

    const { data, model } = await chatJSON({ task: "parse_brief", system: SYSTEM, user: `today: ${today}\nsentence: ${sentence}`, maxTokens: 300 })
    const d = (data ?? {}) as Record<string, unknown>
    const brief: Record<string, unknown> = {}
    if (typeof d.name === "string" && d.name.trim()) brief.name = d.name.trim().slice(0, 80)
    if (Number.isFinite(Number(d.headcount)) && Number(d.headcount) > 0) brief.headcount = Math.min(5000, Math.round(Number(d.headcount)))
    if (VENUE.includes(String(d.venue))) brief.venue = d.venue
    if (FOOD.includes(String(d.food))) brief.food = d.food
    if (FUNDING.includes(String(d.funding))) brief.funding = d.funding
    if (typeof d.speaker === "boolean") brief.speaker = d.speaker
    if (typeof d.money === "boolean") brief.money = d.money
    if (Number.isFinite(Number(d.budget)) && Number(d.budget) >= 0 && d.budget !== null) brief.budget = Math.min(1_000_000, Number(d.budget))
    return json({ brief, model })
  } catch (e) {
    return fail(e)
  }
}

export const config: Config = { path: "/api/parse-brief", method: "POST" }

