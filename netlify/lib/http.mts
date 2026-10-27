import { AIError } from "./ai.mts"

/** Small helpers shared by the /api/* functions. */

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } })

export class BadRequest extends Error {}
export class TooManyRequests extends Error {
  retryAfter: number
  constructor(retryAfter: number) {
    super("Too many requests. Please wait a moment and try again.")
    this.retryAfter = retryAfter
  }
}

/**
 * Per-visitor request limit, kept in this function instance's memory.
 * LIMITS: Netlify may run several instances at once and restarts them freely, and every instance counts on its own,
 * so this slows down a script hammering one address; it is not a hard cap. It exists to make a runaway loop expensive
 * to run, not to enforce a quota.
 */
export const RATE_LIMITS = { perMinute: 60, perHour: 600, allVisitorsPerHour: 3000 }
const hits = new Map<string, number[]>()
let allHits: number[] = []

/** The visitor's address as Netlify reports it (set by Netlify itself; a browser cannot choose it). */
export function clientIp(req: Request): string {
  return req.headers.get("x-nf-client-connection-ip")?.trim().slice(0, 64) || "unknown"
}

export function resetRateLimit() {
  hits.clear()
  allHits = []
}

/** Count this request against the visitor's address; throws TooManyRequests once a limit is passed. `now` is injectable for tests. */
export function rateLimit(req: Request, now = Date.now()) {
  const hour = now - 3_600_000
  allHits = allHits.filter(t => t > hour)
  const ip = clientIp(req)
  const mine = (hits.get(ip) ?? []).filter(t => t > hour)
  const lastMinute = mine.filter(t => t > now - 60_000)
  if (lastMinute.length >= RATE_LIMITS.perMinute) throw new TooManyRequests(Math.max(1, Math.ceil((lastMinute[0] + 60_000 - now) / 1000)))
  if (mine.length >= RATE_LIMITS.perHour) throw new TooManyRequests(Math.max(1, Math.ceil((mine[0] + 3_600_000 - now) / 1000)))
  if (allHits.length >= RATE_LIMITS.allVisitorsPerHour) throw new TooManyRequests(Math.max(1, Math.ceil((allHits[0] + 3_600_000 - now) / 1000)))
  mine.push(now)
  allHits.push(now)
  hits.set(ip, mine)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => t > hour)) hits.delete(k) // keep memory bounded
}

/** Read a JSON body with a size cap so nobody can send huge prompts through our key. Also counts the request against the rate limit. */
export async function readJSON<T = Record<string, unknown>>(req: Request, maxBytes = 24_000): Promise<T> {
  if (req.method !== "POST") throw new BadRequest("Use POST.")
  rateLimit(req)
  const text = await req.text()
  if (text.length > maxBytes) throw new BadRequest("Request is too large.")
  try {
    return JSON.parse(text || "{}") as T
  } catch {
    throw new BadRequest("Body must be JSON.")
  }
}

export const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** Turn any thrown error into a JSON response the front end understands. */
export function fail(e: unknown): Response {
  if (e instanceof TooManyRequests) return new Response(JSON.stringify({ error: "rate_limited", message: e.message }), { status: 429, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "retry-after": String(e.retryAfter) } })
  if (e instanceof BadRequest) return json({ error: "bad_request", message: e.message }, 400)
  if (e instanceof AIError) return json({ error: e.code, message: e.message }, e.status)
  console.error(e)
  return json({ error: "server_error", message: "Something went wrong on the server." }, 500)
}
