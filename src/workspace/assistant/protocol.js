import { z } from 'zod';
import { ChangeSchema } from '../../organization/schema';
import { TimingDefaultsSchema, RelativeTargetSchema } from '../contracts';
export const AssistantContextSchema = z.object({
    screen: z.string().max(80), entityType: z.string().max(40).nullable().optional(), entityId: z.string().max(100).nullable().optional(),
    workItemId: z.string().max(100).optional(), taskId: z.string().max(100).optional(), workspaceId: z.string().max(100).optional(), revision: z.number().int().optional(),
});
export const OrganizationProposalSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(), mission: z.string().max(1000).optional(),
    workflowTitle: z.string().trim().min(1).max(180).optional(), timingDefaults: TimingDefaultsSchema.optional(),
    changes: z.array(ChangeSchema).max(40).default([]),
    nodeTimings: z.array(z.object({ id: z.string().max(100), timing: RelativeTargetSchema, milestoneKey: z.enum(['items', 'quotes', 'budget_request']).optional() })).max(40).default([]),
}).strict();
