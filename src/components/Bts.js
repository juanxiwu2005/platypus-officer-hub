import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState } from "react";
/**
 * "Behind the scenes" (S7): a global switch that shows, next to the numbers, dates and AI output on a page, where each
 * came from. It is off by default and, when off, the notes are not in the page at all (not hidden, not zero-height),
 * so screen readers, word counts and the layout never see them. The choice is kept in localStorage.
 */
const KEY = "platypus.v1.bts";
const BtsCtx = createContext({ on: false, setOn: () => { } });
function initial() {
    try {
        return window.localStorage.getItem(KEY) === "1";
    }
    catch {
        return false; /* storage unavailable */
    }
}
export function BtsProvider({ children }) {
    const [on, setOnState] = useState(initial);
    const setOn = (v) => {
        setOnState(v);
        try {
            window.localStorage.setItem(KEY, v ? "1" : "0");
        }
        catch { /* storage unavailable */ }
    };
    return _jsx(BtsCtx.Provider, { value: { on, setOn }, children: children });
}
export const useBts = () => useContext(BtsCtx);
/** One note. `rule` = worked out by the rule engine or plain arithmetic; `ai` = written by the AI model. */
export function Bts({ kind = "rule", label, children }) {
    const { on } = useBts();
    if (!on)
        return null;
    return _jsxs("span", { className: `bts k-${kind}`, children: [_jsx("b", { children: label }), " ", children] });
}
/** A line of notes under a block. Renders nothing when the switch is off. */
export function BtsRow({ children }) {
    const { on } = useBts();
    return on ? _jsx("div", { className: "bts-row", children: children }) : null;
}
/** The same, as a full-width table row. */
export function BtsTr({ cols, children }) {
    const { on } = useBts();
    return on ? _jsx("tr", { className: "bts-tr", children: _jsx("td", { colSpan: cols, children: _jsx("div", { className: "bts-row", children: children }) }) }) : null;
}
