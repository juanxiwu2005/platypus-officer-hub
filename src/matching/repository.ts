import type { MatchingLoadResult, MatchingState, MatchingStorage } from "./contracts"
import { MatchingError } from "./errors"
import { createEmptyMatchingState } from "./library"
import { canonical, validateMatchingId, validateMatchingState } from "./validation"

const MAX_SNAPSHOT_CHARS = 4_000_000

export function parseMatchingState(input: unknown, expectedOrganizationId?: string): MatchingState {
  return validateMatchingState(input, expectedOrganizationId)
}

export function encodeMatchingState(state: MatchingState): string {
  const encoded = JSON.stringify(parseMatchingState(state))
  if (encoded.length > MAX_SNAPSHOT_CHARS) throw new MatchingError("invalid_input", "The matching snapshot is too large to save in this prototype.")
  return encoded
}

export function decodeMatchingState(raw: string, expectedOrganizationId?: string): MatchingState {
  if (typeof raw !== "string" || raw.length > MAX_SNAPSHOT_CHARS) throw new MatchingError("invalid_input", "The matching snapshot is missing or too large.")
  let data: unknown
  try { data = JSON.parse(raw) } catch { throw new MatchingError("invalid_input", "The matching snapshot is not valid JSON.") }
  return parseMatchingState(data, expectedOrganizationId)
}

export function matchingStorageKey(organizationId: string): string {
  return `platypus.matching.v1:${encodeURIComponent(validateMatchingId(organizationId))}`
}

export function loadMatchingState(storage: MatchingStorage, organizationId: string): MatchingLoadResult {
  const key = matchingStorageKey(organizationId)
  let raw: string | null
  try { raw = storage.getItem(key) } catch { return { status: "unavailable", state: null, raw: null, issues: ["Matching storage could not be read."] } }
  if (raw === null) return { status: "empty", state: createEmptyMatchingState(organizationId), raw, issues: [] }
  try { return { status: "loaded", state: decodeMatchingState(raw, organizationId), raw, issues: [] } }
  catch (error) {
    const status = error instanceof MatchingError && error.code === "unsupported_version" ? "unsupported"
      : error instanceof MatchingError && error.code === "organization_mismatch" ? "organization_mismatch" : "invalid"
    return { status, state: null, raw, issues: error instanceof MatchingError ? [error.message, ...error.issues] : ["Invalid matching snapshot."] }
  }
}

/** Optimistic stale-write protection only: browser get/check/set is not an atomic cross-tab CAS. */
export function saveMatchingState(storage: MatchingStorage, state: MatchingState, expectedStoredRevision: number | null): void {
  const valid = parseMatchingState(state)
  if (expectedStoredRevision !== null && (!Number.isSafeInteger(expectedStoredRevision) || expectedStoredRevision < 0)) throw new MatchingError("invalid_input", "Use a valid expected storage revision.")
  const encoded = encodeMatchingState(valid)
  const key = matchingStorageKey(valid.organizationId)
  let old: string | null
  try { old = storage.getItem(key) } catch { throw new MatchingError("storage_unavailable", "Matching storage could not be read; nothing was saved.") }
  if (old === null) {
    if (expectedStoredRevision !== null) throw new MatchingError("conflict", "The saved matching snapshot is missing; do not overwrite without checking.")
  } else {
    // A malformed, foreign or newer-version snapshot must survive unchanged for recovery.
    const previous = decodeMatchingState(old, valid.organizationId)
    if (expectedStoredRevision === null) throw new MatchingError("conflict", "A matching snapshot already exists.")
    if (canonical(previous) === canonical(valid)) return
    if (previous.revision !== expectedStoredRevision) throw new MatchingError("conflict", "Matching storage changed. Keep your draft and reload.")
    if (valid.revision <= previous.revision) throw new MatchingError("conflict", "Do not replace a newer or equal revision with different data.")
  }
  try { storage.setItem(key, encoded) } catch { throw new MatchingError("storage_unavailable", "Matching storage could not be written; keep the current draft.") }
}
