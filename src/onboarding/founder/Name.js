import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Info } from "../../components/ui";
import { useStore } from "../../data/store";
import { onboardingCopy } from "../copy";
import { useOnboardingDraft } from "../draft";
import { useFlow } from "../engine/useFlow";
const text = onboardingCopy.founder.name;
const MAX_NAME = 80;
/** Screen 1 of the founder flow: the club's name (required). The school is fixed. The small preview shows the name as it will appear. */
export function Name() {
    const { draft, update } = useOnboardingDraft();
    const { state } = useStore();
    const flow = useFlow();
    const name = draft.club.name;
    const ready = name.trim().length > 0;
    const school = state.org.school;
    return _jsxs("section", { className: "ob-card ob-name-grid ob-name", "aria-labelledby": "ob-name-h", children: [_jsxs("form", { className: "ob-name-main", onSubmit: event => { event.preventDefault(); if (ready)
                    flow?.next(); }, children: [_jsx("h1", { id: "ob-name-h", children: text.title }), _jsxs("label", { className: "field", children: [text.field, _jsx("input", { value: name, maxLength: MAX_NAME, required: true, autoComplete: "off", onChange: event => update(d => ({ ...d, club: { ...d.club, name: event.target.value } })) })] }), _jsxs("p", { className: "ob-name-school", children: [_jsxs("span", { className: "sr-only", children: [text.schoolLabel, ": "] }), _jsx("b", { children: school }), _jsx(Info, { label: text.schoolLabel, children: text.schoolWhy })] }), _jsx("div", { className: "ob-actions", children: _jsx("button", { type: "submit", className: "btn btn-primary", disabled: !ready, children: onboardingCopy.next }) })] }), _jsxs("aside", { className: "ob-name-preview", "aria-hidden": "true", "data-testid": "name-preview", children: [_jsx("small", { children: text.preview }), _jsx("strong", { className: ready ? "" : "is-empty", children: ready ? name.trim() : text.placeholder }), _jsx("span", { children: school })] })] });
}
