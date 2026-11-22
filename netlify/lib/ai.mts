import { AIR_MODELS, routeTask, type AiTask } from "../../src/organization/modelPolicy.ts";
/**
 * Provider-neutral AI adapter for Platypus.
 * Keep server configuration notes in English; never record credentials in repository documentation.
 *
 * Every AI call in the app goes through chatJSON(). Which company answers is decided
 * only by environment variables set in Netlify (Project configuration → Environment variables):
 *
 *   AI_PRESET     asu_air (default) | openai | anthropic   — fills in sensible defaults
 *   AI_API_KEY    the secret key (required; never sent to the browser)
 *   AI_MODEL      model id (optional for asu_air, required for the others)
 *   AI_MODEL_ROUTING  on (default) | off — asu_air only: pick the model per task (src/organization/modelPolicy.ts)
 *   AI_BASE_URL   override the API address (optional)
 *   AI_PROVIDER   openai-compatible | anthropic (optional; set by the preset)
 *   AI_JSON_MODE  json_object (default) | none   — turn off if a provider rejects response_format
 *   AI_TIMEOUT_MS time budget in ms for a call that sets none itself (default 25000). Every synchronous
 *                 /api/* function sets its own, at most syncAiBudgetMs() (below), so this cannot push them past Netlify's limit.
 *   AI_SYNC_BUDGET_MS  time budget in ms for every synchronous /api/* AI call (default 26000, kept within 10000–55000).
 *   AI_MIN_OUTPUT_TOKENS  asu_air only: the smallest output allowance a call is sent with (default 1024, kept within 256–4096).
 *
 * Juanxi 2026-10-27: every call goes to ASU AIR, and the model is chosen per task by routing v3
 * (Gemma for long structured setup work, Muse for short chat and edits, GLM only for a requested
 * Deeper review). DeepSeek has been removed: AI_PRESET=deepseek is refused (see getConfig), so an
 * old DeepSeek key left in the environment can never be sent anywhere. See docs/AI_SETUP.md.
 */

/**
 * Time budget for an AI call inside an ordinary (synchronous) /api/* function, in ms, counting every attempt.
 * Netlify cuts a synchronous function off at about 30 s and the browser then gets an empty 502/504 with no
 * `ai_usage` line (production log 2026-11-07: /api/chat 504 after 31.2 s, then 502 after 30.3 s). Stopping
 * here leaves room for a cold start and the rest of the function, so the person gets a clean JSON error
 * and the browser's own fallback instead. Background functions (15 minutes) pass their own longer budget.
 *
 * FB-1 (2026-11-15): the default is 26 s, still inside the ~30 s observed in production. Netlify's documentation now says
 * 60 s for synchronous functions; the two disagree, so the real limit is measured once with /api/limit-probe
 * (docs/AI_SETUP.md) and the budget is then raised with AI_SYNC_BUDGET_MS, without a code change. /api/health reports it,
 * and the browser waits this long plus 4 s (src/lib/api.ts).
 */
export const SYNC_AI_BUDGET_DEFAULT_MS = 26_000;
export function syncAiBudgetMs(): number {
  const v = Number(env("AI_SYNC_BUDGET_MS"));
  return Number.isFinite(v) && v > 0
    ? Math.round(Math.max(10_000, Math.min(55_000, v)))
    : SYNC_AI_BUDGET_DEFAULT_MS;
}

/**
 * The smallest output allowance ("max_tokens") a call to ASU AIR is sent with. Production 2026-11-12: /api/nudge/draft
 * asked for 120 tokens and came back cut off ("length") in about 4 s, twice, so the reminder's AI line failed every
 * time. The allowance is the most the model may use, not how much it should write: each endpoint still checks the
 * length of what comes back (the reminder line stays at most 10 words). Override with AI_MIN_OUTPUT_TOKENS (256–4096).
 */
export const AIR_MIN_OUTPUT_TOKENS = 1024;
/** A reply cut off at the output limit is asked for once more with twice the allowance, never more than this. */
export const MAX_RETRY_OUTPUT_TOKENS = 4096;
/** That second request is only sent when at least this much of the call's time budget is left. */
export const OUTPUT_RETRY_MIN_MS = 5_000;

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

/** AIR_MIN_OUTPUT_TOKENS, or the AI_MIN_OUTPUT_TOKENS override kept within 256–4096. Anything unreadable means the default. */
export function airMinOutputTokens(): number {
  const v = Number(env("AI_MIN_OUTPUT_TOKENS"));
  return Number.isFinite(v) && v > 0
    ? Math.round(Math.max(256, Math.min(MAX_RETRY_OUTPUT_TOKENS, v)))
    : AIR_MIN_OUTPUT_TOKENS;
}

/** Providers that used to be here and are now refused outright, with or without a base URL. */
const REMOVED_PRESETS = ["deepseek"];

export function getConfig(): AIConfig {
  const name = activePreset();
  const preset = PRESETS[name] ?? PRESETS.asu_air;
  // Fail closed: an unknown preset (or a removed one such as deepseek) keeps its name as the label but gets no key,
  // so the app answers with its built-in fallback and never sends a leftover key to a provider it was not meant for.
  // The one exception is an unknown name with an explicit AI_BASE_URL, which says where the calls should go.
  const refused = REMOVED_PRESETS.includes(name) || (!PRESETS[name] && !env("AI_BASE_URL"));
  const provider = (env("AI_PROVIDER") as Provider) || preset.provider;
  return {
    provider: provider === "anthropic" ? "anthropic" : "openai-compatible",
    baseUrl: (env("AI_BASE_URL") || preset.baseUrl).replace(/\/+$/, ""),
    model: env("AI_MODEL") || preset.model,
    key: refused ? "" : env("AI_API_KEY"),
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
  /** Output tokens the provider says went to reasoning (usage.completion_tokens_details.reasoning_tokens), if it says. */
  reasoningTokens?: number;
  /** The output allowance ("max_tokens") this attempt was sent with. */
  maxTokens?: number;
  /** Set on a second attempt that was sent because the first reply was cut off at the output limit. */
  retry?: "output_limit";
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
  /** One callback per logical call; a format downgrade or an output-limit retry remains a distinct attempt (two at most). */
  attempts?: ProviderAttempt[];
  attemptCount?: number;
};
type ProviderUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
};
type HttpResult = {
  status?: number;
  text: string;
  reply: string;
  model: string;
  finishReason: string;
  usage?: ProviderUsage;
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
  /**
   * Called only when the reply stopped at the output limit (finish reason "length"). It may return what can safely
   * be kept from the cut-off text (for example only the complete list items); returning null or undefined keeps
   * the normal "output limit" error. Without it a cut-off reply is always an error.
   */
  salvageTruncated?: (reply: string) => unknown;
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
  /** True when the reply hit the output limit and `salvageTruncated` kept part of it. */
  truncated?: boolean;
  /** The output allowance of the request that produced this reply (after the AIR minimum and any retry). */
  maxTokens?: number;
  reasoningTokens?: number;
  /** "output_limit": the first reply was cut off, and this one came from the single retry with twice the allowance. */
  retry?: "output_limit";
};

type Usage = { inputTokens?: number; outputTokens?: number; reasoningTokens?: number; maxTokens?: number; retry?: "output_limit" }
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined)

/**
 * One usage line per AI call, written to the function log (Netlify → Logs). Only fixed fields go in:
 * which task (AiTask, the same name the model routing uses), provider and requested/served model,
 * token counts and finish reason if the provider reported them, time to headers and in total, and
 * whether it worked. Never the key, the request, the prompt or the reply: this is a bill-and-abuse
 * record, not a transcript.
 * FB-1: `maxTokens` is the output allowance the (last) request was sent with; `reasoningTokens` appears only when the
 * provider reports it, and shows whether the allowance went on thinking; `retry: "output_limit"` appears only when a
 * cut-off reply was asked for a second time. Numbers and one fixed word, nothing else.
 */
export function logUsage(line: { task?: string; provider: string; model: string; requestedModel?: string; routingVersion?: string; ok: boolean; ms: number; headersMs?: number; finishReason?: string; error?: string } & Usage) {
  const safe = (v: string | undefined, max: number) => String(v ?? "").replace(/[^\w.:/ -]/g, "").slice(0, max)
  console.log(JSON.stringify({
    evt: "ai_usage", task: safe(line.task, 40) || "unknown", provider: safe(line.provider, 40), model: safe(line.model, 80),
    requestedModel: safe(line.requestedModel, 80) || null, routingVersion: safe(line.routingVersion, 40) || null,
    inputTokens: count(line.inputTokens) ?? null, outputTokens: count(line.outputTokens) ?? null, finishReason: safe(line.finishReason, 30) || null,
    headersMs: count(line.headersMs) ?? null, ms: count(line.ms) ?? null, ok: line.ok, ...(line.error ? { error: safe(line.error, 40) } : {}),
    maxTokens: count(line.maxTokens) ?? null,
    ...(count(line.reasoningTokens) !== undefined ? { reasoningTokens: count(line.reasoningTokens) } : {}),
    ...(line.retry === "output_limit" ? { retry: "output_limit" } : {}),
  }))
}

/** Send one system + user message and get a parsed JSON object back. Every call leaves one usage line. */
export async function chatJSON(args: ChatJSONArgs): Promise<ChatJSONResult> {
  const t0 = Date.now()
  try {
    const r = await callProvider(args)
    logUsage({ task: args.task, provider: r.provider, model: r.model, requestedModel: r.requestedModel, routingVersion: r.routingVersion, ok: true, ms: r.ms, inputTokens: r.inputTokens, outputTokens: r.outputTokens, finishReason: r.finishReason, headersMs: r.headersMs, maxTokens: r.maxTokens, reasoningTokens: r.reasoningTokens, retry: r.retry })
    return r
  } catch (e) {
    const c = getConfig(), d = e instanceof AIError ? e.diagnostics : undefined
    logUsage({ task: args.task, provider: c.label, model: d?.model ?? c.model, requestedModel: d?.requestedModel, ok: false, ms: Date.now() - t0, error: e instanceof AIError ? e.code : "error", inputTokens: d?.inputTokens, outputTokens: d?.outputTokens, finishReason: d?.finishReason, headersMs: d?.headersMs, maxTokens: d?.maxTokens, reasoningTokens: d?.reasoningTokens, retry: d?.retry })
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
  salvageTruncated,
}: ChatJSONArgs): Promise<ChatJSONResult> {
  const configured = getConfig();
  const route =
    isAirPreset() && env("AI_MODEL_ROUTING") !== "off"
      ? routeTask(task, mode)
      : null;
  if (route) maxTokens = Math.max(maxTokens, route.minOutputTokens);
  // ASU AIR can spend part of the allowance before the first visible word, so a small one ends in a cut-off reply.
  if (isAirPreset()) maxTokens = Math.max(maxTokens, airMinOutputTokens());
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
  // c.timeoutMs is the budget for the whole call: a second attempt (format fallback, or the output-limit retry) gets
  // only what is left, at least one second, so a call ends within its budget plus one second.
  const deadline = t0 + c.timeoutMs;
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
  let salvaged: { value: unknown } | undefined;
  // The output allowance of the next request; doubled once if the first reply is cut off (see the retry below).
  let allowance = maxTokens;
  let retry: "output_limit" | undefined;
  // At most two provider requests per logical call: the format fallback and the output-limit retry share that allowance.
  for (let number = 1; number <= 2; number++) {
    const attemptStart = Date.now();
    const attemptTimeout =
      number === 1
        ? c.timeoutMs
        : Math.max(Math.min(c.timeoutMs, 1000), deadline - attemptStart);
    const sized = { ...base, max_tokens: allowance };
    const request =
      format === "prompt"
        ? sized
        : {
            ...sized,
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
      attemptTimeout,
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
      formatFallback: number > 1 && !retry,
      servedReasoningEffort,
      outcome: "complete",
      inputTokens: r.usage?.prompt_tokens,
      outputTokens: r.usage?.completion_tokens,
      reasoningTokens: r.usage?.completion_tokens_details?.reasoning_tokens,
      maxTokens: allowance,
      ...(retry ? { retry } : {}),
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
        attempt.reasoningTokens =
          body?.usage?.completion_tokens_details?.reasoning_tokens;
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
    // A reply cut off at the output limit: the caller may keep its complete parts (never regenerate or invent).
    if (failure && attempt.failureKind === "output_limit" && salvageTruncated) {
      let kept: unknown;
      try {
        kept = salvageTruncated(attempt.rawReply);
      } catch {
        kept = undefined;
      }
      if (kept !== undefined && kept !== null) {
        salvaged = { value: kept };
        failure = undefined;
        attempt.outcome = "complete";
      }
    }
    // FB-1 (Juanxi 2026-11-14, an approved exception to "never repeat a paid request automatically"): a reply cut off
    // at the output limit, with nothing the caller could keep, is asked for once more with twice the allowance. Only
    // after the first attempt, only if the allowance can still grow, and only with enough of the time budget left.
    const bigger = Math.min(MAX_RETRY_OUTPUT_TOKENS, allowance * 2);
    if (
      failure &&
      attempt.failureKind === "output_limit" &&
      number === 1 &&
      bigger > allowance &&
      deadline - Date.now() >= OUTPUT_RETRY_MIN_MS
    ) {
      allowance = bigger;
      retry = "output_limit";
      continue;
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
      data = salvaged ? salvaged.value : parsedReply(attempt.rawReply, attempt);
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
      ...(salvaged ? { truncated: true } : {}),
      maxTokens: observation.maxTokens,
      ...(count(observation.reasoningTokens) !== undefined
        ? { reasoningTokens: count(observation.reasoningTokens) }
        : {}),
      ...(observation.retry ? { retry: observation.retry } : {}),
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
