import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSchedule, useStore, useViewer } from "../data/store";
import { PageHead } from "../components/Page";
import { Bts, BtsTr } from "../components/Bts";
import { useRail } from "../components/rail/RailContext";
import { FollowupPanel } from "../components/FollowupPanel";
import { daysBetween, fmtShort, fromISO, toISO } from "../lib/dates";
import { isInActionHorizon } from "../engine/team";
import { canMoveTask, byRank, addTaskNotice } from "../data/board";
import { useDragSort } from "../lib/dragSort";
import { Avatar, Empty, NodePill, useStatusStyles } from "../components/ui";
import { canLead } from "../data/changeReview";
import { TaskTypeIcon } from "../components/TaskTypeIcon";
const BOARD_STATUSES = ["unclaimed", "accepted", "in_progress", "waiting", "blocked", "done"];
/** The Tasks page is an action horizon, not the whole semester's project plan. */
export function isInTaskHorizon(node, today) {
    if (node.status === "done") {
        const day = fromISO(today);
        day.setDate(day.getDate() - ((day.getDay() + 6) % 7) - 7); // Monday of last week
        return (node.completedOn ?? node.lastUpdate ?? "") >= toISO(day);
    }
    return isInActionHorizon(node, today);
}
export default function Tasks() {
    const { state, dispatch } = useStore();
    const { person } = useViewer();
    const rail = useRail();
    const [params] = useSearchParams();
    const [view, setView] = useState("board");
    const [scope, setScope] = useState("mine");
    const [notice, setNotice] = useState("");
    const lead = canLead(state);
    const linked = params.get("node");
    useEffect(() => { if (linked && state.nodes.some(n => n.id === linked))
        rail.show({ kind: "task", id: linked, reply: params.get("reply") }); }, [linked, params.get("reply")]);
    useEffect(() => { if (!notice)
        return; const t = setTimeout(() => setNotice(""), 3200); return () => clearTimeout(t); }, [notice]);
    // Every create path goes through here, so the card never lands somewhere without saying why (audit §6.4).
    const addTask = (title, status) => {
        if (!title.trim())
            return;
        setNotice(addTaskNotice(state, status) ?? "");
        dispatch({ type: "addTask", title, status });
    };
    // A teammate who is explicitly holding up a task sees it in To do as well as
    // receiving an Update. Ownership stays with the original task owner.
    const visible = state.nodes.filter(n => (scope === "team" || n.ownerId === person.id || n.waitingOnPersonId === person.id || (n.status === "unclaimed" && !n.ownerId)) && isInTaskHorizon(n, state.today));
    return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/tasks", actions: _jsxs(_Fragment, { children: [_jsx("div", { className: "seg", role: "group", "aria-label": "Task view", children: ["board", "table", "timeline"].map(v => _jsx("button", { type: "button", "aria-pressed": view === v, onClick: () => setView(v), children: v === "table" ? "Table" : v === "board" ? "Board" : "Timeline" }, v)) }), _jsxs("select", { className: "select", "aria-label": "Task scope", value: scope, onChange: e => setScope(e.target.value), children: [_jsx("option", { value: "mine", children: "My tasks" }), _jsx("option", { value: "team", children: "Team tasks" })] }), _jsx(NewTask, { onAdd: addTask })] }) }), notice && _jsx("p", { className: "board-notice", role: "status", children: notice }), view === "table" && _jsx(TaskTable, { nodes: visible, editable: lead, showOwner: scope === "team" }), view === "board" && _jsx(Board, { nodes: visible, onAdd: addTask, onNotice: setNotice }), view === "timeline" && _jsx(TaskTimeline, { nodes: visible.filter(n => n.status !== "done"), onSelect: n => rail.show({ kind: "task", id: n.id }) }), _jsx(FollowupPanel, {})] });
}
/** "+ New task" in the page head: visible in all three views, open to every role (addBoardTask checks none). */
function NewTask({ onAdd }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const close = () => { setTitle(""); setOpen(false); };
    if (!open)
        return _jsx("button", { type: "button", className: "btn btn-primary", "data-testid": "new-task", onClick: () => { setTitle(""); setOpen(true); }, children: "+ New task" });
    return _jsxs("form", { className: "board-add", "data-testid": "new-task-form", onSubmit: e => { e.preventDefault(); onAdd(title, "accepted"); close(); }, children: [_jsx("input", { autoFocus: true, value: title, maxLength: 100, placeholder: "Task name", "aria-label": "New task name", onChange: e => setTitle(e.target.value) }), _jsx("button", { className: "btn small btn-primary", type: "submit", children: "Add" }), _jsx("button", { className: "btn small", type: "button", onClick: close, children: "Cancel" })] });
}
/** monday-style table grouped by event; owner and due date are edited right in the row. */
function TaskTable({ nodes, editable, showOwner }) {
    const { state, dispatch } = useStore();
    const sched = useSchedule();
    const rail = useRail();
    const [toggled, setToggled] = useState({});
    const open = nodes.filter(n => n.status !== "done").sort((a, b) => (a.latestStart ?? "9999").localeCompare(b.latestStart ?? "9999"));
    const groups = [...state.events.map(e => ({ id: e.id, name: e.name })), { id: "", name: "Club tasks" }].map(g => ({ ...g, rows: open.filter(n => (n.eventId ?? "") === g.id) })).filter(g => g.rows.length);
    // Groups whose work is all more than three weeks away start folded, like monday's collapsed groups.
    const folded = (g) => toggled[g.id] ?? g.rows.every(n => n.latestStart && daysBetween(state.today, n.latestStart) > 21);
    const cols = showOwner ? 4 : 3;
    return _jsxs("section", { className: "card tbl-wrap", "data-testid": "my-tasks", children: [_jsxs("table", { className: "tbl", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Task" }), showOwner && _jsx("th", { children: "Owner" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Due" })] }) }), _jsx("tbody", { children: groups.map(g => [
                            _jsx("tr", { className: "group", children: _jsx("td", { colSpan: cols, children: _jsxs("button", { type: "button", className: "group-btn", "aria-expanded": !folded(g), onClick: () => setToggled({ ...toggled, [g.id]: folded(g) ? false : true }), children: [_jsx("span", { className: "caret", "aria-hidden": "true", children: folded(g) ? "▸" : "▾" }), g.name, _jsx("span", { className: "count", children: g.rows.length })] }) }) }, `g-${g.id}`),
                            ...(folded(g) ? [] : g.rows).map(n => {
                                const late = n.clubDeadline && n.clubDeadline < state.today;
                                return [_jsxs("tr", { "data-testid": "task-card", children: [_jsx("td", { children: _jsxs("button", { type: "button", className: "row-btn task-title", onClick: () => rail.show({ kind: "task", id: n.id }), children: [_jsx(TaskTypeIcon, { node: n }), _jsx("span", { children: n.title })] }) }), showOwner && _jsx("td", { children: editable
                                                    ? _jsxs("span", { className: "who", children: [_jsx(Avatar, { name: state.people.find(p => p.id === n.ownerId)?.name, size: "sm" }), _jsxs("select", { "aria-label": `Owner of ${n.title}`, value: n.ownerId ?? "", onChange: e => dispatch({ type: "updateNode", id: n.id, patch: { ownerId: e.target.value || null } }), children: [_jsx("option", { value: "", children: "None" }), state.people.map(p => _jsx("option", { value: p.id, children: p.name.split(" ")[0] }, p.id))] })] })
                                                    : _jsxs("span", { className: "who", children: [_jsx(Avatar, { name: state.people.find(p => p.id === n.ownerId)?.name, size: "sm" }), state.people.find(p => p.id === n.ownerId)?.name.split(" ")[0] ?? ""] }) }), _jsx("td", { children: _jsx(NodePill, { node: n, small: true }) }), _jsx("td", { className: late ? "late-text" : "", children: editable && n.clubDeadline
                                                    ? _jsx("input", { type: "date", "aria-label": `Due date of ${n.title}`, value: n.clubDeadline, onChange: e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateNode", id: n.id, patch: { clubDeadlineOverride: e.target.value } }) })
                                                    : _jsx("span", { className: "small", children: n.clubDeadline ? fmtShort(n.clubDeadline) : "" }) })] }, n.id), _jsx(BtsTr, { cols: cols, children: _jsx(Bts, { label: "Rule engine", children: sched.nodes[n.id]?.explain.club }) }, `${n.id}-bts`)];
                            }),
                        ]) })] }), !open.length && _jsx(Empty, { children: "Nothing open." })] });
}
/** Board: drag a card to change its status or order; details handle explicit status updates. */
function Board({ nodes, onAdd, onNotice }) {
    const { state, dispatch } = useStore();
    const rail = useRail();
    const styles = useStatusStyles();
    const [adding, setAdding] = useState(null);
    const [title, setTitle] = useState("");
    // An empty column folds into a narrow strip so the others have room (DX-16). These are the empty ones the person opened by hand.
    const [opened, setOpened] = useState(new Set());
    const toggleOpened = (st) => setOpened(prev => { const next = new Set(prev); if (next.has(st))
        next.delete(st);
    else
        next.add(st); return next; });
    const fields = state.org.board?.fields ?? ["owner", "due", "event", "tags"];
    const tags = state.org.board?.tags ?? [];
    /** Move a card, if the rules allow it (they say why if not). Returns whether it moved. */
    const move = (id, status, before) => {
        const n = state.nodes.find(x => x.id === id);
        if (!n)
            return false;
        const why = canMoveTask(state, n, status);
        if (why) {
            onNotice(why);
            return false;
        }
        dispatch({ type: "moveTask", nodeId: id, status, beforeId: before });
        return true;
    };
    const columnOf = (n) => n.status === "waiting" && n.waitingOnPersonId === state.viewerId && n.ownerId !== state.viewerId ? "accepted" : n.status;
    // Dragging with a pointer (and Alt + ← / → from the keyboard): see src/lib/dragSort.ts. Moving a card still goes through `move` above.
    const dnd = useDragSort({
        onDrop: (id, t) => { move(id, t.dest, t.before); },
        onNudge: (id, direction) => {
            const n = state.nodes.find(x => x.id === id);
            if (!n)
                return null;
            const to = BOARD_STATUSES[BOARD_STATUSES.indexOf(columnOf(n)) + direction];
            if (!to)
                return null;
            return move(id, to, null) ? `Moved “${n.title}” to ${styles[to].label}.` : null;
        },
    });
    const drag = dnd.draggingId;
    const over = dnd.over ? { status: dnd.over.dest, before: dnd.over.before } : null;
    return _jsxs(_Fragment, { children: [_jsx("div", { className: "board", "data-testid": "task-board", "data-drag-scroll": true, style: { "--drag-h": `${dnd.dragHeight}px` }, children: BOARD_STATUSES.map(st => {
                    const statusForViewer = (n) => n.status === "waiting" && n.waitingOnPersonId === state.viewerId && n.ownerId !== state.viewerId ? "accepted" : n.status;
                    const cards = nodes.filter(n => statusForViewer(n) === st).sort(byRank);
                    // Folded: nothing in it, not opened by hand, no card resting over it, and nobody typing a new task into it.
                    const folded = cards.length === 0 && !opened.has(st) && dnd.dwell !== st && adding !== st;
                    // Where a dragged card would go in this column: the cards from there on move down to make room.
                    const insertAt = over?.status === st ? (over.before ? cards.findIndex(c => c.id === over.before) : cards.length) : -1;
                    return _jsxs("section", { className: `board-col ${over?.status === st ? "over" : ""} ${folded ? "is-folded" : ""}`, "aria-label": styles[st].label, "data-drop-col": st, children: [_jsxs("header", { style: { "--pill": styles[st].color }, children: [_jsx("h2", { children: styles[st].label }), _jsx("span", { className: "count", children: cards.length })] }), cards.length === 0 && _jsx("button", { type: "button", className: "board-col-toggle", "aria-expanded": !folded, "aria-label": `${styles[st].label}, no tasks. ${folded ? "Show" : "Hide"} column`, onClick: () => toggleOpened(st) }), cards.map((n, index) => {
                                const ev = state.events.find(e => e.id === n.eventId);
                                const late = n.status !== "done" && n.clubDeadline && n.clubDeadline < state.today;
                                const shifted = drag !== null && drag !== n.id && insertAt >= 0 && index >= insertAt;
                                return _jsxs("article", { className: `board-card ${drag === n.id ? "is-dragging" : ""} ${shifted ? "is-shifted" : ""}`, "data-testid": "board-card", ...dnd.cardProps(n.id), children: [_jsxs("span", { role: "button", tabIndex: 0, className: "row-btn board-title task-title", onClick: () => rail.show({ kind: "task", id: n.id }), onKeyDown: e => { if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                rail.show({ kind: "task", id: n.id });
                                            } }, children: [_jsx(TaskTypeIcon, { node: n }), _jsx("span", { children: n.title })] }), fields.includes("tags") && !!n.tags?.length && _jsx("div", { className: "tag-row", children: n.tags.map(id => { const t = tags.find(x => x.id === id); return t && _jsx("span", { className: "tag-chip", style: { "--tag": t.color }, children: t.label }, id); }) }), _jsxs("div", { className: "board-meta", children: [fields.includes("owner") && _jsx(Avatar, { name: state.people.find(p => p.id === n.ownerId)?.name, size: "sm" }), fields.includes("due") && n.clubDeadline && _jsx("span", { className: `small ${late ? "late-text" : "muted"}`, children: fmtShort(n.clubDeadline) }), ev && _jsx("span", { className: "small muted ev-name", children: ev.name }), n.status === "waiting" && n.waitingOnPersonId === state.viewerId && n.ownerId !== state.viewerId && _jsx("span", { className: "small wait-for-you", children: "Waiting on you" })] })] }, n.id);
                            }), adding === st
                                ? _jsxs("form", { className: "board-add", onSubmit: e => { e.preventDefault(); onAdd(title, st); setTitle(""); setAdding(null); }, children: [_jsx("input", { autoFocus: true, value: title, maxLength: 100, placeholder: "Task name", "aria-label": "New task name", onChange: e => setTitle(e.target.value), onBlur: () => { if (!title.trim())
                                                setAdding(null); } }), _jsx("button", { className: "btn small btn-primary", type: "submit", children: "Add" })] })
                                : _jsx("button", { type: "button", className: "board-add-btn", "aria-label": "+ Add task", onClick: () => { setAdding(st); setTitle(""); }, children: "+ Add task" })] }, st);
                }) }), _jsx("div", { className: "sr-only", "aria-live": "polite", "data-testid": "board-announce", children: dnd.announce })] });
}
function TaskTimeline({ nodes, onSelect }) {
    const starts = nodes.map(n => n.latestStart).filter((d) => !!d).sort();
    const ends = nodes.map(n => n.clubDeadline).filter((d) => !!d).sort();
    const from = starts[0], to = ends.at(-1);
    if (!from || !to)
        return _jsx("section", { className: "card", children: _jsx(Empty, { children: "No dated tasks in this view." }) });
    const span = Math.max(1, daysBetween(from, to) + 1);
    return _jsxs("section", { className: "card task-gantt", "data-testid": "task-gantt", children: [_jsxs("header", { children: [_jsx("h2", { children: "Timeline" }), _jsxs("span", { className: "small muted", children: [fmtShort(from), " \u2192 ", fmtShort(to)] })] }), nodes.sort((a, b) => (a.latestStart ?? "").localeCompare(b.latestStart ?? "")).map(n => _jsxs("div", { className: "task-gantt-row", children: [_jsxs("button", { className: "row-btn small task-title", onClick: () => onSelect(n), children: [_jsx(TaskTypeIcon, { node: n }), _jsx("span", { children: n.title })] }), _jsx("div", { className: "task-gantt-track", children: n.latestStart && n.clubDeadline && _jsx("button", { className: "task-gantt-bar", style: { left: `${daysBetween(from, n.latestStart) / span * 100}%`, width: `${Math.max(1, (daysBetween(n.latestStart, n.clubDeadline) + 1) / span * 100)}%` }, "aria-label": `${n.title}: ${fmtShort(n.latestStart)} to ${fmtShort(n.clubDeadline)}`, onClick: () => onSelect(n) }) }), _jsx("span", { className: "small muted", children: n.clubDeadline ? fmtShort(n.clubDeadline) : "—" })] }, n.id))] });
}
