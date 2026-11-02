import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WorkspaceProvider, useWorkspace } from './client';
import { AssistantProvider, AssistantRail } from './assistant';
import { UI_LABELS } from './contracts';
import { RouteLoading } from '../components/RouteLoading';
import { useSetupNavigationGuard } from '../organization/useSetupNavigationGuard';
import './shell.css';
const OnlineSetup = lazy(() => import('../organization/OnlineSetup'));
const WorkspacePages = lazy(() => import('./pages/WorkspacePages'));
function ShellBody() {
    const { envelope, loading, error, refresh, mutating, mutate } = useWorkspace();
    const location = useLocation(), main = useRef(null);
    const { pending } = useSetupNavigationGuard(async () => window.dispatchEvent(new Event("platypus:before-workspace-leave", { cancelable: true })));
    useEffect(() => { main.current?.focus(); void refresh(); }, [location.pathname, refresh]);
    useEffect(() => {
        const update = () => void refresh();
        window.addEventListener('platypus:organization-changed', update);
        return () => window.removeEventListener('platypus:organization-changed', update);
    }, [refresh]);
    const recent = [...(envelope?.state.workItems ?? [])].filter(w => w.kind === 'member_event').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
    return _jsxs("div", { className: "p1 live-workspace", children: [_jsx("a", { className: "p1-skip", href: "#live-main", onClick: e => { e.preventDefault(); main.current?.focus(); }, children: "Skip to content" }), _jsxs("aside", { className: "p1-sidebar", children: [_jsxs(Link, { className: "p1-brand", to: "/phase1", children: [_jsx("span", { className: "p1-brand-mark", children: "p\u00B7" }), "platypus", _jsx("span", { className: "p1-beta", children: "preview" })] }), _jsx("div", { className: "p1-org", children: _jsxs("div", { children: [_jsx("b", { children: envelope?.organization.name || 'Your organization' }), _jsx("span", { children: "Private test workspace" })] }) }), _jsxs("nav", { "aria-label": "Workspace navigation", children: [_jsx(NavLink, { to: "/phase1", end: true, children: UI_LABELS.home }), _jsx(NavLink, { to: "/phase1/tasks", children: UI_LABELS.tasks }), _jsx(NavLink, { to: "/phase1/activities", children: UI_LABELS.activities }), _jsx(NavLink, { to: "/phase1/setup", children: UI_LABELS.setup }), recent.length > 0 && _jsxs(_Fragment, { children: [_jsx("div", { className: "p1-nav-label", children: "RECENT ACTIVITIES" }), recent.map(item => _jsx(NavLink, { to: '/phase1/work/' + encodeURIComponent(item.id), children: item.name }, item.id)), _jsx(Link, { to: "/phase1/activities", children: "View all activities \u2192" })] })] }), _jsxs("div", { className: "p1-sidebar-bottom", children: [envelope && envelope.state.members.length > 0 && _jsxs("label", { className: "live-viewer", children: ["Demo viewer", _jsxs("select", { "aria-label": "Workspace demo viewer", value: envelope.state.actorId ?? '', disabled: mutating, onChange: e => void mutate({ type: 'actor.select', memberId: e.target.value }).catch(() => { }), children: [_jsx("option", { value: "", disabled: true, children: "Select demo identity" }), envelope.state.members.map(m => _jsx("option", { value: m.id, children: m.name }, m.id))] })] }), _jsx(Link, { to: "/", className: "p1-legacy", children: "Open legacy workspace" }), _jsx("small", { children: "Fictional test identities \u00B7 no real sign-in" })] })] }), _jsxs("div", { className: "p1-body live-body", children: [_jsxs("header", { className: "p1-topbar", children: [_jsxs("span", { children: ["Workspace / ", location.pathname.includes('setup') ? UI_LABELS.setup : location.pathname.includes('tasks') ? UI_LABELS.tasks : location.pathname.includes('activities') ? UI_LABELS.activities : location.pathname.includes('board') ? UI_LABELS.executiveBoard : location.pathname.includes('/work/') ? 'Activity' : UI_LABELS.home] }), (mutating || pending) && _jsx("span", { role: "status", children: "Saving\u2026" })] }), _jsxs("main", { id: "live-main", ref: main, tabIndex: -1, children: [error && !location.pathname.endsWith('/setup') && !envelope && _jsxs("section", { className: "live-error", role: "alert", children: [_jsx("p", { children: error }), _jsx(Link, { to: "/phase1/setup", children: "Open organization setup" }), _jsx("button", { onClick: () => void refresh(), children: "Retry connection" })] }), _jsx(Suspense, { fallback: _jsx(RouteLoading, { label: "Opening your workspace\u2026" }), children: _jsxs(Routes, { children: [_jsx(Route, { path: "setup", element: _jsx(OnlineSetup, {}) }), _jsx(Route, { path: "activity/member", element: _jsx(Navigate, { to: "/phase1/activities", replace: true }) }), _jsx(Route, { path: "activity/executive", element: _jsx(Navigate, { to: "/phase1/board", replace: true }) }), _jsx(Route, { path: "*", element: loading && !envelope ? _jsx(RouteLoading, { label: "Loading your workspace\u2026" }) : _jsx(WorkspacePages, {}) })] }) })] })] }), _jsx(AssistantRail, {})] });
}
export default function LiveWorkspaceShell() {
    return _jsx(WorkspaceProvider, { children: _jsx(AssistantProvider, { children: _jsx(ShellBody, {}) }) });
}
