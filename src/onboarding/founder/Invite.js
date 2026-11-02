import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "../../components/ui";
import { useStore } from "../../data/store";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { endWalkthrough, recordEvent } from "../record";
import { emailHref, inviteUrl, officerRows, whatsappHref } from "./invite/links";
const c = onboardingCopy.founder.invite;
/**
 * Screen 7 of the founder flow: the invitation moment. Nothing is sent from here: Copy link uses the clipboard, and WhatsApp and Email are plain
 * links that open a written message in a new tab. The list is local: Joined means that officer finished setup in this browser (the demo has no server).
 * "See what your officers will see" continues the same walkthrough into the member preview; it does not end the attempt.
 */
export function Invite() {
    const { state } = useStore();
    const flow = useFlow();
    const navigate = useNavigate();
    const input = useRef(null);
    const [copied, setCopied] = useState("idle");
    const link = inviteUrl(state.org.inviteCode, window.location.origin, window.location.pathname);
    const club = state.org.name;
    const rows = officerRows(state.roles, state.people);
    if (!flow)
        return null;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied("yes");
        }
        catch {
            setCopied("failed");
            input.current?.focus();
            input.current?.select();
        }
    };
    const preview = () => { recordEvent(flow.current.id, "leave"); recordEvent("member.invitation", "enter"); navigate("/welcome/member/invitation"); };
    const today = () => { recordEvent(flow.current.id, "complete"); endWalkthrough("completed"); navigate("/"); };
    return _jsxs("section", { className: "ob-card ob-i9", "aria-labelledby": "ob-i9-h", children: [_jsxs("div", { children: [_jsx("h1", { id: "ob-i9-h", children: c.title }), _jsx("p", { className: "ob-lead", children: c.lead })] }), _jsxs("div", { className: "ob-actions", children: [_jsx("button", { type: "button", className: "btn", onClick: () => void copy(), children: copied === "yes" ? c.copied : c.copy }), _jsx("a", { className: "btn", href: whatsappHref(club, link), target: "_blank", rel: "noopener noreferrer", children: c.whatsapp }), _jsx("a", { className: "btn", href: emailHref(club, link), target: "_blank", rel: "noopener noreferrer", children: c.email })] }), _jsx("input", { ref: input, className: "ob-i9-link", readOnly: true, value: link, "aria-label": c.link, onFocus: e => e.currentTarget.select() }), _jsx("p", { role: "status", className: "ob-i9-note small muted", children: copied === "failed" ? c.copyFailed : "" }), _jsxs("p", { className: "small muted", children: [c.permission, " ", c.notSent] }), _jsx("ul", { className: "ob-i9-list", "aria-label": c.officers, children: rows.map(r => _jsxs("li", { className: "ob-i9-row", "data-status": r.status, children: [_jsxs("span", { className: "ob-i9-who", children: [r.name ? _jsx("b", { children: r.name }) : null, _jsx("span", { className: "muted", children: r.status === "open" ? c.open : r.role })] }), r.status !== "open" && _jsx("span", { className: `ob-i9-status is-${r.status}`, "data-testid": "officer-status", children: r.status === "joined" ? c.joined : c.invited })] }, r.id)) }), _jsx("p", { className: "small muted", children: _jsx(Info, { label: c.joinedNote, children: c.joinedNote }) }), _jsxs("div", { className: "ob-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: preview, children: c.preview }), _jsx("button", { type: "button", className: "btn", onClick: today, children: c.today })] })] });
}
