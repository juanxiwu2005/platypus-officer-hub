import { beforeEach, describe, expect, it, vi } from "vitest";
import { compileOrganization, scopeKey, upgrade } from "../organization/setupLogic";
import { fixtureDraft, fixtureFlow } from "../organization/testing/fixtures";
import { DEFAULT_TIMING } from "./contracts";
import { applyWorkspaceCommand, ready } from "../../netlify/lib/workspace/runtime.mts";
import { validateWorkspaceCommand } from "../../netlify/lib/workspace/commands.mts";
const fake = vi.hoisted(() => ({
    rows: new Map(), n: 0,
    archiveFails: false, race: false,
}));
vi.mock("@netlify/blobs", () => ({ getStore: ({ name }) => ({
        getWithMetadata: async (key) => structuredClone(fake.rows.get(name + "/" + key) ?? null),
        setJSON: async (key, data, options = {}) => {
            if (fake.archiveFails && key.startsWith("archives/"))
                throw new Error("archive temporarily unavailable");
            const path = name + "/" + key, old = fake.rows.get(path);
            if (fake.race && name === "platypus-activity-workspace-v1" && options.onlyIfMatch) {
                fake.race = false;
                return { modified: false };
            }
            if (options.onlyIfNew && old || options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
                return { modified: false };
            const etag = "v" + ++fake.n;
            fake.rows.set(path, { data: structuredClone(data), etag });
            return { modified: true, etag };
        },
    }) }));
import endpoint from "../../netlify/functions/workspace.mts";
import { startSession, saveSession } from "../../netlify/lib/organization/storage.mts";
import { loadWorkspace, mutateWorkspace, previewWorkspaceCommand, readWorkspaceReceipt } from "../../netlify/lib/workspace/storage.mts";
const at = "2026-10-26T20:00:00.000Z";
function approved() {
    const d = upgrade(fixtureDraft());
    d.memberFlow = fixtureFlow(d);
    d.riskCheck = { status: "skipped", inputKey: scopeKey(d, "risk_check"), risks: [], answers: {}, at };
    d.confirmed = true;
    d.contextVersion = 1;
    d.confirmedAt = at;
    d.compiled = compileOrganization(d);
    return d;
}
function org() {
    const d = approved();
    return { name: d.name, mission: d.mission, roles: d.roles, departments: d.departments, contextVersion: 1, timingDefaults: { ...DEFAULT_TIMING } };
}
function initial() {
    return { schemaVersion: 1, workspaceId: "workspace_one", revision: 0, actorId: "leader", members: [{ id: "leader", name: "Demo leader", access: "manager", roleIds: org().roles.map((r) => r.id) }], workItems: [], updatedAt: at };
}
const cmd = (s, c) => applyWorkspaceCommand(s, org(), validateWorkspaceCommand(c), approved(), at);
function created(funding = false) {
    return cmd(initial(), { type: "work.create", input: { id: "event_one", kind: "member_event", name: "Fictional event", date: "2026-11-20", description: "", venue: "campus", ownerId: "leader", fundingSource: funding ? "usg" : "none", fundingCategory: "other", requestedAmount: funding ? 100 : 0 } });
}
const post = (body, cookie = "") => new Request("https://example.org/api/workspace", { method: "POST", headers: { origin: "https://example.org", cookie, "content-type": "application/json", "x-platypus-request": "organization-setup" }, body: JSON.stringify(body) });
// Server storage is hidden unless ORG_SETUP_ENABLED=true (M1, 2026-10-27); these tests cover it switched on.
beforeEach(() => { vi.stubEnv("ORG_SETUP_ENABLED", "true"); fake.rows.clear(); fake.n = 0; fake.archiveFails = false; fake.race = false; });
describe("work-item task and approval semantics", () => {
    it("keeps an explicit ANY-target blocker until that target, not another alternative, resolves", () => {
        let state = created(), item = state.workItems[0], sample = item.tasks[0];
        item.tasks = [{ ...sample, id: "a", status: "done", dependsOn: [] }, { ...sample, id: "b", dependsOn: [] }, { ...sample, id: "join", dependsOn: ["a", "b"], dependencyMode: "any" }];
        state = cmd(state, { type: "task.move", workItemId: item.id, taskId: "join", status: "stuck", blocker: { id: "waiting_b", kind: "waiting_dependency", targetId: "b", reason: "Need B's specific evidence", at, resumeStatus: "to_do" } });
        expect(state.workItems[0].tasks[2].blockers).toHaveLength(1);
        expect(() => cmd(state, { type: "task.unblock", workItemId: item.id, taskId: "join", blockerId: "waiting_b", evidence: "Other alternative is done" })).toThrow("still incomplete");
        state = cmd(state, { type: "task.move", workItemId: item.id, taskId: "join", status: "stuck", blocker: { id: "manual", kind: "needs_help", targetId: null, reason: "Separate manual issue", at, resumeStatus: "to_do" } });
        state = cmd(state, { type: "task.complete", workItemId: item.id, taskId: "b" });
        expect(state.workItems[0].tasks[2].blockers.map((b) => b.id)).toEqual(["manual"]);
        expect(state.workItems[0].tasks[2].status).toBe("stuck");
        expect(() => cmd(state, { type: "task.move", workItemId: item.id, taskId: "a", status: "stuck", blocker: { id: "bad", kind: "waiting_dependency", targetId: "b", reason: "No actual edge", at, resumeStatus: "to_do" } })).toThrow();
    });
    it("permits only a participant's cosmetic edits, not self-elevation or dependency changes", () => {
        let state = created(), item = state.workItems[0];
        state.members.push({ id: "officer", name: "Officer", access: "member", roleIds: [] });
        item.tasks[0].ownerId = "officer";
        state.actorId = "officer";
        state = cmd(state, { type: "task.update", workItemId: item.id, taskId: item.tasks[0].id, patch: { title: "Clarified title" } });
        expect(state.workItems[0].tasks[0].title).toBe("Clarified title");
        expect(() => cmd(state, { type: "task.update", workItemId: item.id, taskId: item.tasks[0].id, patch: { ownerId: "leader" } })).toThrow("manager");
        expect(() => cmd(state, { type: "member.upsert", member: { id: "officer", name: "Officer", access: "manager", roleIds: [] } })).toThrow("manager");
    });
    it("creates a general approval only from explicit metadata and permits its designated approver", () => {
        const d = approved(), organization = org(), state = initial();
        d.memberFlow.nodes[0].approval = { approverRoleIds: ["finance"], external: false, reason: "Explicit reviewed budget authority" };
        d.compiled = compileOrganization(d);
        state.members.push({ id: "finance_member", name: "Finance member", access: "member", roleIds: ["finance"] });
        const create = { type: "work.create", input: { id: "gated", kind: "member_event", name: "Gated event", description: "", date: null, venue: "offcampus", ownerId: "leader", fundingSource: "none", fundingCategory: "other", requestedAmount: 0 } };
        let next = applyWorkspaceCommand(state, organization, create, d, at);
        const item = next.workItems[0], gate = item.gates.find((g) => g.kind === "general");
        expect(gate.approverIds).toContain("finance_member");
        expect(() => cmd(next, { type: "task.complete", workItemId: item.id, taskId: gate.taskId })).toThrow("explicit approval");
        next.actorId = "finance_member";
        next = cmd(next, { type: "gate.decide", workItemId: item.id, gateId: gate.id, decision: "approved", evidence: "Reviewed in this demo" });
        expect(next.workItems[0].gates[0].decidedBy).toBe("finance_member");
        const normal = created();
        expect(normal.workItems[0].gates).toEqual([]);
    });
    it("creates an explicit external gate without granting a normal member authority to record it", () => {
        let state = created(), item = state.workItems[0], task = item.tasks[0];
        state.members.push({ id: "approver", name: "Approver", access: "member", roleIds: [] });
        state = cmd(state, { type: "gate.add", workItemId: item.id, taskId: task.id, gateId: "general_external", approverIds: ["approver"], external: true, reason: "School authority" });
        state.actorId = "approver";
        expect(() => cmd(state, { type: "gate.decide", workItemId: item.id, gateId: "general_external", decision: "approved", evidence: "Unverified" })).toThrow("manager");
    });
    it("keeps old general gates read-only after adopting a revised approval template", () => {
        const d = approved(), state = initial();
        d.memberFlow.nodes[0].approval = { approverRoleIds: ["finance"], external: false, reason: "Initial approval scope" };
        d.compiled = compileOrganization(d);
        const input = { id: "approval_versions", kind: "member_event", name: "Versioned approvals", description: "", date: null, venue: "offcampus", ownerId: "leader", fundingSource: "none", fundingCategory: "other", requestedAmount: 0 };
        let next = applyWorkspaceCommand(state, org(), { type: "work.create", input }, d, at);
        const old = next.workItems[0].gates[0];
        d.memberFlow.nodes[0].approval.reason = "Revised approval scope";
        d.compiled = compileOrganization(d);
        d.contextVersion = 2;
        next = applyWorkspaceCommand(next, { ...org(), contextVersion: 2 }, { type: "work.applyTemplate", workItemId: input.id, templateVersion: 2 }, d, at);
        next = cmd(next, { type: "task.review", workItemId: input.id, taskIds: next.workItems[0].tasks.filter((t) => t.needsReview).map((t) => t.id) });
        const current = next.workItems[0].tasks.find((t) => t.id === old.taskId).gateId;
        expect(current).not.toBe(old.id);
        expect(() => cmd(next, { type: "gate.decide", workItemId: input.id, gateId: old.id, decision: "approved", evidence: "Old scope" })).toThrow("older workflow version");
        next = cmd(next, { type: "gate.decide", workItemId: input.id, gateId: current, decision: "approved", evidence: "Current scope checked" });
        expect(next.workItems[0].gates.find((g) => g.id === current)?.status).toBe("approved");
        expect(next.workItems[0].gates.find((g) => g.id === old.id)?.status).toBe("pending");
    });
    it("groups required task IDs exactly once without changing dependencies or concealing a group cycle", () => {
        const state = created(), item = state.workItems[0], ids = item.tasks.map((t) => t.id);
        expect(() => cmd(state, { type: "work.stages", workItemId: item.id, groups: [{ id: "phase", title: "Phase", taskIds: ids.slice(1) }] })).toThrow("Every active required");
        expect(() => cmd(state, { type: "work.stages", workItemId: item.id, groups: [{ id: "phase", title: "Phase", taskIds: [...ids, ids[0]] }] })).toThrow("only one");
        const next = cmd(state, { type: "work.stages", workItemId: item.id, groups: [{ id: "phase", title: "Reviewed phase", taskIds: ids }] });
        expect(next.workItems[0].tasks.map((t) => t.dependsOn)).toEqual(item.tasks.map((t) => t.dependsOn));
        const base = item.tasks[0];
        item.tasks = [{ ...base, id: "a", dependsOn: [] }, { ...base, id: "b", dependsOn: ["a"] }, { ...base, id: "c", dependsOn: ["b"] }];
        expect(() => cmd(state, { type: "work.stages", workItemId: item.id, groups: [{ id: "outer", title: "Outer", taskIds: ["a", "c"] }, { id: "middle", title: "Middle", taskIds: ["b"] }] })).toThrow("backward dependency");
    });
    it("creates tasks only within a work item from the server-approved template and keeps all roles", () => {
        const state = created(), item = state.workItems[0];
        expect(item.tasks.length).toBeGreaterThan(approved().memberFlow.nodes.length);
        for (const node of approved().memberFlow.nodes)
            expect(item.tasks.find((t) => t.sourceNodeId === node.id)?.roleIds).toEqual(node.roleIds);
        expect(item.tasks.every((t) => t.parentWorkItemId === item.id && t.status === "to_do")).toBe(true);
        expect(item.tasks.find((t) => t.sourceNodeId === "university_registration")?.officialRules[0].ruleId).toBe("R01");
        expect(() => applyWorkspaceCommand(initial(), org(), { type: "work.create", input: { id: "bad", kind: "member_event", name: "Needs setup", date: null, venue: "campus", ownerId: null, description: "", fundingSource: "none", fundingCategory: "other", requestedAmount: 0 } }, null, at)).toThrow("Confirm organization");
    });
    it("leaves ambiguous multiple-role ownership unassigned rather than randomly picking a member", () => {
        const state = initial();
        state.members.push({ id: "finance", name: "Second officer", roleIds: ["finance"], access: "member" });
        const next = cmd(state, { type: "work.create", input: { id: "shared", kind: "member_event", name: "Shared work", date: null, description: "", venue: "offcampus", ownerId: "leader", fundingSource: "none", fundingCategory: "other", requestedAmount: 0 } });
        const shared = next.workItems[0].tasks.find((t) => t.roleIds.includes("finance"));
        expect(shared.ownerId).toBe(null);
        expect(shared.collaboratorIds).toEqual(["leader", "finance"]);
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
        state.members.push({ id: "helper", name: "Helper", roleIds: [], access: "member" });
        task.collaboratorIds = ["helper"];
        for (const id of ["help", "reply"])
            state = cmd(state, { type: "task.move", workItemId: item.id, taskId: task.id, status: "stuck", blocker: { id, kind: id === "help" ? "needs_help" : "external_response", reason: "Specific issue", targetId: null, at, resumeStatus: "to_do" } });
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
        const first = item.tasks.find((t) => !t.dependsOn.length);
        state = cmd(state, { type: "task.complete", workItemId: item.id, taskId: first.id });
        const dependent = state.workItems[0].tasks.find((t) => t.dependsOn.includes(first.id));
        if (dependent) {
            dependent.status = "done";
            dependent.completedAt = at;
        }
        state = cmd(state, { type: "task.reopen", workItemId: item.id, taskId: first.id });
        expect(state.workItems[0].tasks.find((t) => t.id === first.id)?.completedAt).toBe(null);
        if (dependent)
            expect(state.workItems[0].tasks.find((t) => t.id === dependent.id)).toMatchObject({ status: "done", needsReview: true });
    });
    it("rejects cycles and hides no backward group dependency while stage renames stay synchronized", () => {
        const state = created(), item = state.workItems[0];
        const one = item.tasks[0], other = item.tasks.find((t) => t.id !== one.id);
        expect(() => cmd(state, { type: "task.update", workItemId: item.id, taskId: one.id, patch: { dependsOn: [one.id] } })).toThrow("cycle");
        const renamed = cmd(state, { type: "task.update", workItemId: item.id, taskId: one.id, patch: { stageTitle: "New stage label" } });
        expect(renamed.workItems[0].tasks.filter((t) => t.stageKey === one.stageKey).every((t) => t.stageTitle === "New stage label")).toBe(true);
        item.tasks = [{ ...one, id: "a", stageKey: "A", stageTitle: "A", dependsOn: [] }, { ...other, id: "b", stageKey: "B", stageTitle: "B", dependsOn: ["a"] }, { ...other, id: "c", stageKey: "C", stageTitle: "C", dependsOn: ["b"] }];
        expect(() => cmd(state, { type: "task.update", workItemId: item.id, taskId: "c", patch: { stageKey: "A", stageTitle: "A" } })).toThrow("backward dependency");
    });
    it("does not trust client-created task completion, approval or official-rule fields", () => {
        const state = created(), item = state.workItems[0], malicious = { ...item.tasks[0], id: "added", status: "done", completedAt: at, kind: "approval", gateId: "forged_gate", officialRules: [{ ruleId: "R99", days: 1, unit: "calendar" }] };
        const next = cmd(state, { type: "task.add", workItemId: item.id, task: malicious });
        expect(next.workItems[0].tasks.find((t) => t.id === "added")).toMatchObject({ status: "to_do", kind: "task", gateId: null, completedAt: null, officialRules: [] });
    });
});
function advanceFunding(state) {
    let next = state;
    const item = next.workItems[0];
    for (const key of ["confirm_items", "confirm_quotes", "submit_budget_request"]) {
        const task = next.workItems[0].tasks.find((t) => t.sourceNodeId === key);
        if (!task.ownerId)
            next = cmd(next, { type: "task.update", workItemId: item.id, taskId: task.id, patch: { ownerId: "leader" } });
        next = cmd(next, { type: "task.complete", workItemId: item.id, taskId: task.id });
    }
    return next;
}
describe("separate submission and approval with versioned source budgets", () => {
    it("keeps uncertain finance ownership unassigned and assigns an explicit milestone role when available", () => {
        const state = created(true);
        expect(state.workItems[0].tasks.filter((t) => t.fundingRequestId).every((t) => t.ownerId === null)).toBe(true);
        const d = approved();
        d.memberFlow.nodes[0].milestoneKey = "items";
        d.memberFlow.nodes[0].roleIds = ["finance"];
        d.compiled = compileOrganization(d);
        const next = applyWorkspaceCommand(initial(), org(), { type: "work.create", input: { id: "role_bound", kind: "member_event", name: "Role-bound funding", description: "", date: null, venue: "offcampus", ownerId: "leader", fundingSource: "usg", fundingCategory: "food_service", requestedAmount: 10 } }, d, at);
        const items = next.workItems[0].tasks.find((t) => t.fundingStep === "items");
        expect(items.roleIds).toEqual(["finance"]);
        expect(items.ownerId).toBe("leader");
        expect(next.workItems[0].tasks.find((t) => t.fundingStep === "budget_submit")?.officialRules).toEqual([{ ruleId: "R09", days: 10, unit: "business" }]);
    });
    it("does not shift absolute use-by deadlines when an activity is rescheduled", () => {
        let state = created(true), item = state.workItems[0], requestId = item.funding[0].id;
        state = cmd(state, { type: "funding.setDeadline", workItemId: item.id, requestId, spendBy: "2026-11-01" });
        state = cmd(state, { type: "work.update", workItemId: item.id, patch: { date: "2026-12-01" } });
        expect(state.workItems[0].funding[0].spendBy).toBe("2026-11-01");
        state = cmd(state, { type: "funding.revise", workItemId: item.id, requestId, amount: 100, source: "usg", purpose: "Speaker", category: "speaker" });
        expect(state.workItems[0].tasks.find((t) => t.fundingStep === "budget_submit")?.officialRules).toEqual([{ ruleId: "R10", days: 14, unit: "business" }]);
        state = cmd(state, { type: "funding.revise", workItemId: item.id, requestId, amount: 100, source: "college", purpose: "Unknown college program", category: "food_service" });
        expect(state.workItems[0].tasks.find((t) => t.fundingStep === "budget_submit")?.officialRules).toEqual([]);
    });
    it("cannot replace an ordering task with a general gate to bypass financial records", () => {
        const state = created(true), item = state.workItems[0], order = item.tasks.find((t) => t.fundingStep === "order");
        expect(() => cmd(state, { type: "gate.add", workItemId: item.id, taskId: order.id, gateId: "bypass", approverIds: ["leader"], external: false, reason: "Not a purchase record" })).toThrow("separate from their approval gates");
    });
    it("adopts a newly approved template without replacing completed or manually edited tasks", () => {
        const state = created(), item = state.workItems[0], first = item.tasks[0], second = item.tasks[1];
        first.status = "done";
        first.completedAt = at;
        second.title = "My manual title";
        second.dueOverride = "2026-11-03";
        second.manualFields = ["title", "dueOverride"];
        const d = approved();
        d.memberFlow.nodes[0].title = "New template title";
        d.memberFlow.nodes[1].title = "A template suggestion";
        const added = { ...d.memberFlow.nodes[0], id: "additional", title: "New template task", dependsOn: [d.memberFlow.nodes[0].id] };
        d.memberFlow.nodes.push(added);
        d.compiled = compileOrganization(d);
        d.contextVersion = 2;
        const next = applyWorkspaceCommand(state, { ...org(), contextVersion: 2 }, { type: "work.applyTemplate", workItemId: item.id, templateVersion: 2 }, d, at);
        expect(next.workItems[0].tasks.find((t) => t.id === first.id)).toEqual(first);
        expect(next.workItems[0].tasks.find((t) => t.id === second.id)).toMatchObject({ title: "My manual title", dueOverride: "2026-11-03" });
        expect(next.workItems[0].tasks.some((t) => t.sourceNodeId === "additional")).toBe(true);
    });
    it("does not erase cents, old approvals or spent history when revising a partly spent request", () => {
        const state = created(true), funding = state.workItems[0].funding[0];
        funding.amount = 0.3;
        funding.spentAmount = 0.1;
        funding.committedAmount = 0.2;
        const next = cmd(state, { type: "funding.revise", workItemId: state.workItems[0].id, requestId: funding.id, amount: 0.3, source: "usg", purpose: "Same precise cents" });
        expect(next.workItems[0].funding[0]).toMatchObject({ spentAmount: 0.1, committedAmount: 0.2, amount: 0.3 });
    });
    it("keeps purchases locked after submission until an evidenced budget and purchase approval", () => {
        let state = advanceFunding(created(true));
        const item = state.workItems[0], funding = item.funding[0];
        expect(funding.status).toBe("submitted");
        const budget = item.gates.find((g) => g.kind === "budget");
        expect(() => cmd(state, { type: "task.complete", workItemId: item.id, taskId: budget.taskId })).toThrow("explicit approval");
        expect(() => cmd(state, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "early", amount: 1, purpose: "Early" })).toThrow("both current");
        state = cmd(state, { type: "gate.decide", workItemId: item.id, gateId: budget.id, decision: "approved", evidence: "Fictional school approval record" });
        const purchaseSubmit = state.workItems[0].tasks.find((t) => t.sourceNodeId === "submit_purchase_request");
        state = cmd(state, { type: "task.update", workItemId: item.id, taskId: purchaseSubmit.id, patch: { ownerId: "leader" } });
        state = cmd(state, { type: "task.complete", workItemId: item.id, taskId: purchaseSubmit.id });
        const purchase = item.gates.find((g) => g.kind === "purchase");
        state = cmd(state, { type: "gate.decide", workItemId: item.id, gateId: purchase.id, decision: "approved", evidence: "Fictional purchase approval record" });
        state = cmd(state, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "one", amount: 60, purpose: "Materials" });
        expect(() => cmd(state, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "two", amount: 50, purpose: "More" })).toThrow("cumulative");
        state = cmd(state, { type: "funding.spend", workItemId: item.id, requestId: funding.id, commitmentId: "one", evidence: "Fictional receipt" });
        expect(state.workItems[0].funding[0]).toMatchObject({ committedAmount: 0, spentAmount: 60 });
        expect(() => cmd(state, { type: "funding.release", workItemId: item.id, requestId: funding.id, commitmentId: "one", evidence: "Cannot erase spending" })).toThrow("pending reservation");
        const revised = cmd(state, { type: "funding.revise", workItemId: item.id, requestId: funding.id, amount: 120, source: "usg", purpose: "Revised scope" });
        expect(revised.workItems[0].funding[0]).toMatchObject({ version: 2, status: "draft", approvedVersion: null, spentAmount: 60 });
        expect(revised.workItems[0].gates.some((g) => g.requestVersion === 1 && g.status === "approved")).toBe(true);
        expect(() => cmd(revised, { type: "funding.commit", workItemId: item.id, requestId: funding.id, commitmentId: "new", amount: 1, purpose: "Needs new approval" })).toThrow("both current");
    });
    it("keeps spent and historical commitments bound to their original funding source", () => {
        for (const ledger of [
            { spentAmount: 20, committedAmount: 0, commitments: [] },
            { spentAmount: 0, committedAmount: 20, commitments: [] },
            { spentAmount: 0, committedAmount: 0, commitments: [{ id: "released", amount: 20, purpose: "Original USG reservation", at, status: "released", requestVersion: 1, evidence: "Released before purchase" }] },
        ]) {
            const state = created(true), item = state.workItems[0], funding = item.funding[0];
            Object.assign(funding, ledger);
            const before = structuredClone(state);
            expect(() => cmd(state, { type: "funding.revise", workItemId: item.id, requestId: funding.id, source: "college", amount: 120, purpose: "Different source" })).toThrow("separate funding request");
            expect(state).toEqual(before);
            const revised = cmd(state, { type: "funding.revise", workItemId: item.id, requestId: funding.id, source: "usg", amount: 120, purpose: "Same-source revised scope" });
            expect(revised.workItems[0].funding[0]).toMatchObject({ source: "usg", version: 2, ...ledger });
        }
    });
    it("rejects invalid dates, cents precision and unknown command fields", () => {
        expect(() => validateWorkspaceCommand({ type: "work.update", workItemId: "x", patch: { date: "2026-02-30" } })).toThrow();
        expect(() => validateWorkspaceCommand({ type: "funding.commit", workItemId: "x", requestId: "r", commitmentId: "c", amount: 0.005, purpose: "Invalid" })).toThrow();
        expect(() => validateWorkspaceCommand({ type: "actor.select", memberId: "x", actorId: "manager" })).toThrow();
    });
    it("adopts new timing without changing completed tasks or manual targets", () => {
        const state = created(true), item = state.workItems[0];
        const items = item.tasks.find((t) => t.milestoneKey === "items"), quotes = item.tasks.find((t) => t.milestoneKey === "quotes");
        items.status = "done";
        items.completedAt = at;
        quotes.manualFields = ["relativeTarget"];
        quotes.relativeTarget = { offsetDays: 17, unit: "calendar", source: "manual" };
        const next = cmd(state, { type: "work.applyTiming", workItemId: item.id, timingDefaults: { itemsWeeks: 10, quotesWeeks: 9, budgetWeeks: 8 } });
        expect(next.workItems[0].tasks.find((t) => t.id === items.id)?.relativeTarget?.offsetDays).toBe(56);
        expect(next.workItems[0].tasks.find((t) => t.id === quotes.id)?.relativeTarget?.offsetDays).toBe(17);
        expect(next.workItems[0].tasks.find((t) => t.milestoneKey === "budget_request")?.relativeTarget?.offsetDays).toBe(56);
    });
});
async function browser() {
    const started = await startSession(post({}));
    const cookie = started.cookie.split(";")[0];
    const d = approved();
    await saveSession(post({}, cookie), d, 0, true);
    return cookie;
}
describe("private server workspace CAS, idempotency and recoverable audit outbox", () => {
    it("validates bindings against saved setup roles without approving the unfinished setup", async () => {
        const started = await startSession(post({})), cookie = started.cookie.split(";")[0];
        const d = approved();
        d.confirmed = false;
        d.compiled = null;
        await saveSession(post({}, cookie), d, 0, false);
        const mutation = { requestId: "draft_binding", revision: 0, command: { type: "member.upsert", member: { id: "officer", name: "Fictional officer", roleIds: ["finance"], access: "member" } } };
        const next = await mutateWorkspace(post({}, cookie), mutation);
        expect(next.state.members[0].roleIds).toEqual(["finance"]);
        expect(next.organization.roles).toEqual([]);
        expect(await readWorkspaceReceipt(post({}, cookie), mutation.requestId, mutation.command)).toEqual({ revision: 1 });
        await expect(readWorkspaceReceipt(post({}, cookie), mutation.requestId, { ...mutation.command, member: { ...mutation.command.member, name: "Different" } })).rejects.toThrow("different command");
        expect(await readWorkspaceReceipt(post({}, await browser()), mutation.requestId)).toBe(null);
    });
    it("bootstraps a demo manager and reads the same server state after refresh", async () => {
        const cookie = await browser();
        const first = await loadWorkspace(post({}, cookie));
        expect(first.state.members).toEqual([]);
        const input = { requestId: "bootstrap", revision: 0, command: { type: "member.upsert", member: { id: "leader", name: "Fictional member", roleIds: [], access: "member" } } };
        const saved = await mutateWorkspace(post({}, cookie), input);
        expect(saved.state.members[0].access).toBe("manager");
        expect(saved.state.actorId).toBe("leader");
        expect((await loadWorkspace(post({}, cookie))).state).toEqual(saved.state);
        expect((await mutateWorkspace(post({}, cookie), input)).state.revision).toBe(1);
        await expect(mutateWorkspace(post({}, cookie), { ...input, command: { ...input.command, member: { ...input.command.member, name: "Different payload" } } })).rejects.toThrow("different command");
    });
    it("keeps stale or racing changes unapplied, isolated by the private workspace cookie", async () => {
        const cookie = await browser();
        await loadWorkspace(post({}, cookie));
        fake.race = true;
        await expect(mutateWorkspace(post({}, cookie), { requestId: "race", revision: 0, command: { type: "member.upsert", member: { id: "leader", name: "Leader", roleIds: [], access: "manager" } } })).rejects.toThrow("committed first");
        expect((await loadWorkspace(post({}, cookie))).state.members).toEqual([]);
        const another = await browser();
        expect((await loadWorkspace(post({}, another))).state.workspaceId).not.toBe((await loadWorkspace(post({}, cookie))).state.workspaceId);
        const noCookie = await endpoint(new Request("https://example.org/api/workspace"));
        expect(noCookie.status).toBe(401);
    });
    it("commits an audit outbox with state and retries delivery without replaying the mutation", async () => {
        const cookie = await browser();
        fake.archiveFails = true;
        const mutation = { requestId: "once", revision: 0, command: { type: "member.upsert", member: { id: "leader", name: "Leader", roleIds: [], access: "manager" } } };
        const saved = await mutateWorkspace(post({}, cookie), mutation);
        expect(saved.state.revision).toBe(1);
        const runtime = [...fake.rows.values()].find((v) => !!v.data.outbox);
        expect(runtime.data.outbox[0].delivered).toBe(false);
        fake.archiveFails = false;
        await loadWorkspace(post({}, cookie));
        expect((await mutateWorkspace(post({}, cookie), mutation)).state.revision).toBe(1);
        const events = [...fake.rows.keys()].filter((key) => key.includes("archives/") && JSON.stringify(fake.rows.get(key).data).includes("workspace.command.committed"));
        expect(events).toHaveLength(1);
    });
    it("a proposal preview neither mutates runtime state nor grants authority from a body actor", async () => {
        const cookie = await browser();
        const value = { type: "member.upsert", member: { id: "leader", name: "Leader", roleIds: [], access: "member" } };
        const preview = await previewWorkspaceCommand(post({}, cookie), value);
        expect(preview.state.members).toHaveLength(1);
        expect((await loadWorkspace(post({}, cookie))).state.members).toEqual([]);
    });
});
