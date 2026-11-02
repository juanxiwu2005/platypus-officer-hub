import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore, useSchedule } from "../data/store";
import { PageHead } from "../components/Page";
import { Bts, BtsRow, BtsTr } from "../components/Bts";
import { MetroChart } from "../components/flow/MetroChart";
import { useRail } from "../components/rail/RailContext";
import { forecastFor } from "../engine/forecast";
import { daysBetween, fmtShort } from "../lib/dates";
import { topoOrder } from "../engine/schedule";
import { Avatar, Empty, Info, NodePill } from "../components/ui";
import { canLead } from "../data/changeReview";
import { SEVERITY_TONE, firstName, worstIssue } from "./helpers";
import { EventBudget } from "../components/EventBudget";
import { budgetTotal } from "../engine/eventBudget";
import { TaskTypeIcon } from "../components/TaskTypeIcon";
const VIEW_KEY = "platypus.v1.eventsView";
function initialView() {
    try {
        const v = window.localStorage.getItem(VIEW_KEY);
        if (v === "flow" || v === "list")
            return v;
    }
    catch { /* storage unavailable */ }
    return "flow";
}
const FOOD = { none: "No food", dining: "Sun Devil Dining", offsite: "Outside caterer", onsite: "Food made on site", tbd: "Food (how to be decided)" };
const FUNDING = { usg: "USG funding", college: "College funding", dues: "Dues", sponsor: "Sponsor", none: "No funding" };
export default function Events() {
    const { state, dispatch } = useStore();
    const sched = useSchedule();
    const rail = useRail();
    const [params, setParams] = useSearchParams();
    const [savedView, setViewState] = useState(initialView);
    const [editingFlow, setEditingFlow] = useState(false);
    const lead = canLead(state);
    const view = params.get("view") === "budget" ? "budget" : savedView;
    const forecast = forecastFor(state);
    const ev = state.events.find(e => e.id === params.get("event")) ?? state.events[0];
    const eventsByDate = useMemo(() => [...state.events].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)), [state.events]);
    const selected = rail.detail?.kind === "node" ? rail.detail.id : null;
    const chooseEvent = (eventId) => {
        const next = new URLSearchParams(params);
        next.set("event", eventId);
        setParams(next);
        rail.show({ kind: "event", eventId });
    };
    const setView = (v) => {
        setViewState(v);
        const next = new URLSearchParams(params);
        if (v === "budget")
            next.set("view", "budget");
        else
            next.delete("view");
        setParams(next, { replace: true });
        if (v !== "budget")
            try {
                window.localStorage.setItem(VIEW_KEY, v);
            }
            catch { /* storage unavailable */ }
    };
    const nodes = useMemo(() => state.nodes.filter(n => n.eventId === ev?.id), [state.nodes, ev?.id]);
    useEffect(() => { if (ev && params.get("event") && !state.events.some(e => e.id === params.get("event")))
        setParams({}, { replace: true }); }, [ev?.id]);
    if (!ev)
        return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/events" }), _jsx(Empty, { children: "No events yet. Ask Platypus to plan one." })] });
    const evIssues = sched.events[ev.id]?.issues ?? [];
    const done = nodes.filter(n => n.status === "done").length;
    const red = nodes.filter(n => n.status !== "done" && (worstIssue(sched.nodes[n.id]?.issues)?.severity === "error" || forecast.nodes[n.id]?.color === "red")).length;
    const ordered = topoOrder(nodes).order;
    return (_jsxs("div", { className: "events-layout", children: [state.events.length > 1 && _jsx("nav", { className: "event-nav", "aria-label": "Events", children: eventsByDate.map(e => _jsx("button", { type: "button", title: e.name, "aria-current": e.id === ev.id ? "page" : undefined, onClick: () => chooseEvent(e.id), children: e.name }, e.id)) }), _jsxs("div", { className: "events-content", children: [_jsx(PageHead, { path: "/events", actions: state.events.length > 1 && (_jsxs("label", { className: "event-picker", children: [_jsx("span", { className: "sr-only", children: "Choose an event" }), _jsx("select", { "aria-label": "Choose an event", value: ev.id, onChange: e => chooseEvent(e.target.value), children: eventsByDate.map(e => _jsx("option", { value: e.id, children: e.name }, e.id)) })] })) }), _jsxs("section", { className: "card event-head", "aria-labelledby": "ev-title", children: [_jsxs("div", { className: "event-head-row", children: [_jsx("h2", { id: "ev-title", children: ev.name }), _jsxs(Info, { children: [[ev.venue === "campus" ? "On campus" : "Off campus", FOOD[ev.food], FUNDING[ev.funding], ev.speaker ? "Guest speaker" : null, `About ${ev.headcount} people`].filter(Boolean).join(" · "), ".", ev.details ? ` ${ev.details}` : "", " Dates come from the rule engine; see Help."] }), _jsx("input", { type: "date", "aria-label": "Event date", value: ev.date, "data-testid": "event-date", onChange: e => /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && dispatch({ type: "updateEvent", id: ev.id, patch: { date: e.target.value } }) }), _jsx("span", { className: "spacer" }), _jsxs("div", { className: "stat-row", children: [_jsxs("div", { children: [_jsxs("b", { className: "num", children: ["$", budgetTotal(ev.budgetItems).toLocaleString()] }), _jsx("span", { children: "requested" })] }), _jsxs("div", { children: [_jsx("b", { className: "num", children: daysBetween(state.today, ev.date) }), _jsx("span", { children: "days left" })] }), _jsxs("div", { children: [_jsxs("b", { className: "num", children: [done, "/", nodes.length] }), _jsx("span", { children: "done" })] }), _jsxs("div", { className: red ? "late-text" : "", children: [_jsx("b", { className: "num", children: red }), _jsx("span", { children: "at risk" })] })] })] }), evIssues.length > 0 && _jsx("ul", { className: "issues", "data-testid": "event-issues", children: evIssues.map(i => _jsx("li", { className: `issue ${SEVERITY_TONE[i.severity]}`, children: i.text }, i.code)) }), _jsxs(BtsRow, { children: [_jsx(Bts, { label: "Data", children: "The event date is the one date a person sets. Every step date below is computed from it." }), _jsx(Bts, { label: "Rule engine", children: "Each step has an ASU deadline (where a rule sets one), a club deadline and a latest start day, worked out backwards from the event date. Warnings come from the same schedule." }), _jsx(Bts, { label: "Computed", children: "Days left = event date minus today (calendar days). At risk = steps with a schedule error or a red forecast." })] })] }), _jsxs("div", { className: "toolbar", children: [_jsxs("div", { className: "seg", role: "group", "aria-label": "View", children: [_jsx("button", { type: "button", "aria-pressed": view === "flow", onClick: () => setView("flow"), "data-testid": "view-flow", children: "Flow" }), _jsx("button", { type: "button", "aria-pressed": view === "list", onClick: () => setView("list"), "data-testid": "view-list", children: "List" }), _jsx("button", { type: "button", "aria-pressed": view === "budget", onClick: () => setView("budget"), "data-testid": "view-budget", children: "Budget" })] }), lead && view === "flow" && _jsx("button", { type: "button", className: "btn small", "aria-pressed": editingFlow, onClick: () => setEditingFlow(editing => !editing), "data-testid": "flow-edit-toggle", children: editingFlow ? "Done editing" : "Edit flow" })] }), view === "flow" && _jsxs(BtsRow, { children: [_jsx(Bts, { label: "Computed", children: "Each dot's place comes from its dates. Colour: done when finished; risk when its forecast is red; now when it has started or its start day is today or earlier; otherwise to do." }), _jsxs(Bts, { label: "Forecast", children: [Math.round((forecast.events[ev.id]?.probability ?? 0) * 100), "% of ", forecast.events[ev.id]?.runs.toLocaleString(), " simulated runs finish this event on time."] })] }), view === "flow" && _jsx("div", { className: "metro-fade", children: _jsx(MetroChart, { state: state, sched: sched, forecast: forecast, eventId: ev.id, selectedId: selected, onSelect: id => rail.show({ kind: "node", id }), canEdit: lead, editing: editingFlow, onEditingChange: setEditingFlow }, ev.id) }), view === "list" && _jsx("section", { className: "card tbl-wrap", "data-testid": "event-list", children: _jsxs("table", { className: "tbl", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Step" }), _jsx("th", { children: "Owner" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Start" }), _jsx("th", { children: "Due" }), _jsx("th", { children: "ASU" })] }) }), _jsx("tbody", { children: ordered.map(n => {
                                        const p = sched.nodes[n.id];
                                        const issue = worstIssue(p.issues);
                                        return [_jsxs("tr", { children: [_jsx("td", { children: _jsxs("button", { type: "button", className: `row-btn task-title ${issue?.severity === "error" ? "late-text" : ""}`, onClick: () => rail.show({ kind: "node", id: n.id }), "data-testid": `event-step-${n.id}`, title: issue?.text, children: [_jsx(TaskTypeIcon, { node: n }), _jsx("span", { children: n.title })] }) }), _jsx("td", { children: _jsxs("span", { className: "who", children: [_jsx(Avatar, { name: state.people.find(x => x.id === n.ownerId)?.name, size: "sm" }), firstName(state, n.ownerId)] }) }), _jsx("td", { children: _jsx(NodePill, { node: n, small: true }) }), _jsx("td", { className: "small num", children: fmtShort(p.latestStart) }), _jsx("td", { className: "small num", children: fmtShort(p.club) }), _jsx("td", { className: "small num", children: p.official ? `ASU ${fmtShort(p.official)}` : "" })] }, n.id), _jsxs(BtsTr, { cols: 6, children: [_jsx(Bts, { label: "Start", children: n.ownerId === state.viewerId ? p.explain.latestStart : "Working days before the club deadline, allowing for effort and private planning preferences; skips ASU nonworking days." }), _jsx(Bts, { label: "Due", children: p.explain.club }), _jsx(Bts, { label: "ASU", children: p.explain.official ?? "No ASU rule sets a deadline for this step." })] }, `${n.id}-bts`)];
                                    }) })] }) }), view === "budget" && _jsx(EventBudget, { event: ev })] })] }));
}
