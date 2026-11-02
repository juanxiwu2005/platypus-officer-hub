import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** Line icons (24px grid, stroke = currentColor). */
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const svg = (d) => _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", ...P, children: d });
export const Icons = {
    today: svg(_jsxs(_Fragment, { children: [_jsx("path", { d: "M3 11l9-7 9 7" }), _jsx("path", { d: "M5 10v10h14V10" })] })),
    events: svg(_jsxs(_Fragment, { children: [_jsx("circle", { cx: "5", cy: "12", r: "2" }), _jsx("circle", { cx: "19", cy: "6", r: "2" }), _jsx("circle", { cx: "19", cy: "18", r: "2" }), _jsx("path", { d: "M7 11l10-4M7 13l10 4" })] })),
    tasks: svg(_jsxs(_Fragment, { children: [_jsx("rect", { x: "4", y: "4", width: "16", height: "16", rx: "3" }), _jsx("path", { d: "M8 12l3 3 5-6" })] })),
    team: svg(_jsxs(_Fragment, { children: [_jsx("circle", { cx: "9", cy: "8", r: "3" }), _jsx("circle", { cx: "17", cy: "9", r: "2.5" }), _jsx("path", { d: "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2 1-4 4-4 1.5 0 2 .4 2 .4" })] })),
    funding: svg(_jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "6", width: "18", height: "12", rx: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2.5" }), _jsx("path", { d: "M6 9v.01M18 15v.01" })] })),
    handoff: svg(_jsxs(_Fragment, { children: [_jsx("path", { d: "M4 12h11" }), _jsx("path", { d: "M11 7l5 5-5 5" }), _jsx("path", { d: "M20 4v16" })] })),
    partners: svg(_jsxs(_Fragment, { children: [_jsx("path", { d: "M8 12l-2 2a2.8 2.8 0 104 4l2-2" }), _jsx("path", { d: "M16 12l2-2a2.8 2.8 0 10-4-4l-2 2" }), _jsx("path", { d: "M9 15l6-6" })] })),
    rules: svg(_jsxs(_Fragment, { children: [_jsx("path", { d: "M6 3h9l3 3v15H6z" }), _jsx("path", { d: "M9 10h6M9 14h6M9 18h4" })] })),
    settings: svg(_jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2.1-1.2L14 3h-4l-.5 2.7a7 7 0 00-2.1 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 002.1 1.2L10 21h4l.5-2.7a7 7 0 002.1-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" })] })),
    help: svg(_jsxs(_Fragment, { children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("path", { d: "M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2.5M12 17v.01" })] })),
};
export function Logo() {
    return (_jsxs("svg", { viewBox: "0 0 32 32", "aria-hidden": "true", children: [_jsx("rect", { x: "1", y: "1", width: "30", height: "30", rx: "9", fill: "var(--accent)" }), _jsx("path", { d: "M12 24V8h5.5a5 5 0 0 1 0 10H12", fill: "none", stroke: "var(--on-accent)", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
