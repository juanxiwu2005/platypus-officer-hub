import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useStore } from "../../data/store";
import { Empty } from "../ui";
import { KINDS, parseTags } from "../../data/crm";
import { canLead } from "../../data/permissions";
import { fmtShort } from "../../lib/dates";
/** A text field that saves when you leave it (Settings uses the same habit). */
export function Field({ label, value, onSave, disabled, type = "text", placeholder, max = 120, multiline }) {
    const [v, setV] = useState(value);
    useEffect(() => setV(value), [value]);
    const commit = () => { if (v !== value)
        onSave(v); };
    return _jsxs("label", { children: [label, multiline
                ? _jsx("textarea", { rows: 3, value: v, maxLength: max, disabled: disabled, placeholder: placeholder, onChange: e => setV(e.target.value), onBlur: commit })
                : _jsx("input", { type: type, value: v, maxLength: max, disabled: disabled, placeholder: placeholder, onChange: e => setV(e.target.value), onBlur: commit, onKeyDown: e => e.key === "Enter" && e.target.blur() })] });
}
/** Comma-separated tags, saved on blur. */
export function TagsField({ tags, onSave, disabled }) {
    return _jsx(Field, { label: "Tags (comma separated)", value: tags.join(", "), disabled: disabled, max: 200, placeholder: "catering, tempe", onSave: v => onSave(parseTags(v)) });
}
export const kindLabel = (k) => KINDS.find(x => x.id === k)?.label ?? "Other";
/** Add an entry to the shared timeline. Open to every member who can see the contact. */
export function LogForm({ contactId, organizationId, onDone }) {
    const { state, dispatch } = useStore();
    const blank = { kind: "email", date: state.today, summary: "", outcome: "", nextStep: "", nextDue: "", eventId: "" };
    const [f, setF] = useState(blank);
    const set = (patch) => setF({ ...f, ...patch });
    return _jsxs("form", { className: "form-stack crm-log", "aria-label": "Log interaction", onSubmit: e => {
            e.preventDefault();
            dispatch({ type: "logInteraction", input: { contactId, organizationId, date: f.date, kind: f.kind, summary: f.summary, outcome: f.outcome, nextStep: f.nextStep, nextDue: f.nextDue || null, eventId: f.eventId || null } });
            setF(blank);
            onDone();
        }, children: [_jsxs("div", { className: "crm-two", children: [_jsxs("label", { children: ["Kind", _jsx("select", { value: f.kind, onChange: e => set({ kind: e.target.value }), children: KINDS.map(k => _jsx("option", { value: k.id, children: k.label }, k.id)) })] }), _jsxs("label", { children: ["Date", _jsx("input", { type: "date", required: true, max: state.today, value: f.date, onChange: e => set({ date: e.target.value }) })] })] }), _jsxs("label", { children: ["What happened", _jsx("textarea", { required: true, rows: 2, maxLength: 500, value: f.summary, onChange: e => set({ summary: e.target.value }) })] }), _jsxs("label", { children: ["Outcome", _jsx("input", { maxLength: 200, value: f.outcome, placeholder: "e.g. agreed to sponsor $300", onChange: e => set({ outcome: e.target.value }) })] }), _jsxs("div", { className: "crm-two", children: [_jsxs("label", { children: ["Next step", _jsx("input", { maxLength: 200, value: f.nextStep, onChange: e => set({ nextStep: e.target.value }) })] }), _jsxs("label", { children: ["Due", _jsx("input", { type: "date", min: state.today, value: f.nextDue, disabled: !f.nextStep, onChange: e => set({ nextDue: e.target.value }) })] })] }), _jsxs("label", { children: ["Event", _jsxs("select", { value: f.eventId, onChange: e => set({ eventId: e.target.value }), children: [_jsx("option", { value: "", children: "None" }), state.events.map(ev => _jsx("option", { value: ev.id, children: ev.name }, ev.id))] })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { className: "btn btn-primary", type: "submit", children: "Save entry" }), _jsx("button", { className: "btn btn-quiet", type: "button", onClick: onDone, children: "Cancel" })] })] });
}
/** Newest first. Shows who, what, the outcome and the open next step. */
export function Timeline({ items, contacts }) {
    const { state, dispatch } = useStore();
    if (!items.length)
        return _jsx(Empty, { children: "Nothing logged yet." });
    return _jsx("ol", { className: "crm-timeline", "aria-label": "Timeline", children: items.map(i => {
            const by = state.people.find(p => p.id === i.byId)?.name ?? "Someone";
            const who = contacts?.find(c => c.id === i.contactId)?.name;
            const ev = state.events.find(e => e.id === i.eventId);
            const mine = i.byId === state.viewerId;
            return _jsxs("li", { children: [_jsxs("div", { className: "crm-t-head", children: [_jsx("strong", { children: kindLabel(i.kind) }), _jsxs("span", { className: "small muted", children: [fmtShort(i.date), " \u00B7 ", by, who ? ` · ${who}` : ""] })] }), _jsx("p", { children: i.summary }), i.outcome && _jsxs("p", { className: "small", children: [_jsx("span", { className: "muted", children: "Outcome:" }), " ", i.outcome] }), ev && _jsxs("p", { className: "small muted", children: ["Event: ", ev.name] }), i.nextStep && _jsxs("label", { className: "check-label small crm-next", children: [_jsx("input", { type: "checkbox", checked: i.nextDone, onChange: e => dispatch({ type: "updateInteraction", id: i.id, nextDone: e.target.checked }) }), _jsxs("span", { className: i.nextDone ? "muted" : "", children: ["Next: ", i.nextStep, i.nextDue ? ` · by ${fmtShort(i.nextDue)}` : ""] })] }), (mine || canLead(state)) && _jsx("button", { type: "button", className: "btn btn-quiet small", "aria-label": "Delete entry", onClick: () => dispatch({ type: "updateInteraction", id: i.id, delete: true }), children: "Delete" })] }, i.id);
        }) });
}
