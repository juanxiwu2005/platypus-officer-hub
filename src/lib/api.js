/** A failed request, with the HTTP status so callers can tell "try again" from "sign in again". */
export class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
}
export async function callApi(path, body, timeoutMs = 30000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch("/api" + path, {
            method: body === undefined ? "GET" : "POST",
            headers: body === undefined ? {} : { "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: ctrl.signal,
        });
        const data = (await res.json().catch(() => ({})));
        if (!res.ok)
            throw new ApiError(data.message || `HTTP ${res.status}`, res.status);
        return data;
    }
    finally {
        clearTimeout(timer);
    }
}
export async function getHealth() {
    try {
        return await callApi("/health", undefined, 8000);
    }
    catch {
        return { ok: false, configured: false, provider: null, model: null };
    }
}
