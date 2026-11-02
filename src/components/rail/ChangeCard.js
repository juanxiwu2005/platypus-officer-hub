import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../data/store";
import { commandContext, humanEventDate, opLabel, TIERS } from "../../lib/commands";
import { canApplyOp, notAllowedText, validateReview } from "../../data/changeReview";
import { defaultTaskDue } from "../../engine/taskDates";
import { TaskDueFields } from "./TaskFields";
import { Feedback } from "../Feedback";
import { RULES } from "../../data/rules";
import { useRail } from "./RailContext";
/** A change set inside the Ask panel. Each item is checked, edited and approved one by one (plan §8). */
export function ChangeCard({ id }) {
    const { state } = useStore();
    const rail = useRail();
    const change = state.changeSets.find(c => c.id === id);
    if (!change)
        return _jsx("p", { className: "small muted", children: "This draft was cleared by Reset demo." });
    return _jsx(ChangeReview, { change: change, onNudge: nodeId => rail.show({ kind: "nudge", id: nodeId }) });
}
/** Small edits the assistant already made, with one Undo for the whole set. */
export function AppliedCard({ id }) {
    const { state, dispatch } = useStore();
    const change = state.changeSets.find(c => c.id === id);
    if (!change)
        return _jsx("p", { className: "small muted", children: "This change was cleared by Reset demo." });
    const ctx = commandContext(state);
    const done = change.reviews?.some(r => r === "applied");
    return _jsxs("section", { className: "change-set applied", "aria-label": "Changes made", "data-testid": "applied-set", children: [_jsxs("header", { children: [_jsx("b", { children: change.undone ? "Undone" : done ? "Done" : "Not changed" }), done && !change.undone && _jsx("button", { type: "button", className: "btn small", onClick: () => dispatch({ type: "undoAuto", id }), "data-testid": "undo-auto", children: "Undo" })] }), _jsx("ul", { className: "applied-list", children: change.ops.map((op, i) => _jsxs("li", { className: change.reviews?.[i] === "applied" ? "" : "muted", children: [_jsx("span", { "aria-hidden": "true", children: change.reviews?.[i] === "applied" ? (change.undone ? "↺" : "✓") : "–" }), " ", opLabel(op, ctx), change.notes?.[i] && _jsxs("span", { className: "small muted", children: [" \u00B7 ", change.notes[i]] })] }, i)) })] });
}
function ChangeReview({ change, onNudge }) {
    return _jsxs("section", { className: "change-set", "aria-label": "Change set", "data-testid": "change-set", children: [_jsxs("header", { children: [_jsx("b", { children: "Review changes" }), _jsx("span", { className: "tag", children: change.status === "pending" ? "Awaiting review" : "Done" })] }), _jsx("p", { className: "small muted", children: change.source }), change.ops.map((op, index) => _jsx(ChangeItem, { change: change, initial: op, index: index, onNudge: onNudge }, index))] });
}
function ChangeItem({ change, initial, index, onNudge }) {
    const { state, dispatch } = useStore();
    const navigate = useNavigate();
    const rail = useRail();
    const [op, setOp] = useState(initial);
    const canNudge = canApplyOp(state, initial);
    // Dates come only from the original human sentence, the club's task length setting, or this form — never the AI.
    const [date, setDate] = useState(humanEventDate(change.sentence, state.today) || (initial.op === "add_node" && !initial.eventId ? defaultTaskDue(state) : ""));
    const [buffered, setBuffered] = useState(true);
    const [error, setError] = useState("");
    const review = change.reviews?.[index] ?? "pending";
    const pending = review === "pending";
    const ownerSelect = (ownerId, update) => _jsxs("label", { children: ["Owner", _jsxs("select", { "aria-label": "Owner", value: ownerId ?? "", onChange: e => update(e.target.value || null), children: [_jsx("option", { value: "", children: "No owner" }), state.people.map(p => _jsx("option", { value: p.id, children: p.name }, p.id))] })] });
    const nodeSelect = (value, update, label = "Task") => _jsxs("label", { children: [label, _jsx("select", { "aria-label": label, value: value, onChange: e => update(e.target.value), children: state.nodes.map(n => _jsxs("option", { value: n.id, children: [n.title, " \u00B7 ", state.events.find(ev => ev.id === n.eventId)?.name ?? "Standalone"] }, n.id)) })] });
    const tierSelect = (tier, update) => _jsxs("label", { children: ["Difficulty", _jsx("select", { "aria-label": "Difficulty", value: tier, onChange: e => update(e.target.value), children: TIERS.map(t => _jsx("option", { children: t }, t)) })] });
    function apply() {
        const problem = validateReview(state, op, { date, buffered });
        if (problem) {
            setError(problem);
            return;
        }
        dispatch({ type: "reviewChange", id: change.id, index, decision: "applied", op, human: { date, buffered } });
        setError("");
        if (op.op === "propose_nudge")
            onNudge(op.nodeId);
        if (op.op === "create_event")
            setTimeout(() => {
                navigate(`/events?event=${encodeURIComponent(`${change.id}:${index}`)}`);
                rail.requestReview(`${change.id}:${index}`);
            }, 0);
    }
    return _jsxs("article", { className: "change-item", "data-testid": "change-item", children: [_jsx("b", { children: opLabel(pending ? op : initial, commandContext(state)) }), op.op === "answer_question" ? _jsxs(_Fragment, { children: [_jsx("p", { children: op.answer }), _jsxs("details", { children: [_jsx("summary", { children: "Sources checked" }), _jsx("p", { className: "small muted", children: "The cited records from the checked rule book; source pages were not re-fetched during this answer." }), op.citations.map(id => { const r = RULES.find(r => r.id === id); return _jsxs("div", { children: [_jsxs("b", { children: [id, " \u00B7 checked ", r.checkedOn] }), r.sources.map(s => _jsx("p", { children: _jsx("a", { href: s.url, target: "_blank", rel: "noreferrer", children: s.label }) }, s.url))] }, id); })] }), _jsx("div", { className: "action-row", children: op.citations.map(id => { const rule = RULES.find(r => r.id === id); return _jsxs("a", { href: rule.sources[0].url, target: "_blank", rel: "noreferrer", children: [id, " \u00B7 checked ", rule.checkedOn] }, id); }) })] }) : pending && _jsxs("fieldset", { disabled: !canNudge, className: "review-fields", children: [_jsx("legend", { className: "small muted", children: "Check or edit before applying" }), op.op === "create_event" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Event name", _jsx("input", { value: op.name, maxLength: 80, onChange: e => setOp({ ...op, name: e.target.value }) })] }), _jsxs("label", { children: ["Event date \u00B7 confirm your choice", _jsx("input", { "aria-label": "Event date", type: "date", value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("label", { children: ["Expected people", _jsx("input", { type: "number", min: 1, max: 5000, value: op.headcount, onChange: e => setOp({ ...op, headcount: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Food", _jsxs("select", { "aria-label": "Food", value: op.food === "none" ? "no" : "yes", onChange: e => setOp({ ...op, food: e.target.value === "yes" ? (initial.op === "create_event" && initial.food !== "none" ? initial.food : "tbd") : "none" }), children: [_jsx("option", { value: "no", children: "No" }), _jsx("option", { value: "yes", children: "Yes" })] })] }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: op.speaker, onChange: e => setOp({ ...op, speaker: e.target.checked }) }), " Guest speaker or performer"] }), _jsxs("label", { children: ["Details", _jsx("textarea", { rows: 2, maxLength: 500, value: op.details ?? "", onChange: e => setOp({ ...op, details: e.target.value }) })] }), _jsx("p", { className: "small muted", children: "Steps and deadlines come from the club playbook after approval." })] }), op.op === "add_node" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Task title", _jsx("input", { value: op.title, maxLength: 100, onChange: e => setOp({ ...op, title: e.target.value }) })] }), _jsxs("label", { children: ["Event", _jsxs("select", { value: op.eventId ?? "", onChange: e => setOp({ ...op, eventId: e.target.value || null }), children: [_jsx("option", { value: "", children: "Standalone task" }), state.events.map(ev => _jsx("option", { value: ev.id, children: ev.name }, ev.id))] })] }), !op.eventId && _jsx(TaskDueFields, { due: date, buffered: buffered, onDue: setDate, onBuffered: setBuffered }), ownerSelect(op.ownerId, ownerId => setOp({ ...op, ownerId })), tierSelect(op.tier, tier => setOp({ ...op, tier }))] }), op.op === "assign_owner" && _jsxs(_Fragment, { children: [nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId })), ownerSelect(op.ownerId, ownerId => setOp({ ...op, ownerId }))] }), op.op === "set_tier" && _jsxs(_Fragment, { children: [nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId })), tierSelect(op.tier, tier => setOp({ ...op, tier }))] }), op.op === "link_dependency" && _jsxs(_Fragment, { children: [nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId })), nodeSelect(op.dependsOnId, dependsOnId => setOp({ ...op, dependsOnId }), "Must wait for")] }), op.op === "propose_nudge" && nodeSelect(op.nodeId, nodeId => setOp({ ...op, nodeId })), op.op === "set_funding_amount" && _jsxs("label", { children: ["Budget ($)", _jsx("input", { type: "number", min: 0, max: 1000000, value: op.amount, onChange: e => setOp({ ...op, amount: Number(e.target.value) }) })] }), op.op === "update_event" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Event name", _jsx("input", { value: op.name ?? state.events.find(e => e.id === op.eventId)?.name ?? "", maxLength: 80, onChange: e => setOp({ ...op, name: e.target.value }) })] }), _jsxs("label", { children: ["Expected people", _jsx("input", { type: "number", min: 1, max: 5000, value: op.headcount ?? state.events.find(e => e.id === op.eventId)?.headcount ?? 30, onChange: e => setOp({ ...op, headcount: Number(e.target.value) }) })] })] }), op.op === "add_contact" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Partner name", _jsx("input", { value: op.name, maxLength: 80, onChange: e => setOp({ ...op, name: e.target.value }) })] }), _jsxs("label", { children: ["Organization", _jsx("input", { value: op.organization, maxLength: 80, onChange: e => setOp({ ...op, organization: e.target.value }) })] }), _jsxs("label", { children: ["Owner role", _jsx("select", { value: op.ownerRoleId, onChange: e => setOp({ ...op, ownerRoleId: e.target.value }), children: state.roles.map(r => _jsx("option", { value: r.id, children: r.displayName }, r.id)) })] })] })] }), error && _jsx("p", { className: "small late-text", role: "alert", children: error }), !pending && /AI/.test(change.source ?? "") && _jsx(Feedback, { id: change.id + ":" + index, text: change.sentence + " · " + JSON.stringify(op) }), _jsx("div", { className: "action-row", children: pending ? _jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-primary", disabled: !canNudge, onClick: apply, children: op.op === "answer_question" ? "Acknowledge" : op.op === "propose_nudge" ? "Approve draft" : "Apply this change" }), _jsx("button", { className: "btn", disabled: !canNudge, onClick: () => dispatch({ type: "reviewChange", id: change.id, index, decision: "rejected" }), children: "Reject" }), !canNudge && _jsx("span", { className: "small muted", children: notAllowedText(initial) })] }) : _jsx("span", { className: `tag ${review === "applied" ? "good" : ""}`, children: review === "applied" ? "Approved" : "Rejected" }) })] });
}
