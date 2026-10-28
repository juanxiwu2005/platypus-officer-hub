import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace, workspaceId } from '../client';
import { TaskSchema, type ApprovalGate, type FundingRequest, type WorkItem, type WorkSchedule, type WorkTask } from '../contracts';
import { projectStages, taskReady, type StageProjection } from '../selectors';
import { memberName, shortDate, Status, STATUS_LABELS, todayInArizona, WorkStatus } from './shared';
import { readApprovedContext, type ApprovedContext } from '../../phase1/approvedContext';
import { useDialogFocus } from './dialogFocus';
import { useUnsavedGuard } from './unsavedGuard';
import { useFormRecovery } from './formRecovery';
import { z } from 'zod';

const TaskInputSchema=z.object({title:z.string().max(180),description:z.string().max(1000),ownerId:z.string().max(100),due:z.string().max(10),progress:z.string().max(1000),evidence:z.string().max(1000),depends:z.array(z.string().max(100)).max(200)});
const WorkInputSchema=z.object({name:z.string().max(180),date:z.string().max(10),description:z.string().max(2000),ownerId:z.string().max(100)});
const FundingInputSchema=z.object({editing:z.boolean(),amount:z.string().max(30),purpose:z.string().max(1000),source:z.enum(['usg','college','dues','sponsor']),category:z.enum(['food_service','speaker','other']),spendBy:z.string().max(10),commitAmount:z.string().max(30),commitPurpose:z.string().max(400),evidence:z.string().max(1000)});
const NewFundingInputSchema=z.object({adding:z.boolean(),amount:z.string().max(30),purpose:z.string().max(1000),source:z.enum(['usg','college','dues','sponsor']),category:z.enum(['food_service','speaker','other'])});

const oneDay = 86400000;
const dateValue = (date: string) => Date.parse(`${date}T12:00:00Z`);
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function WorkDetail({ item, schedule }: { item: WorkItem; schedule: WorkSchedule }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedId = new URLSearchParams(location.search).get('task');
  const selected = item.tasks.find(task => task.id === selectedId) ?? null;
  const [edit, setEdit] = useState(false);
  const [view, setView] = useState<'timeline'|'workflow'>('timeline');
  const [department, setDepartment] = useState('');
  const [person, setPerson] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOwner, setNewOwner] = useState(item.ownerId ?? '');
  const [adoption, setAdoption] = useState<'timing'|'template'|null>(null);
  const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
  const manager = actor?.access === 'manager';
  const stages = projectStages(item);
  const members = envelope?.state.members ?? [];
  const roles = envelope?.organization.roles ?? [];
  const departments = envelope?.organization.departments ?? [];
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('platypus:assistant-context', { detail: { screen: 'work', workItemId: item.id, ...(selected ? { taskId: selected.id } : {}) } }));
  }, [item.id, selected?.id]);
  const choose = (task: WorkTask) => navigate(`/phase1/work/${item.id}?task=${task.id}`);
  const filter = (task: WorkTask) => (!person || task.ownerId === person || task.collaboratorIds.includes(person)) && (!department || task.roleIds.some(roleId => roles.find(role => role.id === roleId)?.departmentId === department));
  const visibleStages = stages.map(stage => ({ ...stage, tasks: stage.tasks.filter(filter) })).filter(stage => stage.tasks.length);
  const pendingReview = item.tasks.filter(task => task.needsReview);
  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    const task = TaskSchema.parse({ id: workspaceId(), parentWorkItemId: item.id, title: newTitle, stageKey: 'additional_work', stageTitle: 'Additional work', roleIds: members.find(member => member.id === newOwner)?.roleIds ?? [], ownerId: newOwner || null, updatedAt: new Date().toISOString(), rank: item.tasks.length });
    try { await mutate({ type: 'task.add', workItemId: item.id, task }); setAdding(false); setNewTitle(''); }
    catch (e) { setNotice((e as Error).message); }
  };
  return <>
    <Link className="aw-back" to={item.kind === 'member_event' ? '/phase1/activities' : '/phase1/board'}>← {item.kind === 'member_event' ? 'Activities' : 'Executive Board'}</Link>
    <header className="aw-page-head"><div><span className="aw-eyebrow">{item.kind === 'member_event' ? 'MEMBER ACTIVITY' : 'EXECUTIVE BOARD'}</span><h1>{item.name}</h1><div className="aw-inline"><span>{shortDate(item.date)}</span><span>{memberName(members, item.ownerId)}</span><WorkStatus item={item} /></div></div>{manager && <button onClick={() => setEdit(true)}>Edit {item.kind === 'member_event' ? 'activity' : 'work'}</button>}</header>
    {item.description && <p className="aw-description">{item.description}</p>}
    {notice && <p className="aw-note" role="status">{notice}<button aria-label="Dismiss activity update" onClick={() => setNotice('')}>×</button></p>}
    {pendingReview.length > 0 && <section className="aw-note"><strong>{pendingReview.length} steps need review after an upstream change.</strong><p>{pendingReview.map(task => task.title).join(' · ')}</p>{manager && <button disabled={mutating} onClick={() => void mutate({ type: 'task.review', workItemId: item.id, taskIds: pendingReview.map(task => task.id) }).catch(e => setNotice(e.message))}>Confirm these affected steps</button>}</section>}
    {schedule.issues.length > 0 && <details className="aw-schedule-notes" open={!schedule.covered}><summary>{schedule.covered ? `${schedule.issues.length} schedule notices` : 'Some dates cannot be reliably scheduled'}</summary><ul>{schedule.issues.map((issue,i) => <li key={i}>{issue.replace(/^[a-z_]+:\s*/, "")}</li>)}</ul></details>}
    <div className="aw-detail-toolbar"><div className="aw-segmented" role="group" aria-label="Activity view"><button aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>Timeline</button><button aria-pressed={view === 'workflow'} onClick={() => setView('workflow')}>Workflow</button></div><div className="aw-inline"><label className="aw-sr-only" htmlFor="aw-department-filter">Filter by department</label><select id="aw-department-filter" value={department} onChange={e => setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select><label className="aw-sr-only" htmlFor="aw-person-filter">Filter by member</label><select id="aw-person-filter" value={person} onChange={e => setPerson(e.target.value)}><option value="">Everyone</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div></div>
    {view === 'timeline' ? <Timeline item={item} stages={visibleStages} schedule={schedule} onSelect={choose} /> : <div className="aw-workflow" aria-label="Activity workflow">{visibleStages.map(stage => <section key={stage.id}><header><h2>{stage.title}</h2><span>{stage.completed}/{stage.total} complete</span></header><div>{stage.tasks.map(task => <button className={`aw-workflow-step aw-task-${task.status}`} key={task.id} onClick={() => choose(task)}><strong>{task.title}</strong><span>{memberName(members, task.ownerId)}</span><span>{STATUS_LABELS[task.status]}</span>{task.dependsOn.length > 0 && <small>After {task.dependsOn.map(id => item.tasks.find(t => t.id === id)?.title ?? 'Missing step').join(' · ')}</small>}</button>)}</div></section>)}</div>}
    {manager && (adding ? <form className="aw-inline-add" onSubmit={e => void addTask(e)}><label>New task<input required maxLength={180} value={newTitle} onChange={e => setNewTitle(e.target.value)} /></label><label>Responsible member<select value={newOwner} onChange={e => setNewOwner(e.target.value)}><option value="">Needs assignment</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><button className="aw-primary" disabled={mutating}>Add to this workflow</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></form> : <button className="aw-add-task" onClick={() => setAdding(true)}>+ Add task to this {item.kind === 'member_event' ? 'activity' : 'work'}</button>)}
    <FundingPanel item={item} onNotice={setNotice} />
    <footer className="aw-work-meta"><p>Created from organization version {item.templateVersion}. Existing task edits and completed records are retained when defaults change.</p>{manager&&<div className="aw-inline"><button onClick={()=>setAdoption('timing')}>Review latest timing defaults</button>{item.kind==='member_event'&&<button onClick={()=>setAdoption('template')}>Review latest workflow template</button>}</div>}</footer>
    {selected && <TaskDetail key={selected.id} task={selected} item={item} schedule={schedule} close={() => navigate(`/phase1/work/${item.id}`)} />}
    {edit && <EditWork item={item} close={() => setEdit(false)} />}
    {adoption&&<AdoptDefaults item={item} kind={adoption} close={()=>setAdoption(null)}/>}
  </>;
}

function Timeline({ item, stages, schedule, onSelect }: { item: WorkItem; stages: StageProjection[]; schedule: WorkSchedule; onSelect: (task: WorkTask) => void }) {
  const { envelope } = useWorkspace();
  const members = envelope?.state.members ?? [];
  const dates = Object.values(schedule.tasks).flatMap(task => [task.start,task.due,task.official]).filter((value): value is string => !!value);
  if (item.date) dates.push(item.date);
  dates.sort();
  const from = dates[0], to = dates.at(-1);
  const span = from && to ? Math.max(1, (dateValue(to)-dateValue(from))/oneDay) : 1;
  const position = (date: string) => Math.max(0, Math.min(100, (dateValue(date)-dateValue(from))/oneDay/span*100));
  const today = todayInArizona();
  const todayPosition = from && to && today >= from && today <= to ? position(today) : null;
  return <section className="aw-timeline" aria-label="Activity timeline">
    {!item.date && <p className="aw-note">Set an activity date to calculate task dates from your timing defaults.</p>}
    <div className="aw-timeline-scroll"><div className="aw-timeline-content">
      <div className="aw-timeline-axis"><span>Workflow step</span><div>{from && to ? <><span>{shortDate(from)}</span><span>{shortDate(to)}</span>{item.date && <span className="aw-event-marker" style={{ left: `${position(item.date)}%` }}>Activity</span>}{todayPosition !== null && <span className="aw-today-marker" style={{ left: `${todayPosition}%` }}>Today</span>}</> : <span>Dates will appear when scheduling information is available</span>}</div></div>
      {stages.map(stage => <details className="aw-timeline-stage" key={stage.id} open={stage.status === 'current' || stage.blocked > 0}>
        <summary><strong>{stage.title}</strong><span>{stage.completed}/{stage.total} complete{stage.blocked > 0 ? ` · ${stage.blocked} blocked` : ''}</span></summary>
        {stage.tasks.map(task => {
          const plan = schedule.tasks[task.id];
          const start = plan?.start, due = plan?.due;
          const owner = envelope?.organization.roles.find(role => task.roleIds.includes(role.id));
          const color = envelope?.organization.departments.find(dept => dept.id === owner?.departmentId)?.color ?? '#536b8b';
          const bar: CSSProperties = start && due && from ? { left: `${position(start)}%`, width: `${Math.max(1.5, position(due)-position(start))}%`, backgroundColor: color } : { left: '0', width: 'auto', backgroundColor: '#edf0f4', color: '#526075' };
          return <div className="aw-timeline-row" key={task.id}>
            <button className="aw-timeline-label" onClick={() => onSelect(task)}><strong>{task.title}</strong><small>{memberName(members, task.ownerId)}</small><Status status={task.status} /></button>
            <div className="aw-timeline-track">{todayPosition !== null && <i className="aw-today-line" style={{ left: `${todayPosition}%` }} />}<button className={`aw-timeline-bar aw-bar-${task.status}`} style={bar} aria-label={`${task.title}: ${start ? shortDate(start) : 'Start not scheduled'} to ${due ? shortDate(due) : 'Due date not scheduled'}`} onClick={() => onSelect(task)}>{due ? shortDate(due) : 'Not scheduled'}</button>{plan?.official && <button className="aw-official-marker" style={{ left: `${position(plan.official)}%` }} aria-label={`Official deadline for ${task.title}: ${shortDate(plan.official)}`} onClick={() => onSelect(task)}>◆</button>}</div>
          </div>;
        })}
      </details>)}
      {!stages.length && <p className="aw-empty">No steps match these filters.</p>}
    </div></div>
    <p className="aw-muted aw-timeline-legend">Bars show task schedules · ◆ Official deadline · Department colors identify responsibilities</p>
  </section>;
}

function TaskDetail({ task, item, schedule, close }: { task: WorkTask; item: WorkItem; schedule: WorkSchedule; close: () => void }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
  const members = envelope?.state.members ?? [];
  const manager = actor?.access === 'manager';
  const canControl = manager || task.ownerId === actor?.id;
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [ownerId, setOwnerId] = useState(task.ownerId ?? '');
  const [due, setDue] = useState(task.dueOverride ?? '');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [evidence, setEvidence] = useState('');
  const [depends, setDepends] = useState(task.dependsOn);
  const previous=useRef(task);
  const [versionNotice,setVersionNotice]=useState(false);
  useEffect(()=>{
    const old=previous.current;
    const sync=(local:string,before:string,after:string,set:(value:string)=>void)=>{
      if(local===before)set(after);
      else if(before!==after&&local!==after)setVersionNotice(true);
    };
    sync(title,old.title,task.title,setTitle);sync(description,old.description,task.description,setDescription);
    sync(ownerId,old.ownerId??'',task.ownerId??'',setOwnerId);sync(due,old.dueOverride??'',task.dueOverride??'',setDue);
    if(JSON.stringify(depends)===JSON.stringify(old.dependsOn))setDepends(task.dependsOn);
    else if(JSON.stringify(old.dependsOn)!==JSON.stringify(task.dependsOn))setVersionNotice(true);
    previous.current=task;
  },[task]);
  const dialog = useRef<HTMLDivElement>(null);
  const plan = schedule.tasks[task.id];
  const gate = item.gates.find(entry => entry.id === task.gateId);
  const ready = taskReady(item, task);
  const participant = canControl || (!!actor && task.collaboratorIds.includes(actor.id));
  const dirty=title!==task.title||description!==task.description||ownerId!==(task.ownerId??'')||due!==(task.dueOverride??'')||JSON.stringify(depends)!==JSON.stringify(task.dependsOn)||!!progress.trim()||!!evidence.trim();
  const unsaved=useUnsavedGuard(dirty,mutating,'Leave this page with unfinished task changes? A recovery copy is kept on this device.');
  const recovery=useFormRecovery(envelope?`platypus.workspace-input.${envelope.state.workspaceId}.task.${task.id}`:null,{title,description,ownerId,due,progress,evidence,depends},dirty,TaskInputSchema,saved=>{setTitle(saved.title);setDescription(saved.description);setOwnerId(saved.ownerId);setDue(saved.due);setProgress(saved.progress);setEvidence(saved.evidence);setDepends(saved.depends);});
  const dismiss=()=>{if(unsaved.confirmDiscard())close();};
  const update = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if(versionNotice&&!window.confirm('This task changed while you were editing. Save your reviewed edits over the latest saved fields?'))return;
    try { await mutate({ type: 'task.update', workItemId: item.id, taskId: task.id, patch: { title, description, ...(manager ? { ownerId: ownerId || null, dueOverride: due || null, dependsOn: depends } : {}) } }); unsaved.markSaved(); recovery.clear();close(); }
    catch (e) { setError((e as Error).message); }
  };
  useDialogFocus(dialog,dismiss,mutating,false);
  useEffect(()=>{dialog.current?.focus();dialog.current?.scrollIntoView?.({block:"nearest"});},[task.id]);
  return <div className="aw-task-detail-shell"><div className="aw-modal aw-task-dialog" role="dialog" aria-modal="false" aria-labelledby="aw-task-title" tabIndex={-1} ref={dialog} onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();dismiss();}}}>
    <header><div><span className="aw-eyebrow">{item.name}</span><h2 id="aw-task-title">{task.title}</h2></div><button aria-label="Close task details" disabled={mutating} onClick={dismiss}>×</button></header>
    <div className="aw-inline"><Status status={task.status} /><span>{memberName(members, task.ownerId)}</span></div>
    {recovery.notice&&<p className="aw-note" role="status">{recovery.notice}</p>}
    {versionNotice&&<p className="aw-note" role="status">The saved task changed. Your unfinished edits are preserved; review them before saving.</p>}
    <dl className="aw-date-facts"><div><dt>Start</dt><dd>{plan?.start ? shortDate(plan.start) : 'Not scheduled'}</dd></div><div><dt>Team target</dt><dd>{plan?.due ? shortDate(plan.due) : 'Not scheduled'}</dd></div><div><dt>Official deadline</dt><dd>{plan?.official ? shortDate(plan.official) : 'Not applicable'}</dd></div></dl>
    {plan?.basis && <p className="aw-muted">{plan.basis}</p>}
    {plan?.issues.length ? <ul className="aw-note">{plan.issues.map((issue,i) => <li key={i}>{issue.replace(/^[a-z_]+:\s*/, "")}</li>)}</ul> : null}
    {!ready && task.status !== 'done' && <p className="aw-note">This task is waiting for a prerequisite, an unresolved blocker or an upstream review.</p>}
    {task.collaboratorIds.length > 0 && <p>Supporting members: {task.collaboratorIds.map(id => memberName(members,id)).join(' · ')}</p>}
    {task.blockers.map(blocker => <div key={blocker.id} className="aw-blocker"><strong>{blocker.reason}</strong>{canControl && <button disabled={mutating || !evidence.trim()} onClick={() => void mutate({ type: 'task.unblock', workItemId: item.id, taskId: task.id, blockerId: blocker.id, evidence }).catch(e => setError(e.message))}>Resolve this blocker</button>}</div>)}
    {task.blockers.length > 0 && canControl && <label>Resolution evidence<input value={evidence} onChange={e => setEvidence(e.target.value)} maxLength={1000} placeholder="What changed?" /></label>}
    {gate && <GateForm gate={gate} item={item} ready={ready} />}
    <form onSubmit={e => void update(e)}><fieldset disabled={mutating || !canControl}><label>Task title<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={180} /></label><label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} /></label>{manager && <><div className="aw-form-pair"><label>Main responsible member<select value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">Needs assignment</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Fixed team date<input type="date" value={due} onChange={e => setDue(e.target.value)} /></label></div><details><summary>Prerequisite steps</summary>{item.tasks.filter(candidate => candidate.id !== task.id).map(candidate => <label key={candidate.id} className="aw-checkbox"><input type="checkbox" checked={depends.includes(candidate.id)} onChange={e => setDepends(e.target.checked ? [...depends,candidate.id] : depends.filter(id => id !== candidate.id))} />{candidate.title}</label>)}</details></>}{canControl && <button type="submit" className="aw-primary">Save task changes</button>}</fieldset></form>
    {participant && task.status !== 'done' && <form className="aw-progress-form" onSubmit={e => { e.preventDefault(); void mutate({ type: 'task.progress', workItemId: item.id, taskId: task.id, text: progress }).then(() => setProgress('')).catch(e => setError(e.message)); }}><label>Progress update<textarea required maxLength={1000} value={progress} onChange={e => setProgress(e.target.value)} /></label><button disabled={mutating || !progress.trim()}>Add update</button></form>}
    {task.progress.length > 0 && <details><summary>Updates · {task.progress.length}</summary>{task.progress.map((entry,i) => <p key={i}><strong>{memberName(members,entry.memberId)}</strong> · {entry.text}</p>)}</details>}
    {error && <p role="alert" className="aw-error">{error}</p>}
    <footer><button onClick={dismiss}>Close</button>{task.kind === 'task' && task.status !== 'done' && <button className="aw-primary" disabled={mutating || !canControl || !ready} onClick={() => {if(!unsaved.confirmDiscard())return;void mutate({ type: 'task.complete', workItemId: item.id, taskId: task.id }).then(()=>{unsaved.markSaved();close();}).catch(e => setError(e.message));}}>Complete task</button>}{manager && task.status === 'done' && <button disabled={mutating} onClick={() => void mutate({ type: 'task.reopen', workItemId: item.id, taskId: task.id }).then(()=>{unsaved.markSaved();close();}).catch(e => setError(e.message))}>Reopen task</button>}</footer>
  </div></div>;
}

function GateForm({ gate, item, ready }: { gate: ApprovalGate; item: WorkItem; ready: boolean }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState('');
  const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
  useUnsavedGuard(gate.status==='pending'&&!!evidence.trim(),mutating,'Leave this page with unfinished approval evidence?');
  const recovery=useFormRecovery(envelope?`platypus.workspace-input.${envelope.state.workspaceId}.approval.${gate.id}`:null,{evidence},gate.status==='pending'&&!!evidence.trim(),z.object({evidence:z.string().max(1000)}),saved=>setEvidence(saved.evidence));
  const canDecide = actor?.access === 'manager' || (!!actor && (!gate.external && gate.approverIds.includes(actor.id)));
  if (gate.status !== 'pending') return <p className="aw-note">Decision recorded: {gate.status}. {gate.evidence}</p>;
  return <section className="aw-gate"><h3>Approval decision</h3><p>{gate.external?'Record the actual external decision and its source. This does not send an application or verify an external approval.':'Record the decision for this approval step.'}</p>{gate.reason&&<p>{gate.reason}</p>}{recovery.notice&&<p className="aw-muted">{recovery.notice}</p>}<label>Decision evidence<textarea required maxLength={1000} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Approval record, reference or reason for rejection" /></label><div className="aw-inline"><button className="aw-primary" disabled={mutating || !canDecide || !ready || !evidence.trim()} onClick={() => void mutate({ type: 'gate.decide', workItemId: item.id, gateId: gate.id, decision: 'approved', evidence }).catch(e => setError(e.message))}>Record approval</button><button disabled={mutating || !canDecide || !ready || !evidence.trim()} onClick={() => void mutate({ type: 'gate.decide', workItemId: item.id, gateId: gate.id, decision: 'rejected', evidence }).catch(e => setError(e.message))}>Record rejection</button></div>{error && <p className="aw-error" role="alert">{error}</p>}</section>;
}

function FundingPanel({ item, onNotice }: { item: WorkItem; onNotice: (text: string) => void }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const actor = envelope?.state.members.find(member => member.id === envelope.state.actorId);
  const manager = actor?.access === 'manager';
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [source, setSource] = useState<FundingRequest['source']>('college');
  const [category,setCategory]=useState<'food_service'|'speaker'|'other'>('other');
  useUnsavedGuard(adding&&!!(amount||purpose),mutating,'Leave this page with an unfinished funding request?');
  const recovery=useFormRecovery(envelope?`platypus.workspace-input.${envelope.state.workspaceId}.funding-new.${item.id}`:null,{adding,amount,purpose,source,category},adding&&!!(amount||purpose),NewFundingInputSchema,saved=>{setAdding(saved.adding);setAmount(saved.amount);setPurpose(saved.purpose);setSource(saved.source);setCategory(saved.category);});
  return <section className="aw-funding" aria-label="Activity funding"><header><div><h2>Funding</h2><p>Requests, approvals and purchases are part of this workflow.</p></div>{manager && <button onClick={() => setAdding(!adding)}>+ Add funding source</button>}</header>
    {!item.funding.length && <p className="aw-muted">No funding requests for this work.</p>}{recovery.notice&&<p className="aw-note" role="status">{recovery.notice}</p>}
    {item.funding.map(request => <FundingCard key={request.id} item={item} request={request} manager={manager} onNotice={onNotice} />)}
    {adding && <form className="aw-funding-form" onSubmit={e => { e.preventDefault(); void mutate({ type: 'funding.add', workItemId: item.id, requestId: workspaceId(), amount: Number(amount), source, purpose,category }).then(() => { setAdding(false); setAmount(''); setPurpose(''); }).catch(e => onNotice(e.message)); }}><div className="aw-form-pair"><label>Source<select value={source} onChange={e => setSource(e.target.value as typeof source)}><option value="college">College</option><option value="usg">USG</option><option value="dues">Club funds</option><option value="sponsor">Sponsor</option></select></label><label>Amount (USD)<input type="number" min="0" max="1000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label></div><label>Funding category<select value={category} onChange={e=>setCategory(e.target.value as typeof category)}><option value="other">Other purchases</option><option value="food_service">Food or services</option><option value="speaker">Speaker or performer</option></select></label><label>Purpose<input value={purpose} maxLength={1000} onChange={e => setPurpose(e.target.value)} required /></label><button disabled={mutating}>Add request and workflow steps</button></form>}
  </section>;
}

function FundingCard({ item, request, manager, onNotice }: { item: WorkItem; request: FundingRequest; manager: boolean; onNotice: (text: string) => void }) {
  const { envelope,mutate, mutating } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(request.amount));
  const [purpose, setPurpose] = useState(request.purpose);
  const [source, setSource] = useState(request.source);
  const [category,setCategory]=useState(request.category??'other');
  const [spendBy, setSpendBy] = useState(request.spendBy ?? '');
  const [commitAmount, setCommitAmount] = useState('');
  const [commitPurpose, setCommitPurpose] = useState('');
  const [evidence, setEvidence] = useState('');
  const dirty=amount!==String(request.amount)||purpose!==request.purpose||source!==request.source||category!==(request.category??'other')||spendBy!==(request.spendBy??'')||!!commitAmount||!!commitPurpose||(!!evidence.trim()&&request.commitments.some(commitment=>commitment.status==='reserved'));
  useUnsavedGuard(dirty,mutating,'Leave this page with unfinished funding changes? A recovery copy is kept on this device.');
  const recovery=useFormRecovery(envelope?`platypus.workspace-input.${envelope.state.workspaceId}.funding.${request.id}`:null,{editing,amount,purpose,source,category,spendBy,commitAmount,commitPurpose,evidence},dirty,FundingInputSchema,saved=>{setEditing(saved.editing);setAmount(saved.amount);setPurpose(saved.purpose);setSource(saved.source);setCategory(saved.category);setSpendBy(saved.spendBy);setCommitAmount(saved.commitAmount);setCommitPurpose(saved.commitPurpose);setEvidence(saved.evidence);});
  const left = request.approvedAmount === null ? null : request.approvedAmount-request.committedAmount-request.spentAmount;
  return <article className="aw-funding-card"><div className="aw-inline"><h3>{request.source.toUpperCase()} · {money(request.amount)}</h3><span className="aw-funding-state">{request.status} · version {request.version}</span></div><p>{request.purpose}</p><dl className="aw-date-facts"><div><dt>Approved</dt><dd>{request.approvedAmount === null ? 'Not approved' : money(request.approvedAmount)}</dd></div><div><dt>Reserved / spent</dt><dd>{money(request.committedAmount)} / {money(request.spentAmount)}</dd></div><div><dt>Available</dt><dd>{left === null ? 'Waiting for approval' : money(left)}</dd></div></dl>
    {recovery.notice&&<p className="aw-note" role="status">{recovery.notice}</p>}
    <div className="aw-funding-steps">{item.gates.filter(gate => gate.requestId === request.id&&gate.requestVersion===request.version).map(gate => <Link key={gate.id} to={`/phase1/work/${item.id}?task=${gate.taskId}`}>{gate.kind === 'budget' ? 'Budget approval' : 'Purchase approval'} · {gate.status} · v{gate.requestVersion}</Link>)}</div>
    {item.gates.some(gate=>gate.requestId===request.id&&gate.requestVersion!==request.version)&&<details><summary>Previous approval decisions</summary>{item.gates.filter(gate=>gate.requestId===request.id&&gate.requestVersion!==request.version).map(gate=><p key={gate.id}>{gate.kind==='budget'?'Budget':'Purchase'} · version {gate.requestVersion} · {gate.status}<br/>{gate.evidence||'No decision evidence recorded.'}{gate.decidedAt&&<><br/>{new Date(gate.decidedAt).toLocaleString('en-US',{timeZone:'America/Phoenix'})}</>}</p>)}</details>}
    {manager && <button onClick={() => setEditing(!editing)}>Revise request</button>}
    {editing && <form onSubmit={e => { e.preventDefault(); void mutate({ type: 'funding.revise', workItemId: item.id, requestId: request.id, amount: Number(amount), source, purpose,category }).then(() => { setEditing(false); onNotice('Request revised. Previous approval does not approve the new request version.'); }).catch(e => onNotice(e.message)); }}><div className="aw-form-pair"><label>Requested amount (USD)<input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label><label>Funding source<select value={source} onChange={e=>setSource(e.target.value as FundingRequest['source'])}><option value="college">College</option><option value="usg">USG</option><option value="dues">Club funds</option><option value="sponsor">Sponsor</option></select></label></div><label>Funding category<select value={category} onChange={e=>setCategory(e.target.value as typeof category)}><option value="other">Other purchases</option><option value="food_service">Food or services</option><option value="speaker">Speaker or performer</option></select></label><label>Purpose<input value={purpose} maxLength={1000} onChange={e => setPurpose(e.target.value)} required /></label><p className="aw-muted">A material change requires a new approval. Completed spending remains recorded.</p><button disabled={mutating}>Save new request version</button></form>}
    {manager&&<form className="aw-funding-deadline" onSubmit={e=>{e.preventDefault();void mutate({type:'funding.setDeadline',workItemId:item.id,requestId:request.id,spendBy:spendBy||null}).then(()=>onNotice('Funding use-by date saved. Activity date changes will not move this date.')).catch(e=>onNotice(e.message));}}><label>Funds must be used by<input type="date" value={spendBy} onChange={e=>setSpendBy(e.target.value)}/></label><button disabled={mutating||spendBy===(request.spendBy??'')}>Save use-by date</button></form>}
    {manager && request.status === 'approved' && <details><summary>Reserve a purchase</summary><form onSubmit={e => { e.preventDefault(); void mutate({ type: 'funding.commit', workItemId: item.id, requestId: request.id, commitmentId: workspaceId(), amount: Number(commitAmount), purpose: commitPurpose }).then(() => { setCommitAmount(''); setCommitPurpose(''); }).catch(e => onNotice(e.message)); }}><div className="aw-form-pair"><label>Amount (USD)<input required type="number" min="0.01" step="0.01" value={commitAmount} onChange={e => setCommitAmount(e.target.value)} /></label><label>Purchase purpose<input required maxLength={400} value={commitPurpose} onChange={e => setCommitPurpose(e.target.value)} /></label></div><button disabled={mutating}>Reserve against approved funding</button></form></details>}
    {request.commitments.length > 0 && <details><summary>Purchases · {request.commitments.length}</summary>{manager && <label>Spending or release evidence<input value={evidence} onChange={e => setEvidence(e.target.value)} maxLength={1000} /></label>}{request.commitments.map(commitment => <div className="aw-commitment" key={commitment.id}><span>{commitment.purpose} · {money(commitment.amount)} · {commitment.status}</span>{manager && commitment.status === 'reserved' && <div className="aw-inline"><button disabled={mutating || !evidence.trim()} onClick={() => void mutate({ type: 'funding.spend', workItemId: item.id, requestId: request.id, commitmentId: commitment.id, evidence }).catch(e => onNotice(e.message))}>Record spent</button><button disabled={mutating || !evidence.trim()} onClick={() => void mutate({ type: 'funding.release', workItemId: item.id, requestId: request.id, commitmentId: commitment.id, evidence }).catch(e => onNotice(e.message))}>Release reservation</button></div>}</div>)}</details>}
  </article>;
}

function EditWork({ item, close }: { item: WorkItem; close: () => void }) {
  const { envelope, mutate, mutating } = useWorkspace();
  const [name,setName] = useState(item.name);
  const [date,setDate] = useState(item.date ?? '');
  const [description,setDescription] = useState(item.description);
  const [ownerId,setOwnerId] = useState(item.ownerId ?? '');
  const [error,setError] = useState('');
  const dialog=useRef<HTMLDivElement>(null);
  const unsaved=useUnsavedGuard(name!==item.name||date!==(item.date??'')||description!==item.description||ownerId!==(item.ownerId??''),mutating,'Discard unsaved activity changes?');
  const recovery=useFormRecovery(envelope?`platypus.workspace-input.${envelope.state.workspaceId}.work.${item.id}`:null,{name,date,description,ownerId},name!==item.name||date!==(item.date??'')||description!==item.description||ownerId!==(item.ownerId??''),WorkInputSchema,saved=>{setName(saved.name);setDate(saved.date);setDescription(saved.description);setOwnerId(saved.ownerId);});
  const dismiss=()=>{if(unsaved.confirmDiscard())close();};
  useDialogFocus(dialog,dismiss,mutating);
  const impact = useMemo(() => item.tasks.filter(task => task.status !== 'done' && task.applicability !== 'inactive').length, [item.tasks]);
  return <div className="aw-modal-backdrop"><div ref={dialog} tabIndex={-1} className="aw-modal aw-small-modal" role="dialog" aria-modal="true" aria-labelledby="aw-edit-work-title"><header><h2 id="aw-edit-work-title">Edit {item.kind === 'member_event' ? 'activity' : 'board work'}</h2><button aria-label="Close work settings" disabled={mutating} onClick={dismiss}>×</button></header><form onSubmit={e => { e.preventDefault(); void mutate({ type: 'work.update', workItemId: item.id, patch: { name,description,date:date || null,ownerId:ownerId || null } }).then(()=>{unsaved.markSaved();recovery.clear();close();}).catch(e => setError(e.message)); }}><fieldset disabled={mutating}><label>Name<input autoFocus required maxLength={180} value={name} onChange={e => setName(e.target.value)} /></label><label>Description<textarea maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} /></label><div className="aw-form-pair"><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label>Work lead<select value={ownerId} onChange={e => setOwnerId(e.target.value)}><option value="">Needs assignment</option>{envelope?.state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label></div>{date !== (item.date ?? '') && <p className="aw-note">Changing the date recalculates {impact} unfinished steps. Completed records and fixed date overrides remain; schedule conflicts will be highlighted.</p>}{recovery.notice&&<p className="aw-note" role="status">{recovery.notice}</p>}{error && <p className="aw-error" role="alert">{error}</p>}<footer><button type="button" onClick={dismiss}>Cancel</button><button className="aw-primary">Save changes</button></footer></fieldset></form></div></div>;
}

function AdoptDefaults({item,kind,close}:{item:WorkItem;kind:'timing'|'template';close:()=>void}) {
  const {envelope,mutate,mutating}=useWorkspace();
  const [latest,setLatest]=useState<ApprovedContext|null>(null);
  const [loading,setLoading]=useState(kind==='template');
  const [error,setError]=useState('');
  const dialog=useRef<HTMLDivElement>(null);
  useDialogFocus(dialog,close,mutating);
  useEffect(()=>{
    if(kind!=='template')return;
    const controller=new AbortController();
    void readApprovedContext(controller.signal).then(context=>{if(!controller.signal.aborted){setLatest(context);setLoading(false);if(!context)setError('Confirm an organization workflow before applying a template.');}}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setLoading(false);}});
    return ()=>controller.abort();
  },[kind]);
  const oldNodes=item.templateFlow?.nodes??[];
  const newNodes=latest?.onDemand.memberWorkflow.nodes??[];
  const additions=newNodes.filter(node=>!oldNodes.some(old=>old.id===node.id));
  const removals=oldNodes.filter(node=>!newNodes.some(next=>next.id===node.id));
  const changes=newNodes.filter(node=>{const old=oldNodes.find(old=>old.id===node.id);return old&&JSON.stringify([node.title,node.description,node.roleIds,node.dependsOn,node.dependencyMode,node.timing])!==JSON.stringify([old.title,old.description,old.roleIds,old.dependsOn,old.dependencyMode,old.timing]);});
  const protectedCount=item.tasks.filter(task=>task.status==='done'||task.manualFields.length>0||task.dueOverride).length;
  const timing=envelope?.organization.timingDefaults;
  const timingChanged=!!timing&&JSON.stringify(timing)!==JSON.stringify(item.timingDefaults);
  const templateChanged=!!latest&&latest.contextVersion!==item.templateVersion;
  const apply=async()=>{
    try {
      if(kind==='timing'&&timing)await mutate({type:'work.applyTiming',workItemId:item.id,timingDefaults:timing});
      else if(kind==='template'&&latest)await mutate({type:'work.applyTemplate',workItemId:item.id,templateVersion:latest.contextVersion});
      else return;
      close();
    }catch(e){setError((e as Error).message);}
  };
  return <div className="aw-modal-backdrop"><div ref={dialog} tabIndex={-1} className="aw-modal" role="dialog" aria-modal="true" aria-labelledby="aw-adopt-title"><header><h2 id="aw-adopt-title">Review {kind==='timing'?'timing defaults':'workflow changes'}</h2><button aria-label="Close adoption review" disabled={mutating} onClick={close}>×</button></header><p>{item.name}</p>{loading?<p role="status">Loading the latest confirmed workflow…</p>:kind==='timing'?<><table className="aw-adoption-table"><thead><tr><th>Milestone</th><th>This work</th><th>Latest default</th></tr></thead><tbody>{([['Confirm items','itemsWeeks'],['Confirm quotes','quotesWeeks'],['Submit budget request','budgetWeeks']] as const).map(([label,key])=><tr key={key}><td>{label}</td><td>{item.timingDefaults[key]} weeks before</td><td>{timing?.[key]??item.timingDefaults[key]} weeks before</td></tr>)}</tbody></table>{!timingChanged&&<p className="aw-note">This work already uses these timing defaults.</p>}</>:latest&&<><p>Organization version {item.templateVersion} → {latest.contextVersion}</p>{!templateChanged?<p className="aw-note">This work already uses the latest confirmed template.</p>:<><p>{additions.length} added · {changes.length} changed · {removals.length} no longer in the template</p>{additions.length>0&&<div><h3>New steps</h3><ul>{additions.map(node=><li key={node.id}>{node.title}</li>)}</ul></div>}{changes.length>0&&<div><h3>Changed steps</h3><ul>{changes.map(node=><li key={node.id}>{node.title}</li>)}</ul></div>}{removals.length>0&&<div><h3>Removed from the latest template</h3><ul>{removals.map(node=><li key={node.id}>{node.title}</li>)}</ul></div>}</>}</>}
    <p className="aw-note">{protectedCount} completed or manually adjusted tasks remain protected. Fixed dates and funding records are retained. Related unfinished steps may require a review after applying changes.</p>{error&&<p className="aw-error" role="alert">{error}</p>}<footer><button disabled={mutating} onClick={close}>Cancel</button><button className="aw-primary" disabled={mutating||loading||(kind==='timing'?!timingChanged:!templateChanged)} onClick={()=>void apply()}>Apply reviewed {kind==='timing'?'timing':'workflow'} changes</button></footer></div></div>;
}
