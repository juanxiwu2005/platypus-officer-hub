import { z } from "zod"
import { MATCHING_SCHEMA_VERSION, type MatchingCommand, type MatchingMutationContext, type MatchingState } from "./contracts"
import { MatchingError } from "./errors"

const id = z.string().min(1).max(200).refine(value => value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value), "Use a nonempty stable ID without control characters or surrounding whitespace.")
const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const positiveRevision = revision.min(1)
const timestamp = z.iso.datetime({ offset: true })
const text = z.string().max(2000)
const distinctIds = z.array(id).max(200).refine(values => new Set(values).size === values.length, "Duplicate IDs are not allowed.")
const origin = z.enum(["manual", "ai", "template"])
const source = z.object({ kind: z.enum(["constitution", "policy", "workflow", "manual", "suggestion"]), sourceId: id, quote: z.string().max(6000).optional(), note: text.optional() }).strict()
const responsibilityFields = {
  title: z.string().trim().min(1).max(180), description: text, deliverable: text,
  exclusions: z.array(z.string().max(500)).max(100), requiredQualificationIds: distinctIds,
  origin, sources: z.array(source).min(1).max(50),
}
const responsibilityInput = z.object({ id, ...responsibilityFields }).strict()
const responsibility = responsibilityInput.extend({ status: z.enum(["draft", "confirmed", "archived"]), revision: positiveRevision, mergedIntoId: id.optional() }).strict()
const roleBinding = z.object({ id, roleId: id, responsibilityId: id, confirmed: z.boolean() }).strict()
const membership = z.object({ id, roleId: id, memberId: id, confirmed: z.boolean() }).strict()
const memberBinding = z.object({ id, memberId: id, responsibilityId: id, decision: z.enum(["include", "exclude"]), confirmed: z.boolean() }).strict()
const requirementInput = z.object({ id, workflowId: id, stepId: id, title: z.string().trim().min(1).max(180), responsibilityId: id.nullable(), status: z.enum(["draft", "confirmed", "needs_split"]), origin }).strict()
const policyInput = z.object({ id, responsibilityId: id, primaryMemberId: id.nullable(), backupMemberId: id.nullable() }).strict()
const assignmentInput = z.object({
  id, taskId: id, workflowId: id, stepId: id, responsibilityId: id, memberId: id,
  method: z.enum(["manual", "default", "backup", "sole_candidate"]), status: z.enum(["proposed", "confirmed"]),
  requirementRevision: positiveRevision, responsibilityRevision: positiveRevision, policyRevision: positiveRevision.nullable(),
}).strict()

export const matchingCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("responsibility.create"), value: responsibilityInput }).strict(),
  z.object({ type: z.literal("responsibility.update"), id, patch: z.object(responsibilityFields).partial().strict() }).strict(),
  z.object({ type: z.literal("responsibility.confirm"), id }).strict(),
  z.object({ type: z.literal("responsibility.archive"), id }).strict(),
  z.object({ type: z.literal("responsibility.merge"), sourceId: id, targetId: id }).strict(),
  z.object({ type: z.literal("roleBinding.upsert"), value: roleBinding }).strict(),
  z.object({ type: z.literal("membership.upsert"), value: membership }).strict(),
  z.object({ type: z.literal("memberBinding.upsert"), value: memberBinding }).strict(),
  z.object({ type: z.literal("requirement.upsert"), value: requirementInput }).strict(),
  z.object({ type: z.literal("policy.upsert"), value: policyInput }).strict(),
  z.object({ type: z.literal("assignment.record"), value: assignmentInput }).strict(),
])

const matchingStateSchema = z.object({
  schemaVersion: z.literal(MATCHING_SCHEMA_VERSION), organizationId: id, revision, updatedAt: timestamp.nullable(),
  responsibilities: z.array(responsibility).max(2000), roleResponsibilities: z.array(roleBinding).max(10000),
  memberships: z.array(membership).max(10000), memberResponsibilities: z.array(memberBinding).max(10000),
  requirements: z.array(requirementInput.extend({ revision: positiveRevision })).max(10000),
  policies: z.array(policyInput.extend({ revision: positiveRevision })).max(2000),
  assignments: z.array(assignmentInput.extend({ stateRevision: positiveRevision, actorId: id, at: timestamp })).max(20000),
  events: z.array(z.object({ operationId: id, actorId: id, at: timestamp, revision: positiveRevision, command: matchingCommandSchema }).strict()).max(20000),
}).strict()

const mutationContextSchema = z.object({
  operationId: id, actorId: id, at: timestamp, expectedRevision: revision,
  references: z.object({
    organizationId: id,
    roles: z.array(z.object({ id, title: z.string().min(1).max(180) }).strict()).max(2000),
    members: z.array(z.object({ id, name: z.string().min(1).max(180), active: z.boolean(), availability: z.enum(["available", "unavailable", "unknown"]), qualifications: z.record(id, z.enum(["confirmed", "missing", "unknown"])) }).strict()).max(10000),
  }).strict(),
}).strict()

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new MatchingError("invalid_input", "Invalid matching data.", result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`))
  return result.data
}

export function validateMatchingId(value: unknown): string { return parse(id, value) }
export function parseMatchingCommand(value: unknown): MatchingCommand { return parse(matchingCommandSchema, value) }

/** Sorting object keys makes transport object-key order irrelevant, while preserving array semantics. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(",")}}`
  return JSON.stringify(value) ?? "null"
}

function unique(values: string[], description: string): void {
  if (new Set(values).size !== values.length) throw new MatchingError("invalid_input", `Duplicate ${description}.`)
}

export function parseMatchingMutationContext(value: unknown): MatchingMutationContext {
  const context = parse(mutationContextSchema, value)
  unique(context.references.roles.map(row => row.id), "role IDs")
  unique(context.references.members.map(row => row.id), "member IDs")
  return context
}

/** Validates the snapshot itself; current people/roles remain external and may have changed since an audit receipt. */
export function validateMatchingState(value: unknown, expectedOrganizationId?: string): MatchingState {
  if (value && typeof value === "object" && "schemaVersion" in value && Number.isSafeInteger((value as { schemaVersion: unknown }).schemaVersion)
    && ((value as { schemaVersion: number }).schemaVersion > 0) && (value as { schemaVersion: unknown }).schemaVersion !== MATCHING_SCHEMA_VERSION)
    throw new MatchingError("unsupported_version", "This matching snapshot uses an unsupported version.")
  const state = parse(matchingStateSchema, value)
  if (expectedOrganizationId !== undefined && state.organizationId !== validateMatchingId(expectedOrganizationId)) throw new MatchingError("organization_mismatch", "This matching snapshot belongs to another organization.")
  const collections = [state.responsibilities, state.roleResponsibilities, state.memberships, state.memberResponsibilities, state.requirements, state.policies, state.assignments]
  for (const rows of collections) unique(rows.map(row => row.id), "record IDs within a collection")
  unique(state.roleResponsibilities.map(row => canonical([row.roleId, row.responsibilityId])), "role/responsibility pairs")
  unique(state.memberships.map(row => canonical([row.roleId, row.memberId])), "role/member pairs")
  unique(state.memberResponsibilities.map(row => canonical([row.memberId, row.responsibilityId])), "member/responsibility decisions")
  unique(state.requirements.map(row => canonical([row.workflowId, row.stepId])), "workflow/step pairs")
  unique(state.policies.map(row => row.responsibilityId), "responsibility policies")
  unique(state.events.map(row => row.operationId), "operation IDs")
  const responsibilities = new Map(state.responsibilities.map(row => [row.id, row]))
  const checkResponsibility = (key: string) => { if (!responsibilities.has(key)) throw new MatchingError("invalid_input", `Unknown responsibility reference: ${key}.`) }
  for (const row of [...state.roleResponsibilities, ...state.memberResponsibilities, ...state.policies, ...state.assignments]) checkResponsibility(row.responsibilityId)
  for (const row of state.requirements) {
    if (row.responsibilityId !== null) checkResponsibility(row.responsibilityId)
    if (row.status === "confirmed" && row.responsibilityId === null) throw new MatchingError("invalid_input", "A confirmed requirement needs a responsibility.")
  }
  for (const row of state.responsibilities) if (row.status === "confirmed" && (!row.description.trim() || !row.deliverable.trim()))
    throw new MatchingError("invalid_input", "Confirmed responsibilities need a description and deliverable.")
  for (const row of state.policies) {
    if (row.backupMemberId && (!row.primaryMemberId || row.primaryMemberId === row.backupMemberId)) throw new MatchingError("invalid_input", "A backup must differ from a configured primary member.")
  }
  for (const row of state.responsibilities) {
    if (!row.mergedIntoId) continue
    if (row.status !== "archived") throw new MatchingError("invalid_input", "Only archived responsibilities may be merge aliases.")
    const visited = new Set([row.id])
    let current: string | undefined = row.mergedIntoId
    while (current) {
      if (visited.has(current)) throw new MatchingError("invalid_input", "Responsibility aliases contain a cycle.")
      visited.add(current); checkResponsibility(current); current = responsibilities.get(current)!.mergedIntoId
    }
  }
  for (let i = 0; i < state.events.length; i++) {
    const event = state.events[i]
    if (event.revision > state.revision || (i > 0 && event.revision <= state.events[i - 1].revision)) throw new MatchingError("invalid_input", "Audit revisions must increase within the snapshot revision.")
  }
  const last = state.events.at(-1)
  if (last && (last.revision !== state.revision || last.at !== state.updatedAt)) throw new MatchingError("invalid_input", "The snapshot head does not match its latest audit event.")
  for (const assignment of state.assignments) {
    if (assignment.stateRevision > state.revision) throw new MatchingError("invalid_input", "An assignment cannot come from a future snapshot revision.")
    const requirement = state.requirements.find(row => row.workflowId === assignment.workflowId && row.stepId === assignment.stepId)
    if (!requirement || assignment.requirementRevision > requirement.revision || assignment.responsibilityRevision > responsibilities.get(assignment.responsibilityId)!.revision)
      throw new MatchingError("invalid_input", "An assignment must reference an existing workflow step and cannot cite future revisions.")
  }
  return state
}
