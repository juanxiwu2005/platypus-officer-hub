import { z } from "zod"
import {
  MATCHING_TEXT_LIMIT, type MatchingExtractionRequest, type MatchingExtractionResponse,
} from "./setupContracts"

const id = z.string().min(1).max(200).refine(value => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value))
const title = z.string().trim().min(1).max(180)
const bodyText = z.string().max(2000)
const ids = z.array(id).max(200).refine(values => new Set(values).size === values.length)
const requestSchema = z.object({
  part: z.literal("responsibilities"), requestId: id, sourceId: id,
  text: z.string().min(20).max(MATCHING_TEXT_LIMIT).refine(value => value.trim().length >= 20),
  roles: z.array(z.object({ id, title }).strict()).max(100),
  existingResponsibilities: z.array(z.object({ id, title, description: bodyText, deliverable: bodyText }).strict()).max(500),
  targetRoleIds: ids.optional(),
}).strict()
const proposalSchema = z.object({
  id, title, description: bodyText.refine(value => Boolean(value.trim())),
  deliverable: bodyText.refine(value => Boolean(value.trim())),
  exclusions: z.array(z.string().max(500)).max(100), requiredQualificationIds: ids, roleIds: ids,
  source: z.object({ kind: z.enum(["constitution", "suggestion"]), sourceId: id, quote: z.string().max(6000), verified: z.boolean() }).strict(),
}).strict()
const responseSchema = z.object({
  part: z.literal("responsibilities"), requestId: id, sourceId: id,
  proposals: z.array(proposalSchema).max(40), warnings: z.array(z.string().max(1000)).max(100),
  model: z.string().max(200).optional(), provider: z.string().max(200).optional(),
}).strict()

/** Shared request validation, also used at the server boundary before any paid call. */
export function validateMatchingExtractionRequest(raw: unknown): MatchingExtractionRequest {
  const parsed = requestSchema.safeParse(raw)
  if (!parsed.success) throw new Error("The responsibility request is incomplete or too large. Keep your work and check the source and positions.")
  const request = parsed.data
  if (new Set(request.roles.map(role => role.id)).size !== request.roles.length
    || new Set(request.existingResponsibilities.map(duty => duty.id)).size !== request.existingResponsibilities.length
    || request.targetRoleIds?.some(roleId => !request.roles.some(role => role.id === roleId)))
    throw new Error("Use unique positions and responsibilities, and retry only positions in this team.")
  return request
}

/** Only exact quotations from this request can remain verified, even when restoring a saved reply. */
export function validateMatchingExtractionResponse(raw: unknown, rawRequest: MatchingExtractionRequest): MatchingExtractionResponse {
  const request = validateMatchingExtractionRequest(rawRequest)
  const parsed = responseSchema.safeParse(raw)
  if (!parsed.success || parsed.data.requestId !== request.requestId || parsed.data.sourceId !== request.sourceId)
    throw new Error("The AI response does not match this saved reading. Your existing responsibilities are safe.")
  const response = parsed.data
  if (new Set(response.proposals.map(proposal => proposal.id)).size !== response.proposals.length)
    throw new Error("The AI response contains duplicate suggestion identities. Retry the affected positions.")
  const allowedRoles = new Set(request.targetRoleIds ?? request.roles.map(role => role.id))
  const warnings = [...response.warnings]
  const proposals = response.proposals.map(proposal => {
    if (proposal.source.sourceId !== request.sourceId || proposal.roleIds.some(roleId => !allowedRoles.has(roleId)))
      throw new Error("The AI response refers to another source or position. Your existing responsibilities are safe.")
    const supported = proposal.source.kind === "constitution" && proposal.source.verified
      && proposal.source.quote.trim().length >= 3 && request.text.includes(proposal.source.quote)
    if (proposal.source.kind === "constitution" && !supported)
      warnings.push(`The quotation for “${proposal.title}” could not be verified. Treat it as a suggestion.`)
    return { ...proposal, source: { ...proposal.source, kind: supported ? "constitution" as const : "suggestion" as const, verified: supported } }
  })
  return { ...response, proposals, warnings: [...new Set(warnings)].slice(0, 100) }
}

/** One explicit user action makes one request. Abort stops waiting, not a provider's already-started work. */
export async function extractMatchingResponsibilities(raw: MatchingExtractionRequest, options: { signal?: AbortSignal } = {}): Promise<MatchingExtractionResponse> {
  const request = validateMatchingExtractionRequest(raw)
  const controller = new AbortController()
  const stop = () => controller.abort()
  if (options.signal?.aborted) throw new DOMException("Reading stopped.", "AbortError")
  options.signal?.addEventListener("abort", stop, { once: true })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, 40_000)
  try {
    const response = await fetch("/api/setup/constitution", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(request), signal: controller.signal,
    })
    const text = await response.text()
    if (text.length > 500_000) throw new Error("The AI response is too large to review. Retry fewer positions; your work is saved.")
    let data: unknown
    try { data = JSON.parse(text) } catch { throw new Error("The reading returned an unreadable response. Continue manually or retry the affected positions.") }
    if (!response.ok) {
      const message = data && typeof data === "object" && "message" in data && typeof data.message === "string" ? data.message.slice(0, 500) : "The reading could not finish. Continue manually or retry the affected positions."
      throw new Error(message)
    }
    if (controller.signal.aborted) throw new DOMException("Reading stopped.", "AbortError")
    return validateMatchingExtractionResponse(data, request)
  } catch (error) {
    if (timedOut) throw new Error("The reading took too long. Your work is saved; continue manually or retry fewer positions.")
    if (options.signal?.aborted) throw new DOMException("Reading stopped.", "AbortError")
    if (error instanceof TypeError) throw new Error("The reading could not connect. Your work is saved and you can continue manually.")
    throw error
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener("abort", stop)
  }
}
