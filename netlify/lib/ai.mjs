import { AIR_MODELS, routeTask } from "../../src/organization/modelPolicy.ts";
const PRESETS = {
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
const env = (k) => {
    // Netlify.env is the runtime global inside Netlify Functions; fall back to process.env for local tests.
    const g = globalThis;
    return (g.Netlify?.env.get(k) ?? process.env[k] ?? "").trim();
};
const activePreset = () => (env("AI_PRESET") || "asu_air").toLowerCase();
/** True when calls go to ASU AIR: the default, and the only preset that uses per-task model routing. */
export const isAirPreset = () => activePreset() === "asu_air";
/** Providers that used to be here and are now refused outright, with or without a base URL. */
const REMOVED_PRESETS = ["deepseek"];
export function getConfig() {
    const name = activePreset();
    const preset = PRESETS[name] ?? PRESETS.asu_air;
    // Fail closed: an unknown preset (or a removed one such as deepseek) keeps its name as the label but gets no key,
    // so the app answers with its built-in fallback and never sends a leftover key to a provider it was not meant for.
    // The one exception is an unknown name with an explicit AI_BASE_URL, which says where the calls should go.
    const refused = REMOVED_PRESETS.includes(name) || (!PRESETS[name] && !env("AI_BASE_URL"));
    const provider = env("AI_PROVIDER") || preset.provider;
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
export function isConfigured(c = getConfig()) {
    return Boolean(c.key && c.model && c.baseUrl);
}
export class AIError extends Error {
    constructor(code, message, status = 502) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
/** Accept a JSON object, optionally fenced or surrounded by prose; never repair missing content. */
export function parseJSONReply(text) {
    if (/<think>/i.test(text) && !/<\/think>/i.test(text))
        throw new AIError("bad_json", "AIR returned unfinished reasoning instead of a complete response. Your saved settings are safe.");
    const cleaned = text
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/^\s*```(?:json)?/i, "")
        .replace(/```\s*$/, "")
        .trim();
    try {
        const value = JSON.parse(cleaned);
        if (value && typeof value === "object" && !Array.isArray(value))
            return value;
    }
    catch {
        /* Scan balanced objects below. */
    }
    const candidates = [];
    let start = -1, depth = 0, inString = false, escaped = false;
    for (let i = 0; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (start < 0) {
            if (c !== "{")
                continue;
            start = i;
            depth = 1;
            inString = false;
            escaped = false;
            continue;
        }
        if (inString) {
            if (escaped)
                escaped = false;
            else if (c === "\\")
                escaped = true;
            else if (c === '"')
                inString = false;
            continue;
        }
        if (c === '"')
            inString = true;
        else if (c === "{")
            depth++;
        else if (c === "}" && --depth === 0) {
            try {
                candidates.push(JSON.parse(cleaned.slice(start, i + 1)));
            }
            catch {
                /* Invalid complete object is not repaired. */
            }
            start = -1;
        }
    }
    if (candidates.length === 1 && start < 0)
        return candidates[0];
    throw new AIError("bad_json", "AIR returned an unreadable response. Your saved settings are safe. Please retry this step.");
}
/** Preserve bytes and content already received even if fetch/read/decoding later fails. */
async function post(url, headers, body, timeoutMs) {
    const ctrl = new AbortController();
    const started = Date.now();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        ctrl.abort();
    }, timeoutMs);
    const result = {
        text: "",
        reply: "",
        model: "",
        finishReason: "unknown",
        streaming: false,
        headersMs: 0,
        headersReceived: false,
    };
    let reader;
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
        if (result.streaming)
            result.finishReason = "stream_incomplete";
        reader = res.body?.getReader();
        if (!reader)
            return result;
        const decoder = new TextDecoder();
        let pending = "";
        const consume = (frame) => {
            const value = frame
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart())
                .join("\n")
                .trim();
            if (!value || value === "[DONE]")
                return;
            let chunk;
            try {
                chunk = JSON.parse(value);
            }
            catch {
                result.failureKind = "stream_protocol";
                throw new Error("AIR returned an unreadable response stream.");
            }
            if (chunk.error) {
                result.failureKind = "provider_error";
                throw new Error("AIR reported an error while generating the response.");
            }
            result.model = chunk.model ?? result.model;
            if (chunk.usage)
                result.usage = chunk.usage;
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
            if (done)
                break;
            const decoded = decoder.decode(value, { stream: true });
            result.text += decoded;
            if (result.streaming) {
                pending += decoded;
                const frames = pending.split(/\r?\n\r?\n/);
                pending = frames.pop() ?? "";
                for (const frame of frames)
                    consume(frame);
            }
        }
        const tail = decoder.decode();
        result.text += tail;
        if (result.streaming && (pending + tail).trim())
            consume(pending + tail);
    }
    catch (e) {
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
                        : e.message;
    }
    finally {
        clearTimeout(timer);
        if (result.failureKind) {
            ctrl.abort();
            await reader?.cancel().catch(() => { });
        }
        reader?.releaseLock();
    }
    return result;
}
const count = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined);
/**
 * One usage line per AI call, written to the function log (Netlify → Logs). Only fixed fields go in:
 * which task (AiTask, the same name the model routing uses), provider and requested/served model,
 * token counts and finish reason if the provider reported them, time to headers and in total, and
 * whether it worked. Never the key, the request, the prompt or the reply: this is a bill-and-abuse
 * record, not a transcript.
 */
export function logUsage(line) {
    const safe = (v, max) => String(v ?? "").replace(/[^\w.:/ -]/g, "").slice(0, max);
    console.log(JSON.stringify({
        evt: "ai_usage", task: safe(line.task, 40) || "unknown", provider: safe(line.provider, 40), model: safe(line.model, 80),
        requestedModel: safe(line.requestedModel, 80) || null, routingVersion: safe(line.routingVersion, 40) || null,
        inputTokens: count(line.inputTokens) ?? null, outputTokens: count(line.outputTokens) ?? null, finishReason: safe(line.finishReason, 30) || null,
        headersMs: count(line.headersMs) ?? null, ms: count(line.ms) ?? null, ok: line.ok, ...(line.error ? { error: safe(line.error, 40) } : {}),
    }));
}
/** Send one system + user message and get a parsed JSON object back. Every call leaves one usage line. */
export async function chatJSON(args) {
    const t0 = Date.now();
    try {
        const r = await callProvider(args);
        logUsage({ task: args.task, provider: r.provider, model: r.model, requestedModel: r.requestedModel, routingVersion: r.routingVersion, ok: true, ms: r.ms, inputTokens: r.inputTokens, outputTokens: r.outputTokens, finishReason: r.finishReason, headersMs: r.headersMs });
        return r;
    }
    catch (e) {
        const c = getConfig(), d = e instanceof AIError ? e.diagnostics : undefined;
        logUsage({ task: args.task, provider: c.label, model: d?.model ?? c.model, requestedModel: d?.requestedModel, ok: false, ms: Date.now() - t0, error: e instanceof AIError ? e.code : "error", inputTokens: d?.inputTokens, outputTokens: d?.outputTokens, finishReason: d?.finishReason, headersMs: d?.headersMs });
        throw e;
    }
}
async function callProvider({ system, user, maxTokens = 700, temperature = 0, timeoutMs, task, mode, responseSchema, onResponse, }) {
    const configured = getConfig();
    const route = isAirPreset() && env("AI_MODEL_ROUTING") !== "off"
        ? routeTask(task, mode)
        : null;
    if (route)
        maxTokens = Math.max(maxTokens, route.minOutputTokens);
    const c = {
        ...configured,
        model: route?.model ?? configured.model,
        timeoutMs: timeoutMs
            ? Math.max(5000, Math.min(480000, timeoutMs))
            : configured.timeoutMs,
    };
    if (!isConfigured(c))
        throw new AIError("not_configured", "AI is not configured on the server.", 503);
    const t0 = Date.now();
    const attempts = [];
    const inputChars = system.length + user.length;
    const streaming = c.provider !== "anthropic" &&
        isAirPreset() &&
        !!task?.startsWith("setup.");
    const effort = route?.reasoningEffort ??
        (env("AI_REASONING_EFFORT") ||
            (isAirPreset() ? "none" : ""));
    const base = c.provider === "anthropic"
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
    const initialFormat = c.provider === "anthropic" || c.jsonMode === "none"
        ? "prompt"
        : responseSchema && route
            ? "json_schema"
            : "json_object";
    let format = initialFormat;
    let observation;
    let failure;
    let data;
    let servedReasoningEffort;
    for (let number = 1; number <= 2; number++) {
        const attemptStart = Date.now();
        const request = format === "prompt"
            ? base
            : {
                ...base,
                response_format: format === "json_schema"
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
        const r = await post(c.provider === "anthropic"
            ? `${c.baseUrl}/v1/messages`
            : `${c.baseUrl}/chat/completions`, c.provider === "anthropic"
            ? { "x-api-key": c.key, "anthropic-version": "2023-06-01" }
            : { authorization: `Bearer ${c.key}` }, request, c.timeoutMs);
        servedReasoningEffort = r.servedReasoningEffort;
        const attempt = {
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
                throw new AIError(r.failureKind === "timeout"
                    ? "timeout"
                    : ["network", "stream_disconnected"].includes(r.failureKind)
                        ? "network"
                        : "upstream", r.failureMessage, r.failureKind === "timeout" ? 504 : 502);
            }
            if ((r.status ?? 0) >= 400) {
                attempt.failureKind = "http_error";
                throw new AIError("upstream", `AI provider error ${r.status}.`, r.status === 429 ? 429 : 502);
            }
            if (!r.streaming) {
                let body;
                try {
                    body = JSON.parse(r.text);
                }
                catch {
                    attempt.failureKind = "http_json";
                    attempt.rawReply = r.text;
                    attempt.outputChars = r.text.length;
                    throw new AIError("upstream", "AIR returned an unreadable HTTP response. Your saved settings are safe.");
                }
                if (body?.error) {
                    attempt.failureKind = "provider_error";
                    attempt.rawReply = r.text;
                    attempt.outputChars = r.text.length;
                    throw new AIError("upstream", "The AI provider reported an error. Your saved settings are safe.");
                }
                const content = c.provider === "anthropic"
                    ? body?.content
                    : body?.choices?.[0]?.message?.content;
                attempt.rawReply =
                    typeof content === "string"
                        ? content
                        : Array.isArray(content)
                            ? content
                                .filter((x) => x?.type === "text")
                                .map((x) => x.text ?? "")
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
        }
        catch (e) {
            failure =
                e instanceof AIError
                    ? e
                    : new AIError("bad_json", "AI returned an unreadable response. Your saved settings are safe.");
            attempt.outcome = "failed";
            attempt.failureKind ?? (attempt.failureKind = "json_syntax");
            attempt.failureMessage = failure.message;
        }
        // Only an explicit format rejection permits one transport retry. Never regenerate malformed output.
        const rejectedFormat = r.status === 400 &&
            number === 1 &&
            initialFormat !== "prompt" &&
            /response_format|json_schema/i.test(r.text) &&
            /not supported|unsupported|not available|not implemented|unrecognized|unknown parameter|not allowed|does not support/i.test(r.text);
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
        if (failure)
            failure.diagnostics = observation;
        // Archive transport bytes once before interpreting the model's JSON. Subsequent syntax/schema
        // rejection is a separate event with these same attempt diagnostics, never a second generation.
        await onResponse?.(observation);
        if (failure)
            throw failure;
        try {
            data = parsedReply(attempt.rawReply, attempt);
        }
        catch (e) {
            const error = e instanceof AIError
                ? e
                : new AIError("bad_json", "AI returned an unreadable response. Your saved settings are safe.");
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
function publicMetrics(o) {
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
function checkCompletion(reply, o) {
    if (["length", "max_tokens"].includes(o.finishReason)) {
        o.failureKind = "output_limit";
        throw new AIError("bad_json", "AIR stopped before finishing the response (output limit). Your saved settings are safe. Please retry this step.");
    }
    if (o.finishReason === "stream_incomplete") {
        o.failureKind = "stream_incomplete";
        throw new AIError("bad_json", "AIR's stream ended without a finish event. This does not establish an output limit. Your saved settings are safe.");
    }
    if (!reply.trim()) {
        o.failureKind = "empty_response";
        throw new AIError("bad_json", "AIR returned an empty response. Your saved settings are safe. Please retry this step.");
    }
}
function parsedReply(reply, o) {
    try {
        return parseJSONReply(reply);
    }
    catch (e) {
        o.failureKind =
            /<think>/i.test(reply) && !/<\/think>/i.test(reply)
                ? "unfinished_reasoning"
                : "json_syntax";
        throw e;
    }
}
