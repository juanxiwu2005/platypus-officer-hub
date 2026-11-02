import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useStore, useViewer } from "../../data/store";
import { getHealth } from "../../lib/api";
import { fmtLong } from "../../lib/dates";
import { useBts } from "../Bts";
/** Everything about the demo itself lives behind one small pill. */
export function DemoMenu({ onReset }) {
    const { state, dispatch, reset } = useStore();
    const { canNudge } = useViewer();
    const [open, setOpen] = useState(false);
    const [health, setHealth] = useState(null);
    // Reset wipes everything and sits next to the clock buttons, so it asks once. Not confirm():
    // a native dialog is blocked in Playwright and on some phone browsers.
    const [armed, setArmed] = useState(false);
    const ref = useRef(null);
    useEffect(() => { getHealth().then(setHealth); }, []);
    useEffect(() => {
        if (!armed)
            return;
        const t = setTimeout(() => setArmed(false), 3000);
        return () => clearTimeout(t);
    }, [armed]);
    useEffect(() => { if (!open)
        setArmed(false); }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const off = (e) => { if (!ref.current?.contains(e.target))
            setOpen(false); };
        const esc = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", off);
        window.addEventListener("keydown", esc);
        return () => { document.removeEventListener("mousedown", off); window.removeEventListener("keydown", esc); };
    }, [open]);
    const bts = useBts();
    const aiNote = health?.configured ? `AI answers come live from ${health.provider}${health.model ? ` (${health.model})` : ""}.` : "AI answers are simulated.";
    return _jsxs("div", { className: "menu-wrap", ref: ref, children: [_jsxs("button", { type: "button", className: "demo-pill", "aria-expanded": open, onClick: () => setOpen(!open), "data-testid": "demo-menu", children: ["Demo \u00B7 ", _jsx("span", { "data-testid": "demo-date", children: fmtLong(state.today) })] }), _jsxs("div", { className: "menu", hidden: !open, role: "group", "aria-label": "Demo controls", children: [_jsxs("p", { className: "small muted", "data-testid": "ai-status", children: ["Fictional club and example data. ", aiNote, " Nothing is sent from this page."] }), canNudge && _jsxs("div", { className: "menu-row", children: [_jsx("span", { className: "small", children: "Demo clock" }), [1, 3, 10].map(days => _jsxs("button", { type: "button", className: "btn small", "data-testid": `clock-${days}`, onClick: () => dispatch({ type: "advanceClock", days }), children: ["+", days, " day", days > 1 ? "s" : ""] }, days))] }), _jsxs("div", { className: "menu-row", children: [canNudge && _jsx(NavLink, { className: "btn small", to: "/welcome/start", onClick: () => setOpen(false), children: "Replay walkthrough" }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: bts.on, onChange: e => bts.setOn(e.target.checked), "data-testid": "bts-toggle" }), "Behind the scenes"] })] }), _jsx("button", { type: "button", className: `btn small ${armed ? "btn-primary" : ""}`, "data-testid": "reset-demo", onClick: () => {
                            if (!armed) {
                                setArmed(true);
                                return;
                            }
                            setArmed(false);
                            reset();
                            try {
                                window.localStorage.removeItem("platypus.v1.chat");
                            }
                            catch { /* storage unavailable */ }
                            window.dispatchEvent(new Event("platypus:reset"));
                            setOpen(false);
                            onReset();
                        }, children: armed ? "Click again to reset" : "Reset demo" }), armed && _jsx("p", { className: "small muted", role: "status", children: "This clears every task, note and reminder in the demo." })] })] });
}
