import { onOrBefore, shiftWork } from "../../../engine/calendar";
import { addDays } from "../../../lib/dates";
/**
 * A worked example for the club-buffer control. The standard workflow already schedules its steps earlier than "official deadline minus buffer",
 * so turning the buffer does not move the chain above; this line shows what the buffer does with the same rule the engine uses
 * (engine/schedule.ts: shiftWork(official, -buffer)). The official date is made up: a working day about two weeks after today.
 */
export function bufferExample(today, buffer) {
    const official = onOrBefore(addDays(today, 14));
    return { official, club: shiftWork(official, -buffer) };
}
