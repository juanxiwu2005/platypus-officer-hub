import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { OrgChart } from "../../components/setup/OrgChart";
import { fmtLong } from "../../lib/dates";
import { onboardingCopy } from "../copy";
import { useFlow } from "../engine/useFlow";
import { endWalkthrough, recordEvent } from "../record";
import { clearStaged, readExtra } from "./finish/extra";
import { fill } from "./invitation/choice";
import { MemberStrip } from "./invitation/MemberStrip";
import { previewPatch, previewProblem } from "./invitation/profile";
import { StepFooter } from "./invitation/StepFooter";
import { usePreview } from "./invitation/usePreview";
import { useStore } from "../../data/store";
const c = onboardingCopy.member.done;
/**
 * Member screen 5: the one place the preview is saved. On arrival the choices made on the earlier screens are checked with the same rules as
 * Settings (validateProfile) and saved once with saveProfile; if they do not pass, nothing is saved and the screen says why.
 * Open my tasks ends the walkthrough and goes to Tasks. It never changes who is viewing: the person walking through is the president.
 */
export function Done() {
    const preview = usePreview();
    const { dispatch } = useStore();
    const flow = useFlow();
    const navigate = useNavigate();
    const { state, person, role, stored } = preview;
    const saved = useRef(false);
    const chart = useRef(null);
    // What would be saved (null when nothing was staged, for example when this page is opened directly).
    const plan = useMemo(() => {
        if (!person || !stored)
            return null;
        const extra = readExtra(person.id);
        const patch = previewPatch(person, stored, {
            busyWeeks: extra?.busyWeeks ?? person.busyWeeks, careerGoal: extra?.careerGoal ?? person.careerGoal,
            interests: extra?.interests ?? person.interests, expectations: extra?.expectations ?? person.expectations,
        });
        return { patch, problem: previewProblem(state.people, person, patch) };
    }, [person, stored, state.people]);
    // Save once. The ref also stops React's development double-run from saving twice.
    useEffect(() => {
        if (saved.current || !person || !plan || plan.problem)
            return;
        saved.current = true;
        dispatch({ type: "saveProfile", personId: person.id, patch: plan.patch, invite: state.org.inviteCode });
        clearStaged();
    }, [dispatch, person, plan, state.org.inviteCode]);
    // The chosen officer's box in the chart appears once (opacity and scale only; see the stylesheet).
    useEffect(() => {
        if (!role)
            return;
        const card = [...(chart.current?.querySelectorAll(".org-card") ?? [])].find(el => el.getAttribute("title") === role.displayName);
        card?.classList.add("is-joined");
        return () => card?.classList.remove("is-joined");
    }, [role]);
    const first = useMemo(() => {
        if (!person)
            return null;
        const mine = state.nodes.filter(n => n.ownerId === person.id && n.status !== "done");
        return [...mine].sort((a, b) => (a.clubDeadline ?? "9999-12-31").localeCompare(b.clubDeadline ?? "9999-12-31"))[0] ?? null;
    }, [person, state.nodes]);
    if (!person)
        return null;
    const open = () => { if (flow)
        recordEvent(flow.current.id, "complete"); endWalkthrough("completed"); navigate("/tasks"); };
    return _jsxs("div", { className: "ob-m-page", children: [_jsxs("section", { className: "ob-card ob-m-card", children: [_jsx(MemberStrip, { preview: preview }), _jsx("h1", { children: c.title }), plan?.problem && _jsx("p", { role: "alert", className: "ob-m-error", "data-testid": "save-problem", children: fill(c.saveFailed, { problem: plan.problem }) }), _jsx("div", { ref: chart, className: "ob-m-chart", "data-testid": "join-chart", children: _jsx(OrgChart, { roles: state.roles }) }), _jsxs("div", { className: "ob-m-first", "data-testid": "first-task", children: [_jsx("h2", { className: "ob-m-first-h", children: c.first }), first
                                ? _jsxs("article", { className: "ob-m-task", children: [_jsx("p", { className: "ob-m-task-title", children: first.title }), first.clubDeadline && _jsxs("p", { className: "small muted", children: [c.due, " ", _jsx("time", { dateTime: first.clubDeadline, "data-date": first.clubDeadline, children: fmtLong(first.clubDeadline) })] })] })
                                : _jsxs("article", { className: "ob-m-task", children: [_jsx("p", { children: c.empty }), _jsx("p", { className: "small muted", children: c.emptyPreview })] })] })] }), _jsx(StepFooter, { onBack: plan?.problem ? () => { flow?.back(); } : undefined, onNext: open, label: c.cta })] });
}
