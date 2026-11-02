import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useStore } from "../data/store";
import { Empty } from "./ui";
/** The reusable source text for external forms and browser assistants. */
export function EventDetail({ eventId }) {
    const { state, dispatch } = useStore();
    const event = state.events.find(item => item.id === eventId);
    const [details, setDetails] = useState(event?.details ?? "");
    const [saved, setSaved] = useState(false);
    useEffect(() => { setDetails(event?.details ?? ""); setSaved(false); }, [event?.id, event?.details]);
    if (!event)
        return _jsx(Empty, { children: "This event no longer exists." });
    const save = () => {
        const next = details.trim();
        if (next !== (event.details ?? ""))
            dispatch({ type: "updateEvent", id: event.id, patch: { details: next } });
        setSaved(true);
    };
    return _jsxs("section", { className: "event-detail", "aria-label": "Event details", children: [_jsx("h2", { children: event.name }), _jsx("p", { className: "small muted", children: "Shared event information for forms, collaborators and browser assistants." }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "Event Details" }), _jsx("textarea", { rows: 16, maxLength: 5000, value: details, placeholder: "Describe the event, agenda, audience, venue needs, partners, supplies, accessibility needs, and anything a form or assistant should know.", onChange: e => { setDetails(e.target.value); setSaved(false); }, onBlur: save })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: save, children: "Save details" }), saved && _jsx("span", { className: "small good-text", children: "Saved" })] })] });
}
