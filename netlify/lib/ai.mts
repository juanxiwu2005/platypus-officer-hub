import { AIR_MODELS, routeTask, type AiTask } from "../../src/organization/modelPolicy.ts";
/**
 * Provider-neutral AI adapter for Platypus.
 *
 * Every AI call in the app goes through chatJSON(). Which company answers is decided
 * only by environment variables set in Netlify (Project configuration → Environment variables):
 *
 *   AI_PRESET     asu_air (default) | deepseek | openai | anthropic   — fills in sensible defaults
 *   AI_API_KEY    the secret key (required; never sent to the browser)
 *   AI_MODEL      model id (optional for asu_air and deepseek, required for the others)
 *   AI_MODEL_ROUTING  on (default) | off — asu_air only: pick the model per task (src/organization/modelPolicy.ts)
 *   AI_BASE_URL   override the API address (optional)
 *   AI_PROVIDER   openai-compatible | anthropic (optional; set by the preset)
 *   AI_JSON_MODE  json_object (default) | none   — turn off if a provider rejects response_format
 *   AI_TIMEOUT_MS request timeout in ms (default 25000)
 *
 * Juanxi 2026-10-27: every call goes to ASU AIR, and the model is chosen per task by routing v3
 * (Gemma for long structured setup work, Muse for short chat and edits, GLM only for a requested
 * Deeper review). DeepSeek is no longer used; it stays only as an emergency fallback
 * (AI_PRESET=deepseek). See docs/AI_SETUP.md.
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
    model: AIR_MODELS.fast,
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

const activePreset = () => (env("AI_PRESET") || "asu_air").toLowerCase();
/** True when calls go to ASU AIR: the default, and the only preset that uses per-task model routing. */
export const isAirPreset = () => activePreset() === "asu_air";

export function getConfig(): AIConfig {
  const name = activePreset();
  const preset = PRESETS[name] ?? PRESETS.asu_air;
  const provider = (env("AI_PROVIDER") as Provider) || preset.provider;
  return {
    provider: provider === "anthropic" ? "anthropic" : "openai-compatible",
    baseUrl: (env("AI_BASE_URL") || preset.baseUrl).replace(/\/+$/, ""),
    model: env("AI_MODEL") || preset.model,
    key: env("AI_API_KEY"),
    jsonMode: env("AI_JSON_MODE") === "none" ? "none" : "json_object",
    timeoutMs: Number(env("AI_TIMEOUT_MS")) || 25000,
    label: PRESETS[name] ? preset.label : name,
  };
}

export function isConfigured(c = getConfig()): boolean {
  return Boolean(c.key && c.model && c.baseUrl);
}

export class AIError extends Error {
  code: "not_configured" | "timeout" | "upstream" | "bad_json" | "network";
  status: number;
  diagnostics?: ProviderObservation;
  constructor(
    code: "not_configured" | "timeout" | "upstream" | "bad_json" | "network",
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
export type ProviderFailureKind =
  | "timeout"
  | "network"
  | "stream_disconnected"
  | "stream_incomplete"
  | "stream_protocol"
  | "provider_error"
  | "http_error"
  | "http_json"
  | "output_limit"
  | "empty_response"
  | "json_syntax"
  | "unfinished_reasoning";
export type ProviderAttempt = {
  attempt: number;
  startedAfterMs: number;
  model: string;
  requestedModel: string;
  finishReason: string;
  inputChars: number;
  outputChars: number;
  inputTokens?: number;
  outputTokens?: number;
  headersMs: number;
  headersReceived: boolean;
  firstTokenMs?: number;
  durationMs: number;
  rawReply: string;
  /** The received HTTP/SSE body, including any malformed or unfinished frame. No request headers. */
  rawResponse?: string;
  httpStatus?: number;
  format: string;
  formatFallback: boolean;
  servedReasoningEffort?: string;
  outcome: "complete" | "failed";
  failureKind?: ProviderFailureKind;
  failureMessage?: string;
};
export type ProviderObservation = Omit<
  ProviderAttempt,
  "attempt" | "startedAfterMs" | "headersReceived" | "outcome"
> & {
  /** One callback per logical call; bounded format downgrades remain distinct attempts. */
  attempts?: ProviderAttempt[];
  attemptCount?: number;
};
type HttpResult = {
  status?: number;
  text: string;
  reply: string;
  model: string;
  finishReason: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  streaming: boolean;
  headersMs: number;
  headersReceived: boolean;
  firstTokenMs?: number;
  servedReasoningEffort?: string;
  failureKind?: ProviderFailureKind;
  failureMessage?: string;
};

/** Preserve bytes and content already received even if fetch/read/decoding later fails. */
async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<HttpResult> {
  const ctrl = new AbortController();
  const started = Date.now();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const result: HttpResult = {
    text: "",
    reply: "",
    model: "",
    finishReason: "unknown",
    streaming: false,
    headersMs: 0,
    headersReceived: false,
  };
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    result.status = res.status;
    result.headersReceived = true;
    result.headersMs = Date.now() - started;
    result.servedReasoningEffort =
      res.headers.get("x-obleth-reasoning-effort") ?? undefined;
    result.streaming =
      res.ok &&
      !!res.headers.get("content-type")?.includes("text/event-stream");
    if (result.streaming) result.finishReason = "stream_incomplete";
    reader = res.body?.getReader();
    if (!reader) return result;
    const decoder = new TextDecoder();
    let pending = "";
    const consume = (frame: string) => {
      const value = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();
      if (!value || value === "[DONE]") return;
      let chunk: any;
      try {
        chunk = JSON.parse(value);
      } catch {
        result.failureKind = "stream_protocol";
        throw new Error("AIR returned an unreadable response stream.");
      }
      if (chunk.error) {
        result.failureKind = "provider_error";
        throw new Error("AIR reported an error while generating the response.");
      }
      result.model = chunk.model ?? result.model;
      if (chunk.usage) result.usage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        if (result.firstTokenMs === undefined)
          result.firstTokenMs = Date.now() - started;
        result.reply += delta;
      }
      if (chunk.choices?.[0]?.finish_reason)
        result.finishReason = chunk.choices[0].finish_reason;
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const decoded = decoder.decode(value, { stream: true });
      result.text += decoded;
      if (result.streaming) {
        pending += decoded;
        const frames = pending.split(/\r?\n\r?\n/);
        pending = frames.pop() ?? "";
        for (const frame of frames) consume(frame);
      }
    }
    const tail = decoder.decode();
    result.text += tail;
    if (result.streaming && (pending + tail).trim()) consume(pending + tail);
  } catch (e) {
    result.failureKind = timedOut
      ? "timeout"
      : (result.failureKind ??
        (result.streaming ? "stream_disconnected" : "network"));
    result.failureMessage =
      result.failureKind === "timeout"
        ? "The AI provider took too long to answer. Your saved settings are safe."
        : result.failureKind === "stream_disconnected"
          ? "The connection ended while AIR was streaming the response. Your saved settings are safe."
          : result.failureKind === "network"
            ? "Could not reach or read the AI provider response. Your saved settings are safe."
            : (e as Error).message;
  } finally {
    clearTimeout(timer);
    if (result.failureKind) {
      ctrl.abort();
      await reader?.cancel().catch(() => {});
    }
    reader?.releaseLock();
  }
  return result;
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

type Usage = { inputTokens?: number; outputTokens?: number }
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined)

/**
 * One usage line per AI call, written to the function log (Netlify → Logs). Only fixed fields go in:
 * which task (AiTask, the same name the model routing uses), provider and requested/served model,
 * token counts and finish reason if the provider reported them, time to headers and in total, and
 * whether it worked. Never the key, the request, the prompt or the reply: this is a bill-and-abuse
 * record, not a transcript.
 */
export function logUsage(line: { task?: string; provider: string; model: string; requestedModel?: string; routingVersion?: string; ok: boolean; ms: number; headersMs?: number; finishReason?: string; error?: string } & Usage) {
  const safe = (v: string | undefined, max: number) => String(v ?? "").replace(/[^\w.:/ -]/g, "").slice(0, max)
  console.log(JSON.stringify({
    evt: "ai_usage", task: safe(line.task, 40) || "unknown", provider: safe(line.provider, 40), model: safe(line.model, 80),
    requestedModel: safe(line.requestedModel, 80) || null, routingVersion: safe(line.routingVersion, 40) || null,
    inputTokens: count(line.inputTokens) ?? null, outputTokens: count(line.outputTokens) ?? null, finishReason: safe(line.finishReason, 30) || null,
    headersMs: count(line.headersMs) ?? null, ms: count(line.ms) ?? null, ok: line.ok, ...(line.error ? { error: safe(line.error, 40) } : {}),
  }))
}

/** Send one system + user message and get a parsed JSON object back. Every call leaves one usage line. */
export async function chatJSON(args: ChatJSONArgs): Promise<ChatJSONResult> {
  const t0 = Date.now()
  try {
    const r = await callProvider(args)
    logUsage({ task: args.task, provider: r.provider, model: r.model, requestedModel: r.requestedModel, routingVersion: r.routingVersion, ok: true, ms: r.ms, inputTokens: r.inputTokens, outputTokens: r.outputTokens, finishReason: r.finishReason, headersMs: r.headersMs })
    return r
  } catch (e) {
    const c = getConfig(), d = e instanceof AIError ? e.diagnostics : undefined
    logUsage({ task: args.task, provider: c.label, model: d?.model ?? c.model, requestedModel: d?.requestedModel, ok: false, ms: Date.now() - t0, error: e instanceof AIError ? e.code : "error", inputTokens: d?.inputTokens, outputTokens: d?.outputTokens, finishReason: d?.finishReason, headersMs: d?.headersMs })
    throw e
  }
}

async function callProvider({
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
    isAirPreset() && env("AI_MODEL_ROUTING") !== "off"
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
  const attempts: ProviderAttempt[] = [];
  const inputChars = system.length + user.length;
  const streaming =
    c.provider !== "anthropic" &&
    isAirPreset() &&
    !!task?.startsWith("setup.");
  const effort =
    route?.reasoningEffort ??
    (env("AI_REASONING_EFFORT") ||
      (isAirPreset() ? "none" : ""));
  const base =
    c.provider === "anthropic"
      ? {
          model: c.model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: user }],
        }
      : {
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
          ...(effort ? { reasoning_effort: effort } : {}),
        };
  const initialFormat =
    c.provider === "anthropic" || c.jsonMode === "none"
      ? "prompt"
      : responseSchema && route
        ? "json_schema"
        : "json_object";
  let format = initialFormat;
  let observation: ProviderObservation | undefined;
  let failure: AIError | undefined;
  let data: unknown;
  let servedReasoningEffort: string | undefined;
  for (let number = 1; number <= 2; number++) {
    const attemptStart = Date.now();
    const request =
      format === "prompt"
        ? base
        : {
            ...base,
            response_format:
              format === "json_schema"
                ? {
                    type: "json_schema",
                    json_schema: {
                      name: "organization_workflow",
                      strict: true,
                      schema: responseSchema,
                    },
                  }
                : { type: "json_object" },
          };
    const r = await post(
      c.provider === "anthropic"
        ? `${c.baseUrl}/v1/messages`
        : `${c.baseUrl}/chat/completions`,
      c.provider === "anthropic"
        ? { "x-api-key": c.key, "anthropic-version": "2023-06-01" }
        : { authorization: `Bearer ${c.key}` },
      request,
      c.timeoutMs,
    );
    servedReasoningEffort = r.servedReasoningEffort;
    const attempt: ProviderAttempt = {
      attempt: number,
      startedAfterMs: attemptStart - t0,
      model: r.model || c.model,
      requestedModel: c.model,
      finishReason: r.finishReason,
      inputChars,
      outputChars: (r.streaming ? r.reply : r.failureKind ? r.text : "").length,
      headersMs: r.headersMs,
      headersReceived: r.headersReceived,
      firstTokenMs: r.firstTokenMs,
      durationMs: Date.now() - attemptStart,
      rawReply: r.streaming ? r.reply : r.failureKind ? r.text : "",
      rawResponse: r.text,
      httpStatus: r.status,
      format,
      formatFallback: number > 1,
      servedReasoningEffort,
      outcome: "complete",
      inputTokens: r.usage?.prompt_tokens,
      outputTokens: r.usage?.completion_tokens,
    };
    attempts.push(attempt);
    failure = undefined;
    try {
      if (r.failureKind) {
        attempt.failureKind = r.failureKind;
        throw new AIError(
          r.failureKind === "timeout"
            ? "timeout"
            : ["network", "stream_disconnected"].includes(r.failureKind)
              ? "network"
              : "upstream",
          r.failureMessage!,
          r.failureKind === "timeout" ? 504 : 502,
        );
      }
      if ((r.status ?? 0) >= 400) {
        attempt.failureKind = "http_error";
        throw new AIError(
          "upstream",
          `AI provider error ${r.status}.`,
          r.status === 429 ? 429 : 502,
        );
      }
      if (!r.streaming) {
        let body: any;
        try {
          body = JSON.parse(r.text);
        } catch {
          attempt.failureKind = "http_json";
          attempt.rawReply = r.text;
          attempt.outputChars = r.text.length;
          throw new AIError(
            "upstream",
            "AIR returned an unreadable HTTP response. Your saved settings are safe.",
          );
        }
        if (body?.error) {
          attempt.failureKind = "provider_error";
          attempt.rawReply = r.text;
          attempt.outputChars = r.text.length;
          throw new AIError(
            "upstream",
            "The AI provider reported an error. Your saved settings are safe.",
          );
        }
        const content =
          c.provider === "anthropic"
            ? body?.content
            : body?.choices?.[0]?.message?.content;
        attempt.rawReply =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                  .filter((x: any) => x?.type === "text")
                  .map((x: any) => x.text ?? "")
                  .join("")
              : "";
        attempt.outputChars = attempt.rawReply.length;
        attempt.model = body?.model ?? c.model;
        attempt.finishReason =
          c.provider === "anthropic"
            ? (body?.stop_reason ?? "unknown")
            : (body?.choices?.[0]?.finish_reason ?? "unknown");
        attempt.inputTokens =
          c.provider === "anthropic"
            ? body?.usage?.input_tokens
            : body?.usage?.prompt_tokens;
        attempt.outputTokens =
          c.provider === "anthropic"
            ? body?.usage?.output_tokens
            : body?.usage?.completion_tokens;
      }
      checkCompletion(attempt.rawReply, attempt);
    } catch (e) {
      failure =
        e instanceof AIError
          ? e
          : new AIError(
              "bad_json",
              "AI returned an unreadable response. Your saved settings are safe.",
            );
      attempt.outcome = "failed";
      attempt.failureKind ??= "json_syntax";
      attempt.failureMessage = failure.message;
    }
    // Only an explicit format rejection permits one transport retry. Never regenerate malformed output.
    const rejectedFormat =
      r.status === 400 &&
      number === 1 &&
      initialFormat !== "prompt" &&
      /response_format|json_schema/i.test(r.text) &&
      /not supported|unsupported|not available|not implemented|unrecognized|unknown parameter|not allowed|does not support/i.test(
        r.text,
      );
    if (failure && rejectedFormat) {
      format = initialFormat === "json_schema" ? "json_object" : "prompt";
      continue;
    }
    observation = {
      ...attempt,
      durationMs: Date.now() - t0,
      attempts,
      attemptCount: attempts.length,
    };
    if (failure) failure.diagnostics = observation;
    // Archive transport bytes once before interpreting the model's JSON. Subsequent syntax/schema
    // rejection is a separate event with these same attempt diagnostics, never a second generation.
    await onResponse?.(observation);
    if (failure) throw failure;
    try {
      data = parsedReply(attempt.rawReply, attempt);
    } catch (e) {
      const error =
        e instanceof AIError
          ? e
          : new AIError(
              "bad_json",
              "AI returned an unreadable response. Your saved settings are safe.",
            );
      attempt.outcome = "failed";
      attempt.failureMessage = error.message;
      Object.assign(observation, {
        ...attempt,
        durationMs: observation.durationMs,
      });
      error.diagnostics = observation;
      throw error;
    }
    return {
      data,
      model: observation.model,
      provider: c.label,
      ms: observation.durationMs,
      requestedModel: c.model,
      reasoningEffort: effort || undefined,
      servedReasoningEffort,
      routingVersion: route?.version,
      ...publicMetrics(observation),
    };
  }
  throw new Error("Unreachable AI attempt state.");
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
function checkCompletion(reply: string, o: ProviderAttempt) {
  if (["length", "max_tokens"].includes(o.finishReason)) {
    o.failureKind = "output_limit";
    throw new AIError(
      "bad_json",
      "AIR stopped before finishing the response (output limit). Your saved settings are safe. Please retry this step.",
    );
  }
  if (o.finishReason === "stream_incomplete") {
    o.failureKind = "stream_incomplete";
    throw new AIError(
      "bad_json",
      "AIR's stream ended without a finish event. This does not establish an output limit. Your saved settings are safe.",
    );
  }
  if (!reply.trim()) {
    o.failureKind = "empty_response";
    throw new AIError(
      "bad_json",
      "AIR returned an empty response. Your saved settings are safe. Please retry this step.",
    );
  }
}
function parsedReply(reply: string, o: ProviderAttempt) {
  try {
    return parseJSONReply(reply);
  } catch (e) {
    o.failureKind =
      /<think>/i.test(reply) && !/<\/think>/i.test(reply)
        ? "unfinished_reasoning"
        : "json_syntax";
    throw e;
  }
}
