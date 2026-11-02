import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace, workspaceId } from '../client';
import { taskReady } from '../selectors';
import { memberName, shortDate, STATUS_LABELS, TaskLink } from './shared';
import { useUnsavedGuard } from './unsavedGuard';
import { useDialogFocus } from './dialogFocus';
export default function TaskBoard({ schedules }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const [filter, setFilter] = useState('');
    const [drag, setDrag] = useState(null);
    const [over, setOver] = useState(null);
    const [notice, setNotice] = useState('');
    const [stuck, setStuck] = useState(null);
    const [reason, setReason] = useState('');
    const [kind, setKind] = useState('needs_help');
    const [target, setTarget] = useState('');
    const [showFuture, setShowFuture] = useState(false);
    const blockerDialog = useRef(null);
    const blockerGuard = useUnsavedGuard(!!stuck && !!reason.trim(), mutating, 'Discard this unsaved blocker?');
    const closeBlocker = () => { if (blockerGuard.confirmDiscard())
        setStuck(null); };
    useDialogFocus(blockerDialog, closeBlocker, mutating, !!stuck);
    const actor = envelope?.state.members.find(m => m.id === envelope.state.actorId);
    const rows = useMemo(() => envelope?.state.workItems.flatMap(item => item.tasks
        .filter(task => task.applicability !== 'inactive' && (task.ownerId === actor?.id || (!!actor && (task.collaboratorIds.includes(actor.id) || item.gates.some(gate => gate.id === task.gateId && gate.approverIds.includes(actor.id))))) && (!filter || item.id === filter))
        .map(task => ({ item, task }))) ?? [], [envelope, actor?.id, filter]);
    const allVisible = showFuture ? rows : rows.filter(row => row.task.status !== 'to_do' || taskReady(row.item, row.task));
    const future = rows.filter(row => row.task.status === 'to_do' && !taskReady(row.item, row.task)).length;
    const canControl = (task) => actor?.access === 'manager' || task.ownerId === actor?.id;
    const perform = async (row, status, beforeId) => {
        if (mutating || !canControl(row.task))
            return;
        setNotice('');
        if (row.task.kind === 'approval') {
            setNotice('Record the approval decision inside its activity. Moving a card cannot approve funding.');
            return;
        }
        if (status === 'stuck') {
            setStuck(row);
            setReason('');
            setTarget('');
            setKind('needs_help');
            return;
        }
        try {
            await mutate(status === 'done' ? { type: 'task.complete', workItemId: row.item.id, taskId: row.task.id } : { type: 'task.move', workItemId: row.item.id, taskId: row.task.id, status, beforeId });
            setNotice(status === 'done' ? 'Task completed. Activity progress has been updated.' : 'Task updated.');
        }
        catch (e) {
            setNotice(e.message);
        }
    };
    const complete = rows.filter(row => row.task.status === 'done');
    const drop = (e, status, beforeId = null) => {
        e.preventDefault();
        e.stopPropagation();
        const id = e.dataTransfer.getData('text/plain') || drag;
        const row = rows.find(row => row.task.id === id);
        setDrag(null);
        setOver(null);
        if (row)
            void perform(row, status, beforeId);
    };
    return _jsxs(_Fragment, { children: [_jsxs("header", { className: "aw-page-head", children: [_jsxs("div", { children: [_jsx("span", { className: "aw-eyebrow", children: "PERSONAL WORKFLOW" }), _jsx("h1", { children: "My tasks" }), _jsx("p", { children: actor ? `${actor.name} · ${rows.filter(row => row.task.status !== 'done').length} open tasks` : 'Choose a demo member to see assigned work.' })] }), _jsx(Link, { to: "/phase1/activities", className: "aw-button", children: "Browse activities" })] }), !actor && _jsxs("p", { className: "aw-note", children: ["Set up test members and their roles in ", _jsx(Link, { to: "/phase1/setup", children: "Your team" }), ". This is a private demo workspace, not a signed-in organization account."] }), _jsxs("div", { className: "aw-filter-bar", children: [_jsxs("label", { children: ["Activity or board work", _jsxs("select", { "aria-label": "Filter my tasks by activity", value: filter, onChange: e => setFilter(e.target.value), children: [_jsx("option", { value: "", children: "All assigned work" }), envelope?.state.workItems.map(item => _jsx("option", { value: item.id, children: item.name }, item.id))] })] }), future > 0 && _jsxs("label", { className: "aw-checkbox", children: [_jsx("input", { type: "checkbox", checked: showFuture, onChange: e => setShowFuture(e.target.checked) }), "Show ", future, " tasks waiting for earlier steps"] })] }), notice && _jsxs("p", { className: "aw-note", role: "status", children: [notice, _jsx("button", { "aria-label": "Dismiss task update", onClick: () => setNotice(''), children: "\u00D7" })] }), _jsx("div", { className: "aw-board", "data-testid": "workspace-task-board", children: ['to_do', 'working', 'stuck'].map(status => {
                    const cards = allVisible.filter(row => row.task.status === status).sort((a, b) => a.task.rank - b.task.rank || a.task.id.localeCompare(b.task.id));
                    return _jsxs("section", { className: `aw-board-column aw-board-${status} ${over === status ? 'aw-drop-over' : ''}`, "aria-label": STATUS_LABELS[status], onDragOver: e => { if (!mutating) {
                            e.preventDefault();
                            setOver(status);
                        } }, onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget))
                            setOver(null); }, onDrop: e => drop(e, status), children: [_jsxs("header", { children: [_jsx("h2", { children: STATUS_LABELS[status] }), _jsx("span", { children: cards.length })] }), cards.map(row => {
                                const { item, task } = row;
                                const plan = schedules[item.id]?.tasks[task.id];
                                const ready = taskReady(item, task);
                                const enabled = canControl(task) && !mutating && task.kind !== 'approval';
                                return _jsxs("article", { className: `aw-task-card ${drag === task.id ? 'aw-dragging' : ''}`, "data-task-id": task.id, draggable: enabled, onDragStart: e => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; setDrag(task.id); }, onDragEnd: () => { setDrag(null); setOver(null); }, onDragOver: e => { e.preventDefault(); e.stopPropagation(); setOver(status); }, onDrop: e => drop(e, status, task.id), children: [_jsx("span", { className: "aw-eyebrow", children: item.name }), _jsx(TaskLink, { item: item, task: task }), _jsxs("div", { className: "aw-task-meta", children: [_jsx("span", { children: shortDate(plan?.due ?? task.dueOverride) }), _jsx("span", { children: task.ownerId === actor?.id ? 'You own this' : `Supporting ${memberName(envelope?.state.members ?? [], task.ownerId)}` })] }), !ready && task.status === 'to_do' && _jsx("p", { className: "aw-muted", children: "Waiting for an earlier step" }), task.blockers.map(blocker => _jsx("p", { className: "aw-blocker", children: blocker.reason }, blocker.id)), task.needsReview && _jsx("p", { className: "aw-blocker", children: "Upstream changes need review" }), task.kind === 'approval' ? _jsx(TaskLink, { item: item, task: task, children: "Review approval \u2192" }) : _jsxs("div", { className: "aw-task-actions", children: [_jsxs("label", { className: "aw-sr-only", htmlFor: `move-${task.id}`, children: ["Move ", task.title] }), _jsx("select", { id: `move-${task.id}`, value: status, disabled: !enabled, onChange: e => void perform(row, e.target.value), children: ['to_do', 'working', 'stuck'].map(value => _jsx("option", { value: value, disabled: value === 'working' && !ready, children: STATUS_LABELS[value] }, value)) }), _jsx("button", { disabled: !enabled || !ready, onClick: () => void perform(row, 'done'), children: "Complete" })] })] }, task.id);
                            }), !cards.length && _jsx("p", { className: "aw-column-empty", children: status === 'to_do' ? 'No tasks ready to start.' : status === 'working' ? 'Nothing in progress.' : 'No blocked tasks.' })] }, status);
                }) }), _jsxs("details", { className: "aw-completed", children: [_jsxs("summary", { children: ["Completed \u00B7 ", complete.length] }), complete.length ? complete.map(row => _jsxs("div", { children: [_jsx(TaskLink, { item: row.item, task: row.task }), _jsx("span", { children: row.item.name }), _jsx("button", { disabled: mutating || actor?.access !== 'manager', onClick: () => void mutate({ type: 'task.reopen', workItemId: row.item.id, taskId: row.task.id }).then(() => setNotice('Task reopened. Related activity steps have been checked.')).catch(e => setNotice(e.message)), children: "Reopen" })] }, row.task.id)) : _jsx("p", { children: "No completed tasks yet." })] }), stuck && _jsx("div", { className: "aw-modal-backdrop", children: _jsxs("div", { ref: blockerDialog, tabIndex: -1, className: "aw-modal aw-small-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "aw-stuck-title", children: [_jsxs("header", { children: [_jsx("h2", { id: "aw-stuck-title", children: "What is blocking this task?" }), _jsx("button", { "aria-label": "Close blocker form", disabled: mutating, onClick: closeBlocker, children: "\u00D7" })] }), _jsx("p", { children: stuck.task.title }), _jsx("form", { onSubmit: e => {
                                e.preventDefault();
                                void mutate({ type: 'task.move', workItemId: stuck.item.id, taskId: stuck.task.id, status: 'stuck', blocker: { id: workspaceId(), kind, targetId: kind === 'waiting_approval' || kind === 'waiting_dependency' ? target || null : null, reason, at: new Date().toISOString(), resumeStatus: stuck.task.status === 'working' ? 'working' : 'to_do' } }).then(() => { blockerGuard.markSaved(); setStuck(null); setNotice('Blocker recorded. Independent work can continue.'); }).catch(e => setNotice(e.message));
                            }, children: _jsxs("fieldset", { disabled: mutating, children: [_jsxs("label", { children: ["Reason type", _jsxs("select", { value: kind, onChange: e => { setKind(e.target.value); setTarget(''); }, children: [_jsx("option", { value: "needs_help", children: "Need help" }), _jsx("option", { value: "waiting_approval", disabled: !stuck.item.gates.some(gate => stuck.task.dependsOn.includes(gate.taskId) && stuck.item.tasks.find(task => task.id === gate.taskId)?.gateId === gate.id), children: "Waiting for approval" }), _jsx("option", { value: "waiting_dependency", disabled: !stuck.task.dependsOn.length, children: "Waiting for another step" }), _jsx("option", { value: "external_response", children: "Waiting for an external reply" })] })] }), (kind === 'waiting_approval' || kind === 'waiting_dependency') && _jsxs("label", { children: [kind === 'waiting_approval' ? 'Related approval' : 'Related step', _jsxs("select", { required: true, value: target, onChange: e => setTarget(e.target.value), children: [_jsxs("option", { value: "", children: ["Choose ", kind === 'waiting_approval' ? 'an approval' : 'a step'] }), kind === 'waiting_approval' ? stuck.item.gates.filter(gate => stuck.task.dependsOn.includes(gate.taskId) && stuck.item.tasks.find(task => task.id === gate.taskId)?.gateId === gate.id).map(gate => _jsx("option", { value: gate.id, children: stuck.item.tasks.find(task => task.id === gate.taskId)?.title ?? 'Approval' }, gate.id)) : stuck.item.tasks.filter(task => stuck.task.dependsOn.includes(task.id)).map(task => _jsx("option", { value: task.id, children: task.title }, task.id))] })] }), _jsxs("label", { children: ["What needs to happen?", _jsx("textarea", { autoFocus: true, required: true, maxLength: 400, value: reason, onChange: e => setReason(e.target.value) })] }), _jsxs("footer", { children: [_jsx("button", { type: "button", onClick: closeBlocker, children: "Cancel" }), _jsx("button", { type: "submit", className: "aw-primary", disabled: !reason.trim() || ((kind === 'waiting_approval' || kind === 'waiting_dependency') && !target), children: "Save blocker" })] })] }) })] }) })] });
}
