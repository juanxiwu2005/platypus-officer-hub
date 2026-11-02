import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { ChannelIcon } from "./invitation/ChannelIcon";
import { fill } from "./invitation/choice";
import { MemberStrip } from "./invitation/MemberStrip";
import { previewPatch, previewProblem } from "./invitation/profile";
import { StepFooter } from "./invitation/StepFooter";
import { usePreview } from "./invitation/usePreview";
const c = onboardingCopy.member.reminders;
const CHOICES = [{ channel: "whatsapp", label: c.whatsapp }, { channel: "sms", label: c.sms }, { channel: "email", label: c.email }];
const TIMES = [{ value: "morning", label: c.morning }, { value: "evening", label: c.evening }];
const needsPhone = (channel) => channel !== "email";
/** Member screen 2: where reminders go and when. The example bubble below shows exactly what one would look like; it sends nothing. */
export function Reminders() {
    const preview = usePreview();
    if (!preview.person)
        return null;
    return _jsx(RemindersForm, { preview: preview, person: preview.person }, preview.person.id);
}
function RemindersForm({ preview, person }) {
    const flow = useFlow();
    const { state, stored, save } = preview;
    const [channel, setChannel] = useState(stored?.channel ?? person.channels[0] ?? "email");
    const [remindAt, setRemindAt] = useState(stored?.remindAt ?? person.remindAt);
    const [phone, setPhone] = useState(stored?.phone ?? person.phone ?? "");
    const [error, setError] = useState("");
    const first = (stored?.name ?? person.name).trim().split(/\s+/)[0] ?? "";
    const remember = (next) => {
        const ch = next.channel ?? channel, at = next.remindAt ?? remindAt, ph = next.phone ?? phone;
        setChannel(ch);
        setRemindAt(at);
        setPhone(ph);
        setError("");
        save({ channel: ch, remindAt: at, phone: needsPhone(ch) && ph.trim() ? ph : undefined });
    };
    return _jsxs("form", { noValidate: true, className: "ob-m-page", onSubmit: event => {
            event.preventDefault();
            const ph = needsPhone(channel) ? phone.trim() : "";
            const problem = previewProblem(state.people, person, previewPatch(person, stored, { channels: [channel], remindAt, phone: ph }));
            if (problem) {
                setError(problem);
                return;
            }
            save({ channel, remindAt, phone: ph || undefined });
            flow?.next();
        }, children: [_jsxs("section", { className: "ob-card ob-m-card", children: [_jsx(MemberStrip, { preview: preview }), _jsx("h1", { id: "ob-m-ch-title", children: c.title }), _jsx("div", { className: "ob-m-opts", role: "radiogroup", "aria-labelledby": "ob-m-ch-title", children: CHOICES.map(o => _jsxs("label", { className: "ob-m-opt", children: [_jsx("input", { type: "radio", name: "channel", value: o.channel, checked: channel === o.channel, onChange: () => remember({ channel: o.channel }) }), _jsx(ChannelIcon, { channel: o.channel }), _jsx("span", { children: o.label })] }, o.channel)) }), needsPhone(channel) && _jsxs("div", { className: "ob-m-phone", "data-testid": "phone-field", children: [_jsxs("label", { className: "field", children: [c.phone, _jsx("input", { type: "tel", inputMode: "tel", autoComplete: "off", placeholder: "480-555-0100", value: phone, "aria-invalid": Boolean(error) || undefined, "aria-describedby": error ? "ob-m-phone-why ob-m-rem-error" : "ob-m-phone-why", onChange: e => remember({ phone: e.target.value }) })] }), _jsx("p", { id: "ob-m-phone-why", className: "small muted", children: c.phoneWhy })] }), _jsx("div", { className: "ob-m-seg", role: "radiogroup", "aria-label": c.timeLabel, children: TIMES.map(o => _jsxs("label", { children: [_jsx("input", { type: "radio", name: "remindAt", value: o.value, checked: remindAt === o.value, onChange: () => remember({ remindAt: o.value }) }), _jsx("span", { children: o.label })] }, o.value)) }), _jsx("p", { className: "small muted", children: c.quiet }), error && _jsx("p", { id: "ob-m-rem-error", role: "alert", className: "ob-m-error", children: error }), _jsxs("div", { className: "ob-m-sample", "data-testid": "sample-reminder", "aria-live": "polite", children: [_jsx("p", { className: "ob-m-sample-tag small muted", children: c.example }), _jsxs("div", { className: `ob-m-bubble is-${channel}`, children: [_jsx(ChannelIcon, { channel: channel }), _jsx("p", { children: fill(c.bubble, { name: first, when: remindAt === "morning" ? c.whenMorning : c.whenEvening }) })] }, `${channel}-${remindAt}`)] })] }), _jsx(StepFooter, { onBack: () => { flow?.back(); } })] });
}
