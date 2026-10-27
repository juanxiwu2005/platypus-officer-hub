import { beforeEach, describe, expect, it, vi } from "vitest";
const data = vi.hoisted(() => ({
  rows: new Map<string, { data: any; etag: string }>(),
  count: 0,
  revision: 0,
  archive: vi.fn(),
}));
vi.mock("../../netlify/lib/organization/storage.mts", () => ({
  SetupError: class SetupError extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
  checkOrigin: vi.fn(),
  token: () => "private-cookie",
  digest: (x: string) => x,
  readSession: async () => ({
    entry: { workspaceId: "private-workspace", revision: data.revision },
  }),
  archiveEvent: data.archive,
  archiveRequest: data.archive,
  store: () => ({
    getWithMetadata: async (key: string) =>
      data.rows.has(key) ? structuredClone(data.rows.get(key)) : null,
    setJSON: async (
      key: string,
      value: unknown,
      options: { onlyIfMatch?: string; onlyIfNew?: boolean } = {},
    ) => {
      const old = data.rows.get(key);
      if (
        (options.onlyIfNew && old) ||
        (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
      )
        return { modified: false };
      const etag = `v${++data.count}`;
      data.rows.set(key, { data: structuredClone(value), etag });
      return { modified: true, etag };
    },
  }),
}));
import {
  processAiJob,
  startAiJob,
} from "../../netlify/lib/organization/jobs.mts";
const requestId = "73d80929-ec7a-482f-8d37-16e37ef757c0";
const secondId = "588d2195-da41-4b48-b738-8f9d74342d4c";
const selection = { screen: "team", entityType: "role", entityId: "president" };
const req = (value: unknown) =>
  new Request("https://example.org/api/org/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
const input = (rest = {}) => ({
  stage: "edit",
  instruction: "Rename this role",
  revision: data.revision,
  requestId,
  selection,
  ...rest,
});
beforeEach(() => {
  data.rows.clear();
  data.count = 0;
  data.revision = 0;
  data.archive.mockReset();
});
describe("background action identity and selection", () => {
  it("enqueues a new explicit action even after a matching success so current model/cache policy is evaluated", async () => {
    const first = await (await startAiJob(req(input()))).json();
    await processAiJob(req({ jobId: first.jobId }), async () =>
      Response.json({ revision: ++data.revision }),
    );
    const next = await startAiJob(req(input({ requestId: secondId })));
    expect(next.status).toBe(202);
    expect((await next.json()).jobId).not.toBe(first.jobId);
  });
  it("passes selected entities to the worker and records only the local queue wait", async () => {
    const started = await (await startAiJob(req(input()))).json();
    const run = vi.fn(async (request: Request) => {
      const body = await request.json();
      expect(body.selection).toEqual(selection);
      expect(body.requestId).toBe(requestId);
      expect(body.queuedMs).toBeGreaterThanOrEqual(0);
      return Response.json({ revision: 1, result: { data: {} } });
    });
    await Promise.all([
      processAiJob(req({ jobId: started.jobId }), run),
      processAiJob(req({ jobId: started.jobId }), run),
    ]);
    expect(run).toHaveBeenCalledTimes(1);
    expect(data.archive).toHaveBeenCalledWith(
      expect.anything(),
      "ai.started",
      expect.objectContaining({
        queueScope: "workspace-background-job",
        queuedMs: expect.any(Number),
      }),
      "ai",
      expect.any(String),
    );
  });
  it("replays the exact completed action at its original revision after later jobs", async () => {
    const originalInput = input();
    const first = await (await startAiJob(req(originalInput))).json();
    const run = vi.fn(async () =>
      Response.json({ revision: ++data.revision, result: { data: {} } }),
    );
    await processAiJob(req({ jobId: first.jobId }), run);
    const second = await (
      await startAiJob(
        req(input({ requestId: secondId, instruction: "Another request" })),
      )
    ).json();
    await processAiJob(req({ jobId: second.jobId }), run);
    const replay = await startAiJob(req(originalInput));
    expect(replay.status).toBe(200);
    expect((await replay.json()).jobId).toBe(first.jobId);
    expect(run).toHaveBeenCalledTimes(2);
  });
  it("replays a failed action without another generation, but permits an explicit new action", async () => {
    const first = await (await startAiJob(req(input()))).json();
    const run = vi.fn(async () =>
      Response.json({ message: "Provider disconnected" }, { status: 502 }),
    );
    await processAiJob(req({ jobId: first.jobId }), run);
    const replay = await (await startAiJob(req(input()))).json();
    expect(replay).toMatchObject({
      jobId: first.jobId,
      status: "error",
      message: "Provider disconnected",
    });
    await processAiJob(req({ jobId: replay.jobId }), run);
    expect(run).toHaveBeenCalledTimes(1);
    const retry = await (
      await startAiJob(req(input({ requestId: secondId })))
    ).json();
    expect(retry.jobId).not.toBe(first.jobId);
    await processAiJob(req({ jobId: retry.jobId }), run);
    expect(run).toHaveBeenCalledTimes(2);
  });
  it("rejects a reused action ID for a changed selection or revision", async () => {
    await startAiJob(req(input()));
    expect(
      (
        await startAiJob(
          req(input({ selection: { ...selection, entityId: "finance" } })),
        )
      ).status,
    ).toBe(409);
    data.revision = 1;
    expect((await startAiJob(req(input()))).status).toBe(409);
  });
  it("does not treat a changed revision or selected item as the same active legacy request", async () => {
    await startAiJob(req(input({ requestId: undefined })));
    expect(
      (
        await startAiJob(
          req(
            input({
              requestId: undefined,
              selection: { ...selection, entityId: "finance" },
            }),
          ),
        )
      ).status,
    ).toBe(429);
    data.revision = 1;
    expect(
      (await startAiJob(req(input({ requestId: undefined })))).status,
    ).toBe(429);
  });
  it("validates selection and request IDs before creating any job; old requests remain supported", async () => {
    expect(
      (await startAiJob(req(input({ selection: { screen: "invalid" } }))))
        .status,
    ).toBe(400);
    expect(
      (await startAiJob(req(input({ requestId: "not-a-uuid" })))).status,
    ).toBe(400);
    expect(data.rows.size).toBe(0);
    expect(
      (
        await startAiJob(
          req(input({ requestId: undefined, selection: undefined })),
        )
      ).status,
    ).toBe(202);
  });
  it("resumes the legacy completed job when its response revision advanced", async () => {
    const old = input({ requestId: undefined, selection: undefined });
    const first = await (await startAiJob(req(old))).json();
    const run = vi.fn(async () => Response.json({ revision: ++data.revision }));
    await processAiJob(req({ jobId: first.jobId }), run);
    const replay = await startAiJob(req(old));
    expect(replay.status).toBe(200);
    expect((await replay.json()).jobId).toBe(first.jobId);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
