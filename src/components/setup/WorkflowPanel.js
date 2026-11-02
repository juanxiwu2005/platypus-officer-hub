import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { addDays } from "../../lib/dates";
import { computeSchedule } from "../../engine/schedule";
import { MAX_STEPS, isLocked, newStepKey, ownerOfStep, removeStep, ruleList, stepsAsNodes } from "../../engine/workflow";
import { roleLabels } from "../../data/structure";
import { MetroChart } from "../flow/MetroChart";
import { moveBetween } from "../../lib/flowEdit";
import { MAX_DAYS, descendantsOf } from "../../lib/stepOrder";
import { WorkflowIssues } from "./WorkflowReview";
import { useRail } from "../rail/RailContext";
/**
 * The club's event workflow on the same chart as a real event's Flow tab: five
 * pre-event routes fan out from Start and meet at Full Check, left to right.
 * Drag a step onto a ◆, double-click a step or a line to add, delete or cut a link. Selecting a step opens its details
 * beside the chart, so workflow timing can be adjusted without losing the graph.
 * Everything is checked by the engine (engine/workflow.ts): steps and links ASU rules need cannot be removed, and a change that breaks one is
 * marked on the chart and has to be fixed before setup continues.
 */
const withEdits = (steps, edits) => {
    const by = new Map(edits.map(e => [e.id, e.patch]));
    return steps.map(s => { const p = by.get(s.key); return p ? { ...s, ...(p.dependsOn ? { dependsOn: p.dependsOn } : {}), ...(p.estDays !== undefined ? { estDays: p.estDays } : {}), ...(p.phase ? { phase: p.phase } : {}) } : s; });
};
const NO_FORECAST = { nodes: {}, events: {} };
export function WorkflowPanel({ state, steps, roles, issues, onChange }) {
    const [selected, setSelected] = useState(null);
    const rail = useRail();
    const label = useMemo(() => roleLabels(roles), [roles]);
    // The workflow shown as a sample event, so the same chart (and the same layout) draws it. Its dates are never shown.
    const sample = useMemo(() => {
        const ev = { id: "wf", name: "Sample event", date: addDays(state.today, 56), type: "social", headcount: 30, venue: "campus", food: "none", funding: "none", speaker: false, checks: {}, goalId: null, playbookId: "asu-event-v2" };
        const s = { ...state, roles, people: [], events: [ev], nodes: stepsAsNodes(steps, "wf") };
        return { s, sched: computeSchedule(s) };
    }, [state.today, steps, roles]);
    const marks = useMemo(() => Object.fromEntries(issues.filter(i => i.key).map(i => [i.key, i.level === "blocked" ? "error" : "warn"])), [issues]);
    const byKey = new Map(steps.map(s => [s.key, s]));
    const ownerName = (key) => { const r = byKey.get(key) && ownerOfStep(byKey.get(key), roles); return r ? label.get(r.id) ?? r.displayName : "No owner"; };
    const port = {
        snapshot: () => structuredClone(steps),
        restore: snap => { onChange(snap); setSelected(null); },
        applyEdits: edits => onChange(withEdits(steps, edits)),
        addStep: (key, uId, vId) => {
            const ref = byKey.get(uId ?? vId ?? "");
            const fresh = { key, title: "New step", fn: ref?.fn ?? "programs", ownerRoleId: ref?.ownerRoleId ?? null, phase: ref?.phase ?? "prepare", estDays: 1, tier: "light", dependsOn: [], why: "Added by the club.", source: "Added in the workflow chart", custom: true };
            const nodes = stepsAsNodes([...steps, fresh], "wf");
            const r = moveBetween(nodes, key, uId, vId);
            onChange(withEdits([...steps, fresh], r.edits));
        },
        removeStep: key => { onChange(removeStep(steps, key)); setSelected(null); },
        newId: () => newStepKey(steps, "new step"),
        template: {
            sublabel: n => ownerName(n.id),
            lines: n => { const s = byKey.get(n.id); return [s?.title ?? n.title, s?.why ?? n.why, `Done by ${ownerName(n.id)}`, `${s?.estDays ?? 0} day${s?.estDays === 1 ? "" : "s"} of work`]; },
            marks,
        },
    };
    const step = selected ? byKey.get(selected) : undefined;
    const selectStep = (id) => { setSelected(id); rail.show({ kind: "workflow" }); };
    const closeStep = () => { setSelected(null); rail.closeDetail(); };
    useEffect(() => {
        if (!step)
            return;
        rail.setWorkflowDetail(_jsx(StepPanel, { step: step, steps: steps, roles: roles, label: label, onChange: onChange, onClose: closeStep }));
        return () => rail.setWorkflowDetail(null);
        // The content deliberately refreshes whenever the editable template changes.
    }, [step, steps, roles, label, onChange]);
    return _jsxs(_Fragment, { children: [_jsx(WorkflowIssues, { issues: issues }), _jsx("p", { className: "small muted", children: "Look at the chart first: it reads left to right in the order the work happens. Drag a step onto a \u25C6 to move it, double-click a step to add or delete one, double-click a line to cut a link. Click a step for its details." }), _jsx("div", { className: "workflow-editor", children: _jsx("div", { className: "workflow-editor-flow", children: _jsx(MetroChart, { state: sample.s, sched: sample.sched, forecast: NO_FORECAST, eventId: "wf", selectedId: selected, onSelect: selectStep, canEdit: true, alwaysEdit: true, port: port }, "wf") }) })] });
}
/** One step's details: name, who does it, days of work, what it waits for. */
function StepPanel({ step, steps, roles, label, onChange, onClose }) {
    const nodes = stepsAsNodes(steps, "wf");
    const set = (p) => onChange(steps.map(s => s.key === step.key ? { ...s, ...p } : s));
    const doers = roles.filter(r => r.fn !== "advisor");
    const owner = ownerOfStep(step, roles);
    const locked = isLocked(step);
    const waits = (step.dependsOn ?? []).map(k => steps.find(s => s.key === k)).filter((x) => !!x);
    const blocked = descendantsOf(nodes, step.key);
    const addable = steps.filter(x => x.key !== step.key && !(step.dependsOn ?? []).includes(x.key) && !blocked.has(x.key));
    return _jsxs("section", { className: "card form-stack wf-detail", "data-testid": "workflow-step-panel", "aria-label": `Details: ${step.title}`, children: [_jsxs("header", { children: [_jsx("h3", { className: "org-h", children: "Step details" }), _jsx("button", { type: "button", className: "btn small btn-quiet", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["Step name", _jsx("input", { type: "text", value: step.title, maxLength: 120, onChange: e => set({ title: e.target.value }) })] }), _jsxs("label", { children: ["Done by", _jsxs("select", { value: owner?.id ?? "", onChange: e => set({ ownerRoleId: e.target.value, fn: roles.find(r => r.id === e.target.value)?.fn ?? step.fn }), children: [!owner && _jsx("option", { value: "", children: "No owner" }), doers.map(r => _jsx("option", { value: r.id, title: r.displayName, children: label.get(r.id) }, r.id))] })] }), _jsxs("label", { children: ["Days of work", _jsx("input", { type: "number", inputMode: "numeric", min: 0, max: MAX_DAYS, value: step.estDays, onChange: e => set({ estDays: Math.max(0, Math.min(MAX_DAYS, Math.round(Number(e.target.value) || 0))) }) })] }), !locked && step.phase !== "close" && _jsxs("label", { children: ["Target timing (days before event)", _jsx("input", { type: "number", inputMode: "numeric", min: 0, max: 180, value: step.anchor?.kind === "target" ? step.anchor.days : "", placeholder: "From dependencies", onChange: e => { const days = e.target.value === "" ? null : Math.max(0, Math.min(180, Math.round(Number(e.target.value) || 0))); set({ anchor: days === null ? undefined : { kind: "target", days, unit: "calendar", label: "Club workflow timing" } }); } })] })] }), _jsxs("label", { children: ["Task description", _jsx("textarea", { rows: 3, maxLength: 400, value: step.why, onChange: e => set({ why: e.target.value }), placeholder: "Explain what this step accomplishes." })] }), locked && _jsxs("p", { className: "small muted", children: ["This step comes from ASU rule ", ruleList(step) || "deadlines", ": it stays, in this phase, with its deadline. You can rename it and change who does it and how long it takes."] }), _jsxs("div", { className: "step-links small", children: [_jsx("span", { className: "muted", children: "Waits for:" }), " ", waits.length === 0 && _jsx("span", { className: "muted", children: "nothing" }), waits.map(w => _jsxs("span", { className: "tag-chip step-chip", children: [w.title, " ", _jsx("button", { type: "button", className: "link", "aria-label": `Remove: ${step.title} no longer waits for ${w.title}`, onClick: () => set({ dependsOn: (step.dependsOn ?? []).filter(d => d !== w.key) }), children: "\u00D7" })] }, w.key)), _jsxs("select", { className: "step-add", "aria-label": `Add a step that ${step.title} waits for`, value: "", onChange: e => { if (e.target.value)
                            set({ dependsOn: [...(step.dependsOn ?? []), e.target.value] }); }, children: [_jsx("option", { value: "", children: "+ Waits for\u2026" }), addable.map(x => _jsx("option", { value: x.key, children: x.title }, x.key))] })] }), !locked && _jsx("div", { className: "action-row", children: _jsx("button", { type: "button", className: "btn small", onClick: () => { onChange(removeStep(steps, step.key)); onClose(); }, disabled: steps.length <= 1 || steps.length > MAX_STEPS + 1, children: "Delete this step" }) })] });
}
