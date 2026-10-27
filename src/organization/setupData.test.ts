import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyChanges, compileOrganization, reconcile, scopeKey, upgrade,
  migrateReviewedCheck, roleContext, stable, hasReviewedCheck,
} from "./setupLogic";
import { fixtureDraft, fixtureFlow } from "./testing/fixtures";
import { MODEL_POLICY_VERSION } from "./modelPolicy";
const state = vi.hoisted(() => ({
  rows: new Map<string, { data: unknown; etag: string }>(),
  counter: 0,
  historyConflicts: 0,
  chat: vi.fn(),
}));
vi.mock("@netlify/blobs", () => ({
  getStore: () => ({
    getWithMetadata: async (key: string) => structuredClone(state.rows.get(key) ?? null),
    setJSON: async (key: string, data: unknown, options: { onlyIfNew?: boolean; onlyIfMatch?: string } = {}) => {
      if (key.startsWith("history/") && state.historyConflicts > 0) {
        state.historyConflicts--;
        return { modified: false };
      }
      const old = state.rows.get(key);
      if ((options.onlyIfNew && old) || (options.onlyIfMatch && options.onlyIfMatch !== old?.etag))
        return { modified: false };
      const etag = "etag-" + ++state.counter;
      state.rows.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
  }),
}));
vi.mock("../../netlify/lib/ai.mts", async (original) => ({
  ...(await original<object>()), chatJSON: state.chat,
}));
import { historicalContext, validateSelection, v3Request } from "../../netlify/lib/organization/v3.mts";
import { runSetupAi, setupCacheProfile } from "../../netlify/functions/org-ai.mts";
import archive from "../../netlify/functions/org-archive.mts";
import { saveSession, startSession } from "../../netlify/lib/organization/storage.mts";

function draft() {
  const d = upgrade(fixtureDraft());
  d.step = 1;
  d.memberFlow = fixtureFlow(d);
  return d;
}
function request(body: unknown, cookie = "") {
  return new Request("https://example.org/api/org/ai", {
    method: "POST",
    headers: { origin: "https://example.org", cookie, "x-platypus-request": "organization-setup", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function session() {
  const first = await startSession(request({}));
  const cookie = first.cookie!.split(";")[0];
  const entry = await saveSession(request({}, cookie), draft(), 0);
  return { cookie, entry };
}
beforeEach(() => {
  state.rows.clear(); state.counter = 0; state.historyConflicts = 0; state.chat.mockReset();
  vi.stubEnv("AI_PRESET", "openai");
  vi.stubEnv("AI_MODEL", "test-model-a");
  vi.stubEnv("AI_MODEL_ROUTING", "on");
});
afterEach(() => vi.unstubAllEnvs());

describe("semantic configuration dependencies", () => {
  const legacyScope = (d: ReturnType<typeof draft>) => stable({
    organization: { name: d.name, mission: d.mission },
    roles: roleContext(d),
    departments: d.departments.map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    source: d.source?.checksum ?? "none",
  });
  for (const status of ["complete", "skipped"] as const)
    it(`preserves an exactly matching legacy ${status} check without another model request`, () => {
      const d = draft();
      const oldKey = legacyScope(d);
      d.riskCheck = { status, inputKey: oldKey, risks: [], answers: {}, at: "2026-10-26T12:00:00Z" };
      d.generated.risk_check = oldKey;
      const before = structuredClone(d);
      const next = upgrade(d);
      expect(hasReviewedCheck(next)).toBe(true);
      expect(next.riskCheck).toEqual({ ...d.riskCheck, inputKey: scopeKey(next, "risk_check") });
      expect(next.generated.risk_check).toBe(scopeKey(next, "risk_check"));
      expect(d).toEqual(before);
      expect(state.chat).not.toHaveBeenCalled();
    });
  it("does not bless stale legacy reviews after any old-scope evidence changes", () => {
    for (const change of [
      (d: ReturnType<typeof draft>) => { d.mission = "New organization purpose"; },
      (d: ReturnType<typeof draft>) => { d.roles[0].responsibilities = ["A changed duty"]; },
      (d: ReturnType<typeof draft>) => { d.departments[0].name = "Changed since review"; },
      (d: ReturnType<typeof draft>) => { d.source!.checksum = "new-source"; },
    ]) {
      const d = draft();
      d.riskCheck = { status: "complete", inputKey: legacyScope(d), risks: [], answers: {}, at: null };
      d.generated.risk_check = d.riskCheck.inputKey;
      change(d);
      const next = upgrade(d);
      expect(hasReviewedCheck(next)).toBe(false);
      expect(next.riskCheck.inputKey).toBe(d.riskCheck.inputKey);
      expect(next.generated.risk_check).toBe(d.generated.risk_check);
    }
  });
  it("does not migrate unreviewed, arbitrary, or already-current keys", () => {
    const d = draft();
    d.riskCheck.inputKey = legacyScope(d);
    expect(migrateReviewedCheck(d)).toBe(d);
    d.riskCheck.status = "complete";
    d.riskCheck.inputKey = "arbitrary-unverified-key";
    expect(migrateReviewedCheck(d)).toBe(d);
    d.riskCheck.inputKey = scopeKey(d, "risk_check");
    expect(migrateReviewedCheck(d)).toBe(d);
  });
  it("supports local recovery with temporary invalid text while keeping the migration strict and immutable", () => {
    const d = draft();
    d.roles[0].title = "";
    d.riskCheck = { status: "skipped", inputKey: legacyScope(d), risks: [], answers: {}, at: null };
    d.generated.risk_check = "unrelated-proposal-key";
    const before = structuredClone(d);
    const next = migrateReviewedCheck(d);
    expect(next.roles[0].title).toBe("");
    expect(hasReviewedCheck(next)).toBe(true);
    expect(next.generated.risk_check).toBe("unrelated-proposal-key");
    expect(d).toEqual(before);
  });
  it("reuses checks for labels, colors, layout, duty ordering and harmless whitespace", () => {
    const original = draft(), next = structuredClone(original);
    next.name = "A new public label";
    next.departments[0].name = "A new department label";
    next.departments[0].color = "#123456";
    next.roles[0].title = "A new role label";
    next.roles[0].position = { x: 100, y: 250 };
    next.roles[0].responsibilities.reverse();
    next.roles[0].responsibilities = next.roles[0].responsibilities.map((s) => `  ${s.toUpperCase()}  `);
    next.mission = `  ${next.mission}  `;
    next.source!.checksum = "new-formatting-only-checksum";
    expect(scopeKey(next, "risk_check")).toBe(scopeKey(original, "risk_check"));
    expect(scopeKey(next, "constitution")).not.toBe(scopeKey(original, "constitution"));
    expect(reconcile(original, next).memberFlow).toEqual(original.memberFlow);
  });
  it("invalidates meaning changes while preserving all manual node data and unrelated nodes", () => {
    const original = draft(), next = structuredClone(original);
    next.roles.find((r) => r.id === "finance")!.responsibilities = ["Approve club spending"];
    const expected = original.memberFlow!.nodes.filter((n) => n.roleIds.includes("finance") || n.accountableRoleId === "finance").map((n) => n.id);
    expect(expected.length).toBeGreaterThan(0);
    const after = reconcile(original, next);
    expect(scopeKey(after, "risk_check")).not.toBe(scopeKey(original, "risk_check"));
    expect(after.memberFlow!.nodes.filter((n) => n.needsReview).map((n) => n.id)).toEqual(expected);
    expect(after.memberFlow!.nodes.map(({ needsReview: _, ...n }) => n)).toEqual(original.memberFlow!.nodes);
  });
  it("reviews the whole existing workflow after an actual organization purpose change", () => {
    const original = draft(), next = structuredClone(original);
    next.mission = "Operate a student investment fund instead of member programs.";
    const after = reconcile(original, next);
    expect(scopeKey(after, "risk_check")).not.toBe(scopeKey(original, "risk_check"));
    expect(after.memberFlow!.nodes.filter((n) => n.needsReview)).toHaveLength(original.memberFlow!.nodes.length);
  });
  it("reviews only lost ownership and necessary immediate handoffs, not every successor or OR alternative", () => {
    const original = draft(), base = original.memberFlow!.nodes[0];
    original.memberFlow!.nodes = [
      { ...base, id: "start", title: "Start", roleIds: ["marketing"], dependsOn: [] },
      { ...base, id: "alternative", title: "Alternative", roleIds: ["finance"], dependsOn: [] },
      { ...base, id: "all", title: "Required handoff", roleIds: ["finance"], dependsOn: ["start"], dependencyMode: "all" },
      { ...base, id: "either", title: "Alternative handoff", roleIds: ["finance"], dependsOn: ["start", "alternative"], dependencyMode: "any" },
      { ...base, id: "later", title: "Later", roleIds: ["finance"], dependsOn: ["all"], dependencyMode: "all" },
    ];
    const after = applyChanges(original, [{ entity: "role", id: "marketing", operation: "remove", field: "title", value: null }]);
    expect(after.memberFlow!.nodes.filter((n) => n.needsReview).map((n) => n.id)).toEqual(["start", "all"]);
    expect(after.memberFlow!.nodes[0].roleIds).toEqual([]);
    expect(after.memberFlow!.nodes[3]).toEqual(original.memberFlow!.nodes[3]);
    expect(after.roles.find((r) => r.id === "finance")).toEqual(original.roles.find((r) => r.id === "finance"));
  });
  it("blocks compilation until affected nodes are explicitly reviewed, and records deliberate unassigned work", () => {
    const d = draft();
    d.riskCheck = { status: "skipped", inputKey: scopeKey(d, "risk_check"), risks: [], answers: {}, at: null };
    d.memberFlow!.nodes[0].needsReview = true;
    d.memberFlow!.nodes[0].roleIds = [];
    expect(() => compileOrganization(d)).toThrow("affected activity steps");
    d.memberFlow!.nodes[0].needsReview = false;
    const compiled = compileOrganization(d);
    expect(compiled.unresolved).toContain(`No responsible role assigned to activity step ${d.memberFlow!.nodes[0].id}: ${d.memberFlow!.nodes[0].title}`);
  });
  it("rejects a missing accountable role independently of the responsible-role list", () => {
    const d = draft();
    d.memberFlow!.nodes[0].accountableRoleId = "unknown-role";
    expect(() => compileOrganization(d)).toThrow("existing accountable role");
  });
});

describe("server-validated selection and historical evidence", () => {
  it("includes selection as structured data and rejects mismatched screen, type, pair and unknown entity", () => {
    const d = draft();
    const valid = { screen: "team", entityType: "role", entityId: "finance" } as const;
    expect(v3Request(d, "edit", "Rename this role", valid).input.selection).toEqual(valid);
    for (const invalid of [
      { ...valid, entityId: null }, { ...valid, entityType: null },
      { ...valid, entityId: "another-workspaces-role" }, { ...valid, screen: "workflow" },
      { ...valid, entityType: "node", entityId: d.memberFlow!.nodes[0].id },
    ]) expect(() => validateSelection(d, invalid)).toThrow();
    expect(validateSelection(d, { screen: "team", entityType: null, entityId: null })).toEqual({ screen: "team", entityType: null, entityId: null });
    d.step = 3;
    expect(validateSelection(d, { screen: "workflow", entityType: "node", entityId: d.memberFlow!.nodes[0].id })?.entityType).toBe("node");
  });
  it("rejects a stale selection before making any provider request", async () => {
    const { cookie, entry } = await session();
    const response = await runSetupAi(request({ stage: "edit", revision: entry.revision, instruction: "Change this", selection: { screen: "workflow", entityType: null, entityId: null } }, cookie));
    expect(response.status).toBe(400);
    expect(state.chat).not.toHaveBeenCalled();
  });
  it("distinguishes structural schema failures from known-ID and hierarchy validation failures", async () => {
    for (const [data, classification] of [
      [{ message: "Invalid schema", question: null, changes: "not-an-array" }, "schema"],
      [{ message: "Unknown reference", question: null, changes: [{ entity: "role", id: "finance", operation: "set", field: "parentRoleId", value: "missing-role" }] }, "semantic_validation"],
    ] as const) {
      const { cookie, entry } = await session();
      state.chat.mockResolvedValue({ data, model: "mock", provider: "mock", ms: 0 });
      const response = await runSetupAi(request({ stage: "edit", revision: entry.revision, instruction: "Make this change" }, cookie));
      expect(response.status).toBe(502);
      const rejected = [...state.rows.values()].map((r) => r.data as { kind?: string; workspaceId?: string; payload?: { classification: string } }).find((r) => r.kind === "ai.rejected" && r.workspaceId === entry.workspaceId);
      expect(rejected?.payload?.classification).toBe(classification);
    }
  });
  it("lists only this workspace's latest 20 revisions and selects exact historical evidence", async () => {
    const { cookie, entry } = await session();
    const versions = Array.from({ length: 24 }, (_, revision) => ({ revision, at: "2026-10-26T12:00:00Z", organization: { name: `Revision ${revision}`, mission: "Test" }, departments: [], roles: [], workflow: null }));
    state.rows.set(`history/${entry.workspaceId}`, { data: versions, etag: "history" });
    const response = await archive(new Request("https://example.org/api/org/archive?action=history&workspaceId=other", { headers: { cookie } }));
    const body = await response.json();
    expect(body.versions.map((v: { revision: number }) => v.revision)).toEqual(Array.from({ length: 20 }, (_, n) => n + 4));
    expect(await historicalContext(entry.workspaceId, 10)).toEqual([versions[10]]);
    expect(await historicalContext(entry.workspaceId)).toHaveLength(6);
    await expect(historicalContext(entry.workspaceId, 0)).rejects.toThrow("not available");
    const other = await session();
    expect(await (await archive(new Request("https://example.org/api/org/archive?action=history", { headers: { cookie: other.cookie } }))).json()).toEqual({ versions: [expect.objectContaining({ revision: 0 })] });
  });
  it("uses the specifically chosen revision for an edit proposal without restoring anything automatically", async () => {
    const { cookie, entry } = await session();
    state.rows.set(`history/${entry.workspaceId}`, { data: [{ revision: 7, at: "now", organization: { name: "Earlier label", mission: "Test" }, departments: [], roles: [], workflow: null }], etag: "history" });
    state.chat.mockResolvedValue({ data: { message: "I propose restoring a title", question: null, changes: [{ entity: "role", id: "finance", operation: "set", field: "title", value: "Previous title" }] }, model: "mock", provider: "mock", ms: 0 });
    const response = await runSetupAi(request({ stage: "edit", revision: entry.revision, instruction: "Use history revision 7: Restore the role title" }, cookie));
    expect(response.status).toBe(200);
    const sent = JSON.parse(state.chat.mock.calls[0][0].user);
    expect(sent.history).toHaveLength(1);
    expect(sent.history[0].revision).toBe(7);
    const stored = [...state.rows.values()].map((r) => r.data as { workspaceId?: string; draft?: typeof entry.draft }).find((r) => r.workspaceId === entry.workspaceId && r.draft);
    expect(stored!.draft!.roles.find((r) => r.id === "finance")!.title).toBe("Treasurer");
  });
  it("rejects unavailable chosen history without substituting another version or charging the provider", async () => {
    const { cookie, entry } = await session();
    const response = await runSetupAi(request({ stage: "edit", revision: entry.revision, instruction: "Use history revision 9999: Restore it" }, cookie));
    expect(response.status).toBe(404);
    expect(state.chat).not.toHaveBeenCalled();
  });
  it("retries a concurrent history index change and keeps both previous revisions", async () => {
    const { cookie, entry } = await session();
    const d = structuredClone(entry.draft);
    d.roles[0].title = "Updated public title";
    state.historyConflicts = 1;
    await saveSession(request({}, cookie), d, entry.revision);
    const versions = (await historicalContext(entry.workspaceId));
    expect(versions.map((v) => v.revision)).toEqual([0, 1]);
  });
  it("cannot confirm pending review by submitting a client-compiled artifact", async () => {
    const { cookie, entry } = await session();
    const d = upgrade(entry.draft);
    d.riskCheck = { status: "complete", inputKey: scopeKey(d, "risk_check"), risks: [], answers: {}, at: null };
    d.memberFlow!.nodes[0].needsReview = true;
    d.compiled = { format: "pretend-approved" };
    await expect(saveSession(request({}, cookie), d, entry.revision, true)).rejects.toThrow("affected activity steps");
    expect(state.chat).not.toHaveBeenCalled();
  });
});

describe("effective model and schema cache identity", () => {
  it("fingerprints routing, actual requested model, schema and format, while excluding credentials", () => {
    vi.stubEnv("AI_PRESET", "asu_air");
    vi.stubEnv("AI_API_KEY", "private-test-only-key");
    const normal = setupCacheProfile("constitution", false, { type: "object" });
    expect(normal.model).toBe("gemma4-31b-it");
    expect(normal.routeVersion).toBe(MODEL_POLICY_VERSION);
    expect(setupCacheProfile("edit", false, {}).model).toBe("muse-glimmer-30b");
    expect(setupCacheProfile("edit", true, {}).model).toBe("glm-5-3");
    expect(JSON.stringify(normal)).not.toContain("private-test-only-key");
    expect(setupCacheProfile("constitution", false, { type: "object", required: ["roles"] })).not.toEqual(normal);
    vi.stubEnv("AI_MODEL_ROUTING", "off");
    expect(setupCacheProfile("constitution", false, {}).model).toBe("test-model-a");
    vi.stubEnv("AI_JSON_MODE", "none");
    expect(setupCacheProfile("constitution", false, {}).jsonMode).toBe("none");
  });
  it("reuses identical inputs but issues a new provider request after effective model changes", async () => {
    const { cookie, entry } = await session();
    state.chat.mockResolvedValue({ data: { message: "No changes", question: null, changes: [] }, model: "mock", provider: "mock", ms: 0 });
    const first = await (await runSetupAi(request({ stage: "edit", revision: entry.revision, instruction: "Check this title" }, cookie))).json();
    expect(first.result.cached).toBe(false);
    const second = await (await runSetupAi(request({ stage: "edit", revision: first.revision, instruction: "Check this title" }, cookie))).json();
    expect(second.result.cached).toBe(true);
    expect(state.chat).toHaveBeenCalledTimes(1);
    vi.stubEnv("AI_MODEL", "test-model-b");
    const third = await (await runSetupAi(request({ stage: "edit", revision: second.revision, instruction: "Check this title" }, cookie))).json();
    expect(third.result.cached).toBe(false);
    expect(state.chat).toHaveBeenCalledTimes(2);
  });
});
