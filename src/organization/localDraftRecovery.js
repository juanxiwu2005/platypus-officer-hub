import { z } from "zod";
import { DepartmentSchema, DraftSchema, FlowNodeSchema, FlowSchema, RoleSchema, } from "./schema";
export const blankRecoveryInputs = () => ({
    chat: "",
    riskInstructions: {},
    roleTitle: "",
    roleDept: "",
    newRole: false,
    historyRevision: null,
});
// A local safety copy also retains a temporarily empty title while someone is
// typing. The server's ordinary DraftSchema remains the authority for saving.
const localFlow = FlowSchema.extend({
    nodes: z.array(FlowNodeSchema.extend({ title: z.string().max(180) })).max(40),
});
const localDraft = DraftSchema.extend({
    roles: z.array(RoleSchema.extend({ title: z.string().max(180) })).max(30),
    departments: z
        .array(DepartmentSchema.extend({ name: z.string().max(180) }))
        .max(30)
        .optional(),
    memberFlow: localFlow.nullable(),
    boardFlow: localFlow.nullable(),
});
const inputsSchema = z.object({
    chat: z.string().max(2000),
    riskInstructions: z.record(z.string(), z.string().max(1000)),
    roleTitle: z.string().max(180),
    roleDept: z.string().max(80),
    newRole: z.boolean(),
    historyRevision: z.number().int().nonnegative().nullable().default(null),
});
const recordSchema = z.object({
    version: z.literal(1),
    workspaceId: z.string().min(1),
    baseRevision: z.number().int().nonnegative(),
    draft: localDraft.nullable(),
    inputs: inputsSchema,
    savedAt: z.string().datetime(),
});
export const recoveryStorageKey = (workspaceId) => "platypus_org_recovery_v1_" + encodeURIComponent(workspaceId);
function parse(raw, workspaceId) {
    const value = recordSchema.parse(JSON.parse(raw));
    if (value.workspaceId !== workspaceId)
        throw new Error("Recovery workspace does not match.");
    return value;
}
export function loadLocalRecovery(workspaceId, onError = () => { }, storage) {
    try {
        const raw = (storage ?? localStorage).getItem(recoveryStorageKey(workspaceId));
        return raw ? parse(raw, workspaceId) : null;
    }
    catch {
        onError("The local recovery copy could not be read. It has been kept on this device; keep this page open until your work is saved online.");
        return null;
    }
}
export function saveLocalRecovery(workspaceId, snapshot, onError = () => { }, storage) {
    try {
        const store = storage ?? localStorage;
        const key = recoveryStorageKey(workspaceId);
        const record = {
            version: 1,
            workspaceId,
            ...snapshot,
            savedAt: new Date().toISOString(),
        };
        // Validate before touching either an existing safety copy or its backup.
        const encoded = JSON.stringify(recordSchema.parse(record));
        const prior = store.getItem(key);
        if (prior) {
            try {
                parse(prior, workspaceId);
            }
            catch {
                // Do not silently discard unreadable work during the next keystroke.
                // If preserving it fails (for example, quota exhaustion), do not write.
                store.setItem(key + ".unreadable." + Date.now(), prior);
                onError("An older unreadable local copy was preserved separately on this device. Your current work still needs an online save.");
            }
        }
        store.setItem(key, encoded);
        return true;
    }
    catch {
        onError("A local recovery copy could not be saved. Keep this page open and save online before leaving.");
        return false;
    }
}
/** A successful online save releases the draft, never unfinished form input. */
export function clearLocalRecoveryDraft(workspaceId, baseRevision, inputs, onError = () => { }, storage) {
    return saveLocalRecovery(workspaceId, { baseRevision, draft: null, inputs }, onError, storage);
}
