import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "../data/store";
import { validateReply } from "../data/taskWorkflow";
import { STATUS_ACTIONS } from "../lib/nudges";
import { isPresident } from "../data/permissions";
import { isBudgetControlledNode } from "../engine/eventBudget";
export function TaskActions({ node, actorId, token, initialReply }) {
    const { state, dispatch } = useStore();
    const [form, setForm] = useState(initialReply === "waiting" || initialReply === "extension" ? initialReply : "");
    const [input, setInput] = useState({ waitingOn: "", waitingOnPersonId: null, draftLink: node.draftLink ?? "", requestedDate: "", reason: "" });
    const [notice, setNotice] = useState("");
    function send(reply, value = input) {
        const error = validateReply(state, node, actorId, reply, value);
        if (error) {
            setNotice(error);
            return;
        }
        if (token)
            dispatch({ type: "officerAction", token, reply, input: value });
        else
            dispatch({ type: "replyTask", nodeId: node.id, reply, input: value });
        setForm("");
        setNotice(reply === "extension" ? "Extension requested. The deadline stays unchanged until approval." : "Update saved. This round of follow-up has stopped.");
    }
    if (node.status === "done")
        return _jsxs("p", { className: "small good-text", children: ["Completed", node.completedOn ? ` on ${node.completedOn}` : "", ". Thank you."] });
    const budgetControlled = isBudgetControlledNode(node);
    const canUpdate = node.ownerId === actorId || isPresident(state, actorId);
    if (node.ownerId && !canUpdate)
        return _jsx("p", { className: "small muted", children: "Only the owner or president can update this task." });
    if (node.status === "unclaimed")
        return _jsxs("div", { className: "task-actions", children: [_jsx("button", { className: "btn btn-primary", onClick: () => {
                        if (token)
                            dispatch({ type: "officerAction", token, reply: "claim" });
                        else
                            dispatch({ type: "claimTask", nodeId: node.id });
                        setNotice("Claimed. The handover is confirmed.");
                    }, children: "I've got it" }), _jsx("p", { className: "small muted", children: "Tap to confirm that you own this task." })] });
    return _jsxs("div", { className: "task-actions", children: [_jsx("div", { className: "status-actions", "aria-label": "Update task status", children: STATUS_ACTIONS.map(a => _jsx("button", { disabled: a.key === "done" && budgetControlled, className: `btn ${initialReply === a.key ? "btn-primary" : ""}`, onClick: () => a.key === "waiting" || a.key === "extension" ? setForm(a.key) : send(a.key, {}), children: a.label }, a.key)) }), budgetControlled && _jsx("p", { className: "small muted", children: "Complete this step in Event Budget." }), form === "waiting" && _jsxs("form", { className: "task-form", onSubmit: e => { e.preventDefault(); send("waiting"); }, children: [_jsxs("label", { children: ["Waiting on", _jsxs("select", { "aria-label": "Waiting on", value: input.waitingOnPersonId ?? input.waitingOn, onChange: e => { const person = state.people.find(p => p.id === e.target.value); setInput({ ...input, waitingOn: person?.name ?? e.target.value, waitingOnPersonId: person?.id ?? null }); }, children: [_jsx("option", { value: "", children: "Choose a person or dependency" }), state.people.filter(p => p.id !== actorId).map(p => _jsx("option", { value: p.id, children: p.name }, p.id)), _jsx("option", { value: "School or vendor approval", children: "School or vendor approval" }), _jsx("option", { value: "Materials from another task", children: "Materials from another task" })] })] }), _jsx("button", { className: "btn btn-primary", type: "submit", children: "Save waiting status" })] }), form === "extension" && _jsxs("form", { className: "task-form", onSubmit: e => { e.preventDefault(); send("extension"); }, children: [_jsx("p", { className: "small muted", children: "Share your current draft so we can decide together." }), _jsxs("label", { children: ["Current draft link", _jsx("input", { "aria-label": "Current draft link", type: "url", value: input.draftLink, onChange: e => setInput({ ...input, draftLink: e.target.value }), placeholder: "https://\u2026" })] }), _jsxs("label", { children: ["Requested club deadline", _jsx("input", { "aria-label": "Requested club deadline", type: "date", value: input.requestedDate, onChange: e => setInput({ ...input, requestedDate: e.target.value }) })] }), _jsxs("label", { children: ["What would help? (optional)", _jsx("textarea", { maxLength: 300, value: input.reason, onChange: e => setInput({ ...input, reason: e.target.value }) })] }), _jsx("button", { className: "btn btn-primary", type: "submit", children: "Request extension" })] }), form && _jsx("button", { className: "btn btn-quiet small", onClick: () => setForm(""), children: "Cancel" }), notice && _jsx("p", { className: "small", role: "status", children: notice })] });
}
