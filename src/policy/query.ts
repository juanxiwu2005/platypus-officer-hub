import { POLICY_CATALOG } from "./catalog"
import type { PolicyContext, PolicyRecord, PolicySource } from "./types"

const matches = (policy: PolicyRecord, context: PolicyContext) => policy.conditions.every(condition => {
  const value = context[condition.field]
  if (condition.equals !== undefined) return value === condition.equals
  return typeof value === "number" && condition.min !== undefined && value >= condition.min
})

/** A deterministic, conservative selection. Unknown context does not trigger conditional policy. */
export const applicablePolicies = (context: PolicyContext = {}) => POLICY_CATALOG.policies.filter(policy => matches(policy, context))
export const policyById = (id: string) => POLICY_CATALOG.policies.find(policy => policy.id === id)
export const sourceById = (id: string): PolicySource | undefined => POLICY_CATALOG.sources.find(source => source.id === id)

/** Compact, structured input for an AI. It conveys source and uncertainty without letting the model invent rules. */
export const policyContextForAi = (context: PolicyContext = {}) => applicablePolicies(context).map(policy => ({
  id: policy.id,
  title: policy.title,
  requirement: policy.requirement,
  deadline: policy.deadline,
  status: policy.status,
  sources: policy.sources.map(id => {
    const source = sourceById(id)
    return source && { id: source.id, title: source.title, url: source.url, evidence: source.evidence, scope: source.scope, capturedOn: source.capturedOn }
  }).filter(Boolean),
}))

/** The date engine consumes only official hard deadlines; planning buffers stay separate. */
export const hardDeadline = (policyId: string) => {
  const deadline = policyById(policyId)?.deadline
  return deadline?.kind === "hard" ? deadline : undefined
}
