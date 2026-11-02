import { fmtLong } from "../../../lib/dates";
import { onboardingCopy } from "../../copy";
const c = onboardingCopy.founder.confirm;
/** Officers who have a name. An open position is not counted. */
export const namedOfficers = (club) => club.people.filter(p => p.name.trim().length > 0).length;
/** The one sentence on the Confirm screen. The date is the one the president confirmed; it is only made readable here. */
export function summaryLine(club, eventName, date) {
    const n = namedOfficers(club);
    const officers = n === 1 ? c.officers.one : c.officers.many.replace("{n}", String(n));
    return c.summary.replace("{club}", club.name.trim()).replace("{officers}", officers).replace("{event}", eventName.trim()).replace("{date}", fmtLong(date));
}
