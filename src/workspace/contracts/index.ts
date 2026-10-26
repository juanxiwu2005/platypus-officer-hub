import { z } from 'zod';
import { FlowSchema, type OrgFlow, type OrgRole, type Department } from '../../organization/schema';

/** Immutable IDs identify objects; names are labels, never identifiers or authority. */
export const IdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
import { TimingDefaultsSchema, DEFAULT_TIMING, RelativeTargetSchema } from './timing';
export * from './timing';
export const MemberSchema = z.object({
  id: IdSchema, name: z.string().trim().min(1).max(100), roleIds: z.array(IdSchema).max(30),
  access: z.enum(['manager', 'member']).default('member'),
  busyWeeks: z.array(z.string()).max(60).optional(), bufferDays: z.number().min(0).max(14).optional(),
});
export type WorkspaceMember = z.infer<typeof MemberSchema>;
export const BlockerSchema = z.object({
  id: IdSchema, kind: z.enum(['waiting_approval', 'waiting_dependency', 'external_response', 'needs_help']),
  targetId: IdSchema.nullable().default(null), reason: z.string().trim().min(1).max(400),
  at: z.string(), resumeStatus: z.enum(['to_do', 'working']).default('to_do'),
});
export type TaskBlocker = z.infer<typeof BlockerSchema>;
export const TaskStatusSchema = z.enum(['to_do', 'working', 'stuck', 'done']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export const OfficialRuleSchema = z.object({ruleId: z.string(), days: z.number().int().min(0).max(365), unit: z.enum(['calendar', 'business'])});
export const TaskSchema = z.object({
  id: IdSchema, parentWorkItemId: IdSchema, sourceNodeId: IdSchema.nullable().default(null),
  title: z.string().trim().min(1).max(180), description: z.string().max(1000).default(''),
  stageKey: IdSchema, stageTitle: z.string().min(1).max(180),
  roleIds: z.array(IdSchema).max(30), ownerId: IdSchema.nullable(), collaboratorIds: z.array(IdSchema).max(50).default([]),
  status: TaskStatusSchema.default('to_do'), dependsOn: z.array(IdSchema).max(60).default([]),
  dependencyMode: z.enum(['all', 'any']).default('all'),
  applicability: z.enum(['required', 'optional', 'inactive']).default('required'), applicabilityReason: z.string().max(400).default(''),
  kind: z.enum(['task', 'approval']).default('task'), gateId: IdSchema.nullable().default(null),
  blockers: z.array(BlockerSchema).max(20).default([]), needsReview: z.boolean().default(false),
  relativeTarget: RelativeTargetSchema.nullable().default(null), officialRules: z.array(OfficialRuleSchema).max(16).default([]),
  dueOverride: z.string().nullable().default(null), estimatedDays: z.number().min(0).max(60).default(1),
  rank: z.number().default(0), completedAt: z.string().nullable().default(null), updatedAt: z.string(),
});
export type WorkTask = z.infer<typeof TaskSchema>;
export const GateSchema = z.object({
  id: IdSchema, taskId: IdSchema, kind: z.enum(['budget', 'purchase', 'general']),
  requestId: IdSchema.nullable().default(null), requestVersion: z.number().int().min(1).default(1),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'), evidence: z.string().max(1000).default(''),
  decidedBy: IdSchema.nullable().default(null), decidedAt: z.string().nullable().default(null),
});
export type ApprovalGate = z.infer<typeof GateSchema>;
export const FundingSchema = z.object({
  id: IdSchema, version: z.number().int().min(1), source: z.enum(['usg', 'college', 'dues', 'sponsor']),
  purpose: z.string().max(1000), currency: z.literal('USD').default('USD'), amount: z.number().min(0).max(1000000),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
  approvedVersion: z.number().int().nullable().default(null), approvedAmount: z.number().min(0).nullable().default(null),
  committedAmount: z.number().min(0).default(0), spentAmount: z.number().min(0).default(0),
  commitments: z.array(z.object({id: IdSchema, amount: z.number().positive(), purpose: z.string().max(400), at: z.string()})).default([]),
  evidence: z.string().max(1000).default(''), spendBy: z.string().nullable().default(null),
});
export type FundingRequest = z.infer<typeof FundingSchema>;
export const WorkItemSchema = z.object({
  id: IdSchema, kind: z.enum(['member_event', 'executive_work']), name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).default(''), venue: z.enum(['campus', 'offcampus', 'unspecified']).default('campus'), date: z.string().nullable(), ownerId: IdSchema.nullable(),
  templateVersion: z.number().int().min(0), templateFlow: FlowSchema.nullable().default(null),
  timingDefaults: TimingDefaultsSchema.default(DEFAULT_TIMING),
  tasks: z.array(TaskSchema).max(200), gates: z.array(GateSchema).max(100).default([]), funding: z.array(FundingSchema).max(30).default([]),
  createdAt: z.string(), updatedAt: z.string(),
});
export type WorkItem = z.infer<typeof WorkItemSchema>;
export const WorkspaceStateSchema = z.object({
  schemaVersion: z.literal(1), workspaceId: IdSchema, revision: z.number().int().min(0),
  actorId: IdSchema.nullable(), members: z.array(MemberSchema).max(100), workItems: z.array(WorkItemSchema).max(100),
  updatedAt: z.string(),
});
export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
export interface WorkspaceOrganization { name: string; mission: string; roles: OrgRole[]; departments: Department[]; timingDefaults: TimingDefaults; contextVersion: number; }
export interface WorkspaceEnvelope { state: WorkspaceState; organization: WorkspaceOrganization; setupRevision: number; demo: true; }
export const CreateWorkInputSchema = z.object({
  id: IdSchema, kind: z.enum(['member_event', 'executive_work']), name: z.string().trim().min(1).max(180),
  description: z.string().max(2000).default(''), venue: z.enum(['campus', 'offcampus', 'unspecified']).default('campus'), date: z.string().nullable().default(null), ownerId: IdSchema.nullable().default(null),
  fundingSource: z.enum(['none', 'usg', 'college', 'dues', 'sponsor']).default('none'), requestedAmount: z.number().min(0).max(1000000).default(0),
  flow: FlowSchema.optional(),
});
export type CreateWorkInput = z.infer<typeof CreateWorkInputSchema>;
/** Every model proposal and every form submits the same validated command. */
export type WorkspaceCommand =
  | { type: 'member.upsert'; member: WorkspaceMember }
  | { type: 'member.remove'; memberId: string }
  | { type: 'actor.select'; memberId: string }
  | { type: 'work.create'; input: CreateWorkInput }
  | { type: 'work.update'; workItemId: string; patch: Partial<Pick<WorkItem, 'name'|'description'|'date'|'ownerId'|'venue'>> }
  | { type: 'work.remove'; workItemId: string }
  | { type: 'task.move'; workItemId: string; taskId: string; status: TaskStatus; blocker?: TaskBlocker; beforeId?: string|null }
  | { type: 'task.complete'|'task.reopen'; workItemId: string; taskId: string }
  | { type: 'task.update'; workItemId: string; taskId: string; patch: Partial<Pick<WorkTask, 'title'|'description'|'ownerId'|'collaboratorIds'|'roleIds'|'dependsOn'|'dependencyMode'|'relativeTarget'|'dueOverride'|'estimatedDays'|'applicability'|'applicabilityReason'|'stageKey'|'stageTitle'>> }
  | { type: 'task.add'; workItemId: string; task: WorkTask }
  | { type: 'task.remove'; workItemId: string; taskId: string }
  | { type: 'task.review'; workItemId: string; taskIds: string[] }
  | { type: 'gate.decide'; workItemId: string; gateId: string; decision: 'approved'|'rejected'; evidence: string }
  | { type: 'funding.revise'; workItemId: string; requestId: string; amount: number; source: FundingRequest['source']; purpose: string }
  | { type: 'funding.commit'; workItemId: string; requestId: string; commitmentId: string; amount: number; purpose: string };
export interface WorkspaceMutation { requestId: string; revision: number; command: WorkspaceCommand; }
export interface TaskSchedule { start: string|null; due: string|null; official: string|null; issues: string[]; basis: string; }
export interface WorkSchedule { tasks: Record<string, TaskSchedule>; issues: string[]; covered: boolean; }
export type CreationFlow = OrgFlow;

export const UI_LABELS = { home: 'Home', tasks: 'My tasks', activities: 'Activities', setup: 'Organization setup', workflow: 'Activity Workflow', memberPrograms: 'Member Programs', executiveBoard: 'Executive Board' } as const;
