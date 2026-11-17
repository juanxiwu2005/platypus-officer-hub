export type MatchingErrorCode =
  | "invalid_input"
  | "conflict"
  | "not_found"
  | "duplicate"
  | "merge_conflict"
  | "storage_unavailable"
  | "unsupported_version"
  | "organization_mismatch"

export class MatchingError extends Error {
  constructor(public readonly code: MatchingErrorCode, message: string, public readonly issues: string[] = []) {
    super(message)
    this.name = "MatchingError"
  }
}
