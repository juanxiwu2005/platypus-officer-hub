import { afterEach, describe, expect, it, vi } from "vitest";
import { approvedContext, readApprovedContext } from "./approvedContext";
import { compileOrganization, scopeKey, upgrade } from "../organization/setupLogic";
import { fixtureDraft, fixtureFlow } from "../organization/testing/fixtures";

function envelope() {
  const draft = upgrade(fixtureDraft());
  draft.memberFlow = fixtureFlow(draft);
  draft.riskCheck = { status: "skipped", inputKey: scopeKey(draft, "risk_check"), risks: [], answers: {}, at: "2026-10-26T12:00:00Z" };
  const compiled = compileOrganization(draft);
  return { workspaceId: "one-private-workspace", draft: { ...draft, name: "Unapproved edit" }, approved: { ...draft, compiled, confirmed: true, confirmedAt: "2026-10-26T12:00:00Z", contextVersion: compiled.contextVersion } };
}
afterEach(() => vi.unstubAllGlobals());
describe("approved workspace context", () => {
  it("reads the server artifact and ignores unapproved draft edits", () => {
    const value = envelope();
    const context = approvedContext(value)!;
    expect(context.alwaysRead.organization.name).toBe(value.approved.name);
    expect(context.alwaysRead.organization.name).not.toBe(value.draft.name);
    expect(context.alwaysRead.roles.map(r => r.title).sort()).toEqual(value.approved.roles.map(r => r.title).sort());
    expect(context.onDemand.memberWorkflow.nodes.map(n => n.roleIds)).toEqual(value.approved.memberFlow!.nodes.map(n => n.roleIds));
    expect(context.unresolved).toContain("Responsibility check was skipped by the user.");
  });
  it("never substitutes a draft or an example when there is no approved context", () => {
    expect(approvedContext({ ...envelope(), approved: null })).toBeNull();
  });
  it("rejects inconsistent versions, missing artifacts and invalid workflow references", () => {
    const version = envelope();
    version.approved.contextVersion += 1;
    expect(() => approvedContext(version)).toThrow(/inconsistent/);
    const missing = envelope();
    expect(() => approvedContext({ ...missing, approved: { ...missing.approved, compiled: null } })).toThrow();
    const references = envelope();
    references.approved.compiled.onDemand.memberWorkflow.nodes[0].roleIds = ["unknown"];
    expect(() => approvedContext(references)).toThrow(/invalid references/);
  });
  it("loads the current private server session without browser caching or legacy writes", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(envelope()), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const context = await readApprovedContext();
    expect(context?.workspaceId).toBe("one-private-workspace");
    expect(fetch).toHaveBeenCalledWith("/api/org/setup", expect.objectContaining({ credentials: "same-origin", cache: "no-store" }));
  });
  it("distinguishes expired/no session from unavailable or invalid server data", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 410 })).mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(new Response("not JSON", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    expect(await readApprovedContext()).toBeNull();
    await expect(readApprovedContext()).rejects.toThrow(/could not be loaded/);
    await expect(readApprovedContext()).rejects.toThrow(/could not be verified/);
  });
});
