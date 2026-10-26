import { z } from "zod";
import { DepartmentSchema, DraftSchema, FlowSchema, RoleSchema } from "../organization/schema";
import { graphError } from "../organization/graph";

const ConfigSchema = z.object({
  format: z.literal("platypus.organization"),
  schemaVersion: z.literal(1),
  contextVersion: z.number().int().min(1),
  compiledAt: z.string(),
  alwaysRead: z.object({
    organization: z.object({ name: z.string().max(100), mission: z.string().max(1000) }),
    departments: z.array(DepartmentSchema.pick({ id: true, name: true, color: true })).min(1).max(30),
    roles: z.array(RoleSchema.pick({ id: true, title: true, departmentId: true, parentRoleId: true, description: true, responsibilities: true })).min(1).max(30),
  }),
  onDemand: z.object({
    memberWorkflow: FlowSchema.omit({ raci: true }).extend({
      raci: z.array(z.object({
        nodeId: z.string(), responsible: z.array(z.string()), accountable: z.string().nullable(),
        consulted: z.array(z.string()), informed: z.array(z.string()),
      })).max(40),
    }),
    boardWork: z.object({ mode: z.literal("generate-per-request"), templates: z.array(z.string()).max(20) }),
  }),
  unresolved: z.array(z.string()).default([]),
});
export type ApprovedContext = z.infer<typeof ConfigSchema> & { workspaceId: string; confirmedAt: string };

/** Read the approved server artifact directly; never copy it into the legacy preview repository. */
export function approvedContext(value: unknown): ApprovedContext | null {
  const envelope = z.object({ workspaceId: z.string().min(1).max(100), approved: DraftSchema.nullable() }).parse(value);
  if (!envelope.approved) return null;
  const approved = envelope.approved;
  if (!approved.confirmed || !approved.confirmedAt) throw new Error("The saved organization has not been confirmed.");
  const config = ConfigSchema.parse(approved.compiled);
  if (config.contextVersion !== approved.contextVersion || config.alwaysRead.organization.name !== approved.name || config.alwaysRead.organization.mission !== approved.mission)
    throw new Error("The approved organization version is inconsistent. Review organization setup before continuing.");
  const departmentIds = new Set(config.alwaysRead.departments.map(d => d.id));
  const roleIds = new Set(config.alwaysRead.roles.map(r => r.id));
  if (departmentIds.size !== config.alwaysRead.departments.length || roleIds.size !== config.alwaysRead.roles.length || config.alwaysRead.roles.some(r => !departmentIds.has(r.departmentId) || (r.parentRoleId && !roleIds.has(r.parentRoleId))))
    throw new Error("The approved team has invalid references.");
  if (graphError(config.onDemand.memberWorkflow.nodes) || config.onDemand.memberWorkflow.nodes.some(n => n.roleIds.some(id => !roleIds.has(id)) || (n.accountableRoleId && !roleIds.has(n.accountableRoleId))))
    throw new Error("The approved workflow has invalid references.");
  return { ...config, workspaceId: envelope.workspaceId, confirmedAt: approved.confirmedAt };
}

export async function readApprovedContext(signal?: AbortSignal): Promise<ApprovedContext | null> {
  const response = await fetch("/api/org/setup", { credentials: "same-origin", signal, cache: "no-store" });
  if ([401, 404, 410].includes(response.status)) return null;
  if (!response.ok) throw new Error("Your confirmed organization could not be loaded. Retry before using this workspace.");
  try { return approvedContext(await response.json()); }
  catch { throw new Error("Your confirmed organization could not be verified. Your saved settings have not been changed."); }
}
