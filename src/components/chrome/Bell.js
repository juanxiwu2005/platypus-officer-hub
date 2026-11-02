import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../data/store";
import { PrivateInbox } from "../PrivateInbox";
export function Bell() {
    const { state } = useStore();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const unread = state.notifications.filter(n => n.recipientId === state.viewerId && !n.read).length;
    useEffect(() => {
        if (!open)
            return;
        const off = (e) => { if (!ref.current?.contains(e.target))
            setOpen(false); };
        document.addEventListener("mousedown", off);
        return () => document.removeEventListener("mousedown", off);
    }, [open]);
    return _jsxs("div", { className: "menu-wrap", ref: ref, children: [_jsxs("button", { type: "button", className: "btn btn-quiet icon-btn bell", "aria-label": `Private updates, ${unread} unread`, "aria-expanded": open, onClick: () => setOpen(!open), "data-testid": "bell", children: [_jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "M5 14V9a5 5 0 0110 0v5l1.5 1.5h-13zM8.5 17.5a1.6 1.6 0 003 0", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }) }), unread > 0 && _jsx("span", { className: "badge", children: unread })] }), _jsx("div", { className: "menu wide", hidden: !open, children: _jsx(PrivateInbox, { onPick: () => setOpen(false) }) })] });
}
