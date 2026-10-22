import { AIError } from "./ai.mts"

/** Small helpers shared by the /api/* functions. */

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } })

export class BadRequest extends Error {}

/** Read a JSON body with a size cap so nobody can send huge prompts through our key. */
export async function readJSON<T = Record<string, unknown>>(req: Request, maxBytes = 24_000): Promise<T> {
  if (req.method !== "POST") throw new BadRequest("Use POST.")
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
  if (e instanceof BadRequest) return json({ error: "bad_request", message: e.message }, 400)
  if (e instanceof AIError) return json({ error: e.code, message: e.message }, e.status)
  console.error(e)
  return json({ error: "server_error", message: "Something went wrong on the server." }, 500)
}
