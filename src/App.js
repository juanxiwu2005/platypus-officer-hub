import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OnboardingShell } from "./onboarding/shell/OnboardingShell";
import { ComingSoon } from "./onboarding/gate/ComingSoon";
import { OnboardingDraftProvider } from "./onboarding/draft";
import { Name } from "./onboarding/founder/Name";
import { Constitution } from "./onboarding/founder/Constitution";
import { Goals } from "./onboarding/founder/Goals";
import { Team as OnboardingTeam } from "./onboarding/founder/Team";
import { FirstEvent } from "./onboarding/founder/FirstEvent";
import { Confirm } from "./onboarding/founder/Confirm";
import { Invite } from "./onboarding/founder/Invite";
import { Invitation } from "./onboarding/member/Invitation";
import { You } from "./onboarding/member/You";
import { Reminders } from "./onboarding/member/Reminders";
import { BusyWeeks } from "./onboarding/member/BusyWeeks";
import { About } from "./onboarding/member/About";
import { Done } from "./onboarding/member/Done";
import { Welcome } from "./onboarding/gate/Welcome";
import { WelcomeGate } from "./onboarding/gate/WelcomeGate";
import { StartWalkthrough } from "./onboarding/gate/StartWalkthrough";
import { RouteLoading } from "./components/RouteLoading";
import Today from "./pages/Today";
// Keep Today and its interactions ready in the entry bundle. Other screens load on navigation.
const Events = lazy(() => import("./pages/Events"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Team = lazy(() => import("./pages/Team"));
const Handoff = lazy(() => import("./pages/Handoff"));
const Partners = lazy(() => import("./pages/Partners"));
const Rules = lazy(() => import("./pages/Rules"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));
const Officer = lazy(() => import("./pages/Officer"));
const Setup = lazy(() => import("./pages/Setup"));
const Join = lazy(() => import("./pages/Join"));
const PhaseOne = lazy(() => import("./phase1/PhaseOne"));
function screen(children, label, fullPage = false) {
    return _jsx(Suspense, { fallback: _jsx(RouteLoading, { label: label, fullPage: fullPage }), children: children });
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsxs(Route, { path: "welcome", element: _jsx(OnboardingDraftProvider, { children: _jsx(OnboardingShell, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Welcome, {}) }), _jsx(Route, { path: "start", element: _jsx(StartWalkthrough, {}) }), _jsx(Route, { path: "classic", element: screen(_jsx(Setup, {}), "Preparing organization setup…", true) }), _jsx(Route, { path: "classic-join", element: screen(_jsx(Join, {}), "Preparing your invitation…", true) }), _jsx(Route, { path: "founder/name", element: _jsx(Name, {}) }), _jsx(Route, { path: "founder/constitution", element: _jsx(Constitution, {}) }), _jsx(Route, { path: "founder/goals", element: _jsx(Goals, {}) }), _jsx(Route, { path: "founder/team", element: _jsx(OnboardingTeam, {}) }), _jsx(Route, { path: "founder/first-event", element: _jsx(FirstEvent, {}) }), _jsx(Route, { path: "founder/confirm", element: _jsx(Confirm, {}) }), _jsx(Route, { path: "founder/invite", element: _jsx(Invite, {}) }), _jsx(Route, { path: "member/invitation", element: _jsx(Invitation, {}) }), _jsx(Route, { path: "member/you", element: _jsx(You, {}) }), _jsx(Route, { path: "member/reminders", element: _jsx(Reminders, {}) }), _jsx(Route, { path: "member/busy-weeks", element: _jsx(BusyWeeks, {}) }), _jsx(Route, { path: "member/about", element: _jsx(About, {}) }), _jsx(Route, { path: "member/done", element: _jsx(Done, {}) }), _jsx(Route, { path: "*", element: _jsx(ComingSoon, {}) })] }), _jsx(Route, { path: "phase1/*", element: screen(_jsx(PhaseOne, {}), "Opening your workspace…", true) }), _jsx(Route, { path: "officer", element: screen(_jsx(Officer, {}), "Opening your task…", true) }), _jsx(Route, { path: "join", element: screen(_jsx(Join, {}), "Preparing your invitation…", true) }), _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(WelcomeGate, { children: _jsx(Today, {}) }) }), _jsx(Route, { path: "events", element: screen(_jsx(Events, {}), "Loading events…") }), _jsx(Route, { path: "tasks", element: screen(_jsx(Tasks, {}), "Loading tasks…") }), _jsx(Route, { path: "team", element: screen(_jsx(Team, {}), "Loading your team…") }), _jsx(Route, { path: "funding", element: _jsx(Navigate, { to: "/events", replace: true }) }), _jsx(Route, { path: "handoff", element: screen(_jsx(Handoff, {}), "Loading handoff…") }), _jsx(Route, { path: "partners", element: screen(_jsx(Partners, {}), "Loading partners…") }), _jsx(Route, { path: "rules", element: screen(_jsx(Rules, {}), "Loading rules…") }), _jsx(Route, { path: "settings", element: screen(_jsx(Settings, {}), "Loading settings…") }), _jsx(Route, { path: "setup", element: screen(_jsx(Setup, {}), "Preparing organization setup…") }), _jsx(Route, { path: "help", element: screen(_jsx(Help, {}), "Loading help…") }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] })] }));
}
