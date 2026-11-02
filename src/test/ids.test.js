import { describe, expect, it } from "vitest";
import { nextCounter } from "../lib/ids";
describe("nextCounter", () => {
    it("is the list length in the ordinary case, so existing ids do not change", () => {
        expect(nextCounter([], /^report:(\d+)/)).toBe(0);
        expect(nextCounter(["report:0", "report:1"], /^report:(\d+)/)).toBe(2);
    });
    it("never repeats an id that is still in use after something was deleted", () => {
        expect(nextCounter(["report:0", "report:2"], /^report:(\d+)/)).toBe(3); // report:1 was deleted; length alone would give 2
        expect(nextCounter(["nudge-4-e1:a"], /^nudge-(\d+)-/)).toBe(5);
    });
    it("ignores ids that carry no counter", () => {
        expect(nextCounter(["seed-a", "seed-b"], /-(\d+)$/)).toBe(2);
    });
});
