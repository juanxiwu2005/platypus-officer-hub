import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ rows: new Map(), serial: 0, failSavedArchive: 0, loseCommitAck: false, failHistory: 0 }));
vi.mock('@netlify/blobs', () => ({ getStore: () => ({
        getWithMetadata: async (key) => structuredClone(h.rows.get(key) ?? null),
        setJSON: async (key, data, options = {}) => {
            if (data.kind === 'configuration.saved' && h.failSavedArchive > 0) {
                h.failSavedArchive--;
                throw new Error('Archive unavailable after commit');
            }
            if (key.startsWith('history/') && h.failHistory > 0) {
                h.failHistory--;
                return { modified: false };
            }
            const old = h.rows.get(key);
            if (options.onlyIfNew && old || options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
                return { modified: false };
            const etag = String(++h.serial);
            h.rows.set(key, { data: structuredClone(data), etag });
            if (key.startsWith('sessions/') && data.operationReceipts && h.loseCommitAck) {
                h.loseCommitAck = false;
                throw new Error('Network acknowledgement lost after CAS');
            }
            return { modified: true, etag };
        },
    }) }));
import { startSession, saveSession, readSession, readSetupOperationReceipt } from '../../../netlify/lib/organization/storage.mts';
import { upgrade } from '../../organization/setupLogic';
const operationId = '11111111-1111-4111-a111-111111111111';
const request = (cookie = '') => new Request('https://demo.invalid/api/org/setup', { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-platypus-request': 'organization-setup' }, body: '{}' });
async function session() { const first = await startSession(request()), cookie = first.cookie.split(';')[0], req = request(cookie); const before = upgrade(first.entry.draft); before.name = 'Before Club'; const saved = await saveSession(req, before, 0); return { req, draft: { ...saved.draft, name: 'After Club' }, workspaceId: saved.workspaceId }; }
beforeEach(() => { h.rows.clear(); h.serial = 0; h.failSavedArchive = 0; h.loseCommitAck = false; h.failHistory = 0; });
describe('atomic setup operation receipts', () => {
    it('recovers when the session CAS committed but its network acknowledgement was lost', async () => {
        const { req, draft } = await session();
        h.loseCommitAck = true;
        await expect(saveSession(req, draft, 1, false, operationId)).rejects.toThrow('acknowledgement');
        expect((await readSession(req)).entry.revision).toBe(2);
        const receipt = await readSetupOperationReceipt(req, operationId);
        expect(receipt?.revision).toBe(2);
        await saveSession(req, draft, 1, false, operationId);
        expect((await readSession(req)).entry.revision).toBe(2);
        expect((await readSession(req)).entry.draft.name).toBe('After Club');
    });
    it('repairs saved-configuration archive and prior-version history without saving the draft again', async () => {
        const { req, draft, workspaceId } = await session();
        h.failSavedArchive = 1;
        await expect(saveSession(req, draft, 1, false, operationId)).rejects.toThrow('Archive unavailable');
        expect((await readSession(req)).entry.revision).toBe(2);
        await readSetupOperationReceipt(req, operationId);
        const events = [...h.rows.values()].filter(row => row.data.kind === 'configuration.saved' && row.data.payload.revision === 2);
        expect(events).toHaveLength(1);
        expect(h.rows.get('history/' + workspaceId)?.data).toEqual(expect.arrayContaining([expect.objectContaining({ revision: 1, organization: { name: 'Before Club', mission: '' } })]));
        await readSetupOperationReceipt(req, operationId);
        expect((await readSession(req)).entry.revision).toBe(2);
        expect([...h.rows.values()].filter(row => row.data.kind === 'configuration.saved' && row.data.payload.revision === 2)).toHaveLength(1);
    });
    it('recovers a post-commit history indexing failure idempotently', async () => {
        const { req, draft } = await session();
        h.failHistory = 5;
        await expect(saveSession(req, draft, 1, false, operationId)).rejects.toThrow('history');
        expect((await readSetupOperationReceipt(req, operationId))?.revision).toBe(2);
        expect((await readSession(req)).entry.revision).toBe(2);
    });
    it('rejects operation IDs reused for another payload and isolates other workspace receipts', async () => {
        const { req, draft } = await session();
        await saveSession(req, draft, 1, false, operationId);
        await expect(saveSession(req, { ...draft, name: 'Different' }, 1, false, operationId)).rejects.toMatchObject({ status: 409 });
        const other = await session();
        expect(await readSetupOperationReceipt(other.req, operationId)).toBeNull();
    });
});
