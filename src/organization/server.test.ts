import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rows: new Map<string, { data: unknown; etag: string }>(),
  counter: 0,
  chat: vi.fn(),
}));
vi.mock("@netlify/blobs", () => ({
  getStore: () => ({
    getWithMetadata: async (key: string) =>
      state.rows.has(key) ? structuredClone(state.rows.get(key)) : null,
    setJSON: async (
      key: string,
      data: unknown,
      options: { onlyIfNew?: boolean; onlyIfMatch?: string } = {},
    ) => {
      const old = state.rows.get(key);
      if (
        (options.onlyIfNew && old) ||
        (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
      )
        return { modified: false };
      const etag = "etag-" + ++state.counter;
      state.rows.set(key, { data: structuredClone(data), etag });
      return { modified: true, etag };
    },
    delete: async (key: string) => {
      state.rows.delete(key);
    },
  }),
}));
vi.mock("../../netlify/lib/ai.mts", async (original) => ({
  ...(await original<object>()),
  chatJSON: state.chat,
}));
import setup from "../../netlify/functions/org-setup.mts";
import ai from "../../netlify/functions/org-ai.mts";
import { acquireAiLease } from "../../netlify/lib/organization/storage.mts";
import { blankDraft } from "./presets";
import { fixtureDraft, fixtureFlow, fixtureResult } from "./testing/fixtures";
import type { Envelope } from "./schema";
const request = (body: unknown, cookie = "", origin = "https://example.org") =>
  new Request("https://example.org/api/org/setup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-platypus-request": "organization-setup",
      origin: origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
async function session() {
  const r = await setup(request({ action: "start" }));
  return {
    entry: (await r.json()) as Envelope,
    cookie: r.headers.get("set-cookie")!.split(";")[0],
  };
}
beforeEach(() => {
  state.rows.clear();
  state.counter = 0;
  state.chat.mockReset();
});
describe("Online organization storage and model boundaries", () => {
  it("creates an HttpOnly same-site workspace and resumes it", async () => {
    const r = await setup(request({ action: "start" }));
    expect(r.headers.get("set-cookie")).toContain("HttpOnly");
    expect(r.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect(r.headers.get("set-cookie")).toContain("Secure");
    const cookie = r.headers.get("set-cookie")!.split(";")[0];
    const first = await r.json();
    const resumed = await setup(
      new Request("https://example.org/api/org/setup", { headers: { cookie } }),
    );
    expect((await resumed.json()).workspaceId).toBe(first.workspaceId);
  });
  it("denies another browser access and blocks cross-site writes", async () => {
    const { cookie } = await session();
    expect(
      (await setup(new Request("https://example.org/api/org/setup"))).status,
    ).toBe(401);
    expect(
      (
        await setup(
          request(
            { action: "save", draft: blankDraft(), revision: 0 },
            cookie,
            "https://attacker.org",
          ),
        )
      ).status,
    ).toBe(403);
  });
  it("persists each accepted revision and rejects a stale overwrite", async () => {
    const { cookie, entry } = await session();
    const d = { ...entry.draft, name: "Fictional Builders" };
    const saved = await setup(
      request({ action: "save", revision: 0, draft: d }, cookie),
    );
    expect(saved.status).toBe(200);
    expect((await saved.json()).revision).toBe(1);
    expect(
      (await setup(request({ action: "save", revision: 0, draft: d }, cookie)))
        .status,
    ).toBe(409);
    const fresh = await setup(
      new Request("https://example.org/api/org/setup", { headers: { cookie } }),
    );
    expect((await fresh.json()).draft.name).toBe("Fictional Builders");
  });
  it("keeps a confirmed snapshot separate from new edits", async () => {
    const { cookie } = await session();
    const d = fixtureDraft();
    d.memberFlow = fixtureFlow(d);
    d.boardFlow = fixtureFlow(d, true);
    d.guide = fixtureResult("guide", d) as typeof d.guide;
    const confirmed = await setup(
      request({ action: "confirm", revision: 0, draft: d }, cookie),
    );
    const e = await confirmed.json();
    expect(e.approved.contextVersion).toBe(1);
    await setup(
      request(
        {
          action: "save",
          revision: 1,
          draft: { ...d, name: "Unconfirmed name" },
        },
        cookie,
      ),
    );
    const read = await setup(
      new Request("https://example.org/api/org/setup", { headers: { cookie } }),
    );
    const next = await read.json();
    expect(next.approved.name).toBe(d.name);
    expect(next.draft.name).toBe("Unconfirmed name");
  });
  it("does not confirm an organization without its workflows and guide", async () => {
    const { cookie, entry } = await session();
    expect(
      (
        await setup(
          request(
            { action: "confirm", draft: entry.draft, revision: 0 },
            cookie,
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("runs a real provider adapter contract with versioned instructions and validated evidence", async () => {
    const { cookie } = await session();
    const d = fixtureDraft();
    await setup(request({ action: "save", revision: 0, draft: d }, cookie));
    state.chat.mockResolvedValue({
      data: fixtureResult("constitution", d),
      model: "fixture-model",
      provider: "Test fixture",
      ms: 10,
    });
    const r = await ai(request({ stage: "constitution", revision: 1 }, cookie));
    expect(r.status).toBe(200);
    const out = await r.json();
    expect(out.result.model).toBe("fixture-model");
    expect(out.result.promptVersion).toContain("v2");
    expect(out.result.inputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(out.revision).toBe(2);
    expect(state.chat.mock.calls[0][0].system).toContain("UNTRUSTED DATA");
    expect(
      JSON.parse(state.chat.mock.calls[0][0].user).context.onDemand.constitution
        .text,
    ).toBe(d.source!.text);
  });
  it("has no simulated-success fallback when the provider fails", async () => {
    const { cookie } = await session();
    state.chat.mockRejectedValue(new Error("offline"));
    const r = await ai(request({ stage: "constitution", revision: 0 }, cookie));
    expect(r.status).toBe(502);
    expect((await r.json()).result).toBeUndefined();
  });
  it("rejects model graphs with another organization’s role and does not persist them", async () => {
    const { cookie } = await session();
    const d = fixtureDraft();
    await setup(request({ action: "save", revision: 0, draft: d }, cookie));
    const f = fixtureFlow(d);
    f.nodes[0].roleIds = ["another-org"];
    state.chat.mockResolvedValue({
      data: f,
      provider: "Test",
      model: "fixture",
    });
    expect(
      (await ai(request({ stage: "member_workflow", revision: 1 }, cookie)))
        .status,
    ).toBe(502);
    const r = await setup(
      new Request("https://example.org/api/org/setup", { headers: { cookie } }),
    );
    expect((await r.json()).draft.memberFlow).toBeNull();
  });
  it("serializes concurrent AI requests with an atomic workspace lease", async () => {
    const { cookie } = await session();
    const req = request({}, cookie);
    const release = await acquireAiLease(req);
    await expect(acquireAiLease(req)).rejects.toThrow("already preparing");
    await release();
    await expect(acquireAiLease(req)).resolves.toBeTypeOf("function");
  });
  it("rejects stale AI input before charging a provider call", async () => {
    const { cookie } = await session();
    expect(
      (await ai(request({ stage: "constitution", revision: 44 }, cookie)))
        .status,
    ).toBe(409);
    expect(state.chat).not.toHaveBeenCalled();
  });
  it("does not accept client-supplied AI provenance as authoritative", async () => {
    const { cookie, entry } = await session();
    const draft = {
      ...entry.draft,
      aiRuns: [
        {
          stage: "guide",
          model: "invented",
          provider: "invented",
          promptVersion: "fake",
          inputHash: "fake",
          at: "2026-10-25",
        },
      ],
    };
    const r = await setup(
      request({ action: "save", revision: 0, draft }, cookie),
    );
    expect((await r.json()).draft.aiRuns).toEqual([]);
  });
});
