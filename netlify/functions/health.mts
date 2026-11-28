import {
  AIR_MODELS,
  MODEL_POLICY_VERSION,
} from "../../src/lib/modelPolicy.ts";
import type { Config } from "@netlify/functions";
import { getConfig, isConfigured, syncAiBudgetMs } from "../lib/ai.mts";
import { json } from "../lib/http.mts";
/** Reports whether AI is configured, the server's AI time budget and the AIR routing; never the key. */
export default async (_req: Request) => {
  const c = getConfig(),
    base = {
      ok: true,
      configured: isConfigured(c),
      provider: c.label,
      model: c.model || null,
      // FB-1: how long a synchronous AI call may take on the server; the browser waits this plus 4 s (src/lib/api.ts).
      syncBudgetMs: syncAiBudgetMs(),
      ...(c.label === "ASU AIR"
        ? { routing: { version: MODEL_POLICY_VERSION, models: AIR_MODELS } }
        : {}),
    };
  return json(base);
};
export const config: Config = { path: "/api/health", method: "GET" };
