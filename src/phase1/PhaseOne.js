import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, lazy, Suspense, useMemo, useRef, useState, } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, } from "react-router-dom";
import { CAPABILITIES, FICTIONAL_CONSTITUTION, makeDraft, } from "./model";
import { classify, confirmContext, conflicts, extract, makeSource, owner, resolveSuggestion, reviewSuggestion, setOwner, uncertainty, validateSuggestion, workflow, } from "./logic";
import { localPreviewRepository } from "./repository";
import { SERVER_STORAGE } from "./serverStorage";
import { RouteLoading } from "../components/RouteLoading";
import "./phase1.css";
import "./approvedWorkspace.css";
const LiveWorkspaceShell = lazy(() => import("../workspace/LiveWorkspaceShell"));
const OnlineSetup = lazy(() => import("../organization/OnlineSetup"));
const ApprovedWorkspace = lazy(() => import("./ApprovedWorkspace"));
function Icon({ name, size = 20 }) {
    const paths = {
        spark: (_jsxs(_Fragment, { children: [_jsx("path", { d: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" }), _jsx("path", { d: "m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5Z" })] })),
        home: (_jsxs(_Fragment, { children: [_jsx("path", { d: "m3 10 9-7 9 7v10H3Z" }), _jsx("path", { d: "M9 20v-7h6v7" })] })),
        activity: (_jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "3" }), _jsx("path", { d: "M7 3v4m10-4v4M3 11h18m-13 5h3" })] })),
        arrow: _jsx("path", { d: "M5 12h14m-6-6 6 6-6 6" }),
        up: _jsx("path", { d: "M12 19V5m-6 6 6-6 6 6" }),
        check: _jsx("path", { d: "m5 12 4 4L19 6" }),
        file: (_jsxs(_Fragment, { children: [_jsx("path", { d: "M14 3H5v18h14V8Z" }), _jsx("path", { d: "M14 3v5h5M8 12h8m-8 4h5" })] })),
        people: (_jsxs(_Fragment, { children: [_jsx("circle", { cx: "9", cy: "8", r: "3" }), _jsx("path", { d: "M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" })] })),
        back: _jsx("path", { d: "m14 5-7 7 7 7" }),
        external: (_jsxs(_Fragment, { children: [_jsx("path", { d: "M14 3h7v7m0-7L10 14" }), _jsx("path", { d: "M10 4H4v16h16v-6" })] })),
    };
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.65", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: paths[name] ?? paths.spark }));
}
const scopeLabel = (s) => s === "campus"
    ? "Campus organizations"
    : s === "companies"
        ? "Companies & sponsors"
        : "All relationships";
const capability = (id) => CAPABILITIES.find((c) => c.id === id)?.label ?? id;
const shortDate = (d) => d
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(d + "T12:00:00Z"))
    : "Not scheduled";
const principal = (d) => ({
    organizationId: d.organizationId,
    accountId: d.accountId,
    mayManage: true,
});
export default function PhaseOne() {
    const location = useLocation();
    const [example, setExample] = useState(() => new URLSearchParams(location.search).get('example') === '1' || location.pathname.endsWith('/setup-legacy'));
    useEffect(() => {
        if (new URLSearchParams(location.search).get('example') === '1' || location.pathname.endsWith('/setup-legacy'))
            setExample(true);
        else if (location.pathname.endsWith('/setup'))
            setExample(false);
    }, [location.pathname, location.search]);
    // Server storage hidden: only the local example, never the live workspace (it calls /api/workspace).
    if (example || !SERVER_STORAGE)
        return _jsx(PreviousPhaseOne, {});
    return _jsx(Suspense, { fallback: _jsx(RouteLoading, { label: "Opening your workspace\u2026", fullPage: true }), children: _jsx(LiveWorkspaceShell, {}) });
}
function PreviousPhaseOne() {
    const [scenario, setScenario] = useState("A");
    const [draft, setDraft] = useState(() => {
        try {
            return (localPreviewRepository(localStorage).read(principal(makeDraft())) ??
                makeDraft());
        }
        catch {
            return makeDraft();
        }
    });
    const [storageNote, setStorageNote] = useState("");
    const [active, setActive] = useState(() => {
        try {
            return localPreviewRepository(localStorage).readApproved(principal(draft));
        }
        catch {
            return null;
        }
    });
    const location = useLocation();
    const [exampleMode, setExampleMode] = useState(() => !SERVER_STORAGE || new URLSearchParams(location.search).get("example") === "1");
    const [remote, setRemote] = useState({ status: "loading", context: null });
    const [contextAttempt, setContextAttempt] = useState(0);
    useEffect(() => {
        if (!SERVER_STORAGE)
            return; // no confirmed online organization to load
        if (location.pathname.endsWith("/setup-legacy") || new URLSearchParams(location.search).get("example") === "1") {
            setExampleMode(true);
            return;
        }
        if (location.pathname.endsWith("/setup")) {
            setExampleMode(false);
            return;
        }
        if (exampleMode)
            return;
        const controller = new AbortController();
        setRemote({ status: "loading", context: null });
        void import("./approvedContext").then(({ readApprovedContext }) => readApprovedContext(controller.signal)).then(context => {
            if (!controller.signal.aborted)
                setRemote({ status: context ? "ready" : "absent", context });
        }).catch(error => {
            if (!controller.signal.aborted)
                setRemote({ status: "error", context: null, message: error.message });
        });
        return () => controller.abort();
    }, [location.pathname, location.search, exampleMode, contextAttempt]);
    const approved = !exampleMode && remote.status === "ready" ? remote.context : null;
    const workspace = (example) => {
        if (exampleMode)
            return _jsxs(_Fragment, { children: [_jsx("p", { className: "approved-context-notice", role: "note", children: "Previous example preview \u00B7 Changes here do not replace your confirmed online organization." }), example] });
        if (remote.status === "loading")
            return _jsx(RouteLoading, { label: "Loading your confirmed organization\u2026" });
        if (approved)
            return _jsx(Suspense, { fallback: _jsx(RouteLoading, { label: "Opening your workspace\u2026" }), children: _jsx(ApprovedWorkspace, { context: approved }) });
        return _jsxs("section", { className: "approved-context-notice", children: [_jsx("h1", { children: remote.status === "absent" ? "Confirm your organization" : "Workspace unavailable" }), _jsx("p", { children: remote.status === "absent" ? "Complete organization setup to use your team's confirmed roles and activity workflow." : remote.message }), _jsx(Link, { to: "/phase1/setup", children: "Open organization setup" }), " · ", _jsx(Link, { to: "/phase1?example=1", children: "Open previous example preview" }), remote.status === "error" && _jsx("button", { className: "approved-context-retry", onClick: () => setContextAttempt(n => n + 1), children: "Retry" })] });
    };
    const main = useRef(null);
    useEffect(() => {
        try {
            localPreviewRepository(localStorage).write(principal(draft), draft);
            setStorageNote("Saved on this device");
        }
        catch {
            setStorageNote("Could not save · keep this page open");
        }
    }, [draft]);
    useEffect(() => {
        main.current?.focus();
    }, [location.pathname]);
    const chooseScenario = (s) => {
        setExampleMode(true);
        setScenario(s);
        const fresh = makeDraft(s);
        let saved = null;
        try {
            saved = localPreviewRepository(localStorage).read(principal(fresh));
        }
        catch {
            /* in-memory demo */
        }
        setDraft(saved ?? fresh);
        try {
            setActive(localPreviewRepository(localStorage).readApproved(principal(fresh)));
        }
        catch {
            setActive(null);
        }
    };
    return (_jsxs("div", { className: "p1", children: [_jsx("a", { className: "p1-skip", href: "#p1-main", onClick: (e) => {
                    e.preventDefault();
                    main.current?.focus();
                    main.current?.scrollIntoView({ block: "start" });
                }, children: "Skip to content" }), _jsxs("aside", { className: "p1-sidebar", children: [_jsxs(Link, { className: "p1-brand", to: "/phase1", children: [_jsxs("span", { className: "p1-brand-mark", children: ["p", _jsx("span", { children: "\u00B7" })] }), "platypus", _jsx("span", { className: "p1-beta", children: "preview" })] }), _jsxs("div", { className: "p1-org", children: [_jsx("span", { className: "p1-avatar", children: approved ? approved.alwaysRead.organization.name.slice(0, 2).toUpperCase() : "DF" }), _jsxs("div", { children: [_jsx("b", { children: approved?.alwaysRead.organization.name ?? (exampleMode ? "Desert Founders" : "Your organization") }), _jsx("span", { children: approved ? `Confirmed · v${approved.contextVersion}` : exampleMode ? "Fictional example" : "Organization workspace" })] })] }), _jsxs("nav", { "aria-label": "Preview navigation", children: [_jsxs(NavLink, { to: "/phase1", end: true, children: [_jsx(Icon, { name: "home" }), "Home"] }), _jsxs(NavLink, { to: "/phase1/setup", children: [_jsx(Icon, { name: "people" }), "Organization setup", _jsx("span", { className: "p1-nav-dot" })] }), _jsx("div", { className: "p1-nav-label", children: "RECENT ACTIVITIES" }), _jsxs(NavLink, { to: "/phase1/activity/member", children: [_jsx(Icon, { name: "activity" }), approved?.onDemand.memberWorkflow.title ?? (exampleMode ? "Founder Connections" : "Activity workflow")] }), _jsxs(NavLink, { to: "/phase1/activity/executive", children: [_jsx(Icon, { name: "activity" }), approved || !exampleMode ? "Board work" : "Board Representatives"] })] }), _jsxs("div", { className: "p1-sidebar-bottom", children: [exampleMode && _jsxs("div", { className: "p1-scenario", children: [_jsx("label", { htmlFor: "p1-scenario", children: "Demo organization" }), _jsxs("select", { id: "p1-scenario", value: scenario, onChange: (e) => chooseScenario(e.target.value), children: [_jsx("option", { value: "A", children: "A \u00B7 Marketing owns outreach" }), _jsx("option", { value: "B", children: "B \u00B7 Split external relationships" })] })] }), _jsxs(Link, { to: "/", className: "p1-legacy", children: [_jsx(Icon, { name: "external", size: 16 }), "Open legacy workspace"] }), _jsxs("div", { className: "p1-user", children: [_jsx("span", { className: "p1-avatar p1-person", children: "JP" }), _jsxs("div", { children: [_jsx("b", { children: exampleMode ? "Jordan Parker" : "Your workspace" }), _jsx("span", { children: exampleMode ? "President · fictional" : "Private test session" })] })] })] })] }), _jsxs("div", { className: "p1-body", children: [_jsxs("header", { className: "p1-topbar", children: [_jsxs("span", { children: ["Workspace ", _jsx("span", { className: "p1-slash", children: "/" }), " ", location.pathname.includes("setup")
                                        ? "Organization setup"
                                        : location.pathname.includes("activity")
                                            ? "Activities"
                                            : "Home"] }), _jsx("span", { className: "p1-prototype", children: approved ? `Confirmed organization · v${approved.contextVersion}` : "Phase 1 · Interactive prototype" })] }), _jsx("main", { id: "p1-main", tabIndex: -1, ref: main, children: _jsxs(Routes, { children: [_jsx(Route, { path: "setup", element: SERVER_STORAGE ? (_jsx(Suspense, { fallback: _jsx(RouteLoading, { label: "Preparing organization setup\u2026" }), children: _jsx(OnlineSetup, {}) })) : (_jsx(Navigate, { to: "/phase1/setup-legacy", replace: true })) }), _jsx(Route, { index: true, element: workspace(_jsx(Home, { draft: draft, active: active })) }), _jsx(Route, { path: "setup-legacy", element: _jsx(Onboarding, { draft: draft, setDraft: setDraft, storageNote: storageNote, onConfirm: (d) => {
                                            setDraft(d);
                                            setActive(structuredClone(d));
                                            try {
                                                localPreviewRepository(localStorage).approve(principal(d), d);
                                            }
                                            catch {
                                                setStorageNote("Confirmed for this session · could not save");
                                            }
                                        } }) }), _jsx(Route, { path: "activity/:kind", element: workspace(_jsx(Workspace, { draft: active ?? makeDraft(scenario), active: !!active })) })] }) }), _jsxs("footer", { className: "p1-footer", children: [_jsx("span", { children: "Fictional data only" }), _jsx("span", { children: location.pathname.endsWith("/setup")
                                    ? "AI suggestions · Reviewed by you"
                                    : approved ? "Your confirmed team and workflow" : "Example previews do not change online settings" })] })] })] }));
}
function Composer({ onSubmit, compact = false, placeholder = "What would you like to make happen?", }) {
    const [text, setText] = useState("");
    function submit(e) {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text.trim());
            setText("");
        }
    }
    return (_jsxs("form", { className: `p1-composer ${compact ? "p1-composer-compact" : ""}`, onSubmit: submit, children: [_jsx("label", { className: "p1-sr", htmlFor: compact ? "p1-work-prompt" : "p1-home-prompt", children: "Your goal" }), _jsx("textarea", { id: compact ? "p1-work-prompt" : "p1-home-prompt", value: text, onChange: (e) => setText(e.target.value), maxLength: 500, placeholder: placeholder, rows: compact ? 1 : 3, onKeyDown: (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (text.trim()) {
                            onSubmit(text.trim());
                            setText("");
                        }
                    }
                } }), _jsxs("div", { className: "p1-composer-bottom", children: [_jsxs("span", { children: [_jsx(Icon, { name: "spark", size: 16 }), compact
                                ? "Ask about this activity"
                                : "Grounded in your organization"] }), _jsx("button", { type: "submit", className: "p1-send", "aria-label": "Submit goal", disabled: !text.trim(), children: _jsx(Icon, { name: "up" }) })] })] }));
}
function Home({ draft, active }) {
    const navigate = useNavigate();
    const [reply, setReply] = useState("");
    const [intent, setIntent] = useState(null);
    const send = (t) => {
        const kind = classify(t);
        setIntent(kind);
        setReply(kind
            ? `I’ll start with ${kind === "member_activity" ? "the member activity playbook" : "a short executive task chain"} and ${active ? "your confirmed organization context" : "the fictional example context"}. Review the workflow before anything is created.`
            : "Is this for your members or for the executive board?");
    };
    return (_jsxs("div", { className: "p1-home", children: [_jsxs("section", { className: "p1-hero", children: [_jsxs("div", { className: "p1-eyebrow", children: [_jsx(Icon, { name: "spark", size: 16 }), "YOUR ORGANIZATION, IN MOTION"] }), _jsxs("h1", { children: ["A little less coordinating.", _jsx("br", {}), _jsx("span", { children: "A lot more happening." })] }), _jsx("p", { children: "Tell Platypus the goal. Build the next steps together." }), _jsx(Composer, { onSubmit: send }), _jsxs("div", { className: "p1-prompt-chips", children: [_jsxs("button", { onClick: () => send("Plan a member networking workshop"), children: ["Plan a member activity ", _jsx(Icon, { name: "arrow", size: 16 })] }), _jsxs("button", { onClick: () => send("Coordinate board representatives for a school notice"), children: ["Handle a board obligation ", _jsx(Icon, { name: "arrow", size: 16 })] })] }), reply && (_jsxs("section", { className: "p1-reply", "aria-live": "polite", children: [_jsx(Icon, { name: "spark" }), _jsxs("div", { children: [_jsx("b", { children: "Here\u2019s a starting point" }), _jsx("p", { children: reply }), intent ? (_jsxs("button", { className: "p1-primary", onClick: () => navigate(`/phase1/activity/${intent === "member_activity" ? "member" : "executive"}`), children: ["Review workflow ", _jsx(Icon, { name: "arrow", size: 16 })] })) : (_jsxs("div", { className: "p1-actions", children: [_jsx("button", { onClick: () => setIntent("member_activity"), children: "Member activity" }), _jsx("button", { onClick: () => setIntent("executive_obligation"), children: "Board obligation" }), _jsx("button", { onClick: () => setIntent("member_activity"), children: "Not sure \u2014 use the suggested option" })] }))] })] }))] }), _jsxs("section", { className: "p1-home-grid", children: [_jsxs("div", { children: [_jsxs("div", { className: "p1-section-head", children: [_jsx("h2", { children: "Keep things moving" }), _jsx("span", { children: "2 activities" })] }), _jsxs(Link, { className: "p1-activity-card", to: "/phase1/activity/member", children: [_jsxs("div", { className: "p1-activity-top", children: [_jsxs("span", { className: "p1-type", children: [_jsx(Icon, { name: "activity" }), "Member activity"] }), _jsx("span", { className: "p1-status", children: "Planning" })] }), _jsx("h3", { children: "Founder Connections" }), _jsx("p", { children: "A thoughtful evening connecting students and founders." }), _jsx("div", { className: "p1-progress", children: _jsx("i", { style: { width: "25%" } }) }), _jsxs("div", { className: "p1-card-foot", children: [_jsxs("span", { children: [_jsx("span", { className: "p1-mini-avatar", children: "PD" }), "Programs Director"] }), _jsx(Icon, { name: "arrow", size: 18 })] })] }), _jsxs(Link, { className: "p1-activity-card p1-small-card", to: "/phase1/activity/executive", children: [_jsx("span", { className: "p1-icon-tile", children: _jsx(Icon, { name: "people" }) }), _jsxs("div", { children: [_jsx("span", { className: "p1-overline", children: "EXECUTIVE OBLIGATION" }), _jsx("h3", { children: "Board Representatives" }), _jsx("p", { children: "Confirm attendance for the school briefing." })] }), _jsx(Icon, { name: "arrow", size: 18 })] })] }), _jsxs("div", { className: "p1-home-side", children: [_jsxs("div", { className: "p1-section-head", children: [_jsx("h2", { children: "A moment of your attention" }), _jsx("span", { children: "1 item" })] }), _jsxs(Link, { className: "p1-attention", to: "/phase1/setup", children: [_jsx("span", { className: "p1-icon-tile", children: _jsx(Icon, { name: "people" }) }), _jsx("h3", { children: active
                                            ? "Review your organization context"
                                            : "Make this workspace yours" }), _jsx("p", { children: active
                                            ? `Context v${active.version} is confirmed. Review responsibilities whenever your team changes.`
                                            : "Confirm how your team works so the right work reaches the right role." }), _jsxs("span", { className: "p1-text-link", children: [active ? "Review organization" : "Continue organization setup", _jsx(Icon, { name: "arrow", size: 17 })] })] }), _jsxs("div", { className: "p1-context-note", children: [_jsx(Icon, { name: "check", size: 18 }), _jsxs("div", { children: [_jsx("b", { children: active
                                                    ? "Your confirmed context"
                                                    : "Example context · Organization " + draft.scenario }), _jsxs("p", { children: ["Company relationships \u2192", " ", owner(active ?? makeDraft(draft.scenario), "relationships", "companies") ?? "Needs confirmation"] }), _jsx("span", { children: active
                                                    ? "Used for these previews"
                                                    : "Confirm setup to use your own changes" })] })] })] })] })] }));
}
function Onboarding({ draft: d, setDraft, onConfirm, storageNote, }) {
    const [error, setError] = useState("");
    const [paste, setPaste] = useState("");
    const [showPaste, setShowPaste] = useState(false);
    const [roleName, setRoleName] = useState("");
    const [busy, setBusy] = useState(false);
    const [edit, setEdit] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editCap, setEditCap] = useState("planning");
    const navigate = useNavigate();
    const steps = [
        "Basics",
        "Constitution",
        "Roles",
        "Responsibilities",
        "Review",
    ];
    const pending = d.suggestions.filter((s) => s.decision === "pending").length;
    const conflict = conflicts(d)[0];
    const patch = (v) => setDraft({ ...d, ...v, confirmed: false });
    async function read(text, name) {
        setBusy(true);
        setError("");
        try {
            const source = await makeSource(text, name, d.organizationId);
            const suggestions = extract(source)
                .map((s) => validateSuggestion(s, source))
                .filter((s) => !!s);
            patch({
                source,
                suggestions,
                assignments: d.assignments.filter((a) => a.source !== "constitution"),
            });
            if (!suggestions.length)
                setError("No supported clauses found. Keep your manual roles or try the fictional example.");
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    }
    const next = () => {
        setError("");
        if (d.step === 0 && !d.name.trim()) {
            setError("Give your fictional organization a name.");
            return;
        }
        if (d.step === 2 &&
            (d.roles.some((r) => !r.title.trim()) ||
                new Set(d.roles.map((r) => r.title.trim().toLowerCase())).size !==
                    d.roles.length)) {
            setError("Give each role a distinct, non-empty title.");
            return;
        }
        if (d.step === 1 && pending) {
            setError("Accept or reject each suggestion, or skip this document.");
            return;
        }
        if (d.step === 3 && conflicts(d).length) {
            setError("Resolve the responsibility suggestion before continuing.");
            return;
        }
        patch({ step: Math.min(4, d.step + 1) });
    };
    const skip = () => {
        setError("");
        if (d.step === 1)
            patch({
                step: 2,
                source: null,
                suggestions: [],
                assignments: d.assignments.filter((a) => a.source !== "constitution"),
            });
        else
            patch({ step: Math.min(4, d.step + 1) });
    };
    return (_jsxs("div", { className: "p1-setup", children: [_jsxs("div", { className: "p1-setup-meta", children: [_jsxs(Link, { to: "/phase1", children: [_jsx(Icon, { name: "back", size: 16 }), "Back to home"] }), _jsx("span", { className: "p1-save-note", role: "status", children: storageNote })] }), _jsx("div", { className: "p1-step-track", "aria-label": "Setup progress", children: steps.map((s, i) => (_jsxs("span", { className: i <= d.step ? "p1-step-active" : "", "aria-current": i === d.step ? "step" : undefined, children: [_jsx("i", { children: i < d.step ? _jsx(Icon, { name: "check", size: 13 }) : i + 1 }), _jsx("span", { children: s })] }, s))) }), _jsxs("div", { className: "p1-setup-title", children: [_jsxs("div", { className: "p1-eyebrow", children: ["STEP ", d.step + 1, " OF 5"] }), _jsx("h1", { children: [
                            "Let’s get to know your organization.",
                            "Start with what’s already written.",
                            "Your team. Your role titles.",
                            "Give every responsibility a home.",
                            "Does this sound like your organization?",
                        ][d.step] }), _jsx("p", { children: [
                            "A few choices now. A more helpful workspace ahead.",
                            "Bring a fictional constitution. Review every suggestion.",
                            "Keep the titles your organization actually uses.",
                            "Start with the suggested map. Change only what needs changing.",
                            "Confirm this understanding before it guides your activities.",
                        ][d.step] })] }), _jsxs("section", { className: "p1-setup-card", children: [d.step === 0 && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "p1-field", children: ["Organization name", _jsx("input", { maxLength: 80, value: d.name, onChange: (e) => patch({ name: e.target.value }) })] }), _jsxs("fieldset", { className: "p1-choices", children: [_jsx("legend", { children: "What best describes your organization?" }), [
                                        "Professional development",
                                        "Community & social",
                                        "Service & volunteering",
                                    ].map((p, i) => (_jsxs("button", { "aria-pressed": d.profile === p, onClick: () => patch({
                                            profile: p,
                                            mission: i === 0
                                                ? "Help students build meaningful professional connections."
                                                : i === 1
                                                    ? "Create a welcoming community through shared experiences."
                                                    : "Help students make a positive difference through service.",
                                        }), children: [_jsx("span", { className: "p1-choice-letter", children: "ABC"[i] }), _jsx("b", { children: p }), d.profile === p && _jsx(Icon, { name: "check", size: 18 })] }, p)))] }), _jsx(ChoiceExtras, { suggested: () => patch({ profile: "Professional development" }), add: (value) => patch({ profile: value }) }), _jsxs("div", { className: "p1-soft-note", children: [_jsx(Icon, { name: "spark", size: 18 }), _jsxs("div", { children: [_jsx("b", { children: "A starting mission" }), _jsx("p", { children: d.mission })] })] }), _jsxs("details", { className: "p1-advanced", children: [_jsx("summary", { children: "Advanced \u00B7 mission & operating goal" }), _jsxs("label", { className: "p1-field", children: ["Mission", _jsx("textarea", { value: d.mission, maxLength: 300, onChange: (e) => patch({ mission: e.target.value }) })] }), _jsxs("label", { className: "p1-field", children: ["Primary operating goal", _jsx("input", { value: d.goal, maxLength: 150, onChange: (e) => patch({ goal: e.target.value }) })] })] })] })), d.step === 1 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p1-upload", children: [_jsx("span", { className: "p1-upload-icon", children: _jsx(Icon, { name: "file", size: 30 }) }), _jsx("h2", { children: "A head start, from your constitution" }), _jsx("p", { children: "Upload a fictional .txt or .md file, or try our example." }), _jsxs("label", { className: "p1-upload-label", children: ["Upload fictional constitution", _jsx("input", { type: "file", "aria-label": "Upload fictional constitution", accept: ".txt,.md,text/plain,text/markdown", disabled: busy, onChange: async (e) => {
                                                    const f = e.target.files?.[0];
                                                    e.target.value = "";
                                                    if (!f)
                                                        return;
                                                    if (f.size > 80000 || !/\.(txt|md)$/i.test(f.name)) {
                                                        setError("Choose a fictional .txt or .md file under 80 KB.");
                                                        return;
                                                    }
                                                    await read(await f.text(), f.name);
                                                } })] }), _jsx("button", { className: "p1-secondary", disabled: busy, onClick: () => void read(FICTIONAL_CONSTITUTION, "fictional-constitution.txt"), children: busy ? "Reading…" : "Use fictional example" }), _jsx("button", { className: "p1-plain", onClick: () => setShowPaste(!showPaste), children: "Paste fictional text instead" })] }), showPaste && (_jsxs("div", { className: "p1-paste", children: [_jsxs("label", { className: "p1-field", children: ["Fictional constitution text", _jsx("textarea", { value: paste, maxLength: 20000, rows: 5, onChange: (e) => setPaste(e.target.value) })] }), _jsx("button", { className: "p1-secondary", disabled: !paste.trim() || busy, onClick: () => void read(paste, "pasted-fictional-constitution.txt"), children: "Read pasted text" })] })), d.source && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p1-section-head", children: [_jsxs("div", { children: [_jsx("h2", { children: "Suggestions to review" }), _jsxs("span", { children: [pending, " remaining \u00B7 Local demo extraction"] })] }), _jsx(Icon, { name: "file" })] }), _jsxs("p", { className: "p1-source-name", children: [d.source.fileName, " \u00B7 Nothing becomes a fact automatically."] }), d.suggestions.map((s) => (_jsxs("article", { className: "p1-suggestion", children: [_jsxs("div", { className: "p1-suggestion-head", children: [_jsx("span", { className: "p1-mini-avatar", children: s.roleTitle
                                                            .split(" ")
                                                            .map((w) => w[0])
                                                            .slice(0, 2)
                                                            .join("") }), _jsxs("div", { children: [_jsx("b", { children: s.roleTitle }), _jsxs("p", { children: [capability(s.capabilityId), s.scope !== "all" ? " · " + scopeLabel(s.scope) : ""] })] }), _jsxs("span", { className: "p1-confidence", children: [Math.round(s.confidence * 100), "% confidence"] })] }), _jsxs("blockquote", { children: ["\u201C", s.quote, "\u201D"] }), _jsx("div", { className: "p1-actions", children: s.decision === "pending" ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => setDraft(reviewSuggestion(d, s.id, "accepted")), children: [_jsx(Icon, { name: "check", size: 16 }), "Accept"] }), _jsx("button", { onClick: () => {
                                                                setEdit(s.id);
                                                                setEditTitle(s.roleTitle);
                                                                setEditCap(s.capabilityId);
                                                            }, children: "Edit" }), _jsx("button", { onClick: () => setDraft(reviewSuggestion(d, s.id, "rejected")), children: "Reject" })] })) : (_jsxs(_Fragment, { children: [_jsxs("span", { children: [s.decision === "accepted"
                                                                    ? "Accepted · final mapping still needs review"
                                                                    : "Rejected", s.edited ? " · Edited" : ""] }), _jsx("button", { onClick: () => patch({
                                                                suggestions: d.suggestions.map((x) => x.id === s.id
                                                                    ? { ...x, decision: "pending" }
                                                                    : x),
                                                                assignments: d.assignments.filter((a) => !(a.source === "constitution" &&
                                                                    a.capabilityId === s.capabilityId &&
                                                                    a.scope === s.scope)),
                                                            }), children: "Review again" })] })) }), edit === s.id && (_jsxs("form", { className: "p1-inline-edit", onSubmit: (e) => {
                                                    e.preventDefault();
                                                    setDraft(reviewSuggestion(d, s.id, "accepted", editTitle, editCap));
                                                    setEdit(null);
                                                }, children: [_jsxs("label", { className: "p1-field", children: ["Suggested role title", _jsx("input", { value: editTitle, maxLength: 80, onChange: (e) => setEditTitle(e.target.value) })] }), _jsxs("label", { className: "p1-field", children: ["Suggested capability", _jsx("select", { value: editCap, onChange: (e) => setEditCap(e.target.value), children: CAPABILITIES.map((c) => (_jsx("option", { value: c.id, children: c.label }, c.id))) })] }), _jsx("button", { className: "p1-secondary", disabled: !editTitle.trim(), children: "Save edited suggestion" }), _jsx("button", { type: "button", onClick: () => setEdit(null), children: "Cancel" })] }))] }, s.id)))] }))] })), d.step === 2 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p1-soft-note", children: [_jsx(Icon, { name: "people" }), _jsx("p", { children: "Titles can be renamed. Each role can own several responsibilities." })] }), _jsx("div", { className: "p1-role-list", children: d.roles.map((r, i) => (_jsxs("div", { className: "p1-role-row", children: [_jsx("span", { className: "p1-mini-avatar", children: String(i + 1).padStart(2, "0") }), _jsxs("label", { className: "p1-sr", htmlFor: r.id, children: ["Role ", i + 1, " title"] }), _jsx("input", { id: r.id, value: r.title, maxLength: 80, onChange: (e) => patch({
                                                roles: d.roles.map((x) => x.id === r.id ? { ...x, title: e.target.value } : x),
                                            }) }), _jsxs("span", { children: [d.assignments.filter((a) => a.roleId === r.id &&
                                                    a.responsibility === "owner" &&
                                                    a.confirmedByUser).length, " ", "responsibilities"] })] }, r.id))) }), _jsxs("details", { className: "p1-advanced", children: [_jsx("summary", { children: "Add a custom role" }), _jsxs("form", { className: "p1-inline-edit", onSubmit: (e) => {
                                            e.preventDefault();
                                            if (!roleName.trim())
                                                return;
                                            if (d.roles.some((r) => r.title.toLowerCase() === roleName.trim().toLowerCase())) {
                                                setError("That role title already exists.");
                                                return;
                                            }
                                            patch({
                                                roles: [
                                                    ...d.roles,
                                                    { id: crypto.randomUUID(), title: roleName.trim() },
                                                ],
                                            });
                                            setRoleName("");
                                        }, children: [_jsxs("label", { className: "p1-field", children: ["New role title", _jsx("input", { value: roleName, maxLength: 80, onChange: (e) => setRoleName(e.target.value) })] }), _jsx("button", { className: "p1-secondary", disabled: !roleName.trim(), children: "Add role" })] })] })] })), d.step === 3 && (_jsx(_Fragment, { children: conflict ? (_jsxs("div", { className: "p1-conflict", children: [_jsx("span", { className: "p1-overline", children: "ONE DECISION TO CLEAR UP" }), _jsxs("h2", { children: ["Who should own", " ", conflict.assignment.scope === "all"
                                            ? capability(conflict.assignment.capabilityId).toLowerCase()
                                            : scopeLabel(conflict.assignment.scope).toLowerCase(), "?"] }), _jsx("p", { children: conflict.current
                                        ? `Your manual setting is ${conflict.current}. The constitution suggests ${conflict.suggested}.`
                                        : `The constitution suggests ${conflict.suggested}. Please confirm this responsibility.` }), _jsxs("div", { className: "p1-choices", children: [_jsxs("button", { onClick: () => setDraft(resolveSuggestion(d, conflict.assignment, false)), children: [_jsx("span", { className: "p1-choice-letter", children: "A" }), "Keep", " ", conflict.current ?? "the manual map"] }), _jsxs("button", { onClick: () => setDraft(resolveSuggestion(d, conflict.assignment, true)), children: [_jsx("span", { className: "p1-choice-letter", children: "B" }), "Use", " ", conflict.suggested] })] }), _jsx(ChoiceExtras, { suggested: () => setDraft(resolveSuggestion(d, conflict.assignment, false)), add: (title) => {
                                        const r = { id: crypto.randomUUID(), title };
                                        setDraft(setOwner(resolveSuggestion({ ...d, roles: [...d.roles, r] }, conflict.assignment, false), conflict.assignment.capabilityId, r.id, conflict.assignment.scope));
                                    } }), _jsx("p", { className: "p1-caption", children: "Your confirmed choice has priority. Other decisions wait until this one is resolved." })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p1-section-head", children: [_jsx("h2", { children: "Your responsibility map" }), _jsx("span", { children: "Click to adjust" })] }), _jsx("div", { className: "p1-map", children: CAPABILITIES.map((c) => (_jsxs("div", { className: "p1-map-row", children: [_jsx("span", { children: c.label }), _jsx("div", { children: c.id === "relationships" ? (["campus", "companies"].map((scope) => (_jsxs("label", { className: "p1-scope-select", children: [_jsx("span", { children: scopeLabel(scope) }), _jsxs("select", { "aria-label": `${scopeLabel(scope)} owner`, value: d.roles.find((r) => r.title === owner(d, c.id, scope))?.id ?? "", onChange: (e) => setDraft(setOwner(d, c.id, e.target.value, scope)), children: [_jsx("option", { value: "", children: "Needs confirmation" }), d.roles.map((r) => (_jsx("option", { value: r.id, children: r.title }, r.id)))] })] }, scope)))) : (_jsxs("select", { "aria-label": `${c.label} owner`, value: d.roles.find((r) => r.title === owner(d, c.id))
                                                        ?.id ?? "", onChange: (e) => setDraft(setOwner(d, c.id, e.target.value)), children: [_jsx("option", { value: "", children: "Needs confirmation" }), d.roles.map((r) => (_jsx("option", { value: r.id, children: r.title }, r.id)))] })) })] }, c.id))) }), _jsxs("fieldset", { className: "p1-preference", children: [_jsx("legend", { children: "How should plans move forward?" }), [
                                            "President reviews plans",
                                            "Owner drafts, president approves",
                                        ].map((p) => (_jsx("button", { "aria-pressed": d.preference === p, onClick: () => patch({ preference: p }), children: p }, p)))] }), _jsx(ChoiceExtras, { suggested: () => patch({ preference: "President reviews plans" }), add: (value) => patch({ preference: value }) }), _jsxs("details", { className: "p1-advanced", children: [_jsx("summary", { children: "Advanced \u00B7 approvers, support & detailed capabilities" }), _jsx("p", { className: "p1-caption", children: "These seven groups can grow or change later. No fixed eight-role limit." }), CAPABILITIES.map((c) => (_jsxs("div", { className: "p1-advanced-map", children: [_jsx("b", { children: c.label }), ["approver", "support", "informed"].map((resp) => (_jsxs("label", { children: [resp, _jsxs("select", { "aria-label": `${c.label} ${resp}`, value: d.assignments.find((a) => a.capabilityId === c.id &&
                                                                a.responsibility === resp &&
                                                                a.scope === "all" &&
                                                                a.confirmedByUser)?.roleId ?? "", onChange: (e) => e.target.value
                                                                ? setDraft(setOwner(d, c.id, e.target.value, "all", resp))
                                                                : patch({
                                                                    assignments: d.assignments.filter((a) => !(a.capabilityId === c.id &&
                                                                        a.responsibility === resp)),
                                                                }), children: [_jsx("option", { value: "", children: "None" }), d.roles.map((r) => (_jsx("option", { value: r.id, children: r.title }, r.id)))] })] }, resp)))] }, c.id)))] })] })) })), d.step === 4 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "p1-review-summary", children: [_jsx("span", { className: "p1-icon-tile", children: _jsx(Icon, { name: "spark", size: 26 }) }), _jsx("h2", { children: d.name }), _jsx("p", { children: d.mission }), _jsxs("span", { children: [d.profile, " \u00B7 ", d.preference] })] }), _jsx("div", { className: "p1-summary-roles", children: d.roles.map((r) => {
                                    const caps = [
                                        ...new Set(d.assignments
                                            .filter((a) => a.roleId === r.id &&
                                            a.responsibility === "owner" &&
                                            a.confirmedByUser)
                                            .map((a) => capability(a.capabilityId))),
                                    ];
                                    return caps.length ? (_jsxs("div", { children: [_jsx("b", { children: r.title }), _jsx("span", { children: caps.join(" · ") })] }, r.id)) : null;
                                }) }), _jsxs("div", { className: "p1-soft-note", children: [_jsx(Icon, { name: "check" }), _jsxs("div", { children: [_jsx("b", { children: conflicts(d).length || pending
                                                    ? "Some suggestions still need review"
                                                    : "Ready for your confirmation" }), _jsx("p", { children: CAPABILITIES.filter((c) => c.id !== "relationships" && !owner(d, c.id)).length
                                                    ? "Some responsibilities need an owner. The preview will ask before assigning that work."
                                                    : "Company relationships: " +
                                                        (owner(d, "relationships", "companies") ??
                                                            "Needs confirmation") +
                                                        ". Campus relationships: " +
                                                        (owner(d, "relationships", "campus") ??
                                                            "Needs confirmation") +
                                                        "." })] })] }), _jsxs("div", { className: "p1-example-grid", children: [_jsxs("div", { children: [_jsx("span", { className: "p1-overline", children: "MEMBER ACTIVITY" }), _jsx("h3", { children: "Founder Connections" }), _jsxs("p", { children: ["Standard playbook \u2192", " ", owner(d, "planning") ?? "Choose planning owner", " plans;", " ", owner(d, "relationships", "companies") ??
                                                        "Choose relationship owner", " ", "contacts founders."] })] }), _jsxs("div", { children: [_jsx("span", { className: "p1-overline", children: "EXECUTIVE OBLIGATION" }), _jsx("h3", { children: "Board Representatives" }), _jsxs("p", { children: ["Short task chain \u2192", " ", owner(d, "staffing") ?? "Choose staffing owner", " confirms representatives;", " ", owner(d, "documentation") ?? "Choose documentation owner", " ", "records evidence."] })] })] }), _jsx("p", { className: "p1-caption", children: "Only confirmed organization information guides future previews. Raw conversations and personal preferences stay out of handoff." })] }))] }, d.step), error && (_jsx("p", { className: "p1-error", role: "alert", children: error })), _jsxs("div", { className: "p1-setup-actions", children: [d.step > 0 ? (_jsxs("button", { className: "p1-plain", onClick: () => patch({ step: d.step - 1 }), children: [_jsx(Icon, { name: "back", size: 16 }), "Back"] })) : (_jsx("span", {})), _jsxs("div", { children: [d.step < 4 && (_jsx("button", { className: "p1-plain", onClick: skip, children: d.step === 1 ? "Skip constitution" : "Skip" })), d.step < 4 ? (_jsxs("button", { className: "p1-primary", onClick: next, children: ["Continue", _jsx(Icon, { name: "arrow", size: 17 })] })) : (_jsxs("button", { className: "p1-primary", disabled: !!pending ||
                                    !!conflicts(d).length ||
                                    !d.name.trim() ||
                                    d.roles.some((r) => !r.title.trim()), onClick: () => {
                                    const confirmed = confirmContext(d);
                                    if (!confirmed.confirmed) {
                                        setError("Review the remaining suggestions first.");
                                        return;
                                    }
                                    onConfirm(confirmed);
                                    navigate("/phase1");
                                }, children: ["Confirm organization", _jsx(Icon, { name: "check", size: 17 })] }))] })] }), _jsxs("p", { className: "p1-setup-foot", children: ["Set up at your pace. You can leave and resume on this device.", _jsx("br", {}), "Five minutes is a testing goal, not a measured result."] })] }));
}
function ChoiceExtras({ suggested, add, }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    return (_jsxs("div", { className: "p1-choice-extras", children: [_jsx("button", { className: "p1-plain", onClick: suggested, children: "Not sure \u2014 use the suggested option" }), _jsx("button", { className: "p1-plain", onClick: () => setOpen(!open), children: "+ Add another option" }), open && (_jsxs("form", { className: "p1-inline-edit", onSubmit: (e) => {
                    e.preventDefault();
                    if (value.trim()) {
                        add(value.trim());
                        setOpen(false);
                        setValue("");
                    }
                }, children: [_jsxs("label", { className: "p1-field", children: ["Your option", _jsx("input", { value: value, maxLength: 80, onChange: (e) => setValue(e.target.value) })] }), _jsx("button", { className: "p1-secondary", disabled: !value.trim(), children: "Use this option" })] }))] }));
}
function Workspace({ draft: d, active }) {
    const location = useLocation();
    const kind = location.pathname.endsWith("executive")
        ? "executive_obligation"
        : "member_activity";
    const isMember = kind === "member_activity";
    const tasks = useMemo(() => workflow(d, kind), [d, kind]);
    const [showAll, setShowAll] = useState(false);
    const [view, setView] = useState("list");
    const [selected, setSelected] = useState(null);
    const [status, setStatus] = useState({});
    const [review, setReview] = useState(false);
    const [approved, setApproved] = useState(false);
    const [reply, setReply] = useState("");
    const [clarify, setClarify] = useState(false);
    const [override, setOverride] = useState(null);
    useEffect(() => {
        setShowAll(false);
        setSelected(null);
        setReview(false);
        setApproved(false);
        setStatus({});
        setReply("");
        setClarify(false);
        setOverride(null);
    }, [kind, d.organizationId]);
    const visible = showAll ? tasks : tasks.slice(0, isMember ? 5 : 4);
    const current = tasks.find((t) => t.id === selected);
    const missing = uncertainty(d);
    return (_jsxs("div", { className: "p1-workspace", children: [_jsxs("div", { className: "p1-work-breadcrumb", children: [_jsx(Link, { to: "/phase1", children: "Home" }), _jsx("span", { children: "/" }), _jsx("span", { children: isMember ? "Member activity" : "Executive obligation" })] }), _jsx("div", { className: "p1-work-icon", children: _jsx(Icon, { name: isMember ? "activity" : "people", size: 32 }) }), _jsxs("div", { className: "p1-work-title", children: [_jsxs("div", { children: [_jsx("span", { className: "p1-overline", children: isMember ? "MEMBER ACTIVITY" : "EXECUTIVE OBLIGATION" }), _jsx("h1", { children: isMember ? "Founder Connections" : "Board Representatives" })] }), _jsx("button", { className: "p1-primary", onClick: () => setReview(true), disabled: approved, children: approved ? (_jsxs(_Fragment, { children: [_jsx(Icon, { name: "check", size: 17 }), "Approved preview"] })) : (_jsxs(_Fragment, { children: ["Review plan", _jsx(Icon, { name: "arrow", size: 17 })] })) })] }), _jsx("p", { className: "p1-work-goal", children: isMember
                    ? "Bring students and local founders together for practical conversations and new connections."
                    : "Confirm two executive board representatives for a fictional school briefing, then record completion." }), _jsxs("div", { className: "p1-properties", children: [_jsxs("div", { children: [_jsx("span", { children: "Owner" }), _jsxs("b", { children: [_jsx("span", { className: "p1-mini-avatar", children: isMember ? "PD" : "PR" }), owner(d, isMember ? "planning" : "compliance") ??
                                        "Needs confirmation"] })] }), _jsxs("div", { children: [_jsx("span", { children: "Status" }), _jsx("b", { children: _jsx("span", { className: "p1-status", children: approved ? "Ready to start" : "Draft plan" }) })] }), _jsxs("div", { children: [_jsx("span", { children: "Context" }), _jsx("b", { children: active
                                    ? `Confirmed · v${d.version}`
                                    : `Example · Organization ${d.scenario}` })] }), _jsxs("div", { children: [_jsx("span", { children: "Risk" }), _jsx("b", { className: tasks.some((t) => t.risk) ? "p1-risk-text" : "", children: tasks.some((t) => t.risk)
                                    ? "Needs a responsibility decision"
                                    : "No owner gaps in this preview" })] })] }), _jsxs("section", { className: "p1-next", children: [_jsx("span", { className: "p1-icon-tile", children: _jsx(Icon, { name: "arrow" }) }), _jsxs("div", { children: [_jsx("span", { className: "p1-overline", children: "NEXT ACTION" }), _jsx("h3", { children: approved
                                    ? "Share the approved task chain with your board"
                                    : "Review responsibilities before you start" }), _jsx("p", { children: isMember
                                    ? `Company outreach belongs to ${owner(d, "relationships", "companies") ?? "a role you confirm"}. The member playbook supplies the starting steps.`
                                    : "Four focused steps. Staffing and evidence follow your organization’s responsibility map." })] })] }), _jsxs("div", { className: "p1-work-columns", children: [_jsxs("section", { className: "p1-task-section", children: [_jsxs("div", { className: "p1-section-head", children: [_jsxs("h2", { children: ["The plan ", _jsx("span", { className: "p1-count", children: tasks.length })] }), _jsxs("div", { className: "p1-segment", role: "group", "aria-label": "Task view", children: [_jsx("button", { "aria-pressed": view === "list", onClick: () => setView("list"), children: "List" }), _jsx("button", { "aria-pressed": view === "board", onClick: () => setView("board"), children: "Board" })] })] }), _jsxs("p", { className: "p1-caption p1-plan-source", children: [isMember
                                        ? "Standard member playbook · adapted to your responsibility map"
                                        : "Short executive task chain · fictional school notice", _jsx("br", {}), "Dates calculated by the existing rule engine."] }), view === "list" ? (_jsx("div", { className: "p1-task-list", children: visible.map((t, i) => (_jsxs("button", { className: "p1-task-row", onClick: () => setSelected(selected === t.id ? null : t.id), "aria-expanded": selected === t.id, children: [_jsx("span", { className: "p1-task-number", children: String(i + 1).padStart(2, "0") }), _jsxs("span", { className: "p1-task-title", children: [_jsx("b", { children: t.title }), _jsxs("span", { children: [t.owner ?? "Needs owner", t.risk ? " · " + t.risk : ""] })] }), _jsx("span", { className: `p1-task-status ${status[t.id] === "Done" ? "p1-done" : ""}`, children: status[t.id] ?? t.status }), _jsx("span", { className: "p1-task-date", children: shortDate(t.date) }), _jsx(Icon, { name: "arrow", size: 16 })] }, t.id))) })) : (_jsx("div", { className: "p1-board", children: ["To do", "Working on it", "Waiting", "Done"].map((s) => (_jsxs("section", { children: [_jsxs("h3", { children: [s, _jsx("span", { children: tasks.filter((t) => (status[t.id] ?? t.status) === s)
                                                        .length })] }), tasks
                                            .filter((t) => (status[t.id] ?? t.status) === s)
                                            .map((t) => (_jsxs("button", { onClick: () => setSelected(t.id), children: [_jsx("b", { children: t.title }), _jsx("span", { children: t.owner ?? "Needs owner" }), _jsx("small", { children: shortDate(t.date) })] }, t.id)))] }, s))) })), view === "list" && tasks.length > 5 && (_jsx("button", { className: "p1-plain p1-more", onClick: () => setShowAll(!showAll), children: showAll ? "Show fewer steps" : `Show all ${tasks.length} steps` })), current && (_jsxs("section", { className: "p1-task-detail", "aria-label": "Task details", children: [_jsxs("div", { className: "p1-section-head", children: [_jsx("h3", { children: current.title }), _jsx("button", { className: "p1-plain", onClick: () => setSelected(null), children: "Close" })] }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Owner" }), _jsx("dd", { children: current.owner ?? "Needs confirmation" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Approver" }), _jsx("dd", { children: current.approver ?? "Not assigned" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Support" }), _jsx("dd", { children: current.support.join(", ") || "Not assigned" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Club deadline" }), _jsxs("dd", { children: [shortDate(current.date), " \u00B7 Rule engine"] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Why this date" }), _jsx("dd", { children: current.dateReason })] })] }), _jsxs("label", { className: "p1-field", children: ["Task status", _jsx("select", { value: status[current.id] ?? current.status, onChange: (e) => setStatus({ ...status, [current.id]: e.target.value }), children: ["To do", "Working on it", "Waiting", "Done"].map((s) => (_jsx("option", { children: s }, s))) })] }), _jsx("p", { className: "p1-caption", children: "Status changes stay in this preview until you leave." })] })), _jsxs("div", { className: "p1-content-block", children: [_jsx("h2", { children: "Materials & evidence" }), _jsxs("details", { children: [_jsxs("summary", { children: [_jsx(Icon, { name: "file" }), " ", isMember
                                                        ? "Founder briefing · fictional outline"
                                                        : "School briefing · fictional notice"] }), _jsx("p", { children: isMember
                                                    ? "Purpose: connect 30 students with founders. Format: introductions, small-group discussions, then reflection. No contact details are stored."
                                                    : "Fictional requirement: nominate two representatives and save an attendance note. President-provided due date: November 4, 2026." })] }), _jsxs("details", { children: [_jsxs("summary", { children: [_jsx(Icon, { name: "check" }), "Completion evidence \u00B7 not submitted"] }), _jsx("p", { children: "A reviewed completion note will belong to this activity. No participant names or attendance lists are collected in this preview." })] })] }), _jsxs("div", { className: "p1-content-block", children: [_jsx("h2", { children: "Handoff note" }), _jsx("p", { children: approved
                                            ? "Approved preview decision: use the confirmed responsibility map. No unconfirmed AI suggestions or private conversations are included."
                                            : "No approved activity decisions yet. Confirmed lessons and evidence will appear here after review." })] })] }), _jsxs("aside", { className: "p1-work-side", children: [_jsxs("section", { children: [_jsx("span", { className: "p1-overline", children: "FUNDING NEED" }), _jsx("h3", { children: isMember ? "$120 estimated" : "No funding requested" }), _jsx("p", { children: isMember
                                            ? "Fictional organization dues · materials only"
                                            : "Attendance coordination only" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Approval" }), _jsx("dd", { children: isMember ? "President review required" : "Not required" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Application" }), _jsx("dd", { children: isMember ? "Not started" : "Not applicable" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Evidence" }), _jsx("dd", { children: isMember ? "Quote not attached" : "Not applicable" })] })] })] }), _jsxs("section", { children: [_jsx("span", { className: "p1-overline", children: "WORKING WITH YOUR CONTEXT" }), _jsx("h3", { children: "Right work. Right role." }), _jsx("p", { children: "Campus organizations" }), _jsx("b", { children: owner(d, "relationships", "campus") ?? "Needs confirmation" }), _jsx("p", { children: "Companies & sponsors" }), _jsx("b", { children: override ??
                                            owner(d, "relationships", "companies") ??
                                            "Needs confirmation" }), _jsxs(Link, { to: "/phase1/setup", className: "p1-text-link", children: ["Review organization", _jsx(Icon, { name: "arrow", size: 16 })] })] })] })] }), review && (_jsxs("section", { className: "p1-review-plan", "aria-label": "Review plan", children: [_jsxs("div", { className: "p1-section-head", children: [_jsx("h2", { children: "Review this plan" }), _jsx("button", { className: "p1-plain", onClick: () => setReview(false), children: "Close" })] }), _jsxs("p", { children: [tasks.length, " tasks belong to this activity. Owners follow the", " ", active ? "confirmed" : "example", " context. All deadlines come from the rule engine."] }), _jsx("p", { className: "p1-caption", children: "This approves the local preview only. It does not create records in the legacy workspace." }), _jsxs("div", { className: "p1-actions", children: [_jsx("button", { className: "p1-primary", disabled: tasks.some((t) => !t.owner), onClick: () => {
                                    setApproved(true);
                                    setReview(false);
                                }, children: "Approve preview" }), _jsx("button", { onClick: () => setReview(false), children: "Reject plan" }), _jsx(Link, { to: "/phase1/setup", children: "Edit responsibilities" })] })] })), _jsxs("div", { className: "p1-work-composer", children: [_jsx(Composer, { compact: true, placeholder: "Ask Platypus about this activity\u2026", onSubmit: (text) => {
                            if (/company|sponsor|external/i.test(text) && missing) {
                                setClarify(true);
                                setReply(missing);
                            }
                            else
                                setReply(isMember
                                    ? `This preview starts with the standard member playbook. Company outreach: ${owner(d, "relationships", "companies") ?? "needs your confirmation"}. To change responsibilities, review organization setup.`
                                    : `The short chain is: review notice → confirm representatives → share brief → record evidence. Staffing owner: ${owner(d, "staffing") ?? "needs your confirmation"}.`);
                        } }), reply && (_jsxs("div", { className: "p1-reply", role: "status", children: [_jsx(Icon, { name: "spark" }), _jsxs("div", { children: [_jsx("p", { children: reply }), clarify && (_jsxs("div", { className: "p1-choices", children: [d.roles.slice(0, 3).map((r) => (_jsx("button", { onClick: () => {
                                                    setOverride(r.title);
                                                    setClarify(false);
                                                    setReply(`Suggested owner: ${r.title}. Review organization setup to confirm this change.`);
                                                }, children: r.title }, r.id))), _jsx("button", { onClick: () => {
                                                    setClarify(false);
                                                    setReply("No owner assigned. Confirm a responsibility in organization setup.");
                                                }, children: "Not sure \u2014 use the suggested option" }), _jsx(Link, { to: "/phase1/setup", children: "Add another option" })] }))] })] }))] })] }));
}
