import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace, workspaceId } from '../client';
import { TaskSchema } from '../contracts';
import { projectStages, taskReady } from '../selectors';
import { memberName, shortDate, Status, STATUS_LABELS, todayInArizona, WorkStatus } from './shared';
import { readApprovedContext } from '../../phase1/approvedContext';
import { useDialogFocus } from './dialogFocus';
import { useUnsavedGuard } from './unsavedGuard';
import { useFormRecovery } from './formRecovery';
import { z } from 'zod';
const TaskInputSchema = z.object({ title: z.string().max(180), description: z.string().max(1000), ownerId: z.string().max(100), due: z.string().max(10), progress: z.string().max(1000), evidence: z.string().max(1000), depends: z.array(z.string().max(100)).max(200) });
const WorkInputSchema = z.object({ name: z.string().max(180), date: z.string().max(10), description: z.string().max(2000), ownerId: z.string().max(100) });
const FundingInputSchema = z.object({ editing: z.boolean(), amount: z.string().max(30), purpose: z.string().max(1000), source: z.enum(['usg', 'college', 'dues', 'sponsor']), category: z.enum(['food_service', 'speaker', 'other']), spendBy: z.string().max(10), commitAmount: z.string().max(30), commitPurpose: z.string().max(400), evidence: z.string().max(1000) });
const NewFundingInputSchema = z.object({ adding: z.boolean(), amount: z.string().max(30), purpose: z.string().max(1000), source: z.enum(['usg', 'college', 'dues', 'sponsor']), category: z.enum(['food_service', 'speaker', 'other']) });
const oneDay = 86400000;
const dateValue = (date) => Date.parse(`${date}T12:00:00Z`);
const money = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
export default function WorkDetail({ item, schedule }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const location = useLocation();
    const navigate = useNavigate();
    const selectedId = new URLSearchParams(location.search).get('task');
    const selected = item.tasks.find(task => task.id === selectedId) ?? null;
    const [edit, setEdit] = useState(false);
    const [view, setView] = useState('timeline');
    const [department, setDepartment] = useState('');
    const [person, setPerson] = useState('');
    const [notice, setNotice] = useState('');
    const [adding, setAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newOwner, setNewOwner] = useState(item.ownerId ?? '');
    const [adoption, setAdoption] = useState(null);
    const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
    const manager = actor?.access === 'manager';
    const stages = projectStages(item);
    const members = envelope?.state.members ?? [];
    const roles = envelope?.organization.roles ?? [];
    const departments = envelope?.organization.departments ?? [];
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('platypus:assistant-context', { detail: { screen: 'work', workItemId: item.id, ...(selected ? { taskId: selected.id } : {}) } }));
    }, [item.id, selected?.id]);
    const choose = (task) => navigate(`/phase1/work/${item.id}?task=${task.id}`);
    const filter = (task) => (!person || task.ownerId === person || task.collaboratorIds.includes(person)) && (!department || task.roleIds.some(roleId => roles.find(role => role.id === roleId)?.departmentId === department));
    const visibleStages = stages.map(stage => ({ ...stage, tasks: stage.tasks.filter(filter) })).filter(stage => stage.tasks.length);
    const pendingReview = item.tasks.filter(task => task.needsReview);
    const addTask = async (e) => {
        e.preventDefault();
        const task = TaskSchema.parse({ id: workspaceId(), parentWorkItemId: item.id, title: newTitle, stageKey: 'additional_work', stageTitle: 'Additional work', roleIds: members.find(member => member.id === newOwner)?.roleIds ?? [], ownerId: newOwner || null, updatedAt: new Date().toISOString(), rank: item.tasks.length });
        try {
            await mutate({ type: 'task.add', workItemId: item.id, task });
            setAdding(false);
            setNewTitle('');
        }
        catch (e) {
            setNotice(e.message);
        }
    };
    return _jsxs(_Fragment, { children: [_jsxs(Link, { className: "aw-back", to: item.kind === 'member_event' ? '/phase1/activities' : '/phase1/board', children: ["\u2190 ", item.kind === 'member_event' ? 'Activities' : 'Executive Board'] }), _jsxs("header", { className: "aw-page-head", children: [_jsxs("div", { children: [_jsx("span", { className: "aw-eyebrow", children: item.kind === 'member_event' ? 'MEMBER ACTIVITY' : 'EXECUTIVE BOARD' }), _jsx("h1", { children: item.name }), _jsxs("div", { className: "aw-inline", children: [_jsx("span", { children: shortDate(item.date) }), _jsx("span", { children: memberName(members, item.ownerId) }), _jsx(WorkStatus, { item: item })] })] }), manager && _jsxs("button", { onClick: () => setEdit(true), children: ["Edit ", item.kind === 'member_event' ? 'activity' : 'work'] })] }), item.description && _jsx("p", { className: "aw-description", children: item.description }), notice && _jsxs("p", { className: "aw-note", role: "status", children: [notice, _jsx("button", { "aria-label": "Dismiss activity update", onClick: () => setNotice(''), children: "\u00D7" })] }), pendingReview.length > 0 && _jsxs("section", { className: "aw-note", children: [_jsxs("strong", { children: [pendingReview.length, " steps need review after an upstream change."] }), _jsx("p", { children: pendingReview.map(task => task.title).join(' · ') }), manager && _jsx("button", { disabled: mutating, onClick: () => void mutate({ type: 'task.review', workItemId: item.id, taskIds: pendingReview.map(task => task.id) }).catch(e => setNotice(e.message)), children: "Confirm these affected steps" })] }), schedule.issues.length > 0 && _jsxs("details", { className: "aw-schedule-notes", open: !schedule.covered, children: [_jsx("summary", { children: schedule.covered ? `${schedule.issues.length} schedule notices` : 'Some dates cannot be reliably scheduled' }), _jsx("ul", { children: schedule.issues.map((issue, i) => _jsx("li", { children: issue.replace(/^[a-z_]+:\s*/, "") }, i)) })] }), _jsxs("div", { className: "aw-detail-toolbar", children: [_jsxs("div", { className: "aw-segmented", role: "group", "aria-label": "Activity view", children: [_jsx("button", { "aria-pressed": view === 'timeline', onClick: () => setView('timeline'), children: "Timeline" }), _jsx("button", { "aria-pressed": view === 'workflow', onClick: () => setView('workflow'), children: "Workflow" })] }), _jsxs("div", { className: "aw-inline", children: [_jsx("label", { className: "aw-sr-only", htmlFor: "aw-department-filter", children: "Filter by department" }), _jsxs("select", { id: "aw-department-filter", value: department, onChange: e => setDepartment(e.target.value), children: [_jsx("option", { value: "", children: "All departments" }), departments.map(dept => _jsx("option", { value: dept.id, children: dept.name }, dept.id))] }), _jsx("label", { className: "aw-sr-only", htmlFor: "aw-person-filter", children: "Filter by member" }), _jsxs("select", { id: "aw-person-filter", value: person, onChange: e => setPerson(e.target.value), children: [_jsx("option", { value: "", children: "Everyone" }), members.map(member => _jsx("option", { value: member.id, children: member.name }, member.id))] })] })] }), view === 'timeline' ? _jsx(Timeline, { item: item, stages: visibleStages, schedule: schedule, onSelect: choose }) : _jsx("div", { className: "aw-workflow", "aria-label": "Activity workflow", children: visibleStages.map(stage => _jsxs("section", { children: [_jsxs("header", { children: [_jsx("h2", { children: stage.title }), _jsxs("span", { children: [stage.completed, "/", stage.total, " complete"] })] }), _jsx("div", { children: stage.tasks.map(task => _jsxs("button", { className: `aw-workflow-step aw-task-${task.status}`, onClick: () => choose(task), children: [_jsx("strong", { children: task.title }), _jsx("span", { children: memberName(members, task.ownerId) }), _jsx("span", { children: STATUS_LABELS[task.status] }), task.dependsOn.length > 0 && _jsxs("small", { children: ["After ", task.dependsOn.map(id => item.tasks.find(t => t.id === id)?.title ?? 'Missing step').join(' · ')] })] }, task.id)) })] }, stage.id)) }), manager && (adding ? _jsxs("form", { className: "aw-inline-add", onSubmit: e => void addTask(e), children: [_jsxs("label", { children: ["New task", _jsx("input", { required: true, maxLength: 180, value: newTitle, onChange: e => setNewTitle(e.target.value) })] }), _jsxs("label", { children: ["Responsible member", _jsxs("select", { value: newOwner, onChange: e => setNewOwner(e.target.value), children: [_jsx("option", { value: "", children: "Needs assignment" }), members.map(member => _jsx("option", { value: member.id, children: member.name }, member.id))] })] }), _jsx("button", { className: "aw-primary", disabled: mutating, children: "Add to this workflow" }), _jsx("button", { type: "button", onClick: () => setAdding(false), children: "Cancel" })] }) : _jsxs("button", { className: "aw-add-task", onClick: () => setAdding(true), children: ["+ Add task to this ", item.kind === 'member_event' ? 'activity' : 'work'] })), _jsx(FundingPanel, { item: item, onNotice: setNotice }), _jsxs("footer", { className: "aw-work-meta", children: [_jsxs("p", { children: ["Created from organization version ", item.templateVersion, ". Existing task edits and completed records are retained when defaults change."] }), manager && _jsxs("div", { className: "aw-inline", children: [_jsx("button", { onClick: () => setAdoption('timing'), children: "Review latest timing defaults" }), item.kind === 'member_event' && _jsx("button", { onClick: () => setAdoption('template'), children: "Review latest workflow template" })] })] }), selected && _jsx(TaskDetail, { task: selected, item: item, schedule: schedule, close: () => navigate(`/phase1/work/${item.id}`) }, selected.id), edit && _jsx(EditWork, { item: item, close: () => setEdit(false) }), adoption && _jsx(AdoptDefaults, { item: item, kind: adoption, close: () => setAdoption(null) })] });
}
function Timeline({ item, stages, schedule, onSelect }) {
    const { envelope } = useWorkspace();
    const members = envelope?.state.members ?? [];
    const dates = Object.values(schedule.tasks).flatMap(task => [task.start, task.due, task.official]).filter((value) => !!value);
    if (item.date)
        dates.push(item.date);
    dates.sort();
    const from = dates[0], to = dates.at(-1);
    const span = from && to ? Math.max(1, (dateValue(to) - dateValue(from)) / oneDay) : 1;
    const position = (date) => Math.max(0, Math.min(100, (dateValue(date) - dateValue(from)) / oneDay / span * 100));
    const today = todayInArizona();
    const todayPosition = from && to && today >= from && today <= to ? position(today) : null;
    return _jsxs("section", { className: "aw-timeline", "aria-label": "Activity timeline", children: [!item.date && _jsx("p", { className: "aw-note", children: "Set an activity date to calculate task dates from your timing defaults." }), _jsx("div", { className: "aw-timeline-scroll", children: _jsxs("div", { className: "aw-timeline-content", children: [_jsxs("div", { className: "aw-timeline-axis", children: [_jsx("span", { children: "Workflow step" }), _jsx("div", { children: from && to ? _jsxs(_Fragment, { children: [_jsx("span", { children: shortDate(from) }), _jsx("span", { children: shortDate(to) }), item.date && _jsx("span", { className: "aw-event-marker", style: { left: `${position(item.date)}%` }, children: "Activity" }), todayPosition !== null && _jsx("span", { className: "aw-today-marker", style: { left: `${todayPosition}%` }, children: "Today" })] }) : _jsx("span", { children: "Dates will appear when scheduling information is available" }) })] }), stages.map(stage => _jsxs("details", { className: "aw-timeline-stage", open: stage.status === 'current' || stage.blocked > 0, children: [_jsxs("summary", { children: [_jsx("strong", { children: stage.title }), _jsxs("span", { children: [stage.completed, "/", stage.total, " complete", stage.blocked > 0 ? ` · ${stage.blocked} blocked` : ''] })] }), stage.tasks.map(task => {
                                    const plan = schedule.tasks[task.id];
                                    const start = plan?.start, due = plan?.due;
                                    const owner = envelope?.organization.roles.find(role => task.roleIds.includes(role.id));
                                    const color = envelope?.organization.departments.find(dept => dept.id === owner?.departmentId)?.color ?? '#536b8b';
                                    const bar = start && due && from ? { left: `${position(start)}%`, width: `${Math.max(1.5, position(due) - position(start))}%`, backgroundColor: color } : { left: '0', width: 'auto', backgroundColor: '#edf0f4', color: '#526075' };
                                    return _jsxs("div", { className: "aw-timeline-row", children: [_jsxs("button", { className: "aw-timeline-label", onClick: () => onSelect(task), children: [_jsx("strong", { children: task.title }), _jsx("small", { children: memberName(members, task.ownerId) }), _jsx(Status, { status: task.status })] }), _jsxs("div", { className: "aw-timeline-track", children: [todayPosition !== null && _jsx("i", { className: "aw-today-line", style: { left: `${todayPosition}%` } }), _jsx("button", { className: `aw-timeline-bar aw-bar-${task.status}`, style: bar, "aria-label": `${task.title}: ${start ? shortDate(start) : 'Start not scheduled'} to ${due ? shortDate(due) : 'Due date not scheduled'}`, onClick: () => onSelect(task), children: due ? shortDate(due) : 'Not scheduled' }), plan?.official && _jsx("button", { className: "aw-official-marker", style: { left: `${position(plan.official)}%` }, "aria-label": `Official deadline for ${task.title}: ${shortDate(plan.official)}`, onClick: () => onSelect(task), children: "\u25C6" })] })] }, task.id);
                                })] }, stage.id)), !stages.length && _jsx("p", { className: "aw-empty", children: "No steps match these filters." })] }) }), _jsx("p", { className: "aw-muted aw-timeline-legend", children: "Bars show task schedules \u00B7 \u25C6 Official deadline \u00B7 Department colors identify responsibilities" })] });
}
function TaskDetail({ task, item, schedule, close }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
    const members = envelope?.state.members ?? [];
    const manager = actor?.access === 'manager';
    const canControl = manager || task.ownerId === actor?.id;
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description);
    const [ownerId, setOwnerId] = useState(task.ownerId ?? '');
    const [due, setDue] = useState(task.dueOverride ?? '');
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [evidence, setEvidence] = useState('');
    const [depends, setDepends] = useState(task.dependsOn);
    const previous = useRef(task);
    const [versionNotice, setVersionNotice] = useState(false);
    useEffect(() => {
        const old = previous.current;
        const sync = (local, before, after, set) => {
            if (local === before)
                set(after);
            else if (before !== after && local !== after)
                setVersionNotice(true);
        };
        sync(title, old.title, task.title, setTitle);
        sync(description, old.description, task.description, setDescription);
        sync(ownerId, old.ownerId ?? '', task.ownerId ?? '', setOwnerId);
        sync(due, old.dueOverride ?? '', task.dueOverride ?? '', setDue);
        if (JSON.stringify(depends) === JSON.stringify(old.dependsOn))
            setDepends(task.dependsOn);
        else if (JSON.stringify(old.dependsOn) !== JSON.stringify(task.dependsOn))
            setVersionNotice(true);
        previous.current = task;
    }, [task]);
    const dialog = useRef(null);
    const plan = schedule.tasks[task.id];
    const gate = item.gates.find(entry => entry.id === task.gateId);
    const ready = taskReady(item, task);
    const participant = canControl || (!!actor && task.collaboratorIds.includes(actor.id));
    const dirty = title !== task.title || description !== task.description || ownerId !== (task.ownerId ?? '') || due !== (task.dueOverride ?? '') || JSON.stringify(depends) !== JSON.stringify(task.dependsOn) || !!progress.trim() || !!evidence.trim();
    const unsaved = useUnsavedGuard(dirty, mutating, 'Leave this page with unfinished task changes? A recovery copy is kept on this device.');
    const recovery = useFormRecovery(envelope ? `platypus.workspace-input.${envelope.state.workspaceId}.task.${task.id}` : null, { title, description, ownerId, due, progress, evidence, depends }, dirty, TaskInputSchema, saved => { setTitle(saved.title); setDescription(saved.description); setOwnerId(saved.ownerId); setDue(saved.due); setProgress(saved.progress); setEvidence(saved.evidence); setDepends(saved.depends); });
    const dismiss = () => { if (unsaved.confirmDiscard())
        close(); };
    const update = async (e) => {
        e.preventDefault();
        setError('');
        if (versionNotice && !window.confirm('This task changed while you were editing. Save your reviewed edits over the latest saved fields?'))
            return;
        try {
            await mutate({ type: 'task.update', workItemId: item.id, taskId: task.id, patch: { title, description, ...(manager ? { ownerId: ownerId || null, dueOverride: due || null, dependsOn: depends } : {}) } });
            unsaved.markSaved();
            recovery.clear();
            close();
        }
        catch (e) {
            setError(e.message);
        }
    };
    useDialogFocus(dialog, dismiss, mutating, false);
    useEffect(() => { dialog.current?.focus(); dialog.current?.scrollIntoView?.({ block: "nearest" }); }, [task.id]);
    return _jsx("div", { className: "aw-task-detail-shell", children: _jsxs("div", { className: "aw-modal aw-task-dialog", role: "dialog", "aria-modal": "false", "aria-labelledby": "aw-task-title", tabIndex: -1, ref: dialog, onKeyDown: e => { if (e.key === "Escape") {
                e.preventDefault();
                dismiss();
            } }, children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("span", { className: "aw-eyebrow", children: item.name }), _jsx("h2", { id: "aw-task-title", children: task.title })] }), _jsx("button", { "aria-label": "Close task details", disabled: mutating, onClick: dismiss, children: "\u00D7" })] }), _jsxs("div", { className: "aw-inline", children: [_jsx(Status, { status: task.status }), _jsx("span", { children: memberName(members, task.ownerId) })] }), recovery.notice && _jsx("p", { className: "aw-note", role: "status", children: recovery.notice }), versionNotice && _jsx("p", { className: "aw-note", role: "status", children: "The saved task changed. Your unfinished edits are preserved; review them before saving." }), _jsxs("dl", { className: "aw-date-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Start" }), _jsx("dd", { children: plan?.start ? shortDate(plan.start) : 'Not scheduled' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Team target" }), _jsx("dd", { children: plan?.due ? shortDate(plan.due) : 'Not scheduled' })] }), _jsxs("div", { children: [_jsx("dt", { children: "Official deadline" }), _jsx("dd", { children: plan?.official ? shortDate(plan.official) : 'Not applicable' })] })] }), plan?.basis && _jsx("p", { className: "aw-muted", children: plan.basis }), plan?.issues.length ? _jsx("ul", { className: "aw-note", children: plan.issues.map((issue, i) => _jsx("li", { children: issue.replace(/^[a-z_]+:\s*/, "") }, i)) }) : null, !ready && task.status !== 'done' && _jsx("p", { className: "aw-note", children: "This task is waiting for a prerequisite, an unresolved blocker or an upstream review." }), task.collaboratorIds.length > 0 && _jsxs("p", { children: ["Supporting members: ", task.collaboratorIds.map(id => memberName(members, id)).join(' · ')] }), task.blockers.map(blocker => _jsxs("div", { className: "aw-blocker", children: [_jsx("strong", { children: blocker.reason }), canControl && _jsx("button", { disabled: mutating || !evidence.trim(), onClick: () => void mutate({ type: 'task.unblock', workItemId: item.id, taskId: task.id, blockerId: blocker.id, evidence }).catch(e => setError(e.message)), children: "Resolve this blocker" })] }, blocker.id)), task.blockers.length > 0 && canControl && _jsxs("label", { children: ["Resolution evidence", _jsx("input", { value: evidence, onChange: e => setEvidence(e.target.value), maxLength: 1000, placeholder: "What changed?" })] }), gate && _jsx(GateForm, { gate: gate, item: item, ready: ready }), _jsx("form", { onSubmit: e => void update(e), children: _jsxs("fieldset", { disabled: mutating || !canControl, children: [_jsxs("label", { children: ["Task title", _jsx("input", { value: title, onChange: e => setTitle(e.target.value), required: true, maxLength: 180 })] }), _jsxs("label", { children: ["Description", _jsx("textarea", { value: description, onChange: e => setDescription(e.target.value), maxLength: 1000 })] }), manager && _jsxs(_Fragment, { children: [_jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Main responsible member", _jsxs("select", { value: ownerId, onChange: e => setOwnerId(e.target.value), children: [_jsx("option", { value: "", children: "Needs assignment" }), members.map(member => _jsx("option", { value: member.id, children: member.name }, member.id))] })] }), _jsxs("label", { children: ["Fixed team date", _jsx("input", { type: "date", value: due, onChange: e => setDue(e.target.value) })] })] }), _jsxs("details", { children: [_jsx("summary", { children: "Prerequisite steps" }), item.tasks.filter(candidate => candidate.id !== task.id).map(candidate => _jsxs("label", { className: "aw-checkbox", children: [_jsx("input", { type: "checkbox", checked: depends.includes(candidate.id), onChange: e => setDepends(e.target.checked ? [...depends, candidate.id] : depends.filter(id => id !== candidate.id)) }), candidate.title] }, candidate.id))] })] }), canControl && _jsx("button", { type: "submit", className: "aw-primary", children: "Save task changes" })] }) }), participant && task.status !== 'done' && _jsxs("form", { className: "aw-progress-form", onSubmit: e => { e.preventDefault(); void mutate({ type: 'task.progress', workItemId: item.id, taskId: task.id, text: progress }).then(() => setProgress('')).catch(e => setError(e.message)); }, children: [_jsxs("label", { children: ["Progress update", _jsx("textarea", { required: true, maxLength: 1000, value: progress, onChange: e => setProgress(e.target.value) })] }), _jsx("button", { disabled: mutating || !progress.trim(), children: "Add update" })] }), task.progress.length > 0 && _jsxs("details", { children: [_jsxs("summary", { children: ["Updates \u00B7 ", task.progress.length] }), task.progress.map((entry, i) => _jsxs("p", { children: [_jsx("strong", { children: memberName(members, entry.memberId) }), " \u00B7 ", entry.text] }, i))] }), error && _jsx("p", { role: "alert", className: "aw-error", children: error }), _jsxs("footer", { children: [_jsx("button", { onClick: dismiss, children: "Close" }), task.kind === 'task' && task.status !== 'done' && _jsx("button", { className: "aw-primary", disabled: mutating || !canControl || !ready, onClick: () => { if (!unsaved.confirmDiscard())
                                return; void mutate({ type: 'task.complete', workItemId: item.id, taskId: task.id }).then(() => { unsaved.markSaved(); close(); }).catch(e => setError(e.message)); }, children: "Complete task" }), manager && task.status === 'done' && _jsx("button", { disabled: mutating, onClick: () => void mutate({ type: 'task.reopen', workItemId: item.id, taskId: task.id }).then(() => { unsaved.markSaved(); close(); }).catch(e => setError(e.message)), children: "Reopen task" })] })] }) });
}
function GateForm({ gate, item, ready }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const [evidence, setEvidence] = useState('');
    const [error, setError] = useState('');
    const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
    useUnsavedGuard(gate.status === 'pending' && !!evidence.trim(), mutating, 'Leave this page with unfinished approval evidence?');
    const recovery = useFormRecovery(envelope ? `platypus.workspace-input.${envelope.state.workspaceId}.approval.${gate.id}` : null, { evidence }, gate.status === 'pending' && !!evidence.trim(), z.object({ evidence: z.string().max(1000) }), saved => setEvidence(saved.evidence));
    const canDecide = actor?.access === 'manager' || (!!actor && (!gate.external && gate.approverIds.includes(actor.id)));
    if (gate.status !== 'pending')
        return _jsxs("p", { className: "aw-note", children: ["Decision recorded: ", gate.status, ". ", gate.evidence] });
    return _jsxs("section", { className: "aw-gate", children: [_jsx("h3", { children: "Approval decision" }), _jsx("p", { children: gate.external ? 'Record the actual external decision and its source. This does not send an application or verify an external approval.' : 'Record the decision for this approval step.' }), gate.reason && _jsx("p", { children: gate.reason }), recovery.notice && _jsx("p", { className: "aw-muted", children: recovery.notice }), _jsxs("label", { children: ["Decision evidence", _jsx("textarea", { required: true, maxLength: 1000, value: evidence, onChange: e => setEvidence(e.target.value), placeholder: "Approval record, reference or reason for rejection" })] }), _jsxs("div", { className: "aw-inline", children: [_jsx("button", { className: "aw-primary", disabled: mutating || !canDecide || !ready || !evidence.trim(), onClick: () => void mutate({ type: 'gate.decide', workItemId: item.id, gateId: gate.id, decision: 'approved', evidence }).catch(e => setError(e.message)), children: "Record approval" }), _jsx("button", { disabled: mutating || !canDecide || !ready || !evidence.trim(), onClick: () => void mutate({ type: 'gate.decide', workItemId: item.id, gateId: gate.id, decision: 'rejected', evidence }).catch(e => setError(e.message)), children: "Record rejection" })] }), error && _jsx("p", { className: "aw-error", role: "alert", children: error })] });
}
function FundingPanel({ item, onNotice }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
    const manager = actor?.access === 'manager';
    const [adding, setAdding] = useState(false);
    const [amount, setAmount] = useState('');
    const [purpose, setPurpose] = useState('');
    const [source, setSource] = useState('college');
    const [category, setCategory] = useState('other');
    useUnsavedGuard(adding && !!(amount || purpose), mutating, 'Leave this page with an unfinished funding request?');
    const recovery = useFormRecovery(envelope ? `platypus.workspace-input.${envelope.state.workspaceId}.funding-new.${item.id}` : null, { adding, amount, purpose, source, category }, adding && !!(amount || purpose), NewFundingInputSchema, saved => { setAdding(saved.adding); setAmount(saved.amount); setPurpose(saved.purpose); setSource(saved.source); setCategory(saved.category); });
    return _jsxs("section", { className: "aw-funding", "aria-label": "Activity funding", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: "Funding" }), _jsx("p", { children: "Requests, approvals and purchases are part of this workflow." })] }), manager && _jsx("button", { onClick: () => setAdding(!adding), children: "+ Add funding source" })] }), !item.funding.length && _jsx("p", { className: "aw-muted", children: "No funding requests for this work." }), recovery.notice && _jsx("p", { className: "aw-note", role: "status", children: recovery.notice }), item.funding.map(request => _jsx(FundingCard, { item: item, request: request, manager: manager, onNotice: onNotice }, request.id)), adding && _jsxs("form", { className: "aw-funding-form", onSubmit: e => { e.preventDefault(); void mutate({ type: 'funding.add', workItemId: item.id, requestId: workspaceId(), amount: Number(amount), source, purpose, category }).then(() => { setAdding(false); setAmount(''); setPurpose(''); }).catch(e => onNotice(e.message)); }, children: [_jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Source", _jsxs("select", { value: source, onChange: e => setSource(e.target.value), children: [_jsx("option", { value: "college", children: "College" }), _jsx("option", { value: "usg", children: "USG" }), _jsx("option", { value: "dues", children: "Club funds" }), _jsx("option", { value: "sponsor", children: "Sponsor" })] })] }), _jsxs("label", { children: ["Amount (USD)", _jsx("input", { type: "number", min: "0", max: "1000000", step: "0.01", value: amount, onChange: e => setAmount(e.target.value), required: true })] })] }), _jsxs("label", { children: ["Funding category", _jsxs("select", { value: category, onChange: e => setCategory(e.target.value), children: [_jsx("option", { value: "other", children: "Other purchases" }), _jsx("option", { value: "food_service", children: "Food or services" }), _jsx("option", { value: "speaker", children: "Speaker or performer" })] })] }), _jsxs("label", { children: ["Purpose", _jsx("input", { value: purpose, maxLength: 1000, onChange: e => setPurpose(e.target.value), required: true })] }), _jsx("button", { disabled: mutating, children: "Add request and workflow steps" })] })] });
}
function FundingCard({ item, request, manager, onNotice }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const [editing, setEditing] = useState(false);
    const [amount, setAmount] = useState(String(request.amount));
    const [purpose, setPurpose] = useState(request.purpose);
    const [source, setSource] = useState(request.source);
    const [category, setCategory] = useState(request.category ?? 'other');
    const [spendBy, setSpendBy] = useState(request.spendBy ?? '');
    const [commitAmount, setCommitAmount] = useState('');
    const [commitPurpose, setCommitPurpose] = useState('');
    const [evidence, setEvidence] = useState('');
    const dirty = amount !== String(request.amount) || purpose !== request.purpose || source !== request.source || category !== (request.category ?? 'other') || spendBy !== (request.spendBy ?? '') || !!commitAmount || !!commitPurpose || (!!evidence.trim() && request.commitments.some(commitment => commitment.status === 'reserved'));
    useUnsavedGuard(dirty, mutating, 'Leave this page with unfinished funding changes? A recovery copy is kept on this device.');
    const recovery = useFormRecovery(envelope ? `platypus.workspace-input.${envelope.state.workspaceId}.funding.${request.id}` : null, { editing, amount, purpose, source, category, spendBy, commitAmount, commitPurpose, evidence }, dirty, FundingInputSchema, saved => { setEditing(saved.editing); setAmount(saved.amount); setPurpose(saved.purpose); setSource(saved.source); setCategory(saved.category); setSpendBy(saved.spendBy); setCommitAmount(saved.commitAmount); setCommitPurpose(saved.commitPurpose); setEvidence(saved.evidence); });
    const left = request.approvedAmount === null ? null : request.approvedAmount - request.committedAmount - request.spentAmount;
    return _jsxs("article", { className: "aw-funding-card", children: [_jsxs("div", { className: "aw-inline", children: [_jsxs("h3", { children: [request.source.toUpperCase(), " \u00B7 ", money(request.amount)] }), _jsxs("span", { className: "aw-funding-state", children: [request.status, " \u00B7 version ", request.version] })] }), _jsx("p", { children: request.purpose }), _jsxs("dl", { className: "aw-date-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Approved" }), _jsx("dd", { children: request.approvedAmount === null ? 'Not approved' : money(request.approvedAmount) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Reserved / spent" }), _jsxs("dd", { children: [money(request.committedAmount), " / ", money(request.spentAmount)] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Available" }), _jsx("dd", { children: left === null ? 'Waiting for approval' : money(left) })] })] }), recovery.notice && _jsx("p", { className: "aw-note", role: "status", children: recovery.notice }), _jsx("div", { className: "aw-funding-steps", children: item.gates.filter(gate => gate.requestId === request.id && gate.requestVersion === request.version).map(gate => _jsxs(Link, { to: `/phase1/work/${item.id}?task=${gate.taskId}`, children: [gate.kind === 'budget' ? 'Budget approval' : 'Purchase approval', " \u00B7 ", gate.status, " \u00B7 v", gate.requestVersion] }, gate.id)) }), item.gates.some(gate => gate.requestId === request.id && gate.requestVersion !== request.version) && _jsxs("details", { children: [_jsx("summary", { children: "Previous approval decisions" }), item.gates.filter(gate => gate.requestId === request.id && gate.requestVersion !== request.version).map(gate => _jsxs("p", { children: [gate.kind === 'budget' ? 'Budget' : 'Purchase', " \u00B7 version ", gate.requestVersion, " \u00B7 ", gate.status, _jsx("br", {}), gate.evidence || 'No decision evidence recorded.', gate.decidedAt && _jsxs(_Fragment, { children: [_jsx("br", {}), new Date(gate.decidedAt).toLocaleString('en-US', { timeZone: 'America/Phoenix' })] })] }, gate.id))] }), manager && _jsx("button", { onClick: () => setEditing(!editing), children: "Revise request" }), editing && _jsxs("form", { onSubmit: e => { e.preventDefault(); void mutate({ type: 'funding.revise', workItemId: item.id, requestId: request.id, amount: Number(amount), source, purpose, category }).then(() => { setEditing(false); onNotice('Request revised. Previous approval does not approve the new request version.'); }).catch(e => onNotice(e.message)); }, children: [_jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Requested amount (USD)", _jsx("input", { type: "number", min: "0", step: "0.01", value: amount, onChange: e => setAmount(e.target.value), required: true })] }), _jsxs("label", { children: ["Funding source", _jsxs("select", { value: source, onChange: e => setSource(e.target.value), children: [_jsx("option", { value: "college", children: "College" }), _jsx("option", { value: "usg", children: "USG" }), _jsx("option", { value: "dues", children: "Club funds" }), _jsx("option", { value: "sponsor", children: "Sponsor" })] })] })] }), _jsxs("label", { children: ["Funding category", _jsxs("select", { value: category, onChange: e => setCategory(e.target.value), children: [_jsx("option", { value: "other", children: "Other purchases" }), _jsx("option", { value: "food_service", children: "Food or services" }), _jsx("option", { value: "speaker", children: "Speaker or performer" })] })] }), _jsxs("label", { children: ["Purpose", _jsx("input", { value: purpose, maxLength: 1000, onChange: e => setPurpose(e.target.value), required: true })] }), _jsx("p", { className: "aw-muted", children: "A material change requires a new approval. Completed spending remains recorded." }), _jsx("button", { disabled: mutating, children: "Save new request version" })] }), manager && _jsxs("form", { className: "aw-funding-deadline", onSubmit: e => { e.preventDefault(); void mutate({ type: 'funding.setDeadline', workItemId: item.id, requestId: request.id, spendBy: spendBy || null }).then(() => onNotice('Funding use-by date saved. Activity date changes will not move this date.')).catch(e => onNotice(e.message)); }, children: [_jsxs("label", { children: ["Funds must be used by", _jsx("input", { type: "date", value: spendBy, onChange: e => setSpendBy(e.target.value) })] }), _jsx("button", { disabled: mutating || spendBy === (request.spendBy ?? ''), children: "Save use-by date" })] }), manager && request.status === 'approved' && _jsxs("details", { children: [_jsx("summary", { children: "Reserve a purchase" }), _jsxs("form", { onSubmit: e => { e.preventDefault(); void mutate({ type: 'funding.commit', workItemId: item.id, requestId: request.id, commitmentId: workspaceId(), amount: Number(commitAmount), purpose: commitPurpose }).then(() => { setCommitAmount(''); setCommitPurpose(''); }).catch(e => onNotice(e.message)); }, children: [_jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Amount (USD)", _jsx("input", { required: true, type: "number", min: "0.01", step: "0.01", value: commitAmount, onChange: e => setCommitAmount(e.target.value) })] }), _jsxs("label", { children: ["Purchase purpose", _jsx("input", { required: true, maxLength: 400, value: commitPurpose, onChange: e => setCommitPurpose(e.target.value) })] })] }), _jsx("button", { disabled: mutating, children: "Reserve against approved funding" })] })] }), request.commitments.length > 0 && _jsxs("details", { children: [_jsxs("summary", { children: ["Purchases \u00B7 ", request.commitments.length] }), manager && _jsxs("label", { children: ["Spending or release evidence", _jsx("input", { value: evidence, onChange: e => setEvidence(e.target.value), maxLength: 1000 })] }), request.commitments.map(commitment => _jsxs("div", { className: "aw-commitment", children: [_jsxs("span", { children: [commitment.purpose, " \u00B7 ", money(commitment.amount), " \u00B7 ", commitment.status] }), manager && commitment.status === 'reserved' && _jsxs("div", { className: "aw-inline", children: [_jsx("button", { disabled: mutating || !evidence.trim(), onClick: () => void mutate({ type: 'funding.spend', workItemId: item.id, requestId: request.id, commitmentId: commitment.id, evidence }).catch(e => onNotice(e.message)), children: "Record spent" }), _jsx("button", { disabled: mutating || !evidence.trim(), onClick: () => void mutate({ type: 'funding.release', workItemId: item.id, requestId: request.id, commitmentId: commitment.id, evidence }).catch(e => onNotice(e.message)), children: "Release reservation" })] })] }, commitment.id))] })] });
}
function EditWork({ item, close }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const [name, setName] = useState(item.name);
    const [date, setDate] = useState(item.date ?? '');
    const [description, setDescription] = useState(item.description);
    const [ownerId, setOwnerId] = useState(item.ownerId ?? '');
    const [error, setError] = useState('');
    const dialog = useRef(null);
    const unsaved = useUnsavedGuard(name !== item.name || date !== (item.date ?? '') || description !== item.description || ownerId !== (item.ownerId ?? ''), mutating, 'Discard unsaved activity changes?');
    const recovery = useFormRecovery(envelope ? `platypus.workspace-input.${envelope.state.workspaceId}.work.${item.id}` : null, { name, date, description, ownerId }, name !== item.name || date !== (item.date ?? '') || description !== item.description || ownerId !== (item.ownerId ?? ''), WorkInputSchema, saved => { setName(saved.name); setDate(saved.date); setDescription(saved.description); setOwnerId(saved.ownerId); });
    const dismiss = () => { if (unsaved.confirmDiscard())
        close(); };
    useDialogFocus(dialog, dismiss, mutating);
    const impact = useMemo(() => item.tasks.filter(task => task.status !== 'done' && task.applicability !== 'inactive').length, [item.tasks]);
    return _jsx("div", { className: "aw-modal-backdrop", children: _jsxs("div", { ref: dialog, tabIndex: -1, className: "aw-modal aw-small-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "aw-edit-work-title", children: [_jsxs("header", { children: [_jsxs("h2", { id: "aw-edit-work-title", children: ["Edit ", item.kind === 'member_event' ? 'activity' : 'board work'] }), _jsx("button", { "aria-label": "Close work settings", disabled: mutating, onClick: dismiss, children: "\u00D7" })] }), _jsx("form", { onSubmit: e => { e.preventDefault(); void mutate({ type: 'work.update', workItemId: item.id, patch: { name, description, date: date || null, ownerId: ownerId || null } }).then(() => { unsaved.markSaved(); recovery.clear(); close(); }).catch(e => setError(e.message)); }, children: _jsxs("fieldset", { disabled: mutating, children: [_jsxs("label", { children: ["Name", _jsx("input", { autoFocus: true, required: true, maxLength: 180, value: name, onChange: e => setName(e.target.value) })] }), _jsxs("label", { children: ["Description", _jsx("textarea", { maxLength: 2000, value: description, onChange: e => setDescription(e.target.value) })] }), _jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Date", _jsx("input", { type: "date", value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("label", { children: ["Work lead", _jsxs("select", { value: ownerId, onChange: e => setOwnerId(e.target.value), children: [_jsx("option", { value: "", children: "Needs assignment" }), envelope?.state.members.map(member => _jsx("option", { value: member.id, children: member.name }, member.id))] })] })] }), date !== (item.date ?? '') && _jsxs("p", { className: "aw-note", children: ["Changing the date recalculates ", impact, " unfinished steps. Completed records and fixed date overrides remain; schedule conflicts will be highlighted."] }), recovery.notice && _jsx("p", { className: "aw-note", role: "status", children: recovery.notice }), error && _jsx("p", { className: "aw-error", role: "alert", children: error }), _jsxs("footer", { children: [_jsx("button", { type: "button", onClick: dismiss, children: "Cancel" }), _jsx("button", { className: "aw-primary", children: "Save changes" })] })] }) })] }) });
}
function AdoptDefaults({ item, kind, close }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const [latest, setLatest] = useState(null);
    const [loading, setLoading] = useState(kind === 'template');
    const [error, setError] = useState('');
    const dialog = useRef(null);
    useDialogFocus(dialog, close, mutating);
    useEffect(() => {
        if (kind !== 'template')
            return;
        const controller = new AbortController();
        void readApprovedContext(controller.signal).then(context => { if (!controller.signal.aborted) {
            setLatest(context);
            setLoading(false);
            if (!context)
                setError('Confirm an organization workflow before applying a template.');
        } }).catch(e => { if (!controller.signal.aborted) {
            setError(e.message);
            setLoading(false);
        } });
        return () => controller.abort();
    }, [kind]);
    const oldNodes = item.templateFlow?.nodes ?? [];
    const newNodes = latest?.onDemand.memberWorkflow.nodes ?? [];
    const additions = newNodes.filter(node => !oldNodes.some(old => old.id === node.id));
    const removals = oldNodes.filter(node => !newNodes.some(next => next.id === node.id));
    const changes = newNodes.filter(node => { const old = oldNodes.find(old => old.id === node.id); return old && JSON.stringify([node.title, node.description, node.roleIds, node.dependsOn, node.dependencyMode, node.timing]) !== JSON.stringify([old.title, old.description, old.roleIds, old.dependsOn, old.dependencyMode, old.timing]); });
    const protectedCount = item.tasks.filter(task => task.status === 'done' || task.manualFields.length > 0 || task.dueOverride).length;
    const timing = envelope?.organization.timingDefaults;
    const timingChanged = !!timing && JSON.stringify(timing) !== JSON.stringify(item.timingDefaults);
    const templateChanged = !!latest && latest.contextVersion !== item.templateVersion;
    const apply = async () => {
        try {
            if (kind === 'timing' && timing)
                await mutate({ type: 'work.applyTiming', workItemId: item.id, timingDefaults: timing });
            else if (kind === 'template' && latest)
                await mutate({ type: 'work.applyTemplate', workItemId: item.id, templateVersion: latest.contextVersion });
            else
                return;
            close();
        }
        catch (e) {
            setError(e.message);
        }
    };
    return _jsx("div", { className: "aw-modal-backdrop", children: _jsxs("div", { ref: dialog, tabIndex: -1, className: "aw-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "aw-adopt-title", children: [_jsxs("header", { children: [_jsxs("h2", { id: "aw-adopt-title", children: ["Review ", kind === 'timing' ? 'timing defaults' : 'workflow changes'] }), _jsx("button", { "aria-label": "Close adoption review", disabled: mutating, onClick: close, children: "\u00D7" })] }), _jsx("p", { children: item.name }), loading ? _jsx("p", { role: "status", children: "Loading the latest confirmed workflow\u2026" }) : kind === 'timing' ? _jsxs(_Fragment, { children: [_jsxs("table", { className: "aw-adoption-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Milestone" }), _jsx("th", { children: "This work" }), _jsx("th", { children: "Latest default" })] }) }), _jsx("tbody", { children: [['Confirm items', 'itemsWeeks'], ['Confirm quotes', 'quotesWeeks'], ['Submit budget request', 'budgetWeeks']].map(([label, key]) => _jsxs("tr", { children: [_jsx("td", { children: label }), _jsxs("td", { children: [item.timingDefaults[key], " weeks before"] }), _jsxs("td", { children: [timing?.[key] ?? item.timingDefaults[key], " weeks before"] })] }, key)) })] }), !timingChanged && _jsx("p", { className: "aw-note", children: "This work already uses these timing defaults." })] }) : latest && _jsxs(_Fragment, { children: [_jsxs("p", { children: ["Organization version ", item.templateVersion, " \u2192 ", latest.contextVersion] }), !templateChanged ? _jsx("p", { className: "aw-note", children: "This work already uses the latest confirmed template." }) : _jsxs(_Fragment, { children: [_jsxs("p", { children: [additions.length, " added \u00B7 ", changes.length, " changed \u00B7 ", removals.length, " no longer in the template"] }), additions.length > 0 && _jsxs("div", { children: [_jsx("h3", { children: "New steps" }), _jsx("ul", { children: additions.map(node => _jsx("li", { children: node.title }, node.id)) })] }), changes.length > 0 && _jsxs("div", { children: [_jsx("h3", { children: "Changed steps" }), _jsx("ul", { children: changes.map(node => _jsx("li", { children: node.title }, node.id)) })] }), removals.length > 0 && _jsxs("div", { children: [_jsx("h3", { children: "Removed from the latest template" }), _jsx("ul", { children: removals.map(node => _jsx("li", { children: node.title }, node.id)) })] })] })] }), _jsxs("p", { className: "aw-note", children: [protectedCount, " completed or manually adjusted tasks remain protected. Fixed dates and funding records are retained. Related unfinished steps may require a review after applying changes."] }), error && _jsx("p", { className: "aw-error", role: "alert", children: error }), _jsxs("footer", { children: [_jsx("button", { disabled: mutating, onClick: close, children: "Cancel" }), _jsxs("button", { className: "aw-primary", disabled: mutating || loading || (kind === 'timing' ? !timingChanged : !templateChanged), onClick: () => void apply(), children: ["Apply reviewed ", kind === 'timing' ? 'timing' : 'workflow', " changes"] })] })] }) });
}
