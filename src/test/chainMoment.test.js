import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { Chain } from "../components/ui";
// DX-25: a stop that becomes done in front of the person gets "just-done" for a moment; nothing else does.
const stops = (...states) => states.map((state, i) => ({ key: `s${i}`, label: `Step ${i}`, state }));
const justDone = (container) => [...container.querySelectorAll("li.just-done")].map(li => li.textContent);
const setReduced = (on) => vi.stubGlobal("matchMedia", (q) => ({ matches: on && q.includes("reduce"), media: q, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } }));
describe("Chain: the done moment", () => {
    beforeEach(() => { vi.useFakeTimers(); setReduced(false); });
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
    it("shows nothing the first time it is drawn, even if stops are done", () => {
        const { container } = render(_jsx(Chain, { label: "x", stops: stops("done", "done", "todo") }));
        expect(justDone(container)).toEqual([]);
    });
    it("marks exactly the stop that became done, then lets go of it", () => {
        const { container, rerender } = render(_jsx(Chain, { label: "x", stops: stops("done", "now", "todo") }));
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "done", "now") }));
        expect(justDone(container)).toEqual(["Step 1"]);
        act(() => { vi.advanceTimersByTime(700); });
        expect(justDone(container)).toEqual([]);
    });
    it("does not mark a stop again when the chain is redrawn with the same stops", () => {
        const { container, rerender } = render(_jsx(Chain, { label: "x", stops: stops("done", "now", "todo") }));
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "done", "now") }));
        act(() => { vi.advanceTimersByTime(700); });
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "done", "now") }));
        expect(justDone(container)).toEqual([]);
    });
    it("does not mark a stop that was already done, or one that went the other way", () => {
        const { container, rerender } = render(_jsx(Chain, { label: "x", stops: stops("done", "done", "now") }));
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "now", "todo") })); // undone
        expect(justDone(container)).toEqual([]);
    });
    it("marks several stops that finish together", () => {
        const { container, rerender } = render(_jsx(Chain, { label: "x", stops: stops("done", "now", "todo") }));
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "done", "done") }));
        expect(justDone(container)).toEqual(["Step 1", "Step 2"]);
    });
    it("with Reduce Motion nothing is marked", () => {
        setReduced(true);
        const { container, rerender } = render(_jsx(Chain, { label: "x", stops: stops("done", "now", "todo") }));
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "done", "now") }));
        expect(justDone(container)).toEqual([]);
    });
    it("a stop that did not exist before is not 'just done'", () => {
        const { container, rerender } = render(_jsx(Chain, { label: "x", stops: stops("done", "now") }));
        rerender(_jsx(Chain, { label: "x", stops: stops("done", "now", "done") }));
        expect(justDone(container)).toEqual([]);
    });
});
