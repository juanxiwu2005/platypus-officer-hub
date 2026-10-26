import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useOptionalWorkspace } from './client';
import { MemberSchema, type WorkspaceMember } from './contracts';
import type { OrgRole } from '../organization/schema';

/** Demonstration appointments, deliberately separate from real identity authentication. */
export default function MembersPanel({roleOptions,beforeSave}:{roleOptions?:OrgRole[];beforeSave?:()=>Promise<void>}={}) {
  const workspace=useOptionalWorkspace();
  const [editing,setEditing]=useState<WorkspaceMember|null>(null),[name,setName]=useState(''),[roleIds,setRoleIds]=useState<string[]>([]),[manager,setManager]=useState(false),[notice,setNotice]=useState('');
  const newId=useRef<string>(crypto.randomUUID()),protectionFailed=useRef(false);
  const scope=workspace?.envelope?.state.workspaceId;
  const recoveryKey=scope?'platypus.member-input.'+scope:null;
  useEffect(()=>{
    setEditing(null);setName('');setRoleIds([]);setManager(false);
    if(!recoveryKey) return;
    try {
      const raw=localStorage.getItem(recoveryKey); if(!raw)return;
      const saved=JSON.parse(raw) as Record<string,unknown>;
      if(typeof saved.name!=='string'||saved.name.length>100||!Array.isArray(saved.roleIds)||!saved.roleIds.every(id=>typeof id==='string')) return;
      setName(saved.name);setRoleIds(saved.roleIds as string[]);setManager(saved.manager===true);
      if(saved.editing){const member=MemberSchema.safeParse(saved.editing);if(member.success)setEditing(member.data);}
      if(typeof saved.newId==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(saved.newId))newId.current=saved.newId;
    }catch{setNotice('Your member input could not be restored. Saved members are unchanged.');}
  },[recoveryKey]);
  useEffect(()=>{
    const protect=(event:Event)=>{
      if(!protectionFailed.current||(!name&&!roleIds.length))return;
      try{if(recoveryKey)localStorage.setItem(recoveryKey,JSON.stringify({editing,name,roleIds,manager,newId:newId.current}));protectionFailed.current=false;}
      catch{event.preventDefault();setNotice('Save or copy this member input before leaving; this device could not protect it.');}
    };
    window.addEventListener('platypus:before-workspace-leave',protect);
    const unload=(event:BeforeUnloadEvent)=>{if(protectionFailed.current&&(name||roleIds.length)){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',unload);
    return()=>{window.removeEventListener('platypus:before-workspace-leave',protect);window.removeEventListener('beforeunload',unload);};
  },[editing,name,roleIds,manager,recoveryKey]);
  const update=(patch:Partial<{editing:WorkspaceMember|null;name:string;roleIds:string[];manager:boolean}>)=>{
    const next={editing,name,roleIds,manager,...patch,newId:newId.current};
    setEditing(next.editing);setName(next.name);setRoleIds(next.roleIds);setManager(next.manager);
    if(recoveryKey)try{localStorage.setItem(recoveryKey,JSON.stringify(next));protectionFailed.current=false;}catch{protectionFailed.current=true;setNotice('This member input could not be protected on this device. Save the member before leaving this chapter.');}
  };
  const clear=()=>{protectionFailed.current=false;newId.current=crypto.randomUUID();setEditing(null);setName('');setRoleIds([]);setManager(false);if(recoveryKey)try{localStorage.removeItem(recoveryKey);}catch{/* Input stays in memory until a successful save. */}};

  if(!workspace) return <p>Open this setup from your organization workspace to assign demo members.</p>;
  const {envelope,loading,mutating,mutate,refresh}=workspace;
  if(!envelope) return <section aria-label="Demo member assignments"><p>{loading?'Loading member assignments…':'Start or reconnect your private workspace to assign demo members.'}</p><button type="button" onClick={()=>void refresh()}>Reload assignments</button></section>;
  const {state,organization}=envelope;
  const roles=roleOptions??organization.roles;
  const actor=state.members.find(m=>m.id===state.actorId);
  const canManage=!state.members.length||actor?.access==='manager';
  const submit=async(e:FormEvent)=>{
    e.preventDefault();setNotice('');
    try {
      await beforeSave?.();
      await mutate({type:'member.upsert',member:{id:editing?.id??newId.current,name:name.trim(),roleIds,access:!state.members.length||manager?'manager':'member',...(editing?.busyWeeks?{busyWeeks:editing.busyWeeks}:{}),...(editing?.bufferDays!==undefined?{bufferDays:editing.bufferDays}:{})}});
      clear();setNotice('Demo appointments saved. These are test identities, not user accounts.');
    } catch(e) { setNotice((e as Error).message); }
  };
  return <section className="workspace-members" aria-label="Demo member assignments">
    <h2>Member assignments</h2><p>Use fictional names to try personal tasks. Demo identities do not sign anyone in.</p>
    {notice&&<p role="status">{notice}</p>}
    {state.members.length>0&&<label>Demo viewer<select aria-label="Demo viewer" disabled={mutating} value={state.actorId??''} onChange={e=>void mutate({type:'actor.select',memberId:e.target.value}).catch(err=>setNotice(err.message))}><option value="" disabled>Choose a demo viewer</option>{state.members.map(m=><option key={m.id} value={m.id}>{m.name}{m.access==='manager'?' · coordinator':''}</option>)}</select></label>}
    {state.members.map(member=><div className="workspace-member" key={member.id}>
      <div><strong>{member.name}</strong><p>{member.roleIds.map(id=>roles.find(r=>r.id===id)?.title??'Former role').join(' · ')||'No position assigned'}</p></div>
      {canManage&&<button type="button" disabled={mutating} onClick={()=>update({editing:member,name:member.name,roleIds:member.roleIds,manager:member.access==='manager'})}>Edit member</button>}
    </div>)}
    {roles.filter(r=>!state.members.some(m=>m.roleIds.includes(r.id))).length>0&&<p>Vacant positions: {roles.filter(r=>!state.members.some(m=>m.roleIds.includes(r.id))).map(r=>r.title).join(', ')}.</p>}
    {canManage&&<form onSubmit={e=>void submit(e)}>
      <label>Fictional member name<input aria-label="Fictional member name" required value={name} maxLength={100} onChange={e=>update({name:e.target.value})}/></label>
      <fieldset><legend>Positions</legend>{roles.map(role=><label key={role.id}><input type="checkbox" checked={roleIds.includes(role.id)} onChange={e=>update({roleIds:e.target.checked?[...roleIds,role.id]:roleIds.filter(id=>id!==role.id)})}/>{role.title}</label>)}</fieldset>
      <label><input type="checkbox" checked={!state.members.length||manager} disabled={!state.members.length} onChange={e=>update({manager:e.target.checked})}/>Demo coordinator · manage this test workspace</label>
      <button type="submit" disabled={mutating||!name.trim()}>{mutating?'Saving…':editing?'Save member':'Add demo member'}</button>
      {editing&&<button type="button" onClick={clear}>Cancel</button>}
    </form>}
  </section>;
}
