import { afterEach, describe, expect, it, vi } from "vitest";
import { chatJSON } from "../../netlify/lib/ai.mts";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function configured(preset = "asu_air", model = "auto") {
  vi.stubEnv("AI_PRESET",preset); vi.stubEnv("AI_MODEL",model);
  vi.stubEnv("AI_API_KEY","fictional-test-key");
  vi.stubEnv("AI_BASE_URL",""); vi.stubEnv("AI_PROVIDER","");
  vi.stubEnv("AI_JSON_MODE",""); vi.stubEnv("AI_REASONING_EFFORT","");
  const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({model:"actual-server-model",choices:[{message:{content:'{"ok":true}'}}]})));
  vi.stubGlobal("fetch",send); return send;
}
describe("AIR provider routing", () => {
  it("sends the configured AIR key to the AIR gateway and reports the served model", async () => {
    const send = configured();
    const out = await chatJSON({system:"Return JSON",user:"Fictional example"});
    expect(send.mock.calls[0][0]).toBe("https://openai.rc.asu.edu/v1/chat/completions");
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.model).toBe("auto"); expect(body.reasoning_effort).toBe("none");
    expect(out).toMatchObject({provider:"ASU AIR",model:"actual-server-model",data:{ok:true}});
  });
  it("keeps DeepSeek behavior unchanged when AIR is not selected", async () => {
    const send = configured("deepseek","deepseek-chat");
    await chatJSON({system:"Return JSON",user:"Fictional example"});
    expect(send.mock.calls[0][0]).toBe("https://api.deepseek.com/chat/completions");
    expect(JSON.parse(send.mock.calls[0][1].body)).not.toHaveProperty("reasoning_effort");
  });
  it("retries a provider that explicitly rejects JSON mode without dropping AIR routing", async () => {
    const send = configured();
    send.mockResolvedValueOnce(new Response('response_format not supported',{status:400}));
    await chatJSON({system:"Return JSON",user:"Fictional example"});
    expect(send).toHaveBeenCalledTimes(2);
    const body = JSON.parse(send.mock.calls[1][1].body);
    expect(body).not.toHaveProperty("response_format"); expect(body.reasoning_effort).toBe("none");
  });
});
