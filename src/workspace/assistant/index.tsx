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
  applied: Record<string,string>;
}
const Assistant = createContext<AssistantValue|null>(null);
const uid = () => crypto.randomUUID();
function pageContext(path: string): AssistantContext {
  const id = path.match(/\/work\/([^/]+)/)?.[1];
  return { screen: path.includes('/setup') ? 'constitution' : path.includes('/tasks') ? 'tasks' : path.includes('/activities') ? 'activities' : path.includes('/board') ? 'board' : id ? 'work' : 'home', ...(id ? { workItemId: decodeURIComponent(id) } : {}) };
}
export function AssistantProvider({ children }: { children: ReactNode }) {
  const location = useLocation(), navigate = useNavigate();
  const [portalTarget, setPortalTarget] = useState<HTMLElement|null>(null);
  const [setupMounted, setSetupMounted] = useState(false), [setupContext, setSetupContext] = useState<AssistantContext|null>(null);
  const [selection, setSelection] = useState<AssistantContext|null>(null);
  const [open, setOpen] = useState(true), [mode, setMode] = useState<'setup'|'workspace'>('setup');
  const [text, setText] = useState(''), [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [applied, setApplied] = useState<Record<string,string>>({});
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
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
    const prompt = text.trim(); setBusy(true); setError(''); setText('');
    setMessages(m => [...m, {id:uid(), role:'user', text:prompt}]);
    const requestId = uid();
    try {
      const current = await api<WorkspaceEnvelope>('/api/workspace');
      const job = await api<AssistantJob>('/api/workspace/assistant', { action:'ask', requestId, revision:current.state.revision, setupRevision:current.setupRevision, instruction:prompt, context, conversation:messages.slice(-8).map(m => ({role:m.role,text:m.text})) });
      let result = job;
      if (job.status === 'queued') await api<void>('/api/workspace/assistant-run', {jobId:job.jobId});
      const deadline = Date.now() + 10*60*1000;
      while (result.status === 'queued' || result.status === 'running') {
        if (Date.now() > deadline) throw new Error('AI has not finished. Your data is unchanged. Check again before starting another request.');
        await new Promise(resolve => setTimeout(resolve,1500));
        result = await api<AssistantJob>('/api/workspace/assistant?jobId='+encodeURIComponent(job.jobId));
      }
      if (result.status === 'error' || !result.answer) throw new Error(result.message || 'The assistant could not finish. No changes were applied.');
      if (active.current) setMessages(m => [...m,{id:uid(),role:'assistant',text:result.answer!.message,answer:result.answer}]);
    } catch(e) {
      if (active.current) { setError((e as Error).message); setText(v => v || prompt); }
    } finally { if (active.current) setBusy(false); }
  }, [text,busy,context,messages]);
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
      await api('/api/workspace/assistant',{action:'apply',requestId:uid(),jobId:message.answer.proposalId,actionIndex:index});
      setApplied(v=>({...v,[key]:action.kind==='organization'?'Draft saved · confirm in Organization setup':'Applied'}));
      window.dispatchEvent(new Event('platypus:workspace-changed'));
      if (action.kind==='organization') window.dispatchEvent(new Event('platypus:organization-changed'));
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  },[applied,busy,messages,navigate]);
  const value = {portalTarget,setPortalTarget,setupMounted,setSetupMounted,setupContext,setSetupContext,context,open,setOpen,mode,setMode,text,setText,messages,busy,error,send,apply,applied};
  return <Assistant.Provider value={value}>{children}</Assistant.Provider>;
}
export function useAssistant() { const value=useContext(Assistant); if(!value) throw new Error('AssistantProvider is required.'); return value; }
export function SetupContextBridge({context}:{context:AssistantContext}) {
  const value=useContext(Assistant), key=JSON.stringify(context);
  useEffect(()=>{value?.setSetupContext(context);return()=>value?.setSetupContext(null);},[key,value?.setSetupContext]);
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
  return <>
    {!a.open && <button className="wa-open" onClick={()=>a.setOpen(true)}>✦ Ask Platypus</button>}
    <aside className={`wa-rail ${a.open?'wa-visible':''}`} style={{width}} aria-label="Ask Platypus">
      <header><div><strong>Ask Platypus</strong><small>{a.context.screen} · Connected to your workspace</small></div><button aria-label="Close assistant" onClick={()=>a.setOpen(false)}>×</button></header>
      <label className="wa-width">Panel width<input aria-label="Assistant panel width" type="range" min="290" max="480" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label>
      {a.setupMounted && <div className="wa-modes"><button aria-pressed={a.mode==='setup'} onClick={()=>a.setMode('setup')}>Setup assistant</button><button aria-pressed={a.mode==='workspace'} onClick={()=>a.setMode('workspace')}>Workspace assistant</button></div>}
      <div className="wa-setup" hidden={!a.setupMounted||a.mode!=='setup'} ref={a.setPortalTarget}/>
      {(!a.setupMounted||a.mode==='workspace') && <div className="wa-workspace">
        <p className="wa-note">Ask a question, create an activity, or describe a change. Review proposed changes before applying them.</p>
        <div className="wa-messages" aria-live="polite">{a.messages.map(m=><article key={m.id} className={'wa-message wa-'+m.role}><small>{m.role==='user'?'You':'Platypus'}</small><p>{m.text}</p>{m.answer?.question&&<p>{m.answer.question}</p>}{m.answer?.actions.map((action,i)=><div className="wa-action" key={i}><strong>{action.title}</strong>{action.kind==='organization'&&<small>Organization draft · confirmation required</small>}<button disabled={a.busy||!!a.applied[m.id+':'+i]} onClick={()=>void a.apply(m.id,action,i)}>{a.applied[m.id+':'+i]|| (action.kind==='create'?'Open creation form':action.kind==='navigate'?'Open page':'Approve change')}</button></div>)}</article>)}</div>
        {a.error&&<p role="alert" className="wa-error">{a.error}</p>}
        <form onSubmit={e=>{e.preventDefault();void a.send();}}><label htmlFor="workspace-ask">Ask about your workspace</label><textarea id="workspace-ask" value={a.text} maxLength={2000} placeholder="Plan a member workshop, or adjust a task…" onChange={e=>a.setText(e.target.value)} disabled={a.busy}/><button type="submit" disabled={a.busy||!a.text.trim()}>{a.busy?'Preparing…':'Send →'}</button></form>
      </div>}
    </aside>
  </>;
}
