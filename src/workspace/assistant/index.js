import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../organization/client';
import './assistant.css';
import { routeAssistantContext } from './routeContext';
const Assistant = createContext(null);
const uid = () => crypto.randomUUID();
async function finishJob(job) {
    let result = job;
    if (job.status === 'queued')
        await api('/api/workspace/assistant-run', { jobId: job.jobId });
    const deadline = Date.now() + 10 * 60 * 1000;
    while (result.status === 'queued' || result.status === 'running') {
        if (Date.now() > deadline)
            throw new Error('AI has not finished. Your data is unchanged. Reload to check this same request.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        result = await api('/api/workspace/assistant?jobId=' + encodeURIComponent(job.jobId));
    }
    if (result.status === 'error' || !result.answer)
        throw new Error(result.message || 'The assistant could not finish. No changes were applied.');
    return result.answer;
}
export function AssistantProvider({ children }) {
    const location = useLocation(), navigate = useNavigate();
    const [portalTarget, setPortalTarget] = useState(null);
    const [setupMounted, setSetupMounted] = useState(false), [setupContext, setSetupContext] = useState(null);
    const [selection, setSelection] = useState(null);
    const [open, setOpen] = useState(() => typeof window === 'undefined' || (window.matchMedia?.('(min-width: 1001px)').matches ?? true)), [mode, setMode] = useState('setup');
    const [text, setText] = useState(''), [messages, setMessages] = useState([]);
    const [deep, setDeep] = useState(false), [savedSetupInput, setSavedSetupInput] = useState('');
    const setupFlush = useRef(null), consumedSetupInput = useRef(), storageKey = useRef('');
    const registerSetupFlush = useCallback((flush) => { setupFlush.current = flush; }, []);
    const recoverSetupInput = useCallback((value, onConsumed) => { if (value.trim()) {
        setSavedSetupInput(value);
        consumedSetupInput.current = onConsumed;
    } }, []);
    const restoreSetupInput = useCallback(() => { setText(v => v ? v + '\n' + savedSetupInput : savedSetupInput); setSavedSetupInput(''); consumedSetupInput.current?.(); }, [savedSetupInput]);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [applied, setApplied] = useState({});
    const active = useRef(true), inFlight = useRef(false), storageHealthy = useRef(true);
    useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
    useEffect(() => { let live = true; void api('/api/workspace').then(async (e) => { if (!live)
        return; const key = 'platypus.workspace.assistant.draft:' + e.state.workspaceId; if (storageKey.current === key)
        return; storageKey.current = key; let pending = null; try {
        const saved = sessionStorage.getItem(key);
        if (saved)
            setText(v => v || saved.slice(0, 2000));
        const raw = sessionStorage.getItem(key + ':pending');
        if (raw)
            pending = JSON.parse(raw);
    }
    catch { /* Current in-memory text remains visible. */ } if (pending && typeof pending.jobId === 'string' && typeof pending.prompt === 'string' && !inFlight.current) {
        inFlight.current = true;
        setBusy(true);
        const previous = pending;
        setMessages(m => [...m, { id: uid(), role: 'user', text: previous.prompt }]);
        try {
            const job = await api('/api/workspace/assistant?jobId=' + encodeURIComponent(previous.jobId));
            const answer = await finishJob(job);
            if (active.current) {
                setMessages(m => [...m, { id: uid(), role: 'assistant', text: answer.message, answer }]);
                setText(v => v === previous.prompt ? '' : v);
            }
            sessionStorage.removeItem(key + ':pending');
        }
        catch (error) {
            if (active.current)
                setError(error.message);
        }
        finally {
            inFlight.current = false;
            if (active.current)
                setBusy(false);
        }
    } }).catch(() => { }); return () => { live = false; }; }, [location.pathname]);
    useEffect(() => { if (!storageKey.current)
        return; try {
        if (text)
            sessionStorage.setItem(storageKey.current, text);
        else
            sessionStorage.removeItem(storageKey.current);
        storageHealthy.current = true;
    }
    catch {
        storageHealthy.current = false;
        if (text)
            setError('Your message is kept in this page, but browser draft recovery is unavailable. Copy it before refreshing.');
    } }, [text]);
    useEffect(() => { const protect = (event) => { if (text.trim() || busy) {
        event.preventDefault();
        event.returnValue = '';
    } }; window.addEventListener('beforeunload', protect); return () => window.removeEventListener('beforeunload', protect); }, [text, busy]);
    useEffect(() => { const beforeLeave = (event) => { if ((text.trim() || busy) && !storageHealthy.current) {
        event.preventDefault();
        setError('Your message could not be saved in this browser. Copy it or finish the request before leaving this workspace.');
    } }; window.addEventListener('platypus:before-workspace-leave', beforeLeave); return () => window.removeEventListener('platypus:before-workspace-leave', beforeLeave); }, [text, busy]);
    useEffect(() => {
        setSelection(null);
        if (!location.pathname.includes('/setup'))
            setMode('workspace');
    }, [location.pathname]);
    useEffect(() => {
        const select = (e) => setSelection(e.detail);
        const ask = (e) => { const d = e.detail; if (d?.text)
            setText(d.text); setOpen(true); setMode('workspace'); };
        window.addEventListener('platypus:assistant-context', select);
        window.addEventListener('platypus:ask', ask);
        return () => { window.removeEventListener('platypus:assistant-context', select); window.removeEventListener('platypus:ask', ask); };
    }, []);
    const context = useMemo(() => {
        if (location.pathname.includes('/setup') && setupContext)
            return setupContext;
        const route = routeAssistantContext(location.pathname, location.search);
        const selected = selection?.screen === route.screen && (!selection.workItemId || selection.workItemId === route.workItemId) ? selection : null;
        return { ...selected, ...route, ...(route.screen === 'work' ? { taskId: route.taskId } : {}) };
    }, [location.pathname, location.search, selection, setupContext]);
    const send = useCallback(async () => {
        if (!text.trim() || busy)
            return;
        const prompt = text.trim();
        inFlight.current = true;
        setBusy(true);
        setError('');
        setText('');
        setMessages(m => [...m, { id: uid(), role: 'user', text: prompt }]);
        const requestId = uid();
        try {
            await setupFlush.current?.();
            const current = await api('/api/workspace');
            const draftKey = 'platypus.workspace.assistant.draft:' + current.state.workspaceId;
            storageKey.current = draftKey;
            try {
                sessionStorage.setItem(draftKey, prompt);
                sessionStorage.setItem(draftKey + ':pending', JSON.stringify({ jobId: requestId, prompt }));
            }
            catch {
                storageHealthy.current = false;
            }
            const job = await api('/api/workspace/assistant', { action: 'ask', requestId, revision: current.state.revision, setupRevision: current.setupRevision, instruction: prompt, context: { ...context, workspaceId: current.state.workspaceId, revision: current.setupRevision }, deep, conversation: messages.slice(-8).map(m => ({ role: m.role, text: m.text })) });
            const answer = await finishJob(job);
            try {
                sessionStorage.removeItem(draftKey + ':pending');
                sessionStorage.removeItem(draftKey);
            }
            catch { /* No credentials or runtime state are cached. */ }
            if (active.current)
                setMessages(m => [...m, { id: uid(), role: 'assistant', text: answer.message, answer }]);
        }
        catch (e) {
            if (active.current) {
                setError(e.message);
                setText(v => v || prompt);
            }
        }
        finally {
            inFlight.current = false;
            if (active.current)
                setBusy(false);
        }
    }, [text, busy, context, messages, deep]);
    const apply = useCallback(async (messageId, action, index) => {
        const key = messageId + ':' + index;
        if (busy || applied[key])
            return;
        if (action.kind === 'navigate') {
            navigate(action.path);
            setApplied(v => ({ ...v, [key]: 'Opened' }));
            return;
        }
        if (action.kind === 'create') {
            navigate(action.input.kind === 'executive_work' ? '/phase1/board' : '/phase1/activities', { state: { createWork: action.input } });
            window.dispatchEvent(new CustomEvent('platypus:open-create', { detail: { kind: action.input.kind, prefill: action.input } }));
            setApplied(v => ({ ...v, [key]: 'Form opened · review and save there' }));
            return;
        }
        const message = messages.find(m => m.id === messageId);
        if (!message?.answer)
            return;
        setBusy(true);
        setError('');
        try {
            if (action.kind === 'organization')
                await setupFlush.current?.();
            else if (action.kind === 'command' && !window.dispatchEvent(new Event('platypus:before-workspace-leave', { cancelable: true })))
                return;
            await api('/api/workspace/assistant', { action: 'apply', requestId: uid(), jobId: message.answer.proposalId, actionIndex: index });
            setApplied(v => ({ ...v, [key]: action.kind === 'organization' ? 'Draft saved · confirm in Organization setup' : 'Applied' }));
            window.dispatchEvent(new Event('platypus:workspace-changed'));
            if (action.kind === 'organization')
                window.dispatchEvent(new Event('platypus:organization-changed'));
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    }, [applied, busy, messages, navigate]);
    const value = { portalTarget, setPortalTarget, setupMounted, setSetupMounted, setupContext, setSetupContext, context, open, setOpen, mode, setMode, text, setText, messages, busy, error, send, apply, applied, deep, setDeep, registerSetupFlush, recoverSetupInput, savedSetupInput, restoreSetupInput };
    return _jsx(Assistant.Provider, { value: value, children: children });
}
export function useAssistant() { const value = useContext(Assistant); if (!value)
    throw new Error('AssistantProvider is required.'); return value; }
export function SetupContextBridge({ context, beforeRequest, unsentInput, onInputConsumed }) {
    const value = useContext(Assistant), key = JSON.stringify(context);
    useEffect(() => { value?.setSetupContext(context); return () => value?.setSetupContext(null); }, [key, value?.setSetupContext]);
    const flush = useRef(beforeRequest);
    flush.current = beforeRequest;
    useEffect(() => { value?.registerSetupFlush(() => flush.current?.() ?? Promise.resolve()); return () => value?.registerSetupFlush(null); }, [value?.registerSetupFlush]);
    useEffect(() => { if (unsentInput)
        value?.recoverSetupInput(unsentInput, onInputConsumed); }, [unsentInput, value?.recoverSetupInput]);
    return null;
}
export function SetupAssistantPortal({ children }) {
    const value = useContext(Assistant), register = value?.setSetupMounted;
    useEffect(() => { register?.(true); return () => register?.(false); }, [register]);
    if (!value)
        return _jsx(_Fragment, { children: children });
    return value.portalTarget ? createPortal(children, value.portalTarget) : null;
}
export function AssistantRail() {
    const a = useAssistant();
    const [width, setWidth] = useState(330);
    const [history, setHistory] = useState(null), [historyError, setHistoryError] = useState('');
    const loadHistory = async () => { setHistoryError(''); try {
        const value = await api('/api/org/archive?action=history');
        setHistory(value.versions);
    }
    catch (e) {
        setHistoryError(e.message);
    } };
    return _jsxs(_Fragment, { children: [!a.open && _jsx("button", { className: "wa-open", onClick: () => a.setOpen(true), children: "\u2726 Ask Platypus" }), _jsxs("aside", { className: `wa-rail ${a.open ? 'wa-visible' : ''}`, style: { width }, "aria-label": "Ask Platypus", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("strong", { children: "Ask Platypus" }), _jsxs("small", { children: [{ constitution: 'Constitution', team: 'Your Team', responsibilities: 'Responsibilities', workflow: 'Activity Workflow', review: 'Review', home: 'Home', tasks: 'My Tasks', activities: 'Activities', board: 'Executive Board', work: 'Activity' }[a.context.screen] ?? 'Workspace', " \u00B7 Connected to your workspace"] })] }), _jsx("button", { "aria-label": "Close assistant", onClick: () => a.setOpen(false), children: "\u00D7" })] }), _jsxs("label", { className: "wa-width", children: ["Panel width", _jsx("input", { "aria-label": "Assistant panel width", type: "range", min: "290", max: "480", value: width, onChange: e => setWidth(Number(e.target.value)) })] }), _jsx("div", { className: "wa-setup", hidden: true, ref: a.setPortalTarget }), _jsxs("div", { className: "wa-workspace", children: [_jsx("p", { className: "wa-note", children: "Ask a question, create an activity, or describe a change. Review proposed changes before applying them." }), _jsx("div", { className: "wa-messages", "aria-live": "polite", children: a.messages.map(m => _jsxs("article", { className: 'wa-message wa-' + m.role, children: [_jsx("small", { children: m.role === 'user' ? 'You' : 'Platypus' }), _jsx("p", { children: m.text }), m.answer?.question && _jsx("p", { children: m.answer.question }), m.answer?.actions.map((action, i) => _jsxs("div", { className: "wa-action", children: [_jsx("strong", { children: action.title }), action.kind === 'organization' && _jsx("small", { children: "Organization draft \u00B7 confirmation required" }), _jsx("button", { disabled: a.busy || !!a.applied[m.id + ':' + i], onClick: () => void a.apply(m.id, action, i), children: a.applied[m.id + ':' + i] || (action.kind === 'create' ? 'Open creation form' : action.kind === 'navigate' ? 'Open page' : 'Approve change') })] }, i))] }, m.id)) }), _jsx("button", { type: "button", disabled: a.busy, onClick: () => void loadHistory(), children: "View configuration history" }), history && _jsxs("section", { "aria-label": "Configuration history", children: [_jsx("button", { type: "button", onClick: () => setHistory(null), children: "Close history" }), history.length ? [...history].reverse().map(v => _jsxs("div", { children: [_jsxs("small", { children: ["Revision ", v.revision, " \u00B7 ", v.organization.name] }), _jsxs("button", { type: "button", onClick: () => { a.setText('Use history revision ' + v.revision + ': ' + a.text); setHistory(null); }, children: ["Use revision ", v.revision] })] }, v.revision)) : _jsx("p", { children: "No previous configuration versions yet." })] }), historyError && _jsx("p", { role: "alert", children: historyError }), a.savedSetupInput && _jsx("button", { type: "button", onClick: a.restoreSetupInput, children: "Restore saved setup message" }), a.error && _jsx("p", { role: "alert", className: "wa-error", children: a.error }), _jsxs("form", { onSubmit: e => { e.preventDefault(); void a.send(); }, children: [_jsx("label", { htmlFor: "workspace-ask", children: "Ask about your workspace" }), _jsx("textarea", { id: "workspace-ask", value: a.text, maxLength: 2000, placeholder: "Plan a member workshop, or adjust a task\u2026", onChange: e => a.setText(e.target.value), disabled: a.busy }), _jsxs("label", { className: "wa-deep", children: [_jsx("input", { type: "checkbox", checked: a.deep, onChange: e => a.setDeep(e.target.checked), disabled: a.busy }), " Deeper review (slower)"] }), _jsx("button", { type: "submit", disabled: a.busy || !a.text.trim(), children: a.busy ? 'Preparing…' : 'Send →' })] })] })] })] });
}
