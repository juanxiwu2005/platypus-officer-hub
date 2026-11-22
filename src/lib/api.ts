/**
 * Client for the server endpoints in netlify/functions (/api/*). The AI key lives only on the server.
 * If the server has no AI configured, or a call fails, callers fall back to simulated results
 * so a demo never breaks.
 */
export interface Health {
  ok: boolean
  configured: boolean
  provider: string | null
  model: string | null
  /** FB-1: the server's time budget for one synchronous AI call, in ms (AI_SYNC_BUDGET_MS, 10–55 s). */
  syncBudgetMs?: number
}

/** A failed request, with the HTTP status so callers can tell "try again" from "sign in again". */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

/**
 * How long the browser waits for an AI endpoint when it does not know the server's budget yet: 30 s. The server gives
 * up after its budget (syncAiBudgetMs() in netlify/lib/ai.mts, 26 s by default), so waiting longer only makes a person
 * wait for nothing. Use aiWaitMs() where possible: it follows the budget the server reports.
 */
export const AI_WAIT_MS = 30_000
/** The browser waits this much longer than the server's budget: room for the network and a cold start. */
export const AI_WAIT_MARGIN_MS = 4_000

let serverBudgetMs: number | null = null
let budgetRead: Promise<number | null> | null = null
/** Keep the budget /api/health reported, if it is a sane number (the server keeps it within 10–55 s). */
function rememberBudget(v: unknown) {
  if (typeof v === "number" && Number.isFinite(v) && v >= 10_000 && v <= 55_000) serverBudgetMs = Math.round(v)
}
/** The server's synchronous AI budget in ms, once /api/health has reported it; null until then. */
export const aiBudgetMs = (): number | null => serverBudgetMs
/** How long the browser waits for one AI answer: the server's budget plus 4 s, or 30 s while that is unknown. */
export const aiWaitMs = (): number => serverBudgetMs === null ? AI_WAIT_MS : serverBudgetMs + AI_WAIT_MARGIN_MS
/** Read the server's budget from /api/health once per page load (later calls share the first answer). */
export function readAiBudget(): Promise<number | null> {
  budgetRead ??= getHealth().then(() => serverBudgetMs)
  return budgetRead
}
/** Tests only: forget what /api/health said. */
export function resetAiBudget(value: number | null = null) { serverBudgetMs = null; budgetRead = null; rememberBudget(value) }

/** Why an AI request produced nothing: it ran out of time, or the service refused or was not reachable. */
export type AiMiss = "timeout" | "unavailable"
export const aiMiss = (e: unknown): AiMiss =>
  (e instanceof ApiError && (e.status === 504 || e.status === 408)) || (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "AbortError") ? "timeout" : "unavailable"

/** Thrown when the person pressed Stop (the caller's AbortSignal), as opposed to the request running out of time. */
export class StoppedError extends Error {
  name = "StoppedError"
  constructor() { super("Stopped") }
}
export const wasStopped = (e: unknown) => e instanceof StoppedError

/**
 * One request to /api. `signal` (FB-1): the person's Stop button; aborting it ends the request at once with a StoppedError,
 * which callers tell apart from a timeout (an AbortError from the time limit) with wasStopped().
 */
export async function callApi<T>(path: string, body?: unknown, timeoutMs = 30_000, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new StoppedError()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const stop = () => ctrl.abort()
  signal?.addEventListener("abort", stop)
  try {
    const res = await fetch("/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = (await res.json().catch(() => ({}))) as T & { message?: string }
    if (signal?.aborted) throw new StoppedError()
    if (!res.ok) throw new ApiError(data.message || `HTTP ${res.status}`, res.status)
    return data
  } catch (e) {
    if (signal?.aborted) throw new StoppedError()
    throw e
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", stop)
  }
}

export async function getHealth(): Promise<Health> {
  try {
    const h = await callApi<Health>("/health", undefined, 8_000)
    rememberBudget(h.syncBudgetMs)
    return h
  } catch {
    return { ok: false, configured: false, provider: null, model: null }
  }
}
