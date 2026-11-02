import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { onboardingCopy } from "../copy";
import { FLOWS, stepAt } from "../engine/flows";
import { endWalkthrough, recordEvent } from "../record";
import { useOnboardingDraft } from "../draft";
import { ProgressChain } from "./ProgressChain";
/** The focus layout for the walkthrough: no navigation, no Ask panel, no View as. The progress chain follows the route. */
export function OnboardingShell() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { draft } = useOnboardingDraft();
    const at = stepAt(pathname);
    const exit = () => { if (at)
        recordEvent(FLOWS[at.flow][at.index].id, "exit"); endWalkthrough("exited"); navigate("/"); };
    // The classic Join page brings its own <main>; two would break the page landmarks.
    const Main = pathname.endsWith("classic-join") ? "div" : "main";
    const onWelcome = /^\/welcome\/?$/.test(pathname);
    return _jsxs("div", { className: "ob-shell", children: [_jsxs("header", { className: "ob-header", children: [_jsx(Link, { to: "/", className: "ob-brand", children: "Platypus" }), at && _jsx(ProgressChain, { steps: FLOWS[at.flow], index: at.index, skipped: draft.skipped }), !onWelcome && _jsx("button", { type: "button", className: "btn small", onClick: exit, children: onboardingCopy.exit })] }), _jsx(Main, { className: "ob-main", children: _jsx(Outlet, {}) })] });
}
