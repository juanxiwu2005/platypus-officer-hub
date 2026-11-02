import { completeSetup, validateClub } from "../../../data/settings";
import { callApi } from "../../../lib/api";
import { commandContext, humanEventDate, parseCommand, sanitizeOps, validDate } from "../../../lib/commands";
import { onboardingCopy } from "../../copy";
/** The most dots the witness chain ever draws (strategy section 5: at most 8; fewer keeps the screen within its word budget). */
export const MAX_DOTS = 6;
/**
 * Turn one sentence into a first event. Same rule as the classic setup page: with AI on, ask the existing /api/command (it answers with
 * checked operations only); if that fails or AI is off, the local grammar reads it. Dates are never taken from the model: the event date is
 * read from the person's own sentence by humanEventDate, and every step date comes later from the rule engine.
 */
export async function prepareEvent(state, club, sentence) {
    const ctx = commandContext({ ...state, people: club.people, roles: club.roles, events: [], nodes: [] });
    let ops = [], source = "Local demo grammar · AI off";
    if (state.aiEnabled) {
        try {
            const result = await callApi("/command", { sentence, context: ctx });
            ops = sanitizeOps(result.ops, ctx);
            source = result.source === "ai" ? "AI draft · review below" : "Checked command grammar";
        }
        catch {
            ops = parseCommand(sentence, ctx);
            source = "Local demo fallback · server unavailable";
        }
    }
    else
        ops = parseCommand(sentence, ctx);
    if (ops.length !== 1 || ops[0].op !== "create_event")
        return { ok: false, notice: onboardingCopy.founder.firstEvent.notEvent };
    return { ok: true, event: ops[0], date: humanEventDate(sentence, state.today), source };
}
/** The workspace this event would create, or null while anything is missing or refused. The buffer is passed in, so changing it re-plans every date. */
export function previewFor(state, club, event, date, inviteCode, steps, buffer) {
    if (!event || !validDate(date) || date < state.today || validateClub(club))
        return null;
    const next = completeSetup(state, club, event, date, inviteCode, undefined, buffer, steps);
    return next === state ? null : next;
}
/** The first few steps in date order, each with the club deadline the rule engine gave it. Nothing here makes up a date. */
export function chainDots(preview, max = MAX_DOTS) {
    if (!preview)
        return [];
    return preview.nodes
        .flatMap((n, i) => n.clubDeadline ? [{ id: n.id, title: n.title, date: n.clubDeadline, i }] : [])
        .sort((a, b) => a.date.localeCompare(b.date) || a.i - b.i)
        .slice(0, Math.min(max, 8))
        .map(({ id, title, date }) => ({ id, title, date }));
}
/** Words a person sees: runs of letters or digits. The same measure the screen's word check uses. */
export const wordCount = (text) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’&-]*/gu) ?? []).length;
