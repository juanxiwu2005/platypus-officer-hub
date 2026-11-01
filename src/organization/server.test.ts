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
    list: async ({ prefix = "" }: { prefix?: string } = {}) => ({
      blobs: [...state.rows.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => ({ key })),
      directories: [],
    }),
    delete: async (key: string) => {
      state.rows.delete(key);
    },
  }),
}));
vi.mock("../../netlify/lib/ai.mts", async (original) => ({
  ...(await original<object>()),
  chatJSON: state.chat,
}));
import { createHash } from "node:crypto";
import archive from "../../netlify/functions/org-archive.mts";
import setup from "../../netlify/functions/org-setup.mts";
import { runSetupAi as ai } from "../../netlify/functions/org-ai.mts";
import startAiJob, { runSetupAi } from "../../netlify/functions/org-ai.mts";
import { processAiJob } from "../../netlify/lib/organization/jobs.mts";
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
// Server storage is hidden unless ORG_SETUP_ENABLED=true (M1, 2026-10-27); these tests cover it switched on.
beforeEach(() => {
  vi.stubEnv("ORG_SETUP_ENABLED", "true");
  state.rows.clear();
  state.counter = 0;
  state.chat.mockReset();
});
describe("Online organization storage and model boundaries", () => {
  it.each(['{"broken":', "null", "[]", JSON.stringify({ padding: "x".repeat(500_000) })])("rejects malformed or oversized setup input before persistence %#", async body => {
    const response = await setup(new Request("https://example.org/api/org/setup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-platypus-request": "organization-setup", origin: "https://example.org" },
      body,
    }));
    expect(response.status).toBe(400);
    expect(state.rows.size).toBe(0);
    expect(state.chat).not.toHaveBeenCalled();
  });
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
  it("rejects invalid manual assignment references at the save boundary", async () => {
    const { cookie } = await session();
    const draft = fixtureDraft();
    draft.assignments[0].roleIds = ["unknown"];
    const r = await setup(
      request({ action: "save", revision: 0, draft }, cookie),
    );
    expect(r.status).toBe(400);
  });
  it("queues AIR work, claims it once, and serves only the owner's completed result", async () => {
    const { cookie } = await session();
    const queued = await startAiJob(
      request({ stage: "constitution", revision: 0 }, cookie),
    );
    expect(queued.status).toBe(202);
    const job = await queued.json();
    state.chat.mockResolvedValue({
      data: fixtureResult("constitution"),
      model: "AIR-test",
      provider: "ASU AIR",
      ms: 30001,
    });
    await Promise.all([
      processAiJob(request({ jobId: job.jobId }, cookie), runSetupAi),
      processAiJob(request({ jobId: job.jobId }, cookie), runSetupAi),
    ]);
    expect(state.chat).toHaveBeenCalledTimes(1);
    const poll = new Request(
      "https://example.org/api/org/ai?jobId=" + job.jobId,
      { headers: { cookie } },
    );
    const result = await (await startAiJob(poll)).json();
    expect(result.status).toBe("done");
    expect(result.response.result.model).toBe("AIR-test");
    expect((await startAiJob(new Request(poll.url))).status).toBe(401);
    const recovered = await (
      await startAiJob(request({ stage: "constitution", revision: 1 }, cookie))
    ).json();
    expect(recovered.jobId).toBe(job.jobId);
  });
  it("records a failed background suggestion without applying settings or retrying charges", async () => {
    const { cookie } = await session();
    const job = await (
      await startAiJob(request({ stage: "constitution", revision: 0 }, cookie))
    ).json();
    state.chat.mockRejectedValue(new Error("Network unavailable"));
    await processAiJob(request({ jobId: job.jobId }, cookie), runSetupAi);
    await processAiJob(request({ jobId: job.jobId }, cookie), runSetupAi);
    const result = await (
      await startAiJob(
        new Request("https://example.org/api/org/ai?jobId=" + job.jobId, {
          headers: { cookie },
        }),
      )
    ).json();
    expect(result.status).toBe("error");
    expect(state.chat).toHaveBeenCalledTimes(1);
  });
  it("synchronizes internal Responsible roles after a user edits a workflow node", async () => {
    const { cookie } = await session();
    const draft = fixtureDraft();
    draft.memberFlow = fixtureFlow();
    const node = draft.memberFlow.nodes.find((n) =>
      n.actionIds.includes("promotion"),
    )!;
    node.roleIds = ["marketing_intern"];
    const r = await setup(
      request({ action: "save", revision: 0, draft }, cookie),
    );
    const saved = await r.json();
    expect(
      saved.draft.memberFlow.raci.find(
        (r: { actionId: string }) => r.actionId === "promotion",
      ).responsible,
    ).toEqual(["marketing_intern"]);
  });
  it("archives original bytes immutably and checks their hash before completion", async () => {
    const { cookie } = await session(),
      bytes = Buffer.from("A fictional constitution archive.");
    const begin = await archive(
      request(
        {
          action: "begin",
          fileName: "constitution.txt",
          mime: "text/plain",
          size: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
        cookie,
      ),
    );
    const m = await begin.json();
    expect(m.createdAt).toBeTruthy();
    await archive(
      request(
        { action: "part", id: m.id, part: 0, base64: bytes.toString("base64") },
        cookie,
      ),
    );
    await archive(
      request(
        {
          action: "part",
          id: m.id,
          part: 0,
          base64: Buffer.from("tampered").toString("base64"),
        },
        cookie,
      ),
    );
    const done = await (
      await archive(request({ action: "finish", id: m.id }, cookie))
    ).json();
    expect(done.complete).toBe(true);
    expect(done.completedAt).toBeTruthy();
    const raw = await archive(
      new Request(
        `https://example.org/api/org/archive?action=part&id=${m.id}&part=0`,
        { headers: { cookie } },
      ),
    );
    expect((await raw.json()).base64).toBe(bytes.toString("base64"));
  });
  it("timestamps user records, deduplicates retries, redacts credential fields, and isolates export", async () => {
    const { cookie, entry } = await session(),
      id = "an-immutable-user-event";
    const event = {
      id,
      kind: "ui.changed",
      clientAt: "2026-10-25T12:00:00Z",
      details: { value: "api_key: never-store-this", password: "sensitive" },
    };
    await archive(request({ action: "events", events: [event] }, cookie));
    await archive(
      request(
        {
          action: "events",
          events: [{ ...event, details: { value: "overwritten" } }],
        },
        cookie,
      ),
    );
    const r = await archive(
      new Request("https://example.org/api/org/archive?action=event&id=" + id, {
        headers: { cookie },
      }),
    );
    const stored = await r.json();
    expect(stored.serverAt).toBeTruthy();
    expect(stored.workspaceId).toBe(entry.workspaceId);
    expect(JSON.stringify(stored)).not.toContain("never-store-this");
    expect(JSON.stringify(stored)).not.toContain("sensitive");
    expect(JSON.stringify(stored)).not.toContain("overwritten");
    const other = await session();
    expect(
      (
        await archive(
          new Request(
            "https://example.org/api/org/archive?action=event&id=" + id,
            { headers: { cookie: other.cookie } },
          ),
        )
      ).status,
    ).toBe(404);
  });
  it("keeps history when a test access session expires", async () => {
    const { cookie } = await session();
    const sessionKey = [...state.rows.keys()].find((k) =>
      k.startsWith("sessions/"),
    )!;
    const row = state.rows.get(sessionKey)!;
    (row.data as Envelope).expiresAt = "2000-01-01T00:00:00Z";
    const before = state.rows.size;
    expect(
      (
        await setup(
          new Request("https://example.org/api/org/setup", {
            headers: { cookie },
          }),
        )
      ).status,
    ).toBe(401);
    expect(state.rows.size).toBe(before);
  });
});

describe("v3 server compiler and scoped cache", () => {
  it("compiles confirmed configuration on the server and ignores a forged artifact", async () => {
    const { cookie } = await session();
    const { upgrade, scopeKey } = await import("./setupLogic");
    const d = upgrade(fixtureDraft());
    d.memberFlow = fixtureFlow(d);
    d.compiled = { format: "forged" };
    d.riskCheck = {
      status: "skipped",
      inputKey: scopeKey(d, "risk_check"),
      risks: [],
      answers: {},
      at: new Date().toISOString(),
    };
    const response = await setup(
      request({ action: "confirm", revision: 0, draft: d }, cookie),
    );
    expect(response.status).toBe(200);
    const e = await response.json();
    expect(e.approved.compiled.format).toBe("platypus.organization");
    expect(e.approved.compiled.contextVersion).toBe(e.approved.contextVersion);
    expect(e.approved.boardFlow).toBeNull();
    expect(state.chat).not.toHaveBeenCalled();
    expect(
      [...state.rows.values()].some(
        (row) => (row.data as any).kind === "configuration.compiled",
      ),
    ).toBe(true);
  });
  it("reuses matching semantic inputs after saves without another provider call", async () => {
    const { cookie } = await session();
    const { upgrade } = await import("./setupLogic");
    const d = upgrade(fixtureDraft());
    await setup(request({ action: "save", revision: 0, draft: d }, cookie));
    state.chat.mockResolvedValue({
      data: { risks: [] },
      model: "fixture",
      provider: "Test",
      ms: 12,
    });
    const first = await (
      await ai(request({ stage: "risk_check", revision: 1 }, cookie))
    ).json();
    expect(first.result.cached).toBe(false);
    const second = await (
      await ai(
        request({ stage: "risk_check", revision: first.revision }, cookie),
      )
    ).json();
    expect(second.result.cached).toBe(true);
    expect(state.chat).toHaveBeenCalledTimes(1);
  });
});
