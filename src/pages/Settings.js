import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { TASK_DUE_CHOICES } from "../engine/taskDates";
import { personalBuffer } from "../engine/schedule";
import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { downloadExport, useStore, useViewer } from "../data/store";
import { PageHead } from "../components/Page";
import { BoardSettingsPanel } from "../components/BoardSettings";
import { GoalsEditor, ProfileForm, RoleCard, WorkspaceEditor } from "../components/SettingsForms";
import { OrgChart } from "../components/setup/OrgChart";
import { MAX_ROLES, newRole, rederiveFn, withBelow } from "../data/structure";
import { WorkflowPanel } from "../components/setup/WorkflowPanel";
import { orgSteps } from "../engine/playbooks";
import { checkWorkflow, presetSteps, withOwners } from "../engine/workflow";
import { validateWorkflow } from "../data/settings";
import { clubDraft, profilePatch, validateClub, validateDefaults, validateProfile } from "../data/settings";
import { Empty, Info } from "../components/ui";
export function InviteLink({ code }) {
    const url = `${window.location.origin}${window.location.pathname}#/join?invite=${encodeURIComponent(code)}`;
    const [copied, setCopied] = useState(false);
    return _jsxs("div", { className: "form-stack", children: [_jsxs("label", { children: ["Officer setup link", _jsx("input", { readOnly: true, value: url, onFocus: e => e.target.select() })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn", onClick: async () => { try {
                            await navigator.clipboard.writeText(url);
                            setCopied(true);
                        }
                        catch {
                            setCopied(false);
                        } }, children: copied ? "Copied" : "Copy invite link" }), _jsx("a", { className: "btn", href: url, children: "Try officer setup" }), _jsx(Info, { children: "Same-browser demo invitation: choose a fictional officer to try their setup." })] })] });
}
const TABS = [
    { id: "club", label: "Club", lead: true }, { id: "roles", label: "Roles", lead: true }, { id: "workflow", label: "Workflow", lead: true }, { id: "tasks", label: "Tasks", lead: true }, { id: "links", label: "Links & files", lead: true },
    { id: "me", label: "My preferences", lead: false }, { id: "admin", label: "Admin", lead: true },
];
/** Settings in five small sections; every change saves itself, with Undo (decision 5). */
export default function Settings() {
    const { canNudge } = useViewer();
    const tabs = TABS.filter(t => canNudge || !t.lead);
    const [tab, setTab] = useState(canNudge ? "club" : "me");
    const active = tabs.some(t => t.id === tab) ? tab : "me";
    return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/settings" }), _jsxs("div", { className: "settings", children: [_jsx("nav", { className: "settings-nav", "aria-label": "Settings sections", children: tabs.map(t => _jsx("button", { type: "button", "aria-current": active === t.id ? "page" : undefined, onClick: () => setTab(t.id), children: t.label }, t.id)) }), _jsx("div", { className: "settings-body", children: active === "me" ? _jsx(MySettings, {}) : active === "admin" ? _jsx(Admin, {}) : active === "workflow" ? _jsx(WorkflowSettings, {}) : active === "tasks" ? _jsx(TaskSettings, {}) : _jsx(ClubSettings, { tab: active }) })] })] });
}
function TaskSettings() {
    return _jsx("section", { className: "card form-stack", "data-testid": "task-settings", children: _jsx(BoardSettingsPanel, {}) });
}
/** Debounced auto-save with a single Undo step. */
function useAutosave(value, saved, valid, commit) {
    const { persistenceFailed } = useStore();
    const [status, setStatus] = useState(null);
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (JSON.stringify(value) === JSON.stringify(saved))
            return;
        const error = valid(value);
        if (error) {
            setStatus({ text: error });
            return;
        }
        const before = saved;
        const t = setTimeout(() => { commit(value); setStatus({ text: "Saved.", undo: before }); }, 500);
        return () => clearTimeout(t);
    }, [JSON.stringify(value)]);
    return { status: status?.undo !== undefined && persistenceFailed ? { ...status, text: "Saving failed. Changes are only on screen.", failed: true } : status, clear: () => setStatus(null) };
}
function ClubSettings({ tab }) {
    const { state, dispatch } = useStore();
    const [draft, setDraft] = useState(() => clubDraft(state));
    const [defaults, setDefaults] = useState(() => structuredClone(state.org.settings));
    const saved = { draft: clubDraft(state), defaults: state.org.settings };
    const { status, clear } = useAutosave({ draft, defaults }, saved, v => validateClub(v.draft) ?? validateDefaults(v.defaults), v => dispatch({ type: "saveClubSettings", draft: v.draft, defaults: v.defaults }));
    const undo = (prev) => { dispatch({ type: "saveClubSettings", draft: prev.draft, defaults: prev.defaults }); setDraft(structuredClone(prev.draft)); setDefaults(structuredClone(prev.defaults)); clear(); };
    const p = defaults.silenceProtocol;
    return _jsxs("section", { className: "card form-stack", "data-testid": "club-settings", children: [tab === "club" && _jsxs(_Fragment, { children: [_jsx("h2", { children: "Club" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["Club name", _jsx("input", { value: draft.name, maxLength: 80, onChange: e => setDraft({ ...draft, name: e.target.value }) })] }), _jsxs("label", { children: ["School", _jsx("input", { readOnly: true, value: state.org.school })] })] }), _jsxs("label", { children: ["Club mission", _jsx("textarea", { maxLength: 300, rows: 2, value: draft.mission, onChange: e => setDraft({ ...draft, mission: e.target.value }) })] }), _jsxs("details", { className: "more", children: [_jsx("summary", { children: "Semester goals" }), _jsx(GoalsEditor, { goals: draft.goals, progress: true, onChange: goals => setDraft({ ...draft, goals }) })] }), _jsxs("details", { className: "more", children: [_jsx("summary", { children: "Deadline and follow-up defaults" }), _jsxs("div", { className: "form-grid", children: [_jsxs("label", { children: ["Club buffer (working days)", _jsx("input", { type: "number", min: "0", max: "10", value: defaults.clubBufferBusinessDays, onChange: e => setDefaults({ ...defaults, clubBufferBusinessDays: Number(e.target.value) }) })] }), _jsxs("label", { children: ["Reminder limit per task", _jsx("input", { type: "number", min: "1", max: "3", value: defaults.maxRemindersPerTask, onChange: e => setDefaults({ ...defaults, maxRemindersPerTask: Number(e.target.value) }) })] }), ["Reminder 1 day", "Reminder 2 day", "Private check day", "Temporary owner day", "Recovery day"].map((label, i) => _jsxs("label", { children: [label, _jsx("input", { type: "number", min: "1", max: "30", value: [...p.nudgeDays, p.presidentDay, p.reassignDay, p.retroDay][i], onChange: e => { const value = Number(e.target.value); const protocol = i < 2 ? { ...p, nudgeDays: p.nudgeDays.map((n, j) => i === j ? value : n) } : { ...p, [i === 2 ? "presidentDay" : i === 3 ? "reassignDay" : "retroDay"]: value }; setDefaults({ ...defaults, silenceProtocol: protocol }); } })] }, label))] })] }), _jsxs("details", { className: "more", "data-testid": "tasks-events-settings", children: [_jsx("summary", { children: "Tasks and events" }), _jsxs("div", { className: "form-stack", children: [_jsxs("label", { children: ["When you assign a task, you expect it finished within", _jsx("select", { "aria-label": "Usual task length", value: defaults.taskDueDays ?? 5, onChange: e => setDefaults({ ...defaults, taskDueDays: Number(e.target.value) }), children: TASK_DUE_CHOICES.map(d => _jsxs("option", { value: d, children: [d, " days"] }, d)) })] }), _jsx("p", { className: "small muted", children: "New tasks start with that due date, shown as a real date. Anyone can pick another." }), _jsxs("fieldset", { children: [_jsx("legend", { className: "small muted", children: "Who can create events" }), [["leads", "President and VP"], ["chosen", "President, VP and officers I choose"], ["everyone", "Every officer"]].map(([v, label]) => _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "radio", name: "event-creators", checked: (defaults.eventCreators ?? "leads") === v, onChange: () => setDefaults({ ...defaults, eventCreators: v }) }), label] }, v)), defaults.eventCreators === "chosen" && _jsx("div", { className: "form-stack", children: state.people.filter(p => !["president", "vice_president"].includes(state.roles.find(r => r.id === p.roleId)?.fn ?? "")).map(p => _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: (defaults.eventCreatorIds ?? []).includes(p.id), onChange: e => setDefaults({ ...defaults, eventCreatorIds: e.target.checked ? [...(defaults.eventCreatorIds ?? []), p.id] : (defaults.eventCreatorIds ?? []).filter(id => id !== p.id) }) }), p.name] }, p.id)) })] }), _jsx("p", { className: "small muted", children: "Tasks are open to everyone: for yourself or for anyone else." })] })] }), _jsx("div", { className: "action-row", children: _jsx(Link, { className: "btn", to: "/setup", children: "Replay setup" }) })] }), tab === "roles" && _jsxs(_Fragment, { children: [_jsx("h2", { children: "Roles" }), _jsx(RolesTable, { roles: draft.roles, people: draft.people, onChange: (roles, people = draft.people) => setDraft({ ...draft, roles, people }) }), _jsx(OrgChart, { roles: draft.roles }), _jsxs("details", { className: "more", children: [_jsx("summary", { children: "Invite officers" }), _jsx(InviteLink, { code: state.org.inviteCode })] })] }), tab === "links" && _jsxs(_Fragment, { children: [_jsx("h2", { children: "Links & files" }), _jsx(WorkspaceEditor, { value: draft.workspace, onChange: workspace => setDraft({ ...draft, workspace }) })] }), _jsx(SaveStatus, { status: status, onUndo: undo })] });
}
function SaveStatus({ status, onUndo }) {
    if (!status)
        return null;
    return _jsxs("p", { role: "status", className: `save-status ${status.undo && !status.failed ? "ok" : "err"}`, children: [status.text, status.undo !== undefined && _jsx("button", { type: "button", className: "link", onClick: () => onUndo(status.undo), children: "Undo" })] });
}
/** The club's event workflow, after setup: the same edit module. New events start from it; events already made keep their steps. */
function WorkflowSettings() {
    const { state, dispatch } = useStore();
    const saved = withOwners(orgSteps(state), state.roles);
    const [steps, setSteps] = useState(saved);
    const { status, clear } = useAutosave(steps, saved, v => validateWorkflow(v, state.roles), v => dispatch({ type: "saveWorkflow", steps: v }));
    const issues = checkWorkflow(steps, state.roles, state);
    return _jsxs("section", { className: "card form-stack", "data-testid": "workflow-settings", children: [_jsx("h2", { children: "Event workflow" }), _jsxs("p", { className: "small muted", children: ["New events start from this workflow. ", state.org.eventWorkflow?.summary ?? "It is the standard workflow.", " Events you already made keep their own steps."] }), _jsx(WorkflowPanel, { state: state, steps: steps, roles: state.roles, issues: issues, onChange: setSteps }), _jsx("div", { className: "action-row", children: _jsx("button", { type: "button", className: "btn small", onClick: () => { dispatch({ type: "resetWorkflow" }); setSteps(withOwners(presetSteps(), state.roles)); clear(); }, children: "Go back to the standard workflow" }) }), _jsx(SaveStatus, { status: status, onUndo: (prev) => { dispatch({ type: "saveWorkflow", steps: prev }); setSteps(prev); clear(); } })] });
}
function RolesTable({ roles, people, onChange }) {
    const [editing, setEditing] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [copied, setCopied] = useState(false);
    const change = (i, patch, reFn = false) => onChange(roles.map((r, j) => i === j ? (reFn ? rederiveFn(roles, { ...r, ...patch }) : { ...r, ...patch }) : r));
    const changePerson = (id, patch) => onChange(roles, people.map(p => p.id === id ? { ...p, ...patch } : p));
    const copyEmails = async () => { try {
        await navigator.clipboard.writeText(roles.map(r => people.find(p => p.id === r.holderId)?.email ?? "").filter(Boolean).join(", "));
        setCopied(true);
    }
    catch {
        setCopied(false);
    } };
    const addRole = () => { const role = newRole("New role", roles.find(r => r.fn === "president")?.id ?? null); onChange([...roles, role]); setExpanded(role.id); };
    const columnWidth = (values, min, max) => `${Math.min(max, Math.max(min, ...values.map(value => value.length + 1)))}ch`;
    const widths = {
        title: columnWidth(roles.map(r => r.displayName), 14, 28), reports: columnWidth(roles.map(r => roles.find(x => x.id === r.reportsToId)?.displayName ?? "Nobody (top)"), 13, 22),
        officer: columnWidth(roles.map(r => people.find(p => p.id === r.holderId)?.name ?? "Open position"), 14, 24), email: columnWidth(people.map(p => p.email), 18, 30), phone: columnWidth(people.map(p => p.phone), 14, 18), asu: "12ch",
    };
    return _jsxs("div", { className: "roles-manager", children: [_jsxs("div", { className: "roles-actions", children: [_jsx("p", { className: "small muted", children: "Select a role to view its full duties." }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn small", onClick: copyEmails, children: copied ? "Emails copied" : "Copy all emails" }), _jsx("button", { type: "button", className: `btn small${editing ? " btn-primary" : ""}`, "aria-pressed": editing, onClick: () => setEditing(value => !value), children: editing ? "Done editing" : "Edit roles" }), editing && roles.length < MAX_ROLES && _jsx("button", { type: "button", className: "btn small", onClick: addRole, children: "Add role" })] })] }), _jsx("div", { className: "roles-table-wrap", children: _jsxs("table", { className: "tbl roles-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Title" }), _jsx("th", { children: "Reports to" }), _jsx("th", { children: "Officer" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Phone" }), _jsx("th", { children: "ASU ID" }), _jsx("th", { children: _jsx("span", { className: "sr-only", children: "Actions" }) })] }) }), _jsx("tbody", { children: roles.map((r, i) => {
                                const person = people.find(p => p.id === r.holderId), open = expanded === r.id, boss = withBelow(roles, r.id);
                                return _jsxs(Fragment, { children: [_jsxs("tr", { className: open ? "is-open" : "", children: [_jsx("td", { children: editing ? _jsx("input", { style: { width: widths.title }, type: "text", "aria-label": "Role title", value: r.displayName, maxLength: 60, onChange: e => change(i, { displayName: e.target.value }, true) }) : _jsx("span", { className: "role-name", title: r.displayName, children: r.displayName }) }), _jsx("td", { children: editing ? _jsxs("select", { style: { width: widths.reports }, "aria-label": "Reports to", value: r.reportsToId ?? "", onChange: e => change(i, { reportsToId: e.target.value || null }), children: [_jsx("option", { value: "", children: "Nobody (top)" }), roles.filter(x => !boss.has(x.id)).map(x => _jsx("option", { value: x.id, children: x.displayName }, x.id))] }) : _jsx("span", { className: "role-value", title: roles.find(x => x.id === r.reportsToId)?.displayName ?? "Nobody (top)", children: roles.find(x => x.id === r.reportsToId)?.displayName ?? "Nobody (top)" }) }), _jsx("td", { children: editing && person ? _jsx("input", { style: { width: widths.officer }, type: "text", "aria-label": "Officer name", value: person.name, maxLength: 80, onChange: e => changePerson(person.id, { name: e.target.value }) }) : _jsx("span", { className: "role-value", title: person?.name || "Open position", children: person?.name || "Open position" }) }), _jsx("td", { children: editing && person ? _jsx("input", { style: { width: widths.email }, type: "email", "aria-label": "Officer email", value: person.email, maxLength: 120, onChange: e => changePerson(person.id, { email: e.target.value }) }) : _jsx("span", { className: "role-value", title: person?.email || "—", children: person?.email || "—" }) }), _jsx("td", { children: editing && person ? _jsx("input", { style: { width: widths.phone }, type: "tel", "aria-label": "Officer phone", value: person.phone, maxLength: 18, onChange: e => changePerson(person.id, { phone: e.target.value }) }) : _jsx("span", { className: "role-value", title: person?.phone || "—", children: person?.phone || "—" }) }), _jsx("td", { children: editing && person ? _jsx("input", { style: { width: widths.asu }, type: "text", inputMode: "numeric", "aria-label": "Officer ASU ID", maxLength: 10, value: person.asuId ?? "", onChange: e => changePerson(person.id, { asuId: e.target.value.replace(/\D/g, "") }) }) : _jsx("span", { className: "role-value", title: person?.asuId || "—", children: person?.asuId || "—" }) }), _jsxs("td", { className: "role-actions-cell", children: [_jsx("button", { type: "button", className: "btn small", "aria-label": `Show duties for ${r.displayName}`, "aria-expanded": open, onClick: () => setExpanded(open ? null : r.id), children: "Duties" }), editing && !person && r.fn !== "president" && _jsx("button", { type: "button", className: "btn small btn-quiet", "aria-label": `Remove ${r.displayName}`, onClick: () => onChange(roles.filter(x => x.id !== r.id)), children: "Remove" })] })] }), open && _jsx("tr", { className: "role-detail", children: _jsx("td", { colSpan: 7, children: _jsxs("div", { children: [_jsx("span", { className: "cap", children: "Duties" }), editing ? _jsx("textarea", { "aria-label": "Role duties", rows: 4, maxLength: 400, value: r.duties ?? "", onChange: e => change(i, { duties: e.target.value }) }) : _jsx("p", { children: r.duties?.trim() || "No duties written yet." })] }) }) })] }, r.id);
                            }) })] }) })] });
}
function MySettings() {
    const { state, dispatch, log } = useStore();
    const { person, role } = useViewer();
    return _jsxs("section", { className: "card form-stack", "data-testid": "my-settings", children: [_jsx(MyForm, {}, person.id), _jsxs("details", { className: "more", children: [_jsx("summary", { children: "My planning buffer" }), _jsxs("p", { className: "small", children: [personalBuffer(state, person).days, " scheduling day(s) \u00B7 only you see this. ", personalBuffer(state, person).explanation] }), _jsxs("label", { className: "check-label", children: [_jsx("input", { type: "checkbox", checked: person.retainBufferAtHandoff ?? false, onChange: e => dispatch({ type: "handoffAction", action: { kind: "retainBuffer", keep: e.target.checked } }) }), "Keep my personal buffer when I hand off (", role?.displayName, ")"] })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "btn", "data-testid": "export-data", onClick: () => downloadExport(state, log), children: "Export my data" }), _jsx(Info, { children: "Downloads a JSON file with your club data and a record of what you did, in order." })] })] });
}
function MyForm() {
    const { state, dispatch } = useStore();
    const { person, role } = useViewer();
    const [draft, setDraft] = useState(() => structuredClone(profilePatch(person)));
    const { status, clear } = useAutosave(draft, profilePatch(person), d => validateProfile(d) ?? (state.people.some(p => p.id !== person.id && p.name.toLowerCase() === d.name.trim().toLowerCase()) ? "Choose a distinct fictional name." : null), d => dispatch({ type: "saveProfile", personId: person.id, patch: d }));
    return _jsxs(_Fragment, { children: [_jsx("h2", { children: "My preferences" }), _jsx(RoleCard, { state: state, personId: person.id }), _jsx(ProfileForm, { value: draft, roleName: role?.displayName ?? "Officer", onChange: setDraft }), _jsx(SaveStatus, { status: status, onUndo: (prev) => { dispatch({ type: "saveProfile", personId: person.id, patch: prev }); setDraft(structuredClone(prev)); clear(); } })] });
}
function Admin() {
    const { state, dispatch } = useStore();
    return _jsxs("section", { className: "card form-stack", children: [_jsx("h2", { children: "Admin" }), _jsx("h3", { children: "Reported answers" }), state.feedback.length ? _jsx("ul", { className: "inbox-list", children: state.feedback.map(f => _jsxs("li", { children: [_jsx("span", { className: "small", children: f.text.slice(0, 160) }), _jsxs("span", { className: "action-row", children: [_jsx("span", { className: "tag", children: f.resolved ? "Reviewed" : "Needs review" }), !f.resolved && _jsx("button", { className: "btn small", onClick: () => dispatch({ type: "resolveReport", id: f.id }), children: "Mark reviewed" })] })] }, f.id)) }) : _jsx(Empty, { children: "No reports yet." })] });
}
