import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import { useStore } from "../data/store";
/** Private updates for the current viewer (shown from the bell in the top bar). */
export function PrivateInbox({ onPick }) {
    const { state, dispatch } = useStore();
    const notices = state.notifications.filter(n => n.recipientId === state.viewerId).slice().reverse();
    return _jsxs("section", { "aria-label": "Private inbox", "data-testid": "private-inbox", className: "inbox", children: [_jsxs("header", { children: [_jsx("b", { children: "Private updates" }), _jsxs("span", { className: "small muted", children: [notices.filter(n => !n.read).length, " unread"] })] }), notices.length ? _jsx("ul", { className: "inbox-list", children: notices.slice(0, 12).map(n => _jsxs("li", { className: n.read ? "read" : "", children: [_jsx(Link, { to: `/tasks?node=${encodeURIComponent(n.nodeId)}`, onClick: () => { if (!n.read)
                                dispatch({ type: "markNoticeRead", id: n.id }); onPick?.(); }, children: n.text }), !n.read && _jsx("button", { type: "button", className: "btn small btn-quiet", onClick: () => dispatch({ type: "markNoticeRead", id: n.id }), children: "Mark read" })] }, n.id)) }) : _jsx("p", { className: "small muted", children: "Nothing new." })] });
}
