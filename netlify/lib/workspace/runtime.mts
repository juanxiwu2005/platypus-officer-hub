import { createHash } from "node:crypto";
import {
  FlowSchema, type SetupDraft, type OrgFlow,
} from "../../../src/organization/schema.ts";
import { graphError } from "../../../src/organization/graph.ts";
import {
  TaskSchema, WorkItemSchema, WorkspaceStateSchema, DEFAULT_TIMING,
  type WorkspaceState, type WorkspaceOrganization, type WorkspaceCommand,
  type WorkItem, type WorkTask, type WorkspaceMember, type FundingRequest,
} from "../../../src/workspace/contracts/index.ts";

export class WorkspaceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const stableId = (...parts: string[]) => "id_" + createHash("sha256").update(parts.join("/" )).digest("hex").slice(0, 28);
const unique = (values: string[]) => [...new Set(values)];
const has = (values: { id: string }[], id: string) => values.some((v) => v.id === id);
const requireValue = <T,>(value: T | undefined, message: string): T => {
  if (!value) throw new WorkspaceError(message, 404);
  return value;
};
const manager = (state: WorkspaceState) => state.members.find((m) => m.id === state.actorId)?.access === "manager";
function requireManager(state: WorkspaceState) {
  if (!manager(state)) throw new WorkspaceError("The selected demo member does not have manager access.", 403);
}
function mayAct(state: WorkspaceState, task: WorkTask) {
  if (!state.actorId || (!manager(state) && task.ownerId !== state.actorId))
    throw new WorkspaceError("Only this task's primary owner or a demo manager may change its overall state.", 403);
}
function member(state: WorkspaceState, id: string | null) {
  if (id && !has(state.members, id)) throw new WorkspaceError("Choose a current member of this private workspace.");
}
export function ready(item: WorkItem, task: WorkTask) {
  const predecessors = task.dependsOn.map((id) => item.tasks.find((t) => t.id === id)).filter((t) => t?.applicability !== "inactive");
  const done = (t: WorkTask | undefined) => !!t && t.status === "done" && !t.needsReview;
  if (task.dependsOn.length && !predecessors.length && task.dependencyMode === "any") return false;
  return !predecessors.length || (task.dependencyMode === "any" ? predecessors.some(done) : predecessors.every(done));
}
function graph(tasks: WorkTask[]) {
  const visiting = new Set<string>(), seen = new Set<string>(), ids = new Set(tasks.map((t) => t.id));
  if (ids.size !== tasks.length) throw new WorkspaceError("Task IDs must be unique within a work item.");
  const visit = (id: string) => {
    if (visiting.has(id)) throw new WorkspaceError("These task dependencies would create a cycle.");
    if (seen.has(id)) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) throw new WorkspaceError("A dependency points outside this work item.");
    visiting.add(id); task.dependsOn.forEach(visit); visiting.delete(id); seen.add(id);
  };
  tasks.forEach((t) => visit(t.id));
  const stages = new Map<string, Set<string>>();
  const titles = new Map<string, string>();
  for (const task of tasks) {
    if (titles.has(task.stageKey) && titles.get(task.stageKey) !== task.stageTitle) throw new WorkspaceError("A stage must have one consistent title.");
    titles.set(task.stageKey, task.stageTitle);
    const dependencies = stages.get(task.stageKey) ?? new Set<string>();
    for (const id of task.dependsOn) {
      const other = tasks.find((t) => t.id === id)!;
      if (other.stageKey !== task.stageKey) dependencies.add(other.stageKey);
    }
    stages.set(task.stageKey, dependencies);
  }
  visiting.clear(); seen.clear();
  const visitStage = (key: string) => {
    if (visiting.has(key)) throw new WorkspaceError("These stage groups would hide a backward dependency. Keep the work in separate stages.");
    if (seen.has(key)) return;
    visiting.add(key); stages.get(key)?.forEach(visitStage); visiting.delete(key); seen.add(key);
  };
  stages.forEach((_, key) => visitStage(key));
}
function cleanAutomaticBlockers(item: WorkItem, at: string) {
  for (const task of item.tasks) {
    const remaining = task.blockers.filter((b) => {
      if (b.kind === "waiting_dependency") return !ready(item, task);
      if (b.kind === "waiting_approval" && b.targetId)
        return item.gates.find((g) => g.id === b.targetId)?.status !== "approved";
      return true;
    });
    if (remaining.length !== task.blockers.length) {
      const resume = task.blockers.find((b) => !remaining.includes(b))?.resumeStatus ?? "to_do";
      task.blockers = remaining;
      if (task.status === "stuck" && !remaining.length) task.status = ready(item, task) ? resume : "to_do";
      task.updatedAt = at;
    }
  }
}
function ensureCompletable(item: WorkItem, task: WorkTask) {
  if (task.kind === "approval") throw new WorkspaceError("Record an explicit approval decision; approval steps cannot be dragged to Done.");
  if (!task.ownerId) throw new WorkspaceError("Assign a primary owner before completing this task.");
  if (task.applicability === "inactive") throw new WorkspaceError("This task is inactive; it cannot be completed as active work.");
  if (!ready(item, task) || task.blockers.length || task.needsReview)
    throw new WorkspaceError("Resolve this task's dependencies, blockers and pending review before completing it.");
}
function resolveOwners(state: WorkspaceState, roleIds: string[], fallback: string | null) {
  const candidates = unique(state.members.filter((m) => m.roleIds.some((id) => roleIds.includes(id))).map((m) => m.id));
  const ownerId = candidates.length === 1 ? candidates[0] : !roleIds.length ? fallback : null;
  return { ownerId, collaboratorIds: candidates.filter((id) => id !== ownerId) };
}
function newTask(item: Pick<WorkItem, "id">, input: Partial<WorkTask> & Pick<WorkTask, "id" | "title">, at: string) {
  return TaskSchema.parse({ parentWorkItemId: item.id, sourceNodeId: null, stageKey: "work", stageTitle: "Work", roleIds: [], ownerId: null, updatedAt: at, ...input });
}
const fundingKeys = ["confirm_items", "confirm_quotes", "submit_budget_request", "submit_purchase_request", "order_or_reimburse", "funding_closeout"];
function syncRegistration(item: WorkItem, at: string) {
  const required = item.kind === "member_event" && (item.venue === "campus" || item.funding.some((f) => ["usg", "college"].includes(f.source)));
  const existing = item.tasks.find((t) => t.sourceNodeId === "university_registration");
  if (required && !existing) item.tasks.push(newTask(item, { id: stableId(item.id, "university-registration"), sourceNodeId: "university_registration", title: "Register activity with ASU", stageKey: "registration", stageTitle: "School requirements", ownerId: item.ownerId, officialRules: [{ ruleId: "R01", days: 30, unit: "calendar" }] }, at));
  else if (existing && required && existing.applicability === "inactive") { existing.applicability = "required"; existing.applicabilityReason = "Venue or school funding makes R01 applicable."; existing.needsReview = true; }
  else if (existing && !required && existing.status !== "done") { existing.applicability = "inactive"; existing.applicabilityReason = "The current off-campus venue and funding do not require this R01 registration step."; }
}
function addFunding(item: WorkItem, request: FundingRequest, state: WorkspaceState, at: string) {
  item.funding.push(request);
  const keys = ["confirm_items", "confirm_quotes", "submit_budget_request", "budget_approval", "submit_purchase_request", "purchase_approval", "order_or_reimburse", "funding_closeout"];
  const titles = ["Confirm purchase items", "Confirm quotes", "Submit budget request", "Record budget approval", "Submit purchase request", "Record purchase approval", "Order or reimburse", "Record receipts and close out"];
  let previous: string | undefined;
  for (let i = 0; i < keys.length; i++) {
    const id = stableId(item.id, request.id, keys[i]), gateKind = i === 3 ? "budget" : i === 5 ? "purchase" : null;
    const gateId = gateKind ? stableId(item.id, request.id, gateKind, "gate", String(request.version)) : null;
    const roleIds = item.ownerId ? state.members.find((m) => m.id === item.ownerId)?.roleIds ?? [] : [];
    const weeks = i === 0 ? item.timingDefaults.itemsWeeks : i === 1 ? item.timingDefaults.quotesWeeks : i === 2 ? item.timingDefaults.budgetWeeks : null;
    item.tasks.push(newTask(item, {
      id, title: titles[i], sourceNodeId: keys[i], stageKey: "funding", stageTitle: "Funding",
      roleIds, ownerId: item.ownerId, dependsOn: previous ? [previous] : [],
      kind: gateKind ? "approval" : "task", gateId,
      relativeTarget: weeks === null ? null : { offsetDays: weeks * 7, unit: "calendar", source: "organization-default" },
      ...(i === 0 ? { milestoneKey: "items" } : i === 1 ? { milestoneKey: "quotes" } : i === 2 ? { milestoneKey: "budget_request" } : {}),
      ...(i === 7 ? { relativeTarget: { offsetDays: -5, unit: "business", source: "organization-default" } } : {}),
      rank: item.tasks.length,
    }, at));
    if (gateKind) item.gates.push({ id: gateId!, taskId: id, kind: gateKind, requestId: request.id, requestVersion: request.version, status: "pending", evidence: "", decidedBy: null, decidedAt: null });
    previous = id;
  }
}
function createWork(state: WorkspaceState, org: WorkspaceOrganization, input: Extract<WorkspaceCommand, { type: "work.create" }>["input"], approved: SetupDraft | null, at: string) {
  if (has(state.workItems, input.id)) throw new WorkspaceError("That work item already exists.", 409);
  member(state, input.ownerId);
  if (input.kind === "member_event" && !approved?.confirmed)
    throw new WorkspaceError("Confirm organization setup before creating a member activity.", 409);
  const compiled = approved?.compiled as { onDemand?: { memberWorkflow?: OrgFlow } } | null;
  const template = input.kind === "member_event"
    ? compiled?.onDemand?.memberWorkflow ? FlowSchema.parse({ ...compiled.onDemand.memberWorkflow, raci: [] }) : approved?.memberFlow
    : input.flow;
  const flow: OrgFlow = template ?? { title: "Executive work", explanation: "A simple editable work chain. Review the actual task before proceeding.", nodes: ["Plan work", "Carry out the work", "Record the outcome"].map((title, i) => ({ id: `work_${i}`, title, description: "", actionIds: [], roleIds: [], dependsOn: i ? [`work_${i - 1}`] : [], dependencyMode: "all", position: { x: i * 280, y: 0 }, basis: "Editable executive work template" })), raci: [] };
  const error = graphError(flow.nodes); if (error) throw new WorkspaceError(error);
  if (flow.nodes.some((n) => n.roleIds.some((id) => !has(org.roles, id)))) throw new WorkspaceError("The work template refers to an unknown role.");
  const item = WorkItemSchema.parse({
    id: input.id, kind: input.kind, name: input.name, description: input.description,
    date: input.date, venue: input.venue, ownerId: input.ownerId,
    templateVersion: org.contextVersion, templateFlow: flow, timingDefaults: org.timingDefaults ?? DEFAULT_TIMING,
    tasks: [], createdAt: at, updatedAt: at,
  });
  const ids = new Map(flow.nodes.map((n) => [n.id, stableId(item.id, n.id)]));
  const ranks = new Map<string, number>();
  const rank = (id: string): number => {
    if (ranks.has(id)) return ranks.get(id)!;
    const n = flow.nodes.find((v) => v.id === id)!;
    const r = n.dependsOn.length ? Math.max(...n.dependsOn.map(rank)) + 1 : 0;
    ranks.set(id, r); return r;
  };
  item.tasks = flow.nodes.map((n, i) => newTask(item, {
    id: ids.get(n.id)!, title: n.title, description: n.description,
    sourceNodeId: n.id, roleIds: unique(n.roleIds), ...resolveOwners(state, n.roleIds, item.ownerId),
    ...("milestoneKey" in n ? { milestoneKey: n.milestoneKey } : {}),
    dependsOn: n.dependsOn.map((id) => ids.get(id)!), dependencyMode: n.dependencyMode,
    stageKey: `stage_${rank(n.id)}`, stageTitle: rank(n.id) === 0 ? "Get started" : "Step " + (rank(n.id) + 1), rank: i,
  }, at));
  if (input.fundingSource !== "none") addFunding(item, {
    id: stableId(item.id, "funding"), version: 1, source: input.fundingSource,
    purpose: input.name, currency: "USD", amount: input.requestedAmount, status: "draft",
    approvedVersion: null, approvedAmount: null, committedAmount: 0, spentAmount: 0, commitments: [], evidence: "", spendBy: null,
  }, state, at);
  syncRegistration(item, at);
  state.workItems.push(item);
}
function complete(item: WorkItem, task: WorkTask, at: string) {
  ensureCompletable(item, task);
  task.status = "done"; task.completedAt = at; task.updatedAt = at;
  const budget = item.gates.find((g) => g.kind === "budget" && item.tasks.find((t) => t.id === g.taskId)?.dependsOn.includes(task.id));
  if (budget) requireValue(item.funding.find((f) => f.id === budget.requestId), "Funding request not found.").status = "submitted";
}
/** Pure, server-authorized command reducer. Its result is committed by one CAS. */
export function applyWorkspaceCommand(original: WorkspaceState, org: WorkspaceOrganization, command: WorkspaceCommand, approved: SetupDraft | null, at: string): WorkspaceState {
  const state = structuredClone(original);
  if (command.type === "actor.select") {
    member(state, command.memberId); state.actorId = command.memberId;
  } else if (command.type === "member.upsert") {
    if (state.members.length) requireManager(state);
    if (command.member.roleIds.some((id) => !has(org.roles, id))) throw new WorkspaceError("Bind the member only to existing organization roles.");
    const first = !state.members.length;
    const value: WorkspaceMember = { ...command.member, roleIds: unique(command.member.roleIds), ...(first ? { access: "manager" } : {}) };
    if (has(state.members, value.id)) state.members = state.members.map((m) => m.id === value.id ? value : m);
    else state.members.push(value);
    if (first) state.actorId = value.id;
    if (!state.members.some((m) => m.access === "manager")) throw new WorkspaceError("Keep at least one demo manager.");
  } else if (command.type === "member.remove") {
    requireManager(state);
    requireValue(state.members.find((m) => m.id === command.memberId), "Member not found.");
    if (state.actorId === command.memberId) throw new WorkspaceError("Switch demo actors before removing the selected member.");
    state.members = state.members.filter((m) => m.id !== command.memberId);
    if (!state.members.some((m) => m.access === "manager")) throw new WorkspaceError("Keep at least one demo manager.");
    for (const item of state.workItems) {
      if (item.ownerId === command.memberId) item.ownerId = null;
      for (const task of item.tasks) {
        task.collaboratorIds = task.collaboratorIds.filter((id) => id !== command.memberId);
        if (task.ownerId === command.memberId) { task.ownerId = null; task.needsReview = true; }
      }
    }
  } else if (command.type === "work.create") {
    requireManager(state); createWork(state, org, command.input, approved, at);
  } else {
    const item = requireValue(state.workItems.find((w) => w.id === command.workItemId), "Work item not found in this workspace.");
    item.updatedAt = at;
    if (command.type === "work.update") {
      requireManager(state); member(state, command.patch.ownerId ?? null); Object.assign(item, command.patch);
    } else if (command.type === "work.applyTiming") {
      requireManager(state); item.timingDefaults = command.timingDefaults;
      for (const task of item.tasks) {
        if (task.status === "done" || task.manualFields.includes("relativeTarget")) continue;
        const key = task.milestoneKey;
        const weeks = key === "items" ? command.timingDefaults.itemsWeeks : key === "quotes" ? command.timingDefaults.quotesWeeks : key === "budget_request" ? command.timingDefaults.budgetWeeks : null;
        if (weeks !== null) task.relativeTarget = { offsetDays: weeks * 7, unit: "calendar", source: "organization-default" };
      }
    } else if (command.type === "work.applyTemplate") {
      requireManager(state);
      if (command.templateVersion !== org.contextVersion || !approved?.confirmed) throw new WorkspaceError("Preview the currently approved template version before adopting it.", 409);
      if (item.kind !== "member_event") throw new WorkspaceError("Executive work uses its own approved work-specific flow, not the member activity template.");
      const temporary = structuredClone(state);
      temporary.workItems = temporary.workItems.filter((w) => w.id !== item.id);
      createWork(temporary, org, { id: item.id, kind: item.kind, name: item.name, description: item.description, venue: item.venue, date: item.date, ownerId: item.ownerId, fundingSource: "none", requestedAmount: 0 }, approved, at);
      const fresh = temporary.workItems.find((w) => w.id === item.id)!;
      const oldTemplateIds = new Set(item.templateFlow?.nodes.map((n) => n.id) ?? []);
      const merged = fresh.tasks.map((candidate) => {
        const old = item.tasks.find((t) => t.id === candidate.id);
        if (!old || old.status === "done") return old ?? candidate;
        const next = { ...candidate, status: old.status, blockers: old.blockers, progress: old.progress, manualFields: old.manualFields, dueOverride: old.dueOverride, completedAt: old.completedAt };
        for (const field of old.manualFields)
          if (field in old) (next as Record<string, unknown>)[field] = (old as Record<string, unknown>)[field];
        next.needsReview = old.needsReview || JSON.stringify([old.title, old.roleIds, old.dependsOn]) !== JSON.stringify([next.title, next.roleIds, next.dependsOn]);
        return next;
      });
      for (const old of item.tasks.filter((t) => !merged.some((n) => n.id === t.id)))
        merged.push({ ...old, needsReview: old.needsReview || !!old.sourceNodeId && oldTemplateIds.has(old.sourceNodeId) });
      item.tasks = merged; item.templateFlow = fresh.templateFlow; item.templateVersion = org.contextVersion;
    } else if (command.type === "work.remove") {
      requireManager(state);
      if (item.funding.some((f) => f.spentAmount || f.committedAmount)) throw new WorkspaceError("Retain work items with committed or spent funds for their history.");
      state.workItems = state.workItems.filter((w) => w.id !== item.id);
    } else if (command.type === "task.add") {
      requireManager(state);
      if (has(item.tasks, command.task.id)) throw new WorkspaceError("That task already exists.");
      const { id, title, description, stageKey, stageTitle, roleIds, ownerId, collaboratorIds, dependsOn, dependencyMode, relativeTarget, dueOverride, estimatedDays, applicability, applicabilityReason } = command.task;
      item.tasks.push(newTask(item, { id, title, description, stageKey, stageTitle, roleIds, ownerId, collaboratorIds, dependsOn, dependencyMode, relativeTarget, dueOverride, estimatedDays, applicability, applicabilityReason }, at));
    } else if (command.type === "task.review") {
      requireManager(state); command.taskIds.forEach((id) => { requireValue(item.tasks.find((t) => t.id === id), "Task not found.").needsReview = false; });
    } else if (command.type.startsWith("task.")) {
      const c = command as Extract<WorkspaceCommand, { taskId: string }>;
      const task = requireValue(item.tasks.find((t) => t.id === c.taskId), "Task not found in this work item.");
      if (c.type === "task.progress") {
        if (!state.actorId || (!manager(state) && task.ownerId !== state.actorId && !task.collaboratorIds.includes(state.actorId))) throw new WorkspaceError("Only a participant may submit progress on this task.", 403);
        task.progress.push({ memberId: state.actorId, text: c.text, at });
      } else mayAct(state, task);
      if (c.type === "task.complete") complete(item, task, at);
      else if (c.type === "task.reopen") {
        if (task.kind === "approval") throw new WorkspaceError("Approval history can only be changed through a new request version.");
        if (task.status !== "done") throw new WorkspaceError("Only a completed task can be reopened.");
        task.status = "to_do"; task.completedAt = null;
        for (const down of item.tasks.filter((t) => t.dependsOn.includes(task.id))) {
          if (down.status !== "to_do") down.needsReview = true;
          if (down.status === "working" && !ready(item, down)) {
            down.status = "stuck";
            down.blockers.push({ id: stableId(down.id, task.id, "reopened"), kind: "waiting_dependency", targetId: task.id, reason: "An upstream task was reopened. Review the handoff.", at, resumeStatus: "working" });
          }
        }
      } else if (c.type === "task.remove") {
        requireManager(state);
        if (task.kind === "approval" || task.status === "done" || task.officialRules.length || task.sourceNodeId && item.funding.length && fundingKeys.includes(task.sourceNodeId))
          throw new WorkspaceError("Retain completed and funding-control tasks; use an explicit revision instead.");
        item.tasks = item.tasks.filter((t) => t.id !== task.id);
        for (const down of item.tasks) if (down.dependsOn.includes(task.id)) {
          down.dependsOn = down.dependsOn.filter((id) => id !== task.id); down.needsReview = true;
        }
      } else if (c.type === "task.update") {
        requireManager(state);
        if (task.kind === "approval" && ["dependsOn", "applicability", "roleIds"].some((key) => key in c.patch)) throw new WorkspaceError("Approval controls cannot be removed by editing a normal task.");
        if ((task.officialRules.length || task.sourceNodeId && fundingKeys.includes(task.sourceNodeId)) && ["dependsOn", "applicability"].some((key) => key in c.patch)) throw new WorkspaceError("Keep official and funding-control dependencies; revise the work item or funding request instead.");
        if (c.patch.applicability === "inactive" && !c.patch.applicabilityReason?.trim()) throw new WorkspaceError("Record why a branch is not applicable before excluding it.");
        Object.assign(task, c.patch);
        task.manualFields = unique([...task.manualFields, ...Object.keys(c.patch)]);
        const title = c.patch.stageTitle ?? item.tasks.find((t) => t.id !== task.id && t.stageKey === task.stageKey)?.stageTitle ?? task.stageTitle;
        for (const same of item.tasks.filter((t) => t.stageKey === task.stageKey)) same.stageTitle = title;
        if (c.patch.applicability) for (const down of item.tasks.filter((t) => t.dependsOn.includes(task.id))) down.needsReview = true;
      } else if (c.type === "task.unblock") {
        const blocker = requireValue(task.blockers.find((b) => b.id === c.blockerId), "Blocker not found.");
        if (blocker.kind === "waiting_dependency" && !ready(item, task)) throw new WorkspaceError("The prerequisite work is still incomplete.");
        if (blocker.kind === "waiting_approval" && item.gates.find((g) => g.id === blocker.targetId)?.status !== "approved") throw new WorkspaceError("The approval has not been recorded yet.");
        task.blockers = task.blockers.filter((b) => b.id !== blocker.id);
        if (!task.blockers.length && task.status === "stuck") task.status = ready(item, task) ? blocker.resumeStatus : "to_do";
      } else if (c.type === "task.move") {
        if (c.status === "done") complete(item, task, at);
        else {
          if (task.kind === "approval") throw new WorkspaceError("Use an approval decision for approval steps.");
          if (task.status === "done") throw new WorkspaceError("Use Reopen to preserve the completion history.");
          if (c.status === "working" && (!ready(item, task) || task.blockers.length || task.needsReview)) throw new WorkspaceError("Resolve the task's dependencies and blockers before starting it.");
          if (c.status === "stuck") {
            if (!c.blocker) throw new WorkspaceError("Choose a specific blocker before moving to Stuck.");
            if (c.blocker.targetId && !has(item.tasks, c.blocker.targetId) && !has(item.gates, c.blocker.targetId)) throw new WorkspaceError("The blocker refers to an unknown task or approval.");
            const blocker = { ...c.blocker, at, resumeStatus: task.status === "working" ? "working" as const : "to_do" as const };
            task.blockers = [...task.blockers.filter((b) => b.id !== blocker.id), blocker];
          } else if (task.blockers.length) throw new WorkspaceError("Resolve blockers explicitly before changing this task's status.");
          task.status = c.status;
        }
        const column = item.tasks.filter((t) => t.id !== task.id && t.status === task.status).sort((a, b) => a.rank - b.rank);
        const before = c.beforeId ? column.findIndex((t) => t.id === c.beforeId) : -1;
        column.splice(before < 0 ? column.length : before, 0, task); column.forEach((t, i) => t.rank = i);
      }
      task.updatedAt = at;
    } else if (command.type === "gate.decide") {
      requireManager(state);
      const gate = requireValue(item.gates.find((g) => g.id === command.gateId), "Approval not found.");
      if (gate.status !== "pending") throw new WorkspaceError("This approval already has a decision; revise and resubmit the request instead.", 409);
      const task = requireValue(item.tasks.find((t) => t.id === gate.taskId), "Approval task not found.");
      if (!ready(item, task) || task.needsReview) throw new WorkspaceError("Complete the submission and prerequisite steps before recording approval.");
      const funding = gate.requestId ? requireValue(item.funding.find((f) => f.id === gate.requestId), "Funding request not found.") : null;
      if (funding && gate.requestVersion !== funding.version) throw new WorkspaceError("This approval belongs to an older request version.", 409);
      if (funding && gate.kind === "budget") {
        if (funding.status !== "submitted") throw new WorkspaceError("Submit the current budget version before approving it.");
        funding.status = command.decision; funding.evidence = command.evidence;
        funding.approvedVersion = command.decision === "approved" ? funding.version : null;
        funding.approvedAmount = command.decision === "approved" ? funding.amount : null;
      }
      if (funding && gate.kind === "purchase" && (funding.status !== "approved" || funding.approvedVersion !== funding.version)) throw new WorkspaceError("The current budget request has not been approved.");
      gate.status = command.decision; gate.evidence = command.evidence; gate.decidedBy = state.actorId; gate.decidedAt = at;
      task.status = command.decision === "approved" ? "done" : "stuck"; task.completedAt = command.decision === "approved" ? at : null; task.updatedAt = at;
    } else if (command.type === "funding.add") {
      requireManager(state);
      if (has(item.funding, command.requestId)) throw new WorkspaceError("That funding request already exists.", 409);
      addFunding(item, { id: command.requestId, version: 1, source: command.source, purpose: command.purpose, currency: "USD", amount: command.amount, status: "draft", approvedVersion: null, approvedAmount: null, committedAmount: 0, spentAmount: 0, commitments: [], evidence: "", spendBy: null }, state, at);
    } else if (command.type === "funding.revise") {
      requireManager(state);
      const funding = requireValue(item.funding.find((f) => f.id === command.requestId), "Funding request not found.");
      if (command.amount < funding.spentAmount + funding.committedAmount) throw new WorkspaceError("The revised amount cannot erase funds already spent or committed.");
      funding.version++; funding.amount = command.amount; funding.source = command.source; funding.purpose = command.purpose;
      funding.status = "draft"; funding.approvedVersion = null; funding.approvedAmount = null; funding.evidence = "";
      for (const gate of item.gates.filter((g) => g.requestId === funding.id && g.requestVersion === funding.version - 1)) {
        const approvalTask = requireValue(item.tasks.find((t) => t.id === gate.taskId), "Approval task not found.");
        const id = stableId(item.id, funding.id, gate.kind, "gate", String(funding.version));
        item.gates.push({ ...gate, id, requestVersion: funding.version, status: "pending", evidence: "", decidedBy: null, decidedAt: null });
        approvalTask.gateId = id; approvalTask.status = "to_do"; approvalTask.completedAt = null;
        for (const submit of item.tasks.filter((t) => approvalTask.dependsOn.includes(t.id))) { submit.status = "to_do"; submit.completedAt = null; }
      }
    } else if (command.type === "funding.commit") {
      requireManager(state);
      const funding = requireValue(item.funding.find((f) => f.id === command.requestId), "Funding request not found.");
      if (has(funding.commitments, command.commitmentId)) throw new WorkspaceError("That funding commitment already exists.", 409);
      const purchase = item.gates.find((g) => g.requestId === funding.id && g.kind === "purchase" && g.requestVersion === funding.version);
      if (funding.status !== "approved" || funding.approvedVersion !== funding.version || purchase?.status !== "approved") throw new WorkspaceError("Record both current budget and purchase approval before committing funds.");
      const cents = (amount: number) => Math.round(amount * 100);
      if (cents(funding.spentAmount) + cents(funding.committedAmount) + cents(command.amount) > cents(funding.approvedAmount ?? 0)) throw new WorkspaceError("The cumulative spent and committed amount would exceed this source's approved budget.");
      funding.commitments.push({ id: command.commitmentId, amount: command.amount, purpose: command.purpose, at, status: "reserved", requestVersion: funding.version, evidence: "" });
      funding.committedAmount = (cents(funding.committedAmount) + cents(command.amount)) / 100;
    } else if (command.type === "funding.spend" || command.type === "funding.release") {
      requireManager(state);
      const funding = requireValue(item.funding.find((f) => f.id === command.requestId), "Funding request not found.");
      const commitment = requireValue(funding.commitments.find((c) => c.id === command.commitmentId), "Commitment not found.");
      if (commitment.status !== "reserved") throw new WorkspaceError("Only a pending reservation can be spent or released.", 409);
      if (command.type === "funding.spend" && (commitment.requestVersion !== funding.version || funding.approvedVersion !== funding.version || funding.status !== "approved")) throw new WorkspaceError("Approve the current request version and re-reserve funds before spending an outdated commitment.");
      funding.committedAmount = Math.round((funding.committedAmount - commitment.amount) * 100) / 100;
      if (command.type === "funding.spend") funding.spentAmount = Math.round((funding.spentAmount + commitment.amount) * 100) / 100;
      commitment.status = command.type === "funding.spend" ? "spent" : "released";
      commitment.evidence = command.evidence;
    }
    cleanAutomaticBlockers(item, at);
    syncRegistration(item, at);
    graph(item.tasks);
    for (const task of item.tasks) {
      member(state, task.ownerId); task.collaboratorIds.forEach((id) => member(state, id));
      if (task.roleIds.some((id) => !has(org.roles, id))) throw new WorkspaceError("A task refers to an unknown organization role.");
    }
  }
  state.updatedAt = at;
  return WorkspaceStateSchema.parse(state);
}
