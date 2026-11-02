import { TaskSchema, WorkItemSchema, WorkspaceStateSchema } from '../contracts';
import { DEFAULT_TIMING } from '../contracts/timing';
import { fixtureDraft, fixtureFlow } from '../../organization/testing/fixtures';
import { upgrade } from '../../organization/setupLogic';
/** Explicit test fixtures only. Never imported by application initialization. */
export function workspaceFixture(name = 'Fictional River Builders', version = 1) {
    const draft = upgrade(fixtureDraft());
    const at = '2026-10-26T12:00:00Z';
    const task = TaskSchema.parse({ id: 'plan', parentWorkItemId: 'river_event', sourceNodeId: 'plan', title: 'Collect approved project ideas', stageKey: 'planning', stageTitle: 'Plan activity', roleIds: [draft.roles[0].id], ownerId: 'captain', status: 'to_do', relativeTarget: { offsetDays: 14, unit: 'calendar', source: 'organization-default' }, updatedAt: at });
    const item = WorkItemSchema.parse({ id: 'river_event', kind: 'member_event', name: 'River Builders gathering', description: 'A fictional planning session.', date: '2026-11-19', ownerId: 'captain', templateVersion: version, templateFlow: fixtureFlow(draft), tasks: [task], createdAt: at, updatedAt: at });
    return { demo: true, setupRevision: version, organization: { name, mission: 'Build useful projects together.', roles: draft.roles, departments: draft.departments, timingDefaults: DEFAULT_TIMING, contextVersion: version }, state: WorkspaceStateSchema.parse({ schemaVersion: 1, workspaceId: 'confirmed-private-workspace', revision: version, actorId: 'captain', members: [{ id: 'captain', name: 'Demo Captain', roleIds: [draft.roles[0].id], access: 'manager' }], workItems: [item], updatedAt: at }) };
}
