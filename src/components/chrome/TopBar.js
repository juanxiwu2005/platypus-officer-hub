import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Logo } from "../icons";
import { useStore } from "../../data/store";
import { useRail } from "../rail/RailContext";
import { DemoMenu } from "./DemoMenu";
import { Bell } from "./Bell";
export function TopBar({ onReset }) {
    const { state, dispatch } = useStore();
    const rail = useRail();
    // On a phone "View as" and "AI features" live behind a "⋯" button so the top bar is one line (DX-20). On a computer the
    // same two controls stay in the bar exactly where they were: `.controls-extra` is then `display: contents`.
    const [moreOpen, setMoreOpen] = useState(false);
    // The line under the top bar only shows once the page has scrolled under it (DX-23).
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const on = () => setScrolled(window.scrollY > 0);
        on();
        window.addEventListener("scroll", on, { passive: true });
        return () => window.removeEventListener("scroll", on);
    }, []);
    const moreBox = useRef(null);
    const moreToggle = useRef(null);
    useEffect(() => {
        if (!moreOpen)
            return;
        const away = (e) => { const t = e.target; if (!moreBox.current?.contains(t) && !moreToggle.current?.contains(t))
            setMoreOpen(false); };
        const esc = (e) => { if (e.key === "Escape") {
            setMoreOpen(false);
            moreToggle.current?.focus();
        } };
        document.addEventListener("pointerdown", away);
        window.addEventListener("keydown", esc);
        return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
    }, [moreOpen]);
    return (_jsx("header", { className: "topbar", "data-scrolled": scrolled, children: _jsxs("div", { className: "bar-in", children: [_jsxs(NavLink, { to: "/", className: "brand", children: [_jsx(Logo, {}), _jsxs("div", { children: [_jsx("b", { children: "Platypus" }), " ", _jsx("span", { children: state.org.name })] })] }), _jsxs("div", { className: "controls", children: [_jsx(DemoMenu, { onReset: onReset }), _jsxs("div", { className: "controls-extra", id: "topbar-more", ref: moreBox, "data-open": moreOpen, children: [_jsx("p", { className: "more-org", children: state.org.name }), _jsxs("label", { className: "field-inline view-as", children: [_jsx("span", { children: "View as" }), _jsx("select", { value: state.viewerId, onChange: e => { dispatch({ type: "setViewer", viewerId: e.target.value }); setMoreOpen(false); }, "data-testid": "view-as", children: state.people.map(p => {
                                                const role = state.roles.find(r => r.id === p.roleId);
                                                return _jsxs("option", { value: p.id, children: [p.name, " \u00B7 ", role?.displayName] }, p.id);
                                            }) })] }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: state.aiEnabled, onChange: e => { dispatch({ type: "setAi", enabled: e.target.checked }); setMoreOpen(false); } }), "AI features"] })] }), _jsx("button", { type: "button", ref: moreToggle, className: "btn btn-quiet icon-btn more-toggle", "aria-label": "More options", "aria-expanded": moreOpen, "aria-controls": "topbar-more", "data-testid": "more-toggle", onClick: () => setMoreOpen(o => !o), children: _jsxs("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: [_jsx("circle", { cx: "4.5", cy: "10", r: "1.6", fill: "currentColor" }), _jsx("circle", { cx: "10", cy: "10", r: "1.6", fill: "currentColor" }), _jsx("circle", { cx: "15.5", cy: "10", r: "1.6", fill: "currentColor" })] }) }), _jsx(Bell, {}), _jsxs("button", { type: "button", className: `btn ask-toggle ${rail.open ? "on" : ""}`, "aria-pressed": rail.open, onClick: () => rail.setOpen(!rail.open), "data-testid": "ask-toggle", children: [_jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "M4 5.5A2.5 2.5 0 016.5 3h7A2.5 2.5 0 0116 5.5v5a2.5 2.5 0 01-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 014 10.5z", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) }), "Ask Platypus"] })] })] }) }));
}
