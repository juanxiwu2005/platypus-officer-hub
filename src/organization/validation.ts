import {
  ConstitutionSchema,
  FlowSchema,
  GuideSchema,
  MappingSchema,
  type SetupDraft,
  type OrgFlow,
  type Stage,
} from "./schema";
import { stripDates } from "../lib/chatCards";
const unique = (xs: string[]) => [...new Set(xs)];
export function assertGraph(flow: OrgFlow, roles: string[], actions: string[]) {
  const ids = flow.nodes.map((n) => n.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("Workflow has duplicate step IDs.");
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>(),
    visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error("That connection creates a loop.");
    if (seen.has(id)) return;
    const node = byId.get(id);
    if (!node) throw new Error("Workflow refers to an unknown step.");
    visiting.add(id);
    node.dependsOn.forEach(visit);
    visiting.delete(id);
    seen.add(id);
  };
  for (const n of flow.nodes) {
    if (
      n.roleIds.some((r) => !roles.includes(r)) ||
      n.actionIds.some((a) => !actions.includes(a))
    )
      throw new Error("Workflow uses an unknown role or responsibility.");
    visit(n.id);
  }
  for (const row of flow.raci) {
    if (
      !actions.includes(row.actionId) ||
      [
        ...row.responsible,
        ...row.consulted,
        ...row.informed,
        ...(row.accountable ? [row.accountable] : []),
      ].some((r) => !roles.includes(r))
    )
      throw new Error("Invalid responsibility routing.");
  }
  return flow;
}
export function validateAiOutput(
  stage: Stage,
  raw: unknown,
  d: SetupDraft,
  allowWorkflowRoleChanges = false,
) {
  // Mask free-text dates while preserving exact source quotations as evidence.
  const clean = (v: unknown, key = ""): unknown =>
    typeof v === "string"
      ? [
          "quote",
          "id",
          "actionId",
          "actionIds",
          "roleIds",
          "dependsOn",
          "responsible",
          "accountable",
          "consulted",
          "informed",
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
    const out = ConstitutionSchema.parse(raw);
    if (new Set(out.roles.map((r) => r.id)).size !== out.roles.length)
      throw new Error("AI returned duplicate roles.");
    out.roles = out.roles.map((r) => {
      if (
        r.source === "constitution" &&
        (!r.quote || !d.source?.text.includes(r.quote))
      )
        return {
          ...r,
          source: "suggested" as const,
          quote: "",
          confidence: Math.min(r.confidence, 0.4),
        };
      return r;
    });
    const roles = out.roles.map((r) => r.id);
    out.assignments = out.assignments
      .filter((a) => d.actions.some((x) => x.id === a.actionId))
      .map((a) => ({
        ...a,
        roleIds: unique(a.roleIds.filter((r) => roles.includes(r))),
        origin: "ai" as const,
        confirmed: false,
      }));
    return out;
  }
  if (stage === "responsibilities") {
    const out = MappingSchema.parse(raw);
    const ids = d.roles.map((r) => r.id);
    out.assignments = out.assignments
      .filter((a) => d.actions.some((x) => x.id === a.actionId))
      .map((a) => ({
        ...a,
        roleIds: unique(a.roleIds.filter((r) => ids.includes(r))),
        origin: "ai" as const,
        confirmed: false,
      }));
    return out;
  }
  if (stage === "guide") return GuideSchema.parse(raw);
  const flow = FlowSchema.parse(raw);
  assertGraph(
    flow,
    d.roles.map((r) => r.id),
    d.actions.map((a) => a.id),
  );
  // Checked roles are the people doing this work; the model may not quietly replace them.
  flow.nodes = flow.nodes.map((n) => ({
    ...n,
    roleIds: allowWorkflowRoleChanges
      ? n.roleIds
      : unique(
          n.actionIds.flatMap(
            (id) =>
              d.assignments.find((a) => a.actionId === id)?.roleIds ??
              n.roleIds,
          ),
        ),
  }));
  flow.raci = flow.raci.map((row) => ({
    ...row,
    responsible: unique(
      allowWorkflowRoleChanges
        ? flow.nodes
            .filter((n) => n.actionIds.includes(row.actionId))
            .flatMap((n) => n.roleIds)
        : (d.assignments.find((a) => a.actionId === row.actionId)?.roleIds ??
            []),
    ),
    consulted: unique(row.consulted),
    informed: unique(row.informed),
  }));
  return assertGraph(
    flow,
    d.roles.map((r) => r.id),
    d.actions.map((a) => a.id),
  );
}
export function contextPacket(d: SetupDraft, stage: Stage) {
  const always = {
    organization: { name: d.name, mission: d.mission },
    roles: d.roles,
    assignments: d.assignments,
    approvedSteps: d.approvals,
    contextVersion: d.contextVersion,
    organizationGuide: d.guide?.alwaysRead ?? null,
  };
  const documents =
    stage === "constitution" || stage === "responsibilities"
      ? {
          constitution: d.source
            ? {
                fileName: d.source.fileName,
                checksum: d.source.checksum,
                text: d.source.text,
              }
            : null,
        }
      : undefined;
  return {
    alwaysRead: always,
    onDemand: documents ?? {
      memberFlow: d.memberFlow,
      boardGoal: d.boardGoal,
      boardFlow: stage === "guide" ? d.boardFlow : undefined,
    },
    actions: d.actions,
  };
}

export function validateDraftIntegrity(d: SetupDraft) {
  const roles = d.roles.map((r) => r.id),
    actions = d.actions.map((a) => a.id);
  if (
    new Set(roles).size !== roles.length ||
    new Set(actions).size !== actions.length
  )
    throw new Error("Roles and responsibilities need unique IDs.");
  if (
    new Set(d.assignments.map((a) => a.actionId)).size !==
      d.assignments.length ||
    d.assignments.some(
      (a) =>
        !actions.includes(a.actionId) ||
        a.roleIds.some((r) => !roles.includes(r)),
    )
  )
    throw new Error(
      "Responsibility selections refer to an unknown role or action.",
    );
  for (const flow of [d.memberFlow, d.boardFlow])
    if (flow) assertGraph(flow, roles, actions);
}
