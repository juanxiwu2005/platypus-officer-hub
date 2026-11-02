import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useViewer } from "../data/store";
import { PageHead } from "../components/Page";
import { useRail } from "../components/rail/RailContext";
import { canEditContact, contactTone, CONTACT_TYPES, daysSince, nextEvent, nextStep, orgName, STAGES, visibleContacts } from "../data/crm";
import { fmtShort } from "../lib/dates";
import { Empty, Hover } from "../components/ui";
import { useDragSort } from "../lib/dragSort";
export { PartnerDetail } from "../components/crm/ContactDetail";
const ORDER = { late: 0, warn: 1, good: 2 };
const VIEWS = [{ id: "people", label: "People" }, { id: "board", label: "Board" }, { id: "orgs", label: "Organizations" }];
const PRESETS = [{ id: "all", label: "All" }, { id: "mine", label: "Mine" }, { id: "overdue", label: "Overdue" }];
/** Club CRM: everyone can look people up and log what happened; the owner or a lead edits the profile. */
export default function Partners() {
    const { state, dispatch } = useStore();
    // Board: drag a card to another stage with a pointer (src/lib/dragSort.ts, same feel as the task board), or Alt + ← / → from the keyboard.
    // The stage menu on each card stays as the other way to do the same. Who may move a card is still canEditContact.
    const moveStage = (id, stage) => dispatch({ type: "updateContact", id, patch: { stage } });
    const dnd = useDragSort({
        onDrop: (id, t) => {
            const c = state.contacts.find(x => x.id === id);
            if (c && canEditContact(state, c) && c.stage !== t.dest)
                moveStage(id, t.dest);
        },
        onNudge: (id, direction) => {
            const c = state.contacts.find(x => x.id === id);
            if (!c || !canEditContact(state, c))
                return null;
            const to = STAGES[STAGES.findIndex(s => s.id === c.stage) + direction];
            if (!to)
                return null;
            moveStage(id, to.id);
            return `Moved ${c.name} to ${to.label}.`;
        },
    });
    const { person } = useViewer();
    const rail = useRail();
    const [view, setView] = useState("people");
    const [preset, setPreset] = useState("all");
    const [q, setQ] = useState("");
    const [type, setType] = useState("all");
    const [owner, setOwner] = useState("all");
    const [tag, setTag] = useState("all");
    const [adding, setAdding] = useState(null);
    // When a search or filter has hidden everything, the empty message offers the way back (DX-18).
    const contactFilters = q.trim() !== "" || type !== "all" || owner !== "all" || tag !== "all" || preset !== "all";
    const orgFilters = q.trim() !== "" || type !== "all" || tag !== "all";
    const clearFilters = () => { setQ(""); setType("all"); setOwner("all"); setTag("all"); setPreset("all"); };
    const [draft, setDraft] = useState({ name: "", organization: "", relation: "Vendor", ownerRoleId: person.roleId, orgType: "Vendor" });
    const all = visibleContacts(state);
    const types = [...new Set([...CONTACT_TYPES, ...all.map(c => c.relation)])].sort();
    const tags = [...new Set([...all.flatMap(c => c.tags), ...state.organizations.flatMap(o => o.tags)])].sort();
    const mine = (c) => state.roles.find(r => r.id === c.ownerRoleId)?.holderId === state.viewerId;
    const needle = q.toLowerCase().trim();
    const rows = all
        .filter(c => (type === "all" || c.relation === type) && (owner === "all" || c.ownerRoleId === owner) && (tag === "all" || c.tags.includes(tag))
        && (preset === "all" || (preset === "mine" ? mine(c) : contactTone(state, c) === "late"))
        && `${c.name} ${c.title} ${orgName(state, c.organizationId)} ${c.relation} ${c.email} ${c.tags.join(" ")}`.toLowerCase().includes(needle))
        .sort((a, b) => ORDER[contactTone(state, a)] - ORDER[contactTone(state, b)] || a.name.localeCompare(b.name));
    const orgs = state.organizations
        .filter(o => (type === "all" || o.type === type) && (tag === "all" || o.tags.includes(tag)) && `${o.name} ${o.type} ${o.tags.join(" ")}`.toLowerCase().includes(needle))
        .sort((a, b) => a.name.localeCompare(b.name));
    const submit = (e) => {
        e.preventDefault();
        if (adding === "org")
            dispatch({ type: "addOrganization", name: draft.name, orgType: draft.orgType });
        else
            dispatch({ type: "addContact", name: draft.name, organization: draft.organization, relation: draft.relation, ownerRoleId: draft.ownerRoleId, cadenceDays: 60 });
        setDraft({ ...draft, name: "", organization: "" });
        setAdding(null);
    };
    const addLabel = view === "orgs" ? "+ Add organization" : "+ Add contact";
    return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/partners", actions: _jsxs(_Fragment, { children: [_jsx("input", { className: "select", type: "search", placeholder: "Search", "aria-label": "Search partners", value: q, onChange: e => setQ(e.target.value) }), _jsxs("select", { className: "select", "aria-label": "Partner type", value: type, onChange: e => setType(e.target.value), children: [_jsx("option", { value: "all", children: "All types" }), types.map(t => _jsx("option", { children: t }, t))] })] }) }), _jsxs("div", { className: "crm-bar", children: [_jsx("div", { className: "crm-seg", role: "group", "aria-label": "View", children: VIEWS.map(v => _jsx("button", { type: "button", "aria-pressed": view === v.id, onClick: () => setView(v.id), children: v.label }, v.id)) }), view !== "orgs" && _jsx("div", { className: "crm-seg", role: "group", "aria-label": "Show", children: PRESETS.map(p => _jsx("button", { type: "button", "aria-pressed": preset === p.id, onClick: () => setPreset(p.id), children: p.label }, p.id)) }), view !== "orgs" && _jsxs("select", { className: "select", "aria-label": "Owner", value: owner, onChange: e => setOwner(e.target.value), children: [_jsx("option", { value: "all", children: "Any owner" }), state.roles.map(r => _jsx("option", { value: r.id, children: r.displayName }, r.id))] }), _jsxs("select", { className: "select", "aria-label": "Tag", value: tag, onChange: e => setTag(e.target.value), children: [_jsx("option", { value: "all", children: "Any tag" }), tags.map(t => _jsx("option", { children: t }, t))] })] }), view === "people" && _jsxs("section", { className: "card tbl-wrap", children: [_jsxs("table", { className: "tbl", "data-testid": "contacts", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "Stage" }), _jsx("th", { children: "Owner" }), _jsx("th", { children: "Last contact" }), _jsx("th", { children: "Next" }), _jsx("th", {})] }) }), _jsx("tbody", { children: rows.map(c => {
                                    const role = state.roles.find(r => r.id === c.ownerRoleId), d = daysSince(state, c), ev = nextEvent(state, c), step = nextStep(state, c.id);
                                    return _jsxs("tr", { children: [_jsx("td", { children: _jsxs("button", { type: "button", className: "row-btn", onClick: () => rail.show({ kind: "partner", id: c.id }), children: [_jsx("span", { children: c.name }), _jsx("span", { className: "small muted", children: [c.relation, orgName(state, c.organizationId)].filter(Boolean).join(" · ") })] }) }), _jsx("td", { className: "small", children: STAGES.find(s => s.id === c.stage)?.label }), _jsx("td", { className: "small", children: role?.displayName ?? "—" }), _jsx("td", { children: _jsx(Hover, { card: `Every ${c.cadenceDays} days`, children: _jsx("span", { className: `days ${contactTone(state, c)}`, children: d === null ? "Never" : `${d}d ago` }) }) }), _jsx("td", { className: "small", children: step ? _jsx(Hover, { card: step.nextStep, children: _jsx("span", { children: step.nextDue ? `Due ${fmtShort(step.nextDue)}` : "Next step" }) }) : ev ? _jsx(Link, { to: `/events?event=${encodeURIComponent(ev.id)}`, children: ev.name }) : "—" }), _jsx("td", { className: "num", children: _jsx("button", { type: "button", className: "btn small", disabled: !canEditContact(state, c), onClick: () => dispatch({ type: "contacted", id: c.id }), children: "Contacted today" }) })] }, c.id);
                                }) })] }), !rows.length && _jsx(Empty, { children: contactFilters ? _jsxs(_Fragment, { children: ["No contacts match. ", _jsx("button", { type: "button", className: "link", onClick: clearFilters, children: "Clear filters" })] }) : "No contacts yet." })] }), view === "board" && _jsxs(_Fragment, { children: [_jsx("div", { className: "crm-board", "data-testid": "crm-board", "data-drag-scroll": true, children: STAGES.map(col => {
                            const items = rows.filter(c => c.stage === col.id);
                            return _jsxs("section", { className: `crm-col${dnd.over?.dest === col.id && dnd.draggingId ? " over" : ""}`, "aria-label": `${col.label} (${items.length})`, "data-drop-col": col.id, children: [_jsxs("h3", { children: [_jsx(Hover, { card: col.hint, children: col.label }), " ", _jsx("span", { className: "muted small", children: items.length })] }), items.map(c => {
                                        const editable = canEditContact(state, c);
                                        return _jsxs("article", { className: `crm-card${dnd.draggingId === c.id ? " is-dragging" : ""}`, "data-testid": "crm-card", "data-editable": editable, ...(editable ? dnd.cardProps(c.id) : {}), children: [_jsxs("span", { role: "button", tabIndex: 0, className: "row-btn", onClick: () => rail.show({ kind: "partner", id: c.id }), onKeyDown: e => { if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        rail.show({ kind: "partner", id: c.id });
                                                    } }, children: [_jsx("span", { children: c.name }), _jsx("span", { className: "small muted", children: orgName(state, c.organizationId) || c.relation })] }), _jsxs("div", { className: "crm-card-foot", children: [_jsx("span", { className: `days ${contactTone(state, c)}`, children: daysSince(state, c) === null ? "Never" : `${daysSince(state, c)}d ago` }), _jsx("select", { "aria-label": `Move ${c.name} to stage`, disabled: !editable, value: c.stage, onChange: e => moveStage(c.id, e.target.value), children: STAGES.map(s => _jsx("option", { value: s.id, children: s.label }, s.id)) })] })] }, c.id);
                                    })] }, col.id);
                        }) }), _jsx("div", { className: "sr-only", "aria-live": "polite", "data-testid": "crm-announce", children: dnd.announce })] }), view === "orgs" && _jsxs("section", { className: "card tbl-wrap", children: [_jsxs("table", { className: "tbl", "data-testid": "orgs", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Name" }), _jsx("th", { children: "People" }), _jsx("th", { children: "Last contact" }), _jsx("th", { children: "Tags" })] }) }), _jsx("tbody", { children: orgs.map(o => {
                                    const people = all.filter(c => c.organizationId === o.id), last = people.map(c => c.lastContact).filter(Boolean).sort().pop();
                                    return _jsxs("tr", { children: [_jsx("td", { children: _jsxs("button", { type: "button", className: "row-btn", onClick: () => rail.show({ kind: "org", id: o.id }), children: [_jsx("span", { children: o.name }), _jsx("span", { className: "small muted", children: o.type })] }) }), _jsx("td", { className: "small", children: people.length }), _jsx("td", { className: "small", children: last ? fmtShort(last) : "—" }), _jsx("td", { children: o.tags.map(t => _jsx("span", { className: "tag-chip", children: t }, t)) })] }, o.id);
                                }) })] }), !orgs.length && _jsx(Empty, { children: orgFilters ? _jsxs(_Fragment, { children: ["No organizations match. ", _jsx("button", { type: "button", className: "link", onClick: clearFilters, children: "Clear filters" })] }) : "No organizations yet." })] }), adding
                ? _jsxs("form", { className: "add-row crm-add", onSubmit: submit, children: [_jsx("input", { required: true, autoFocus: true, placeholder: adding === "org" ? "Organization name" : "Name", "aria-label": adding === "org" ? "Organization name" : "Partner name", value: draft.name, maxLength: 80, onChange: e => setDraft({ ...draft, name: e.target.value }) }), adding === "person" && _jsx("input", { placeholder: "Organization", "aria-label": "Organization", value: draft.organization, maxLength: 80, onChange: e => setDraft({ ...draft, organization: e.target.value }) }), _jsx("select", { "aria-label": "Type", value: adding === "org" ? draft.orgType : draft.relation, onChange: e => setDraft(adding === "org" ? { ...draft, orgType: e.target.value } : { ...draft, relation: e.target.value }), children: CONTACT_TYPES.map(t => _jsx("option", { children: t }, t)) }), adding === "person" && _jsx("select", { "aria-label": "Owner role", value: draft.ownerRoleId, onChange: e => setDraft({ ...draft, ownerRoleId: e.target.value }), children: state.roles.map(r => _jsx("option", { value: r.id, children: r.displayName }, r.id)) }), _jsx("button", { className: "btn btn-primary small", type: "submit", children: "Add" }), _jsx("button", { type: "button", className: "btn btn-quiet small", onClick: () => setAdding(null), children: "Cancel" })] })
                : _jsx("button", { type: "button", className: "board-add-btn crm-add-btn", onClick: () => setAdding(view === "orgs" ? "org" : "person"), children: addLabel })] });
}
