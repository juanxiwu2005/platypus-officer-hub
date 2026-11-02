import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary, clearSavedDemo } from "../main";
/** Audit §5.3: a render error used to leave a white page, and damaged saved data repeated it on every reload. */
function Boom() { throw new Error("broken node"); }
describe("error boundary", () => {
    beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => { }));
    afterEach(() => vi.restoreAllMocks());
    it("renders the children when nothing goes wrong", () => {
        render(_jsx(ErrorBoundary, { children: _jsx("p", { children: "All fine" }) }));
        expect(screen.getByText("All fine")).toBeTruthy();
    });
    it("explains the failure and offers a reload and a reset instead of a white page", () => {
        render(_jsx(ErrorBoundary, { children: _jsx(Boom, {}) }));
        expect(screen.getByTestId("app-error").textContent).toMatch(/Reload first/);
        expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Reset demo data" })).toBeTruthy();
    });
});
describe("clearSavedDemo", () => {
    it("removes every saved key without going through the store, and leaves other sites alone", () => {
        window.localStorage.setItem("platypus.v1.demo", "{broken");
        window.localStorage.setItem("platypus.v1.chat", "[]");
        window.localStorage.setItem("platypus.v1.railOpen", "1");
        window.localStorage.setItem("somebody.else", "keep");
        clearSavedDemo();
        expect(Object.keys(window.localStorage).filter(k => k.startsWith("platypus."))).toEqual([]);
        expect(window.localStorage.getItem("somebody.else")).toBe("keep");
    });
});
