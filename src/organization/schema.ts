import { z } from "zod";
export const DEPARTMENTS = [
  { id: "planning", name: "Programs & Planning" },
  { id: "logistics", name: "Event Logistics" },
  { id: "finance", name: "Finance & Purchasing" },
  { id: "marketing", name: "Marketing & Communication" },
  { id: "outreach", name: "Outreach & Partnerships" },
  { id: "leadership", name: "Leadership & Records" },
] as const;
export const DepartmentId = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
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
  description: z.string().max(400).optional(),
  parentRoleId: id.nullable().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  manualFields: z.array(z.string()).optional(),
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
  accountableRoleId: id.nullable().optional(),
  needsReview: z.boolean().optional(),
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
  "risk_check",
  "edit",
] as const;
export type Stage = (typeof STAGES)[number];
export const DepartmentSchema = z.object({
  id,
  name: label,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  source: z.enum(["constitution", "inferred", "manual"]),
  quote: z.string().max(500).default(""),
});
export type Department = z.infer<typeof DepartmentSchema>;
export const ChangeSchema = z.object({
  entity: z.enum(["role", "department", "node"]),
  id,
  operation: z.enum(["set", "add", "remove"]),
  field: z.enum([
    "title",
    "description",
    "departmentId",
    "parentRoleId",
    "responsibilities",
    "name",
    "color",
    "roleIds",
    "dependsOn",
    "dependencyMode",
  ]),
  value: z.union([
    z.string().max(600),
    z.array(z.string().max(240)).max(30),
    z.null(),
  ]),
});
export type OrgChange = z.infer<typeof ChangeSchema>;
export const EditSchema = z.object({
  message: z.string().max(600),
  question: z.string().max(400).nullable(),
  changes: z.array(ChangeSchema).max(40),
});
export const RiskSchema = z.object({
  id,
  title: label,
  explanation: z.string().max(400),
  roleIds: z.array(id).max(10),
  options: z
    .array(
      z.object({
        id,
        label: z.string().max(140),
        changes: z.array(ChangeSchema).max(10),
      }),
    )
    .min(2)
    .max(3),
});
export const RiskResultSchema = z.object({ risks: z.array(RiskSchema).max(4) });
export type RiskIssue = z.infer<typeof RiskSchema>;
export const DraftSchema = z.object({
  schemaVersion: z.literal(2),
  uiVersion: z.literal(3).optional(),
  departments: z.array(DepartmentSchema).max(30).optional(),
  messages: z
    .array(
      z.object({
        id,
        role: z.enum(["user", "assistant"]),
        text: z.string().max(2000),
        at: z.string(),
      }),
    )
    .max(200)
    .optional(),
  riskCheck: z
    .object({
      status: z.enum(["unreviewed", "complete", "skipped"]),
      inputKey: z.string().max(100000),
      risks: z.array(RiskSchema).max(4),
      answers: z.record(z.string()),
      at: z.string().nullable(),
    })
    .optional(),
  generated: z.record(z.string().max(100000)).optional(),
  compiled: z.record(z.unknown()).nullable().optional(),
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
        inputChars: z.number().optional(),
        outputChars: z.number().optional(),
        inputTokens: z.number().optional(),
        outputTokens: z.number().optional(),
        finishReason: z.string().optional(),
        headersMs: z.number().optional(),
        firstTokenMs: z.number().optional(),
        queuedMs: z.number().optional(),
        cached: z.boolean().optional(),
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
  inputChars?: number;
  outputChars?: number;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  headersMs?: number;
  firstTokenMs?: number;
  queuedMs?: number;
  cached?: boolean;
  at: string;
}
