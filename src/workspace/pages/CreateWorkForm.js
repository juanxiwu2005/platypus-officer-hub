import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateWorkInputSchema } from '../contracts';
import { useWorkspace, workspaceId } from '../client';
import { useUnsavedGuard } from './unsavedGuard';
import { useFormRecovery, creationRecoveryKey } from './formRecovery';
import { z } from 'zod';
import { FlowSchema } from '../../organization/schema';
const CreationInputSchema = z.object({ id: z.string().uuid(), kind: z.enum(['member_event', 'executive_work']), name: z.string().max(180), description: z.string().max(2000), date: z.string().max(10), ownerId: z.string().max(100), venue: z.enum(['campus', 'offcampus', 'unspecified']), source: z.enum(['none', 'usg', 'college', 'dues', 'sponsor']), category: z.enum(['food_service', 'speaker', 'other']), amount: z.string().max(30), flow: FlowSchema.optional() });
export default function CreateWorkForm({ prefill, close }) {
    const { envelope, mutate, mutating } = useWorkspace();
    const navigate = useNavigate();
    const [id, setId] = useState(workspaceId);
    const [kind, setKind] = useState(prefill.kind ?? 'member_event');
    const [name, setName] = useState(prefill.name ?? '');
    const [description, setDescription] = useState(prefill.description ?? '');
    const [date, setDate] = useState(''); // model prefill never supplies an effective date
    const [ownerId, setOwnerId] = useState(prefill.ownerId !== undefined ? (envelope?.state.members.some(member => member.id === prefill.ownerId) ? prefill.ownerId ?? '' : '') : envelope?.state.actorId ?? '');
    const [venue, setVenue] = useState(prefill.venue ?? (kind === 'member_event' ? 'campus' : 'unspecified'));
    const [source, setSource] = useState(prefill.fundingSource ?? 'none');
    const [category, setCategory] = useState(prefill.fundingCategory ?? 'other');
    const [amount, setAmount] = useState(prefill.requestedAmount !== undefined ? String(prefill.requestedAmount) : '');
    const [flow, setFlow] = useState(prefill.flow);
    const [error, setError] = useState('');
    const focus = useRef(null);
    const dialog = useRef(null);
    const dirty = !!(name.trim() || description.trim() || date || amount || source !== 'none' || flow);
    const guard = useUnsavedGuard(dirty, mutating, 'Leave this page with an unfinished creation form? A recovery copy is kept on this device.');
    const recovery = useFormRecovery(envelope ? creationRecoveryKey(envelope.state.workspaceId) : null, { id, kind, name, description, date, ownerId, venue, source, category, amount, flow }, dirty, CreationInputSchema, saved => { setId(saved.id); setKind(saved.kind); setName(saved.name); setDescription(saved.description); setDate(saved.date); setOwnerId(saved.ownerId); setVenue(saved.venue); setSource(saved.source); setCategory(saved.category); setAmount(saved.amount); setFlow(saved.flow); });
    const alreadyCreated = envelope?.state.workItems.find(item => item.id === id);
    useEffect(() => { focus.current?.focus(); }, []);
    const cancel = () => { if (mutating)
        return; if (dirty && !window.confirm('Discard this unfinished creation form?'))
        return; guard.markSaved(); recovery.clear(); close(); };
    const submit = async (e) => {
        e.preventDefault();
        setError('');
        const input = CreateWorkInputSchema.safeParse({ id, kind, name, description, date: date || null, ownerId: ownerId || null, venue, fundingSource: source, fundingCategory: category, requestedAmount: source === 'none' ? 0 : Number(amount), ...(flow ? { flow } : {}) });
        if (!input.success) {
            setError('Check the name, budget amount and workflow before creating this item.');
            return;
        }
        if (source !== 'none' && (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 0)) {
            setError('Enter the requested budget amount.');
            return;
        }
        try {
            await mutate({ type: 'work.create', input: input.data });
            guard.markSaved();
            recovery.clear();
            close();
            navigate(`/phase1/work/${id}`);
        }
        catch (e) {
            setError(e.message);
        }
    };
    return _jsx("div", { className: "aw-modal-backdrop", onClick: e => { if (e.currentTarget === e.target)
            cancel(); }, children: _jsxs("div", { className: "aw-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "aw-create-title", ref: dialog, onKeyDown: e => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel();
                }
                if (e.key !== 'Tab')
                    return;
                const controls = dialog.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]');
                if (!controls?.length)
                    return;
                const first = controls[0], last = controls[controls.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
                else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }, children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("span", { className: "aw-eyebrow", children: "NEW WORK" }), _jsx("h2", { id: "aw-create-title", children: kind === 'member_event' ? 'Create member activity' : 'Create board work' })] }), _jsx("button", { "aria-label": "Close creation form", disabled: mutating, onClick: cancel, children: "\u00D7" })] }), _jsx("form", { onSubmit: e => void submit(e), children: _jsxs("fieldset", { disabled: mutating, children: [_jsxs("label", { children: ["Work type", _jsxs("select", { value: kind, onChange: e => { setKind(e.target.value); setVenue(e.target.value === 'member_event' ? 'campus' : 'unspecified'); }, children: [_jsx("option", { value: "member_event", children: "Member activity" }), _jsx("option", { value: "executive_work", children: "Executive Board work" })] })] }), _jsxs("label", { children: ["Name", _jsx("input", { ref: focus, required: true, maxLength: 180, value: name, onChange: e => setName(e.target.value) })] }), _jsxs("label", { children: ["Purpose", _jsx("textarea", { maxLength: 2000, rows: 3, value: description, onChange: e => setDescription(e.target.value), placeholder: "What should this work accomplish?" })] }), _jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: [kind === 'member_event' ? 'Activity date' : 'Target date', _jsx("input", { type: "date", value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("label", { children: ["Work lead", _jsxs("select", { value: ownerId, onChange: e => setOwnerId(e.target.value), children: [_jsx("option", { value: "", children: "Assign later" }), envelope?.state.members.map(member => _jsx("option", { value: member.id, children: member.name }, member.id))] })] })] }), _jsx("p", { className: "aw-muted", children: "Dates can be added later. Task dates come from your workflow and timing rules." }), _jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Location", _jsxs("select", { value: venue, onChange: e => setVenue(e.target.value), children: [_jsx("option", { value: "campus", children: "ASU campus" }), _jsx("option", { value: "offcampus", children: "Off campus" }), _jsx("option", { value: "unspecified", children: "Not applicable / not decided" })] })] }), _jsxs("label", { children: ["Funding source", _jsxs("select", { value: source, onChange: e => setSource(e.target.value), children: [_jsx("option", { value: "none", children: "No funding needed" }), _jsx("option", { value: "usg", children: "USG" }), _jsx("option", { value: "college", children: "College" }), _jsx("option", { value: "dues", children: "Club funds" }), _jsx("option", { value: "sponsor", children: "Sponsor" })] })] })] }), source !== 'none' && _jsxs("div", { className: "aw-form-pair", children: [_jsxs("label", { children: ["Requested amount (USD)", _jsx("input", { type: "number", min: "0", max: "1000000", step: "0.01", required: true, value: amount, onChange: e => setAmount(e.target.value) })] }), _jsxs("label", { children: ["Funding category", _jsxs("select", { value: category, onChange: e => setCategory(e.target.value), children: [_jsx("option", { value: "other", children: "Other purchases" }), _jsx("option", { value: "food_service", children: "Food or services" }), _jsx("option", { value: "speaker", children: "Speaker or performer" })] })] })] }), flow ? _jsxs("details", { open: true, children: [_jsxs("summary", { children: ["Review proposed workflow \u00B7 ", flow.nodes.length, " steps"] }), _jsx("ol", { className: "aw-review-steps", children: flow.nodes.map(step => _jsxs("li", { children: [_jsx("strong", { children: step.title }), _jsx("span", { children: step.roleIds.map(roleId => envelope?.organization.roles.find(role => role.id === roleId)?.title ?? 'Needs role review').join(' · ') || 'Needs assignment' })] }, step.id)) })] }) : _jsx("p", { className: "aw-muted", children: kind === 'member_event' ? 'Uses your confirmed activity workflow. Tasks are assigned from your team’s role bindings.' : 'Starts a short board workflow you can adjust with the assistant.' }), recovery.notice && _jsx("p", { className: "aw-note", role: "status", children: recovery.notice }), alreadyCreated && _jsxs("p", { className: "aw-note", children: ["This work item is already saved. ", _jsx("button", { type: "button", onClick: () => { guard.markSaved(); recovery.clear(); close(); navigate(`/phase1/work/${alreadyCreated.id}`); }, children: "Open saved work" })] }), error && _jsx("p", { role: "alert", className: "aw-error", children: error }), _jsxs("footer", { children: [_jsx("button", { type: "button", onClick: cancel, children: "Cancel" }), _jsx("button", { className: "aw-primary", type: "submit", disabled: !!alreadyCreated, children: mutating ? 'Creating…' : 'Create and assign tasks' })] })] }) })] }) });
}
