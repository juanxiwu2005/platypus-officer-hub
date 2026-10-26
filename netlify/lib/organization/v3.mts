import {
  ExtractionSchema,
  CompactFlowSchema,
  RiskResultSchema,
  EditSchema,
  responseSchema,
} from "../../../src/organization/responseSchemas.ts";
import {
  upgrade,
  roleContext,
  COLORS,
  applyChanges,
  layoutFlow,
  validateStructure,
  mergeConstitution,
} from "../../../src/organization/setupLogic.ts";
import {
  type SetupDraft,
  type Stage,
} from "../../../src/organization/schema.ts";
import { SETUP_PROMPTS, VERSION } from "./prompts.mts";
import { stripDates } from "../../../src/lib/chatCards.ts";
import { store } from "./storage.mts";
export function v3Request(raw: SetupDraft, stage: Stage, instruction: string) {
  if (!(stage in SETUP_PROMPTS))
    throw new Error("This setup step no longer requires AI.");
  const d = upgrade(raw);
  const roles = roleContext(d).map((r) => ({
    ...r,
    source: d.roles.find((x) => x.id === r.id)?.source,
    quote: d.roles.find((x) => x.id === r.id)?.quote,
  }));
  const flow = d.memberFlow
    ? {
        title: d.memberFlow.title,
        nodes: d.memberFlow.nodes.map(
          ({
            id,
            title,
            roleIds,
            dependsOn,
            dependencyMode,
            accountableRoleId,
          }) => ({
            id,
            title,
            roleIds,
            dependsOn,
            dependencyMode,
            accountableRoleId: accountableRoleId ?? null,
          }),
        ),
      }
    : null;
  const input = {
    organization: { name: d.name, mission: d.mission },
    departments: d.departments.map(({ id, name }) => ({ id, name })),
    roles,
    instruction,
    ...(stage === "constitution"
      ? { constitution: d.source?.text ?? null }
      : {}),
    ...(stage === "edit"
      ? {
          workflow: flow,
          recentConversation: d.messages
            .slice(-8)
            .map(({ role, text }) => ({ role, text })),
        }
      : {}),
    ...(stage === "member_workflow"
      ? { workflowEvidence: workflowEvidence(d.source?.text ?? "") }
      : {}),
  };
  return {
    input,
    system: SETUP_PROMPTS[stage as keyof typeof SETUP_PROMPTS],
    version: VERSION,
    responseSchema: responseSchema(d, stage),
  };
}
function workflowEvidence(text: string) {
  return text
    .split(/\n/)
    .filter((x) =>
      /workflow|program|opportunit|invitation|meeting|review|approval|authorit|commitment/i.test(
        x,
      ),
    )
    .join("\n")
    .slice(0, 10000);
}
export function validateV3(stage: Stage, raw: unknown, draft: SetupDraft) {
  const d = upgrade(draft);
  // Date-like free text never becomes an executable deadline. IDs/quotes remain exact.
  const clean = (v: unknown, key = ""): unknown =>
    typeof v === "string"
      ? [
          "id",
          "roleIds",
          "parentRoleId",
          "departmentId",
          "dependsOn",
          "accountableRoleId",
          "quote",
          "value",
        ].includes(key)
        ? v
        : stripDates(v)
      : Array.isArray(v)
        ? v.map((x) => clean(x, key))
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).map(([k, x]) => [k, clean(x, k)]),
            )
          : v;
  raw = clean(raw);
  if (stage === "constitution") {
    const candidate = raw as Record<string, unknown>;
    const out = ExtractionSchema.parse({
      ...candidate,
      departments: Array.isArray(candidate?.departments)
        ? candidate.departments.map((dep: any, i: number) => ({
            ...dep,
            color: COLORS[i % COLORS.length],
            quote: dep.quote ?? "",
          }))
        : candidate?.departments,
    });
    for (const dep of out.departments)
      if (
        dep.source === "constitution" &&
        (!dep.quote || !d.source?.text.includes(dep.quote))
      ) {
        dep.source = "inferred";
        dep.quote = "";
      }
    for (const r of out.roles) {
      if (
        r.source === "constitution" &&
        (!r.quote || !d.source?.text.includes(r.quote))
      ) {
        r.source = "suggested";
        r.quote = "";
        r.confidence = 0.4;
      } else r.confidence = r.source === "constitution" ? 1 : 0.4;
    }
    mergeConstitution(d, out); // Check all references and hierarchy before returning a proposal.
    return out;
  }
  if (stage === "risk_check") {
    const out = RiskResultSchema.parse(raw);
    for (const risk of out.risks) {
      if (risk.roleIds.some((id) => !d.roles.some((r) => r.id === id)))
        throw new Error("Unknown role in responsibility check.");
      for (const option of risk.options) {
        if (option.changes.some((c) => c.operation === "remove"))
          throw new Error("A risk fix may not delete configuration.");
        applyChanges(d, option.changes);
      }
    }
    if (new Set(out.risks.map((r) => r.id)).size !== out.risks.length)
      throw new Error("Duplicate risk IDs.");
    return out;
  }
  if (stage === "edit") {
    const out = EditSchema.parse(raw);
    if (out.question && out.changes.length)
      throw new Error("Clarification must precede changes.");
    applyChanges(d, out.changes);
    return out;
  }
  if (stage === "member_workflow") {
    const out = CompactFlowSchema.parse(raw);
    const flow = layoutFlow({
      title: out.title,
      explanation: "",
      nodes: out.nodes.map((n) => ({
        ...n,
        description: "",
        actionIds: [],
        basis: "AI proposal based on organization duties",
        position: { x: 0, y: 0 },
      })),
      raci: [],
    });
    if (
      flow.nodes.some(
        (n) =>
          n.accountableRoleId &&
          !d.roles.some((r) => r.id === n.accountableRoleId),
      )
    )
      throw new Error("Unknown accountable role.");
    validateStructure({ ...d, memberFlow: flow });
    return flow;
  }
  throw new Error("Unsupported AI step.");
}
export async function historicalContext(workspaceId: string) {
  const item = await store().getWithMetadata(`history/${workspaceId}`, {
    type: "json",
  });
  return ((item?.data as unknown[] | undefined) ?? []).slice(-6);
}
