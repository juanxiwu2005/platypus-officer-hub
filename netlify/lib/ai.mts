import { routeTask, type AiTask } from "../../src/organization/modelPolicy.ts";
/**
 * Provider-neutral AI adapter for Platypus.
 *
 * Every AI call in the app goes through chatJSON(). Which company answers is decided
 * only by environment variables set in Netlify (Project configuration → Environment variables):
 *
 *   AI_PRESET     deepseek (default) | asu_air | openai | anthropic   — fills in sensible defaults
 *   AI_API_KEY    the secret key (required; never sent to the browser)
 *   AI_MODEL      model id, e.g. deepseek-chat (optional for deepseek, required for the others)
 *   AI_BASE_URL   override the API address (optional)
 *   AI_PROVIDER   openai-compatible | anthropic (optional; set by the preset)
 *   AI_JSON_MODE  json_object (default) | none   — turn off if a provider rejects response_format
 *   AI_TIMEOUT_MS request timeout in ms (default 25000)
 *
 * To switch from DeepSeek to ASU AIR later: set AI_PRESET=asu_air, AI_MODEL=<model id from Voyager>,
 * AI_API_KEY=<AIR key>, then redeploy. No code changes.
 */

type Provider = "openai-compatible" | "anthropic";

export type AIConfig = {
  provider: Provider;
  baseUrl: string;
  model: string;
  key: string;
  jsonMode: "json_object" | "none";
  timeoutMs: number;
  label: string;
};

const PRESETS: Record<
  string,
  { provider: Provider; baseUrl: string; model: string; label: string }
> = {
  deepseek: {
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    label: "DeepSeek",
  },
  asu_air: {
    provider: "openai-compatible",
    baseUrl: "https://openai.rc.asu.edu/v1",
    model: "",
    label: "ASU AIR",
  },
  openai: {
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    label: "OpenAI",
  },
  anthropic: {
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    model: "",
    label: "Anthropic",
  },
};

const env = (k: string): string => {
  // Netlify.env is the runtime global inside Netlify Functions; fall back to process.env for local tests.
  const g = globalThis as {
    Netlify?: { env: { get(k: string): string | undefined } };
  };
  return (g.Netlify?.env.get(k) ?? process.env[k] ?? "").trim();
};

export function getConfig(): AIConfig {
  const presetName = (env("AI_PRESET") || "deepseek").toLowerCase();
  const preset = PRESETS[presetName] ?? PRESETS.deepseek;
  const provider = (env("AI_PROVIDER") as Provider) || preset.provider;
  return {
    provider: provider === "anthropic" ? "anthropic" : "openai-compatible",
    baseUrl: (env("AI_BASE_URL") || preset.baseUrl).replace(/\/+$/, ""),
    model: env("AI_MODEL") || preset.model,
    key: env("AI_API_KEY"),
    jsonMode: env("AI_JSON_MODE") === "none" ? "none" : "json_object",
    timeoutMs: Number(env("AI_TIMEOUT_MS")) || 25000,
    label: PRESETS[presetName] ? preset.label : presetName,
  };
}

export function isConfigured(c = getConfig()): boolean {
  return Boolean(c.key && c.model && c.baseUrl);
}

export class AIError extends Error {
  code: "not_configured" | "timeout" | "upstream" | "bad_json";
  status: number;
  diagnostics?: ProviderObservation;
  constructor(
    code: "not_configured" | "timeout" | "upstream" | "bad_json",
    message: string,
    status = 502,
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Accept a JSON object, optionally fenced or surrounded by prose; never repair missing content. */
export function parseJSONReply(text: string): unknown {
  if (/<think>/i.test(text) && !/<\/think>/i.test(text))
    throw new AIError(
      "bad_json",
      "AIR returned unfinished reasoning instead of a complete response. Your saved settings are safe.",
    );
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const value = JSON.parse(cleaned);
    if (value && typeof value === "object" && !Array.isArray(value))
      return value;
  } catch {
    /* Scan balanced objects below. */
  }
  const candidates: unknown[] = [];
  let start = -1,
    depth = 0,
    inString = false,
    escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (start < 0) {
      if (c !== "{") continue;
      start = i;
      depth = 1;
      inString = false;
      escaped = false;
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        candidates.push(JSON.parse(cleaned.slice(start, i + 1)));
      } catch {
        /* Invalid complete object is not repaired. */
      }
      start = -1;
    }
  }
  if (candidates.length === 1 && start < 0) return candidates[0];
  throw new AIError(
    "bad_json",
    "AIR returned an unreadable response. Your saved settings are safe. Please retry this step.",
  );
}
export type ProviderObservation = {
  model: string;
  requestedModel: string;
  finishReason: string;
  inputChars: number;
  outputChars: number;
  inputTokens?: number;
  outputTokens?: number;
  headersMs: number;
  firstTokenMs?: number;
  durationMs: number;
  rawReply: string;
  format: string;
  formatFallback: boolean;
};

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const started = Date.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const headersMs = Date.now() - started;
    let text: string, firstTokenMs: number | undefined;
    if (
      res.ok &&
      res.headers.get("content-type")?.includes("text/event-stream")
    ) {
      const reader = res.body?.getReader();
      if (!reader)
        throw new AIError("upstream", "AIR returned an empty stream.");
      const decoder = new TextDecoder();
      let pending = "",
        reply = "",
        model = "",
        finish = "stream_incomplete",
        usage: unknown;
      const consume = (frame: string) => {
        for (const line of frame.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const value = line.slice(5).trim();
          if (!value || value === "[DONE]") continue;
          let chunk: any;
          try {
            chunk = JSON.parse(value);
          } catch {
            throw new AIError(
              "upstream",
              "AIR returned an unreadable response stream.",
            );
          }
          if (chunk.error)
            throw new AIError(
              "upstream",
              "AIR could not complete the response stream.",
            );
          model = chunk.model ?? model;
          if (chunk.usage) usage = chunk.usage;
          const delta = chunk.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            if (firstTokenMs === undefined) firstTokenMs = Date.now() - started;
            reply += delta;
          }
          if (chunk.choices?.[0]?.finish_reason)
            finish = chunk.choices[0].finish_reason;
        }
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const frames = pending.split(/\r?\n\r?\n/);
          pending = frames.pop() ?? "";
          for (const frame of frames) consume(frame);
        }
        pending += decoder.decode();
        if (pending.trim()) consume(pending);
      } finally {
        reader.releaseLock();
      }
      text = JSON.stringify({
        model: model || undefined,
        usage,
        choices: [{ finish_reason: finish, message: { content: reply } }],
      });
    } else text = await res.text();
    return {
      status: res.status,
      text,
      headersMs,
      firstTokenMs,
      servedReasoningEffort:
        res.headers.get("x-obleth-reasoning-effort") ?? undefined,
    };
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new AIError(
        "timeout",
        "The AI provider took too long to answer.",
        504,
      );
    throw new AIError("upstream", "Could not reach the AI provider.");
  } finally {
    clearTimeout(timer);
  }
}

export type ChatJSONArgs = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  task?: AiTask;
  mode?: "fast" | "deep";
  responseSchema?: Record<string, unknown>;
  onResponse?: (observation: ProviderObservation) => Promise<void>;
};
export type ChatJSONResult = {
  data: unknown;
  model: string;
  provider: string;
  ms: number;
  requestedModel?: string;
  reasoningEffort?: string;
  servedReasoningEffort?: string;
  routingVersion?: string;
  inputChars?: number;
  outputChars?: number;
  inputTokens?: number;
  outputTokens?: number;
  finishReason?: string;
  headersMs?: number;
  firstTokenMs?: number;
};

/** Send one system + user message and get a parsed JSON object back. */
export async function chatJSON({
  system,
  user,
  maxTokens = 700,
  temperature = 0,
  timeoutMs,
  task,
  mode,
  responseSchema,
  onResponse,
}: ChatJSONArgs): Promise<ChatJSONResult> {
  const configured = getConfig();
  const route =
    env("AI_PRESET") === "asu_air" && env("AI_MODEL_ROUTING") !== "off"
      ? routeTask(task, mode)
      : null;
  if (route) maxTokens = Math.max(maxTokens, route.minOutputTokens);
  const c = {
    ...configured,
    model: route?.model ?? configured.model,
    timeoutMs: timeoutMs
      ? Math.max(5000, Math.min(480000, timeoutMs))
      : configured.timeoutMs,
  };
  if (!isConfigured(c))
    throw new AIError(
      "not_configured",
      "AI is not configured on the server.",
      503,
    );
  const t0 = Date.now();

  if (c.provider === "anthropic") {
    const { status, text, headersMs } = await post(
      `${c.baseUrl}/v1/messages`,
      { "x-api-key": c.key, "anthropic-version": "2023-06-01" },
      {
        model: c.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: user }],
      },
      c.timeoutMs,
    );
    if (status >= 400)
      throw new AIError(
        "upstream",
        `AI provider error ${status}.`,
        status === 429 ? 429 : 502,
      );
    const body = JSON.parse(text) as {
      content?: { type: string; text?: string }[];
      model?: string;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const reply = (body.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const observation: ProviderObservation = {
      model: body.model ?? c.model,
      requestedModel: c.model,
      finishReason: body.stop_reason ?? "unknown",
      inputChars: system.length + user.length,
      outputChars: reply.length,
      inputTokens: body.usage?.input_tokens,
      outputTokens: body.usage?.output_tokens,
      headersMs,
      durationMs: Date.now() - t0,
      rawReply: reply,
      format: "prompt",
      formatFallback: false,
    };
    await onResponse?.(observation);
    const data = parsedReply(reply, observation);
    return {
      data,
      model: observation.model,
      provider: c.label,
      ms: observation.durationMs,
      ...publicMetrics(observation),
    };
  }

  // OpenAI-compatible: DeepSeek, ASU AIR, OpenAI, and most other providers.
  const streaming =
    env("AI_PRESET") === "asu_air" && !!task?.startsWith("setup.");
  const base = {
    ...(streaming
      ? { stream: true, stream_options: { include_usage: true } }
      : {}),
    model: c.model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  const headers = { authorization: `Bearer ${c.key}` };
  // AIR's reasoning models may otherwise consume the short structured-output budget thinking.
  const effort =
    route?.reasoningEffort ??
    (env("AI_REASONING_EFFORT") ||
      (env("AI_PRESET") === "asu_air" ? "none" : ""));
  const requestBase = effort ? { ...base, reasoning_effort: effort } : base;
  const format =
    responseSchema && route
      ? {
          type: "json_schema",
          json_schema: {
            name: "organization_workflow",
            strict: true,
            schema: responseSchema,
          },
        }
      : { type: "json_object" };
  let formatFallback = false;
  let r = await post(
    `${c.baseUrl}/chat/completions`,
    headers,
    c.jsonMode === "json_object"
      ? { ...requestBase, response_format: format }
      : requestBase,
    c.timeoutMs,
  );
  if (
    r.status === 400 &&
    c.jsonMode === "json_object" &&
    /response_format|json/i.test(r.text)
  ) {
    formatFallback = true;
    r = await post(
      `${c.baseUrl}/chat/completions`,
      headers,
      format.type === "json_schema"
        ? { ...requestBase, response_format: { type: "json_object" } }
        : requestBase,
      c.timeoutMs,
    ); // bounded downgrade; never silently remove the JSON requirement
  }
  if (r.status >= 400)
    throw new AIError(
      "upstream",
      `AI provider error ${r.status}.`,
      r.status === 429 ? 429 : 502,
    );
  let body: {
    choices?: {
      finish_reason?: string;
      message?: {
        content?: string | { type: string; text?: string }[];
        refusal?: string;
      };
    }[];
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    body = JSON.parse(r.text);
  } catch {
    throw new AIError(
      "upstream",
      "AIR returned an unreadable HTTP response. Your saved settings are safe.",
    );
  }
  const content = body.choices?.[0]?.message?.content;
  const reply =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .filter((x) => x.type === "text")
            .map((x) => x.text ?? "")
            .join("")
        : "";
  const observation: ProviderObservation = {
    model: body.model ?? c.model,
    requestedModel: c.model,
    finishReason: body.choices?.[0]?.finish_reason ?? "unknown",
    inputChars: system.length + user.length,
    outputChars: reply.length,
    inputTokens: body.usage?.prompt_tokens,
    outputTokens: body.usage?.completion_tokens,
    headersMs: r.headersMs,
    firstTokenMs: r.firstTokenMs,
    durationMs: Date.now() - t0,
    rawReply: reply,
    format:
      c.jsonMode === "none"
        ? "prompt"
        : formatFallback
          ? format.type === "json_schema"
            ? "json_object"
            : "prompt"
          : format.type,
    formatFallback,
  };
  await onResponse?.(observation);
  const data = parsedReply(reply, observation);
  return {
    data,
    model: observation.model,
    provider: c.label,
    ms: observation.durationMs,
    requestedModel: c.model,
    reasoningEffort: effort || undefined,
    servedReasoningEffort: r.servedReasoningEffort,
    routingVersion: route?.version,
    ...publicMetrics(observation),
  };
}
function publicMetrics(o: ProviderObservation) {
  return {
    inputChars: o.inputChars,
    outputChars: o.outputChars,
    inputTokens: o.inputTokens,
    outputTokens: o.outputTokens,
    finishReason: o.finishReason,
    headersMs: o.headersMs,
    firstTokenMs: o.firstTokenMs,
  };
}
function parsedReply(reply: string, o: ProviderObservation) {
  try {
    if (["length", "max_tokens", "stream_incomplete"].includes(o.finishReason))
      throw new AIError(
        "bad_json",
        "AIR stopped before finishing the response (output limit). Your saved settings are safe. Please retry this step.",
      );
    if (!reply.trim())
      throw new AIError(
        "bad_json",
        "AIR returned an empty response. Your saved settings are safe. Please retry this step.",
      );
    return parseJSONReply(reply);
  } catch (e) {
    if (e instanceof AIError) e.diagnostics = o;
    throw e;
  }
}
