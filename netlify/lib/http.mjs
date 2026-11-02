import { AIError } from "./ai.mts";
/** Small helpers shared by the /api/* functions. */
export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export class BadRequest extends Error {
}
export class TooManyRequests extends Error {
    constructor(retryAfter) {
        super("Too many requests. Please wait a moment and try again.");
        this.retryAfter = retryAfter;
    }
}
/**
 * Per-visitor request limit, kept in this function instance's memory.
 * LIMITS: Netlify may run several instances at once and restarts them freely, and every instance counts on its own,
 * so this slows down a script hammering one address; it is not a hard cap. It exists to make a runaway loop expensive
 * to run, not to enforce a quota.
 */
export const RATE_LIMITS = { perMinute: 60, perHour: 600, allVisitorsPerHour: 3000 };
const hits = new Map();
let allHits = [];
/** The visitor's address as Netlify reports it (set by Netlify itself; a browser cannot choose it). */
export function clientIp(req) {
    return req.headers.get("x-nf-client-connection-ip")?.trim().slice(0, 64) || "unknown";
}
export function resetRateLimit() {
    hits.clear();
    allHits = [];
}
/** Count this request against the visitor's address; throws TooManyRequests once a limit is passed. `now` is injectable for tests. */
export function rateLimit(req, now = Date.now()) {
    const hour = now - 3600000;
    allHits = allHits.filter(t => t > hour);
    const ip = clientIp(req);
    const mine = (hits.get(ip) ?? []).filter(t => t > hour);
    const lastMinute = mine.filter(t => t > now - 60000);
    if (lastMinute.length >= RATE_LIMITS.perMinute)
        throw new TooManyRequests(Math.max(1, Math.ceil((lastMinute[0] + 60000 - now) / 1000)));
    if (mine.length >= RATE_LIMITS.perHour)
        throw new TooManyRequests(Math.max(1, Math.ceil((mine[0] + 3600000 - now) / 1000)));
    if (allHits.length >= RATE_LIMITS.allVisitorsPerHour)
        throw new TooManyRequests(Math.max(1, Math.ceil((allHits[0] + 3600000 - now) / 1000)));
    mine.push(now);
    allHits.push(now);
    hits.set(ip, mine);
    if (hits.size > 5000)
        for (const [k, v] of hits)
            if (!v.some(t => t > hour))
                hits.delete(k); // keep memory bounded
}
/** Read a JSON body with a size cap so nobody can send huge prompts through our key. Also counts the request against the rate limit. */
export async function readJSON(req, maxBytes = 24000) {
    if (req.method !== "POST")
        throw new BadRequest("Use POST.");
    rateLimit(req);
    const declaredBytes = req.headers.get("content-length");
    if (declaredBytes && Number(declaredBytes) > maxBytes) {
        await req.body?.cancel();
        throw new BadRequest("Request is too large.");
    }
    const reader = req.body?.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let text = "", bytes = 0;
    try {
        if (reader)
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                bytes += value.byteLength;
                if (bytes > maxBytes) {
                    await reader.cancel();
                    throw new BadRequest("Request is too large.");
                }
                text += decoder.decode(value, { stream: true });
            }
        text += decoder.decode();
    }
    catch (e) {
        if (e instanceof BadRequest)
            throw e;
        throw new BadRequest("Body must be valid UTF-8 JSON.");
    }
    finally {
        reader?.releaseLock();
    }
    try {
        const value = JSON.parse(text || "{}");
        if (!value || typeof value !== "object" || Array.isArray(value))
            throw new BadRequest("Body must be a JSON object.");
        return value;
    }
    catch {
        throw new BadRequest("Body must be a JSON object.");
    }
}
export const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Turn any thrown error into a JSON response the front end understands. */
export function fail(e) {
    if (e instanceof TooManyRequests)
        return new Response(JSON.stringify({ error: "rate_limited", message: e.message }), { status: 429, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "retry-after": String(e.retryAfter) } });
    if (e instanceof BadRequest)
        return json({ error: "bad_request", message: e.message }, 400);
    if (e instanceof AIError)
        return json({ error: e.code, message: e.message }, e.status);
    console.error(e);
    return json({ error: "server_error", message: "Something went wrong on the server." }, 500);
}
