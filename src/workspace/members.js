import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useOptionalWorkspace } from './client';
import { MemberSchema } from './contracts';
/** Demonstration appointments, deliberately separate from real identity authentication. */
export default function MembersPanel({ roleOptions, beforeSave } = {}) {
    const workspace = useOptionalWorkspace();
    const [editing, setEditing] = useState(null), [name, setName] = useState(''), [roleIds, setRoleIds] = useState([]), [manager, setManager] = useState(false), [notice, setNotice] = useState('');
    const newId = useRef(crypto.randomUUID()), protectionFailed = useRef(false);
    const scope = workspace?.envelope?.state.workspaceId;
    const recoveryKey = scope ? 'platypus.member-input.' + scope : null;
    useEffect(() => {
        setEditing(null);
        setName('');
        setRoleIds([]);
        setManager(false);
        if (!recoveryKey)
            return;
        try {
            const raw = localStorage.getItem(recoveryKey);
            if (!raw)
                return;
            const saved = JSON.parse(raw);
            if (typeof saved.name !== 'string' || saved.name.length > 100 || !Array.isArray(saved.roleIds) || !saved.roleIds.every(id => typeof id === 'string'))
                return;
            setName(saved.name);
            setRoleIds(saved.roleIds);
            setManager(saved.manager === true);
            if (saved.editing) {
                const member = MemberSchema.safeParse(saved.editing);
                if (member.success)
                    setEditing(member.data);
            }
            if (typeof saved.newId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(saved.newId))
                newId.current = saved.newId;
        }
        catch {
            setNotice('Your member input could not be restored. Saved members are unchanged.');
        }
    }, [recoveryKey]);
    useEffect(() => {
        const protect = (event) => {
            if (!protectionFailed.current || (!name && !roleIds.length))
                return;
            try {
                if (recoveryKey)
                    localStorage.setItem(recoveryKey, JSON.stringify({ editing, name, roleIds, manager, newId: newId.current }));
                protectionFailed.current = false;
            }
            catch {
                event.preventDefault();
                setNotice('Save or copy this member input before leaving; this device could not protect it.');
            }
        };
        window.addEventListener('platypus:before-workspace-leave', protect);
        const unload = (event) => { if (protectionFailed.current && (name || roleIds.length)) {
            event.preventDefault();
            event.returnValue = '';
        } };
        window.addEventListener('beforeunload', unload);
        return () => { window.removeEventListener('platypus:before-workspace-leave', protect); window.removeEventListener('beforeunload', unload); };
    }, [editing, name, roleIds, manager, recoveryKey]);
    const update = (patch) => {
        const next = { editing, name, roleIds, manager, ...patch, newId: newId.current };
        setEditing(next.editing);
        setName(next.name);
        setRoleIds(next.roleIds);
        setManager(next.manager);
        if (recoveryKey)
            try {
                localStorage.setItem(recoveryKey, JSON.stringify(next));
                protectionFailed.current = false;
            }
            catch {
                protectionFailed.current = true;
                setNotice('This member input could not be protected on this device. Save the member before leaving this chapter.');
            }
    };
    const clear = () => { protectionFailed.current = false; newId.current = crypto.randomUUID(); setEditing(null); setName(''); setRoleIds([]); setManager(false); if (recoveryKey)
        try {
            localStorage.removeItem(recoveryKey);
        }
        catch { /* Input stays in memory until a successful save. */ } };
    if (!workspace)
        return _jsx("p", { children: "Open this setup from your organization workspace to assign demo members." });
    const { envelope, loading, mutating, mutate, refresh } = workspace;
    if (!envelope)
        return _jsxs("section", { "aria-label": "Demo member assignments", children: [_jsx("p", { children: loading ? 'Loading member assignments…' : 'Start or reconnect your private workspace to assign demo members.' }), _jsx("button", { type: "button", onClick: () => void refresh(), children: "Reload assignments" })] });
    const { state, organization } = envelope;
    const roles = roleOptions ?? organization.roles;
    const actor = state.members.find(m => m.id === state.actorId);
    const canManage = !state.members.length || actor?.access === 'manager';
    const submit = async (e) => {
        e.preventDefault();
        setNotice('');
        try {
            await beforeSave?.();
            await mutate({ type: 'member.upsert', member: { id: editing?.id ?? newId.current, name: name.trim(), roleIds, access: !state.members.length || manager ? 'manager' : 'member', ...(editing?.busyWeeks ? { busyWeeks: editing.busyWeeks } : {}), ...(editing?.bufferDays !== undefined ? { bufferDays: editing.bufferDays } : {}) } });
            clear();
            setNotice('Demo appointments saved. These are test identities, not user accounts.');
        }
        catch (e) {
            setNotice(e.message);
        }
    };
    return _jsxs("section", { className: "workspace-members", "aria-label": "Demo member assignments", children: [_jsx("h2", { children: "Member assignments" }), _jsx("p", { children: "Use fictional names to try personal tasks. Demo identities do not sign anyone in." }), notice && _jsx("p", { role: "status", children: notice }), state.members.length > 0 && _jsxs("label", { children: ["Demo viewer", _jsxs("select", { "aria-label": "Demo viewer", disabled: mutating, value: state.actorId ?? '', onChange: e => void mutate({ type: 'actor.select', memberId: e.target.value }).catch(err => setNotice(err.message)), children: [_jsx("option", { value: "", disabled: true, children: "Choose a demo viewer" }), state.members.map(m => _jsxs("option", { value: m.id, children: [m.name, m.access === 'manager' ? ' · coordinator' : ''] }, m.id))] })] }), state.members.map(member => _jsxs("div", { className: "workspace-member", children: [_jsxs("div", { children: [_jsx("strong", { children: member.name }), _jsx("p", { children: member.roleIds.map(id => roles.find(r => r.id === id)?.title ?? 'Former role').join(' · ') || 'No position assigned' })] }), canManage && _jsx("button", { type: "button", disabled: mutating, onClick: () => update({ editing: member, name: member.name, roleIds: member.roleIds, manager: member.access === 'manager' }), children: "Edit member" })] }, member.id)), roles.filter(r => !state.members.some(m => m.roleIds.includes(r.id))).length > 0 && _jsxs("p", { children: ["Vacant positions: ", roles.filter(r => !state.members.some(m => m.roleIds.includes(r.id))).map(r => r.title).join(', '), "."] }), canManage && _jsxs("form", { onSubmit: e => void submit(e), children: [_jsxs("label", { children: ["Fictional member name", _jsx("input", { "aria-label": "Fictional member name", required: true, value: name, maxLength: 100, onChange: e => update({ name: e.target.value }) })] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Positions" }), roles.map(role => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: roleIds.includes(role.id), onChange: e => update({ roleIds: e.target.checked ? [...roleIds, role.id] : roleIds.filter(id => id !== role.id) }) }), role.title] }, role.id))] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: !state.members.length || manager, disabled: !state.members.length, onChange: e => update({ manager: e.target.checked }) }), "Demo coordinator \u00B7 manage this test workspace"] }), _jsx("button", { type: "submit", disabled: mutating || !name.trim(), children: mutating ? 'Saving…' : editing ? 'Save member' : 'Add demo member' }), editing && _jsx("button", { type: "button", onClick: clear, children: "Cancel" })] })] });
}
