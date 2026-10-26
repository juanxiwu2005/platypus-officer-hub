import { api } from "./client";
type Event = {
  id: string;
  kind: string;
  clientAt: string;
  sessionId: string;
  sequence: number;
  details: unknown;
};
let workspace = "",
  pending: Event[] = [],
  serial: Promise<void> = Promise.resolve(),
  timer: ReturnType<typeof setTimeout> | undefined,
  sequence = 0,
  report: (s: string) => void = () => {};
const sessionId = crypto.randomUUID();
const storageKey = () => "platypus_org_audit_pending_v1_" + workspace;
const remember = () => {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(pending));
  } catch {
    report(
      "Some activity records are not archived yet. Keep this page open and retry saving.",
    );
  }
};
export function configureArchive(id: string, onError: (s: string) => void) {
  report = onError;
  if (workspace === id) return;
  workspace = id;
  try {
    pending = JSON.parse(localStorage.getItem(storageKey()) || "[]");
  } catch {
    pending = [];
  }
}
export function track(kind: string, details: unknown) {
  if (!workspace) return;
  pending.push({
    id: crypto.randomUUID(),
    kind,
    details,
    clientAt: new Date().toISOString(),
    sessionId,
    sequence: ++sequence,
  });
  remember();
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flushArchive().catch((e) => report((e as Error).message));
  }, 900);
}
export const hasPendingArchive = () => pending.length > 0;
export function flushArchive() {
  const work = serial
    .catch(() => {})
    .then(async () => {
      if (timer) clearTimeout(timer);
      while (pending.length) {
        const batch = pending.slice(0, 10);
        await api("/api/org/archive", { action: "events", events: batch });
        const ids = new Set(batch.map((e) => e.id));
        pending = pending.filter((e) => !ids.has(e.id));
        remember();
      }
    });
  serial = work;
  return work;
}
export type ArchivedFile = {
  id: string;
  fileName: string;
  size: number;
  mime: string;
  parts: number;
  sha256: string;
  createdAt: string;
  complete: boolean;
};
const base64 = (bytes: Uint8Array) => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
};
export async function archiveFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer()),
    hash = await crypto.subtle.digest("SHA-256", bytes),
    sha256 = Array.from(new Uint8Array(hash), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  const m = await api<ArchivedFile>("/api/org/archive", {
    action: "begin",
    fileName: file.name,
    mime: file.type,
    size: file.size,
    sha256,
  });
  for (let n = 0; n < m.parts; n++)
    await api("/api/org/archive", {
      action: "part",
      id: m.id,
      part: n,
      base64: base64(bytes.subarray(n * 786432, (n + 1) * 786432)),
    });
  return api<ArchivedFile>("/api/org/archive", { action: "finish", id: m.id });
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadOriginal(id: string) {
  const m = await api<ArchivedFile>(
      "/api/org/archive?action=manifest&id=" + encodeURIComponent(id),
    ),
    chunks: Uint8Array[] = [];
  for (let n = 0; n < m.parts; n++) {
    const p = await api<{ base64: string }>(
      `/api/org/archive?action=part&id=${encodeURIComponent(id)}&part=${n}`,
    );
    chunks.push(Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0)));
  }
  download(new Blob(chunks, { type: m.mime }), m.fileName);
  track("document.downloaded", { id, fileName: m.fileName });
}
export async function exportRecords() {
  await flushArchive();
  const index = await api<{ eventIds: string[]; [key: string]: unknown }>(
      "/api/org/archive?action=index",
    ),
    events: unknown[] = [];
  for (let i = 0; i < index.eventIds.length; i += 8)
    events.push(
      ...(await Promise.all(
        index.eventIds
          .slice(i, i + 8)
          .map((id) =>
            api("/api/org/archive?action=event&id=" + encodeURIComponent(id)),
          ),
      )),
    );
  events.sort((a, b) =>
    String((a as { serverAt: string }).serverAt).localeCompare(
      String((b as { serverAt: string }).serverAt),
    ),
  );
  download(
    new Blob([JSON.stringify({ ...index, events }, null, 2)], {
      type: "application/json",
    }),
    "organization-records.json",
  );
  track("archive.exported", { events: events.length });
}

export const listArchivedFiles = () =>
  api<{ uploads: ArchivedFile[] }>("/api/org/archive?action=index");
