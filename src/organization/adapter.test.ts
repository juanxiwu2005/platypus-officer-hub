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
  const send = vi.fn().mockResolvedValue(
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
