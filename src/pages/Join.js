import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../data/store";
import { profilePatch, validateProfile } from "../data/settings";
import { ProfileForm, RoleCard } from "../components/SettingsForms";
export default function Join() {
    const { state } = useStore();
    const [params] = useSearchParams();
    const [selected, setSelected] = useState(state.people.some(p => p.id === params.get("person")) ? params.get("person") : state.people.find(p => state.roles.find(r => r.id === p.roleId)?.fn !== "president")?.id ?? state.people[0].id);
    if (params.get("invite") !== state.org.inviteCode)
        return _jsx("main", { className: "join-page", children: _jsxs("section", { className: "card form-stack", children: [_jsx("h1", { children: "Check your setup invitation" }), _jsx("p", { children: "This local demo invitation has expired or belongs to a different browser. Open the current invitation from Settings." }), _jsx(Link, { to: "/settings", children: "Open Settings" })] }) });
    return _jsx("main", { className: "join-page", children: _jsxs("section", { className: "card form-stack", children: [_jsxs("h1", { children: ["Welcome to ", state.org.name] }), _jsx("p", { children: "Five quick questions. This is a same-browser demo with fictional officers; choosing a name does not verify a real identity." }), _jsxs("label", { children: ["Try setup as", _jsx("select", { value: selected, onChange: e => setSelected(e.target.value), children: state.people.map(p => _jsxs("option", { value: p.id, children: [p.name, " \u00B7 ", state.roles.find(r => r.id === p.roleId)?.displayName] }, p.id)) })] }), _jsx(RoleCard, { state: state, personId: selected }), _jsx(JoinForm, { personId: selected, invite: state.org.inviteCode }, selected)] }) });
}
function JoinForm({ personId, invite }) {
    const { state, dispatch, persistenceFailed } = useStore();
    const person = state.people.find(p => p.id === personId);
    const [draft, setDraft] = useState(() => structuredClone(profilePatch(person)));
    const [notice, setNotice] = useState("");
    const [saved, setSaved] = useState(false);
    if (saved && !persistenceFailed)
        return _jsxs(_Fragment, { children: [_jsx("h2", { children: "You're ready" }), _jsx("p", { children: "Your preferences and shared free times are saved. Task owners still confirm each task with \u201CI've got it\u201D." }), _jsxs(Link, { className: "btn btn-primary", to: "/tasks", onClick: () => dispatch({ type: "setViewer", viewerId: personId }), children: ["View my tasks as ", draft.name] }), _jsx(Link, { to: "/settings", children: "Back to Settings" })] });
    return _jsxs("form", { className: "form-stack", onSubmit: e => { e.preventDefault(); const error = validateProfile(draft) ?? (state.people.some(p => p.id !== personId && p.name.toLowerCase() === draft.name.trim().toLowerCase()) ? "Choose a distinct fictional name." : null); if (error) {
            setNotice(error);
            return;
        } ; dispatch({ type: "saveProfile", personId, patch: draft, invite }); setSaved(true); }, children: [_jsx(ProfileForm, { value: draft, roleName: state.roles.find(r => r.id === person.roleId)?.displayName ?? "Officer", onChange: setDraft }), _jsx("button", { className: "btn btn-primary", children: "Save my setup" }), notice && _jsx("p", { role: "alert", children: notice }), saved && persistenceFailed && _jsx("p", { role: "alert", children: "Saving failed. Keep this tab open and try saving again." })] });
}
