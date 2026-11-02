import { describe, expect, it } from "vitest";
import { bufferExample } from "../onboarding/founder/firstEvent/bufferExample";
import { isBusinessDay } from "../engine/calendar";
describe("buffer example", () => {
    it("moves the club date earlier as the buffer grows, always onto working days, and never after the official date", () => {
        const days = [1, 2, 3, 5, 7].map(b => bufferExample("2026-10-31", b));
        for (const d of days) {
            expect(isBusinessDay(d.official)).toBe(true);
            expect(isBusinessDay(d.club)).toBe(true);
            expect(d.club < d.official).toBe(true);
        }
        const clubs = days.map(d => d.club);
        expect([...clubs].sort().reverse()).toEqual(clubs); // 1 day is the latest date, 7 days the earliest
        expect(new Set(clubs).size).toBe(clubs.length); // every choice gives a different date
        expect(new Set(days.map(d => d.official)).size).toBe(1); // the official date does not depend on the buffer
    });
});
