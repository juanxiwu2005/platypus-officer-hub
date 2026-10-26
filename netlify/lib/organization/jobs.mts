import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import {
  STAGES,
  SetupSelectionSchema,
  type SetupSelection,
  type Stage,
} from "../../../src/organization/schema.ts";
import {
  archiveEvent,
  archiveRequest,
  checkOrigin,
  digest,
  readSession,
  SetupError,
  store,
  token,
} from "./storage.mts";
import { json, readJSON } from "../http.mts";
export type AiJob = {
  id: string;
  stage: Stage;
  revision: number;
  instruction: string;
  deep?: boolean;
  selection?: SetupSelection;
  requestId?: string;
  clientPreparationMs?: number;
  status: "queued" | "running" | "done" | "error";
  startedAt: number;
  result?: unknown;
  message?: string;
};
const jobKey = (req: Request) => "ai-jobs/" + digest(token(req));
const requestKey = (req: Request, requestId: string) =>
  `ai-requests/${digest(token(req))}/${requestId}`;
const selectionKey = (selection?: SetupSelection) =>
  JSON.stringify(selection ?? null);
const publicJob = (job: AiJob) => ({
  jobId: job.id,
  status: job.status,
  ...(job.status === "done" ? { response: job.result } : {}),
  ...(job.message ? { message: job.message } : {}),
});
export async function readJob(req: Request) {
  await readSession(req);
  const item = await store().getWithMetadata(jobKey(req), { type: "json" });
  if (!item) throw new SetupError("No pending AI suggestion was found.", 404);
  return { job: item.data as AiJob, etag: item.etag, key: jobKey(req) };
}
export async function startAiJob(req: Request) {
  try {
    checkOrigin(req);
    const { entry } = await readSession(req);
    if (req.method === "GET") {
      const { job } = await readJob(req);
      if (new URL(req.url).searchParams.get("jobId") !== job.id)
        throw new SetupError(
          "This AI suggestion is not available in your workspace.",
          404,
        );
      if (
        Date.now() - job.startedAt > 10 * 60 * 1000 &&
        (job.status === "queued" || job.status === "running")
      )
        return json({
          jobId: job.id,
          status: "error",
          message: "AIR did not finish in time. Please try again.",
        });
      return json(publicJob(job));
    }
    const body = await readJSON(req, 12000);
    if (!STAGES.includes(body.stage as Stage))
      throw new SetupError("Unknown AI setup step.");
    const instruction =
      typeof body.instruction === "string"
        ? body.instruction.slice(0, 1500)
        : "";
    const selectionResult =
      body.selection === undefined
        ? undefined
        : SetupSelectionSchema.safeParse(body.selection);
    if (selectionResult && !selectionResult.success)
      throw new SetupError(
        "Select a valid setup screen and item before asking AI.",
      );
    const selection = selectionResult?.success
      ? selectionResult.data
      : undefined;
    const requestId =
      typeof body.requestId === "string" ? body.requestId : undefined;
    if (
      body.requestId !== undefined &&
      (!requestId ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
          requestId,
        ))
    )
      throw new SetupError("The AI request identifier must be a UUID.");
    const sameInput = (job: AiJob) =>
      job.stage === body.stage &&
      job.instruction === instruction &&
      !!job.deep === (body.deep === true) &&
      selectionKey(job.selection) === selectionKey(selection);
    const blobs = store(),
      key = jobKey(req),
      old = await blobs.getWithMetadata(key, { type: "json" });
    // Durable per-action records survive later jobs. Network replays never buy a second generation.
    if (requestId) {
      const prior = await blobs.getWithMetadata(requestKey(req, requestId), {
        type: "json",
      });
      const job = prior?.data as AiJob | undefined;
      if (job) {
        if (!sameInput(job) || job.revision !== body.revision)
          throw new SetupError(
            "This AI request identifier was already used for different input.",
            409,
          );
        return json(
          publicJob(job),
          job.status === "queued" || job.status === "running" ? 202 : 200,
        );
      }
    }
    if (old) {
      const job = old.data as AiJob;
      const same = sameInput(job);
      if (requestId && job.requestId === requestId) {
        if (!same || job.revision !== body.revision)
          throw new SetupError(
            "This AI request identifier was already used for different input.",
            409,
          );
        await blobs.setJSON(requestKey(req, requestId), job);
        return json(
          publicJob(job),
          job.status === "queued" || job.status === "running" ? 202 : 200,
        );
      }
      const active =
        (job.status === "queued" || job.status === "running") &&
        Date.now() - job.startedAt < 10 * 60 * 1000;
      if (active) {
        if (
          !same ||
          job.revision !== body.revision ||
          (requestId && job.requestId !== requestId)
        )
          throw new SetupError(
            "AI is already preparing another suggestion for this workspace.",
            429,
          );
        return json(publicJob(job), 202);
      }
      const response = job.result as { revision?: number } | undefined;
      if (
        !requestId &&
        job.status === "done" &&
        same &&
        response?.revision === entry.revision &&
        (body.revision === job.revision || body.revision === entry.revision)
      ) {
        return json(publicJob(job));
      }
    }
    if (body.revision !== entry.revision)
      throw new SetupError("Save the latest settings before asking AI.", 409);
    const job: AiJob = {
      id: randomUUID(),
      stage: body.stage as Stage,
      revision: entry.revision,
      instruction,
      selection,
      requestId,
      deep: body.deep === true,
      clientPreparationMs:
        typeof body.clientPreparationMs === "number"
          ? Math.max(0, Math.min(body.clientPreparationMs, 600000))
          : undefined,
      status: "queued",
      startedAt: Date.now(),
    };
    const saved = await blobs.setJSON(
      key,
      job,
      old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
    );
    if (!saved.modified)
      throw new SetupError(
        "Another AI request started first. Please retry.",
        409,
      );
    if (requestId)
      await blobs.setJSON(requestKey(req, requestId), job, { onlyIfNew: true });
    await archiveEvent(
      entry.workspaceId,
      "ai.queued",
      job,
      "ai",
      job.id + "-queued",
    );
    return json(publicJob(job), 202);
  } catch (e) {
    if (e instanceof SetupError) return json({ message: e.message }, e.status);
    if (e instanceof ZodError)
      return json({ message: "The AI request was incomplete." }, 400);
    return json(
      {
        message:
          "The online AI queue is unavailable. No suggestions were applied.",
      },
      503,
    );
  }
}
export async function processAiJob(
  req: Request,
  run: (request: Request, timeout: number) => Promise<Response>,
) {
  let claimed: { job: AiJob; etag: string; key: string } | null = null;
  try {
    checkOrigin(req);
    const body = await readJSON(req, 2000),
      current = await readJob(req);
    if (
      body.jobId !== current.job.id ||
      current.job.status !== "queued" ||
      Date.now() - current.job.startedAt > 10 * 60 * 1000
    )
      return;
    const claimedAt = Date.now();
    const queuedMs = Math.max(0, claimedAt - current.job.startedAt);
    const job = { ...current.job, status: "running" as const };
    const claim = await store().setJSON(current.key, job, {
      onlyIfMatch: current.etag,
    });
    if (!claim.modified) return;
    const claimEtag =
      claim.etag ??
      (await store().getWithMetadata(current.key, { type: "json" }))?.etag;
    if (!claimEtag) throw new Error("AI job claim was not saved.");
    claimed = { job, etag: claimEtag, key: current.key };
    if (job.requestId)
      await store().setJSON(requestKey(req, job.requestId), job);
    await archiveRequest(
      req,
      "ai.started",
      {
        jobId: job.id,
        stage: job.stage,
        queuedMs,
        queueScope: "workspace-background-job",
      },
      "ai",
      job.id + "-started",
    );
    const response = await run(
      new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({
          stage: job.stage,
          revision: job.revision,
          instruction: job.instruction,
          deep: job.deep === true,
          queuedMs,
          selection: job.selection,
          requestId: job.requestId,
          clientPreparationMs: job.clientPreparationMs,
        }),
      }),
      180000,
    );
    const result = await response.json();
    await archiveRequest(
      req,
      response.ok ? "ai.completed" : "ai.failed",
      { jobId: job.id, stage: job.stage, response: result },
      "ai",
      job.id + "-completed",
    );
    const completed: AiJob = response.ok
      ? { ...job, status: "done", result }
      : {
          ...job,
          status: "error",
          message: result.message || "AI could not prepare this suggestion.",
        };
    await store().setJSON(current.key, completed, { onlyIfMatch: claimEtag });
    if (job.requestId)
      await store().setJSON(requestKey(req, job.requestId), completed);
  } catch (e) {
    if (claimed) {
      const failed: AiJob = {
        ...claimed.job,
        status: "error",
        message:
          e instanceof SetupError
            ? e.message
            : "The AI suggestion could not be completed. Please retry.",
      };
      await store().setJSON(claimed.key, failed, { onlyIfMatch: claimed.etag });
      if (failed.requestId)
        await store().setJSON(requestKey(req, failed.requestId), failed);
      await archiveRequest(
        req,
        "ai.failed",
        { jobId: failed.id, stage: failed.stage, message: failed.message },
        "ai",
        failed.id + "-failed",
      ).catch(() => {});
    }
    // Do not throw: Netlify's automatic retries must not duplicate a provider charge.
  }
}
