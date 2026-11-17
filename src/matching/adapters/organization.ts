import type { DemoState } from "../../data/types"
import { isOfficer } from "../../data/permissions"
import type { MatchingReferences, MatchingState } from "../contracts"
import { parseMatchingState } from "../repository"
import { parseMatchingMutationContext } from "../validation"
import { parseSetupDocument } from "../setupWorkspace"

export const matchingModeEnabled = (state: DemoState): boolean => state.org.settings.matchingMode === "responsibilities"
export const eventMatchingWorkflowId = (state: DemoState): string => state.org.eventWorkflow ? "club-event" : "seo-event"
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

/** Names and current membership come from the business roster; local qualification settings can only restrict eligibility. */
export function organizationMatchingReferences(state: DemoState): MatchingReferences {
  const settings = object(state.matchingContext?.memberSettings) ? state.matchingContext.memberSettings : {}
  return {
    organizationId: state.org.matchingWorkspaceId ?? "matching-not-initialized",
    roles: state.roles.map(role => ({ id: role.id, title: role.displayName })),
    members: state.people.map(person => {
      const setting = Object.hasOwn(settings, person.id) ? settings[person.id] : undefined
      return { id: person.id, name: person.name, active: isOfficer(person) && (setting?.active ?? true), availability: setting?.availability ?? "unknown", qualifications: setting?.qualifications ?? {} }
    }),
  }
}

/** Corrupt or foreign config does not turn an enabled organization back into legacy assignment. */
export function validOrganizationMatching(state: DemoState): MatchingState | null {
  try {
    const context = state.matchingContext, workspace = state.org.matchingWorkspaceId
    if (!workspace || !context || !object(context) || !object(context.memberSettings) || !Array.isArray(context.overrides)
      || !context.setup || context.setup.id !== workspace || !Number.isSafeInteger(context.setup.revision) || context.setup.revision < 0
      || !Array.isArray(context.setup.audit)) return null
    for (const setting of Object.values(context.memberSettings)) {
      if (!object(setting) || typeof setting.active !== "boolean" || !["available", "unavailable", "unknown"].includes(setting.availability as string)
        || !object(setting.qualifications) || Object.values(setting.qualifications).some(value => !["confirmed", "missing", "unknown"].includes(value as string))) return null
    }
    const matching = parseMatchingState(state.matching, workspace)
    const references = parseMatchingMutationContext({ operationId: "validate-business-references", actorId: "validate", at: "2026-11-16T00:00:00Z", expectedRevision: 0, references: organizationMatchingReferences(state) }).references
    parseSetupDocument({ ...context.setup, matching, references })
    for (const row of context.overrides) if (!object(row) || typeof row.id !== "string" || typeof row.taskId !== "string"
      || (row.memberId !== null && typeof row.memberId !== "string") || (row.responsibilityId !== null && typeof row.responsibilityId !== "string")
      || typeof row.actorId !== "string" || typeof row.at !== "string" || row.reason !== "explicit_manual_assignment") return null
    return matching
  } catch { return null }
}
