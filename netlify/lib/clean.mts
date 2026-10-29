import type { CommandContext } from "../../src/lib/commands.ts"
import { str } from "./http.mts"

/** Club data the browser sends to an AI endpoint, re-checked: secret-looking keys dropped, sizes capped. */
const SECRET = /key|token|secret|password|signature|dataurl|grant|phone/i
export function cleanData(value: unknown, depth = 0): unknown {
  if (depth > 6) return null
  if (typeof value === "string") return value.slice(0, 1500)
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value
  if (Array.isArray(value)) return value.slice(0, 600).map(v => cleanData(v, depth + 1))
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET.test(k)).slice(0, 60).map(([k, v]) => [k.slice(0, 60), cleanData(v, depth + 1)]))
  return null
}

/** The IDs the browser says exist; every AI change is checked against these (and again in the browser). */
export function contextFrom(raw: unknown): CommandContext {
  const c = raw && typeof raw === "object" ? raw as Record<string, unknown> : undefined
  const rows = (value: unknown, key: string, cap: number) => (Array.isArray(value) ? value : []).slice(0, cap).filter(v => v && typeof v === "object").map(v => ({ id: str(v.id, 100), [key]: str(v[key], 120) })).filter(v => v.id)
  return {
    events: rows(c?.events, "name", 40), nodes: rows(c?.nodes, "title", 400), people: rows(c?.people, "name", 50),
    contacts: rows(c?.contacts, "name", 200), roles: rows(c?.roles, "displayName", 40), tags: rows(c?.tags, "label", 40),
    funding: (Array.isArray(c?.funding) ? c.funding : []).slice(0, 40).map(f => ({ eventId: str((f as Record<string, unknown>)?.eventId, 100) })).filter(f => f.eventId),
  } as CommandContext
}
