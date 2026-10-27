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

type Provider = "openai-compatible" | "anthropic"

export type AIConfig = {
  provider: Provider
  baseUrl: string
  model: string
  key: string
  jsonMode: "json_object" | "none"
  timeoutMs: number
  label: string
}

const PRESETS: Record<string, { provider: Provider; baseUrl: string; model: string; label: string }> = {
  deepseek: { provider: "openai-compatible", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", label: "DeepSeek" },
  asu_air: { provider: "openai-compatible", baseUrl: "https://openai.rc.asu.edu/v1", model: "", label: "ASU AIR" },
  openai: { provider: "openai-compatible", baseUrl: "https://api.openai.com/v1", model: "", label: "OpenAI" },
  anthropic: { provider: "anthropic", baseUrl: "https://api.anthropic.com", model: "", label: "Anthropic" },
}

const env = (k: string): string => {
  // Netlify.env is the runtime global inside Netlify Functions; fall back to process.env for local tests.
  const g = globalThis as { Netlify?: { env: { get(k: string): string | undefined } } }
  return (g.Netlify?.env.get(k) ?? process.env[k] ?? "").trim()
}

export function getConfig(): AIConfig {
  const presetName = (env("AI_PRESET") || "deepseek").toLowerCase()
  const preset = PRESETS[presetName] ?? PRESETS.deepseek
  const provider = (env("AI_PROVIDER") as Provider) || preset.provider
  return {
    provider: provider === "anthropic" ? "anthropic" : "openai-compatible",
    baseUrl: (env("AI_BASE_URL") || preset.baseUrl).replace(/\/+$/, ""),
    model: env("AI_MODEL") || preset.model,
    key: env("AI_API_KEY"),
    jsonMode: env("AI_JSON_MODE") === "none" ? "none" : "json_object",
    timeoutMs: Number(env("AI_TIMEOUT_MS")) || 25000,
    label: PRESETS[presetName] ? preset.label : presetName,
  }
}

export function isConfigured(c = getConfig()): boolean {
  return Boolean(c.key && c.model && c.baseUrl)
}

export class AIError extends Error {
  code: "not_configured" | "timeout" | "upstream" | "bad_json"
  status: number
  constructor(code: "not_configured" | "timeout" | "upstream" | "bad_json", message: string, status = 502) {
    super(message)
    this.code = code
    this.status = status
  }
}

/** Pull the first JSON object out of a model reply (tolerates ```json fences and stray text). */
export function parseJSONReply(text: string): unknown {
  const cleaned = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { /* fall through */ }
    }
    throw new AIError("bad_json", "The model did not return valid JSON.")
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal })
    const text = await res.text()
    return { status: res.status, text }
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new AIError("timeout", "The AI provider took too long to answer.", 504)
    throw new AIError("upstream", "Could not reach the AI provider.")
  } finally {
    clearTimeout(timer)
  }
}

export type ChatJSONArgs = { system: string; user: string; maxTokens?: number; temperature?: number; endpoint?: string }
export type ChatJSONResult = { data: unknown; model: string; provider: string; ms: number }

type Usage = { inputTokens?: number; outputTokens?: number }
const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined)

/**
 * One usage line per AI call, written to the function log (Netlify → Logs). Only fixed fields go in:
 * which endpoint, which provider/model, token counts if the provider reported them, time taken, and whether it worked.
 * Never the key, the request, the prompt or the reply: this is a bill-and-abuse record, not a transcript.
 */
export function logUsage(line: { endpoint?: string; provider: string; model: string; ok: boolean; ms: number; error?: string } & Usage) {
  const safe = (v: string | undefined, max: number) => String(v ?? "").replace(/[^\w.:/ -]/g, "").slice(0, max)
  console.log(JSON.stringify({
    evt: "ai_usage", endpoint: safe(line.endpoint, 40) || "unknown", provider: safe(line.provider, 40), model: safe(line.model, 80),
    inputTokens: count(line.inputTokens) ?? null, outputTokens: count(line.outputTokens) ?? null, ms: count(line.ms) ?? null, ok: line.ok, ...(line.error ? { error: safe(line.error, 40) } : {}),
  }))
}

/** Send one system + user message and get a parsed JSON object back. */
export async function chatJSON(args: ChatJSONArgs): Promise<ChatJSONResult> {
  const c = getConfig()
  const t0 = Date.now()
  try {
    const { result, usage } = await callProvider(args, c)
    logUsage({ endpoint: args.endpoint, provider: result.provider, model: result.model, ok: true, ms: result.ms, ...usage })
    return result
  } catch (e) {
    logUsage({ endpoint: args.endpoint, provider: c.label, model: c.model, ok: false, ms: Date.now() - t0, error: e instanceof AIError ? e.code : "error" })
    throw e
  }
}

async function callProvider({ system, user, maxTokens = 700, temperature = 0 }: ChatJSONArgs, c: AIConfig): Promise<{ result: ChatJSONResult; usage: Usage }> {
  if (!isConfigured(c)) throw new AIError("not_configured", "AI is not configured on the server.", 503)
  const t0 = Date.now()

  if (c.provider === "anthropic") {
    const { status, text } = await post(`${c.baseUrl}/v1/messages`, { "x-api-key": c.key, "anthropic-version": "2023-06-01" },
      { model: c.model, max_tokens: maxTokens, temperature, system, messages: [{ role: "user", content: user }] }, c.timeoutMs)
    if (status >= 400) throw new AIError("upstream", `AI provider error ${status}.`, status === 429 ? 429 : 502)
    const body = JSON.parse(text) as { content?: { type: string; text?: string }[]; model?: string; usage?: { input_tokens?: number; output_tokens?: number } }
    const reply = (body.content ?? []).filter(b => b.type === "text").map(b => b.text ?? "").join("")
    return { result: { data: parseJSONReply(reply), model: body.model ?? c.model, provider: c.label, ms: Date.now() - t0 }, usage: { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens } }
  }

  // OpenAI-compatible: DeepSeek, ASU AIR, OpenAI, and most other providers.
  const base = { model: c.model, temperature, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] }
  const headers = { authorization: `Bearer ${c.key}` }
  let r = await post(`${c.baseUrl}/chat/completions`, headers, c.jsonMode === "json_object" ? { ...base, response_format: { type: "json_object" } } : base, c.timeoutMs)
  if (r.status === 400 && c.jsonMode === "json_object" && /response_format|json/i.test(r.text)) {
    r = await post(`${c.baseUrl}/chat/completions`, headers, base, c.timeoutMs) // provider without JSON mode: retry once without it
  }
  if (r.status >= 400) throw new AIError("upstream", `AI provider error ${r.status}.`, r.status === 429 ? 429 : 502)
  const body = JSON.parse(r.text) as { choices?: { message?: { content?: string } }[]; model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }
  const reply = body.choices?.[0]?.message?.content ?? ""
  return { result: { data: parseJSONReply(reply), model: body.model ?? c.model, provider: c.label, ms: Date.now() - t0 }, usage: { inputTokens: body.usage?.prompt_tokens, outputTokens: body.usage?.completion_tokens } }
}
