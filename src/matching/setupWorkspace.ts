import { z } from "zod"
import type { MatchingCommand, MatchingReferences, MatchingStorage } from "./contracts"
import { MatchingError } from "./errors"
import { applyMatchingCommand, createEmptyMatchingState } from "./library"
import { parseMatchingState } from "./repository"
import { canonical, parseMatchingMutationContext } from "./validation"
import {
  MATCHING_SETUP_KEY, MATCHING_SETUP_VERSION, MATCHING_TEXT_LIMIT,
  type MatchingExtractionRequest, type MatchingExtractionResponse, type MatchingSetupDocument,
  type MatchingSetupInitial, type MatchingSetupSource,
} from "./setupContracts"

const identifier = z.string().min(1).max(200)
const stamp = z.iso.datetime({ offset: true })
const sourceSchema = z.object({ name: z.string().min(1).max(200), text: z.string().max(MATCHING_TEXT_LIMIT) }).strict()
const requestSchema = z.object({
  part: z.literal("responsibilities"), requestId: identifier, sourceId: identifier, text: z.string().min(20).max(MATCHING_TEXT_LIMIT),
  roles: z.array(z.object({ id: identifier, title: z.string().min(1).max(180) }).strict()).max(100),
  existingResponsibilities: z.array(z.object({ id: identifier, title: z.string().max(180), description: z.string().max(2000), deliverable: z.string().max(2000) }).strict()).max(500),
  targetRoleIds: z.array(identifier).max(100).optional(),
}).strict()
const proposalSchema = z.object({
  id: identifier, title: z.string().min(1).max(180), description: z.string().max(2000), deliverable: z.string().max(2000),
  exclusions: z.array(z.string().max(500)).max(100), requiredQualificationIds: z.array(identifier).max(200), roleIds: z.array(identifier).max(100),
  source: z.object({ kind: z.enum(["constitution", "suggestion"]), sourceId: identifier, quote: z.string().max(6000), verified: z.boolean() }).strict(),
}).strict()
const responseSchema = z.object({
  part: z.literal("responsibilities"), requestId: identifier, sourceId: identifier,
  proposals: z.array(proposalSchema).max(40), warnings: z.array(z.string().max(1000)).max(100),
  model: z.string().max(200).optional(), provider: z.string().max(200).optional(),
}).strict()
const documentSchema = z.object({
  version: z.literal(MATCHING_SETUP_VERSION), id: identifier, contextKey: z.string().min(1).max(40_000),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), updatedAt: stamp,
  matching: z.unknown(), references: z.unknown(), source: sourceSchema,
  reads: z.array(z.object({
    id: identifier, at: stamp, actorId: identifier, request: requestSchema,
    status: z.enum(["pending", "completed", "failed", "stopped", "stale", "interrupted"]), response: responseSchema.nullable(), message: z.string().max(2000).nullable(),
  }).strict()).max(100),
  decisions: z.array(z.object({ readId: identifier, proposalId: identifier, decision: z.enum(["accepted", "rejected"]), responsibilityId: identifier.nullable(), actorId: identifier, at: stamp }).strict()).max(2000),
  audit: z.array(z.object({ revision: z.number().int().positive(), actorId: identifier, at: stamp, kind: z.enum(["commands", "references", "source", "read", "decision", "example"]), detail: z.unknown() }).strict()).max(5000),
}).strict()

const now = () => new Date().toISOString()
export const setupId = () => crypto.randomUUID()
export const setupStorageKey = (contextKey: string) => `${MATCHING_SETUP_KEY}:${encodeURIComponent(contextKey)}`

export function prepareSetupSource(source: MatchingSetupSource): MatchingSetupSource {
  const valid = sourceSchema.parse(source)
  if (/(?:api[_ -]?key|password|secret)\s*[:=]\s*\S+/i.test(valid.text)) throw new Error("Remove credentials before saving or reading this fictional document.")
  return { ...valid, text: valid.text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[contact redacted]")
    .replace(/\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone redacted]") }
}

function refs(value: unknown, organizationId: string): MatchingReferences {
  const parsed = parseMatchingMutationContext({ operationId: "validate", actorId: "validate", at: "2026-11-16T00:00:00Z", expectedRevision: 0, references: value }).references
  if (parsed.organizationId !== organizationId) throw new MatchingError("organization_mismatch", "This preview belongs to a different workspace.")
  return parsed
}
const distinct = (values: string[]) => new Set(values).size === values.length

export function parseSetupDocument(value: unknown, contextKey?: string): MatchingSetupDocument {
  const parsed = documentSchema.safeParse(value)
  if (!parsed.success) throw new MatchingError("invalid_input", "The saved setup preview could not be validated. Download it before recovering.")
  const data = parsed.data
  if (contextKey !== undefined && data.contextKey !== contextKey) throw new MatchingError("organization_mismatch", "This setup preview belongs to a different team snapshot.")
  const matching = parseMatchingState(data.matching, data.id)
  const references = refs(data.references, data.id)
  if (!distinct(data.reads.map(r => r.id)) || !distinct(data.decisions.map(d => canonical([d.readId, d.proposalId])))) throw new MatchingError("invalid_input", "Duplicate setup request or decision IDs.")
  for (const read of data.reads) {
    if (read.id !== read.request.requestId || !distinct(read.request.roles.map(r => r.id))) throw new MatchingError("invalid_input", "Invalid saved request identity.")
    const response = read.response
    if (!response) { if (read.status === "completed") throw new MatchingError("invalid_input", "A completed reading needs its saved result."); continue }
    if (response.requestId !== read.id || response.sourceId !== read.request.sourceId || !distinct(response.proposals.map(p => p.id))) throw new MatchingError("invalid_input", "Invalid saved response identity.")
    for (const proposal of response.proposals) {
      if (proposal.source.sourceId !== read.request.sourceId || proposal.roleIds.some(id => !read.request.roles.some(r => r.id === id))
        || (read.request.targetRoleIds && proposal.roleIds.some(id => !read.request.targetRoleIds!.includes(id)))
        || (proposal.source.verified && (proposal.source.kind !== "constitution" || !proposal.source.quote.trim() || !read.request.text.includes(proposal.source.quote)))
        || (proposal.source.kind === "constitution" && !proposal.source.verified)) throw new MatchingError("invalid_input", "A saved proposal has an unsupported role or source citation.")
    }
  }
  for (const decision of data.decisions) {
    if (!data.reads.some(r => r.id === decision.readId && r.response?.proposals.some(p => p.id === decision.proposalId))
      || (decision.decision === "accepted" && (!decision.responsibilityId || !matching.responsibilities.some(r => r.id === decision.responsibilityId)))) throw new MatchingError("invalid_input", "A saved proposal decision has a missing reference.")
  }
  if (data.audit.some((e, i) => e.revision > data.revision || (i > 0 && e.revision <= data.audit[i - 1].revision))
    || (data.audit.length > 0 && data.audit.at(-1)!.revision !== data.revision)) throw new MatchingError("invalid_input", "The setup history does not match its revision.")
  return { ...data, matching, references }
}

export function createSetupDocument(initial: MatchingSetupInitial): MatchingSetupDocument {
  const id = setupId(), at = now()
  const references = { ...initial.references, organizationId: id }
  let matching = initial.matching ? parseMatchingState({ ...initial.matching, organizationId: id }, id) : createEmptyMatchingState(id)
  for (const membership of initial.matching ? [] : initial.memberships) matching = applyMatchingCommand(matching, { type: "membership.upsert", value: membership }, {
    operationId: setupId(), actorId: "team-snapshot", at, expectedRevision: matching.revision, references,
  })
  return parseSetupDocument({ version: 1, id, contextKey: initial.contextKey, revision: 0, updatedAt: at, matching, references, source: { name: "Constitution", text: "" }, reads: [], decisions: [], audit: [] })
}

export function loadSetupDocument(storage: MatchingStorage, initial: MatchingSetupInitial): { document: MatchingSetupDocument | null; raw: string | null; error: string | null; storedRevision: number | null } {
  let raw: string | null = null
  try {
    raw = storage.getItem(setupStorageKey(initial.contextKey))
    if (raw === null) return { document: createSetupDocument(initial), raw, error: null, storedRevision: null }
    if (raw.length > 5_000_000) throw new Error("The saved preview exceeds the prototype size limit.")
    const document = parseSetupDocument(JSON.parse(raw), initial.contextKey)
    return { document, raw, error: null, storedRevision: document.revision }
  } catch (error) { return { document: null, raw, error: error instanceof Error ? error.message : "Setup storage is unavailable.", storedRevision: null } }
}

export function saveSetupDocument(storage: MatchingStorage, document: MatchingSetupDocument, expectedRevision: number | null): void {
  const valid = parseSetupDocument(document)
  const key = setupStorageKey(valid.contextKey), encoded = JSON.stringify(valid)
  if (encoded.length > 5_000_000) throw new Error("This preview is too large to save. Export it before continuing.")
  let previous: string | null
  try { previous = storage.getItem(key) } catch { throw new Error("Storage could not be read. Keep this page open and export your preview.") }
  if (previous === null) {
    if (expectedRevision !== null) throw new Error("The saved preview changed. Export your draft and reload before continuing.")
  } else {
    const old = parseSetupDocument(JSON.parse(previous), valid.contextKey)
    if (expectedRevision === null || old.id !== valid.id || old.revision !== expectedRevision || valid.revision <= old.revision) throw new Error("This preview changed in another tab. Export your draft and reload before continuing.")
  }
  try { storage.setItem(key, encoded) } catch { throw new Error("Your preview could not be saved. Keep this page open and export it before leaving.") }
}

type Patch = Partial<Pick<MatchingSetupDocument, "matching" | "references" | "source" | "reads" | "decisions">>
function revise(document: MatchingSetupDocument, patch: Patch, actorId: string, kind: MatchingSetupDocument["audit"][number]["kind"], detail: unknown): MatchingSetupDocument {
  const at = now(), revision = document.revision + 1
  const next: MatchingSetupDocument = { ...document, ...patch, revision, updatedAt: at, audit: [...document.audit, { revision, actorId, at, kind, detail }] }
  next.reads = next.reads.map(read => (read.status === "completed" || read.status === "pending") && !isSetupReadCurrent(next, read.id)
    ? { ...read, status: "stale", message: "The source, positions or existing responsibilities changed. Read again explicitly before adopting these suggestions." } : read)
  return parseSetupDocument(next)
}

export function commandSetup(document: MatchingSetupDocument, commands: MatchingCommand[], actorId: string): MatchingSetupDocument {
  let matching = document.matching
  for (const command of commands) matching = applyMatchingCommand(matching, command, { operationId: setupId(), actorId, at: now(), expectedRevision: matching.revision, references: document.references })
  return matching === document.matching ? document : revise(document, { matching }, actorId, "commands", commands)
}
export function referenceSetup(document: MatchingSetupDocument, references: MatchingReferences, actorId: string): MatchingSetupDocument {
  const valid = refs(references, document.id)
  return canonical(valid) === canonical(document.references) ? document : revise(document, { references: valid }, actorId, "references", valid)
}
export function sourceSetup(document: MatchingSetupDocument, source: MatchingSetupSource, actorId: string): MatchingSetupDocument {
  const valid = prepareSetupSource(source)
  return canonical(valid) === canonical(document.source) ? document : revise(document, { source: valid }, actorId, "source", { name: valid.name, chars: valid.text.length })
}
const activeResponsibilities = (document: MatchingSetupDocument, excluding: string[] = []) => document.matching.responsibilities
  .filter(r => r.status !== "archived" && !excluding.includes(r.id)).map(({ id, title, description, deliverable }) => ({ id, title, description, deliverable })).sort((a, b) => a.id.localeCompare(b.id))
const orderedRoles = (roles: MatchingReferences["roles"]) => [...roles].sort((a, b) => a.id.localeCompare(b.id))

export function isSetupReadCurrent(document: MatchingSetupDocument, readId: string): boolean {
  const read = document.reads.find(r => r.id === readId)
  if (!read) return false
  const adopted = document.decisions.filter(d => d.readId === readId && d.decision === "accepted" && d.responsibilityId).map(d => d.responsibilityId!)
  return read.request.text === document.source.text
    && canonical(orderedRoles(read.request.roles)) === canonical(orderedRoles(document.references.roles))
    && canonical([...read.request.existingResponsibilities].sort((a, b) => a.id.localeCompare(b.id))) === canonical(activeResponsibilities(document, adopted))
}

export function beginSetupRead(document: MatchingSetupDocument, source: MatchingSetupSource, actorId: string, targetRoleIds?: string[]): MatchingSetupDocument {
  if (document.reads.some(r => r.status === "pending")) throw new Error("Stop the current reading before starting another.")
  const validSource = prepareSetupSource(source)
  if (validSource.text.trim().length < 20) throw new Error("Add at least 20 characters of constitution text first.")
  if (targetRoleIds && (!distinct(targetRoleIds) || targetRoleIds.some(id => !document.references.roles.some(r => r.id === id)))) throw new Error("Choose current positions for this reading.")
  if (document.references.roles.length > 100 || activeResponsibilities(document).length > 500) throw new Error("This prototype reads up to 100 positions and 500 existing responsibilities. Continue manually or export this larger setup.")
  const request: MatchingExtractionRequest = { part: "responsibilities", requestId: setupId(), sourceId: setupId(), text: validSource.text,
    roles: document.references.roles, existingResponsibilities: activeResponsibilities(document), ...(targetRoleIds === undefined ? {} : { targetRoleIds }) }
  return revise(document, { source: validSource, reads: [...document.reads, { id: request.requestId, at: now(), actorId, request, status: "pending", response: null, message: null }] }, actorId, "read", { action: "started", requestId: request.requestId })
}

export function finishSetupRead(document: MatchingSetupDocument, readId: string, actorId: string, result: { response: MatchingExtractionResponse } | { status: "failed" | "stopped" | "interrupted"; message: string }): MatchingSetupDocument {
  const read = document.reads.find(r => r.id === readId)
  if (!read) throw new Error("This reading no longer belongs to the current preview.")
  const { response, status, message } = "response" in result ? { response: result.response, status: isSetupReadCurrent(document, readId) && read.status === "pending" ? "completed" as const : "stale" as const, message: null }
    : { response: read.response, status: read.status === "pending" ? result.status : read.status, message: result.message }
  return revise(document, { reads: document.reads.map(r => r.id === readId ? { ...r, response, status, message } : r) }, actorId, "read", { action: status, requestId: readId, message })
}

export function decideSetupProposal(document: MatchingSetupDocument, readId: string, proposalId: string, decision: "accepted" | "rejected", actorId: string): MatchingSetupDocument {
  if (document.decisions.some(d => d.readId === readId && d.proposalId === proposalId)) return document
  const read = document.reads.find(r => r.id === readId), proposal = read?.response?.proposals.find(p => p.id === proposalId)
  if (!read || !proposal || read.status !== "completed" || !isSetupReadCurrent(document, readId)) throw new Error("These suggestions are outdated or incomplete. Read again explicitly, or add a responsibility manually.")
  let matching = document.matching
  const responsibilityId = decision === "accepted" ? setupId() : null
  if (responsibilityId) {
    const commands: MatchingCommand[] = [{ type: "responsibility.create", value: {
      id: responsibilityId, title: proposal.title, description: proposal.description, deliverable: proposal.deliverable,
      exclusions: proposal.exclusions, requiredQualificationIds: proposal.requiredQualificationIds, origin: "ai",
      sources: [{ kind: proposal.source.kind, sourceId: read.request.sourceId, ...(proposal.source.quote ? { quote: proposal.source.quote } : {}), note: proposal.source.verified ? "Exact quote checked against the saved input; adopted as an unconfirmed draft." : "AI suggestion; not verified as a constitution fact." }],
    } }, ...proposal.roleIds.map(roleId => ({ type: "roleBinding.upsert" as const, value: { id: setupId(), roleId, responsibilityId, confirmed: false } }))]
    for (const command of commands) matching = applyMatchingCommand(matching, command, { operationId: setupId(), actorId, at: now(), expectedRevision: matching.revision, references: document.references })
  }
  return revise(document, { matching, decisions: [...document.decisions, { readId, proposalId, decision, responsibilityId, actorId, at: now() }] }, actorId, "decision", { readId, proposalId, decision, responsibilityId })
}
