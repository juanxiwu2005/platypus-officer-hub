import { z } from "zod";
import {
  IdSchema, MemberSchema, BlockerSchema, TaskSchema, TaskStatusSchema,
  CreateWorkInputSchema, RelativeTargetSchema, TimingDefaultsSchema, type WorkspaceCommand,
} from "../../../src/workspace/contracts/index.ts";

const id = IdSchema;
const money = z.number().min(0).max(1000000).refine((n) => Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 0.000001, "USD amounts must use whole cents.");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const date = new Date(s + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === s;
}, "Use a real calendar date in YYYY-MM-DD format.");
export const WorkDateSchema = day.nullable();
const ref = { workItemId: id, taskId: id };
const taskPatch = z.object({
  title: z.string().trim().min(1).max(180).optional(), description: z.string().max(1000).optional(),
  ownerId: id.nullable().optional(), collaboratorIds: z.array(id).max(50).optional(), roleIds: z.array(id).max(30).optional(),
  dependsOn: z.array(id).max(60).optional(), dependencyMode: z.enum(["all", "any"]).optional(),
  relativeTarget: RelativeTargetSchema.nullable().optional(), dueOverride: WorkDateSchema.optional(),
  estimatedDays: z.number().min(0).max(60).optional(), applicability: z.enum(["required", "optional", "inactive"]).optional(),
  applicabilityReason: z.string().max(400).optional(), stageKey: id.optional(), stageTitle: z.string().trim().min(1).max(180).optional(),
}).strict();
const CommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("member.upsert"), member: MemberSchema.strict() }).strict(),
  z.object({ type: z.literal("member.remove"), memberId: id }).strict(),
  z.object({ type: z.literal("actor.select"), memberId: id }).strict(),
  z.object({ type: z.literal("work.create"), input: CreateWorkInputSchema.extend({ date: WorkDateSchema.default(null), requestedAmount: money.default(0) }).strict() }).strict(),
  z.object({ type: z.literal("work.update"), workItemId: id, patch: z.object({
    name: z.string().trim().min(1).max(180).optional(), description: z.string().max(2000).optional(),
    date: WorkDateSchema.optional(), ownerId: id.nullable().optional(), venue: z.enum(["campus", "offcampus", "unspecified"]).optional(),
  }).strict() }).strict(),
  z.object({ type: z.literal("work.remove"), workItemId: id }).strict(),
  z.object({ type: z.literal("work.applyTiming"), workItemId: id, timingDefaults: TimingDefaultsSchema.strict() }).strict(),
  z.object({ type: z.literal("work.applyTemplate"), workItemId: id, templateVersion: z.number().int().min(1) }).strict(),
  z.object({ type: z.literal("task.move"), ...ref, status: TaskStatusSchema, blocker: BlockerSchema.strict().optional(), beforeId: id.nullable().optional() }).strict(),
  z.object({ type: z.literal("task.complete"), ...ref }).strict(),
  z.object({ type: z.literal("task.reopen"), ...ref }).strict(),
  z.object({ type: z.literal("task.update"), ...ref, patch: taskPatch }).strict(),
  z.object({ type: z.literal("task.add"), workItemId: id, task: TaskSchema.strict() }).strict(),
  z.object({ type: z.literal("task.remove"), ...ref }).strict(),
  z.object({ type: z.literal("task.review"), workItemId: id, taskIds: z.array(id).min(1).max(200) }).strict(),
  z.object({ type: z.literal("task.progress"), ...ref, text: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ type: z.literal("task.unblock"), ...ref, blockerId: id, evidence: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ type: z.literal("gate.decide"), workItemId: id, gateId: id, decision: z.enum(["approved", "rejected"]), evidence: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ type: z.literal("funding.revise"), workItemId: id, requestId: id, amount: money, source: z.enum(["usg", "college", "dues", "sponsor"]), purpose: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ type: z.literal("funding.add"), workItemId: id, requestId: id, amount: money, source: z.enum(["usg", "college", "dues", "sponsor"]), purpose: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ type: z.literal("funding.commit"), workItemId: id, requestId: id, commitmentId: id, amount: money.refine((n) => n > 0), purpose: z.string().trim().min(1).max(400) }).strict(),
  z.object({ type: z.literal("funding.spend"), workItemId: id, requestId: id, commitmentId: id, evidence: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ type: z.literal("funding.release"), workItemId: id, requestId: id, commitmentId: id, evidence: z.string().trim().min(1).max(1000) }).strict(),
]);
export function validateWorkspaceCommand(value: unknown): WorkspaceCommand {
  const command = CommandSchema.parse(value);
  if (command.type === "member.upsert")
    command.member.busyWeeks?.forEach((week) => day.parse(week));
  if (command.type === "task.add") WorkDateSchema.parse(command.task.dueOverride);
  return command;
}
export function validateMutation(value: unknown) {
  const body = z.object({ requestId: id, revision: z.number().int().min(0), command: z.unknown() }).strict().parse(value);
  return { ...body, command: validateWorkspaceCommand(body.command) };
}

