import { z } from 'zod';
import { FlowSchema } from '../../organization/schema';
/** Immutable IDs identify objects; names are labels, never identifiers or authority. */
export const IdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
import { TimingDefaultsSchema, DEFAULT_TIMING, RelativeTargetSchema } from './timing';
export * from './timing';
export const MemberSchema = z.object({
    id: IdSchema, name: z.string().trim().min(1).max(100), roleIds: z.array(IdSchema).max(30),
    access: z.enum(['manager', 'member']).default('member'),
    busyWeeks: z.array(z.string()).max(60).optional(), bufferDays: z.number().min(0).max(14).optional(),
});
export const BlockerSchema = z.object({
    id: IdSchema, kind: z.enum(['waiting_approval', 'waiting_dependency', 'external_response', 'needs_help']),
    targetId: IdSchema.nullable().default(null), reason: z.string().trim().min(1).max(400),
    at: z.string(), resumeStatus: z.enum(['to_do', 'working']).default('to_do'),
});
export const TaskStatusSchema = z.enum(['to_do', 'working', 'stuck', 'done']);
export const OfficialRuleSchema = z.object({ ruleId: z.string(), days: z.number().int().min(0).max(365), unit: z.enum(['calendar', 'business']) });
export const TaskSchema = z.object({
    id: IdSchema, parentWorkItemId: IdSchema, sourceNodeId: IdSchema.nullable().default(null),
    milestoneKey: z.enum(['items', 'quotes', 'budget_request']).optional(),
    fundingRequestId: IdSchema.nullable().default(null),
    fundingStep: z.enum(['items', 'quotes', 'budget_submit', 'budget_approval', 'purchase_submit', 'purchase_approval', 'order', 'reimbursement', 'closeout']).optional(),
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
    manualFields: z.array(z.string()).max(30).default([]),
    progress: z.array(z.object({ memberId: IdSchema, text: z.string().max(1000), at: z.string() })).default([]),
    rank: z.number().default(0), completedAt: z.string().nullable().default(null), updatedAt: z.string(),
});
export const GateSchema = z.object({
    id: IdSchema, taskId: IdSchema, kind: z.enum(['budget', 'purchase', 'general']),
    requestId: IdSchema.nullable().default(null), requestVersion: z.number().int().min(1).default(1),
    status: z.enum(['pending', 'approved', 'rejected']).default('pending'), evidence: z.string().max(1000).default(''),
    approverIds: z.array(IdSchema).max(50).default([]), external: z.boolean().default(false), reason: z.string().max(400).default(''),
    decidedBy: IdSchema.nullable().default(null), decidedAt: z.string().nullable().default(null),
});
export const FundingSchema = z.object({
    id: IdSchema, version: z.number().int().min(1), source: z.enum(['usg', 'college', 'dues', 'sponsor']),
    purpose: z.string().max(1000), category: z.enum(['food_service', 'speaker', 'other']).optional(), currency: z.literal('USD').default('USD'), amount: z.number().min(0).max(1000000),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected']).default('draft'),
    approvedVersion: z.number().int().nullable().default(null), approvedAmount: z.number().min(0).nullable().default(null),
    committedAmount: z.number().min(0).default(0), spentAmount: z.number().min(0).default(0),
    commitments: z.array(z.object({ id: IdSchema, amount: z.number().positive(), purpose: z.string().max(400), at: z.string(), status: z.enum(['reserved', 'spent', 'released']).default('reserved'), requestVersion: z.number().int().min(1).default(1), evidence: z.string().max(1000).default('') })).default([]),
    evidence: z.string().max(1000).default(''), spendBy: z.string().nullable().default(null),
});
export const WorkItemSchema = z.object({
    id: IdSchema, kind: z.enum(['member_event', 'executive_work']), name: z.string().trim().min(1).max(180),
    description: z.string().max(2000).default(''), venue: z.enum(['campus', 'offcampus', 'unspecified']).default('campus'), date: z.string().nullable(), ownerId: IdSchema.nullable(),
    templateVersion: z.number().int().min(0), templateFlow: FlowSchema.nullable().default(null),
    timingDefaults: TimingDefaultsSchema.default(DEFAULT_TIMING),
    tasks: z.array(TaskSchema).max(200), gates: z.array(GateSchema).max(100).default([]), funding: z.array(FundingSchema).max(30).default([]),
    createdAt: z.string(), updatedAt: z.string(),
});
export const WorkspaceStateSchema = z.object({
    schemaVersion: z.literal(1), workspaceId: IdSchema, revision: z.number().int().min(0),
    actorId: IdSchema.nullable(), members: z.array(MemberSchema).max(100), workItems: z.array(WorkItemSchema).max(100),
    updatedAt: z.string(),
});
export const CreateWorkInputSchema = z.object({
    id: IdSchema, kind: z.enum(['member_event', 'executive_work']), name: z.string().trim().min(1).max(180),
    description: z.string().max(2000).default(''), venue: z.enum(['campus', 'offcampus', 'unspecified']).default('campus'), date: z.string().nullable().default(null), ownerId: IdSchema.nullable().default(null),
    fundingSource: z.enum(['none', 'usg', 'college', 'dues', 'sponsor']).default('none'), fundingCategory: z.enum(['food_service', 'speaker', 'other']).default('other'), requestedAmount: z.number().min(0).max(1000000).default(0),
    flow: FlowSchema.optional(),
});
export const UI_LABELS = { home: 'Home', tasks: 'My tasks', activities: 'Activities', setup: 'Organization setup', workflow: 'Activity Workflow', memberPrograms: 'Member Programs', executiveBoard: 'Executive Board' };
