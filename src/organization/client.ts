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
export const prepare = (stage: Stage, revision: number, instruction = "") =>
  api<{ result: AiResult; revision: number; updatedAt: string }>(
    "/api/org/ai",
    { stage, revision, instruction },
  );
