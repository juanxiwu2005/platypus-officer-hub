import { addDays } from "../lib/dates";
import { isBusinessDay, onOrAfter, shiftWork } from "./calendar";
/**
 * Dates for a task someone creates by hand or from the Ask form (M2b, Juanxi 2026-10-27).
 * Only this engine code computes them; the assistant never supplies a task date (AGENTS.md rule 3).
 */
export const TASK_DUE_CHOICES = [3, 5, 7];
export const taskDueDays = (s) => {
    const d = s.org.settings.taskDueDays;
    return Number.isInteger(d) && d >= 1 && d <= 30 ? d : 5;
};
/** "Today + Y": the due date a new task starts with. The person can pick another. */
export const defaultTaskDue = (s) => addDays(s.today, taskDueDays(s));
/**
 * The club deadline when "club deadline N working days earlier" is ticked: the due date minus the club buffer,
 * but never before the next working day, because a deadline of today or earlier cannot be met. `shortened`
 * says the full buffer did not fit, so the form can say so instead of hiding it.
 */
export function bufferedClubDeadline(s, due) {
    const buffer = s.org.settings.clubBufferBusinessDays;
    const wanted = shiftWork(due, -buffer);
    const earliest = onOrAfter(addDays(s.today, 1), isBusinessDay);
    if (due <= earliest)
        return { date: due, shortened: buffer > 0, buffer };
    return wanted < earliest ? { date: earliest, shortened: true, buffer } : { date: wanted, shortened: false, buffer };
}
/** The fixed anchor a hand-made standalone task gets: the due date, and the club deadline before it. */
export function taskAnchor(s, due, buffered) {
    return { kind: "fixed", official: due, club: buffered ? bufferedClubDeadline(s, due).date : due };
}
/** A hand-made task's fixed date is its due date, not an ASU deadline, so it is labelled that way. */
export const officialLabel = (n) => !n.eventId && n.anchor?.kind === "fixed" ? "Due date" : "ASU deadline";
