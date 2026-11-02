import { createElement, useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreProvider } from "../data/store";
import { seedDemo } from "../data/seed";
import { OnboardingDraftProvider, useOnboardingDraft } from "../onboarding/draft";
import { Team } from "../onboarding/founder/Team";
// OB-05: the "AI suggested" bar on the Team screen. OB-04 starts the AI reading; this screen only shows what is in the draft and applies it when asked.
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const read = { mission: "Teach founders.", source: "ai", notes: [], roles: [
        { title: "Chair", reportsTo: null, duties: "Leads.", isAdvisor: false }, { title: "Treasurer", reportsTo: "Chair", duties: "Keeps the budget.", isAdvisor: false }
    ] };
/** Puts a reading (and whether it was applied) into the draft the way OB-04 will, then shows the Team screen. */
function Seed({ reading, applied = false, children }) {
    const { patch } = useOnboardingDraft();
    useEffect(() => { patch({ reading, applied }); }, [patch, reading, applied]);
    return children;
}
const show = (reading, applied = false) => {
    const page = createElement(Routes, null, createElement(Route, { path: "welcome/founder/team", element: createElement(Seed, { reading, applied, children: createElement(Team) }) }));
    const drafted = createElement(OnboardingDraftProvider, { children: page });
    const routed = createElement(MemoryRouter, { initialEntries: ["/welcome/founder/team"], children: drafted });
    return render(createElement(StoreProvider, { initial: seedDemo("2026-10-22"), children: routed }));
};
const roleNames = () => screen.getAllByLabelText(/^Role \d+$/).map(el => el.value);
describe("Team: AI suggested bar", () => {
    it("shows the bar and applies the reading when the president asks, without any request", async () => {
        const fetched = vi.spyOn(globalThis, "fetch");
        show({ status: "ready", read, note: "x", retry: false, pending: 0 });
        expect(await screen.findByText("AI suggested roles.")).toBeTruthy();
        expect(roleNames()).toContain("Treasurer");
        fireEvent.click(screen.getByRole("button", { name: "Use these suggestions" }));
        expect(roleNames()).toEqual(expect.arrayContaining(["Chair", "Treasurer"]));
        expect(roleNames()).not.toContain("Events lead");
        expect(screen.queryByText("AI suggested roles.")).toBeNull();
        expect(fetched).not.toHaveBeenCalled();
    });
    it("shows no bar when nothing was read, when it was already applied, or while it is still reading", async () => {
        show({ status: "idle" });
        await screen.findByText("Who's on your team?");
        expect(screen.queryByText("AI suggested roles.")).toBeNull();
        cleanup();
        show({ status: "ready", read, note: "x", retry: false, pending: 0 }, true);
        await screen.findByText("Who's on your team?");
        expect(screen.queryByText("AI suggested roles.")).toBeNull();
        cleanup();
        show({ status: "reading" });
        expect(await screen.findByText("Reading officer titles…")).toBeTruthy();
    });
    it("does not offer to apply anything that is not there (negative sample: a reading with no bar must stay quiet)", async () => {
        show({ status: "reading" });
        await screen.findByText("Who's on your team?");
        expect(screen.queryByRole("button", { name: "Use these suggestions" })).toBeNull();
    });
});
