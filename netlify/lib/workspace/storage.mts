import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { readSession, archiveEvent } from "../organization/storage.mts";
import { DEFAULT_TIMING, TimingDefaultsSchema, WorkspaceStateSchema, IdSchema, type WorkspaceEnvelope, type WorkspaceState, type WorkspaceOrganization, type WorkspaceCommand } from "../../../src/workspace/contracts/index.ts";
import { upgrade, stable } from "../../../src/organization/setupLogic.ts";
import { applyWorkspaceCommand, WorkspaceError, stableId } from "./runtime.mts";
import { validateMutation, validateWorkspaceCommand } from "./commands.mts";

type Event = { id: string; at: string; actorId: string | null; revision: number; command: WorkspaceCommand; snapshot: unknown; delivered: boolean };
type Document = { state: WorkspaceState; receipts: Record<string, { hash: string; revision: number }>; outbox: Event[] };
const blobs = () => getStore({ name: "platypus-activity-workspace-v1", consistency: "strong" });
const hash = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");
async function context(req: Request) {
  const { entry } = await readSession(req);
  const approved = entry.approved?.confirmed ? entry.approved : null;
  const d = approved ? upgrade(approved) : null;
  const compiled = approved?.compiled as { timingDefaults?: unknown } | null;
  const organization: WorkspaceOrganization = {
    name: d?.name ?? "Your organization", mission: d?.mission ?? "",
    roles: d?.roles ?? [], departments: d?.departments ?? [],
    timingDefaults: TimingDefaultsSchema.parse(compiled?.timingDefaults ?? (approved as { timingDefaults?: unknown } | null)?.timingDefaults ?? DEFAULT_TIMING),
    contextVersion: approved?.contextVersion ?? 0,
  };
  return { entry, approved, organization, key: "workspaces/" + entry.workspaceId };
}
function envelope(doc: Document, ctx: Awaited<ReturnType<typeof context>>): WorkspaceEnvelope {
  return { state: doc.state, organization: ctx.organization, setupRevision: ctx.entry.revision, demo: true };
}
function commandOrganization(ctx: Awaited<ReturnType<typeof context>>, command: WorkspaceCommand): WorkspaceOrganization {
  if (command.type !== "member.upsert") return ctx.organization;
  // Assigning a fictional officer during setup does not approve the template.
  const roles = new Map([...ctx.organization.roles, ...ctx.entry.draft.roles].map((role) => [role.id, role]));
  return { ...ctx.organization, roles: [...roles.values()] };
}
async function readDocument(ctx: Awaited<ReturnType<typeof context>>) {
  let row = await blobs().getWithMetadata(ctx.key, { type: "json" });
  if (!row) {
    const at = new Date().toISOString();
    const document: Document = { state: { schemaVersion: 1, workspaceId: ctx.entry.workspaceId, revision: 0, actorId: null, members: [], workItems: [], updatedAt: at }, receipts: {}, outbox: [] };
    await blobs().setJSON(ctx.key, document, { onlyIfNew: true });
    row = await blobs().getWithMetadata(ctx.key, { type: "json" });
  }
  if (!row?.etag) {
    console.warn("Workspace storage metadata incomplete", { rowPresent: !!row, metadataFields: row ? Object.keys(row) : [], etagType: typeof row?.etag });
    throw new WorkspaceError("The workspace could not be opened. Retry without discarding your input.", 503);
  }
  const document = row.data as Document;
  WorkspaceStateSchema.parse(document.state);
  if (document.state.workspaceId !== ctx.entry.workspaceId) throw new WorkspaceError("Workspace identity is inconsistent.", 503);
  return { document, etag: row.etag };
}
/** State and its audit outbox commit together. Delivery can safely retry later. */
async function deliver(ctx: Awaited<ReturnType<typeof context>>, document: Document, etag: string) {
  const next = structuredClone(document);
  let changed = false;
  for (const event of next.outbox.filter((e) => !e.delivered)) {
    try {
      await archiveEvent(ctx.entry.workspaceId, "workspace.command.committed", event, "user", event.id);
      event.delivered = true; changed = true;
    } catch { break; }
  }
  if (changed) {
    next.outbox = next.outbox.filter((e, i, all) => !e.delivered || i >= all.length - 100);
    await blobs().setJSON(ctx.key, next, { onlyIfMatch: etag });
  }
}
export async function loadWorkspace(req: Request): Promise<WorkspaceEnvelope> {
  const ctx = await context(req), { document, etag } = await readDocument(ctx);
  await deliver(ctx, document, etag).catch(() => {});
  return envelope(document, ctx);
}
export async function previewWorkspaceCommand(req: Request, value: unknown): Promise<WorkspaceEnvelope> {
  const ctx = await context(req), { document } = await readDocument(ctx);
  const command = validateWorkspaceCommand(value);
  const state = applyWorkspaceCommand(document.state, commandOrganization(ctx, command), command, ctx.approved, new Date().toISOString());
  return envelope({ ...document, state }, ctx);
}
/** Read-only recovery evidence for a fixed command ID after an uncertain response. */
export async function readWorkspaceReceipt(req: Request, requestId: string, command?: unknown): Promise<{ revision: number } | null> {
  IdSchema.parse(requestId);
  const ctx = await context(req), { document } = await readDocument(ctx);
  const receipt = document.receipts[requestId];
  if (!receipt) return null;
  if (command !== undefined && receipt.hash !== hash(validateWorkspaceCommand(command)))
    throw new WorkspaceError("That request ID was already used for a different command.", 409);
  return { revision: receipt.revision };
}
export async function mutateWorkspace(req: Request, value: unknown): Promise<WorkspaceEnvelope> {
  const mutation = validateMutation(value), ctx = await context(req);
  const { document, etag } = await readDocument(ctx);
  const fingerprint = hash(mutation.command), prior = document.receipts[mutation.requestId];
  if (prior) {
    if (prior.hash !== fingerprint) throw new WorkspaceError("That request ID was already used for a different command.", 409);
    await deliver(ctx, document, etag).catch(() => {});
    return envelope(document, ctx);
  }
  if (mutation.revision !== document.state.revision) throw new WorkspaceError("A newer workspace revision is available. Reload and compare before applying this change.", 409);
  const at = new Date().toISOString();
  const state = applyWorkspaceCommand(document.state, commandOrganization(ctx, mutation.command), mutation.command, ctx.approved, at);
  state.revision = document.state.revision + 1;
  const itemId = "workItemId" in mutation.command ? mutation.command.workItemId : mutation.command.type === "work.create" ? mutation.command.input.id : null;
  const event: Event = { id: stableId(ctx.entry.workspaceId, mutation.requestId), at, actorId: document.state.actorId, revision: state.revision, command: mutation.command, snapshot: itemId ? state.workItems.find((w) => w.id === itemId) ?? { removedWorkItemId: itemId } : { members: state.members, actorId: state.actorId }, delivered: false };
  const updated: Document = { state, receipts: { ...document.receipts, [mutation.requestId]: { hash: fingerprint, revision: state.revision } }, outbox: [...document.outbox, event] };
  const saved = await blobs().setJSON(ctx.key, updated, { onlyIfMatch: etag });
  if (!saved.modified) throw new WorkspaceError("Another change was committed first. Reload and compare; this command was not applied.", 409);
  if (saved.etag) await deliver(ctx, updated, saved.etag).catch(() => {});
  return envelope(updated, ctx);
}
export { validateWorkspaceCommand } from "./commands.mts";
