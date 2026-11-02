import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { MAX_NOTE, readExtra, writeExtra } from "./finish/extra";
import { StepFooter } from "./invitation/StepFooter";
import { usePreview } from "./invitation/usePreview";
const c = onboardingCopy.member.about;
const QUESTIONS = [
    { key: "careerGoal", label: c.goal, tags: c.goalTags }, { key: "interests", label: c.interests, tags: c.interestTags }, { key: "expectations", label: c.expectations, tags: c.expectationTags },
];
/** Member screen 4 (can be skipped): three short questions on one screen. A suggestion chip adds its word; typing works too (up to 500 characters). */
export function About() {
    const preview = usePreview();
    if (!preview.person)
        return null;
    return _jsx(AboutForm, { preview: preview, person: preview.person }, preview.person.id);
}
function AboutForm({ person }) {
    const flow = useFlow();
    const [values, setValues] = useState(() => { const x = readExtra(person.id); return { careerGoal: x?.careerGoal ?? person.careerGoal, interests: x?.interests ?? person.interests, expectations: x?.expectations ?? person.expectations }; });
    const tooLong = QUESTIONS.some(q => values[q.key].length > MAX_NOTE);
    const set = (key, value) => {
        setValues(v => ({ ...v, [key]: value }));
        // Only a value that fits is remembered; a too-long one waits for the visitor to shorten it.
        if (value.length <= MAX_NOTE)
            writeExtra(person.id, { [key]: value });
    };
    const add = (key, tag) => {
        const now = values[key].trim();
        if (now.toLowerCase().split(/[,;]\s*/).includes(tag.toLowerCase()))
            return;
        set(key, now ? `${now}, ${tag}` : tag);
    };
    return _jsxs("form", { noValidate: true, className: "ob-m-page", onSubmit: event => {
            event.preventDefault();
            if (tooLong)
                return;
            writeExtra(person.id, values);
            flow?.next();
        }, children: [_jsxs("section", { className: "ob-card ob-m-card", children: [_jsx("h1", { children: c.title }), _jsx("p", { className: "muted", children: c.why }), QUESTIONS.map(q => _jsxs("div", { className: "ob-m-ask", children: [_jsx("label", { className: "field", htmlFor: `ob-m-${q.key}`, children: q.label }), _jsx("textarea", { id: `ob-m-${q.key}`, rows: 2, value: values[q.key], "aria-invalid": values[q.key].length > MAX_NOTE || undefined, "aria-describedby": values[q.key].length > MAX_NOTE ? "ob-m-about-error" : undefined, onChange: e => set(q.key, e.target.value) }), _jsx("div", { className: "ob-m-chips", role: "group", "aria-label": `${q.label} suggestions`, children: q.tags.map(t => _jsx("button", { type: "button", className: "ob-m-chip", onClick: () => add(q.key, t), children: t }, t)) })] }, q.key)), tooLong && _jsx("p", { id: "ob-m-about-error", role: "alert", className: "ob-m-error", children: c.tooLong }), _jsxs("p", { className: "ob-m-skip", children: [_jsx("button", { type: "button", className: "btn", onClick: () => { writeExtra(person.id, { careerGoal: undefined, interests: undefined, expectations: undefined }); flow?.skip(); }, children: onboardingCopy.skip }), " ", _jsx("span", { className: "small muted", children: onboardingCopy.skipHint })] })] }), _jsx(StepFooter, { onBack: () => { flow?.back(); } })] });
}
