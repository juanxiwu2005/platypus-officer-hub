import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../data/store";
import { fmtLong } from "../lib/dates";
import { RULES } from "../data/rules";
import { safeLink } from "../data/taskWorkflow";
import { TaskActions } from "./TaskActions";
import { StatusPill } from "./ui";
import { canLead } from "../data/changeReview";
import { officialLabel } from "../engine/taskDates";
import { isBudgetControlledNode } from "../engine/eventBudget";
import { useOptionalRail } from "./rail/RailContext";
import { nudgeBlocked } from "../lib/nudges";
const SUBMIT_LINKS = {
    venue: [
        { label: "Submit a Space Request", url: "https://eoss.asu.edu/student-unions/submit-a-space-request" },
        { label: "Mazevo", url: "https://mymazevo.com/" },
        { label: "ASU Space Reservations", url: "https://azstateu.aaiscloud.com/AZStateU/Default.aspx?home" },
    ],
    purchaseRequest: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
    budgetRequest: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
    budgetApproval: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
    purchaseApproval: [{ label: "Sun Devil Central", url: "https://sundevilcentral.eoss.asu.edu/" }],
    sap: [{ label: "Speaker, Artist & Performer Agreements", url: "https://cfo.asu.edu/speaker-artist-performer-agreements" }],
    speakerPacket: [{ label: "Speaker, Artist & Performer Agreements", url: "https://cfo.asu.edu/speaker-artist-performer-agreements" }],
    usgspeaker: [{ label: "Speaker, Artist & Performer Agreements", url: "https://cfo.asu.edu/speaker-artist-performer-agreements" }],
    foodCompliance: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
    quotes: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
    dining: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
    permit: [{ label: "Sun Devil Hospitality Catering", url: "https://sundevilhospitality.asu.edu/catering" }],
    attendance: [{ label: "Business Meals Form", url: "https://eoss.asu.edu/sites/g/files/litvpz141/files/business-meals-form.pdf" }],
};
export function TaskDetail({ node, actorId, token, initialReply }) {
    const { state, dispatch } = useStore();
    const navigate = useNavigate();
    const heading = useRef(null);
    useEffect(() => { heading.current?.focus(); }, [node.id]);
    const pending = state.extensionRequests.find(r => r.nodeId === node.id && r.status === "pending");
    const event = state.events.find(e => e.id === node.eventId);
    const [copied, setCopied] = useState(false);
    const copyEventDetails = async () => { try {
        await navigator.clipboard.writeText(event?.details ?? "");
        setCopied(true);
    }
    catch {
        setCopied(false);
    } };
    const rail = useOptionalRail();
    const directLinks = node.stepKey ? SUBMIT_LINKS[node.stepKey] ?? [] : [];
    const quickLinks = (directLinks.length ? directLinks : node.ruleIds.flatMap(id => RULES.find(rule => rule.id === id)?.sources ?? [])).filter((source, index, all) => all.findIndex(other => other.url === source.url) === index);
    return _jsxs("section", { className: "card task-detail", "aria-label": "Linked task", "data-testid": "task-detail", children: [_jsxs("div", { className: "action-row", children: [_jsx(StatusPill, { status: node.status }), _jsx("span", { className: "small muted", children: state.events.find(e => e.id === node.eventId)?.name ?? "Club task" })] }), _jsx("h2", { ref: heading, tabIndex: -1, children: node.title }), _jsx("p", { children: node.why || "This step supports our club plan." }), _jsxs("p", { className: "small muted", children: ["Owner: ", state.people.find(p => p.id === node.ownerId)?.name ?? "Not assigned"] }), _jsxs("div", { className: "task-dates", children: [_jsxs("div", { children: [_jsx("span", { className: "small muted", children: "Start by" }), _jsx("b", { children: node.latestStart ? fmtLong(node.latestStart) : "Not set" })] }), _jsxs("div", { children: [_jsx("span", { className: "small muted", children: "Club deadline" }), _jsx("b", { children: node.clubDeadline ? fmtLong(node.clubDeadline) : "Not set" })] }), _jsxs("div", { children: [_jsx("span", { className: "small muted", children: officialLabel(node) }), _jsx("b", { children: node.officialDeadline ? fmtLong(node.officialDeadline) : "N/A" })] })] }), node.waitingOn && _jsxs("p", { className: "small warn-text", children: ["Waiting on: ", node.waitingOn] }), node.draftLink && safeLink(node.draftLink) && _jsx("a", { href: node.draftLink, target: "_blank", rel: "noreferrer", children: "Open current draft" }), quickLinks.length > 0 && _jsxs("section", { className: "task-quick-links", "aria-label": "Where to submit", children: [_jsx("b", { children: "Where to submit" }), _jsx("div", { className: "action-row", children: quickLinks.map(source => _jsxs("a", { className: "btn small", href: source.url, target: "_blank", rel: "noreferrer", children: [source.label, " \u2197"] }, source.url)) })] }), node.eventId && isBudgetControlledNode(node) && _jsx("button", { type: "button", className: "btn", onClick: () => navigate(`/events?event=${encodeURIComponent(node.eventId)}&view=budget`), children: "Open Event Budget" }), event && _jsxs("div", { className: "event-copy", children: [_jsx("button", { type: "button", className: "btn", disabled: !event.details?.trim(), onClick: copyEventDetails, children: copied ? "Event details copied" : "Copy All Event Details" }), !event.details?.trim() && _jsx("span", { className: "small muted", children: "Add Event Details first." })] }), rail && node.ownerId && _jsx("button", { type: "button", className: "btn", disabled: !!nudgeBlocked(state, node), title: nudgeBlocked(state, node) ?? "Prepare a reminder", onClick: () => rail.show({ kind: "nudge", id: node.id }), children: "Remind" }), _jsxs("details", { children: [_jsx("summary", { className: "small", children: "Sources and responsibilities" }), _jsxs("p", { className: "small muted", children: [node.source, ". Dates come from the rule engine. Responsible: ", state.people.find(p => p.id === node.ownerId)?.name ?? "not assigned", "; accountable: ", state.roles.find(r => r.id === node.approverRoleId)?.displayName ?? "owner", "."] }), _jsx("div", { className: "action-row", children: node.ruleIds.map(id => { const r = RULES.find(r => r.id === id); return r && _jsx("a", { href: r.sources[0].url, target: "_blank", rel: "noreferrer", children: id }, id); }) })] }), pending && _jsxs("p", { className: "small warn-text", children: ["Extension awaiting review: ", pending.requestedDate, ". The current deadline still applies."] }), _jsx(TaskActions, { node: node, actorId: actorId, token: token, initialReply: initialReply }), !token && canLead(state) && _jsxs("details", { className: "more", children: [_jsx("summary", { children: "Edit" }), _jsxs("div", { className: "form-stack", children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "Task name" }), _jsx("input", { defaultValue: node.title, maxLength: 100, onBlur: e => e.target.value.trim() && e.target.value !== node.title && dispatch({ type: "updateNode", id: node.id, patch: { title: e.target.value } }) })] }), !!state.org.board?.tags?.length && _jsxs("div", { className: "field", children: [_jsx("span", { children: "Tags" }), _jsx("div", { className: "tag-row", children: state.org.board.tags.map(t => { const on = node.tags?.includes(t.id); return _jsx("button", { type: "button", className: "tag-chip tag-toggle", "aria-pressed": on, style: { "--tag": t.color }, onClick: () => dispatch({ type: "updateNode", id: node.id, patch: { tags: on ? (node.tags ?? []).filter(x => x !== t.id) : [...(node.tags ?? []), t.id] } }), children: t.label }, t.id); }) })] }), _jsx("p", { className: "small muted", children: "Owner and due date can be changed in the task table; dates still come from the rule engine." })] })] })] });
}
