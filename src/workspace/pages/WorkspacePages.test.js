import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RoleSchema, DepartmentSchema } from '../../organization/schema';
import { TaskSchema, WorkItemSchema, FundingSchema, GateSchema } from '../contracts';
import { WorkspaceProvider } from '../client';
import WorkspacePages from './WorkspacePages';
const now = '2026-10-26T15:00:00.000Z';
function fixture() {
    const roles = [RoleSchema.parse({ id: 'programs', title: 'Program lead', departmentId: 'planning', responsibilities: ['Coordinate member activities'], source: 'manual' })];
    const tasks = Array.from({ length: 7 }, (_, i) => TaskSchema.parse({ id: `task_${i}`, parentWorkItemId: 'member_event', title: `Existing task ${i}`, stageKey: `phase_${i}`, stageTitle: `Stage ${i}`, roleIds: ['programs'], ownerId: 'alex', status: i === 0 ? 'done' : 'to_do', dueOverride: `2026-10-${String(26 + i).padStart(2, '0')}`, rank: i, updatedAt: now, completedAt: i === 0 ? now : null }));
    // Keep the final task date valid when a month boundary is crossed.
    tasks[6].dueOverride = '2026-11-01';
    const item = WorkItemSchema.parse({ id: 'member_event', kind: 'member_event', name: 'Member gathering', date: '2026-11-19', ownerId: 'alex', templateVersion: 1, tasks, createdAt: now, updatedAt: now });
    const board = WorkItemSchema.parse({ id: 'board_project', kind: 'executive_work', name: 'Executive recruitment', date: '2026-11-20', ownerId: 'alex', templateVersion: 1, tasks: [], createdAt: now, updatedAt: now });
    return { state: { schemaVersion: 1, workspaceId: 'private_workspace', revision: 1, actorId: 'alex', members: [{ id: 'alex', name: 'Alex Example', roleIds: ['programs'], access: 'manager' }], workItems: [item, board], updatedAt: now }, organization: { name: 'Example Club', mission: 'A fictional test club', roles, departments: [DepartmentSchema.parse({ id: 'planning', name: 'Programs', color: '#315caa', source: 'manual' })], timingDefaults: { itemsWeeks: 8, quotesWeeks: 7, budgetWeeks: 6 }, contextVersion: 2 }, setupRevision: 3, demo: true };
}
let current;
let posts;
let intercept;
beforeEach(() => {
    localStorage.clear();
    current = fixture();
    posts = [];
    intercept = null;
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
        if (init?.method === 'POST') {
            const mutation = JSON.parse(String(init.body));
            posts.push(mutation);
            if (intercept)
                return intercept(mutation);
            const command = mutation.command;
            if (command.type === 'task.complete' || command.type === 'task.move') {
                const item = current.state.workItems.find(item => item.id === command.workItemId);
                const task = item.tasks.find(task => task.id === command.taskId);
                task.status = command.type === 'task.move' ? command.status : 'done';
                task.completedAt = task.status === 'done' ? now : null;
                if (command.type === 'task.move' && command.blocker)
                    task.blockers = [command.blocker];
            }
            else if (command.type === 'task.progress') {
                const task = current.state.workItems.find(item => item.id === command.workItemId).tasks.find(task => task.id === command.taskId);
                task.progress.push({ memberId: current.state.actorId, text: command.text, at: '2026-10-26T16:00:00Z' });
                task.updatedAt = '2026-10-26T16:00:00Z';
            }
            else if (command.type === 'work.applyTiming') {
                current.state.workItems.find(item => item.id === command.workItemId).timingDefaults = command.timingDefaults;
            }
            else if (command.type === 'work.create') {
                current.state.workItems.push(WorkItemSchema.parse({ ...command.input, templateVersion: 2, tasks: [], createdAt: now, updatedAt: now }));
            }
            current.state.revision++;
        }
        return Response.json(structuredClone(current));
    }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function open(path = '/phase1') { return render(_jsx(MemoryRouter, { initialEntries: [path], children: _jsx(WorkspaceProvider, { children: _jsx(WorkspacePages, {}) }) })); }
describe('workspace pages use existing server tasks', () => {
    it('shows the highest-priority existing tasks and expands the same personal queue', async () => {
        open();
        const region = await screen.findByRole('region', { name: 'Your priority tasks' });
        expect(within(region).getAllByRole('listitem')).toHaveLength(3);
        const taskLinks = within(region).getAllByRole('link').filter(link => link.textContent?.startsWith('Existing task'));
        expect(taskLinks.map(link => link.textContent)).toEqual(['Existing task 1', 'Existing task 2', 'Existing task 3']);
        fireEvent.click(within(region).getByRole('button', { name: 'View all 6 open tasks' }));
        expect(within(region).getAllByRole('listitem')).toHaveLength(6);
        expect(within(region).queryByText('Existing task 0')).toBeNull();
        expect(posts).toHaveLength(0);
    });
    it('keeps executive work out of the member list and searches fifteen events without event tabs', async () => {
        const original = current.state.workItems[0];
        current.state.workItems = [...Array.from({ length: 15 }, (_, i) => ({ ...structuredClone(original), id: `event_${i}`, name: `Member event ${i + 1}` })), current.state.workItems[1]];
        open('/phase1/activities');
        const list = await screen.findByRole('generic', { name: 'Member activity list' }).catch(() => screen.getByLabelText('Member activity list'));
        expect(list.querySelectorAll('.aw-activity-row')).toHaveLength(15);
        expect(within(list).queryByText('Executive recruitment')).toBeNull();
        expect(screen.queryAllByRole('tab')).toHaveLength(0);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Member event 15' } });
        expect(list.querySelectorAll('.aw-activity-row')).toHaveLength(1);
    });
    it('completes a board task through the shared command and reflects it in the activity view', async () => {
        open('/phase1/tasks');
        const board = await screen.findByTestId('workspace-task-board');
        expect(within(board).getAllByRole('region')).toHaveLength(3);
        const card = board.querySelector('[data-task-id="task_1"]');
        fireEvent.click(within(card).getByRole('button', { name: 'Complete' }));
        await waitFor(() => expect(posts.some(post => post.command.type === 'task.complete')).toBe(true));
        await waitFor(() => expect(board.querySelector('[data-task-id="task_1"]')).toBeNull());
        fireEvent.click(screen.getByText('Completed · 2'));
        const completed = screen.getByText('Completed · 2').parentElement;
        expect(within(completed).getByRole('link', { name: 'Existing task 1' })).toBeTruthy();
        fireEvent.click(screen.getByRole('link', { name: 'Browse activities' }));
        await screen.findByRole('heading', { name: 'Activities' });
        expect(screen.getByText('2/7 steps')).toBeTruthy();
    });
    it('requires a blocker reason instead of applying an unexplained Stuck state', async () => {
        open('/phase1/tasks');
        const board = await screen.findByTestId('workspace-task-board');
        const card = board.querySelector('[data-task-id="task_1"]');
        fireEvent.change(within(card).getByRole('combobox'), { target: { value: 'stuck' } });
        const dialog = screen.getByRole('dialog', { name: 'What is blocking this task?' });
        expect(posts).toHaveLength(0);
        fireEvent.change(within(dialog).getByLabelText('What needs to happen?'), { target: { value: 'Waiting for the venue reply' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Save blocker' }));
        await waitFor(() => expect(posts).toHaveLength(1));
        expect(posts[0].command).toMatchObject({ type: 'task.move', taskId: 'task_1', status: 'stuck', blocker: { reason: 'Waiting for the venue reply' } });
    });
    it('defaults to the event timeline and keeps task details separate from the assistant', async () => {
        open('/phase1/work/member_event?task=task_1');
        await screen.findByRole('region', { name: 'Activity timeline' });
        expect(screen.getByRole('button', { name: 'Timeline' }).getAttribute('aria-pressed')).toBe('true');
        const dialog = screen.getByRole('dialog', { name: 'Existing task 1' });
        expect(within(dialog).getByText('Official deadline')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Edit organization' })).toBeNull();
    });
    it('opens the same creation form from an AI intent and ignores model dates', async () => {
        open('/phase1/activities');
        await screen.findByRole('heading', { name: 'Activities' });
        window.dispatchEvent(new CustomEvent('platypus:open-create', { detail: { kind: 'member_event', prefill: { name: 'AI suggested workshop', description: 'A draft to review', date: '2030-01-01' } } }));
        const dialog = await screen.findByRole('dialog', { name: 'Create member activity' });
        expect(within(dialog).getByLabelText('Activity date').value).toBe('');
        fireEvent.change(within(dialog).getByLabelText('Activity date'), { target: { value: '2026-11-25' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Create and assign tasks' }));
        await waitFor(() => expect(posts).toHaveLength(1));
        expect(posts[0].command).toMatchObject({ type: 'work.create', input: { name: 'AI suggested workshop', date: '2026-11-25' } });
    });
    it('replays the identical mutation ID after a lost save response', async () => {
        intercept = async (mutation) => {
            if (posts.length === 1) {
                current.state.workItems[0].tasks[1].status = 'done';
                current.state.revision++;
                throw new TypeError('Connection interrupted');
            }
            expect(mutation.requestId).toBe(posts[0].requestId);
            return Response.json(structuredClone(current));
        };
        open('/phase1/tasks');
        const board = await screen.findByTestId('workspace-task-board');
        fireEvent.click(within(board.querySelector('[data-task-id="task_1"]')).getByRole('button', { name: 'Complete' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Retry this save' }));
        await waitFor(() => expect(board.querySelector('[data-task-id="task_1"]')).toBeNull());
        expect(posts).toHaveLength(2);
        expect(posts[1]).toEqual(posts[0]);
    });
    it('keeps the current snapshot on conflict and asks to load the latest version', async () => {
        intercept = () => Response.json({ message: 'A newer version exists.' }, { status: 409 });
        open('/phase1/tasks');
        const board = await screen.findByTestId('workspace-task-board');
        fireEvent.click(within(board.querySelector('[data-task-id="task_1"]')).getByRole('button', { name: 'Complete' }));
        await screen.findByRole('button', { name: 'Load latest version' });
        expect(board.querySelector('[data-task-id="task_1"]')).toBeTruthy();
        expect(posts).toHaveLength(1);
    });
    it('previews timing differences and only applies after explicit confirmation', async () => {
        current.state.workItems[0].timingDefaults = { itemsWeeks: 10, quotesWeeks: 9, budgetWeeks: 8 };
        open('/phase1/work/member_event');
        fireEvent.click(await screen.findByRole('button', { name: 'Review latest timing defaults' }));
        const dialog = screen.getByRole('dialog', { name: 'Review timing defaults' });
        expect(posts).toHaveLength(0);
        expect(within(dialog).getByText('10 weeks before')).toBeTruthy();
        fireEvent.click(within(dialog).getByRole('button', { name: 'Apply reviewed timing changes' }));
        await waitFor(() => expect(posts).toHaveLength(1));
        expect(posts[0].command).toMatchObject({ type: 'work.applyTiming', timingDefaults: { itemsWeeks: 8, quotesWeeks: 7, budgetWeeks: 6 } });
    });
    it('recovers an unfinished creation form after a refresh without creating a second work item', async () => {
        open('/phase1/activities');
        fireEvent.click(await screen.findByRole('button', { name: '+ Create activity' }));
        const dialog = screen.getByRole('dialog', { name: 'Create member activity' });
        fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Unfinished workshop' } });
        fireEvent.change(within(dialog).getByLabelText('Activity date'), { target: { value: '2026-12-01' } });
        cleanup();
        open('/phase1/activities');
        fireEvent.click(await screen.findByRole('button', { name: 'Resume unfinished form' }));
        const restored = screen.getByRole('dialog', { name: 'Create member activity' });
        await waitFor(() => expect(within(restored).getByLabelText('Name').value).toBe('Unfinished workshop'));
        expect(within(restored).getByLabelText('Activity date').value).toBe('2026-12-01');
        expect(posts).toHaveLength(0);
    });
    it('blocks rejected SPA navigation and restores unsaved task fields in the same workspace', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        open('/phase1/work/member_event?task=task_1');
        const dialog = await screen.findByRole('dialog', { name: 'Existing task 1' });
        fireEvent.change(within(dialog).getByLabelText('Task title'), { target: { value: 'Preserved unfinished edit' } });
        const leave = new Event('platypus:before-workspace-leave', { cancelable: true });
        window.dispatchEvent(leave);
        expect(leave.defaultPrevented).toBe(true);
        cleanup();
        open('/phase1/work/member_event?task=task_1');
        const recovered = await screen.findByRole('dialog', { name: 'Existing task 1' });
        await waitFor(() => expect(within(recovered).getByLabelText('Task title').value).toBe('Preserved unfinished edit'));
        expect(posts).toHaveLength(0);
        vi.restoreAllMocks();
    });
    it('does not restore another workspace’s unfinished task input', async () => {
        open('/phase1/work/member_event?task=task_1');
        const dialog = await screen.findByRole('dialog', { name: 'Existing task 1' });
        fireEvent.change(within(dialog).getByLabelText('Task title'), { target: { value: 'Private unfinished title' } });
        cleanup();
        current.state.workspaceId = 'different_workspace';
        open('/phase1/work/member_event?task=task_1');
        const other = await screen.findByRole('dialog', { name: 'Existing task 1' });
        expect(within(other).getByLabelText('Task title').value).toBe('Existing task 1');
    });
    it('submits an explicitly selected funding category instead of inferring it from the activity name', async () => {
        open('/phase1/activities');
        fireEvent.click(await screen.findByRole('button', { name: '+ Create activity' }));
        const dialog = screen.getByRole('dialog', { name: 'Create member activity' });
        fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'A name without policy keywords' } });
        fireEvent.change(within(dialog).getByLabelText('Funding source'), { target: { value: 'usg' } });
        fireEvent.change(within(dialog).getByLabelText('Funding category'), { target: { value: 'speaker' } });
        fireEvent.change(within(dialog).getByLabelText('Requested amount (USD)'), { target: { value: '400' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Create and assign tasks' }));
        await waitFor(() => expect(posts).toHaveLength(1));
        expect(posts[0].command).toMatchObject({ type: 'work.create', input: { fundingSource: 'usg', fundingCategory: 'speaker', requestedAmount: 400 } });
    });
    it('shows old funding approvals as versioned history rather than approval of the revised request', async () => {
        const item = current.state.workItems[0];
        item.funding = [FundingSchema.parse({ id: 'funding_request', version: 2, source: 'college', purpose: 'Revised scope', amount: 500 })];
        item.gates = [GateSchema.parse({ id: 'old_gate', taskId: 'task_1', kind: 'budget', requestId: 'funding_request', requestVersion: 1, status: 'approved', evidence: 'Approved only the original request', decidedAt: now }), GateSchema.parse({ id: 'new_gate', taskId: 'task_1', kind: 'budget', requestId: 'funding_request', requestVersion: 2 })];
        open('/phase1/work/member_event');
        const funding = await screen.findByRole('region', { name: 'Activity funding' });
        expect(within(funding).getByRole('link', { name: 'Budget approval · pending · v2' })).toBeTruthy();
        expect(within(funding).queryByRole('link', { name: /approved.*v1/ })).toBeNull();
        fireEvent.click(within(funding).getByText('Previous approval decisions'));
        expect(within(funding).getByText(/Approved only the original request/)).toBeTruthy();
    });
    it('includes a designated internal approval in the reviewer’s personal board', async () => {
        current.state.members.push({ id: 'reviewer', name: 'Riley Reviewer', roleIds: [], access: 'member' });
        current.state.actorId = 'reviewer';
        const item = current.state.workItems[0];
        item.tasks[1] = { ...item.tasks[1], kind: 'approval', gateId: 'general_gate' };
        item.gates = [GateSchema.parse({ id: 'general_gate', taskId: 'task_1', kind: 'general', approverIds: ['reviewer'], external: false })];
        open('/phase1/tasks');
        const board = await screen.findByTestId('workspace-task-board');
        expect(within(board).getByRole('link', { name: 'Existing task 1' })).toBeTruthy();
        expect(within(board).getByRole('link', { name: 'Review approval →' })).toBeTruthy();
    });
});
it('does not restore an already-submitted task progress update after refreshing the panel', async () => {
    const mounted = open('/phase1/work/member_event?task=task_1');
    const progress = await screen.findByLabelText('Progress update');
    fireEvent.change(progress, { target: { value: 'Checked the fictional quote.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add update' }));
    await waitFor(() => expect(current.state.workItems[0].tasks[1].progress).toHaveLength(1));
    await waitFor(() => expect(screen.getByLabelText('Progress update').value).toBe(''));
    mounted.unmount();
    open('/phase1/work/member_event?task=task_1');
    await waitFor(() => expect(screen.getByLabelText('Progress update').value).toBe(''));
});
