import { afterEach, describe, expect, it, vi } from "vitest";
import { chatJSON } from "../../netlify/lib/ai.mts";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function configured(preset = "asu_air", model = "auto") {
  vi.stubEnv("AI_PRESET", preset);
  vi.stubEnv("AI_MODEL", model);
  vi.stubEnv("AI_API_KEY", "fictional-test-key");
  vi.stubEnv("AI_BASE_URL", "");
  vi.stubEnv("AI_PROVIDER", "");
  vi.stubEnv("AI_JSON_MODE", "");
  vi.stubEnv("AI_REASONING_EFFORT", "");
  vi.stubEnv("AI_MODEL_ROUTING", "");
  const send = vi.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          model: "actual-server-model",
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
      ),
  );
  vi.stubGlobal("fetch", send);
  return send;
}
describe("AIR provider routing", () => {
  it("sends the configured AIR key to the AIR gateway and reports the served model", async () => {
    const send = configured();
    const out = await chatJSON({
      system: "Return JSON",
      user: "Fictional example",
    });
    expect(send.mock.calls[0][0]).toBe(
      "https://openai.rc.asu.edu/v1/chat/completions",
    );
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.model).toBe("muse-glimmer-30b");
    expect(body.reasoning_effort).toBe("none");
    expect(out).toMatchObject({
      provider: "ASU AIR",
      model: "actual-server-model",
      data: { ok: true },
    });
  });
  it("keeps DeepSeek behavior unchanged when AIR is not selected", async () => {
    const send = configured("deepseek", "deepseek-chat");
    await chatJSON({ system: "Return JSON", user: "Fictional example" });
    expect(send.mock.calls[0][0]).toBe(
      "https://api.deepseek.com/chat/completions",
    );
    expect(JSON.parse(send.mock.calls[0][1].body)).not.toHaveProperty(
      "reasoning_effort",
    );
  });
  it("retries a provider that explicitly rejects JSON mode without dropping AIR routing", async () => {
    const send = configured();
    send.mockResolvedValueOnce(
      new Response("response_format not supported", { status: 400 }),
    );
    await chatJSON({ system: "Return JSON", user: "Fictional example" });
    expect(send).toHaveBeenCalledTimes(2);
    const body = JSON.parse(send.mock.calls[1][1].body);
    expect(body).not.toHaveProperty("response_format");
    expect(body.reasoning_effort).toBe("none");
  });
  it("routes complex workflows to GLM with a separate reasoning budget", async () => {
    const send = configured();
    await chatJSON({
      system: "Return JSON",
      user: "Fictional workflow",
      task: "setup.member_workflow",
      mode: "deep",
      maxTokens: 4200,
    });
    const b = JSON.parse(send.mock.calls[0][1].body);
    expect(b.model).toBe("glm-5-3");
    expect(b.reasoning_effort).toBe("low");
    expect(b.max_tokens).toBe(7500);
  });
  it("keeps routine planning on the fast model by default", async () => {
    const send = configured();
    await chatJSON({
      system: "JSON",
      user: "Plan",
      task: "plan_draft",
      maxTokens: 600,
    });
    const b = JSON.parse(send.mock.calls[0][1].body);
    expect(b.model).toBe("muse-glimmer-30b");
    expect(b.reasoning_effort).toBe("none");
    expect(b.max_tokens).toBe(600);
  });
  it("allows an explicit operator rollback to one configured model", async () => {
    const send = configured();
    vi.stubEnv("AI_MODEL_ROUTING", "off");
    await chatJSON({
      system: "JSON",
      user: "Plan",
      task: "setup.member_workflow",
    });
    expect(JSON.parse(send.mock.calls[0][1].body).model).toBe("auto");
  });
  it("uses native JSON schema for AIR workflow fields when provided", async () => {
    const send = configured();
    await chatJSON({
      system: "JSON",
      user: "Workflow",
      task: "setup.member_workflow",
      responseSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    });
    const b = JSON.parse(send.mock.calls[0][1].body);
    expect(b.response_format.type).toBe("json_schema");
    expect(b.response_format.json_schema.strict).toBe(true);
  });
});

describe("structured response failures", () => {
  it("archives a truncated response before reporting a useful error, without a second charge", async () => {
    const send = configured();
    send.mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "muse-glimmer-30b",
          usage: { prompt_tokens: 300, completion_tokens: 100 },
          choices: [
            { finish_reason: "length", message: { content: '{"roles":[' } },
          ],
        }),
      ),
    );
    const observed = vi.fn();
    await expect(
      chatJSON({ system: "JSON", user: "Fictional", onResponse: observed }),
    ).rejects.toMatchObject({
      code: "bad_json",
      message: expect.stringContaining("output limit"),
      diagnostics: { finishReason: "length", outputTokens: 100 },
    });
    expect(observed).toHaveBeenCalledWith(
      expect.objectContaining({
        rawReply: '{"roles":[',
        inputTokens: 300,
        outputChars: 10,
      }),
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("distinguishes empty content from malformed JSON", async () => {
    const send = configured();
    send.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: "stop", message: { content: "" } }],
        }),
      ),
    );
    await expect(
      chatJSON({ system: "JSON", user: "Fictional" }),
    ).rejects.toThrow("empty response");
  });
  it("downgrades unsupported native schema only once, retaining json_object", async () => {
    const send = configured();
    send.mockResolvedValueOnce(
      new Response("response_format json_schema not supported", {
        status: 400,
      }),
    );
    await chatJSON({
      system: "JSON",
      user: "Fictional",
      responseSchema: { type: "object" },
      task: "setup.constitution",
    });
    expect(JSON.parse(send.mock.calls[1][1].body).response_format).toEqual({
      type: "json_object",
    });
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("AIR streaming telemetry", () => {
  it("reassembles split JSON token events and records first content separately from total time", async () => {
    const send = configured();
    const frames =
      [
        { model: "served-muse", choices: [{ delta: { content: '{"ok":' } }] },
        { choices: [{ delta: { content: "true}" } }] },
        {
          choices: [{ finish_reason: "stop", delta: {} }],
          usage: { prompt_tokens: 50, completion_tokens: 4 },
        },
      ]
        .map((x) => "data: " + JSON.stringify(x) + "\n\n")
        .join("") + "data: [DONE]\n\n";
    const bytes = new TextEncoder().encode(frames);
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(bytes.slice(0, 37));
        c.enqueue(bytes.slice(37, 107));
        c.enqueue(bytes.slice(107));
        c.close();
      },
    });
    send.mockResolvedValue(
      new Response(stream, {
        headers: { "content-type": "text/event-stream" },
      }),
    );
    const observation = vi.fn();
    const out = await chatJSON({
      system: "JSON",
      user: "Fictional",
      task: "setup.edit",
      onResponse: observation,
    });
    expect(out.data).toEqual({ ok: true });
    expect(out.model).toBe("served-muse");
    expect(out.firstTokenMs).toBeTypeOf("number");
    expect(out.outputTokens).toBe(4);
    expect(JSON.parse(send.mock.calls[0][1].body).stream).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("rejects streams that end before the provider finish event", async () => {
    const send = configured();
    send.mockResolvedValue(
      new Response(
        "data: " +
          JSON.stringify({ choices: [{ delta: { content: '{"ok":true}' } }] }) +
          "\n\n",
        { headers: { "content-type": "text/event-stream" } },
      ),
    );
    await expect(
      chatJSON({ system: "JSON", user: "Fictional", task: "setup.edit" }),
    ).rejects.toMatchObject({
      code: "bad_json",
      diagnostics: { finishReason: "stream_incomplete" },
    });
  });
});

describe("three task-specific AIR models", () => {
  it("uses Gemma for structured setup and Muse for short interactive edits", async () => {
    const send = configured();
    await chatJSON({
      system: "JSON",
      user: "Fictional",
      task: "setup.constitution",
    });
    await chatJSON({ system: "JSON", user: "Fictional", task: "setup.edit" });
    expect(send.mock.calls.map((c) => JSON.parse(c[1].body).model)).toEqual([
      "gemma4-31b-it",
      "muse-glimmer-30b",
    ]);
  });
});
