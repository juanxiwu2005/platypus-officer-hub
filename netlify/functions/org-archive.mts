import { createHash, randomUUID } from "node:crypto";
import type { Config } from "@netlify/functions";
import {
  archiveEvent,
  checkOrigin,
  readSession,
  SetupError,
  store,
} from "../lib/organization/storage.mts";
import { json, readJSON, BadRequest } from "../lib/http.mts";
const CHUNK = 786432;
const safeId = (v: unknown) =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{1,180}$/.test(v)
    ? v
    : (() => {
        throw new SetupError("Invalid archive record.");
      })();
const secretSafe = (v: unknown): unknown =>
  typeof v === "string"
    ? v
        .replace(
          /(?:api[_ -]?key|password|secret)\s*[:=]\s*\S+/gi,
          "[credential redacted]",
        )
        .replace(/\bsk-[a-zA-Z0-9_-]{16,}\b/g, "[credential redacted]")
    : Array.isArray(v)
      ? v.map(secretSafe)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(
                ([k]) =>
                  !/^(authorization|cookie|password|apiKey|secret|token)$/i.test(
                    k,
                  ),
              )
              .map(([k, x]) => [k, secretSafe(x)]),
          )
        : v;
type Upload = {
  id: string;
  fileName: string;
  mime: string;
  size: number;
  sha256: string;
  parts: number;
  createdAt: string;
  completedAt?: string;
  complete: boolean;
};
export default async (req: Request) => {
  try {
    checkOrigin(req);
    const { entry } = await readSession(req),
      blobs = store(),
      prefix = `archives/${entry.workspaceId}/`,
      url = new URL(req.url);
    if (req.method === "GET") {
      const action = url.searchParams.get("action") || "index";
      if (action === "event") {
        const id = safeId(url.searchParams.get("id")),
          item = await blobs.getWithMetadata(prefix + "events/" + id, {
            type: "json",
          });
        if (!item) throw new SetupError("Record not found.", 404);
        return json(item.data);
      }
      if (action === "manifest" || action === "part") {
        const id = safeId(url.searchParams.get("id")),
          path = prefix + `uploads/${id}/`,
          item = await blobs.getWithMetadata(path + "manifest", {
            type: "json",
          });
        if (!item) throw new SetupError("Original file not found.", 404);
        if (action === "manifest") return json(item.data);
        const n = Number(url.searchParams.get("part")),
          m = item.data as Upload;
        if (!Number.isInteger(n) || n < 0 || n >= m.parts)
          throw new SetupError("Invalid file part.");
        const part = await blobs.getWithMetadata(path + "part-" + n, {
          type: "json",
        });
        if (!part) throw new SetupError("File part not found.", 404);
        return json(part.data);
      }
      if (action !== "index") throw new SetupError("Unknown archive action.");
      const [events, files] = await Promise.all([
        blobs.list({ prefix: prefix + "events/" }),
        blobs.list({ prefix: prefix + "uploads/" }),
      ]);
      const manifests = await Promise.all(
        files.blobs
          .filter((x) => x.key.endsWith("/manifest"))
          .map(
            async (x) =>
              (await blobs.getWithMetadata(x.key, { type: "json" }))?.data,
          ),
      );
      return json({
        schemaVersion: 1,
        workspaceId: entry.workspaceId,
        generatedAt: new Date().toISOString(),
        draft: entry.draft,
        approved: entry.approved,
        eventIds: events.blobs.map((x) =>
          x.key.slice((prefix + "events/").length),
        ),
        uploads: manifests.filter(Boolean),
        sharing: "private-workspace-only",
        retention: "no-automatic-deletion",
      });
    }
    const b = await readJSON(req, 1500000);
    if (b.action === "events") {
      if (!Array.isArray(b.events) || b.events.length > 25)
        throw new SetupError("Send at most 25 activity records at a time.");
      for (const raw of b.events) {
        const e = raw as Record<string, unknown>,
          id = safeId(e.id);
        if (typeof e.kind !== "string" || e.kind.length > 100)
          throw new SetupError("Invalid activity type.");
        await archiveEvent(
          entry.workspaceId,
          e.kind,
          secretSafe({
            clientAt: e.clientAt,
            sessionId: e.sessionId,
            sequence: e.sequence,
            details: e.details,
          }),
          "user",
          id,
        );
      }
      return json({ saved: true, at: new Date().toISOString() });
    }
    if (b.action === "begin") {
      const size = Number(b.size),
        fileName = String(b.fileName || "").slice(0, 180),
        sha = String(b.sha256 || "");
      if (
        !Number.isInteger(size) ||
        size < 1 ||
        size > 8000000 ||
        !/^.{1,170}\.(pdf|docx|txt|md)$/i.test(fileName) ||
        !/^[a-f0-9]{64}$/.test(sha)
      )
        throw new SetupError("Choose a supported file up to 8 MB.");
      const id = randomUUID(),
        m: Upload = {
          id,
          fileName,
          mime: String(b.mime || "application/octet-stream").slice(0, 120),
          size,
          sha256: sha,
          parts: Math.ceil(size / CHUNK),
          createdAt: new Date().toISOString(),
          complete: false,
        };
      await blobs.setJSON(prefix + `uploads/${id}/manifest`, m, {
        onlyIfNew: true,
      });
      await archiveEvent(
        entry.workspaceId,
        "document.upload.started",
        m,
        "user",
      );
      return json(m);
    }
    const id = safeId(b.id),
      path = prefix + `uploads/${id}/`,
      item = await blobs.getWithMetadata(path + "manifest", { type: "json" });
    if (!item) throw new SetupError("The file archive was not found.", 404);
    const manifest = item.data as Upload;
    if (b.action === "part") {
      const n = Number(b.part),
        text = typeof b.base64 === "string" ? b.base64 : "";
      if (
        !Number.isInteger(n) ||
        n < 0 ||
        n >= manifest.parts ||
        !text ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(text)
      )
        throw new SetupError("Invalid upload part.");
      const bytes = Buffer.from(text, "base64");
      if (bytes.length > CHUNK)
        throw new SetupError("Upload part is too large.");
      const saved = await blobs.setJSON(
        path + "part-" + n,
        {
          base64: text,
          receivedAt: new Date().toISOString(),
          bytes: bytes.length,
        },
        { onlyIfNew: true },
      );
      if (saved.modified)
        await archiveEvent(
          entry.workspaceId,
          "document.upload.part",
          { id, part: n, bytes: bytes.length },
          "user",
        );
      return json({ saved: true, part: n });
    }
    if (b.action !== "finish") throw new SetupError("Unknown archive action.");
    const parts = await Promise.all(
      Array.from({ length: manifest.parts }, (_, n) =>
        blobs.getWithMetadata(path + "part-" + n, { type: "json" }),
      ),
    );
    if (parts.some((p) => !p))
      throw new SetupError("The original file is not completely archived.");
    const bytes = Buffer.concat(
      parts.map((p) =>
        Buffer.from((p!.data as { base64: string }).base64, "base64"),
      ),
    );
    if (
      bytes.length !== manifest.size ||
      createHash("sha256").update(bytes).digest("hex") !== manifest.sha256
    )
      throw new SetupError(
        "The archived file did not pass its integrity check.",
      );
    const complete = {
      ...manifest,
      complete: true,
      completedAt: new Date().toISOString(),
    };
    await blobs.setJSON(path + "manifest", complete, {
      onlyIfMatch: item.etag,
    });
    await archiveEvent(
      entry.workspaceId,
      "document.upload.completed",
      complete,
      "user",
    );
    return json(complete);
  } catch (e) {
    if (e instanceof SetupError) return json({ message: e.message }, e.status);
    if (e instanceof BadRequest) return json({ message: e.message }, 400);
    return json(
      {
        message:
          "The data archive could not be saved. Please retry before continuing.",
      },
      503,
    );
  }
};
export const config: Config = {
  path: "/api/org/archive",
  method: ["GET", "POST"],
};
