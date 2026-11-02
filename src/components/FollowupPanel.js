import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore, useViewer } from "../data/store";
import { recoveryPreview } from "../engine/followup";
import { Empty } from "./ui";
export function FollowupPanel() {
    const { state, dispatch } = useStore();
    const { canNudge } = useViewer();
    const [selected, setSelected] = useState("t-silence");
    if (!canNudge || (!state.extensionRequests.some(r => r.status === "pending") && !state.protocolLog.length))
        return null;
    const entries = state.protocolLog.filter(e => e.nodeId === selected);
    const pending = state.extensionRequests.filter(r => r.status === "pending");
    return _jsxs("section", { className: "card", "aria-label": "President review", "data-testid": "president-review", children: [_jsxs("header", { children: [_jsx("h2", { children: "Approvals" }), _jsx("span", { className: "small muted", children: "Only you see this" })] }), _jsxs("div", { className: "review-queue", children: [pending.map(r => {
                        const node = state.nodes.find(n => n.id === r.nodeId);
                        const stale = node.ownerId !== r.ownerId || node.clubDeadline !== r.previousDeadline || r.requestedDate < state.today;
                        return _jsxs("article", { className: "change-item", "data-testid": "extension-review", children: [_jsx("b", { children: node.title }), _jsxs("p", { className: "small", children: ["Requested: ", r.requestedDate, " \u00B7 current: ", node.clubDeadline] }), _jsx("a", { href: r.draftLink, target: "_blank", rel: "noreferrer", children: "Review current draft" }), r.reason && _jsx("p", { children: r.reason }), stale && _jsx("p", { className: "small warn-text", children: "This request is out of date. Ask the owner for a fresh request." }), _jsxs("div", { className: "action-row", children: [_jsx("button", { className: "btn btn-primary", disabled: stale, onClick: () => dispatch({ type: "reviewExtension", id: r.id, approve: true }), children: "Approve extension" }), _jsx("button", { className: "btn", onClick: () => dispatch({ type: "reviewExtension", id: r.id, approve: false }), children: "Decline extension" })] })] }, r.id);
                    }), !pending.length && _jsx(Empty, { children: "No requests waiting." })] }), _jsxs("details", { className: "followup-details", open: entries.length > 0, children: [_jsx("summary", { children: "Follow-up walkthrough" }), _jsx("p", { className: "small muted", children: "Move the Demo clock to see each private step. Nothing is sent." }), _jsxs("label", { className: "composer-channel", children: ["Follow-up task", _jsx("select", { "aria-label": "Follow-up task", value: selected, onChange: e => setSelected(e.target.value), children: state.nodes.filter(n => !n.source.startsWith("SEO Ghost Owner Protocol")).map(n => _jsx("option", { value: n.id, children: n.title }, n.id)) })] }), _jsxs("ol", { className: "protocol-log", "data-testid": "protocol-log", children: [entries.map(e => {
                                const c = state.silenceCases.find(c => c.id === e.caseId);
                                const node = state.nodes.find(n => n.id === e.nodeId);
                                const recovery = e.kind === "recovery" ? recoveryPreview(state, e.nodeId) : null;
                                return _jsxs("li", { children: [_jsxs("b", { children: ["Day ", e.day, " \u00B7 ", e.scheduledOn] }), _jsx("p", { children: e.text }), _jsxs("p", { className: "small muted", children: ["Private recipients: ", e.recipientIds.map(id => state.people.find(p => p.id === id)?.name).join(", ") || "none · limit reached", c?.closedOn ? ` · stopped ${c.closedOn}` : ""] }), e.kind === "suggest_owner" && e.suggestedOwnerId && !c?.closedOn && _jsx("button", { className: "btn small", disabled: !!c?.temporaryOwnerId, onClick: () => dispatch({ type: "temporaryOwner", entryId: e.id }), children: c?.temporaryOwnerId ? "Temporary owner assigned" : "Approve suggested owner" }), recovery && !c?.closedOn && _jsxs("div", { children: [_jsxs("p", { className: "small", children: ["Current recovery proposal: start ", recovery.latestStart, "; club deadline ", recovery.club, "; ASU ", recovery.official ?? "not applicable", "."] }), _jsx("button", { className: "btn small", disabled: !!node?.recoveryFrom, onClick: () => dispatch({ type: "approveRecovery", entryId: e.id }), children: node?.recoveryFrom ? "Recovery plan applied" : "Approve recovery timeline" })] })] }, e.id);
                            }), !entries.length && _jsx("li", { className: "small muted", children: "No follow-up stages reached yet for this task." })] })] })] });
}
