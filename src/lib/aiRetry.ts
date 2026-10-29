import { callApi } from "./api"

/**
 * One short AI request, tried up to three times with a pause between, for as long as `current()` says the answer is still wanted.
 * A request here may last only 30 seconds and the AI answers one at a time, so one slow or busy moment should not lose the whole job.
 */
export async function callRetry<T>(path: string, body: unknown, current: () => boolean = () => true, tries = 3, timeoutMs = 45_000): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries && current(); i++) {
    try { return await callApi<T>(path, body, timeoutMs) } catch (e) { last = e; await new Promise(r => setTimeout(r, 800 * (i + 1))) }
  }
  throw last instanceof Error ? last : new Error("Cancelled")
}
export const whyFailed = (e: unknown) => e instanceof Error && e.message ? ` (${e.message.replace(/\.$/, "").slice(0, 120)})` : ""
