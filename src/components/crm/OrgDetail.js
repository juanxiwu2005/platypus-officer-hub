import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useStore } from "../../data/store";
import { Empty } from "../ui";
import { useRail } from "../rail/RailContext";
import { canEditOrg, canSeeContact, CONTACT_TYPES, timeline, visibleContacts } from "../../data/crm";
import { canLead } from "../../data/permissions";
import { Field, LogForm, TagsField, Timeline } from "./parts";
/** One organization in the right rail: details, its people, and everything logged against it. */
export function OrgDetail({ id }) {
    const { state, dispatch } = useStore();
    const rail = useRail();
    const [logging, setLogging] = useState(false);
    const o = state.organizations.find(x => x.id === id);
    if (!o)
        return _jsx(Empty, { children: "This organization was removed." });
    const edit = canEditOrg(state, o), people = visibleContacts(state).filter(c => c.organizationId === o.id);
    const patch = (p) => dispatch({ type: "updateOrganization", id: o.id, patch: p });
    const hidden = state.contacts.filter(c => c.organizationId === o.id && !canSeeContact(state, c)).length;
    const types = [...new Set([...CONTACT_TYPES, o.type])];
    const items = timeline(state, { organizationId: o.id }).filter(i => !i.contactId || state.contacts.some(c => c.id === i.contactId && canSeeContact(state, c)));
    return _jsxs("section", { className: "form-stack crm-detail", "aria-label": `Organization ${o.name}`, children: [_jsxs("div", { children: [_jsx("h2", { children: o.name }), _jsxs("p", { className: "small muted", children: [o.type, o.website ? ` · ${o.website}` : ""] })] }), _jsx("div", { className: "action-row", children: _jsx("button", { className: "btn btn-primary", onClick: () => setLogging(true), disabled: logging, children: "Log interaction" }) }), logging && _jsx(LogForm, { contactId: null, organizationId: o.id, onDone: () => setLogging(false) }), _jsx("h3", { children: "People" }), people.length
                ? _jsx("ul", { className: "mini-list", children: people.map(c => _jsx("li", { children: _jsxs("button", { type: "button", className: "row-btn", onClick: () => rail.show({ kind: "partner", id: c.id }), children: [_jsx("span", { children: c.name }), _jsx("span", { className: "small muted", children: c.title || c.relation })] }) }, c.id)) })
                : _jsx(Empty, { children: "No contacts yet." }), hidden > 0 && _jsxs("p", { className: "small muted", children: [hidden, " more visible to leads only."] }), _jsxs("details", { children: [_jsx("summary", { children: "Details" }), _jsxs("div", { className: "form-stack", children: [_jsx(Field, { label: "Name", value: o.name, disabled: !edit, max: 80, onSave: v => v.trim() && patch({ name: v }) }), _jsxs("label", { children: ["Type", _jsx("select", { disabled: !edit, value: o.type, onChange: e => patch({ type: e.target.value }), children: types.map(t => _jsx("option", { children: t }, t)) })] }), _jsx(Field, { label: "Website", value: o.website, disabled: !edit, max: 160, onSave: v => patch({ website: v }) }), _jsx(Field, { label: "Email", type: "email", value: o.email, disabled: !edit, onSave: v => patch({ email: v }), placeholder: "info@example.org" }), _jsx(Field, { label: "Phone", type: "tel", value: o.phone, disabled: !edit, max: 40, onSave: v => patch({ phone: v }) }), _jsx(Field, { label: "Address", value: o.address, disabled: !edit, max: 160, onSave: v => patch({ address: v }) }), _jsx(TagsField, { tags: o.tags, disabled: !edit, onSave: tags => patch({ tags }) }), _jsx(Field, { label: "Notes", value: o.notes, disabled: !edit, max: 1000, multiline: true, placeholder: "Lead time, prices, who to ask", onSave: v => patch({ notes: v }) })] })] }), _jsx("h3", { children: "Timeline" }), _jsx(Timeline, { items: items, contacts: state.contacts }), canLead(state) && _jsx("button", { className: "btn btn-quiet", disabled: people.length + hidden > 0, title: people.length + hidden > 0 ? "Move or delete its contacts first" : undefined, onClick: () => { dispatch({ type: "deleteOrganization", id: o.id }); rail.closeDetail(); }, children: "Delete organization" }), _jsx("p", { className: "small muted", children: "Shared with the club. Only the owner of one of its contacts or a lead can edit it." })] });
}
