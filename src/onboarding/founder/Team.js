import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { OrgChart } from "../../components/setup/OrgChart";
import { MAX_DUTIES, MAX_ROLES, roleLabels } from "../../data/structure";
import { onboardingCopy } from "../copy";
import { useOnboardingDraft } from "../draft";
import { useFlow } from "../engine/useFlow";
import { addRole, applyReading, bossChoices, removeRole, renameRole, setDuties, setPersonName, setReportsTo, validateTeam } from "./team/rows";
const c = onboardingCopy.founder.team;
/**
 * Screen 4 of the founder flow (skippable): one row per role with two cells, Role and Person (empty = open position). Who a role reports to and
 * what it does are folded into each row. The organization chart under the list follows the rows. No email, phone or ASU ID is asked.
 */
export function Team() {
    const { draft, update } = useOnboardingDraft();
    const flow = useFlow();
    const { roles, people } = draft.club;
    // What the screen started with: Skip restores it if the rows were left in a state the rest of the app would refuse.
    const start = useRef({ roles, people });
    const [error, setError] = useState("");
    const [focusId, setFocusId] = useState(null);
    const addButton = useRef(null);
    const labels = useMemo(() => roleLabels(roles), [roles]);
    useEffect(() => {
        if (!focusId)
            return;
        document.querySelector(`[data-role-input="${focusId}"]`)?.focus();
        setFocusId(null);
    }, [focusId]);
    if (!flow)
        return null;
    const edit = (fn, structure = true) => { setError(""); update(d => ({ ...d, ...(structure ? { structureTouched: true } : {}), club: fn(d.club) })); };
    const holderName = (holderId) => people.find(p => p.id === holderId)?.name ?? "";
    const reading = draft.reading;
    const next = () => {
        const checked = validateTeam(draft.club);
        setError(checked.error ?? "");
        if (checked.error)
            return;
        update(d => ({ ...d, club: { ...d.club, people: checked.people } }));
        flow.next();
    };
    // Back keeps valid rows (with their emails made); Skip keeps them too, or puts back what the screen started with if they are not valid.
    const back = () => { const checked = validateTeam(draft.club); if (!checked.error)
        update(d => ({ ...d, club: { ...d.club, people: checked.people } })); flow.back(); };
    const skip = () => {
        const checked = validateTeam(draft.club);
        update(d => ({ ...d, club: checked.error ? { ...d.club, roles: start.current.roles, people: start.current.people } : { ...d.club, people: checked.people } }));
        flow.skip();
    };
    const add = () => {
        const made = addRole(roles);
        if (!made)
            return;
        edit(club => ({ ...club, roles: made.roles }));
        setFocusId(made.id);
    };
    const remove = (id) => { edit(club => { const x = removeRole(club.roles, club.people, id); return { ...club, ...x }; }); addButton.current?.focus(); };
    const useSuggestions = () => {
        if (reading.status !== "ready")
            return;
        const read = reading.read;
        update(d => ({ ...d, applied: true, structureTouched: false, club: applyReading(d.club, read, d.missionTouched) }));
        setError("");
    };
    return _jsxs("section", { className: "ob-card ob-team", "aria-labelledby": "ob-team-h", children: [_jsxs("div", { className: "ob-gt-head", children: [_jsx("h1", { id: "ob-team-h", children: c.title }), _jsx("p", { className: "ob-lead", children: c.invited })] }), reading.status === "reading" && _jsxs("p", { className: "notice ai-note", role: "status", children: [_jsx("span", { className: "spin", "aria-hidden": "true" }), onboardingCopy.founder.constitution.reading] }), reading.status === "ready" && !draft.applied && _jsxs("p", { className: "notice ai-note", role: "status", children: [c.suggested, _jsx("button", { type: "button", className: "btn small", onClick: useSuggestions, children: c.use })] }), _jsxs("div", { className: "ob-team-head", "aria-hidden": "true", children: [_jsx("span", { children: c.role }), _jsx("span", { children: c.person })] }), _jsx("ul", { className: "ob-role-list", "data-testid": "team-rows", children: roles.map((r, i) => {
                    const president = r.fn === "president";
                    const bossLabel = r.reportsToId ? labels.get(r.reportsToId) ?? "" : "";
                    return _jsxs("li", { className: "ob-role", children: [_jsx("input", { type: "text", className: "ob-role-title", "data-role-input": r.id, "aria-label": `${c.role} ${i + 1}`, value: r.displayName, maxLength: 60, onChange: e => edit(club => ({ ...club, roles: renameRole(club.roles, r.id, e.target.value) })) }), _jsx("input", { type: "text", className: "ob-role-person", "aria-label": `${c.person} ${i + 1}`, placeholder: c.open, value: holderName(r.holderId), maxLength: 80, onChange: e => edit(club => ({ ...club, ...setPersonName(club.roles, club.people, r.id, e.target.value) })) }), !president && _jsx("button", { type: "button", className: "btn btn-quiet ob-role-x", "aria-label": `${c.remove} ${r.displayName || c.role}`, onClick: () => remove(r.id), children: "\u2715" }), _jsxs("details", { className: "ob-role-more", children: [_jsx("summary", { title: c.more, children: bossLabel ? _jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": "true", children: "\u2191 " }), _jsxs("span", { className: "sr-only", children: [c.reportsTo, " "] }), _jsx("span", { className: "ob-gt-user", children: bossLabel })] }) : _jsx("span", { children: c.top }) }), _jsxs("div", { className: "ob-role-fields", children: [!president && _jsxs("label", { children: [_jsx("span", { className: "cap", children: c.reportsTo }), _jsxs("select", { "aria-label": `${c.reportsTo} ${i + 1}`, value: r.reportsToId ?? "", onChange: e => edit(club => ({ ...club, roles: setReportsTo(club.roles, r.id, e.target.value || null) })), children: [_jsx("option", { value: "", children: c.nobody }), bossChoices(roles, r.id).map(x => _jsx("option", { value: x.id, children: x.displayName }, x.id))] })] }), _jsxs("label", { children: [_jsx("span", { className: "cap", children: c.duties }), _jsx("textarea", { "aria-label": `${c.duties} ${i + 1}`, rows: 3, maxLength: MAX_DUTIES, value: r.duties ?? "", onChange: e => edit(club => ({ ...club, roles: setDuties(club.roles, r.id, e.target.value) }), false) })] })] })] })] }, r.id);
                }) }), _jsx("div", { children: _jsx("button", { type: "button", ref: addButton, className: "btn small", disabled: roles.length >= MAX_ROLES, onClick: add, children: c.add }) }), _jsx(OrgChart, { roles: roles }), error && _jsx("p", { role: "alert", className: "ob-gt-error", children: error }), _jsxs("div", { className: "ob-gt-nav", children: [_jsx("button", { type: "button", className: "btn", onClick: back, children: onboardingCopy.back }), _jsx("button", { type: "button", className: "btn btn-primary", onClick: next, children: onboardingCopy.next }), _jsxs("div", { className: "ob-gt-skip", children: [_jsx("button", { type: "button", className: "btn btn-quiet", onClick: skip, children: onboardingCopy.skip }), _jsx("p", { className: "ob-gt-hint", children: onboardingCopy.skipHint })] })] })] });
}
