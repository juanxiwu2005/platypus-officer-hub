import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { MemberStrip } from "./invitation/MemberStrip";
import { previewPatch, previewProblem } from "./invitation/profile";
import { StepFooter } from "./invitation/StepFooter";
import { usePreview } from "./invitation/usePreview";
const c = onboardingCopy.member.you;
/** Member screen 1: the name and email are filled in from the officer's record; the visitor only confirms them, or edits. */
export function You() {
    const preview = usePreview();
    if (!preview.person)
        return null;
    return _jsx(YouForm, { preview: preview, person: preview.person }, preview.person.id);
}
function YouForm({ preview, person }) {
    const flow = useFlow();
    const { state, stored, save, setPicking } = preview;
    const [name, setName] = useState(stored?.name ?? person.name);
    const [email, setEmail] = useState(stored?.email ?? person.email);
    const [error, setError] = useState("");
    const edit = (next) => {
        const n = next.name ?? name, e = next.email ?? email;
        setName(n);
        setEmail(e);
        setError("");
        save({ name: n, email: e === person.email ? undefined : e });
    };
    return _jsxs("form", { noValidate: true, className: "ob-m-page", onSubmit: event => {
            event.preventDefault();
            const problem = previewProblem(state.people, person, previewPatch(person, stored, { name, email }));
            if (problem) {
                setError(problem);
                return;
            }
            save({ name: name.trim(), email: email.trim() === person.email ? undefined : email.trim() });
            flow?.next();
        }, children: [_jsxs("section", { className: "ob-card ob-m-card", children: [_jsx(MemberStrip, { preview: preview, note: true }), _jsx("h1", { children: c.title }), _jsxs("div", { className: "ob-m-fields", children: [_jsxs("label", { className: "field", children: [c.name, _jsx("input", { value: name, maxLength: 80, autoComplete: "off", "aria-invalid": Boolean(error) || undefined, "aria-describedby": error ? "ob-m-you-error" : undefined, onChange: e => edit({ name: e.target.value }) })] }), _jsxs("label", { className: "field", children: [c.email, _jsx("input", { type: "email", value: email, autoComplete: "off", "aria-invalid": Boolean(error) || undefined, "aria-describedby": error ? "ob-m-you-error" : undefined, onChange: e => edit({ email: e.target.value }) })] })] }), error && _jsx("p", { id: "ob-m-you-error", role: "alert", className: "ob-m-error", children: error }), _jsx("p", { className: "muted", children: _jsx("button", { type: "button", className: "link", onClick: () => setPicking(true), children: c.notYou }) })] }), _jsx(StepFooter, { onBack: () => { flow?.back(); } })] });
}
