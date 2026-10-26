import { z } from "zod";
export const DEPARTMENTS = [
  { id: "planning", name: "Programs & Planning" },
  { id: "logistics", name: "Event Logistics" },
  { id: "finance", name: "Finance & Purchasing" },
  { id: "marketing", name: "Marketing & Communication" },
  { id: "outreach", name: "Outreach & Partnerships" },
  { id: "leadership", name: "Leadership & Records" },
] as const;
export const DepartmentId = z.enum([
  "planning",
  "logistics",
  "finance",
  "marketing",
  "outreach",
  "leadership",
]);
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const label = z.string().trim().min(1).max(180);
export const RoleSchema = z.object({
  id,
  title: label,
  departmentId: DepartmentId,
  responsibilities: z.array(z.string().max(240)).max(12),
  source: z.enum(["constitution", "suggested", "manual"]),
  quote: z.string().max(1500).default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type OrgRole = z.infer<typeof RoleSchema>;
export const ActionSchema = z.object({
  id,
  departmentId: DepartmentId,
  title: label,
  description: z.string().max(400),
  optional: z.boolean().default(false),
});
export type OrgAction = z.infer<typeof ActionSchema>;
export const AssignmentSchema = z.object({
  actionId: id,
  roleIds: z.array(id).max(30),
  origin: z.enum(["ai", "manual", "preset"]),
  confirmed: z.boolean().default(false),
});
export type MatrixRow = z.infer<typeof AssignmentSchema>;
export const RaciSchema = z.object({
  actionId: id,
  responsible: z.array(id).max(30),
  accountable: id.nullable(),
  consulted: z.array(id).max(30),
  informed: z.array(id).max(30),
  reason: z.string().max(400),
});
export type RaciRow = z.infer<typeof RaciSchema>;
export const FlowNodeSchema = z.object({
  id,
  title: label,
  description: z.string().max(500),
  actionIds: z.array(id).max(10),
  roleIds: z.array(id).max(30),
  dependsOn: z.array(id).max(20),
  dependencyMode: z.enum(["all", "any"]).default("all"),
  position: z.object({
    x: z.number().min(-10000).max(20000),
    y: z.number().min(-10000).max(20000),
  }),
  basis: z.string().max(500),
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export const FlowSchema = z.object({
  title: label,
  explanation: z.string().max(800),
  nodes: z.array(FlowNodeSchema).min(1).max(40),
  raci: z.array(RaciSchema).max(60),
});
export type OrgFlow = z.infer<typeof FlowSchema>;
export const GuideSchema = z.object({
  alwaysRead: z.string().min(1).max(8000),
  onDemand: z
    .array(
      z.object({
        topic: label,
        when: z.string().max(400),
        content: z.string().max(6000),
      }),
    )
    .max(12),
  uncertainties: z.array(z.string().max(400)).max(12),
});
export type OrgGuide = z.infer<typeof GuideSchema>;
export const ConstitutionSchema = z.object({
  name: z.string().max(100),
  mission: z.string().max(1000),
  summary: z.string().max(1500),
  roles: z.array(RoleSchema).min(1).max(30),
  assignments: z.array(AssignmentSchema).max(60),
  uncertainties: z.array(z.string().max(300)).max(10),
});
export const MappingSchema = z.object({
  assignments: z.array(AssignmentSchema).max(60),
  summary: z.string().max(1000),
  uncertainties: z.array(z.string().max(300)).max(10),
});
export const STAGES = [
  "constitution",
  "responsibilities",
  "member_workflow",
  "board_workflow",
  "guide",
] as const;
export type Stage = (typeof STAGES)[number];
export const DraftSchema = z.object({
  schemaVersion: z.literal(2),
  name: z.string().max(100),
  mission: z.string().max(1000),
  summary: z.string().max(1500),
  step: z.number().int().min(0).max(5),
  source: z
    .object({
      fileName: z.string().max(180),
      archiveId: z.string().uuid().optional(),
      text: z.string().max(60000),
      checksum: z.string().max(80),
      uploadedAt: z.string(),
    })
    .nullable(),
  roles: z.array(RoleSchema).max(30),
  actions: z.array(ActionSchema).max(60),
  assignments: z.array(AssignmentSchema).max(60),
  memberFlow: FlowSchema.nullable(),
  boardFlow: FlowSchema.nullable(),
  boardGoal: z.string().max(1000),
  guide: GuideSchema.nullable(),
  uncertainties: z.array(z.string().max(400)).max(20),
  approvals: z.record(z.boolean()),
  aiRuns: z
    .array(
      z.object({
        stage: z.enum(STAGES),
        promptVersion: z.string().max(80),
        model: z.string().max(100),
        provider: z.string().max(80),
        at: z.string(),
        inputHash: z.string().max(80),
        requestedModel: z.string().max(100).optional(),
        reasoningEffort: z.string().max(30).optional(),
        servedReasoningEffort: z.string().max(30).optional(),
        durationMs: z.number().min(0).max(1000000).optional(),
        routingVersion: z.string().max(80).optional(),
      }),
    )
    .max(50),
  confirmed: z.boolean(),
  contextVersion: z.number().int().min(0),
  confirmedAt: z.string().nullable(),
});
export type SetupDraft = z.infer<typeof DraftSchema>;
export interface Envelope {
  workspaceId: string;
  revision: number;
  draft: SetupDraft;
  approved: SetupDraft | null;
  updatedAt: string;
  expiresAt: string;
}
export interface AiResult {
  stage: Stage;
  data: unknown;
  model: string;
  provider: string;
  promptVersion: string;
  inputHash: string;
  requestedModel?: string;
  reasoningEffort?: string;
  servedReasoningEffort?: string;
  durationMs?: number;
  routingVersion?: string;
  at: string;
}
