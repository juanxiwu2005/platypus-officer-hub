import {
  compileOrganization,
  upgrade,
  validateStructure,
  roleContext,
  stable,
} from "../../../src/organization/setupLogic.ts";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { blankDraft } from "../../../src/organization/presets.ts";
import {
  DraftSchema,
  type Envelope,
  type SetupDraft,
} from "../../../src/organization/schema.ts";
import { validateDraftIntegrity } from "../../../src/organization/validation.ts";
const COOKIE = "platypus_org_setup_v2";
const TTL = 7 * 24 * 60 * 60 * 1000;
export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export class SetupError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function checkOrigin(req: Request) {
  if (req.method === "GET") return;
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new SetupError("Cross-site requests are not allowed.", 403);
  if (req.headers.get("x-platypus-request") !== "organization-setup")
    throw new SetupError("Missing setup request header.", 403);
}
export function token(req: Request) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1) ?? ""
  );
}
const key = (value: string) => "sessions/" + digest(value);
export const store = () =>
  getStore({ name: "platypus-organization-setup-v2", consistency: "strong" });
export async function readSession(req: Request) {
  const value = token(req);
  if (!/^[a-f0-9]{64}$/.test(value))
    throw new SetupError("Start your private demo workspace first.", 401);
  const item = await store().getWithMetadata(key(value), { type: "json" });
  if (!item)
    throw new SetupError(
      "This demo workspace has expired. Start a new one.",
      401,
    );
  const entry = item.data as Envelope;
  // Access expiry and retention are separate: never purge history on session expiry.
  if (Date.parse(entry.expiresAt) < Date.now())
    throw new SetupError(
      "This test session expired. Organization archives are retained.",
      401,
    );
  return { entry, etag: item.etag, key: key(value) };
}
export async function startSession(req: Request) {
  try {
    const { entry } = await readSession(req);
    await archiveEvent(
      entry.workspaceId,
      "workspace.resumed",
      {
        revision: entry.revision,
        draft: entry.draft,
        approved: entry.approved,
      },
      "user",
    );
    return {
      entry,
      cookie: `${COOKIE}=${token(req)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
    };
  } catch (e) {
    if (e instanceof SetupError && e.status !== 401) throw e;
    if (!(e instanceof SetupError)) throw e;
  }
  const value = randomBytes(32).toString("hex");
  const entry: Envelope = {
    workspaceId: randomUUID(),
    revision: 0,
    draft: blankDraft(),
    approved: null,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL).toISOString(),
  };
  await store().setJSON(key(value), entry, { onlyIfNew: true });
  await archiveEvent(entry.workspaceId, "workspace.created", {
    workspaceId: entry.workspaceId,
    configuration: entry.draft,
  });
  return {
    entry,
    cookie: `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
export async function saveSession(
  req: Request,
  raw: unknown,
  revision: number,
  confirm = false,
) {
  const current = await readSession(req);
  if (current.entry.revision !== revision)
    throw new SetupError(
      "A newer change was saved. Reload before continuing.",
      409,
    );
  const draft = DraftSchema.parse(raw);
  try {
    validateDraftIntegrity(draft);
    if (draft.uiVersion === 3) validateStructure(upgrade(draft));
  } catch (e) {
    throw new SetupError((e as Error).message);
  }
  // Keep internal Responsible membership synchronized after manual node edits.
  for (const flow of [draft.memberFlow, draft.boardFlow])
    if (flow) {
      flow.raci = flow.raci.map((row) => {
        const nodes = flow.nodes.filter((n) =>
          n.actionIds.includes(row.actionId),
        );
        return {
          ...row,
          responsible: [
            ...new Set(
              nodes.length
                ? nodes.flatMap((n) => n.roleIds)
                : (draft.assignments.find((a) => a.actionId === row.actionId)
                    ?.roleIds ?? []),
            ),
          ],
        };
      });
    }
  draft.aiRuns = current.entry.draft.aiRuns;
  draft.contextVersion = current.entry.draft.contextVersion;
  if (confirm) {
    if (draft.uiVersion === 3) {
      try {
        draft.compiled = compileOrganization(draft);
      } catch (e) {
        throw new SetupError((e as Error).message);
      }
    } else if (!draft.guide || !draft.memberFlow || !draft.boardFlow)
      throw new SetupError(
        "Review the generated workflows and organization guide first.",
      );
    draft.contextVersion += 1;
    draft.confirmed = true;
    draft.confirmedAt = new Date().toISOString();
  } else {
    draft.confirmed = false;
    draft.confirmedAt = null;
  }
  const entry: Envelope = {
    ...current.entry,
    revision: revision + 1,
    draft,
    approved: confirm ? structuredClone(draft) : current.entry.approved,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL).toISOString(),
  };
  await archiveEvent(
    entry.workspaceId,
    "configuration.requested",
    { revision: entry.revision, confirm, configuration: draft },
    "user",
  );
  const result = await store().setJSON(current.key, entry, {
    onlyIfMatch: current.etag,
  });
  if (!result.modified)
    throw new SetupError(
      "Another save finished first. Reload before continuing.",
      409,
    );
  await archiveEvent(
    entry.workspaceId,
    confirm ? "configuration.approved" : "configuration.saved",
    {
      revision: entry.revision,
      confirmed: draft.confirmed,
      configuration: draft,
    },
  );
  // A small retrieval index points to prior configurations; immutable events remain the full archive.
  const compact = (raw: SetupDraft) => {
    const u = upgrade(raw);
    return {
      organization: { name: u.name, mission: u.mission },
      departments: u.departments,
      roles: roleContext(u),
      workflow: u.memberFlow
        ? {
            title: u.memberFlow.title,
            nodes: u.memberFlow.nodes.map(
              ({ id, title, roleIds, dependsOn, dependencyMode }) => ({
                id,
                title,
                roleIds,
                dependsOn,
                dependencyMode,
              }),
            ),
          }
        : null,
    };
  };
  if (stable(compact(current.entry.draft)) !== stable(compact(draft))) {
    const historyKey = `history/${entry.workspaceId}`;
    const version = {
      at: current.entry.updatedAt,
      revision: current.entry.revision,
      ...compact(current.entry.draft),
    };
    // A later save may commit while this post-save index is still being written.
    // Merge by revision and retry its CAS instead of silently losing a version.
    let indexed = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const previous = await store().getWithMetadata(historyKey, {
        type: "json",
      });
      const items = (previous?.data as typeof version[] | undefined) ?? [];
      const result = await store().setJSON(
        historyKey,
        [...items.filter((item) => item.revision !== version.revision), version]
          .sort((a, b) => a.revision - b.revision)
          .slice(-20),
        previous ? { onlyIfMatch: previous.etag } : { onlyIfNew: true },
      );
      if (result.modified) {
        indexed = true;
        break;
      }
    }
    if (!indexed) throw new SetupError(
      "Your settings were saved, but recent history could not be indexed. Reload to reconnect before continuing; the full archive is retained.",
      503,
    );
  }
  if (confirm && draft.uiVersion === 3)
    await archiveEvent(
      entry.workspaceId,
      "configuration.compiled",
      { revision: entry.revision, artifact: draft.compiled },
      "system",
    );
  return entry;
}
export async function recordRun(
  req: Request,
  revision: number,
  run: SetupDraft["aiRuns"][number],
) {
  const current = await readSession(req);
  if (current.entry.revision !== revision)
    throw new SetupError(
      "Settings changed while AI was preparing this suggestion. Try again.",
      409,
    );
  const entry = {
    ...current.entry,
    revision: revision + 1,
    updatedAt: new Date().toISOString(),
    draft: {
      ...current.entry.draft,
      aiRuns: [...current.entry.draft.aiRuns.slice(-49), run],
    },
  };
  const result = await store().setJSON(current.key, entry, {
    onlyIfMatch: current.etag,
  });
  if (!result.modified)
    throw new SetupError(
      "Settings changed while AI was working. Try again.",
      409,
    );
  return entry;
}

/** One model request at a time per anonymous workspace, with an atomic, short-lived lease. */
export async function acquireAiLease(req: Request, durationMs = 90000) {
  const leaseKey = "ai-leases/" + digest(token(req));
  const blobs = store();
  const old = await blobs.getWithMetadata(leaseKey, { type: "json" });
  const prior = old?.data as
    | { expiresAt: number; attempts: number[]; id: string }
    | undefined;
  const now = Date.now();
  if (prior && prior.expiresAt > now)
    throw new SetupError(
      "AI is already preparing a suggestion for this workspace.",
      429,
    );
  const attempts = (prior?.attempts ?? []).filter(
    (t) => now - t < 10 * 60 * 1000,
  );
  if (attempts.length >= 30)
    throw new SetupError(
      "Please wait a few minutes before another AI request.",
      429,
    );
  const lease = {
    id: randomUUID(),
    expiresAt: now + durationMs,
    attempts: [...attempts, now],
  };
  const claim = await blobs.setJSON(
    leaseKey,
    lease,
    old ? { onlyIfMatch: old.etag } : { onlyIfNew: true },
  );
  if (!claim.modified)
    throw new SetupError("Another AI request started first. Please wait.", 429);
  return async () => {
    await blobs.setJSON(
      leaseKey,
      { ...lease, expiresAt: 0 },
      { onlyIfMatch: claim.etag! },
    );
  };
}

/** Append-only records. Original user material stays in this private workspace. */
export async function archiveEvent(
  workspaceId: string,
  kind: string,
  payload: unknown,
  actor = "system",
  suppliedId?: string,
) {
  const id =
    suppliedId && /^[a-zA-Z0-9_-]{1,180}$/.test(suppliedId)
      ? suppliedId
      : randomUUID();
  const serverAt = new Date().toISOString();
  const event = {
    dataMode: "fictional-demo",
    actorVerification: actor === "user" ? "anonymous-browser" : "application",
    schemaVersion: 1,
    id,
    workspaceId,
    actor,
    kind,
    serverAt,
    payload,
  };
  await store().setJSON(`archives/${workspaceId}/events/${id}`, event, {
    onlyIfNew: true,
  });
  return event;
}
export async function archiveRequest(
  req: Request,
  kind: string,
  payload: unknown,
  actor = "system",
  id?: string,
) {
  const { entry } = await readSession(req);
  return archiveEvent(entry.workspaceId, kind, payload, actor, id);
}
