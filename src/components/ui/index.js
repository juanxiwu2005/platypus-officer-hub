import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../../data/store";
/**
 * The five building blocks of the v1.1 interface (AGENTS.md §7):
 * StatusPill, Chain, the .tbl table class, Hover / Info, and the right-rail details (rail/RailContext).
 * Look → hover → click. Words live in hover cards, not on the page.
 */
import { prefersReducedMotion, tokenMs } from "../../lib/motion";
import { PALETTE, STATUS_DEFAULTS, STATUS_ORDER } from "./statusDefaults";
export { PALETTE, STATUS_DEFAULTS, STATUS_ORDER };
export function statusStyles(state) {
    const b = state.org.board;
    return Object.fromEntries(STATUS_ORDER.map(s => [s, {
            label: b?.labels?.[s]?.trim() || STATUS_DEFAULTS[s].label,
            color: b?.colors?.[s] || STATUS_DEFAULTS[s].color,
        }]));
}
export function useStatusStyles() {
    const { state } = useStore();
    return statusStyles(state);
}
/** Solid coloured status label, the same everywhere (monday-style). */
export function StatusPill({ status, small }) {
    const s = useStatusStyles()[status];
    return _jsx("span", { className: `pill${small ? " sm" : ""}`, style: { "--pill": s.color }, "data-status": status, children: s.label });
}
export function NodePill({ node, small }) {
    return _jsx(StatusPill, { status: node.status, small: small });
}
/** True on a screen that cannot hover (phones, tablets). Hover cards become tap-to-open there (AGENTS.md §7.3, S8). */
export function useTouch() {
    const query = "(hover: none)";
    const [touch, setTouch] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
    useEffect(() => {
        const mq = window.matchMedia?.(query);
        if (!mq)
            return;
        const on = () => setTouch(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return touch;
}
const FOCUSABLE = "button, a[href], input, select, textarea, [tabindex]";
/**
 * A light card that appears when you rest on (or focus) the child. At most three short lines.
 * On a screen that cannot hover, tapping the child opens the same card as a sheet at the bottom of the screen;
 * tapping anywhere else, or Escape, closes it. The text is the same text, so there is no second set of explanations.
 */
export function Hover({ children, card, className = "", block }) {
    const Tag = block ? "div" : "span";
    const touch = useTouch();
    const [open, setOpen] = useState(false);
    const box = useRef(null);
    useEffect(() => {
        const el = box.current;
        if (!touch || !el)
            return;
        const trigger = el.querySelector(FOCUSABLE);
        const target = trigger ?? el;
        if (!trigger)
            el.tabIndex = 0;
        // aria-expanded is only allowed on real controls, so a plain focusable span or the box itself is given the button role.
        if (!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(target.tagName) && !target.getAttribute("role"))
            target.setAttribute("role", "button");
        target.setAttribute("aria-expanded", String(open));
    });
    useEffect(() => {
        if (!open)
            return;
        const away = (e) => { if (!box.current?.contains(e.target))
            setOpen(false); };
        const esc = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("pointerdown", away);
        window.addEventListener("keydown", esc);
        return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
    }, [open]);
    const touchProps = touch ? {
        "data-open": open,
        onClick: (e) => { e.stopPropagation(); setOpen(o => !o); }, // a tap on the trigger is for the card, not for the row or card around it
        onKeyDown: (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === box.current) {
            e.preventDefault();
            setOpen(o => !o);
        } },
    } : {};
    return _jsxs(Tag, { ref: box, className: `hover ${className}`, ...touchProps, children: [children, _jsx("span", { className: "hover-card", role: "tooltip", children: card })] });
}
/** An ⓘ icon whose explanation shows on hover or focus. */
export function Info({ children, label = "More information" }) {
    return _jsx(Hover, { className: "info-wrap", card: children, children: _jsx("button", { type: "button", className: "info", "aria-label": label, children: _jsxs("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", children: [_jsx("circle", { cx: "8", cy: "8", r: "7", fill: "none", stroke: "currentColor", strokeWidth: "1.4" }), _jsx("path", { d: "M8 7v4.2M8 4.6v.1", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" })] }) }) });
}
/** Parcel-tracking style chain: filled = done, large = now, hollow = later, red ring = at risk. */
export function Chain({ stops, label, showLabels = true, compact }) {
    const lastDone = stops.reduce((i, s, k) => (s.state === "done" ? k : i), -1);
    // A stop that becomes done while this chain is on screen gets a moment (the line to it grows, the dot pops) — DX-25. A chain that is
    // drawn for the first time, or one whose stops were already done, shows nothing: only a real change in front of the person counts.
    const seen = useRef(null);
    const timers = useRef([]);
    const [fresh, setFresh] = useState(new Set());
    useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);
    useLayoutEffect(() => {
        const now = Object.fromEntries(stops.map(s => [s.key, s.state]));
        const was = seen.current;
        seen.current = now;
        if (!was || prefersReducedMotion())
            return;
        const newly = stops.filter(s => s.state === "done" && was[s.key] !== undefined && was[s.key] !== "done").map(s => s.key);
        if (!newly.length)
            return;
        setFresh(f => new Set([...f, ...newly]));
        timers.current.push(window.setTimeout(() => setFresh(f => { const n = new Set(f); newly.forEach(k => n.delete(k)); return n; }), tokenMs("--spring-pop-dur", 480) + 80));
    });
    return _jsx("ol", { className: `chain${compact ? " compact" : ""}${showLabels ? "" : " no-labels"}`, "aria-label": label, children: stops.map((s, i) => {
            const dot = _jsx("span", { className: `dot ${s.state}`, "aria-hidden": "true" });
            const text = s.label && showLabels ? _jsx("span", { className: "chain-label", children: s.label }) : null;
            const name = `${s.label ?? `Step ${i + 1}`}: ${s.state === "done" ? "done" : s.state === "now" ? "current" : s.state === "risk" ? "at risk" : "not started"}`;
            const body = s.onClick
                ? _jsxs("button", { type: "button", className: "chain-btn", onClick: s.onClick, "aria-label": name, "data-testid": s.testId, children: [dot, text] })
                : s.hint
                    ? _jsxs("button", { type: "button", className: "chain-btn", "aria-label": name, "data-testid": s.testId, children: [dot, text] })
                    : _jsxs("span", { className: "chain-btn", "aria-label": name, role: "img", "data-testid": s.testId, children: [dot, text] });
            return _jsx("li", { className: `${i <= lastDone ? "past" : ""} ${s.state}${fresh.has(s.key) ? " just-done" : ""}`, children: s.hint ? _jsx(Hover, { card: s.hint, children: body }) : body }, s.key);
        }) });
}
export function Avatar({ name, size = "md", title }) {
    const text = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";
    return _jsx("span", { className: `avatar ${size === "sm" ? "sm" : ""}${name ? "" : " empty"}`, title: title ?? name ?? "No owner", "aria-label": title ?? name ?? "No owner", children: text });
}
/** Progress ring for goals and handbook progress. */
export function Ring({ value, max, size = 44, label, color }) {
    const r = size / 2 - 4, c = 2 * Math.PI * r, p = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    return _jsxs("svg", { className: "ring", width: size, height: size, viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": label, children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: "var(--line)", strokeWidth: "5" }), _jsx("circle", { className: "ring-arc", cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: color ?? "var(--accent)", strokeWidth: "5", strokeLinecap: "round", strokeDasharray: `${c * p} ${c}`, transform: `rotate(-90 ${size / 2} ${size / 2})` })] });
}
const RISK_WORD = { red: "At risk", yellow: "Watch", green: "On track" };
/** A different shape for each state, so the dots can be told apart without colour (DX-05). The colour comes from the CSS class. */
const RISK_SHAPE = {
    green: _jsxs(_Fragment, { children: [_jsx("circle", { cx: "7", cy: "7", r: "7", fill: "currentColor" }), _jsx("path", { className: "glyph", d: "M4 7.3l2 2 4-4.3" })] }),
    yellow: _jsxs(_Fragment, { children: [_jsx("path", { d: "M7 .9L13.4 12.6H.6z", fill: "currentColor", stroke: "currentColor", strokeWidth: "1.4", strokeLinejoin: "round" }), _jsx("path", { className: "glyph", d: "M7 5.2v3.1M7 10.3v.1" })] }),
    red: _jsxs(_Fragment, { children: [_jsx("rect", { x: ".5", y: ".5", width: "13", height: "13", rx: "3.5", fill: "currentColor" }), _jsx("path", { className: "glyph", d: "M4.7 4.7l4.6 4.6M9.3 4.7l-4.6 4.6" })] }),
};
/** Forecast colour as a dot; reasons and the percentage sit in the hover card. */
export function RiskDot({ result, withWord }) {
    return _jsx("span", { className: "forecast", "data-testid": "forecast", children: _jsx(Hover, { card: _jsxs(_Fragment, { children: [result.reasons.map(r => _jsx("span", { className: "hc-line", children: r }, r)), _jsxs("span", { className: "hc-line muted", children: [Math.round(result.probability * 100), "% of ", result.runs.toLocaleString(), " simulated runs finish on time."] })] }), children: _jsxs("button", { type: "button", className: `risk ${result.color}`, "aria-label": `${RISK_WORD[result.color]}: ${result.reasons.join(" ")}`, children: [_jsx("i", { "aria-hidden": "true", children: _jsx("svg", { viewBox: "0 0 14 14", focusable: "false", children: RISK_SHAPE[result.color] }) }), withWord && _jsx("span", { children: RISK_WORD[result.color] })] }) }) });
}
export function Empty({ children }) {
    return _jsx("p", { className: "empty", children: children });
}
export const firstNameOf = (name) => name ? name.split(" ")[0] : "No owner";
