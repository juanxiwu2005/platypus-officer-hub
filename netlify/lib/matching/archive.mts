import { createHash, randomUUID } from "node:crypto"
import { getStore } from "@netlify/blobs"
import type { MatchingExtractionRequest, MatchingExtractionResponse } from "../../../src/matching/setupContracts.ts"
import type { ProviderObservation } from "../ai.mts"

/** Private prototype archive only. No archive listing/reading endpoint or account authority is granted by a request ID. */
const store = () => getStore({ name: "platypus-matching-constitution-v1", consistency: "strong" })
const digest = (text: string) => createHash("sha256").update(text).digest("hex")
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`
    : JSON.stringify(value) ?? "null"

export class MatchingReadError extends Error {
  constructor(message: string, readonly status = 503, readonly code = "matching_archive_unavailable") { super(message) }
}
export interface MatchingReadTicket { key: string; fingerprint: string }
interface InputRecord {
  fingerprint: string
  at: string
  request: MatchingExtractionRequest
  prompt: { version: string; system: string; user: string }
  attribution: "unverified-prototype-client"
}
type ResultRecord = { fingerprint: string; at: string; status: "completed"; response: MatchingExtractionResponse }
  | { fingerprint: string; at: string; status: "failed"; message: string }

/** An immutable claim is also the saved input. A crashed/pending call requires an explicit new action, never automatic re-billing. */
export async function beginMatchingRead(request: MatchingExtractionRequest, prompt: InputRecord["prompt"]): Promise<{ ticket: MatchingReadTicket; cached: MatchingExtractionResponse | null }> {
  const ticket = { key: `reads/${digest(request.requestId)}`, fingerprint: digest(canonical(request)) }
  try {
    const blobs = store()
    const prior = await blobs.get(`${ticket.key}/input`, { type: "json" }) as InputRecord | null
    if (prior) return await replay(blobs, ticket, prior)
    const claim = await blobs.setJSON(`${ticket.key}/input`, { fingerprint: ticket.fingerprint, at: new Date().toISOString(), request, prompt, attribution: "unverified-prototype-client" } satisfies InputRecord, { onlyIfNew: true })
    if (!claim.modified) {
      const winner = await blobs.get(`${ticket.key}/input`, { type: "json" }) as InputRecord | null
      if (!winner) throw new MatchingReadError("The saved reading could not be reconciled. Keep your source and try a new reading.")
      return await replay(blobs, ticket, winner)
    }
    return { ticket, cached: null }
  } catch (error) {
    if (error instanceof MatchingReadError) throw error
    throw new MatchingReadError("The reading archive is unavailable. No new AI call was started; you can continue manually.")
  }
}

async function replay(blobs: ReturnType<typeof store>, ticket: MatchingReadTicket, prior: InputRecord) {
  if (prior.fingerprint !== ticket.fingerprint) throw new MatchingReadError("This reading ID was already used for different input. Start a new reading without replacing the saved one.", 409, "matching_request_conflict")
  const result = await blobs.get(`${ticket.key}/result`, { type: "json" }) as ResultRecord | null
  if (result?.fingerprint !== undefined && result.fingerprint !== ticket.fingerprint) throw new MatchingReadError("The saved reading result is inconsistent. Keep your source and start a new reading.")
  if (result?.status === "completed") return { ticket, cached: result.response }
  throw new MatchingReadError(result?.status === "failed"
    ? "This reading already failed. Your input is retained; choose an explicit new reading to retry."
    : "This reading has already started. Wait for it or choose an explicit new reading; it will not be sent twice.", 409, "matching_request_replayed")
}

/** chatJSON awaits this callback before parsing model JSON, including failed transport bytes and all provider attempts. */
export async function archiveMatchingTransport(ticket: MatchingReadTicket, observation: ProviderObservation): Promise<void> {
  try {
    const saved = await store().setJSON(`${ticket.key}/transport/${randomUUID()}`, { at: new Date().toISOString(), fingerprint: ticket.fingerprint, observation }, { onlyIfNew: true })
    if (!saved.modified) throw new Error("The transport archive was not created.")
  } catch { throw new MatchingReadError("The raw AI reply could not be archived. Your input is retained; continue manually until storage recovers.") }
}

export async function finishMatchingRead(ticket: MatchingReadTicket, outcome: { response: MatchingExtractionResponse } | { message: string }): Promise<void> {
  const result: ResultRecord = "response" in outcome
    ? { fingerprint: ticket.fingerprint, at: new Date().toISOString(), status: "completed", response: outcome.response }
    : { fingerprint: ticket.fingerprint, at: new Date().toISOString(), status: "failed", message: outcome.message.slice(0, 1000) }
  try {
    const saved = await store().setJSON(`${ticket.key}/result`, result, { onlyIfNew: true })
    if (!saved.modified) throw new MatchingReadError("The reading outcome is already archived. Reload before another action.", 409, "matching_request_conflict")
  } catch (error) {
    if (error instanceof MatchingReadError) throw error
    throw new MatchingReadError("The reading outcome could not be archived. Its saved input and any raw reply are retained; continue manually.")
  }
}
