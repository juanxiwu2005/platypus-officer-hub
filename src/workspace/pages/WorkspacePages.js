import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../client';
import { FlowSchema } from '../../organization/schema';
import { scheduleWorkItem } from '../schedule';
import { selectPriorityTasks, workItemStatus, workspaceToday } from '../selectors';
import CreateWorkForm from './CreateWorkForm';
import TaskBoard from './TaskBoard';
import WorkDetail from './WorkDetail';
import { CompactChain, memberName, shortDate, TaskLink, workflowProgress, WorkStatus } from './shared';
import '../workspace.css';
import { creationRecoveryKey } from './formRecovery';
function safePrefill(value) {
    if (!value || typeof value !== 'object')
        return null;
    const input = value;
    if (input.kind !== 'member_event' && input.kind !== 'executive_work')
        return null;
    const prefill = input.prefill && typeof input.prefill === 'object' ? input.prefill : input;
    const flow = FlowSchema.safeParse(prefill.flow);
    return { kind: input.kind, ...(typeof prefill.name === 'string' ? { name: prefill.name.slice(0, 180) } : {}), ...(typeof prefill.description === 'string' ? { description: prefill.description.slice(0, 2000) } : {}), ...(flow.success ? { flow: flow.data } : {}),
        ...(['none', 'usg', 'college', 'dues', 'sponsor'].includes(String(prefill.fundingSource)) ? { fundingSource: prefill.fundingSource } : {}),
        ...(['food_service', 'speaker', 'other'].includes(String(prefill.fundingCategory)) ? { fundingCategory: prefill.fundingCategory } : {}),
        ...(typeof prefill.requestedAmount === 'number' && Number.isFinite(prefill.requestedAmount) && prefill.requestedAmount >= 0 && prefill.requestedAmount <= 1000000 ? { requestedAmount: prefill.requestedAmount } : {}),
        ...(prefill.ownerId === null || typeof prefill.ownerId === 'string' ? { ownerId: prefill.ownerId } : {}),
        ...(['campus', 'offcampus', 'unspecified'].includes(String(prefill.venue)) ? { venue: prefill.venue } : {}),
    };
}
export default function WorkspacePages() {
    const { envelope, loading, mutating, error, conflict, canRetry, retryMutation, refresh } = useWorkspace();
    const location = useLocation();
    const navigate = useNavigate();
    const [creation, setCreation] = useState(null);
    const [createKey, setCreateKey] = useState(0);
    const [unfinishedCreation, setUnfinishedCreation] = useState(null);
    const today = workspaceToday();
    const schedules = useMemo(() => Object.fromEntries((envelope?.state.workItems ?? []).map(item => [item.id, scheduleWorkItem(item, envelope?.state.members ?? [], today)])), [envelope, today]);
    const openCreate = (prefill) => { setCreation(prefill); setCreateKey(value => value + 1); };
    useEffect(() => {
        if (!envelope) {
            setUnfinishedCreation(null);
            return;
        }
        try {
            const raw = localStorage.getItem(creationRecoveryKey(envelope.state.workspaceId));
            setUnfinishedCreation(raw ? safePrefill(JSON.parse(raw)) : null);
        }
        catch {
            setUnfinishedCreation(null);
        }
    }, [envelope?.state.workspaceId, creation]);
    useEffect(() => {
        const listener = (event) => { const input = safePrefill(event.detail); if (input) {
            const leave = new Event('platypus:before-workspace-leave', { cancelable: true });
            window.dispatchEvent(leave);
            if (leave.defaultPrevented)
                return;
            setCreation(input);
            setCreateKey(value => value + 1);
        } };
        window.addEventListener('platypus:open-create', listener);
        return () => window.removeEventListener('platypus:open-create', listener);
    }, []);
    useEffect(() => {
        const state = location.state;
        const prefill = safePrefill(state?.createWork);
        if (!prefill)
            return;
        setCreation(prefill);
        setCreateKey(value => value + 1);
        navigate(location.pathname + location.search, { replace: true, state: null });
    }, [location.pathname, location.search, location.state, navigate]);
    const workId = location.pathname.match(/\/work\/([^/]+)/)?.[1];
    const screen = workId ? 'work' : location.pathname.endsWith('/tasks') ? 'tasks' : location.pathname.endsWith('/board') ? 'board' : location.pathname.endsWith('/activities') ? 'activities' : 'home';
    useEffect(() => { window.dispatchEvent(new CustomEvent('platypus:assistant-context', { detail: { screen, ...(workId ? { workItemId: workId } : {}) } })); }, [screen, workId]);
    const work = workId ? envelope?.state.workItems.find(item => item.id === workId) : null;
    return _jsxs("div", { className: "aw-workspace", "data-testid": "activity-workspace", children: [error && _jsxs("div", { className: "aw-error", role: "alert", children: [_jsx("p", { children: error }), conflict ? _jsx("button", { disabled: mutating, onClick: () => void refresh(), children: "Load latest version" }) : canRetry ? _jsxs(_Fragment, { children: [_jsx("button", { disabled: mutating, onClick: () => void retryMutation().catch(() => { }), children: "Retry this save" }), _jsx("button", { disabled: mutating, onClick: () => void refresh(), children: "Load saved workspace" })] }) : _jsx("button", { disabled: mutating, onClick: () => void refresh(), children: "Retry loading workspace" })] }), unfinishedCreation && !creation && _jsxs("p", { className: "aw-note", children: ["An unfinished creation form is saved on this device. ", _jsx("button", { onClick: () => openCreate(unfinishedCreation), children: "Resume unfinished form" })] }), loading && !envelope ? _jsx("p", { role: "status", className: "aw-empty", children: "Loading your workspace\u2026" }) : !envelope ? _jsxs("section", { className: "aw-empty", children: [_jsx("h1", { children: "Open your organization workspace" }), _jsx("p", { children: "Return to organization setup to start or reconnect to this private workspace." }), _jsx(Link, { to: "/phase1/setup", children: "Organization setup \u2192" })] }) : _jsxs(_Fragment, { children: [mutating && _jsx("p", { className: "aw-saving", role: "status", children: "Saving your change\u2026" }), screen === 'home' && _jsx(Home, { schedules: schedules, onCreate: openCreate }), (screen === 'activities' || screen === 'board') && _jsx(Activities, { board: screen === 'board', onCreate: openCreate }), screen === 'tasks' && _jsx(TaskBoard, { schedules: schedules }), screen === 'work' && (work ? _jsx(WorkDetail, { item: work, schedule: schedules[work.id] }, work.id) : _jsxs("section", { className: "aw-empty", children: [_jsx("h1", { children: "Work item unavailable" }), _jsx("p", { children: "This item is not in your current workspace. No sample activity has been substituted." }), _jsx(Link, { to: "/phase1/activities", children: "View activities \u2192" })] }))] }), creation && envelope && _jsx(CreateWorkForm, { prefill: creation, close: () => setCreation(null) }, createKey)] });
}
function Home({ schedules, onCreate }) {
    const { envelope } = useWorkspace();
    const [showAll, setShowAll] = useState(false);
    if (!envelope)
        return null;
    const { state } = envelope;
    const actor = state.members.find(member => member.id === state.actorId);
    const today = workspaceToday();
    const priorities = selectPriorityTasks(state, today, Infinity, schedules);
    const unassigned = state.workItems.flatMap(item => item.tasks.filter(task => task.applicability !== 'inactive' && task.status !== 'done' && !task.ownerId).map(task => ({ item, task })));
    const memberItems = state.workItems.filter(item => item.kind === 'member_event' && workItemStatus(item) !== 'completed' && (!item.date || item.date >= today)).sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
    const boardItems = state.workItems.filter(item => item.kind === 'executive_work' && workItemStatus(item) !== 'completed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return _jsxs(_Fragment, { children: [_jsxs("header", { className: "aw-page-head", children: [_jsxs("div", { children: [_jsx("span", { className: "aw-eyebrow", children: envelope.organization.name }), _jsx("h1", { children: actor ? `Hello, ${actor.name.split(' ')[0]}` : 'Your workspace' }), _jsx("p", { children: "Move your work forward." })] }), _jsx(Link, { to: "/phase1/tasks", className: "aw-button", children: "Open My tasks \u2192" })] }), _jsxs("section", { className: "aw-priorities", "aria-label": "Your priority tasks", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: "Needs your attention" }), _jsx("p", { children: "From your assigned tasks, ordered by urgency." })] }), _jsxs("span", { className: "aw-count", children: [priorities.length, " open"] })] }), priorities.length ? _jsx("ol", { children: priorities.slice(0, showAll ? Infinity : 3).map(({ task, workItem, reason, due }) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx(TaskLink, { item: workItem, task: task }), _jsx("span", { children: workItem.name })] }), _jsx("span", { className: "aw-priority-reason", children: reason }), _jsx("span", { children: due ? shortDate(due) : 'No date set' }), _jsx(TaskLink, { item: workItem, task: task, children: "Open \u2192" })] }, task.id)) }) : _jsx("p", { className: "aw-empty-inline", children: actor ? 'No tasks need your attention right now.' : 'Choose a demo member in Your team to see their assigned work.' }), priorities.length > 3 && _jsx("button", { className: "aw-text-button", onClick: () => setShowAll(!showAll), children: showAll ? 'Show top 3' : `View all ${priorities.length} open tasks` })] }), actor?.access === 'manager' && unassigned.length > 0 && _jsxs("details", { className: "aw-unassigned", children: [_jsxs("summary", { children: [unassigned.length, " workflow tasks need an assignment"] }), _jsx("p", { children: "Assign a responsible member so these tasks appear in their personal board." }), unassigned.map(({ item, task }) => _jsxs("p", { children: [_jsx(TaskLink, { item: item, task: task }), _jsxs("span", { children: [" \u00B7 ", item.name] })] }, task.id))] }), _jsxs("div", { className: "aw-home-programs", children: [_jsx(Overview, { title: "Member Programs", items: memberItems, to: "/phase1/activities", kind: "member_event", onCreate: onCreate }), _jsx(Overview, { title: "Executive Board", items: boardItems, to: "/phase1/board", kind: "executive_work", onCreate: onCreate })] })] });
}
function Overview({ title, items, to, kind, onCreate }) {
    const { envelope } = useWorkspace();
    const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
    return _jsxs("section", { className: "aw-overview", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: title }), _jsxs("p", { children: [items.length, " ", kind === 'member_event' ? 'upcoming activities' : 'active work items'] })] }), _jsx(Link, { to: to, children: "View all \u2192" })] }), items.slice(0, 3).map(item => _jsxs("article", { children: [_jsxs("div", { className: "aw-overview-title", children: [_jsx(Link, { to: `/phase1/work/${item.id}`, children: item.name }), _jsx(WorkStatus, { item: item })] }), _jsxs("p", { children: [shortDate(item.date), " \u00B7 ", memberName(envelope?.state.members ?? [], item.ownerId)] }), _jsx(CompactChain, { item: item })] }, item.id)), !items.length && _jsx("p", { className: "aw-empty-inline", children: kind === 'member_event' ? 'No upcoming member activities yet.' : 'No active board work yet.' }), _jsxs("button", { disabled: actor?.access !== 'manager', onClick: () => onCreate({ kind }), children: ["+ ", kind === 'member_event' ? 'Create member activity' : 'Create board work'] })] });
}
function semester(date) { if (!date)
    return 'Unscheduled'; const month = Number(date.slice(5, 7)); return `${date.slice(0, 4)} ${month <= 5 ? 'Spring' : month <= 7 ? 'Summer' : 'Fall'}`; }
function Activities({ board, onCreate }) {
    const { envelope } = useWorkspace();
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('date');
    const [term, setTerm] = useState('');
    const [lead, setLead] = useState('');
    const [status, setStatus] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    if (!envelope)
        return null;
    const { state } = envelope;
    const kind = board ? 'executive_work' : 'member_event';
    const actor = state.members.find(member => member.id === state.actorId);
    const all = state.workItems.filter(item => item.kind === kind);
    const filtered = all.filter(item => (!search || `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())) && (!term || semester(item.date) === term) && (!lead || item.ownerId === lead) && (!status || workItemStatus(item) === status));
    const open = filtered.filter(item => workItemStatus(item) !== 'completed');
    const completed = filtered.filter(item => workItemStatus(item) === 'completed');
    const compare = (a, b) => sort === 'updated' ? b.updatedAt.localeCompare(a.updatedAt) : (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.name.localeCompare(b.name);
    const row = (item) => _jsxs("article", { className: "aw-activity-row", children: [_jsxs("div", { className: "aw-activity-identity", children: [_jsx(Link, { to: `/phase1/work/${item.id}`, children: item.name }), _jsx("span", { children: shortDate(item.date) }), _jsx("small", { children: memberName(state.members, item.ownerId) })] }), _jsx(CompactChain, { item: item }), _jsxs("div", { className: "aw-activity-health", children: [_jsx(WorkStatus, { item: item }), _jsxs("span", { children: [workflowProgress(item).completed, "/", workflowProgress(item).total, " steps"] }), _jsx(Link, { to: `/phase1/work/${item.id}`, children: "Open timeline \u2192" })] })] }, item.id);
    return _jsxs(_Fragment, { children: [_jsxs("header", { className: "aw-page-head", children: [_jsxs("div", { children: [_jsx("span", { className: "aw-eyebrow", children: board ? 'INTERNAL WORK' : 'MEMBER PROGRAMS' }), _jsx("h1", { children: board ? 'Executive Board' : 'Activities' }), _jsxs("p", { children: [all.length, " ", board ? 'work items' : 'activities', " in this workspace"] })] }), _jsxs("button", { className: "aw-primary", disabled: actor?.access !== 'manager', onClick: () => onCreate({ kind }), children: ["+ ", board ? 'Create board work' : 'Create activity'] })] }), _jsxs("div", { className: "aw-activity-filters", children: [_jsxs("label", { className: "aw-search", children: ["Search", _jsx("input", { type: "search", placeholder: board ? 'Find board work…' : 'Find an activity…', value: search, onChange: e => setSearch(e.target.value) })] }), _jsxs("label", { children: ["Sort", _jsxs("select", { value: sort, onChange: e => setSort(e.target.value), children: [_jsx("option", { value: "date", children: "Upcoming date" }), _jsx("option", { value: "updated", children: "Recently updated" })] })] }), _jsxs("label", { children: ["Semester", _jsxs("select", { value: term, onChange: e => setTerm(e.target.value), children: [_jsx("option", { value: "", children: "All semesters" }), [...new Set(all.map(item => semester(item.date)))].sort().map(value => _jsx("option", { value: value, children: value }, value))] })] }), _jsxs("label", { children: ["Lead", _jsxs("select", { value: lead, onChange: e => setLead(e.target.value), children: [_jsx("option", { value: "", children: "Everyone" }), state.members.map(member => _jsx("option", { value: member.id, children: member.name }, member.id))] })] }), _jsxs("label", { children: ["Status", _jsxs("select", { value: status, onChange: e => setStatus(e.target.value), children: [_jsx("option", { value: "", children: "All states" }), _jsx("option", { value: "to_do", children: "To Do" }), _jsx("option", { value: "working", children: "Working on it" }), _jsx("option", { value: "stuck", children: "Stuck" }), _jsx("option", { value: "completed", children: "Completed" })] })] })] }), _jsxs("div", { className: "aw-activity-list", "aria-label": board ? 'Board work list' : 'Member activity list', children: [open.sort(compare).map(row), !open.length && _jsxs("div", { className: "aw-empty", children: [_jsx("h2", { children: all.length ? 'No matching open work' : 'Start your first ' + (board ? 'board project' : 'member activity') }), _jsx("p", { children: all.length ? 'Try another search or filter.' : 'Your confirmed team and workflow will help assign the work.' })] })] }), completed.length > 0 && _jsxs("section", { className: "aw-completed-activities", children: [_jsxs("button", { className: "aw-text-button", "aria-expanded": showCompleted, onClick: () => setShowCompleted(!showCompleted), children: [showCompleted ? 'Hide' : 'Show', " completed \u00B7 ", completed.length] }), showCompleted && completed.sort(compare).map(row)] })] });
}
