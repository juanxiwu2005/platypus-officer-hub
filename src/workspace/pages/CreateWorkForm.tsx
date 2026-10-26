import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateWorkInputSchema, type CreateWorkInput, type CreationFlow } from '../contracts';
import { useWorkspace, workspaceId } from '../client';

export interface CreateWorkPrefill { kind?: CreateWorkInput['kind']; name?: string; description?: string; flow?: CreationFlow; }
export default function CreateWorkForm({ prefill, close }: { prefill: CreateWorkPrefill; close: () => void }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const navigate = useNavigate();
  const [id] = useState(workspaceId);
  const [kind, setKind] = useState<CreateWorkInput['kind']>(prefill.kind ?? 'member_event');
  const [name, setName] = useState(prefill.name ?? '');
  const [description, setDescription] = useState(prefill.description ?? '');
  const [date, setDate] = useState(''); // model prefill never supplies an effective date
  const [ownerId, setOwnerId] = useState(envelope?.state.actorId ?? '');
  const [venue, setVenue] = useState<CreateWorkInput['venue']>(kind === 'member_event' ? 'campus' : 'unspecified');
  const [source, setSource] = useState<CreateWorkInput['fundingSource']>('none');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const focus = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { focus.current?.focus(); }, []);
  const cancel = () => { if (mutating) return; if ((name.trim() || description.trim()) && !window.confirm('Discard this unsaved creation form?')) return; close(); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const input = CreateWorkInputSchema.safeParse({ id, kind, name, description, date: date || null, ownerId: ownerId || null, venue, fundingSource: source, requestedAmount: source === 'none' ? 0 : Number(amount), ...(prefill.flow ? { flow: prefill.flow } : {}) });
    if (!input.success) { setError('Check the name, budget amount and workflow before creating this item.'); return; }
    if (source !== 'none' && (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 0)) { setError('Enter the requested budget amount.'); return; }
    try {
      await mutate({ type: 'work.create', input: input.data });
      close();
      navigate(`/phase1/work/${id}`);
    } catch (e) { setError((e as Error).message); }
  };
  return <div className="aw-modal-backdrop" onClick={e => { if (e.currentTarget === e.target) cancel(); }}>
    <div className="aw-modal" role="dialog" aria-modal="true" aria-labelledby="aw-create-title" ref={dialog} onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      if (e.key !== 'Tab') return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }}>
      <header><div><span className="aw-eyebrow">NEW WORK</span><h2 id="aw-create-title">{kind === 'member_event' ? 'Create member activity' : 'Create board work'}</h2></div><button aria-label="Close creation form" disabled={mutating} onClick={cancel}>×</button></header>
      <form onSubmit={e => void submit(e)}>
        <fieldset disabled={mutating}>
          <label>Work type<select value={kind} onChange={e => { setKind(e.target.value as CreateWorkInput['kind']); setVenue(e.target.value === 'member_event' ? 'campus' : 'unspecified'); }}><option value="member_event">Member activity</option><option value="executive_work">Executive Board work</option></select></label>
          <label>Name<input ref={focus} required maxLength={180} value={name} onChange={e => setName(e.target.value)} /></label>
          <label>Purpose<textarea maxLength={2000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What should this work accomplish?" /></label>
          <div className="aw-form-pair"><label>{kind === 'member_event' ? 'Activity date' : 'Target date'}<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label>Work lead<select value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">Assign later</option>{envelope?.state.members.map(member => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label></div>
          <p className="aw-muted">Dates can be added later. Task dates come from your workflow and timing rules.</p>
          <div className="aw-form-pair"><label>Location<select value={venue} onChange={e => setVenue(e.target.value as CreateWorkInput['venue'])}><option value="campus">ASU campus</option><option value="offcampus">Off campus</option><option value="unspecified">Not applicable / not decided</option></select></label><label>Funding source<select value={source} onChange={e => setSource(e.target.value as CreateWorkInput['fundingSource'])}><option value="none">No funding needed</option><option value="usg">USG</option><option value="college">College</option><option value="dues">Club funds</option><option value="sponsor">Sponsor</option></select></label></div>
          {source !== 'none' && <label>Requested amount (USD)<input type="number" min="0" max="1000000" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></label>}
          {prefill.flow ? <details open><summary>Review proposed workflow · {prefill.flow.nodes.length} steps</summary><ol className="aw-review-steps">{prefill.flow.nodes.map(step => <li key={step.id}><strong>{step.title}</strong><span>{step.roleIds.map(roleId => envelope?.organization.roles.find(role => role.id === roleId)?.title ?? 'Needs role review').join(' · ') || 'Needs assignment'}</span></li>)}</ol></details> : <p className="aw-muted">{kind === 'member_event' ? 'Uses your confirmed activity workflow. Tasks are assigned from your team’s role bindings.' : 'Starts a short board workflow you can adjust with the assistant.'}</p>}
          {error && <p role="alert" className="aw-error">{error}</p>}
          <footer><button type="button" onClick={cancel}>Cancel</button><button className="aw-primary" type="submit">{mutating ? 'Creating…' : 'Create and assign tasks'}</button></footer>
        </fieldset>
      </form>
    </div>
  </div>;
}
