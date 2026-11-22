import type { Config } from "@netlify/functions"
import { json } from "../lib/http.mts"

/**
 * GET /api/limit-probe?s=NN — FB-1: measure once how long Netlify lets a synchronous function run on this site.
 * It only waits NN seconds (1–58) and answers { waited: NN }. No AI call, nothing stored, nothing logged.
 * Off unless the environment variable AI_LIMIT_PROBE is exactly "on": otherwise 404, as if it did not exist.
 * How to use it and then set AI_SYNC_BUDGET_MS: docs/AI_SETUP.md.
 */
const probeOn = () => {
  const g = globalThis as { Netlify?: { env: { get(k: string): string | undefined } } }
  return (g.Netlify?.env.get("AI_LIMIT_PROBE") ?? process.env.AI_LIMIT_PROBE ?? "").trim() === "on"
}

export default async (req: Request) => {
  if (!probeOn()) return json({ message: "Not found." }, 404)
  const raw = new URL(req.url).searchParams.get("s") ?? ""
  const s = /^\d{1,2}$/.test(raw) ? Number(raw) : NaN
  if (!(s >= 1 && s <= 58)) return json({ error: "bad_request", message: "Use ?s= with a whole number of seconds from 1 to 58." }, 400)
  await new Promise(resolve => setTimeout(resolve, s * 1000))
  return json({ waited: s })
}
export const config: Config = { path: "/api/limit-probe", method: "GET" }
