import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useSearchParams } from "react-router-dom";
import { dutiesOf } from "../../data/structure";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { fill, inviteProblem } from "./invitation/choice";
import { MemberStrip } from "./invitation/MemberStrip";
import { StepFooter } from "./invitation/StepFooter";
import { usePreview } from "./invitation/usePreview";
const c = onboardingCopy.member.invitation;
/** Member screen 0: the landing page of an invitation. Who invited you, to be what, and what you get. A preview: the officer shown is chosen in the Demo strip. */
export function Invitation() {
    const [params] = useSearchParams();
    const flow = useFlow();
    const preview = usePreview(params.get("person"));
    const { state, person, role, boss, president } = preview;
    const problem = inviteProblem(state.people, state.org.inviteCode, params.get("invite"), params.get("person"));
    if (problem || !person || !role)
        return _jsxs("section", { className: "ob-card ob-m-card", "data-testid": "invalid-invite", children: [_jsx("h1", { children: onboardingCopy.invalidInvite }), _jsx("p", { className: "muted", children: c.invalidTip }), _jsxs("div", { className: "ob-actions", children: [_jsx(Link, { className: "btn btn-primary", to: "/welcome/member/invitation", children: c.invalidRetry }), _jsx(Link, { className: "btn", to: "/", children: c.invalidHome })] })] });
    const [before, after = ""] = c.lead.split("{role}").map(part => fill(part, { president: president?.name ?? c.president }));
    return _jsxs("div", { className: "ob-m-page", children: [_jsxs("section", { className: "ob-card ob-m-card", children: [_jsx(MemberStrip, { preview: preview }), _jsx("h1", { children: state.org.name }), _jsxs("p", { className: "ob-lead", "data-testid": "invite-line", children: [before, _jsx("b", { children: role.displayName }), after] }), _jsxs("section", { className: "ob-m-role", "aria-label": "Your role", "data-testid": "role-card", children: [_jsx("p", { className: "ob-m-role-name", children: role.displayName }), boss && _jsx("p", { className: "muted", children: fill(c.boss, { boss: boss.displayName }) }), _jsx("p", { className: "ob-m-duties", children: dutiesOf(role) })] }), _jsx("ul", { className: "ob-m-gets", children: c.gets.map(line => _jsx("li", { children: line }, line)) }), _jsx("p", { className: "muted", children: c.trust })] }), _jsx(StepFooter, { label: c.cta, onNext: () => { preview.save(); flow?.next(); } })] });
}
