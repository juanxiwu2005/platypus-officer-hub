import type { AiResult, Envelope, SetupDraft, Stage } from "./schema";
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body
      ? {
          "content-type": "application/json",
          "x-platypus-request": "organization-setup",
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (
    response.status === 202 &&
    !response.headers.get("content-type")?.includes("json")
  )
    return undefined as T;
  let value: Record<string, unknown>;
  try {
    value = await response.json();
  } catch {
    throw new Error(
      "The online setup service is unavailable. Please retry after deployment.",
    );
  }
  if (!response.ok)
    throw new Error(
      typeof value.message === "string"
        ? value.message
        : "The request could not be completed.",
    );
  return value as T;
}
export const start = () => api<Envelope>("/api/org/setup", { action: "start" });
export const save = (draft: SetupDraft, revision: number, confirm = false) =>
  api<Envelope>("/api/org/setup", {
    action: confirm ? "confirm" : "save",
    draft,
    revision,
  });
type Prepared = { result: AiResult; revision: number; updatedAt: string };
type Job = {
  jobId: string;
  status: "queued" | "running" | "done" | "error";
  response?: Prepared;
  message?: string;
};
export async function prepare(
  stage: Stage,
  revision: number,
  instruction = "",
): Promise<Prepared> {
  const job = await api<Job | Prepared>("/api/org/ai", {
    stage,
    revision,
    instruction,
  });
  if ("result" in job) return job;
  if (job.status === "done" && job.response) return job.response;
  if (job.status === "queued")
    await api<void>("/api/org/ai-run", { jobId: job.jobId });
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const current = await api<Job>(
      "/api/org/ai?jobId=" + encodeURIComponent(job.jobId),
    );
    if (current.status === "done" && current.response) return current.response;
    if (current.status === "error")
      throw new Error(current.message || "AI could not finish. Please retry.");
  }
  throw new Error(
    "AIR is taking longer than expected. Your saved settings are safe; please retry later.",
  );
}
