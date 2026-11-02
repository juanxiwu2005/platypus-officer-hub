import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { projectStages, shortChain, workItemStatus, workspaceToday } from '../selectors';
export const STATUS_LABELS = { to_do: 'To Do', working: 'Working on it', stuck: 'Stuck', done: 'Done', completed: 'Completed' };
export const todayInArizona = workspaceToday;
export function shortDate(value) {
    if (!value)
        return 'Date not set';
    return new Date(value + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Phoenix' });
}
export function memberName(members, id) { return members.find(m => m.id === id)?.name ?? 'Needs assignment'; }
export function Status({ status }) { return _jsx("span", { className: `aw-status aw-${status}`, children: STATUS_LABELS[status] }); }
export function TaskLink({ item, task, children }) { return _jsx(Link, { to: `/phase1/work/${item.id}?task=${task.id}`, children: children ?? task.title }); }
export function WorkStatus({ item }) { return _jsx(Status, { status: workItemStatus(item) }); }
export function CompactChain({ item }) {
    const stages = shortChain(item);
    if (!stages.length)
        return _jsx("span", { className: "aw-muted", children: "No workflow steps yet" });
    return _jsx("ol", { className: "aw-short-chain", "aria-label": `Workflow progress for ${item.name}`, children: stages.map(stage => _jsxs("li", { className: `aw-stage-${stage.status}`, children: [_jsx("span", { className: "aw-stage-state", children: stage.status === 'completed' ? 'Completed' : stage.status === 'current' ? 'Now' : 'Next' }), _jsxs("details", { children: [_jsx("summary", { children: stage.title }), _jsx("ul", { children: stage.tasks.map(task => _jsxs("li", { children: [_jsx(TaskLink, { item: item, task: task }), _jsx("span", { children: STATUS_LABELS[task.status] })] }, task.id)) })] }), _jsxs("small", { children: [stage.completed, "/", stage.total, " complete", stage.blocked ? ` · ${stage.blocked} blocked` : stage.activeBranches > 1 ? ` · ${stage.activeBranches} active` : ''] })] }, stage.id)) });
}
export function workflowProgress(item) {
    const stages = projectStages(item);
    return { completed: stages.reduce((sum, s) => sum + s.completed, 0), total: stages.reduce((sum, s) => sum + s.total, 0) };
}
