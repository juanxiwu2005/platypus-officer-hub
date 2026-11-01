import type { Config } from "@netlify/functions"
import { chatJSON } from "../lib/ai.mts"
import { BadRequest, fail, json, readJSON } from "../lib/http.mts"
import { relevantExcerpt } from "../../src/lib/constitution.ts"
import { EVENT_STEPS } from "../../src/engine/playbooks.ts"
import { WORKFLOW_CHANGES_SYSTEM, WORKFLOW_OWNERS_SYSTEM, changesToWire, ruleBookForPrompt, sanitizeChanges, sanitizeOwners, stepsForPrompt } from "../../src/lib/workflowAi.ts"
import type { Role, StepTemplate } from "../../src/data/types.ts"

/**
 * /api/setup/workflow — during setup the president's planning notes and files are compared with the standard event workflow.
 * Two short requests, one after another (a request may last only 30 seconds, and ASU AIR answers one at a time):
 *   part "changes": what the club does differently from the standard steps, and where that would break an ASU rule;
 *   part "owners": which officer role should do each step, from the roles' duties.
 * The standard steps come from the server's own copy, not from the browser. Replies are cut down by `sanitizeChanges` / `sanitizeOwners`
 * (unknown steps, roles and fields dropped, dates removed) and checked again in the browser, where the engine applies or refuses each change.
 * Nothing is stored here: no database, no archive, no log of the text. Fictional documents only.
 */
const MAX_BODY = 90_000
const TIMEOUT_MS = 21_000
const str = (v: unknown, max: number) => typeof v === "string" ? v.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").replace(/\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone]").slice(0, max) : ""
const asRoles = (v: unknown): Role[] => (Array.isArray(v) ? v : []).slice(0, 24).flatMap((r: unknown) => {
  const x = r && typeof r === "object" ? r as Record<string, unknown> : {}
  const title = str(x.title, 60).trim()
  return title ? [{ id: `r:${title}`, displayName: title, fn: "programs" as const, holderId: null, duties: str(x.duties, 240), reportsToId: null }] : []
})
export default async (req: Request) => {
  try {
    const body = await readJSON(req, MAX_BODY)
    const part = body.part === "owners" ? "owners" : "changes"
    const roles = asRoles(body.roles)
    if (!roles.length) throw new BadRequest("Add the officer roles first.")
    if (part === "owners") {
      const steps: StepTemplate[] = (Array.isArray(body.steps) ? body.steps : []).slice(0, 45).flatMap((s: unknown) => {
        const x = s && typeof s === "object" ? s as Record<string, unknown> : {}
        const key = str(x.key, 40).trim(), title = str(x.title, 120).trim()
        return key && title ? [{ key, title, phase: "prepare" as const, fn: "programs" as const, estDays: 1, tier: "light" as const, why: "", source: "", ...(typeof x.standardOwner === "string" ? { ownerRoleId: str(x.standardOwner, 60) } : {}) }] : []
      })
      if (!steps.length) throw new BadRequest("No steps to share out.")
      const user = JSON.stringify({ steps: steps.map(s => ({ key: s.key, title: s.title, standardOwner: s.ownerRoleId ?? null })), roles: roles.map(r => ({ title: r.displayName, duties: r.duties, reportsTo: null })) })
      const { data, model, provider } = await chatJSON({ task: "workflow_read", system: WORKFLOW_OWNERS_SYSTEM, user, maxTokens: 900, temperature: 0.1, timeoutMs: TIMEOUT_MS })
      const owners = sanitizeOwners(data, steps, roles)
      return json({ part, owners: Object.entries(owners).map(([key, id]) => ({ key, role: roles.find(r => r.id === id)?.displayName })), model, provider })
    }
    const notes = str(body.notes, 3_000)
    const files = (Array.isArray(body.files) ? body.files : []).slice(0, 3).map((f: unknown) => {
      const x = f && typeof f === "object" ? f as Record<string, unknown> : {}
      return { name: str(x.name, 120), text: relevantExcerpt(str(x.text, 60_000), 12_000) }
    }).filter(f => f.text.trim())
    if (!notes.trim() && !files.length) throw new BadRequest("Add planning notes or a file first.")
    const user = JSON.stringify({ notes, files, steps: stepsForPrompt(EVENT_STEPS), roles: roles.map(r => ({ title: r.displayName, duties: r.duties })), ruleBook: ruleBookForPrompt() })
    const { data, model, provider } = await chatJSON({ task: "workflow_read", system: WORKFLOW_CHANGES_SYSTEM, user, maxTokens: 1400, temperature: 0.1, timeoutMs: TIMEOUT_MS })
    const reading = sanitizeChanges(data, EVENT_STEPS, roles)
    return json({ part, summary: reading.summary, conflicts: reading.conflicts, changes: changesToWire(reading.changes, roles), model, provider })
  } catch (e) { return fail(e) }
}
export const config: Config = { path: "/api/setup/workflow", method: "POST" }
