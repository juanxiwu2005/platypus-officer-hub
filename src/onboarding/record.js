import { finishAttempt, markWelcomeSeen, recordStep, startAttempt } from "../lib/onboardingRecord";
/** The walkthrough's current attempt lives in sessionStorage, so a reload keeps recording into the same attempt. */
const ACTIVE = "platypus.v1.onboarding.active";
export const FLOW_VERSION = "ob-2";
const read = () => { try {
    return window.sessionStorage.getItem(ACTIVE);
}
catch {
    return null;
} };
const write = (id) => { try {
    id ? window.sessionStorage.setItem(ACTIVE, id) : window.sessionStorage.removeItem(ACTIVE);
}
catch { /* recording is optional */ } };
/** One place that begins a walkthrough: used by the welcome page and by "Replay walkthrough". Marks the welcome page as seen. */
export function beginWalkthrough() {
    const id = startAttempt("start", FLOW_VERSION);
    write(id);
    markWelcomeSeen();
    return id;
}
export function recordEvent(step, event) { const id = read(); if (id)
    recordStep(id, step, event); }
export function endWalkthrough(outcome) { const id = read(); if (id) {
    finishAttempt(id, outcome);
    write(null);
} }
