export function taskSatisfied(item, id) {
    const task = item.tasks.find(t => t.id === id);
    if (!task)
        return false;
    if (task.applicability === 'inactive')
        return !!task.applicabilityReason.trim();
    if (task.status !== 'done' || task.needsReview)
        return false;
    return task.kind !== 'approval' || item.gates.some(g => g.id === task.gateId && g.status === 'approved');
}
export function taskReady(item, task) {
    if (task.applicability === 'inactive' || task.needsReview || task.blockers.length)
        return false;
    if (!task.dependsOn.length)
        return true;
    const applicable = task.dependsOn.filter(id => item.tasks.find(t => t.id === id)?.applicability !== 'inactive');
    return task.dependencyMode === 'any'
        ? applicable.length > 0 && applicable.some(id => taskSatisfied(item, id))
        : task.dependsOn.every(id => taskSatisfied(item, id));
}
/** Presentation projection only. An OR gate does not cancel its other branches. */
export function projectStages(item) {
    const by = new Map();
    item.tasks.forEach(task => {
        if (task.applicability === 'inactive')
            return;
        by.set(task.stageKey, [...(by.get(task.stageKey) ?? []), task]);
    });
    const parents = new Map([...by.keys()].map(key => [key, new Set()]));
    for (const task of item.tasks)
        for (const id of task.dependsOn) {
            const parent = item.tasks.find(t => t.id === id);
            if (parent && parent.stageKey !== task.stageKey && parents.has(parent.stageKey))
                parents.get(task.stageKey)?.add(parent.stageKey);
        }
    const ordered = [];
    const remaining = new Set(by.keys());
    while (remaining.size) {
        const ready = [...remaining].filter(key => [...(parents.get(key) ?? [])].every(p => !remaining.has(p)));
        if (!ready.length) {
            const tasks = item.tasks.filter(t => t.applicability !== 'inactive');
            return [{ id: 'invalid_grouping', key: 'invalid_grouping', title: 'Workflow grouping needs review', tasks, taskIds: tasks.map(t => t.id), completed: tasks.filter(t => taskSatisfied(item, t.id)).length, total: tasks.length, blocked: tasks.filter(t => t.status === 'stuck').length + 1, activeBranches: 0, status: 'current', invalidGrouping: true }];
        }
        for (const key of ready) {
            ordered.push(key);
            remaining.delete(key);
        }
    }
    let foundCurrent = false;
    return ordered.map(key => {
        const tasks = by.get(key);
        const required = tasks.filter(t => t.applicability === 'required');
        // Optional-only stages use their visible tasks for display, but do not block work elsewhere.
        const counted = required.length ? required : tasks;
        const completed = counted.filter(t => taskSatisfied(item, t.id)).length;
        const done = completed === counted.length;
        const current = !done && (!foundCurrent || tasks.some(t => taskReady(item, t) || t.status === 'working' || t.status === 'stuck'));
        if (current)
            foundCurrent = true;
        return { id: key, key, title: tasks[0].stageTitle, tasks, taskIds: tasks.map(t => t.id), completed, total: counted.length,
            blocked: tasks.filter(t => t.status === 'stuck' || t.needsReview).length,
            activeBranches: tasks.filter(t => t.status !== 'done' && (taskReady(item, t) || t.status === 'working' || t.status === 'stuck')).length,
            status: done ? 'completed' : current ? 'current' : 'upcoming' };
    });
}
export function shortChain(item) {
    const stages = projectStages(item);
    const currents = stages.filter(s => s.status === 'current');
    if (!currents.length)
        return stages.slice(-4);
    const completed = stages.filter(s => s.status === 'completed');
    const latest = completed.sort((a, b) => Math.max(...a.tasks.map(t => Date.parse(t.completedAt ?? '') || 0)) - Math.max(...b.tasks.map(t => Date.parse(t.completedAt ?? '') || 0))).at(-1);
    const current = currents.length === 1 ? currents[0] : {
        id: 'parallel_current', key: 'parallel_current', title: 'Parallel preparation',
        tasks: currents.flatMap(s => s.tasks), taskIds: currents.flatMap(s => s.taskIds),
        completed: currents.reduce((n, s) => n + s.completed, 0), total: currents.reduce((n, s) => n + s.total, 0),
        blocked: currents.reduce((n, s) => n + s.blocked, 0), activeBranches: currents.length, status: 'current',
    };
    return [...(latest ? [latest] : []), current, ...stages.filter(s => s.status === 'upcoming').slice(0, 2)];
}
export function workItemStatus(item) {
    const active = item.tasks.filter(t => t.applicability !== 'inactive');
    const required = active.filter(t => t.applicability === 'required');
    const counted = required.length ? required : active;
    if (counted.length && counted.every(t => taskSatisfied(item, t.id)))
        return 'completed';
    if (item.tasks.some(t => t.applicability !== 'inactive' && (t.status === 'stuck' || t.needsReview)))
        return 'stuck';
    return item.tasks.some(t => t.status === 'working' || t.status === 'done') ? 'working' : 'to_do';
}
export function workspaceToday(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type) => parts.find(p => p.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}
/** Select the existing personal queue; never ask a model to invent a second task list. */
export function selectPriorityTasks(state, today = workspaceToday(), limit = 3, schedules = {}) {
    if (!state.actorId)
        return [];
    const actor = state.members.find(m => m.id === state.actorId);
    const rows = [];
    for (const workItem of state.workItems)
        for (const task of workItem.tasks) {
            const gate = task.kind === 'approval' ? workItem.gates.find(g => g.id === task.gateId) : undefined;
            const reviewer = !!gate && (gate.approverIds.includes(state.actorId) || (actor?.access === 'manager' && (gate.external || !gate.approverIds.length)));
            const unassigned = !task.ownerId && actor?.access === 'manager';
            if (task.status === 'done' || task.applicability === 'inactive' || (!unassigned && !reviewer && task.ownerId !== state.actorId && !task.collaboratorIds.includes(state.actorId)))
                continue;
            const due = schedules[workItem.id]?.tasks[task.id]?.due ?? task.dueOverride;
            const ready = taskReady(workItem, task);
            const approval = task.kind === 'approval' && ready && reviewer;
            const overdue = !!due && due < today;
            const soon = !!due && due >= today && (Date.parse(due) - Date.parse(today)) / 86400000 <= 2;
            const priority = (unassigned ? 1050 : 0) + (task.needsReview ? 1100 : 0) + (approval ? 1000 : 0) + (task.status === 'stuck' ? 900 : 0) + (overdue ? 800 : soon ? 600 : 0) + (ready ? 200 : 0) + (task.status === 'working' ? 100 : 0);
            const reason = approval ? 'Approval needed' : unassigned ? 'Assign a primary owner' : task.needsReview ? 'Changes need review' : approval ? 'Approval needed' : task.status === 'stuck' ? (task.blockers[0]?.reason ?? 'Stuck') : overdue ? 'Overdue' : soon ? 'Due soon' : ready ? 'Ready to work' : 'Waiting for an earlier step';
            if (priority === 0)
                continue; // Future work waiting on dependencies is not an urgent action.
            rows.push({ task, workItem, reason, priority, due: due ?? null });
        }
    rows.sort((a, b) => b.priority - a.priority || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.task.rank - b.task.rank || a.task.id.localeCompare(b.task.id));
    return rows.slice(0, Math.max(0, limit));
}
