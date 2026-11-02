import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NodePanel } from "../components/NodePanel";
import { StoreProvider } from "../data/store";
import { seedDemo } from "../data/seed";
/**
 * Audit §5.2: these controls were live for everyone, but store.updateNode drops the patch unless the
 * viewer leads, so an officer's edit vanished with no word. They now read as disabled, like ChangeCard.
 */
const panel = (viewerId) => {
    const state = { ...seedDemo("2026-10-22"), viewerId };
    render(_jsx(StoreProvider, { initial: state, children: _jsx(NodePanel, { nodeId: "e-night:usg", onClose: () => { }, onSelect: () => { } }) }));
};
const EDITS = ["Owner (R)", "Club deadline", "Approver (A)", "Effort (working days) · Light", "Why it matters", "Draft or materials link"];
const disabled = (el) => el.disabled;
afterEach(cleanup);
describe("NodePanel edit controls follow the same rule the store enforces", () => {
    it("an officer sees them disabled, with one line saying who approves changes", () => {
        panel("maya");
        for (const label of EDITS)
            expect([label, disabled(screen.getByLabelText(label))]).toEqual([label, true]);
        expect(screen.getAllByRole("checkbox").every(disabled)).toBe(true);
        expect(screen.getByText("The president or VP approves changes.")).toBeTruthy();
    });
    it("the president can still edit everything, and gets no such line", () => {
        panel("alex");
        for (const label of EDITS)
            expect([label, disabled(screen.getByLabelText(label))]).toEqual([label, false]);
        expect(screen.getAllByRole("checkbox").some(disabled)).toBe(false);
        expect(screen.queryByText("The president or VP approves changes.")).toBeNull();
    });
});
