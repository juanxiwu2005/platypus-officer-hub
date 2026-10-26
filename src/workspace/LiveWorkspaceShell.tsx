import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './client';
import { AssistantProvider, AssistantRail } from './assistant';
import { UI_LABELS } from './contracts';
import './shell.css';
const OnlineSetup=lazy(()=>import('../organization/OnlineSetup'));
const WorkspacePages=lazy(()=>import('./pages/WorkspacePages'));

function ShellBody() {
  const {envelope,loading,error,refresh,mutating,mutate}=useWorkspace();
  const location=useLocation(), main=useRef<HTMLElement>(null);
  useEffect(()=>{ main.current?.focus();void refresh(); },[location.pathname,refresh]);
  useEffect(()=>{
    const update=()=>void refresh();
    window.addEventListener('platypus:organization-changed',update);
    return()=>window.removeEventListener('platypus:organization-changed',update);
  },[refresh]);
  const recent=[...(envelope?.state.workItems??[])].filter(w=>w.kind==='member_event').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,5);
  return <div className="p1 live-workspace">
    <a className="p1-skip" href="#live-main" onClick={e=>{e.preventDefault();main.current?.focus();}}>Skip to content</a>
    <aside className="p1-sidebar">
      <Link className="p1-brand" to="/phase1"><span className="p1-brand-mark">p·</span>platypus<span className="p1-beta">preview</span></Link>
      <div className="p1-org"><div><b>{envelope?.organization.name||'Your organization'}</b><span>Private test workspace</span></div></div>
      <nav aria-label="Workspace navigation">
        <NavLink to="/phase1" end>{UI_LABELS.home}</NavLink>
        <NavLink to="/phase1/tasks">{UI_LABELS.tasks}</NavLink>
        <NavLink to="/phase1/activities">{UI_LABELS.activities}</NavLink>
        <NavLink to="/phase1/setup">{UI_LABELS.setup}</NavLink>
        {recent.length>0&&<><div className="p1-nav-label">RECENT ACTIVITIES</div>{recent.map(item=><NavLink key={item.id} to={'/phase1/work/'+encodeURIComponent(item.id)}>{item.name}</NavLink>)}
      </nav>
      <div className="p1-sidebar-bottom">
        {envelope&&envelope.state.members.length>0&&<label className="live-viewer">Demo viewer<select aria-label="Workspace demo viewer" value={envelope.state.actorId??''} disabled={mutating} onChange={e=>void mutate({type:'actor.select',memberId:e.target.value}).catch(()=>{})}><option value="" disabled>Select demo identity</option>{envelope.state.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
        <Link to="/" className="p1-legacy">Open legacy workspace</Link><small>Fictional test identities · no real sign-in</small>
      </div>
    </aside>
    <div className="p1-body live-body">
      <header className="p1-topbar"><span>Workspace / {location.pathname.includes('setup')?UI_LABELS.setup:location.pathname.includes('tasks')?UI_LABELS.tasks:location.pathname.includes('activities')?UI_LABELS.activities:location.pathname.includes('board')?UI_LABELS.executiveBoard:location.pathname.includes('/work/')?'Activity':UI_LABELS.home}</span>{mutating&&<span role="status">Saving…</span>}</header>
      <main id="live-main" ref={main} tabIndex={-1}>
        {error&&!location.pathname.endsWith('/setup')&&!envelope&&<section className="live-error" role="alert"><p>{error}</p><Link to="/phase1/setup">Open organization setup</Link><button onClick={()=>void refresh()}>Retry connection</button></section>}
        <Suspense fallback={<p role="status">Opening your workspace…</p>}>
          <Routes>
            <Route path="setup" element={<OnlineSetup/>}/>
            <Route path="activity/member" element={<Navigate to="/phase1/activities" replace/>}/>
            <Route path="activity/executive" element={<Navigate to="/phase1/board" replace/>}/>
            <Route path="*" element={loading&&!envelope?<p role="status">Loading your workspace…</p>:<WorkspacePages/>}/>
          </Routes>
        </Suspense>
      </main>
    </div>
    <AssistantRail/>
  </div>;
}
export default function LiveWorkspaceShell() {
  return <WorkspaceProvider><AssistantProvider><ShellBody/></AssistantProvider></WorkspaceProvider>;
}
