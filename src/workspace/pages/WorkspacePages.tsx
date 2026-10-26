import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../client';
import { FlowSchema } from '../../organization/schema';
import type { WorkItem, WorkSchedule } from '../contracts';
import { scheduleWorkItem } from '../schedule';
import { selectPriorityTasks, workItemStatus, workspaceToday } from '../selectors';
import CreateWorkForm, { type CreateWorkPrefill } from './CreateWorkForm';
import TaskBoard from './TaskBoard';
import WorkDetail from './WorkDetail';
import { CompactChain, memberName, shortDate, TaskLink, workflowProgress, WorkStatus } from './shared';
import '../workspace.css';
import { creationRecoveryKey } from './formRecovery';

function safePrefill(value: unknown): CreateWorkPrefill | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string,unknown>;
  if (input.kind !== 'member_event' && input.kind !== 'executive_work') return null;
  const prefill = input.prefill && typeof input.prefill === 'object' ? input.prefill as Record<string,unknown> : input;
  const flow=FlowSchema.safeParse(prefill.flow);
  return { kind: input.kind, ...(typeof prefill.name === 'string' ? {name:prefill.name.slice(0,180)} : {}), ...(typeof prefill.description === 'string' ? {description:prefill.description.slice(0,2000)} : {}), ...(flow.success ? {flow:flow.data} : {}),
    ...(['none','usg','college','dues','sponsor'].includes(String(prefill.fundingSource))?{fundingSource:prefill.fundingSource as CreateWorkPrefill['fundingSource']}:{}),
    ...(['food_service','speaker','other'].includes(String(prefill.fundingCategory))?{fundingCategory:prefill.fundingCategory as CreateWorkPrefill['fundingCategory']}:{}),
    ...(typeof prefill.requestedAmount==='number'&&Number.isFinite(prefill.requestedAmount)&&prefill.requestedAmount>=0&&prefill.requestedAmount<=1000000?{requestedAmount:prefill.requestedAmount}:{}),
    ...(prefill.ownerId===null||typeof prefill.ownerId==='string'?{ownerId:prefill.ownerId as string|null}:{}),
    ...(['campus','offcampus','unspecified'].includes(String(prefill.venue))?{venue:prefill.venue as CreateWorkPrefill['venue']}:{}),
  };
}

export default function WorkspacePages() {
  const { envelope, loading, mutating, error, conflict, canRetry, retryMutation, refresh } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const [creation, setCreation] = useState<CreateWorkPrefill|null>(null);
  const [createKey, setCreateKey] = useState(0);
  const [unfinishedCreation,setUnfinishedCreation]=useState<CreateWorkPrefill|null>(null);
  const today = workspaceToday();
  const schedules = useMemo(() => Object.fromEntries((envelope?.state.workItems ?? []).map(item => [item.id,scheduleWorkItem(item,envelope?.state.members ?? [],today)])), [envelope,today]);
  const openCreate = (prefill: CreateWorkPrefill) => { setCreation(prefill); setCreateKey(value => value+1); };
  useEffect(()=>{
    if(!envelope){setUnfinishedCreation(null);return;}
    try {const raw=localStorage.getItem(creationRecoveryKey(envelope.state.workspaceId));setUnfinishedCreation(raw?safePrefill(JSON.parse(raw)):null);}catch{setUnfinishedCreation(null);}
  },[envelope?.state.workspaceId,creation]);
  useEffect(() => {
    const listener = (event: Event) => { const input=safePrefill((event as CustomEvent).detail); if (input) {const leave=new Event('platypus:before-workspace-leave',{cancelable:true});window.dispatchEvent(leave);if(leave.defaultPrevented)return;setCreation(input); setCreateKey(value=>value+1); } };
    window.addEventListener('platypus:open-create',listener);
    return () => window.removeEventListener('platypus:open-create',listener);
  }, []);
  useEffect(() => {
    const state=location.state as {createWork?:unknown}|null;
    const prefill=safePrefill(state?.createWork);
    if (!prefill) return;
    setCreation(prefill); setCreateKey(value=>value+1);
    navigate(location.pathname+location.search,{replace:true,state:null});
  }, [location.pathname,location.search,location.state,navigate]);
  const workId=location.pathname.match(/\/work\/([^/]+)/)?.[1];
  const screen=workId?'work':location.pathname.endsWith('/tasks')?'tasks':location.pathname.endsWith('/board')?'board':location.pathname.endsWith('/activities')?'activities':'home';
  useEffect(() => { window.dispatchEvent(new CustomEvent('platypus:assistant-context',{detail:{screen,...(workId?{workItemId:workId}:{})}})); },[screen,workId]);
  const work=workId?envelope?.state.workItems.find(item=>item.id===workId):null;
  return <div className="aw-workspace" data-testid="activity-workspace">
    {error && <div className="aw-error" role="alert"><p>{error}</p>{conflict ? <button disabled={mutating} onClick={()=>void refresh()}>Load latest version</button> : canRetry ? <><button disabled={mutating} onClick={()=>void retryMutation().catch(()=>{})}>Retry this save</button><button disabled={mutating} onClick={()=>void refresh()}>Load saved workspace</button></> : <button disabled={mutating} onClick={()=>void refresh()}>Retry loading workspace</button>}</div>}
    {unfinishedCreation&&!creation&&<p className="aw-note">An unfinished creation form is saved on this device. <button onClick={()=>openCreate(unfinishedCreation)}>Resume unfinished form</button></p>}
    {loading && !envelope ? <p role="status" className="aw-empty">Loading your workspace…</p> : !envelope ? <section className="aw-empty"><h1>Open your organization workspace</h1><p>Return to organization setup to start or reconnect to this private workspace.</p><Link to="/phase1/setup">Organization setup →</Link></section> : <>
      {mutating && <p className="aw-saving" role="status">Saving your change…</p>}
      {screen==='home' && <Home schedules={schedules} onCreate={openCreate} />}
      {(screen==='activities'||screen==='board') && <Activities board={screen==='board'} onCreate={openCreate} />}
      {screen==='tasks' && <TaskBoard schedules={schedules} />}
      {screen==='work' && (work ? <WorkDetail key={work.id} item={work} schedule={schedules[work.id]} /> : <section className="aw-empty"><h1>Work item unavailable</h1><p>This item is not in your current workspace. No sample activity has been substituted.</p><Link to="/phase1/activities">View activities →</Link></section>)}
    </>}
    {creation && envelope && <CreateWorkForm key={createKey} prefill={creation} close={()=>setCreation(null)} />}
  </div>;
}

function Home({schedules,onCreate}:{schedules:Record<string,WorkSchedule>;onCreate:(prefill:CreateWorkPrefill)=>void}) {
  const {envelope}=useWorkspace();
  const [showAll,setShowAll]=useState(false);
  if(!envelope) return null;
  const {state}=envelope;
  const actor=state.members.find(member=>member.id===state.actorId);
  const today=workspaceToday();
  const priorities=selectPriorityTasks(state,today,Infinity,schedules);
  const unassigned=state.workItems.flatMap(item=>item.tasks.filter(task=>task.applicability!=='inactive'&&task.status!=='done'&&!task.ownerId).map(task=>({item,task})));
  const memberItems=state.workItems.filter(item=>item.kind==='member_event'&&workItemStatus(item)!=='completed'&&(!item.date||item.date>=today)).sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999'));
  const boardItems=state.workItems.filter(item=>item.kind==='executive_work'&&workItemStatus(item)!=='completed').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  return <>
    <header className="aw-page-head"><div><span className="aw-eyebrow">{envelope.organization.name}</span><h1>{actor?`Hello, ${actor.name.split(' ')[0]}`:'Your workspace'}</h1><p>Move your work forward.</p></div><Link to="/phase1/tasks" className="aw-button">Open My tasks →</Link></header>
    <section className="aw-priorities" aria-label="Your priority tasks"><header><div><h2>Needs your attention</h2><p>From your assigned tasks, ordered by urgency.</p></div><span className="aw-count">{priorities.length} open</span></header>
      {priorities.length ? <ol>{priorities.slice(0,showAll?Infinity:3).map(({task,workItem,reason,due})=><li key={task.id}><div><TaskLink item={workItem} task={task}/><span>{workItem.name}</span></div><span className="aw-priority-reason">{reason}</span><span>{due?shortDate(due):'No date set'}</span><TaskLink item={workItem} task={task}>Open →</TaskLink></li>)}</ol> : <p className="aw-empty-inline">{actor?'No tasks need your attention right now.':'Choose a demo member in Your team to see their assigned work.'}</p>}
      {priorities.length>3&&<button className="aw-text-button" onClick={()=>setShowAll(!showAll)}>{showAll?'Show top 3':`View all ${priorities.length} open tasks`}</button>}
    </section>
    {actor?.access==='manager'&&unassigned.length>0&&<details className="aw-unassigned"><summary>{unassigned.length} workflow tasks need an assignment</summary><p>Assign a responsible member so these tasks appear in their personal board.</p>{unassigned.map(({item,task})=><p key={task.id}><TaskLink item={item} task={task}/><span> · {item.name}</span></p>)}</details>}
    <div className="aw-home-programs"><Overview title="Member Programs" items={memberItems} to="/phase1/activities" kind="member_event" onCreate={onCreate}/><Overview title="Executive Board" items={boardItems} to="/phase1/board" kind="executive_work" onCreate={onCreate}/></div>
  </>;
}

function Overview({title,items,to,kind,onCreate}:{title:string;items:WorkItem[];to:string;kind:WorkItem['kind'];onCreate:(prefill:CreateWorkPrefill)=>void}) {
  const {envelope}=useWorkspace();
  const actor=envelope?.state.members.find(member=>member.id===envelope.state.actorId);
  return <section className="aw-overview"><header><div><h2>{title}</h2><p>{items.length} {kind==='member_event'?'upcoming activities':'active work items'}</p></div><Link to={to}>View all →</Link></header>{items.slice(0,3).map(item=><article key={item.id}><div className="aw-overview-title"><Link to={`/phase1/work/${item.id}`}>{item.name}</Link><WorkStatus item={item}/></div><p>{shortDate(item.date)} · {memberName(envelope?.state.members??[],item.ownerId)}</p><CompactChain item={item}/></article>)}{!items.length&&<p className="aw-empty-inline">{kind==='member_event'?'No upcoming member activities yet.':'No active board work yet.'}</p>}<button disabled={actor?.access!=='manager'} onClick={()=>onCreate({kind})}>+ {kind==='member_event'?'Create member activity':'Create board work'}</button></section>;
}

function semester(date:string|null) { if(!date)return 'Unscheduled';const month=Number(date.slice(5,7));return `${date.slice(0,4)} ${month<=5?'Spring':month<=7?'Summer':'Fall'}`; }
function Activities({board,onCreate}:{board:boolean;onCreate:(prefill:CreateWorkPrefill)=>void}) {
  const {envelope}=useWorkspace();
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState('date');
  const [term,setTerm]=useState('');
  const [lead,setLead]=useState('');
  const [status,setStatus]=useState('');
  const [showCompleted,setShowCompleted]=useState(false);
  if(!envelope)return null;
  const {state}=envelope;
  const kind=board?'executive_work':'member_event';
  const actor=state.members.find(member=>member.id===state.actorId);
  const all=state.workItems.filter(item=>item.kind===kind);
  const filtered=all.filter(item=>(!search||`${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase()))&&(!term||semester(item.date)===term)&&(!lead||item.ownerId===lead)&&(!status||workItemStatus(item)===status));
  const open=filtered.filter(item=>workItemStatus(item)!=='completed');
  const completed=filtered.filter(item=>workItemStatus(item)==='completed');
  const compare=(a:WorkItem,b:WorkItem)=>sort==='updated'?b.updatedAt.localeCompare(a.updatedAt):(a.date??'9999').localeCompare(b.date??'9999')||a.name.localeCompare(b.name);
  const row=(item:WorkItem)=><article className="aw-activity-row" key={item.id}><div className="aw-activity-identity"><Link to={`/phase1/work/${item.id}`}>{item.name}</Link><span>{shortDate(item.date)}</span><small>{memberName(state.members,item.ownerId)}</small></div><CompactChain item={item}/><div className="aw-activity-health"><WorkStatus item={item}/><span>{workflowProgress(item).completed}/{workflowProgress(item).total} steps</span><Link to={`/phase1/work/${item.id}`}>Open timeline →</Link></div></article>;
  return <>
    <header className="aw-page-head"><div><span className="aw-eyebrow">{board?'INTERNAL WORK':'MEMBER PROGRAMS'}</span><h1>{board?'Executive Board':'Activities'}</h1><p>{all.length} {board?'work items':'activities'} in this workspace</p></div><button className="aw-primary" disabled={actor?.access!=='manager'} onClick={()=>onCreate({kind})}>+ {board?'Create board work':'Create activity'}</button></header>
    <div className="aw-activity-filters"><label className="aw-search">Search<input type="search" placeholder={board?'Find board work…':'Find an activity…'} value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="date">Upcoming date</option><option value="updated">Recently updated</option></select></label><label>Semester<select value={term} onChange={e=>setTerm(e.target.value)}><option value="">All semesters</option>{[...new Set(all.map(item=>semester(item.date)))].sort().map(value=><option key={value} value={value}>{value}</option>)}</select></label><label>Lead<select value={lead} onChange={e=>setLead(e.target.value)}><option value="">Everyone</option>{state.members.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All states</option><option value="to_do">To Do</option><option value="working">Working on it</option><option value="stuck">Stuck</option><option value="completed">Completed</option></select></label></div>
    <div className="aw-activity-list" aria-label={board?'Board work list':'Member activity list'}>{open.sort(compare).map(row)}{!open.length&&<div className="aw-empty"><h2>{all.length?'No matching open work':'Start your first '+(board?'board project':'member activity')}</h2><p>{all.length?'Try another search or filter.':'Your confirmed team and workflow will help assign the work.'}</p></div>}</div>
    {completed.length>0&&<section className="aw-completed-activities"><button className="aw-text-button" aria-expanded={showCompleted} onClick={()=>setShowCompleted(!showCompleted)}>{showCompleted?'Hide':'Show'} completed · {completed.length}</button>{showCompleted&&completed.sort(compare).map(row)}</section>}
  </>;
}
