import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHead } from "../components/Page";
import { useStore, useViewer } from "../data/store";
import { useRail } from "../components/rail/RailContext";
import { handoffDates } from "../engine/schedule";
import { handbookSources, sourceFingerprint, sanitizeHandbook, WEEK_ONE } from "../lib/handbook";
import { callApi } from "../lib/api";
import { Feedback } from "../components/Feedback";
import { Avatar, Chain, Empty, Hover, Info, Ring, useStatusStyles, useTouch } from "../components/ui";
import { Bts, BtsRow } from "../components/Bts";
import { fmtShort } from "../lib/dates";
const STEPS = ["Interview", "Handbook", "Confirmed", "Approved", "First week", "Handed over", "Day 30"];
/** Seven checkpoints per role; the ring shows how many are done. */
export function roleProgress(r) {
    if (!r)
        return { done: 0, stage: "Not started" };
    const flags = [r.interview.length > 0, r.entries.length > 0, r.confirmed, r.approved, r.checks.length === WEEK_ONE.length, r.completed, r.reviewed];
    const done = flags.filter(Boolean).length;
    const next = flags.findIndex(f => !f);
    return { done, stage: next < 0 ? "Complete" : STEPS[next] };
}
/** Handoff as a relay (v1.1): one season track and one baton card per role. */
export default function Handoff() {
    const { state, dispatch } = useStore();
    const { canNudge } = useViewer();
    const rail = useRail();
    const statusStyles = useStatusStyles();
    const [from, setFrom] = useState(state.handoff?.from ?? state.today), [to, setTo] = useState(state.handoff?.to ?? handoffDates(state.today).review);
    const start = state.handoff?.from ?? from;
    const d = handoffDates(start);
    const marks = [["Start", start], ["Interview", d.interview], ["Handbook", d.weekOne], ["First week", d.weekTwo], ["Day 30", d.review]];
    const stops = marks.map(([label, date], i) => {
        const next = marks[i + 1]?.[1];
        const state_ = !state.handoff ? "todo" : next && state.today >= next ? "done" : state.today >= date ? "now" : "todo";
        return { key: label, label, state: state_, hint: _jsxs(_Fragment, { children: [_jsx("b", { children: label }), _jsx("span", { className: "hc-line", children: state.handoff ? fmtShort(date) : "Starts when the season starts" })] }) };
    });
    return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/handoff", actions: canNudge && _jsxs("form", { className: "add-row", onSubmit: e => { e.preventDefault(); dispatch({ type: "handoffAction", action: { kind: "start", from, to } }); }, children: [_jsx("input", { type: "date", "aria-label": "Season starts", value: from, onChange: e => setFrom(e.target.value) }), _jsx("span", { className: "small muted", children: "to" }), _jsx("input", { type: "date", "aria-label": "Season ends", value: to, onChange: e => setTo(e.target.value) }), _jsx("button", { className: "btn btn-primary small", disabled: !from || !to || from > to, children: state.handoff ? "Save dates" : "Start handoff season" })] }) }), _jsxs("section", { className: "card season", children: [_jsx(Chain, { label: "Handoff season", stops: stops }), _jsx(BtsRow, { children: _jsx(Bts, { label: "Rule engine", children: "Five checkpoints from the season start date: the interview, handbook, first-week and day-30 dates are worked out from it (handoffDates). A checkpoint is done once the next one's date has come, now once its own date has come." }) })] }), _jsx("section", { className: "relay-grid", "data-testid": "role-handbooks", "aria-label": "Role handbooks", children: state.roles.map(role => {
                    const r = state.handoffRoles.find(x => x.roleId === role.id);
                    const out = state.people.find(p => p.id === (r?.outgoingId ?? role.holderId));
                    const inc = state.people.find(p => p.id === r?.incomingId);
                    const p = roleProgress(r);
                    return _jsxs("button", { type: "button", className: "relay", onClick: () => rail.show({ kind: "handoff", roleId: role.id }), children: [_jsx("span", { className: "relay-role", children: role.displayName }), _jsx("span", { className: "sr-only", children: " handbook " }), _jsxs("span", { className: "relay-people", children: [_jsx(Avatar, { name: out?.name }), _jsx("svg", { viewBox: "0 0 40 12", "aria-hidden": "true", children: _jsx("path", { d: "M2 6h32M28 1l6 5-6 5", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" }) }), _jsx(Avatar, { name: inc?.name, title: inc?.name ?? "Incoming officer not named yet" })] }), _jsxs("span", { className: "relay-foot", children: [_jsx(Ring, { value: p.done, max: 7, size: 34, label: `${p.done} of 7 steps` }), _jsx("span", { className: `pill sm ${p.stage === "Complete" ? "" : "quiet"}`, style: { "--pill": (p.stage === "Complete" ? statusStyles.done : p.done ? statusStyles.accepted : statusStyles.unclaimed).color }, children: p.stage })] })] }, role.id);
                }) })] });
}
/** One role's handbook, Trainual-style: steps with a progress bar, sources on hover. */
export function HandoffRoleDetail({ roleId }) {
    const { state } = useStore();
    const role = state.roles.find(r => r.id === roleId);
    const record = state.handoffRoles.find(r => r.roleId === roleId);
    if (!role)
        return _jsx(Empty, { children: "This role no longer exists." });
    if (!record)
        return _jsxs("section", { className: "form-stack", children: [_jsxs("h2", { children: [role.displayName, " handbook"] }), _jsx("p", { className: "small muted", children: "Start the handoff season to draft this handbook. It will draw on these records:" }), _jsx("ul", { className: "small", children: handbookSources(state, role.id).slice(0, 8).map(s => _jsx("li", { children: s.text }, s.id)) })] });
    return _jsx(RolePanel, { record: record, title: `${role.displayName} handbook` });
}
function RolePanel({ record: r, title }) {
    const touch = useTouch();
    const { state, dispatch } = useStore();
    const { canNudge } = useViewer();
    const self = state.viewerId === r.outgoingId;
    const [interview, setInterview] = useState(r.interview.join("\n")), [name, setName] = useState(`Incoming ${state.roles.find(x => x.id === r.roleId)?.displayName} (example)`), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
    const sources = r.completed ? r.sources : handbookSources(state, r.roleId), fresh = r.fingerprint === sourceFingerprint(sources);
    const act = (action) => dispatch({ type: "handoffAction", action });
    const p = roleProgress(r);
    const start = r.startDate ?? state.handoff.from;
    async function draft() { setBusy(true); setNotice(""); const fingerprint = sourceFingerprint(sources); try {
        if (!state.aiEnabled)
            throw new Error("AI off");
        const result = await callApi("/handbook/draft", { sources: sources.map(({ id, kind, text }) => ({ id, kind, text })) });
        const entries = sanitizeHandbook(result, sources);
        if (!entries.length)
            throw new Error("No sources");
        act({ kind: "draft", roleId: r.roleId, raw: { entries }, fingerprint, model: result.model, source: `AI-selected source extracts · ${result.provider}` });
    }
    catch {
        act({ kind: "draft", roleId: r.roleId, raw: { entries: sources.slice(0, 6).map(s => ({ sourceId: s.id })).concat(sources.filter(s => s.kind === "interview").map(s => ({ sourceId: s.id }))) }, fingerprint, model: null, source: "Example extract draft · live AI unavailable or off" });
        setNotice("Live AI was unavailable or off. This is a labelled example draft.");
    }
    finally {
        setBusy(false);
    } }
    return _jsxs("section", { className: "form-stack handbook", "aria-label": title, children: [_jsx("h2", { children: title }), _jsx("div", { className: "progress-line", children: _jsx("div", { style: { width: `${(p.done / 7) * 100}%` } }) }), _jsxs("p", { className: "small muted", children: [p.done, " of 7 \u00B7 next: ", p.stage, " \u00B7 outgoing ", state.people.find(x => x.id === r.outgoingId)?.name ?? "—"] }), _jsxs("article", { className: "step-card", children: [_jsxs("header", { children: [_jsx("span", { className: "step-n", children: "1" }), _jsx("b", { children: "Outgoing interview" }), _jsx(Info, { children: "Fictional example only. One point per line. Never paste research transcripts or real participant details." })] }), _jsx("textarea", { "aria-label": "Outgoing interview \u00B7 fictional example only", maxLength: 12000, rows: 4, value: interview, disabled: !self || r.completed, onChange: e => setInterview(e.target.value) }), _jsx("button", { className: "btn small", disabled: !self || r.completed, onClick: () => act({ kind: "interview", roleId: r.roleId, lines: interview.split("\n") }), children: "Save example interview" })] }), _jsxs("article", { className: "step-card", children: [_jsxs("header", { children: [_jsx("span", { className: "step-n", children: "2" }), _jsx("b", { children: "Handbook" })] }), _jsx("button", { className: "btn btn-primary", disabled: busy || r.completed || (!self && !canNudge) || interview !== r.interview.join("\n"), onClick: draft, children: busy ? "Drafting from sources…" : "Draft role handbook" }), notice && _jsx("p", { role: "status", className: "small", children: notice }), !!r.entries.length && _jsxs("div", { "data-testid": "handbook-draft", className: "form-stack", children: [_jsxs("p", { className: "small muted", children: [r.source, r.model ? ` · ${r.model}` : ""] }), !fresh && !r.completed && _jsx("p", { className: "warn-text small", children: "Sources changed. Draft again before confirming." }), _jsx("ol", { className: "entries", children: r.entries.map((entry, i) => { const source = sources.find(s => s.id === entry.sourceId); return _jsxs("li", { children: [_jsx("span", { children: entry.text }), " ", _jsxs("details", { className: "src", children: [_jsxs("summary", { children: ["Source ", i + 1, ": ", entry.sourceId] }), _jsx("blockquote", { children: source?.text ?? entry.text }), source?.nodeId && _jsx(Link, { to: `/tasks?node=${encodeURIComponent(source.nodeId)}`, children: "Open task record" })] })] }, entry.sourceId); }) }), _jsx(Feedback, { id: `handbook:${r.roleId}:${r.fingerprint}`, text: r.entries.map(e => e.text).join("\n") })] })] }), _jsxs("article", { className: "step-card", children: [_jsxs("header", { children: [_jsx("span", { className: "step-n", children: "3" }), _jsx("b", { children: "Sign-off" })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { className: "btn", disabled: !self || !fresh || r.confirmed || !r.entries.length, onClick: () => act({ kind: "confirm", roleId: r.roleId }), children: r.confirmed ? "Outgoing officer confirmed" : "Confirm as outgoing officer" }), _jsx("button", { className: "btn", disabled: !canNudge || !r.confirmed || !fresh || r.approved, onClick: () => act({ kind: "approve", roleId: r.roleId }), children: r.approved ? "President approved" : "Approve as president" })] })] }), _jsxs("article", { className: "step-card", children: [_jsxs("header", { children: [_jsx("span", { className: "step-n", children: "4" }), _jsx("b", { children: "First week" }), _jsxs("span", { className: "small muted", children: [r.checks.length, "/", WEEK_ONE.length] })] }), WEEK_ONE.map(item => _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", disabled: r.completed || !r.approved || (!self && !canNudge && state.viewerId !== r.incomingId), checked: r.checks.includes(item.id), onChange: () => act({ kind: "check", roleId: r.roleId, itemId: item.id }) }), touch ? _jsxs(_Fragment, { children: [_jsx("span", { className: "small", children: item.text }), _jsx(Info, { label: `Where "${item.text}" comes from`, children: item.source })] }) : _jsx(Hover, { card: item.source, children: _jsx("span", { className: "small", children: item.text }) })] }, item.id)), _jsx(BtsRow, { children: _jsx(Bts, { label: "Source", children: [...new Set(WEEK_ONE.map(item => item.source))].join(" · ") }) })] }), _jsxs("article", { className: "step-card", children: [_jsxs("header", { children: [_jsx("span", { className: "step-n", children: "5" }), _jsx("b", { children: "Hand over" })] }), !r.completed ? _jsxs(_Fragment, { children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "Incoming fictional officer name" }), _jsx("input", { maxLength: 80, value: name, onChange: e => setName(e.target.value) })] }), _jsx("button", { className: "btn btn-primary", disabled: !canNudge || !r.approved || r.checks.length !== WEEK_ONE.length || !name.trim(), onClick: () => act({ kind: "complete", roleId: r.roleId, incomingName: name }), children: "Finish role handoff" }), _jsx("p", { className: "small muted", children: "Moves the role, open tasks and contacts to the new fictional officer. Nothing is sent." })] }) : _jsxs("p", { className: "good-text small", children: ["Handed to ", state.people.find(p => p.id === r.incomingId)?.name, "."] }), _jsxs("label", { className: "field", children: [_jsx("span", { children: "Role handoff starts" }), _jsx("input", { type: "date", disabled: !canNudge || r.completed, value: start, onChange: e => act({ kind: "roleDate", roleId: r.roleId, date: e.target.value }) })] }), _jsx("button", { className: "btn", disabled: !r.completed || r.reviewed || state.today < handoffDates(start).review || (!canNudge && state.viewerId !== r.incomingId), onClick: () => act({ kind: "review", roleId: r.roleId }), children: r.reviewed ? "Day-30 review recorded" : `Record day-30 review (${fmtShort(handoffDates(start).review)})` })] })] });
}
