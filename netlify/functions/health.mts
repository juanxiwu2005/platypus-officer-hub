import { AIR_MODELS, MODEL_POLICY_VERSION } from "../../src/organization/modelPolicy.ts"
import type { Config } from "@netlify/functions"
import { getConfig, isConfigured } from "../lib/ai.mts"
import { json } from "../lib/http.mts"

/** GET /api/health — tells the page whether live AI is available. Never returns the key. */
export default async () => {
  const c = getConfig()
  return json({ ok: true, configured: isConfigured(c), provider: c.label, model: c.model || null, ...(c.label === "ASU AIR" ? {routing:{version:MODEL_POLICY_VERSION,models:AIR_MODELS}} : {}) })
}

export const config: Config = { path: "/api/health", method: "GET" }
