import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../organization/client';
import type { WorkspaceEnvelope } from '../contracts';
import type { AssistantAction, AssistantAnswer, AssistantContext, AssistantJob } from './protocol';
import './assistant.css';

type Message = { id: string; role: 'user'|'assistant'; text: string; answer?: AssistantAnswer };
interface AssistantValue {
  portalTarget: HTMLElement|null; setPortalTarget: (node: HTMLElement|null) => void;
  setupMounted: boolean; setSetupMounted: (value: boolean) => void;
  setupContext: AssistantContext|null; setSetupContext: (value: AssistantContext|null) => void;
  context: AssistantContext; open: boolean; setOpen: (value: boolean) => void;
  mode: 'setup'|'workspace'; setMode: (value: 'setup'|'workspace') => void;
  text: string; setText: (value: string) => void; messages: Message[];
  busy: boolean; error: string; send: () => Promise<void>; apply: (messageId: string, action: AssistantAction, index: number) => Promise<void>;
  applied: Record<string,string>; deep:boolean; setDeep:(value:boolean)=>void;
  registerSetupFlush:(flush:(()=>Promise<void>)|null)=>void; recoverSetupInput:(text:string,onConsumed?:()=>void)=>void;
  savedSetupInput:string; restoreSetupInput:()=>void;
}
const Assistant = createContext<AssistantValue|null>(null);
const uid = () => crypto.randomUUID();
async function finishJob(job:AssistantJob):Promise<AssistantAnswer>{
  let result=job;if(job.status==='queued')await api<void>('/api/workspace/assistant-run',{jobId:job.jobId});
  const deadline=Date.now()+10*60*1000;
  while(result.status==='queued'||result.status==='running'){if(Date.now()>deadline)throw new Error('AI has not finished. Your data is unchanged. Reload to check this same request.');await new Promise(resolve=>setTimeout(resolve,1500));result=await api<AssistantJob>('/api/workspace/assistant?jobId='+encodeURIComponent(job.jobId));}
  if(result.status==='error'||!result.answer)throw new Error(result.message||'The assistant could not finish. No changes were applied.');return result.answer;
}
function pageContext(path: string): AssistantContext {
  const id = path.match(/\/work\/([^/]+)/)?.[1];
  return { screen: path.includes('/setup') ? 'constitution' : path.includes('/tasks') ? 'tasks' : path.includes('/activities') ? 'activities' : path.includes('/board') ? 'board' : id ? 'work' : 'home', ...(id ? { workItemId: decodeURIComponent(id) } : {}) };
}
export function AssistantProvider({ children }: { children: ReactNode }) {
  const location = useLocation(), navigate = useNavigate();
  const [portalTarget, setPortalTarget] = useState<HTMLElement|null>(null);
  const [setupMounted, setSetupMounted] = useState(false), [setupContext, setSetupContext] = useState<AssistantContext|null>(null);
  const [selection, setSelection] = useState<AssistantContext|null>(null);
  const [open, setOpen] = useState(()=>typeof window==='undefined'||(window.matchMedia?.('(min-width: 1001px)').matches??true)), [mode, setMode] = useState<'setup'|'workspace'>('setup');
  const [text, setText] = useState(''), [messages, setMessages] = useState<Message[]>([]);
  const [deep,setDeep]=useState(false),[savedSetupInput,setSavedSetupInput]=useState('');
  const setupFlush=useRef<(()=>Promise<void>)|null>(null), consumedSetupInput=useRef<(()=>void)|undefined>(), storageKey=useRef('');
  const registerSetupFlush=useCallback((flush:(()=>Promise<void>)|null)=>{setupFlush.current=flush;},[]);
  const recoverSetupInput=useCallback((value:string,onConsumed?:()=>void)=>{if(value.trim()){setSavedSetupInput(value);consumedSetupInput.current=onConsumed;}},[]);
  const restoreSetupInput=useCallback(()=>{setText(v=>v? v+'\n'+savedSetupInput:savedSetupInput);setSavedSetupInput('');consumedSetupInput.current?.();},[savedSetupInput]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [applied, setApplied] = useState<Record<string,string>>({});
  const active = useRef(true),inFlight=useRef(false),storageHealthy=useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(()=>{let live=true;void api<WorkspaceEnvelope>('/api/workspace').then(async e=>{if(!live)return;const key='platypus.workspace.assistant.draft:'+e.state.workspaceId;if(storageKey.current===key)return;storageKey.current=key;let pending:{jobId:string;prompt:string}|null=null;try{const saved=sessionStorage.getItem(key);if(saved)setText(v=>v||saved.slice(0,2000));const raw=sessionStorage.getItem(key+':pending');if(raw)pending=JSON.parse(raw);}catch{/* Current in-memory text remains visible. */}if(pending&&typeof pending.jobId==='string'&&typeof pending.prompt==='string'&&!inFlight.current){inFlight.current=true;setBusy(true);const previous=pending;setMessages(m=>[...m,{id:uid(),role:'user',text:previous.prompt}]);try{const job=await api<AssistantJob>('/api/workspace/assistant?jobId='+encodeURIComponent(previous.jobId));const answer=await finishJob(job);if(active.current){setMessages(m=>[...m,{id:uid(),role:'assistant',text:answer.message,answer}]);setText(v=>v===previous.prompt?'':v);}sessionStorage.removeItem(key+':pending');}catch(error){if(active.current)setError((error as Error).message);}finally{inFlight.current=false;if(active.current)setBusy(false);}}}).catch(()=>{});return()=>{live=false;};},[location.pathname]);
  useEffect(()=>{if(!storageKey.current)return;try{if(text)sessionStorage.setItem(storageKey.current,text);else sessionStorage.removeItem(storageKey.current);storageHealthy.current=true;}catch{storageHealthy.current=false;if(text)setError('Your message is kept in this page, but browser draft recovery is unavailable. Copy it before refreshing.');}},[text]);
  useEffect(()=>{const protect=(event:BeforeUnloadEvent)=>{if(text.trim()||busy){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[text,busy]);
  useEffect(()=>{const beforeLeave=(event:Event)=>{if((text.trim()||busy)&&!storageHealthy.current){event.preventDefault();setError('Your message could not be saved in this browser. Copy it or finish the request before leaving this workspace.');}};window.addEventListener('platypus:before-workspace-leave',beforeLeave);return()=>window.removeEventListener('platypus:before-workspace-leave',beforeLeave);},[text,busy]);
  useEffect(() => {
    setSelection(null);
    if (!location.pathname.includes('/setup')) setMode('workspace');
  }, [location.pathname]);
  useEffect(() => {
    const select = (e: Event) => setSelection((e as CustomEvent<AssistantContext>).detail);
    const ask = (e: Event) => { const d = (e as CustomEvent<{text?:string}>).detail; if (d?.text) setText(d.text); setOpen(true); setMode('workspace'); };
    window.addEventListener('platypus:assistant-context', select); window.addEventListener('platypus:ask', ask);
    return () => { window.removeEventListener('platypus:assistant-context', select); window.removeEventListener('platypus:ask', ask); };
  }, []);
  const context = useMemo(() => location.pathname.includes('/setup') && setupContext ? setupContext : { ...pageContext(location.pathname), ...selection }, [location.pathname, selection, setupContext]);
  const send = useCallback(async () => {
    if (!text.trim() || busy) return;
    const prompt = text.trim(); inFlight.current=true; setBusy(true); setError(''); setText('');
    setMessages(m => [...m, {id:uid(), role:'user', text:prompt}]);
    const requestId = uid();
    try {
      await setupFlush.current?.();
      const current = await api<WorkspaceEnvelope>('/api/workspace');
      const draftKey='platypus.workspace.assistant.draft:'+current.state.workspaceId;storageKey.current=draftKey;try{sessionStorage.setItem(draftKey,prompt);sessionStorage.setItem(draftKey+':pending',JSON.stringify({jobId:requestId,prompt}));}catch{storageHealthy.current=false;}
      const job = await api<AssistantJob>('/api/workspace/assistant', { action:'ask', requestId, revision:current.state.revision, setupRevision:current.setupRevision, instruction:prompt, context:{...context,workspaceId:current.state.workspaceId,revision:current.setupRevision}, deep, conversation:messages.slice(-8).map(m => ({role:m.role,text:m.text})) });
      const answer=await finishJob(job);
      try{sessionStorage.removeItem(draftKey+':pending');sessionStorage.removeItem(draftKey);}catch{/* No credentials or runtime state are cached. */}
      if(active.current)setMessages(m=>[...m,{id:uid(),role:'assistant',text:answer.message,answer}]);
    } catch(e) {
      if (active.current) { setError((e as Error).message); setText(v => v || prompt); }
    } finally { inFlight.current=false;if (active.current) setBusy(false); }
  }, [text,busy,context,messages,deep]);
  const apply = useCallback(async (messageId: string, action: AssistantAction, index: number) => {
    const key = messageId+':'+index;
    if (busy || applied[key]) return;
    if (action.kind === 'navigate') { navigate(action.path); setApplied(v=>({...v,[key]:'Opened'})); return; }
    if (action.kind === 'create') {
      navigate(action.input.kind === 'executive_work' ? '/phase1/board' : '/phase1/activities', {state:{createWork:action.input}});
      window.dispatchEvent(new CustomEvent('platypus:open-create',{detail:{kind:action.input.kind,prefill:action.input}}));
      setApplied(v=>({...v,[key]:'Form opened · review and save there'})); return;
    }
    const message = messages.find(m=>m.id===messageId);
    if (!message?.answer) return;
    setBusy(true); setError('');
    try {
      if(action.kind==='organization')await setupFlush.current?.();
      await api('/api/workspace/assistant',{action:'apply',requestId:uid(),jobId:message.answer.proposalId,actionIndex:index});
      setApplied(v=>({...v,[key]:action.kind==='organization'?'Draft saved · confirm in Organization setup':'Applied'}));
      window.dispatchEvent(new Event('platypus:workspace-changed'));
      if (action.kind==='organization') window.dispatchEvent(new Event('platypus:organization-changed'));
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  },[applied,busy,messages,navigate]);
  const value = {portalTarget,setPortalTarget,setupMounted,setSetupMounted,setupContext,setSetupContext,context,open,setOpen,mode,setMode,text,setText,messages,busy,error,send,apply,applied,deep,setDeep,registerSetupFlush,recoverSetupInput,savedSetupInput,restoreSetupInput};
  return <Assistant.Provider value={value}>{children}</Assistant.Provider>;
}
export function useAssistant() { const value=useContext(Assistant); if(!value) throw new Error('AssistantProvider is required.'); return value; }
export function SetupContextBridge({context,beforeRequest,unsentInput,onInputConsumed}:{context:AssistantContext;beforeRequest?:()=>Promise<void>;unsentInput?:string;onInputConsumed?:()=>void}) {
  const value=useContext(Assistant), key=JSON.stringify(context);
  useEffect(()=>{value?.setSetupContext(context);return()=>value?.setSetupContext(null);},[key,value?.setSetupContext]);
  const flush=useRef(beforeRequest);flush.current=beforeRequest;
  useEffect(()=>{value?.registerSetupFlush(()=>flush.current?.()??Promise.resolve());return()=>value?.registerSetupFlush(null);},[value?.registerSetupFlush]);
  useEffect(()=>{if(unsentInput)value?.recoverSetupInput(unsentInput,onInputConsumed);},[unsentInput,value?.recoverSetupInput]);
  return null;
}
export function SetupAssistantPortal({children}:{children:ReactNode}) {
  const value=useContext(Assistant), register=value?.setSetupMounted;
  useEffect(()=>{register?.(true);return()=>register?.(false);},[register]);
  if(!value) return <>{children}</>;
  return value.portalTarget ? createPortal(children,value.portalTarget) : null;
}
export function AssistantRail() {
  const a=useAssistant(); const [width,setWidth]=useState(330);
  const [history,setHistory]=useState<{revision:number;at:string;organization:{name:string}}[]|null>(null),[historyError,setHistoryError]=useState('');
  const loadHistory=async()=>{setHistoryError('');try{const value=await api<{versions:{revision:number;at:string;organization:{name:string}}[]}>('/api/org/archive?action=history');setHistory(value.versions);}catch(e){setHistoryError((e as Error).message);}};
  return <>
    {!a.open && <button className="wa-open" onClick={()=>a.setOpen(true)}>✦ Ask Platypus</button>}
    <aside className={`wa-rail ${a.open?'wa-visible':''}`} style={{width}} aria-label="Ask Platypus">
      <header><div><strong>Ask Platypus</strong><small>{({constitution:'Constitution',team:'Your Team',responsibilities:'Responsibilities',workflow:'Activity Workflow',review:'Review',home:'Home',tasks:'My Tasks',activities:'Activities',board:'Executive Board',work:'Activity'} as Record<string,string>)[a.context.screen]??'Workspace'} · Connected to your workspace</small></div><button aria-label="Close assistant" onClick={()=>a.setOpen(false)}>×</button></header>
      <label className="wa-width">Panel width<input aria-label="Assistant panel width" type="range" min="290" max="480" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
      <div className="wa-setup" hidden ref={a.setPortalTarget}/>
      <div className="wa-workspace">
        <p className="wa-note">Ask a question, create an activity, or describe a change. Review proposed changes before applying them.</p>
        <div className="wa-messages" aria-live="polite">{a.messages.map(m=><article key={m.id} className={'wa-message wa-'+m.role}><small>{m.role==='user'?'You':'Platypus'}</small><p>{m.text}</p>{m.answer?.question&&<p>{m.answer.question}</p>}{m.answer?.actions.map((action,i)=><div className="wa-action" key={i}><strong>{action.title}</strong>{action.kind==='organization'&&<small>Organization draft · confirmation required</small>}<button disabled={a.busy||!!a.applied[m.id+':'+i]} onClick={()=>void a.apply(m.id,action,i)}>{a.applied[m.id+':'+i]|| (action.kind==='create'?'Open creation form':action.kind==='navigate'?'Open page':'Approve change')}</button></div>)}</article>)}</div>
        <button type="button" disabled={a.busy} onClick={()=>void loadHistory()}>View configuration history</button>
        {history&&<section aria-label="Configuration history"><button type="button" onClick={()=>setHistory(null)}>Close history</button>{history.length?[...history].reverse().map(v=><div key={v.revision}><small>Revision {v.revision} · {v.organization.name}</small><button type="button" onClick={()=>{a.setText('Use history revision '+v.revision+': '+a.text);setHistory(null);}}>Use revision {v.revision}</button></div>):<p>No previous configuration versions yet.</p>}</section>}
        {historyError&&<p role="alert">{historyError}</p>}
        {a.savedSetupInput&&<button type="button" onClick={a.restoreSetupInput}>Restore saved setup message</button>}
        {a.error&&<p role="alert" className="wa-error">{a.error}</p>}
        <form onSubmit={e=>{e.preventDefault();void a.send();}}><label htmlFor="workspace-ask">Ask about your workspace</label><textarea id="workspace-ask" value={a.text} maxLength={2000} placeholder="Plan a member workshop, or adjust a task…" onChange={e=>a.setText(e.target.value)} disabled={a.busy}/><label className="wa-deep"><input type="checkbox" checked={a.deep} onChange={e=>a.setDeep(e.target.checked)} disabled={a.busy}/> Deeper review (slower)</label><button type="submit" disabled={a.busy||!a.text.trim()}>{a.busy?'Preparing…':'Send →'}</button></form>
      </div>
    </aside>
  </>;
}
