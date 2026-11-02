import { z } from 'zod';
import { upgrade } from '../../../src/organization/setupLogic.ts';
/** Read tools use the already-authorized workspace snapshot, never model-supplied workspace IDs. */
export const ReadQuerySchema = z.object({
    entity: z.enum(['work', 'task', 'funding', 'member', 'role', 'organization', 'my_tasks', 'history']),
    id: z.string().max(100).optional(), workItemId: z.string().max(100).optional(), search: z.string().max(180).optional(), offset: z.number().int().min(0).max(60000).default(0), section: z.enum(['overview', 'constitution', 'responsibilities', 'actions', 'assignments', 'risk_check', 'workflow']).default('overview'), revision: z.number().int().min(0).optional(),
}).strict();
const includes = (value, search) => !search || value.toLowerCase().includes(search.trim().toLowerCase());
const taskSummary = (task) => ({ id: task.id, title: task.title, status: task.status, ownerId: task.ownerId, collaboratorIds: task.collaboratorIds, stageKey: task.stageKey, stageTitle: task.stageTitle, dependsOn: task.dependsOn, dependencyMode: task.dependencyMode, applicability: task.applicability, needsReview: task.needsReview });
export function workSnapshot(work, offset = 0) {
    return {
        id: work.id, name: work.name, kind: work.kind, description: work.description, date: work.date, ownerId: work.ownerId, templateVersion: work.templateVersion,
        tasks: { total: work.tasks.length, offset, items: work.tasks.slice(offset, offset + 30).map(taskSummary), nextOffset: offset + 30 < work.tasks.length ? offset + 30 : null },
        funding: work.funding.map(f => ({ id: f.id, source: f.source, amount: f.amount, status: f.status, committedAmount: f.committedAmount, spentAmount: f.spentAmount })),
    };
}
export function readWorkspaceData(envelope, draft, raw) {
    const query = ReadQuerySchema.parse(raw), state = envelope.state;
    const page = (items) => ({ total: items.length, offset: query.offset, items: items.slice(query.offset, query.offset + 20), nextOffset: query.offset + 20 < items.length ? query.offset + 20 : null });
    if (query.entity === 'history')
        throw new Error('Use the same-workspace history archive reader.');
    if (query.entity === 'organization') {
        const d = upgrade(draft);
        if (query.section === 'constitution') {
            const source = d.source;
            return source ? { fileName: source.fileName, archiveId: source.archiveId, checksum: source.checksum, uploadedAt: source.uploadedAt, text: source.text.slice(query.offset, query.offset + 8000), offset: query.offset, totalChars: source.text.length, nextOffset: query.offset + 8000 < source.text.length ? query.offset + 8000 : null } : { source: null };
        }
        if (query.section === 'responsibilities')
            return page(d.roles.map(r => ({ id: r.id, title: r.title, responsibilities: r.responsibilities, description: r.description })));
        if (query.section === 'actions')
            return page(d.actions);
        if (query.section === 'assignments')
            return page(d.assignments);
        if (query.section === 'risk_check')
            return d.riskCheck;
        if (query.section === 'workflow')
            return d.memberFlow;
        return { name: d.name, mission: d.mission, timingDefaults: d.timingDefaults, departments: d.departments, roles: d.roles.map(r => ({ id: r.id, title: r.title, departmentId: r.departmentId, parentRoleId: r.parentRoleId })), workflow: d.memberFlow ? { title: d.memberFlow.title, nodes: d.memberFlow.nodes.map(n => ({ id: n.id, title: n.title, roleIds: n.roleIds, dependsOn: n.dependsOn, dependencyMode: n.dependencyMode, timing: n.timing, milestoneKey: n.milestoneKey })) } : null };
    }
    if (query.entity === 'role') {
        const rows = upgrade(draft).roles.filter(r => query.id ? r.id === query.id : includes(r.title, query.search));
        if (query.id && !rows.length)
            throw new Error('The requested role is not in this workspace.');
        return page(rows.map(r => ({ id: r.id, title: r.title, departmentId: r.departmentId, parentRoleId: r.parentRoleId, description: r.description, responsibilities: r.responsibilities })));
    }
    if (query.entity === 'member') {
        const rows = state.members.filter(m => query.id ? m.id === query.id : includes(m.name, query.search));
        if (query.id && !rows.length)
            throw new Error('The requested member is not in this workspace.');
        return page(rows.map(m => ({ id: m.id, name: m.name, roleIds: m.roleIds })));
    }
    if (query.entity === 'work') {
        if (query.id) {
            const work = state.workItems.find(w => w.id === query.id);
            if (!work)
                throw new Error('The requested activity is not in this workspace.');
            return workSnapshot(work, query.offset);
        }
        return page(state.workItems.filter(w => includes(w.name + ' ' + w.description, query.search)).map(w => ({ id: w.id, name: w.name, kind: w.kind, date: w.date, ownerId: w.ownerId, taskCount: w.tasks.length })));
    }
    if (query.entity === 'my_tasks')
        return page(state.workItems.flatMap(w => w.tasks.filter(t => t.ownerId === state.actorId || t.collaboratorIds.includes(state.actorId ?? '')).filter(t => includes(t.title, query.search)).map(t => ({ workItemId: w.id, workName: w.name, ...taskSummary(t), dueOverride: t.dueOverride, relativeTarget: t.relativeTarget, blockers: t.blockers }))));
    if (query.entity === 'task') {
        if (query.id) {
            const work = state.workItems.find(w => w.id === query.workItemId), task = work?.tasks.find(t => t.id === query.id);
            if (!work || !task)
                throw new Error('Select a task ID and its activity in this workspace.');
            return { task, gate: work.gates.find(g => g.id === task.gateId) ?? null };
        }
        return page(state.workItems.filter(w => !query.workItemId || w.id === query.workItemId).flatMap(w => w.tasks.filter(t => includes(t.title + ' ' + t.description, query.search)).map(t => ({ workItemId: w.id, workName: w.name, ...taskSummary(t) }))));
    }
    const works = state.workItems.filter(w => !query.workItemId || w.id === query.workItemId);
    if (query.workItemId && !works.length)
        throw new Error('The requested activity is not in this workspace.');
    const records = works.flatMap(w => w.funding.filter(f => !query.id || f.id === query.id).filter(f => includes(f.purpose + ' ' + f.source + ' ' + w.name, query.search)).map(f => ({ workItemId: w.id, workName: w.name, ...f, commitments: { total: f.commitments.length, offset: query.id ? query.offset : 0, items: f.commitments.slice(query.id ? query.offset : 0, (query.id ? query.offset : 0) + 20), nextOffset: (query.id ? query.offset : 0) + 20 < f.commitments.length ? (query.id ? query.offset : 0) + 20 : null }, gates: w.gates.filter(g => g.requestId === f.id).map(g => ({ ...g, current: w.tasks.some(t => t.gateId === g.id) })) })));
    if (query.id && !records.length)
        throw new Error('The requested funding application is not in this workspace.');
    return { summary: { requested: records.reduce((n, f) => n + f.amount, 0), approved: records.reduce((n, f) => n + (f.status === 'approved' ? (f.approvedAmount ?? 0) : 0), 0), reserved: records.reduce((n, f) => n + f.committedAmount, 0), spent: records.reduce((n, f) => n + f.spentAmount, 0), currency: 'USD' }, ...(query.id ? { total: records.length, offset: 0, items: records, nextOffset: null } : page(records)) };
}
