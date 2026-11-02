import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, } from "@testing-library/react";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installSetupNavigationProtection, useSetupNavigationGuard, } from "./useSetupNavigationGuard";
afterEach(cleanup);
function mount(shellCheck, setupCheck, shellEnabled = true) {
    installSetupNavigationProtection();
    const shellError = vi.fn(), setupError = vi.fn();
    function Setup() {
        const { pending } = useSetupNavigationGuard(setupCheck, {
            onError: setupError,
        });
        return (_jsxs(_Fragment, { children: [_jsx("h1", { children: "Setup" }), _jsx("span", { "data-testid": "setup-pending", children: String(pending) }), _jsx(Link, { to: "/home", children: "Home" })] }));
    }
    function Shell({ enabled }) {
        const { pending } = useSetupNavigationGuard(shellCheck, {
            enabled,
            onError: shellError,
        });
        return (_jsxs(_Fragment, { children: [_jsx("span", { "data-testid": "shell-pending", children: String(pending) }), _jsxs(Routes, { children: [_jsx(Route, { path: "/setup", element: _jsx(Setup, {}) }), _jsx(Route, { path: "/home", element: _jsxs(_Fragment, { children: [_jsx("h1", { children: "Home" }), _jsx(Link, { to: "/tasks", children: "Tasks" }), _jsx(Link, { to: "/setup", children: "Setup link" })] }) }), _jsx(Route, { path: "/tasks", element: _jsxs(_Fragment, { children: [_jsx("h1", { children: "Tasks" }), _jsx(Link, { to: "/home", children: "Home" })] }) })] })] }));
    }
    const tree = (enabled) => (_jsx(StrictMode, { children: _jsx(HashRouter, { children: _jsx(Shell, { enabled: enabled }) }) }));
    const rendered = render(tree(shellEnabled));
    return {
        ...rendered,
        shellError,
        setupError,
        enableShell: (enabled) => rendered.rerender(tree(enabled)),
    };
}
describe("one HashRouter coordinator with shell and page checks", () => {
    it("checks both once, exposes pending to both, then keeps shell navigation alive after Setup unmounts", async () => {
        window.history.replaceState({ idx: 101 }, "", "#/setup");
        let resolve = () => { };
        const shellCheck = vi.fn(async () => true);
        const setupCheck = vi.fn(() => new Promise((done) => {
            resolve = done;
        }));
        mount(shellCheck, setupCheck);
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        expect(setupCheck).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("shell-pending").textContent).toBe("true");
        expect(screen.getByTestId("setup-pending").textContent).toBe("true");
        await act(async () => resolve(true));
        await screen.findByRole("heading", { name: "Home" });
        expect(shellCheck).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole("link", { name: "Tasks" }));
        await screen.findByRole("heading", { name: "Tasks" });
        expect(shellCheck).toHaveBeenCalledTimes(2);
        expect(setupCheck).toHaveBeenCalledTimes(1);
    });
    it("keeps the current page when one check rejects or throws", async () => {
        window.history.replaceState({ idx: 111 }, "", "#/setup");
        const shellCheck = vi.fn(async () => false);
        const setupCheck = vi.fn(async () => true);
        const ui = mount(shellCheck, setupCheck);
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        await waitFor(() => expect(shellCheck).toHaveBeenCalledTimes(1));
        expect(window.location.hash).toBe("#/setup");
        expect(screen.getByTestId("shell-pending").textContent).toBe("false");
        shellCheck.mockRejectedValueOnce(new Error("Unsent shell changes"));
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        await waitFor(() => expect(ui.shellError).toHaveBeenCalledTimes(1));
        expect(window.location.hash).toBe("#/setup");
        expect(setupCheck).toHaveBeenCalledTimes(2);
    });
    it("does not leave a dead navigator wrapper when the outer guard is removed before Setup", async () => {
        window.history.replaceState({ idx: 121 }, "", "#/setup");
        const shellCheck = vi.fn(async () => true), setupCheck = vi.fn(async () => true);
        const ui = mount(shellCheck, setupCheck);
        ui.enableShell(false);
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        await screen.findByRole("heading", { name: "Home" });
        fireEvent.click(screen.getByRole("link", { name: "Tasks" }));
        await screen.findByRole("heading", { name: "Tasks" });
        expect(shellCheck).not.toHaveBeenCalled();
        expect(setupCheck).toHaveBeenCalledTimes(1);
        ui.enableShell(true);
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        await screen.findByRole("heading", { name: "Home" });
        expect(shellCheck).toHaveBeenCalledTimes(1);
    });
    it("rolls Back back to Setup, approves both, replays once and guards Forward with the remaining shell", async () => {
        window.history.replaceState({ idx: 130 }, "", "#/home");
        window.history.pushState({ idx: 131 }, "", "#/setup");
        let resolve = () => { };
        const shellCheck = vi.fn(() => new Promise((done) => {
            resolve = done;
        }));
        const setupCheck = vi.fn(async () => true);
        mount(shellCheck, setupCheck);
        window.history.back();
        await waitFor(() => expect(shellCheck).toHaveBeenCalledTimes(1));
        expect(window.location.hash).toBe("#/setup");
        expect(setupCheck).toHaveBeenCalledTimes(1);
        await act(async () => resolve(true));
        await screen.findByRole("heading", { name: "Home" });
        expect(window.location.hash).toBe("#/home");
        shellCheck.mockImplementation(async () => true);
        window.history.forward();
        await screen.findByRole("heading", { name: "Setup" });
        expect(shellCheck).toHaveBeenCalledTimes(2);
        expect(setupCheck).toHaveBeenCalledTimes(1);
    });
    it("keeps both page and shell mounted after a failed Back save", async () => {
        window.history.replaceState({ idx: 140 }, "", "#/home");
        window.history.pushState({ idx: 141 }, "", "#/setup");
        const shellCheck = vi.fn(async () => true), setupCheck = vi.fn(async () => false);
        mount(shellCheck, setupCheck);
        window.history.back();
        await waitFor(() => expect(setupCheck).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.getByTestId("setup-pending").textContent).toBe("false"));
        expect(window.location.hash).toBe("#/setup");
        expect(window.history.state.idx).toBe(141);
        expect(screen.getByRole("heading").textContent).toBe("Setup");
    });
    it("applies both checks to direct hash edits without repeating the transition", async () => {
        window.history.replaceState({ idx: 151 }, "", "#/setup");
        const shellCheck = vi.fn(async () => true), setupCheck = vi.fn(async () => true);
        mount(shellCheck, setupCheck);
        window.location.hash = "/home";
        await screen.findByRole("heading", { name: "Home" });
        expect(shellCheck).toHaveBeenCalledTimes(1);
        expect(setupCheck).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole("link", { name: "Tasks" }));
        await screen.findByRole("heading", { name: "Tasks" });
        expect(shellCheck).toHaveBeenCalledTimes(2);
    });
    it.each([true, false])("waits for an extra Back rollback before resolving checks (allow=%s)", async (allow) => {
        window.history.replaceState({ idx: 203 }, "", "#/setup");
        let resolve;
        const setupCheck = vi.fn(() => new Promise((done) => { resolve = done; }));
        const shellCheck = vi.fn(async () => true);
        mount(shellCheck, setupCheck);
        const go = vi.spyOn(window.history, "go").mockImplementation(() => { });
        const arrive = (index, hash, type = "popstate") => {
            window.history.replaceState({ idx: index }, "", hash);
            window.dispatchEvent(new Event(type));
        };
        try {
            act(() => arrive(202, "#/home"));
            expect(go.mock.calls).toEqual([[1]]);
            act(() => arrive(203, "#/setup"));
            await act(async () => { });
            // Do not start a fetch in the gap before the next gesture of the burst.
            expect(setupCheck).not.toHaveBeenCalled();
            await waitFor(() => expect(setupCheck).toHaveBeenCalledTimes(1));
            act(() => arrive(202, "#/home"));
            // Chrome emits both notifications for one traversal; it must not queue two compensations.
            act(() => arrive(202, "#/home", "hashchange"));
            expect(go.mock.calls).toEqual([[1], [1]]);
            await act(async () => resolve(allow));
            expect(go.mock.calls).toEqual([[1], [1]]);
            expect(screen.getByTestId("setup-pending").textContent).toBe("true");
            act(() => arrive(203, "#/setup"));
            if (allow) {
                await waitFor(() => expect(go.mock.calls).toEqual([[1], [1], [-1]]));
                act(() => arrive(202, "#/home"));
                await screen.findByRole("heading", { name: "Home" });
                expect(shellCheck).toHaveBeenCalledTimes(1);
            }
            else {
                await waitFor(() => expect(screen.getByTestId("setup-pending").textContent).toBe("false"));
                expect(window.location.hash).toBe("#/setup");
                expect(shellCheck).not.toHaveBeenCalled();
            }
            expect(setupCheck).toHaveBeenCalledTimes(1);
        }
        finally {
            go.mockRestore();
        }
    });
});
