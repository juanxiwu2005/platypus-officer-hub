import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { blankDraft } from '../../organization/presets';
import { upgrade } from '../../organization/setupLogic';
import { DEFAULT_TIMING, WorkspaceStateSchema } from '../contracts';
const h = vi.hoisted(() => ({ rows: new Map(), serial: 0, events: [], entry: null, envelope: null, calls: [], answer: null, providerError: false, mutations: [], receipts: new Map(), setupReceipts: new Map(), failJobMark: 0, loseSetupAck: false, setupSaves: 0, answers: [] }));
vi.mock('../../../netlify/lib/organization/storage.mts', () => ({
    checkOrigin: () => { }, readSession: async () => ({ entry: structuredClone(h.entry) }),
    digest: (v) => createHash('sha256').update(v).digest('hex'),
    SetupError: class extends Error {
        constructor(message, status = 400) {
            super(message);
            this.status = status;
        }
    },
    acquireAiLease: async () => async () => { },
    archiveEvent: async (_workspace, kind, payload) => { h.events.push({ kind, payload }); return { id: 'event' }; },
    readSetupOperationReceipt: async (_req, id) => h.setupReceipts.get(id) ?? null,
    saveSession: async (_req, draft, revision, _confirm, id) => { if (revision !== h.entry.revision)
        throw new Error('Stale'); h.setupSaves++; h.entry = { ...h.entry, draft: structuredClone(draft), revision: revision + 1 }; h.setupReceipts.set(id, { revision: revision + 1 }); if (h.loseSetupAck) {
        h.loseSetupAck = false;
        throw new Error('Setup acknowledgement lost');
    } return structuredClone(h.entry); },
    store: () => ({
        getWithMetadata: async (key) => h.rows.has(key) ? structuredClone(h.rows.get(key)) : null,
        setJSON: async (key, data, options) => { const old = h.rows.get(key); if (key.startsWith('workspace-assistant/') && Object.keys(data.applied ?? {}).length && h.failJobMark > 0) {
            h.failJobMark--;
            return { modified: false };
        } if (options?.onlyIfNew && old || options?.onlyIfMatch && old?.etag !== options.onlyIfMatch)
            return { modified: false }; const etag = String(++h.serial); h.rows.set(key, { data: structuredClone(data), etag }); return { modified: true, etag }; },
        delete: async (key) => { h.rows.delete(key); },
    }),
}));
vi.mock('../../../netlify/lib/workspace/storage.mts', () => ({
    loadWorkspace: async () => ({ ...structuredClone(h.envelope), setupRevision: h.entry.revision }),
    previewWorkspaceCommand: async () => structuredClone(h.envelope),
    readWorkspaceReceipt: async (_req, id) => h.receipts.get(id) ?? null,
    mutateWorkspace: async (_req, mutation) => { h.mutations.push(mutation); h.envelope.state.revision++; h.receipts.set(mutation.requestId, { revision: h.envelope.state.revision }); return structuredClone(h.envelope); },
}));
vi.mock('../../../netlify/lib/organization/v3.mts', () => ({ historicalContext: async () => [], historyRevision: () => undefined }));
vi.mock('../../../netlify/lib/ai.mts', () => ({
    getConfig: () => ({ provider: 'openai-compatible', model: 'mock', baseUrl: 'https://mock.invalid', key: 'DO_NOT_ARCHIVE' }),
    chatJSON: async (args) => { h.calls.push(JSON.parse(args.user)); h.events.push({ kind: 'test.provider.called', payload: null }); await args.onResponse?.({ rawReply: '{"message":"raw"}', rawResponse: 'raw transport', finishReason: 'stop' }); if (h.providerError)
        throw Object.assign(new Error('Unparseable provider JSON'), { code: 'bad_json', diagnostics: { failureKind: 'json_syntax' } }); return { data: structuredClone(h.answers.length ? h.answers.shift() : h.answer), model: 'mock', provider: 'mock', ms: 1 }; },
}));
import { assistantHandler, processAssistantJob } from '../../../netlify/lib/workspaceAssistant/jobs.mts';
const jobId = '11111111-1111-4111-a111-111111111111';
const req = (body) => new Request('https://demo.invalid/api/workspace/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const ask = (instruction = 'Rename the activity') => ({ action: 'ask', requestId: jobId, revision: 3, setupRevision: 5, instruction, context: { screen: 'home' }, conversation: [] });
beforeEach(() => {
    h.rows.clear();
    h.serial = 0;
    h.events = [];
    h.calls = [];
    h.providerError = false;
    h.mutations = [];
    h.receipts.clear();
    h.setupReceipts.clear();
    h.failJobMark = 0;
    h.loseSetupAck = false;
    h.setupSaves = 0;
    h.answers = [];
    const draft = upgrade(blankDraft());
    draft.name = 'Demo Club';
    draft.departments = [{ id: 'planning', name: 'Planning', color: '#315caa', source: 'manual', quote: '' }];
    draft.roles = [{ id: 'lead', title: 'Lead', departmentId: 'planning', responsibilities: ['Plan'], source: 'manual', quote: '', confidence: 1 }];
    h.entry = { workspaceId: 'workspace1', revision: 5, draft, approved: structuredClone(draft) };
    const state = WorkspaceStateSchema.parse({ schemaVersion: 1, workspaceId: 'workspace1', revision: 3, actorId: 'member1', members: [{ id: 'member1', name: 'Demo Lead', roleIds: ['lead'], access: 'manager' }], workItems: [], updatedAt: '2026-10-26T00:00:00Z' });
    h.envelope = { state, organization: { name: draft.name, mission: draft.mission, roles: draft.roles, departments: draft.departments, timingDefaults: DEFAULT_TIMING, contextVersion: 1 }, setupRevision: 5, demo: true };
    h.answer = { message: 'I can help.', question: null, actions: [] };
});
describe('durable workspace assistant jobs', () => {
    it('records a request before provider work and raw transport before semantic validation', async () => {
        expect((await assistantHandler(req(ask()))).status).toBe(202);
        await processAssistantJob(req({ jobId }));
        const kinds = h.events.map(e => e.kind);
        expect(kinds.indexOf('assistant.requested')).toBeLessThan(kinds.indexOf('test.provider.called'));
        expect(kinds.indexOf('assistant.provider.response')).toBeLessThan(kinds.indexOf('assistant.proposed'));
        expect(JSON.stringify(h.events)).not.toContain('DO_NOT_ARCHIVE');
        const result = await assistantHandler(new Request('https://demo.invalid/api/workspace/assistant?jobId=' + jobId));
        expect(await result.json()).toMatchObject({ status: 'done', answer: { proposalId: jobId, workspaceRevision: 3 } });
    });
    it('replays the same request and claims a queued job only once', async () => {
        await assistantHandler(req(ask()));
        await assistantHandler(req(ask()));
        await Promise.all([processAssistantJob(req({ jobId })), processAssistantJob(req({ jobId }))]);
        expect(h.calls).toHaveLength(1);
        const replay = await assistantHandler(req(ask()));
        expect(replay.status).toBe(200);
        expect((await replay.json()).status).toBe('done');
        expect(h.calls).toHaveLength(1);
    });
    it('rejects different input reusing an identifier', async () => {
        await assistantHandler(req(ask()));
        const changed = await assistantHandler(req(ask('Delete the organization')));
        expect(changed.status).toBe(409);
        expect(h.calls).toHaveLength(0);
    });
    it('does not start a second active job for the same workspace', async () => {
        await assistantHandler(req(ask()));
        const second = await assistantHandler(req({ ...ask(), requestId: '22222222-2222-4222-a222-222222222222' }));
        expect(second.status).toBe(429);
        expect(h.calls).toHaveLength(0);
    });
    it('avoids provider calls if data changes before the runner claims its request', async () => {
        await assistantHandler(req(ask()));
        h.envelope.state.revision = 4;
        await processAssistantJob(req({ jobId }));
        expect(h.calls).toHaveLength(0);
        const state = await (await assistantHandler(new Request('https://demo.invalid/api/workspace/assistant?jobId=' + jobId))).json();
        expect(state.status).toBe('error');
    });
    it('retains failed raw replies and does not purchase another generation on replay', async () => {
        h.providerError = true;
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        expect(h.events.some(e => e.kind === 'assistant.provider.response')).toBe(true);
        expect(h.events.some(e => e.kind === 'assistant.failed')).toBe(true);
        const replay = await assistantHandler(req(ask()));
        expect((await replay.json()).status).toBe('error');
        expect(h.calls).toHaveLength(1);
    });
    it('applies only an archived proposal, saves organization edits as a draft, and replays approval safely', async () => {
        h.answer = { message: 'Review the name.', actions: [{ kind: 'organization', proposal: { name: 'New Club' } }] };
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        const body = { action: 'apply', requestId: '33333333-3333-4333-a333-333333333333', jobId, actionIndex: 0 };
        expect((await assistantHandler(req(body))).status).toBe(200);
        expect(h.entry.draft.name).toBe('New Club');
        expect(h.entry.draft.confirmed).toBe(false);
        expect(h.entry.approved.name).toBe('Demo Club');
        expect((await assistantHandler(req(body))).status).toBe(200);
        expect(h.entry.revision).toBe(6);
        const forged = await assistantHandler(req({ ...body, operation: { kind: 'organization', proposal: { name: 'Injected' } } }));
        expect(forged.status).toBe(400);
        expect(h.entry.draft.name).toBe('New Club');
    });
    it('refuses stale or cross-workspace approval and does not overwrite edits', async () => {
        h.answer = { message: 'Review.', actions: [{ kind: 'organization', proposal: { name: 'New Club' } }] };
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        h.entry.revision++;
        const body = { action: 'apply', requestId: '33333333-3333-4333-a333-333333333333', jobId, actionIndex: 0 };
        expect((await assistantHandler(req(body))).status).toBe(409);
        expect(h.entry.draft.name).toBe('Demo Club');
        h.entry.workspaceId = 'otherworkspace';
        expect((await assistantHandler(req(body))).status).toBe(404);
    });
    it('routes approved commands through the same mutation engine with a durable deterministic operation id', async () => {
        h.answer = { message: 'Review.', actions: [{ kind: 'command', command: { type: 'member.upsert', member: { id: 'member1', name: 'Renamed Demo Lead', roleIds: ['lead'], access: 'manager' } } }] };
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        expect((await assistantHandler(req({ action: 'apply', requestId: '33333333-3333-4333-a333-333333333333', jobId, actionIndex: 0 }))).status).toBe(200);
        expect(h.mutations).toHaveLength(1);
        expect(h.mutations[0]).toMatchObject({ revision: 3, command: { type: 'member.upsert', member: { name: 'Renamed Demo Lead' } } });
        expect(h.mutations[0].requestId).not.toBe('33333333-3333-4333-a333-333333333333');
    });
    it('recovers a committed command after all job acknowledgement CAS attempts fail', async () => {
        h.answer = { message: 'Review.', actions: [{ kind: 'command', command: { type: 'member.upsert', member: { id: 'member1', name: 'Renamed', roleIds: ['lead'], access: 'manager' } } }] };
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        h.failJobMark = 5;
        const approval = { action: 'apply', requestId: '33333333-3333-4333-a333-333333333333', jobId, actionIndex: 0 };
        expect((await assistantHandler(req(approval))).status).toBe(503);
        expect(h.envelope.state.revision).toBe(4);
        expect(h.mutations).toHaveLength(1);
        expect((await assistantHandler(req(approval))).status).toBe(200);
        expect(h.mutations).toHaveLength(1);
        expect(h.calls).toHaveLength(1);
    });
    it('recovers an organization save receipt after its acknowledgement is lost', async () => {
        h.answer = { message: 'Review.', actions: [{ kind: 'organization', proposal: { name: 'New Club' } }] };
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        h.loseSetupAck = true;
        const approval = { action: 'apply', requestId: '33333333-3333-4333-a333-333333333333', jobId, actionIndex: 0 };
        expect((await assistantHandler(req(approval))).status).toBe(503);
        expect(h.entry.revision).toBe(6);
        expect((await assistantHandler(req(approval))).status).toBe(200);
        expect(h.setupSaves).toBe(1);
        expect(h.entry.approved.name).toBe('Demo Club');
        expect(h.calls).toHaveLength(1);
    });
    it('runs bounded same-workspace read tools before answering and archives the results', async () => {
        h.answers = [{ message: 'Checking the role.', actions: [], reads: [{ entity: 'role', id: 'lead' }] }, { message: 'The lead plans programs.', actions: [] }];
        await assistantHandler(req(ask('What are the lead responsibilities?')));
        await processAssistantJob(req({ jobId }));
        expect(h.calls).toHaveLength(2);
        expect(h.calls[1]).toMatchObject({ toolResults: [{ queries: [{ entity: 'role', id: 'lead' }] }] });
        expect(h.events.some(e => e.kind === 'assistant.read')).toBe(true);
        const result = await (await assistantHandler(new Request('https://demo.invalid/api/workspace/assistant?jobId=' + jobId))).json();
        expect(result.status).toBe('done');
    });
    it('archives provider failure diagnostics after raw transport capture', async () => {
        h.providerError = true;
        await assistantHandler(req(ask()));
        await processAssistantJob(req({ jobId }));
        expect(h.events.find(e => e.kind === 'assistant.failed')?.payload).toMatchObject({ phase: 'provider', code: 'bad_json', diagnostics: { failureKind: 'json_syntax' } });
    });
});
