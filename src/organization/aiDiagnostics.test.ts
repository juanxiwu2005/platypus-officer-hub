import { afterEach, describe, expect, it, vi } from "vitest";
import { chatJSON } from "../../netlify/lib/ai.mts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const chunk = (content: string) => ({
  model: "served-model",
  choices: [{ delta: { content } }],
});
function configure() {
  vi.stubEnv("AI_PRESET", "asu_air");
  vi.stubEnv("AI_API_KEY", "fictional-test-key");
  vi.stubEnv("AI_MODEL", "auto");
  vi.stubEnv("AI_BASE_URL", "");
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("AI_TIMEOUT_MS", "20");
  vi.stubEnv("AI_MODEL_ROUTING", "");
  vi.stubEnv("AI_JSON_MODE", "");
}
const args = {
  system: "JSON",
  user: "Fictional setup",
  task: "setup.edit" as const,
};
describe("provider diagnostics survive every transport outcome", () => {
  it("persists transport bytes before parsing the model's JSON", async () => {
    configure();
    const reply = '{"persistFirst":true}';
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              choices: [{ finish_reason: "stop", message: { content: reply } }],
            }),
          ),
        ),
    );
    let persisted = false;
    const parse = JSON.parse;
    vi.spyOn(JSON, "parse").mockImplementation((text, reviver) => {
      if (text === reply) expect(persisted).toBe(true);
      return parse(text, reviver);
    });
    const result = await chatJSON({
      ...args,
      onResponse: async (observation) => {
        expect(observation.rawReply).toBe(reply);
        persisted = true;
      },
    });
    expect(result.data).toEqual({ persistFirst: true });
  });
  it("cancels a malformed SSE response without leaving generation streaming", async () => {
    configure();
    const cancel = vi.fn();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init) => {
        signal = init.signal;
        return new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode("data: malformed\n\n"));
            },
            cancel,
          }),
          { headers: { "content-type": "text/event-stream" } },
        );
      }),
    );
    await expect(chatJSON(args)).rejects.toMatchObject({
      diagnostics: { failureKind: "stream_protocol" },
    });
    expect(signal?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("preserves partial non-stream HTTP bytes when reading the response fails", async () => {
    configure();
    let count = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              pull(c) {
                if (count++ === 0)
                  c.enqueue(new TextEncoder().encode('{"choices":['));
                else c.error(new TypeError("connection reset"));
              },
            }),
          ),
      ),
    );
    const archive = vi.fn();
    await expect(
      chatJSON({ ...args, onResponse: archive }),
    ).rejects.toMatchObject({
      code: "network",
      diagnostics: {
        failureKind: "network",
        rawReply: '{"choices":[',
        rawResponse: '{"choices":[',
      },
    });
    expect(archive).toHaveBeenCalledTimes(1);
  });
  it("archives partial content, usage and first-token time after a network disconnect", async () => {
    configure();
    let count = 0;
    const send = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            pull(c) {
              if (count++ === 0)
                c.enqueue(
                  new TextEncoder().encode(
                    frame(chunk('{"roles":[')) +
                      frame({
                        usage: { prompt_tokens: 8, completion_tokens: 3 },
                        choices: [],
                      }),
                  ),
                );
              else c.error(new TypeError("connection reset"));
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
    );
    vi.stubGlobal("fetch", send);
    const archive = vi.fn();
    await expect(
      chatJSON({ ...args, onResponse: archive }),
    ).rejects.toMatchObject({
      code: "network",
      diagnostics: {
        failureKind: "stream_disconnected",
        rawReply: '{"roles":[',
        inputTokens: 8,
        outputTokens: 3,
        firstTokenMs: expect.any(Number),
      },
    });
    expect(archive).toHaveBeenCalledTimes(1);
    expect(archive.mock.calls[0][0].attempts).toEqual([
      expect.objectContaining({
        attempt: 1,
        outcome: "failed",
        failureKind: "stream_disconnected",
        headersReceived: true,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("distinguishes a stalled stream timeout and retains content received before abort", async () => {
    configure();
    vi.useFakeTimers();
    const send = vi.fn(
      async (_url, init) =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new TextEncoder().encode(frame(chunk('{"partial":'))));
              init.signal.addEventListener("abort", () =>
                c.error(new DOMException("Aborted", "AbortError")),
              );
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
    );
    vi.stubGlobal("fetch", send);
    const archive = vi.fn();
    const check = expect(
      chatJSON({ ...args, onResponse: archive }),
    ).rejects.toMatchObject({
      code: "timeout",
      diagnostics: {
        failureKind: "timeout",
        rawReply: '{"partial":',
        headersMs: expect.any(Number),
        durationMs: 20,
      },
    });
    await vi.advanceTimersByTimeAsync(21);
    await check;
    expect(archive).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("records failure before HTTP headers without claiming an observed header wait", async () => {
    configure();
    const send = vi
      .fn()
      .mockRejectedValue(new TypeError("TLS or connection failure"));
    vi.stubGlobal("fetch", send);
    const archive = vi.fn();
    await expect(
      chatJSON({ ...args, onResponse: archive }),
    ).rejects.toMatchObject({
      code: "network",
      diagnostics: {
        failureKind: "network",
        attempts: [
          expect.objectContaining({ headersReceived: false, rawReply: "" }),
        ],
      },
    });
    expect(archive).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each([
    [
      frame(chunk('{"ok":true}')),
      "stream_incomplete",
      "without a finish event",
    ],
    [
      frame(chunk('{"roles":[')) +
        frame({ choices: [{ delta: {}, finish_reason: "length" }] }),
      "output_limit",
      "output limit",
    ],
    [
      frame({ choices: [{ delta: {}, finish_reason: "stop" }] }),
      "empty_response",
      "empty response",
    ],
    [
      frame(chunk("not JSON")) +
        frame({ choices: [{ delta: {}, finish_reason: "stop" }] }),
      "json_syntax",
      "unreadable response",
    ],
    [
      frame(chunk('{"partial":')) + "data: invalid event\n\n",
      "stream_protocol",
      "unreadable response stream",
    ],
    [
      frame(chunk('{"partial":')) +
        frame({ error: { code: "gateway_failed" } }),
      "provider_error",
      "reported an error",
    ],
  ])(
    "classifies %s as %s without silently generating again",
    async (body, kind, message) => {
      configure();
      const send = vi.fn().mockResolvedValue(
        new Response(body, {
          headers: { "content-type": "text/event-stream" },
        }),
      );
      vi.stubGlobal("fetch", send);
      const archive = vi.fn();
      await expect(
        chatJSON({ ...args, onResponse: archive }),
      ).rejects.toMatchObject({
        message: expect.stringContaining(message),
        diagnostics: { failureKind: kind, rawResponse: body },
      });
      expect(archive).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledTimes(1);
      if (kind === "stream_incomplete")
        expect(archive.mock.calls[0][0].failureMessage).not.toContain(
          "(output limit)",
        );
    },
  );
  it("records rejected native-schema and successful fallback as two attempts in one archive", async () => {
    configure();
    const send = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("response_format json_schema unsupported", {
          status: 400,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              { finish_reason: "stop", message: { content: '{"ok":true}' } },
            ],
          }),
        ),
      );
    vi.stubGlobal("fetch", send);
    const archive = vi.fn();
    const result = await chatJSON({
      ...args,
      responseSchema: { type: "object" },
      onResponse: archive,
    });
    expect(result.data).toEqual({ ok: true });
    expect(archive).toHaveBeenCalledTimes(1);
    expect(archive.mock.calls[0][0]).toMatchObject({
      attemptCount: 2,
      formatFallback: true,
      attempts: [
        {
          attempt: 1,
          httpStatus: 400,
          format: "json_schema",
          failureKind: "http_error",
          rawResponse: "response_format json_schema unsupported",
        },
        {
          attempt: 2,
          httpStatus: 200,
          format: "json_object",
          rawReply: '{"ok":true}',
          outcome: "complete",
        },
      ],
    });
  });
  it("does not retry unrelated JSON errors or a second format rejection", async () => {
    configure();
    const send = vi
      .fn()
      .mockResolvedValue(
        new Response("Invalid JSON in messages", { status: 400 }),
      );
    vi.stubGlobal("fetch", send);
    await expect(
      chatJSON({ ...args, responseSchema: { type: "object" } }),
    ).rejects.toMatchObject({
      diagnostics: { attemptCount: 1, failureKind: "http_error" },
    });
    expect(send).toHaveBeenCalledTimes(1);
    send.mockClear().mockImplementation(
      async () =>
        new Response("response_format json_schema unsupported", {
          status: 400,
        }),
    );
    await expect(
      chatJSON({ ...args, responseSchema: { type: "object" } }),
    ).rejects.toMatchObject({ diagnostics: { attemptCount: 2 } });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("archives malformed non-stream HTTP bytes and Anthropic truncation", async () => {
    configure();
    const send = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>gateway response</html>"));
    vi.stubGlobal("fetch", send);
    await expect(chatJSON(args)).rejects.toMatchObject({
      diagnostics: {
        failureKind: "http_json",
        rawReply: "<html>gateway response</html>",
      },
    });
    vi.stubEnv("AI_PRESET", "anthropic");
    vi.stubEnv("AI_MODEL", "fictional-anthropic");
    send.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          model: "served-anthropic",
          stop_reason: "max_tokens",
          content: [{ type: "text", text: '{"partial":' }],
          usage: { input_tokens: 5, output_tokens: 2 },
        }),
      ),
    );
    const archive = vi.fn();
    await expect(
      chatJSON({ system: "JSON", user: "Fictional", onResponse: archive }),
    ).rejects.toMatchObject({
      diagnostics: {
        failureKind: "output_limit",
        model: "served-anthropic",
        inputTokens: 5,
        outputTokens: 2,
      },
    });
    expect(archive).toHaveBeenCalledTimes(1);
  });
});
