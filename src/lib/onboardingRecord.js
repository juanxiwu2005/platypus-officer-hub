const KEY = "platypus.v1.onboarding";
const LIMIT = 40;
const STEP_LIMIT = 200;
let memorySeen = false;
let memoryRearmed = false;
const storage = () => window.localStorage;
const empty = () => ({ attempts: [] });
export function loadOnboardingRecord() {
    try {
        const raw = storage().getItem(KEY);
        if (!raw)
            return empty();
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.attempts))
            return empty();
        return { attempts: parsed.attempts.filter(a => a && typeof a.id === "string" && (a.entry === "start" || a.entry === "explore") && typeof a.flowVersion === "string" && Array.isArray(a.steps)).slice(-LIMIT) };
    }
    catch {
        return empty();
    }
}
function save(record) {
    try {
        storage().setItem(KEY, JSON.stringify({ attempts: record.attempts.slice(-LIMIT) }));
    }
    catch { /* private/blocked storage: memory fallback still works */ }
}
export function hasSeenWelcome() {
    if (memorySeen)
        return true;
    try {
        return storage().getItem(`${KEY}.seen`) === "1";
    }
    catch {
        return false;
    }
}
export function markWelcomeSeen() {
    memorySeen = true;
    memoryRearmed = false;
    try {
        storage().setItem(`${KEY}.seen`, "1");
        storage().removeItem(`${KEY}.rearmed`);
    }
    catch { /* session-only */ }
}
/** Reset demo was used since the welcome page was last seen. Reset writes the sample club straight back, so "no saved data" alone cannot tell a first visit. */
export function isRearmed() {
    if (memoryRearmed)
        return true;
    try {
        return storage().getItem(`${KEY}.rearmed`) === "1";
    }
    catch {
        return false;
    }
}
/** Reset demo deliberately re-arms the invitation without deleting participant evidence. */
export function rearm() {
    memorySeen = false;
    memoryRearmed = true;
    try {
        storage().removeItem(`${KEY}.seen`);
        storage().setItem(`${KEY}.rearmed`, "1");
    }
    catch { /* session-only */ }
}
export function startAttempt(entry, flowVersion) {
    const record = loadOnboardingRecord();
    const replay = record.attempts.filter(a => a.entry === entry).length;
    const id = `ob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    record.attempts.push({ id, entry, flowVersion: String(flowVersion).slice(0, 40), replay, startedAt: Date.now(), steps: [] });
    save(record);
    return id;
}
export function recordStep(attemptId, step, event) {
    const record = loadOnboardingRecord();
    const attempt = record.attempts.find(a => a.id === attemptId);
    if (!attempt || !["enter", "leave", "back", "skip", "complete", "exit"].includes(event))
        return;
    attempt.steps.push({ step: String(step).slice(0, 80), event, at: Date.now() });
    if (attempt.steps.length > STEP_LIMIT)
        attempt.steps.splice(0, attempt.steps.length - STEP_LIMIT);
    save(record);
}
export function finishAttempt(attemptId, outcome) {
    const record = loadOnboardingRecord();
    const attempt = record.attempts.find(a => a.id === attemptId);
    if (!attempt)
        return;
    attempt.finishedAt = Date.now();
    attempt.outcome = outcome;
    save(record);
}
