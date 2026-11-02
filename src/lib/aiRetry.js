import { ApiError, callApi } from "./api";
/** Asking again cannot help when the server refused the request outright (signed out, not allowed, not found, bad request). */
const permanent = (e) => e instanceof ApiError && [400, 401, 403, 404].includes(e.status);
const signedOut = (e) => e instanceof ApiError && (e.status === 401 || e.status === 403);
/**
 * One short AI request, tried up to three times with a pause between, for as long as `current()` says the answer is still wanted.
 * A request here may last only 30 seconds and the AI answers one at a time, so one slow or busy moment should not lose the whole job.
 * A refusal such as "401 signed out" is not retried: it stops at once with that error.
 */
export async function callRetry(path, body, current = () => true, tries = 3, timeoutMs = 45000) {
    let last;
    for (let i = 0; i < tries && current(); i++) {
        try {
            return await callApi(path, body, timeoutMs);
        }
        catch (e) {
            last = e;
            if (permanent(e))
                break;
            await new Promise(r => setTimeout(r, 800 * (i + 1)));
        }
    }
    throw last instanceof Error ? last : new Error("Cancelled");
}
/** " (the reason)" for a failure note. A signed-out preview says so plainly: that is not an AI problem. */
export const whyFailed = (e) => signedOut(e)
    ? " (your Netlify sign-in for this preview has expired: reload this page, sign in again, and your setup is kept)"
    : e instanceof Error && e.message ? ` (${e.message.replace(/\.$/, "").slice(0, 120)})` : "";
