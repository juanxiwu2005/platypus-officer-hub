import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { onboardingCopy } from "../copy";
import { useOnboardingDraft } from "../draft";
import { useFlow } from "../engine/useFlow";
import { MAX_TARGET, MIN_TARGET, SUGGESTIONS, clampTarget, goalsError, goalsFrom, rowsFrom } from "./goals/suggestions";
const c = onboardingCopy.founder.goals;
/** A number with - and + buttons, 44px tall. Typing works too; an empty box falls back to the last number when you leave it. */
function Stepper({ name, value, step, disabled, onChange }) {
    const [text, setText] = useState(null);
    return _jsxs("div", { className: "ob-stepper", role: "group", "aria-label": `${name} ${c.target}`, children: [_jsx("button", { type: "button", className: "btn ob-step-btn", "aria-label": `${c.decrease} ${name}`, disabled: disabled || value <= MIN_TARGET, onClick: () => onChange(clampTarget(value - step)), children: "\u2212" }), _jsx("input", { type: "number", inputMode: "numeric", min: MIN_TARGET, max: MAX_TARGET, "aria-label": `${name} ${c.target}`, disabled: disabled, value: text ?? String(value), onChange: e => { setText(e.target.value); if (e.target.value !== "" && Number.isFinite(Number(e.target.value)))
                    onChange(Math.round(Number(e.target.value))); }, onBlur: () => setText(null) }), _jsx("button", { type: "button", className: "btn ob-step-btn", "aria-label": `${c.increase} ${name}`, disabled: disabled || value >= MAX_TARGET, onClick: () => onChange(clampTarget(value + step)), children: "+" })] });
}
/** Screen 3 of the founder flow (skippable): switch on two or three suggested goals and set each target. Written to the draft on Continue. */
export function Goals() {
    const { draft, update } = useOnboardingDraft();
    const flow = useFlow();
    const [rows, setRows] = useState(() => rowsFrom(draft.club.goals));
    const [error, setError] = useState("");
    if (!flow)
        return null;
    const change = (id, patch) => { setError(""); setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r)); };
    const commit = () => update(d => ({ ...d, club: { ...d.club, goals: goalsFrom(rows) } }));
    const next = () => {
        const problem = goalsError(rows, draft.club.mission);
        setError(problem ?? "");
        if (problem)
            return;
        commit();
        flow.next();
    };
    // Back keeps the choices when they are valid; Skip never changes the standard goals.
    const back = () => { if (!goalsError(rows, draft.club.mission))
        commit(); flow.back(); };
    return _jsxs("section", { className: "ob-card ob-goals", "aria-labelledby": "ob-goals-h", children: [_jsxs("div", { className: "ob-gt-head", children: [_jsx("h1", { id: "ob-goals-h", children: c.title }), _jsx("p", { className: "ob-lead", children: c.lead })] }), _jsx("ul", { className: "ob-goal-list", children: SUGGESTIONS.map(s => {
                    const r = rows.find(x => x.id === s.id);
                    return _jsxs("li", { className: `ob-goal${r.on ? " is-on" : ""}`, children: [_jsxs("label", { className: "ob-goal-name", children: [_jsx("input", { type: "checkbox", role: "switch", className: "ob-switch", checked: r.on, onChange: e => change(s.id, { on: e.target.checked }) }), _jsx("span", { children: s.label })] }), _jsxs("div", { className: "ob-goal-set", children: [_jsx(Stepper, { name: s.label, value: r.target, step: s.step, disabled: !r.on, onChange: n => change(s.id, { target: n }) }), _jsx("span", { className: "ob-gt-unit", children: s.unit })] })] }, s.id);
                }) }), _jsxs("details", { className: "ob-mission", children: [_jsx("summary", { children: c.mission }), _jsx("textarea", { "aria-label": c.missionField, rows: 3, maxLength: 300, value: draft.club.mission, onChange: e => update(d => ({ ...d, missionTouched: true, club: { ...d.club, mission: e.target.value } })) })] }), error && _jsx("p", { role: "alert", className: "ob-gt-error", children: error }), _jsxs("div", { className: "ob-gt-nav", children: [_jsx("button", { type: "button", className: "btn", onClick: back, children: onboardingCopy.back }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: next, children: onboardingCopy.next }), _jsxs("div", { className: "ob-gt-skip", children: [_jsx("button", { type: "button", className: "btn btn-quiet", onClick: flow.skip, children: onboardingCopy.skip }), _jsx("p", { className: "ob-gt-hint", children: onboardingCopy.skipHint })] })] })] });
}
