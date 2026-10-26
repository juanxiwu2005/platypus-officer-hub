import { beforeEach, describe, expect, it, vi } from "vitest";
import { compileOrganization, scopeKey, upgrade } from "../organization/setupLogic";
import { fixtureDraft, fixtureFlow } from "../organization/testing/fixtures";
import { DEFAULT_TIMING, type WorkspaceState, type WorkspaceOrganization, type WorkspaceCommand } from "./contracts";
import { applyWorkspaceCommand, ready } from "../../netlify/lib/workspace/runtime.mts";
import { validateWorkspaceCommand } from "../../netlify/lib/workspace/commands.mts";
const fake = vi.hoisted(() => ({
  rows: new Map<string, { data: unknown; etag: string }>(), n: 0,
  archiveFails: false, race: false,
}));
vi.mock("@netlify/blobs", () => ({ getStore: ({ name }: { name: string }) => ({
  getWithMetadata: async (key: string) => structuredClone(fake.rows.get(name + "/" + key) ?? null),
  setJSON: async (key: string, data: unknown, options: { onlyIfNew?: boolean; onlyIfMatch?: string } = {}) => {
    if (fake.archiveFails && key.startsWith("archives/")) throw new Error("archive temporarily unavailable");
    const path = name + "/" + key, old = fake.rows.get(path);
    if (fake.race && name === "platypus-activity-workspace-v1" && options.onlyIfMatch) { fake.race = false; return { modified: false }; }
    if (options.onlyIfNew && old || options.onlyIfMatch && old?.etag !== options.onlyIfMatch) return { modified: false };
    const etag = "v" + ++fake.n; fake.rows.set(path, { data: structuredClone(data), etag }); return { modified: true, etag };
  },
}) }));
import endpoint from "../../netlify/functions/workspace.mts";
import { startSession, saveSession } from "../../netlify/lib/organization/storage.mts";
import { loadWorkspace, mutateWorkspace, previewWorkspaceCommand } from "../../netlify/lib/workspace/storage.mts";
const at = "2026-10-26T20:00:00.000Z";
function approved() {
  const d = upgrade(fixtureDraft()); d.memberFlow = fixtureFlow(d);
  d.riskCheck = { status: "skipped", inputKey: scopeKey(d, "risk_check"), risks: [], answers: {}, at };
  d.confirmed = true; d.contextVersion = 1; d.confirmedAt = at; d.compiled = compileOrganization(d);
  return d;
}
function org(): WorkspaceOrganization {
  const d = approved(); return { name: d.name, mission: d.mission, roles: d.roles, departments: d.departments, contextVersion: 1, timingDefaults: { ...DEFAULT_TIMING } };
}
function initial(): WorkspaceState {
  return { schemaVersion: 1, workspaceId: "workspace_one", revision: 0, actorId: "leader", members: [{ id: "leader", name: "Demo leader", access: "manager", roleIds: org().roles.map((r) => r.id) }], workItems: [], updatedAt: at };
}
const cmd = (s: WorkspaceState, c: WorkspaceCommand) => applyWorkspaceCommand(s, org(), validateWorkspaceCommand(c), approved(), at);
function created(funding = false) {
  return cmd(initial(), { type: "work.create", input: { id: "event_one", kind: "member_event", name: "Fictional event", date: "2026-11-20", description: "", venue: "campus", ownerId: "leader", fundingSource: funding ? "usg" : "none", requestedAmount: funding ? 100 : 0 } });
}
const post = (body: unknown, cookie = "") => new Request("https://example.org/api/workspace", { method: "POST", headers: { origin: "https://example.org", cookie, "content-type": "application/json", "x-platypus-request": "organization-setup" }, body: JSON.stringify(body) });
beforeEach(() => { fake.rows.clear(); fake.n = 0; fake.archiveFails = false; fake.race = false; });

describe("work-item task and approval semantics", () => {
  it("creates tasks only within a work item from the server-approved template and keeps all roles", () => {
    const state = created(), item = state.workItems[0];
    expect(item.tasks.length).toBeGreaterThan(approved().memberFlow!.nodes.length);
    for (const node of approved().memberFlow!.nodes) expect(item.tasks.find((t) => t.sourceNodeId === node.id)?.roleIds).toEqual(node.roleIds);
    expect(item.tasks.every((t) => t.parentWorkItemId === item.id && t.status === "to_do")).toBe(true);
    expect(item.tasks.find((t) => t.sourceNodeId === "university_registration")?.officialRules[0].ruleId).toBe("R01");
    expect(() => applyWorkspaceCommand(initial(), org(), { type: "work.create", input: { id: "bad", kind: "member_event", name: "Needs setup", date: null, venue: "campus", ownerId: null, description: "", fundingSource: "none", requestedAmount: 0 } }, null, at)).toThrow("Confirm organization");
  });
  it("leaves ambiguous multiple-role ownership unassigned rather than randomly picking a member", () => {
    const state = initial(); state.members.push({ id: "finance", name: "Second officer", roleIds: ["finance"], access: "member" });
    const next = cmd(state, { type: "work.create", input: { id: "shared", kind: "member_event", name: "Shared work", date: null, description: "", venue: "offcampus", ownerId: "leader", fundingSource: "none", requestedAmount: 0 } });
    const shared = next.workItems[0].tasks.find((t) => t.roleIds.includes("finance"))!;
    expect(shared.ownerId).toBe(null); expect(shared.collaboratorIds).toEqual(["leader", "finance"]);
  });
  it("supports all/any dependencies and never auto-starts or completes downstream work", () => {
    const state = created(), item = state.workItems[0], sample = item.tasks[0];
    item.tasks = [
      { ...sample, id: "one", dependsOn: [] }, { ...sample, id: "two", dependsOn: [] },
      { ...sample, id: "all", dependsOn: ["one", "two"], dependencyMode: "all" },
      { ...sample, id: "any", dependsOn: ["one", "two"], dependencyMode: "any" },
    ];
    const next = cmd(state, { type: "task.complete", workItemId: item.id, taskId: "one" });
    expect(ready(next.workItems[0], next.workItems[0].tasks[2])).toBe(false);
    expect(ready(next.workItems[0], next.workItems[0].tasks[3])).toBe(true);
    expect(next.workItems[0].tasks.slice(1).every((t) => t.status === "to_do")).toBe(true);
    expect(() => cmd(next, { type: "task.move", workItemId: item.id, taskId: "all", status: "working" })).toThrow("dependencies");
  });
  it("does not let an inactive OR branch satisfy a still-unfinished alternative", () => {
    const item = created().workItems[0], base = item.tasks[0];
    item.tasks = [{ ...base, id: "inactive", status: "done", applicability: "inactive", applicabilityReason: "Not selected" }, { ...base, id: "or", dependsOn: ["inactive"], dependencyMode: "any" }];
    expect(ready(item, item.tasks[1])).toBe(false);
  });
  it("retains independent blockers and collaborator progress cannot complete shared work", () => {
    let state = created(), item = state.workItems[0], task = item.tasks[0];
    state.members.push({ id: "helper", name: "Helper", roleIds: [], access: "member" }); task.collaboratorIds = ["helper"];
    for (const id of ["help", "reply"]) state = cmd(state, { type: "task.move", workItemId: item.id, taskId: task.id, status: "stuck", blocker: { id, kind: id === "help" ? "needs_help" : "external_response", reason: "Specific issue", targetId: null, at, resumeStatus: "to_do" } });
    state = cmd(state, { type: "task.unblock", workItemId: item.id, taskId: task.id, blockerId: "reply", evidence: "Reply arrived" });
    expect(state.workItems[0].tasks[0].blockers.map((b) => b.id)).toEqual(["help"]);
    expect(state.workItems[0].tasks[0].status).toBe("stuck");
    state.actorId = "helper";
    state = cmd(state, { type: "task.progress", workItemId: item.id, taskId: task.id, text: "My part is ready" });
    expect(state.workItems[0].tasks[0].progress[0].memberId).toBe("helper");
    expect(() => cmd(state, { type: "task.complete", workItemId: item.id, taskId: task.id })).toThrow("primary owner");
  });
  it("preserves past funding decisions when ordinary completion is reopened", () => {
    let state = created(), item = state.workItems[0];
    const first = item.tasks.find((t) => !t.dependsOn.length)!;
    state = cmd(state, { type: "task.complete", workItemId: item.id, taskId: first.id });
    const dependent = state.workItems[0].tasks.find((t) => t.dependsOn.includes(first.id));
    if (dependent) { dependent.status = "done"; dependent.completedAt = at; }
    state = cmd(state, { type: "task.reopen", workItemId: item.id, taskId: first.id });
    expect(state.workItems[0].tasks.find((t) => t.id === first.id)?.completedAt).toBe(null);
    if (dependent) expect(state.workItems[0].tasks.find((t) => t.id === dependent.id)).toMatchObject({ status: "done", needsReview: true });
  });
  it("rejects cycles and hides no backward group dependency while stage renames stay synchronized", () => {
    const state = created(), item = state.workItems[0];
    const one = item.tasks[0], other = item.tasks.find((t) => t.id !== one.id)!;
    expect(() => cmd(state, { type: "task.update", workItemId: item.id, taskId: one.id, patch: { dependsOn: [one.id] } })).toThrow("cycle");
    const renamed = cmd(state, { type: "task.update", workItemId: item.id, taskId: one.id, patch: { stageTitle: "New stage label" } });
    expect(renamed.workItems[0].tasks.filter((t) => t.stageKey === one.stageKey).every((t) => t.stageTitle === "New stage label")).toBe(true);
    item.tasks = [{ ...one, id: "a", stageKey: "A", stageTitle: "A", dependsOn: [] }, { ...other, id: "b", stageKey: "B", stageTitle: "B", dependsOn: ["a"] }, { ...other, id: "c", stageKey: "C", stageTitle: "C", dependsOn: ["b"] }];
    expect(() => cmd(state, { type: "task.update", workItemId: item.id, taskId: "c", patch: { stageKey: "A", stageTitle: "A" } })).toThrow("backward dependency");
  });
  it("does not trust client-created task completion, approval or official-rule fields", () => {
    const state = created(), item = state.workItems[0], malicious = { ...item.tasks[0], id: "added", status: "done" as const, completedAt: at, kind: "approval" as const, gateId: "forged_gate", officialRules: [{ ruleId: "R99", days: 1, unit: "calendar" as const }] };
    const next = cmd(state, { type: "task.add", workItemId: item.id, task: malicious });
    expect(next.workItems[0].tasks.find((t) => t.id === "added")).toMatchObject({ status: "to_do", kind: "task", gateId: null, completedAt: null, officialRules: [] });
  });
});

function advanceFunding(state: WorkspaceState) {
  let next = state; const item = next.workItems[0];
  for (const key of ["confirm_items", "confirm_quotes", "submit_budget_request"]) {
    const task = next.workItems[0].tasks.find((t) => t.sourceNodeId === key)!;
    next = cmd(next, { type: "task.complete", workItemId: item.id, taskId: task.id });
  }
  return next;
}
describe("separate submission and approval with versioned source budgets", () => {
  it("keeps purchases locked after submission until an evidenced budget and purchase approval", () => {
    let state = advanceFunding(created(true)); const item = state.workItems[0], funding = item.funding[0];
    expect(funding.status).toBe("submitted");
    const budget = item.gates.find((g) => g.kind === "budget")!;
    expect(() => cmd(state, { type: "task.complete", workItemId: item.id, taskId: budget.taskId })).toThrow("explicit approval");
    expect(() => cmd(state, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "early", amount: 1, purpose: "Early" })).toThrow("both current");
    state = cmd(state, { type: "gate.decide", workItemId: item.id, gateId: budget.id, decision: "approved", evidence: "Fictional school approval record" });
    const purchaseSubmit = state.workItems[0].tasks.find((t) => t.sourceNodeId === "submit_purchase_request")!;
    state = cmd(state, { type: "task.complete", workItemId: item.id, taskId: purchaseSubmit.id });
    const purchase = item.gates.find((g) => g.kind === "purchase")!;
    state = cmd(state, { type: "gate.decide", workItemId: item.id, gateId: purchase.id, decision: "approved", evidence: "Fictional purchase approval record" });
    state = cmd(state, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "one", amount: 60, purpose: "Materials" });
    expect(() => cmd(state, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "two", amount: 50, purpose: "More" })).toThrow("cumulative");
    state = cmd(state, { type: "funding.spend", workItemId: item.id, requestId: funding.id, commitmentId: "one", evidence: "Fictional receipt" });
    expect(state.workItems[0].funding[0]).toMatchObject({ committedAmount: 0, spentAmount: 60 });
    expect(() => cmd(state, { type: "funding.release", workItemId: item.id, requestId: funding.id, commitmentId: "one", evidence: "Cannot erase spending" })).toThrow("pending reservation");
    const revised = cmd(state, { type: "funding.revise", workItemId: item.id, requestId: funding.id, amount: 120, source: "college", purpose: "Revised scope" });
    expect(revised.workItems[0].funding[0]).toMatchObject({ version: 2, status: "draft", approvedVersion: null, spentAmount: 60 });
    expect(revised.workItems[0].gates.some((g) => g.requestVersion === 1 && g.status === "approved")).toBe(true);
    expect(() => cmd(revised, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "new", amount: 1, purpose: "Needs new approval" })).toThrow("both current");
  });
  it("rejects invalid dates, cents precision and unknown command fields", () => {
    expect(() => validateWorkspaceCommand({ type: "work.update", workItemId: "x", patch: { date: "2026-02-30" } })).toThrow();
    expect(() => validateWorkspaceCommand({ type: "funding.commit", workItemId: "x", requestId: "r", commitmentId: "c", amount: 0.005, purpose: "Invalid" })).toThrow();
    expect(() => validateWorkspaceCommand({ type: "actor.select", memberId: "x", actorId: "manager" })).toThrow();
  });
  it("adopts new timing without changing completed tasks or manual targets", () => {
    const state = created(true), item = state.workItems[0];
    const items = item.tasks.find((t) => t.milestoneKey === "items")!, quotes = item.tasks.find((t) => t.milestoneKey === "quotes")!;
    items.status = "done"; items.completedAt = at;
    quotes.manualFields = ["relativeTarget"]; quotes.relativeTarget = { offsetDays: 17, unit: "calendar", source: "manual" };
    const next = cmd(state, { type: "work.applyTiming", workItemId: item.id, timingDefaults: { itemsWeeks: 10, quotesWeeks: 9, budgetWeeks: 8 } });
    expect(next.workItems[0].tasks.find((t) => t.id === items.id)?.relativeTarget?.offsetDays).toBe(56);
    expect(next.workItems[0].tasks.find((t) => t.id === quotes.id)?.relativeTarget?.offsetDays).toBe(17);
    expect(next.workItems[0].tasks.find((t) => t.milestoneKey === "budget_request")?.relativeTarget?.offsetDays).toBe(56);
  });
});

async function browser() {
  const started = await startSession(post({})); const cookie = started.cookie!.split(";")[0];
  const d = approved(); await saveSession(post({}, cookie), d, 0, true);
  return cookie;
}
describe("private server workspace CAS, idempotency and recoverable audit outbox", () => {
  it("bootstraps a demo manager and reads the same server state after refresh", async () => {
    const cookie = await browser(); const first = await loadWorkspace(post({}, cookie));
    expect(first.state.members).toEqual([]);
    const input = { requestId: "bootstrap", revision: 0, command: { type: "member.upsert", member: { id: "leader", name: "Fictional member", roleIds: [], access: "member" } } };
    const saved = await mutateWorkspace(post({}, cookie), input);
    expect(saved.state.members[0].access).toBe("manager"); expect(saved.state.actorId).toBe("leader");
    expect((await loadWorkspace(post({}, cookie))).state).toEqual(saved.state);
    expect((await mutateWorkspace(post({}, cookie), input)).state.revision).toBe(1);
    await expect(mutateWorkspace(post({}, cookie), { ...input, command: { ...input.command, member: { ...input.command.member, name: "Different payload" } } })).rejects.toThrow("different command");
  });
  it("keeps stale or racing changes unapplied, isolated by the private workspace cookie", async () => {
    const cookie = await browser(); await loadWorkspace(post({}, cookie));
    fake.race = true;
    await expect(mutateWorkspace(post({}, cookie), { requestId: "race", revision: 0, command: { type: "member.upsert", member: { id: "leader", name: "Leader", roleIds: [], access: "manager" } } })).rejects.toThrow("committed first");
    expect((await loadWorkspace(post({}, cookie))).state.members).toEqual([]);
    const another = await browser(); expect((await loadWorkspace(post({}, another))).state.workspaceId).not.toBe((await loadWorkspace(post({}, cookie))).state.workspaceId);
    const noCookie = await endpoint(new Request("https://example.org/api/workspace")); expect(noCookie.status).toBe(401);
  });
  it("commits an audit outbox with state and retries delivery without replaying the mutation", async () => {
    const cookie = await browser(); fake.archiveFails = true;
    const mutation = { requestId: "once", revision: 0, command: { type: "member.upsert", member: { id: "leader", name: "Leader", roleIds: [], access: "manager" } } };
    const saved = await mutateWorkspace(post({}, cookie), mutation); expect(saved.state.revision).toBe(1);
    const runtime = [...fake.rows.values()].find((v) => !!(v.data as { outbox?: unknown }).outbox)!;
    expect((runtime.data as { outbox: { delivered: boolean }[] }).outbox[0].delivered).toBe(false);
    fake.archiveFails = false; await loadWorkspace(post({}, cookie));
    expect((await mutateWorkspace(post({}, cookie), mutation)).state.revision).toBe(1);
    const events = [...fake.rows.keys()].filter((key) => key.includes("archives/") && JSON.stringify(fake.rows.get(key)!.data).includes("workspace.command.committed"));
    expect(events).toHaveLength(1);
  });
  it("a proposal preview neither mutates runtime state nor grants authority from a body actor", async () => {
    const cookie = await browser(); const value = { type: "member.upsert", member: { id: "leader", name: "Leader", roleIds: [], access: "member" } };
    const preview = await previewWorkspaceCommand(post({}, cookie), value); expect(preview.state.members).toHaveLength(1);
    expect((await loadWorkspace(post({}, cookie))).state.members).toEqual([]);
  });
});
