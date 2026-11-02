import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useStore, useSchedule } from "../data/store";
import { RULES } from "../data/rules";
import { PHASE_LABEL } from "../engine/playbooks";
import { fmtLong } from "../lib/dates";
import { SEVERITY_TONE } from "../pages/helpers";
import { StatusPill, useTouch } from "./ui";
import { useOptionalRail } from "./rail/RailContext";
import { canLead } from "../data/changeReview";
import { officialLabel } from "../engine/taskDates";
const RULE_BY_ID = Object.fromEntries(RULES.map(r => [r.id, r]));
const TIER_LABEL = { light: "Light", medium: "Medium", heavy: "Heavy" };
/** Side panel for one step: owner, three deadlines with their sources, effort, links, RACI, why. */
export function NodePanel({ nodeId, onClose, onSelect }) {
    // On a phone the card with the ASU deadline and rule IDs does not exist, so the panel shows that part already open.
    const touch = useTouch();
    const { state, dispatch } = useStore();
    const sched = useSchedule();
    const n = state.nodes.find(x => x.id === nodeId);
    const p = sched.nodes[nodeId];
    const heading = useRef(null);
    const rail = useOptionalRail();
    useEffect(() => {
        heading.current?.focus();
    }, [nodeId]);
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    if (!n || !p)
        return null;
    // store.updateNode drops the patch unless the viewer leads, so the controls say so instead of
    // swallowing the edit. Same wording and shape as ChangeCard, the one place that already did this.
    const lead = canLead(state);
    const update = (patch) => dispatch({ type: "updateNode", id: n.id, patch });
    const upstream = state.nodes.filter(x => n.dependsOn.includes(x.id));
    const downstream = state.nodes.filter(x => x.dependsOn.includes(n.id));
    const owner = state.people.find(x => x.id === n.ownerId);
    const event = state.events.find(x => x.id === n.eventId);
    const [copied, setCopied] = useState(false);
    const toggle = (list, id) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    return (_jsxs("aside", { className: "panel", role: "dialog", "aria-labelledby": "panel-title", "data-testid": "node-panel", children: [_jsxs("div", { className: "panel-head", children: [_jsx("div", { className: "eyebrow", children: n.phase ? PHASE_LABEL[n.phase] : "Task" }), _jsx("button", { type: "button", className: "btn btn-quiet panel-close", onClick: onClose, "aria-label": "Close panel", children: "\u2715" })] }), _jsx("h2", { id: "panel-title", ref: heading, tabIndex: -1, children: n.title }), p.issues.length > 0 && (_jsx("ul", { className: "issues", "data-testid": "node-issues", children: p.issues.map(i => _jsx("li", { className: `issue ${SEVERITY_TONE[i.severity]}`, children: i.text }, i.code)) })), _jsxs("div", { className: "kv", children: [lead && _jsxs(_Fragment, { children: [_jsx("span", { children: "Name" }), _jsx("input", { type: "text", defaultValue: n.title, maxLength: 100, "aria-label": "Step name", "data-testid": "step-name", onBlur: e => { const t = e.target.value.trim(); if (t && t !== n.title)
                                    update({ title: t });
                                else
                                    e.target.value = n.title; }, onKeyDown: e => { if (e.key === "Enter")
                                    e.currentTarget.blur(); } }, `${n.id}:${n.title}`)] }), _jsx("span", { children: "Owner" }), _jsxs("select", { value: n.ownerId ?? "", disabled: !lead, onChange: e => update({ ownerId: e.target.value || null }), "data-testid": "owner-select", "aria-label": "Owner (R)", children: [_jsx("option", { value: "", children: "No owner" }), state.people.map(x => _jsxs("option", { value: x.id, children: [x.name, " \u00B7 ", state.roles.find(r => r.id === x.roleId)?.displayName] }, x.id))] }), _jsx("span", { children: "Status" }), _jsxs("span", { children: [_jsx(StatusPill, { status: n.status }), n.waitingOn && _jsxs("span", { className: "small muted", children: [" \u00B7 ", n.waitingOn] })] }), _jsx("span", { children: "Start by" }), _jsx("b", { "data-testid": "dl-start", children: fmtLong(p.latestStart) }), _jsx("label", { htmlFor: "club-date", children: "Club deadline" }), _jsxs("span", { className: "dl-date", children: [_jsx("input", { id: "club-date", type: "date", value: p.club, disabled: !lead, "data-testid": "club-input", onChange: e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && update({ clubDeadlineOverride: e.target.value }) }), n.clubDeadlineOverride && _jsxs("button", { type: "button", className: "btn btn-quiet small", disabled: !lead, onClick: () => update({ clubDeadlineOverride: null }), children: ["Use recommended (", fmtLong(p.recommendedClub), ")"] })] }), _jsx("span", { children: officialLabel(n) }), _jsx("b", { "data-testid": "dl-official", children: p.official ? fmtLong(p.official) : "None" }), _jsx("span", { children: "Materials" }), _jsx("span", { children: n.draftLink && /^https?:\/\//.test(n.draftLink) ? _jsx("a", { href: n.draftLink, target: "_blank", rel: "noreferrer", children: "Open link \u2197" }) : _jsx("span", { className: "muted small", children: "None yet" }) })] }), !lead && _jsx("p", { className: "small muted", children: "The president or VP approves changes." }), owner && n.status === "unclaimed" && _jsxs("p", { className: "small muted", children: [owner.name.split(" ")[0], " confirms with \u201CI've got it\u201D."] }), rail && _jsx("button", { type: "button", className: "btn", onClick: () => rail.ask("Explain this step: what should happen next?", true), children: "Ask AI about this step" }), event && _jsx(EventDetailsCopy, { text: event.details ?? "", copied: copied, onCopied: setCopied }), _jsxs("details", { className: "more", open: touch || undefined, children: [_jsx("summary", { children: "More" }), _jsxs("section", { className: "panel-sec", "aria-labelledby": "dl-h", children: [_jsx("h3", { id: "dl-h", children: "Why these dates" }), _jsxs("p", { className: "small", children: [_jsx("b", { children: "Start by:" }), " ", n.ownerId === state.viewerId ? p.explain.latestStart : "Working days before the club deadline, allowing for effort and private planning preferences; skips ASU nonworking days."] }), _jsxs("p", { className: "small", children: [_jsx("b", { children: "Club deadline:" }), " ", p.explain.club] }), _jsxs("p", { className: "small", children: [_jsx("b", { children: "ASU deadline:" }), " ", p.explain.official ?? "No ASU rule sets a deadline for this step. Its dates come from the club's timing and the steps after it."] })] }), _jsxs("section", { className: "panel-sec", "aria-labelledby": "who-h", children: [_jsx("h3", { id: "who-h", children: "Who else" }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "Approver (A)" }), _jsxs("select", { value: n.approverRoleId ?? "", disabled: !lead, onChange: e => update({ approverRoleId: e.target.value || null }), children: [_jsx("option", { value: "", children: "Nobody" }), state.roles.map(r => _jsx("option", { value: r.id, children: r.displayName }, r.id))] })] }), _jsxs("fieldset", { className: "field", children: [_jsx("legend", { children: "Consulted (C)" }), _jsx("div", { className: "checks", children: state.roles.map(r => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: n.consultedRoleIds.includes(r.id), disabled: !lead, onChange: () => update({ consultedRoleIds: toggle(n.consultedRoleIds, r.id) }) }), " ", r.displayName] }, r.id)) })] }), _jsxs("fieldset", { className: "field", children: [_jsx("legend", { children: "Informed (I)" }), _jsx("div", { className: "checks", children: state.roles.map(r => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: n.informedRoleIds.includes(r.id), disabled: !lead, onChange: () => update({ informedRoleIds: toggle(n.informedRoleIds, r.id) }) }), " ", r.displayName] }, r.id)) })] })] }), _jsxs("section", { className: "panel-sec", "aria-labelledby": "work-h", children: [_jsx("h3", { id: "work-h", children: "Work" }), _jsxs("label", { className: "field", children: [_jsxs("span", { children: ["Effort (working days) \u00B7 ", TIER_LABEL[n.tier]] }), _jsx("input", { type: "number", min: 0, max: 30, value: n.estDays, disabled: !lead, onChange: e => update({ estDays: Number(e.target.value) }), "data-testid": "effort-input" })] }), _jsx(DeferredText, { label: "Why it matters", value: n.why, multiline: true, disabled: !lead, onCommit: v => update({ why: v }) }), _jsx(DeferredText, { label: "Draft or materials link", value: n.draftLink ?? "", type: "url", placeholder: "https://drive.google.com/\u2026", disabled: !lead, onCommit: v => update({ draftLink: v.trim() || null }) }), _jsxs("p", { className: "small muted", children: ["Source: ", n.source] })] }), (upstream.length > 0 || downstream.length > 0) && (_jsxs("section", { className: "panel-sec", "aria-labelledby": "links-h", children: [_jsx("h3", { id: "links-h", children: "Links" }), upstream.length > 0 && _jsx("div", { className: "small muted", children: "Waits for" }), _jsx("ul", { className: "link-list", children: upstream.map(u => _jsx("li", { children: _jsx("button", { type: "button", className: "link", onClick: () => onSelect(u.id), children: u.title }) }, u.id)) }), downstream.length > 0 && _jsx("div", { className: "small muted", children: "Then" }), _jsx("ul", { className: "link-list", children: downstream.map(u => _jsx("li", { children: _jsx("button", { type: "button", className: "link", onClick: () => onSelect(u.id), children: u.title }) }, u.id)) })] })), n.ruleIds.length > 0 && (_jsxs("section", { className: "panel-sec", "aria-labelledby": "rules-h", children: [_jsx("h3", { id: "rules-h", children: "ASU rules" }), _jsx("ul", { className: "list", children: n.ruleIds.map(id => {
                                    const r = RULE_BY_ID[id];
                                    return r ? (_jsxs("li", { className: "block", children: [_jsx("span", { className: "rule-id", children: id }), " ", _jsx("span", { className: "small", children: r.text }), _jsx("div", { className: "small muted", children: r.sources.map((s, i) => _jsxs("span", { children: [i > 0 && " · ", _jsx("a", { href: s.url, target: "_blank", rel: "noreferrer", children: s.label })] }, s.url)) })] }, id)) : null;
                                }) })] }))] })] }));
}
function EventDetailsCopy({ text, copied, onCopied }) {
    const copy = async () => { try {
        await navigator.clipboard.writeText(text);
        onCopied(true);
    }
    catch {
        onCopied(false);
    } };
    return _jsxs("div", { className: "event-copy", children: [_jsx("button", { type: "button", className: "btn", disabled: !text.trim(), onClick: copy, children: copied ? "Event details copied" : "Copy All Event Details" }), !text.trim() && _jsx("span", { className: "small muted", children: "Add Event Details first." })] });
}
/** A text field that saves when you leave it, so typing does not reschedule on every key. */
function DeferredText({ label, value, onCommit, multiline, type = "text", placeholder, disabled }) {
    const [v, setV] = useState(value);
    useEffect(() => setV(value), [value]);
    const commit = () => v !== value && onCommit(v);
    return (_jsxs("label", { className: "field", children: [_jsx("span", { children: label }), multiline
                ? _jsx("textarea", { value: v, rows: 3, disabled: disabled, onChange: e => setV(e.target.value), onBlur: commit })
                : _jsx("input", { type: type, value: v, placeholder: placeholder, disabled: disabled, onChange: e => setV(e.target.value), onBlur: commit })] }));
}
