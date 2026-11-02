import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Feedback } from "./Feedback";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
import { makeOfficerGrant, officerUrl, usableGrant, grantToken } from "../lib/officerLinks";
import { callApi } from "../lib/api";
import { buildNudge, composeUrl, messageText, nudgeBlocked, STATUS_ACTIONS } from "../lib/nudges";
const CHANNEL_LABEL = { whatsapp: "WhatsApp", sms: "Text message", email: "Gmail" };
export function NudgeComposer({ nodeId, onClose }) {
    const { state, dispatch } = useStore();
    const canNudge = state.people.some(person => person.id === state.viewerId);
    const node = state.nodes.find(n => n.id === nodeId);
    const person = state.people.find(p => p.id === node?.ownerId);
    const [channel, setChannel] = useState(person?.channels[0] ?? "whatsapp");
    const [meaning, setMeaning] = useState();
    const [busy, setBusy] = useState(false);
    const [source, setSource] = useState("Checked template");
    const [openedText, setOpenedText] = useState(null);
    const [confirmed, setConfirmed] = useState(false);
    const [grant, setGrant] = useState(null);
    const [linkError, setLinkError] = useState("");
    const heading = useRef(null);
    useEffect(() => { heading.current?.focus(); }, []);
    useEffect(() => {
        let current = true;
        setGrant(null);
        setLinkError("");
        if (!canNudge || !node?.ownerId || node.status === "done")
            return;
        makeOfficerGrant(state, node.id).then(g => { if (current) {
            dispatch({ type: "issueOfficerGrant", grant: g });
            setGrant(g);
        } }).catch(() => { if (current)
            setLinkError("Could not prepare a task link. Close and reopen this draft."); });
        return () => { current = false; };
    }, [nodeId, node?.ownerId, node?.ownerVersion, node?.status, state.today, state.demoLinkKey, canNudge]);
    useEffect(() => {
        const esc = (e) => { if (e.key === "Escape")
            onClose(); };
        window.addEventListener("keydown", esc);
        return () => window.removeEventListener("keydown", esc);
    }, [onClose]);
    useEffect(() => {
        let current = true;
        setBusy(false);
        setMeaning(undefined);
        if (!state.aiEnabled || !canNudge || !node || nudgeBlocked(state, node))
            return;
        setBusy(true);
        const downstream = state.nodes.find(n => n.dependsOn.includes(node.id) && n.status !== "done");
        callApi("/nudge/draft", { node: { id: node.id, title: node.title, tier: node.tier, estDays: node.estDays, lastUpdate: node.lastUpdate, latestStart: node.latestStart, clubDeadline: node.clubDeadline, officialDeadline: node.officialDeadline }, downstream: downstream ? { title: downstream.title, latestStart: downstream.latestStart } : null, today: state.today, remindAt: person?.remindAt, mission: state.org.mission })
            .then(result => { if (current) {
            setMeaning(result.whyItMatters);
            setSource("AI + checked template");
        } })
            .catch(() => { if (current)
            setSource("Checked template · AI unavailable"); })
            .finally(() => { if (current)
            setBusy(false); });
        return () => { current = false; };
        // Rebuild on task changes, so an old response cannot overwrite a newer task.
    }, [node, state.aiEnabled, canNudge, state.today, person?.remindAt, state.org.mission]);
    if (!node || !person)
        return null;
    const blocked = !canNudge ? "Choose a current officer before preparing a reminder." : nudgeBlocked(state, node);
    const draft = buildNudge(state, node, state.aiEnabled ? meaning : undefined);
    const message = messageText(draft, window.location.origin, node.id, grant ?? undefined);
    const url = composeUrl(channel, message, draft.subject);
    const ready = !blocked && draft.checked && !busy && !confirmed && !!grant && !!usableGrant(state, grantToken(grant));
    return _jsxs("aside", { className: "panel nudge-panel", role: "dialog", "aria-labelledby": "nudge-heading", "data-testid": "nudge-panel", children: [_jsxs("div", { className: "panel-head", children: [_jsx("span", { className: "eyebrow", children: "Private reminder \u00B7 review first" }), _jsx("button", { className: "btn btn-quiet", "aria-label": "Close reminder", onClick: onClose, children: "\u2715" })] }), _jsx("h2", { id: "nudge-heading", tabIndex: -1, ref: heading, children: person.name }), _jsxs("p", { className: "small muted", children: [state.aiEnabled ? source : "Checked template · AI off", " \u00B7 ", draft.wordCount, "/100 words \u00B7 ", draft.checked ? "Wording checked" : "Needs review"] }), _jsxs("label", { className: "composer-channel", children: ["Preferred channel", _jsx("select", { value: channel, onChange: e => { setChannel(e.target.value); setOpenedText(null); }, children: [...new Set([...person.channels, "whatsapp", "sms", "email"])].map(c => _jsxs("option", { value: c, children: [CHANNEL_LABEL[c], c === person.channels[0] ? " · preferred" : ""] }, c)) })] }), _jsxs("p", { className: "small muted", children: ["Preferred time: ", person.remindAt === "evening" ? "evening, around 7 pm" : "morning, around 9 am", ". Keep messages between 8 am and 10 pm."] }), _jsx("b", { children: draft.subject }), _jsx("div", { className: "nudge-body", "data-testid": "nudge-body", children: draft.body }), _jsx(Feedback, { id: `nudge:${nodeId}:${draft.body}`, text: draft.body }), _jsx("div", { className: "status-actions", "aria-label": "Recipient status choices", children: STATUS_ACTIONS.map(a => grant ? _jsx(Link, { className: "btn small", to: officerUrl("", grant, a.key).slice(2), onClick: onClose, children: a.label }, a.key) : _jsx("button", { className: "btn small", disabled: true, children: a.label }, a.key)) }), _jsx("p", { className: "small muted", children: "One-use task links. Local demo: use the browser where the draft was created." }), linkError && _jsx("p", { className: "small late-text", role: "alert", children: linkError }), _jsxs("details", { children: [_jsx("summary", { className: "small", children: "Sources & task details" }), _jsxs("p", { className: "small", children: ["Latest task update: ", node.lastUpdate ?? "not recorded", ". Dates and waiting steps come from the rule engine. ", node.ruleIds.join(", ") || node.source, "."] }), _jsx(Link, { to: `/tasks?node=${encodeURIComponent(node.id)}`, onClick: onClose, children: "Open this task" })] }), blocked && _jsx("p", { className: "small warn-text", role: "status", children: blocked }), confirmed ? _jsx("p", { className: "small good-text", role: "status", children: "Recorded as sent by you. The app cannot verify delivery." }) : _jsxs(_Fragment, { children: [ready ? _jsxs("a", { className: "btn btn-primary", href: url, target: channel === "sms" ? undefined : "_blank", rel: "noreferrer", onClick: () => setOpenedText(message), children: ["Open ", CHANNEL_LABEL[channel], " draft"] }) : _jsx("button", { className: "btn", disabled: true, children: busy ? "Checking draft…" : "Draft unavailable" }), _jsx("p", { className: "small muted", children: "Demo: recipient is blank. Select a test destination yourself. Opening a draft does not record it as sent." }), openedText === message && ready && _jsx("button", { className: "btn", onClick: () => { dispatch({ type: "confirmNudgeSent", nodeId: node.id, channel, text: message }); setConfirmed(true); }, children: "I sent this reminder" })] })] });
}
