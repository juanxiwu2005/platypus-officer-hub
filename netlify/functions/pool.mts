import type { Config } from "@netlify/functions"
import { json } from "../lib/http.mts"
import { SHARED_POOL } from "../../src/data/sharedPool.ts"

/** GET /api/pool — the read-only shared pool (fictional demo of the v2 cross-club data). No write route exists. */
export default async () => json(SHARED_POOL)
export const config: Config = { path: "/api/pool", method: "GET" }
