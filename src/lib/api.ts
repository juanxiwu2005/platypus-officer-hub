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
}

/** A failed request, with the HTTP status so callers can tell "try again" from "sign in again". */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function callApi<T>(path: string, body?: unknown, timeoutMs = 30_000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch("/api" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = (await res.json().catch(() => ({}))) as T & { message?: string }
    if (!res.ok) throw new ApiError(data.message || `HTTP ${res.status}`, res.status)
    return data
  } finally {
    clearTimeout(timer)
  }
}

export async function getHealth(): Promise<Health> {
  try {
    return await callApi<Health>("/health", undefined, 8_000)
  } catch {
    return { ok: false, configured: false, provider: null, model: null }
  }
}
