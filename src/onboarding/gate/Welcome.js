import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { finishAttempt, markWelcomeSeen, startAttempt } from "../../lib/onboardingRecord";
import { onboardingCopy as copy } from "../copy";
import { FLOW_VERSION } from "../record";
export function Welcome() {
    const navigate = useNavigate();
    // "Start" goes through /welcome/start, the one place that begins (and records) a walkthrough; "Replay walkthrough" in the Demo menu uses it too.
    const start = () => navigate("/welcome/start");
    const explore = () => { const id = startAttempt("explore", FLOW_VERSION); finishAttempt(id, "explored"); markWelcomeSeen(); navigate("/"); };
    return _jsxs("section", { className: "ob-card ob-welcome", "aria-labelledby": "ob-welcome-h", children: [_jsx("h1", { id: "ob-welcome-h", children: copy.welcomeTitle }), _jsx("p", { className: "ob-lead", children: copy.welcomeLead }), _jsx("p", { children: copy.welcomeBody }), _jsxs("div", { className: "ob-actions", children: [_jsx("button", { type: "button", className: "btn btn-primary", onClick: start, children: copy.start }), _jsx("button", { type: "button", className: "btn btn-quiet", onClick: explore, children: copy.explore })] }), _jsx("p", { className: "small muted", children: copy.welcomePrivacy })] });
}
