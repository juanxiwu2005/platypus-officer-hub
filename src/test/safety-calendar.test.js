import { describe, expect, it } from "vitest";
import { seedDemo } from "../data/seed";
import { reducer } from "../data/store";
import { CALENDAR_END, CALENDAR_START, findPeriod, FINALS, isBusinessDay, outsideCalendar, personalWorkDay, shiftWork, studentOffReason, TERMS } from "../engine/calendar";
import { computeSchedule } from "../engine/schedule";
const base = () => seedDemo("2026-10-22");
const moveEvent = (date) => reducer(base(), { type: "updateEvent", id: "e-night", patch: { date } });
const eventCodes = (date) => computeSchedule(moveEvent(date)).events["e-night"].issues.map(i => i.code);
const nodeCodes = (date) => Object.values(computeSchedule(moveEvent(date)).nodes).flatMap(n => n.issues.map(i => i.code));
describe("A9 · calendar coverage", () => {
    it("covers Fall 2027 and Spring 2028 (ASU Registrar; Spring 2028 is projected)", () => {
        expect(CALENDAR_START).toBe("2026-08-20");
        expect(CALENDAR_END).toBe("2028-05-06");
        expect(findPeriod("2027-12-08", FINALS)?.label).toBe("Fall 2027 final exams");
        expect(findPeriod("2027-09-27", TERMS)?.label).toBe("Fall 2027");
        expect(isBusinessDay("2027-09-06")).toBe(false); // Labor Day 2027
        expect(isBusinessDay("2027-11-25")).toBe(false); // Thanksgiving 2027
        expect(isBusinessDay("2028-01-17")).toBe(false); // MLK Day 2028
        expect(isBusinessDay("2027-10-11")).toBe(true); // fall break: classes excused, university open
        expect(studentOffReason("2027-12-20")).toBe("break between semesters");
    });
    it("the audit's example now counts back correctly: 14 student work days before 2027-10-15 is 2027-09-27", () => {
        expect(shiftWork("2027-10-15", -14, personalWorkDay())).toBe("2027-09-27");
    });
    it("only dates beyond the data are outside the calendar", () => {
        expect(outsideCalendar("2026-08-19")).toBe(true);
        expect(outsideCalendar("2026-08-20")).toBe(false);
        expect(outsideCalendar("2027-07-01")).toBe(false); // summer: inside the range, handled by the "between semesters" warning
        expect(outsideCalendar("2028-05-06")).toBe(false);
        expect(outsideCalendar("2028-05-07")).toBe(true);
    });
});
describe("A9(b) · dates outside the known calendar are a red error, not a silent guess", () => {
    it("raises no calendar error for events inside the known range", () => {
        for (const date of ["2026-11-19", "2027-02-18", "2027-10-15", "2028-03-01"]) {
            expect(eventCodes(date), date).not.toContain("calendar_range");
            expect(nodeCodes(date), date).not.toContain("calendar_range");
        }
    });
    it("flags an event after the last known day, on the event and on its steps", () => {
        const s = computeSchedule(moveEvent("2028-09-14"));
        const issue = s.events["e-night"].issues.find(i => i.code === "calendar_range");
        expect(issue?.severity).toBe("error");
        expect(issue?.text).toContain("outside the ASU calendar");
        expect(Object.values(s.nodes).some(n => n.issues.some(i => i.code === "calendar_range" && i.severity === "error"))).toBe(true);
        // the vaguer "between semesters" warning must not hide the real problem
        expect(s.events["e-night"].issues.map(i => i.code)).not.toContain("no_term");
    });
    it("flags an event whose steps are pushed past the end by the engine's own arithmetic", () => {
        // The event is the last known day, but close-out steps run after it, beyond the calendar.
        expect(eventCodes("2028-05-05")).toContain("calendar_range");
    });
    it("flags dates before the first known day too", () => {
        expect(eventCodes("2026-07-01")).toContain("calendar_range");
    });
    it("the example club in its seed state has no calendar error", () => {
        const s = computeSchedule(base());
        expect(Object.values(s.events).flatMap(e => e.issues).map(i => i.code)).not.toContain("calendar_range");
        expect(Object.values(s.nodes).flatMap(n => n.issues).map(i => i.code)).not.toContain("calendar_range");
    });
});
