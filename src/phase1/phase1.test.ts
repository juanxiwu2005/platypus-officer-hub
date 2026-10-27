import { describe, expect, it, beforeAll, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { FICTIONAL_CONSTITUTION, makeDraft, type Draft } from "./model";
import {
  assertTask,
  classify,
  confirmContext,
  conflicts,
  extract,
  handoffMemory,
  inspectMigration,
  makeSource,
  owner,
  resolveSuggestion,
  reviewSuggestion,
  setOwner,
  uncertainty,
  validateSuggestion,
  workflow,
} from "./logic";
import { localPreviewRepository } from "./repository";
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
const principal = {
  accountId: "demo-president",
  organizationId: "demo-A",
  mayManage: true,
};
async function sourceDraft(): Promise<Draft> {
  const d = makeDraft();
  const source = await makeSource(
    FICTIONAL_CONSTITUTION,
    "fiction.txt",
    d.organizationId,
  );
  return { ...d, source, suggestions: extract(source) };
}
describe("Phase 1 view-model contracts, not production API acceptance", () => {
  it("Organization A routes both relationship scopes to Marketing", () => {
    expect(owner(makeDraft(), "relationships", "companies")).toBe("Marketing");
    expect(owner(makeDraft(), "relationships", "campus")).toBe("Marketing");
  });
  it("Organization B distinguishes companies from campus organizations", () => {
    expect(owner(makeDraft("B"), "relationships", "companies")).toBe(
      "External Relations",
    );
    expect(owner(makeDraft("B"), "relationships", "campus")).toBe("Outreach");
  });
  it("one custom role owns multiple capabilities without a fixed RoleFunction", () => {
    const d = makeDraft();
    expect(
      d.assignments
        .filter((a) => a.roleId === "role-1" && a.responsibility === "owner")
        .map((a) => a.capabilityId),
    ).toEqual(["planning", "staffing"]);
    const x = setOwner(
      {
        ...d,
        roles: [...d.roles, { id: "custom", title: "Community Builder" }],
      },
      "marketing",
      "custom",
    );
    expect(owner(x, "marketing")).toBe("Community Builder");
  });
  it("responsibility conflicts never fall back to the first role", () => {
    const d = makeDraft();
    d.assignments.push({
      ...d.assignments.find(
        (a) =>
          a.capabilityId === "relationships" && a.responsibility === "owner",
      )!,
      roleId: "role-4",
    });
    expect(owner(d, "relationships", "companies")).toBeNull();
    expect(uncertainty(d)).toContain("Who should own");
  });
  it("extracts supported clauses with exact evidence offsets", async () => {
    const d = await sourceDraft();
    expect(d.suggestions).toHaveLength(7);
    for (const s of d.suggestions)
      expect(d.source!.text.slice(s.start, s.end)).toBe(s.quote);
  });
  it("rejects forged or out-of-range evidence and unknown capabilities", async () => {
    const d = await sourceDraft();
    const s = d.suggestions[0];
    expect(
      validateSuggestion({ ...s, quote: "Invented" }, d.source!),
    ).toBeNull();
    expect(validateSuggestion({ ...s, start: -1 }, d.source!)).toBeNull();
    expect(validateSuggestion({ ...s, confidence: NaN }, d.source!)).toBeNull();
    expect(
      validateSuggestion({ ...s, capabilityId: "secret" }, d.source!),
    ).toBeNull();
  });
  it("filters AI dates and sensitive extra fields through an allowlist", async () => {
    const d = await sourceDraft();
    const s = validateSuggestion(
      {
        ...d.suggestions[0],
        date: "2030-01-01",
        officialDeadline: "2030-02-01",
        apiKey: "fake",
      },
      d.source!,
    );
    expect(s).not.toHaveProperty("date");
    expect(s).not.toHaveProperty("officialDeadline");
    expect(s).not.toHaveProperty("apiKey");
  });
  it("source metadata includes a stable checksum, retention and organization scope", async () => {
    const a = await makeSource(FICTIONAL_CONSTITUTION, "a.txt", "demo-A");
    const b = await makeSource(FICTIONAL_CONSTITUTION, "b.txt", "demo-B");
    expect(a.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(a.checksum).toBe(b.checksum);
    expect(a.retentionPolicy).toBe("demo_7_days");
    expect(a.organizationId).toBe("demo-A");
  });
  it("rejects personal contact details and secret-shaped fields", async () => {
    await expect(
      makeSource("Email person@example.org", "a.txt", "demo-A"),
    ).rejects.toThrow("Remove personal");
    await expect(
      makeSource("api_key: fake", "a.txt", "demo-A"),
    ).rejects.toThrow("Remove personal");
  });
  it("accepting a constitution suggestion does not overwrite manual facts", async () => {
    let d = await sourceDraft();
    const s = d.suggestions.find((s) => s.scope === "companies")!;
    d = reviewSuggestion(d, s.id, "accepted");
    expect(owner(d, "relationships", "companies")).toBe("Marketing");
    expect(conflicts(d)).toHaveLength(1);
    expect(d.confirmed).toBe(false);
  });
  it("matching manual responsibility does not trigger an unnecessary conflict question", async () => {
    let d = await sourceDraft();
    d = reviewSuggestion(
      d,
      d.suggestions.find((s) => s.capabilityId === "money")!.id,
      "accepted",
    );
    expect(conflicts(d)).toHaveLength(0);
    expect(owner(d, "money")).toBe("Treasurer");
  });
  it("manual confirmation wins, and rejected suggestions do not add facts", async () => {
    let d = await sourceDraft();
    const s = d.suggestions.find((s) => s.scope === "companies")!;
    d = reviewSuggestion(d, s.id, "accepted");
    d = resolveSuggestion(d, conflicts(d)[0].assignment, false);
    expect(owner(d, "relationships", "companies")).toBe("Marketing");
    d = reviewSuggestion(d, d.suggestions[0].id, "rejected");
    expect(conflicts(d)).toHaveLength(0);
  });
  it("confirmed scope change preserves the other side of a broad assignment", async () => {
    let d = await sourceDraft();
    d = reviewSuggestion(
      d,
      d.suggestions.find((s) => s.scope === "companies")!.id,
      "accepted",
    );
    d = resolveSuggestion(d, conflicts(d)[0].assignment, true);
    expect(owner(d, "relationships", "companies")).toBe("External Relations");
    expect(owner(d, "relationships", "campus")).toBe("Marketing");
  });
  it("editing a suggested role keeps the original evidence", async () => {
    let d = await sourceDraft();
    const s = d.suggestions.find((s) => s.scope === "companies")!;
    d = reviewSuggestion(d, s.id, "accepted", "VP of Partnerships");
    expect(d.roles.some((r) => r.title === "VP of Partnerships")).toBe(true);
    expect(d.suggestions.find((x) => x.id === s.id)?.quote).toBe(s.quote);
  });
  it("final context requires suggestion review and explicit confirmation", async () => {
    const d = await sourceDraft();
    expect(confirmContext(d).confirmed).toBe(false);
    const clean = makeDraft();
    expect(clean.confirmed).toBe(false);
    expect(confirmContext(clean)).toMatchObject({
      confirmed: true,
      version: 1,
    });
  });
  it("classifies both activity kinds and asks about unknown goals", () => {
    expect(classify("Plan a member workshop")).toBe("member_activity");
    expect(classify("School notice for board representatives")).toBe(
      "executive_obligation",
    );
    expect(classify("Help us improve")).toBeNull();
  });
  it("adapts the member playbook with scoped capability owners", () => {
    const a = workflow(makeDraft(), "member_activity");
    const b = workflow(makeDraft("B"), "member_activity");
    expect(a.length).toBeGreaterThan(5);
    expect(a.find((t) => t.capabilityId === "relationships")?.owner).toBe(
      "Marketing",
    );
    expect(b.find((t) => t.capabilityId === "relationships")?.owner).toBe(
      "External Relations",
    );
    expect(a.every((t) => t.activityId && t.dateReason)).toBe(true);
  });
  it("generates a short executive chain with engine-owned dates", () => {
    const tasks = workflow(makeDraft(), "executive_obligation");
    expect(tasks).toHaveLength(4);
    expect(tasks[1].owner).toBe("Programs Director");
    expect(tasks[0].date).toMatch(/^2026-/);
    expect(tasks[0].dateReason).toBeTruthy();
  });
  it("requires a valid Activity for every new task", () => {
    expect(() => assertTask({}, ["a"])).toThrow();
    expect(() => assertTask({ activityId: "other" }, ["a"])).toThrow();
    expect(assertTask({ activityId: "a" }, ["a"])).toBe(true);
  });
  it("migration inspection preserves IDs and source, leaving ambiguity for review", () => {
    const input = [
      { id: "1", eventId: "event", title: "Work" },
      { id: "2", eventId: null, title: "Internal task" },
      { id: "3", eventId: null, title: "" },
    ];
    const original = structuredClone(input);
    const out = inspectMigration(input);
    expect(input).toEqual(original);
    expect(out[0].activityId).toBe("member:event");
    expect(out[1].activityId).toBe("executive:2");
    expect(out[2].reviewRequired).toBe(true);
    expect(out.map((x) => x.legacyId)).toEqual(["1", "2", "3"]);
  });
  it("handoff excludes private and unconfirmed information", () => {
    expect(
      handoffMemory([
        { text: "Confirmed lesson", confirmed: true, access: "organization" },
        { text: "AI guess", confirmed: false, access: "organization" },
        { text: "Private reminder", confirmed: true, access: "private" },
      ]),
    ).toEqual(["Confirmed lesson"]);
  });
  it("resumes onboarding without changing the legacy key", () => {
    localStorage.clear();
    const repo = localPreviewRepository(localStorage);
    localStorage.setItem("platypus.v1.demo", "legacy");
    repo.write(principal, { ...makeDraft(), step: 3 });
    expect(repo.read(principal)?.step).toBe(3);
    expect(localStorage.getItem("platypus.v1.demo")).toBe("legacy");
  });
  it("denies unauthorized reads and writes, including organization mismatch", () => {
    const repo = localPreviewRepository(localStorage);
    expect(() => repo.read({ ...principal, mayManage: false })).toThrow(
      "access",
    );
    expect(() =>
      repo.write({ ...principal, mayManage: false }, makeDraft()),
    ).toThrow("access");
    expect(() => repo.write(principal, makeDraft("B"))).toThrow("mismatch");
    expect(repo.read({ ...principal, organizationId: "other" })).toBeNull();
  });
  it("editing a draft preserves the separately approved context", () => {
    localStorage.clear();
    const repo = localPreviewRepository(localStorage);
    repo.approve(principal, confirmContext(makeDraft()));
    repo.write(principal, { ...makeDraft(), name: "Unconfirmed edit" });
    expect(repo.readApproved(principal)?.name).toBe("Desert Founders Society");
    expect(repo.read(principal)?.name).toBe("Unconfirmed edit");
    expect(() => repo.approve(principal, makeDraft())).toThrow("Confirm");
  });
  it("expires stored drafts and handles malformed data", () => {
    localStorage.clear();
    let time = 100;
    const repo = localPreviewRepository(localStorage, () => time);
    repo.write(principal, makeDraft());
    time += 8 * 24 * 60 * 60 * 1000;
    expect(repo.read(principal)).toBeNull();
    localStorage.setItem(
      "platypus.phase1.draft:demo-A:demo-president",
      "broken",
    );
    expect(repo.read(principal)).toBeNull();
  });
});
it("leaves an explicitly unknown scoped owner unresolved and preserves the other scope", () => {
  const d = setOwner(makeDraft(), "relationships", "", "companies");
  expect(owner(d, "relationships", "companies")).toBeNull();
  expect(owner(d, "relationships", "campus")).toBe("Marketing");
  expect(uncertainty(d)).toContain("Who should own");
});
