import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { TaskDetail } from "../components/TaskDetail";
import { usableGrant, verifyOfficerGrant } from "../lib/officerLinks";
export default function Officer() {
    const { state } = useStore();
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const [verified, setVerified] = useState(false);
    const grant = usableGrant(state, token);
    useEffect(() => {
        let active = true;
        setVerified(false);
        verifyOfficerGrant(state, token).then(ok => { if (active)
            setVerified(ok); }).catch(() => { if (active)
            setVerified(false); });
        return () => { active = false; };
    }, [token, state.demoLinkKey, grant?.id, grant?.usedOn, state.today]);
    const stored = state.officerGrants.find(g => `${g.id}.${g.signature}` === token);
    const node = state.nodes.find(n => n.id === grant?.nodeId);
    return _jsxs("main", { className: "officer-page", children: [_jsxs("header", { children: [_jsx(Link, { to: "/", children: "Platypus" }), _jsx("span", { className: "tag accent", children: "Your task" })] }), _jsx("p", { className: "small muted", children: "Local demo \u00B7 no account needed \u00B7 this link works in the browser where it was created." }), stored?.usedOn ? _jsxs("section", { className: "card", children: [_jsx("h1", { children: "Update saved" }), _jsx("p", { role: "status", children: "This link has been used. Your update is recorded, and this round of follow-up has stopped." }), _jsx("p", { className: "small muted", children: "Ask the president for a fresh link for your next update." })] }) : verified && node && grant ? _jsxs(_Fragment, { children: [_jsxs("h1", { children: ["Hi ", state.people.find(p => p.id === grant.ownerId)?.name.split(" ")[0]] }), _jsx(TaskDetail, { node: node, actorId: grant.ownerId, token: token, initialReply: params.get("reply") }, grant.id), _jsx("p", { className: "small muted", children: "Opening this page does not change your task. Choose an action to confirm your update." })] }) : _jsxs("section", { className: "card", children: [_jsx("h1", { children: "Check your task link" }), _jsx("p", { role: "status", children: grant ? "Checking your link…" : "This link is expired, changed, or unavailable in this browser. Ask the president for a fresh link." })] })] });
}
