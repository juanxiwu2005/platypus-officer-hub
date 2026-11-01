import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import chat from "../../netlify/functions/chat.mts";
import { BadRequest, readJSON, resetRateLimit } from "../../netlify/lib/http.mts";
import { DraftSchema, RoleSchema } from "../organization/schema";
import { blankDraft } from "../organization/presets";
import { WorkspaceStateSchema } from "../workspace/contracts";

beforeEach(resetRateLimit);
afterEach(() => vi.restoreAllMocks());
const post = (body: string | Uint8Array) => new Request("https://example.org/api/chat", { method: "POST", body });

describe("bounded JSON before schema validation", () => {
  it("accepts a UTF-8 object exactly at the byte limit", async () => {
    const encoded = new TextEncoder().encode('{"text":"é"}');
    const req = post(encoded);
    expect(await readJSON(req, encoded.length)).toEqual({ text: "é" });
  });

  it("decodes a multibyte character split between stream chunks", async () => {
    const encoded = new TextEncoder().encode('{"text":"é"}');
    const split = encoded.indexOf(0xc3) + 1;
    const reader = { read: vi.fn()
      .mockResolvedValueOnce({ done: false, value: encoded.slice(0, split) })
      .mockResolvedValueOnce({ done: false, value: encoded.slice(split) })
      .mockResolvedValueOnce({ done: true }), releaseLock: vi.fn() };
    const req = post("{}");
    vi.spyOn(req.body!, "getReader").mockReturnValue(reader as unknown as ReadableStreamDefaultReader<Uint8Array>);
    expect(await readJSON(req, encoded.length)).toEqual({ text: "é" });
    expect(reader.releaseLock).toHaveBeenCalledOnce();
  });

  it("counts encoded bytes rather than JavaScript characters", async () => {
    const body = '{"text":"' + "é".repeat(30) + '"}';
    await expect(readJSON(post(body), body.length)).rejects.toThrow("Request is too large.");
  });

  it("stops and cancels a chunked oversized body before parsing or reading its tail", async () => {
    const cancel = vi.fn();
    const reader = { read: vi.fn().mockResolvedValue({ done: false, value: new Uint8Array(101) }), cancel, releaseLock: vi.fn() };
    const req = post("{}");
    vi.spyOn(req.body!, "getReader").mockReturnValue(reader as unknown as ReadableStreamDefaultReader<Uint8Array>);
    await expect(readJSON(req, 100)).rejects.toThrow("Request is too large.");
    expect(reader.read).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    expect(reader.releaseLock).toHaveBeenCalledOnce();
  });

  it("rejects declared oversize without buffering the request", async () => {
    const req = post("{}");
    req.headers.set("content-length", "101");
    const getReader = vi.spyOn(req.body!, "getReader");
    await expect(readJSON(req, 100)).rejects.toThrow("Request is too large.");
    expect(getReader).not.toHaveBeenCalled();
  });

  it.each(['{"broken":', "null", "[]", '"text"', "42"])("rejects malformed or non-object JSON %s", async body => {
    await expect(readJSON(post(body))).rejects.toBeInstanceOf(BadRequest);
  });

  it("rejects invalid UTF-8 instead of changing input with replacement characters", async () => {
    await expect(readJSON(post(new Uint8Array([0xff])))).rejects.toThrow("valid UTF-8 JSON");
  });

  it.each(['{"broken":', "null", "[]", JSON.stringify({ padding: "x".repeat(128_000) })])("returns HTTP 400 before any provider call for a rejected request %#", async body => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const response = await chat(post(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "bad_request" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Zod 4 production schema migration", () => {
  it("preserves string-keyed record values and rejects invalid ones", () => {
    const draft = { ...blankDraft(), approvals: { constitution: true }, generated: { constitution: "saved" }, compiled: { nested: { value: 1 } } };
    expect(DraftSchema.parse(draft)).toMatchObject(draft);
    expect(DraftSchema.safeParse({ ...draft, approvals: { constitution: "yes" } }).success).toBe(false);
    expect(DraftSchema.safeParse({ ...draft, generated: { constitution: 42 } }).success).toBe(false);
  });

  it("retains failed parse paths without accepting an incomplete role", () => {
    const result = DraftSchema.safeParse({ ...blankDraft(), roles: [{ id: "lead" }] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(i => i.path.join(".") === "roles.0.title")).toBe(true);
  });

  it("rejects oversized constrained collections before evaluating any element", () => {
    const oversized = new Array(1_000_000);
    const readElement = vi.fn(() => { throw new Error("Oversized input must not be traversed."); });
    Object.defineProperty(oversized, "0", { get: readElement });
    expect(DraftSchema.safeParse({ ...blankDraft(), roles: oversized }).success).toBe(false);
    expect(RoleSchema.shape.responsibilities.safeParse(oversized).success).toBe(false);
    expect(WorkspaceStateSchema.shape.workItems.safeParse(oversized).success).toBe(false);
    expect(readElement).not.toHaveBeenCalled();
  });
});
