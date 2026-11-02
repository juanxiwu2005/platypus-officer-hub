import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateClub } from "../../data/settings";
import { fillEmails } from "../../data/structure";
import { useStore } from "../../data/store";
import { validDate } from "../../lib/commands";
import { onboardingCopy } from "../copy";
import { useOnboardingDraft } from "../draft";
import { useFlow } from "../engine/useFlow";
import { summaryLine } from "./confirm/summary";
const c = onboardingCopy.founder.confirm;
/**
 * Screen 6 of the founder flow (required): one sentence says what will be created, then Start workspace creates it with exactly the arguments the
 * classic setup page uses. The warning about replacing the demo only shows when a club was already set up. A ref stops a double click (or React's
 * development double-run) from creating it twice. Keep current demo leaves every piece of data as it is.
 */
export function Confirm() {
    const { state, dispatch } = useStore();
    const { draft, clear } = useOnboardingDraft();
    const flow = useFlow();
    const navigate = useNavigate();
    const started = useRef(false);
    const [problem, setProblem] = useState("");
    const { event, date } = draft;
    const ready = !!event && validDate(date) && date >= state.today;
    const replaces = state.org.setupCompletedOn !== null;
    if (!flow)
        return null;
    const start = () => {
        if (started.current)
            return;
        if (!event || !validDate(date) || date < state.today) {
            setProblem(c.missing);
            return;
        }
        const error = validateClub(draft.club);
        if (error) {
            setProblem(error);
            return;
        }
        started.current = true;
        dispatch({ type: "completeSetup", draft: { ...draft.club, people: fillEmails(draft.club.people) }, event, date, inviteCode: draft.inviteCode, clubBufferBusinessDays: draft.buffer, workflow: draft.steps });
        clear();
        navigate("/welcome/founder/invite");
    };
    return _jsxs("section", { className: "ob-card ob-c9", "aria-labelledby": "ob-c9-h", children: [_jsx("h1", { id: "ob-c9-h", children: c.title }), ready && event
                ? _jsx("p", { className: "ob-lead", "data-testid": "confirm-summary", children: summaryLine(draft.club, event.name, date) })
                : _jsx("p", { className: "ob-lead", children: c.missing }), ready && replaces && _jsx("p", { className: "ob-c9-warn", "data-testid": "replace-warning", children: c.replaceWarning }), problem && _jsx("p", { role: "alert", className: "ob-c9-error", children: problem }), _jsxs("div", { className: "ob-actions", children: [ready
                        ? _jsx("button", { type: "button", className: "btn btn-primary", onClick: start, children: c.start })
                        : _jsx("button", { type: "button", className: "btn btn-primary", onClick: () => navigate("/welcome/founder/first-event"), children: c.backToEvent }), _jsx("button", { type: "button", className: "btn", onClick: () => flow.exit(), children: c.keep })] }), _jsx("div", { className: "ob-actions", children: _jsx("button", { type: "button", className: "btn small", onClick: () => flow.back(), children: onboardingCopy.back }) })] });
}
