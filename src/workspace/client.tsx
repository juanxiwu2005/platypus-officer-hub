import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { DepartmentSchema, RoleSchema } from '../organization/schema';
import { TimingDefaultsSchema, WorkspaceStateSchema, type WorkspaceCommand, type WorkspaceEnvelope, type WorkspaceMutation } from './contracts';

const EnvelopeSchema = z.object({
  state: WorkspaceStateSchema,
  organization: z.object({ name: z.string(), mission: z.string(), roles: z.array(RoleSchema), departments: z.array(DepartmentSchema), timingDefaults: TimingDefaultsSchema, contextVersion: z.number() }),
  setupRevision: z.number().int(), demo: z.literal(true),
});
export const workspaceId = () => crypto.randomUUID();
export class WorkspaceRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
interface WorkspaceContextValue {
  envelope: WorkspaceEnvelope | null;
  loading: boolean;
  mutating: boolean;
  error: string;
  conflict: boolean;
  canRetry: boolean;
  refresh: () => Promise<void>;
  mutate: (command: WorkspaceCommand) => Promise<WorkspaceEnvelope>;
  retryMutation: () => Promise<WorkspaceEnvelope | null>;
}
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function request(method: 'GET'|'POST', body?: WorkspaceMutation, signal?: AbortSignal): Promise<WorkspaceEnvelope> {
  const response = await fetch('/api/workspace', {
    method, signal, credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-platypus-request': 'organization-setup' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = raw && typeof raw === 'object' && 'message' in raw && typeof raw.message === 'string' ? raw.message : 'Your workspace could not be saved. Your changes have not been confirmed.';
    throw new WorkspaceRequestError(message, response.status);
  }
  const result = EnvelopeSchema.safeParse(raw);
  if (!result.success) throw new WorkspaceRequestError('The saved workspace could not be verified. Refresh before making another change.', 502);
  return result.data;
}

/** One server snapshot supplies every page; no business state is copied into legacy localStorage. */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [envelope, setEnvelope] = useState<WorkspaceEnvelope|null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const current = useRef(envelope);
  const busy = useRef(false);
  const pending = useRef<WorkspaceMutation|null>(null);
  const readGeneration = useRef(0);
  const mounted = useRef(true);
  const publish = useCallback((next: WorkspaceEnvelope) => {
    current.current = next;
    setEnvelope(next);
    window.dispatchEvent(new CustomEvent('platypus:workspace-updated', { detail: { workspaceId: next.state.workspaceId, revision: next.state.revision } }));
  }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    const generation = ++readGeneration.current;
    setLoading(current.current === null);
    try {
      const next = await request('GET');
      if (!mounted.current || generation !== readGeneration.current) return;
      publish(next);
      pending.current = null;
      setCanRetry(false);
      setError('');
      setConflict(false);
    } catch (e) {
      if (mounted.current && generation === readGeneration.current) setError((e as Error).message);
    } finally {
      if (mounted.current && generation === readGeneration.current) setLoading(false);
    }
  }, [publish]);
  const submit = useCallback(async (mutation: WorkspaceMutation) => {
    if (busy.current) throw new WorkspaceRequestError('Wait for your current change to finish saving.', 409);
    busy.current = true;
    ++readGeneration.current; // a slower GET cannot replace the result of this mutation
    setMutating(true);
    setError('');
    setCanRetry(false);
    pending.current = mutation;
    try {
      const next = await request('POST', mutation);
      if (mounted.current) {
        publish(next);
        pending.current = null;
        setConflict(false);
      }
      return next;
    } catch (e) {
      const failure = e as Error;
      if (mounted.current) {
        const isConflict = e instanceof WorkspaceRequestError && e.status === 409;
        setConflict(isConflict);
        setError(isConflict ? `${failure.message} Load the latest version, then review your change before submitting it again.` : failure.message);
        // A transport failure can have happened after a commit; replay the exact same command ID.
        const retryable = !(e instanceof WorkspaceRequestError) || e.status >= 500;
        setCanRetry(retryable);
        if (!retryable) pending.current = null;
      }
      throw e;
    } finally {
      busy.current = false;
      if (mounted.current) { setMutating(false); setLoading(false); }
    }
  }, [publish]);
  const mutate = useCallback(async (command: WorkspaceCommand) => {
    if (!current.current) throw new WorkspaceRequestError('Load your workspace before making a change.', 409);
    if (pending.current) throw new WorkspaceRequestError('Retry the previous save or load the latest version before submitting a new change.', 409);
    return submit({ requestId: workspaceId(), revision: current.current.state.revision, command });
  }, [submit]);
  const retryMutation = useCallback(async () => pending.current ? submit(pending.current) : null, [submit]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onRefresh = () => { if (!busy.current) void refresh(); };
    const onVisible = () => { if (document.visibilityState === 'visible') onRefresh(); };
    window.addEventListener('platypus:workspace-refresh', onRefresh);
    window.addEventListener('platypus:workspace-changed', onRefresh);
    window.addEventListener('focus', onRefresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => { mounted.current = false; ++readGeneration.current; window.removeEventListener('platypus:workspace-refresh', onRefresh); window.removeEventListener('platypus:workspace-changed', onRefresh); window.removeEventListener('focus', onRefresh); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  return <WorkspaceContext.Provider value={{ envelope, loading, mutating, error, conflict, canRetry, refresh, mutate, retryMutation }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is required.');
  return context;
}
export function useOptionalWorkspace() { return useContext(WorkspaceContext); }
