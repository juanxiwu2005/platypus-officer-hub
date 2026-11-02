import { addDays, fromISO } from "../../../lib/dates";
import { BREAKS, FINALS, HOLIDAYS, TERMS, findPeriod } from "../../../engine/calendar";
import { mondayOf } from "../../../engine/team";
/** The Monday-to-Friday of a week decides its kind. All dates come from the ASU calendar in src/engine/calendar.ts. */
export function weekKind(monday) {
    const days = [0, 1, 2, 3, 4].map(i => addDays(monday, i));
    if (days.some(d => findPeriod(d, FINALS)))
        return "finals";
    if (days.some(d => findPeriod(d, BREAKS)))
        return "break";
    if (!days.some(d => findPeriod(d, TERMS)))
        return "between";
    if (days.some(d => d in HOLIDAYS))
        return "holiday";
    return null;
}
/** `count` weeks starting with the week that holds `today`. */
export function weeksFrom(today, count = 18) {
    const first = mondayOf(today);
    return Array.from({ length: count }, (_, i) => { const monday = addDays(first, i * 7); return { monday, kind: weekKind(monday) }; });
}
export const monthName = (monday) => fromISO(monday).toLocaleDateString("en-US", { month: "short" });
