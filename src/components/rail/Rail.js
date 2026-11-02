import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../data/store";
import { useRail } from "./RailContext";
import { AskPanel } from "./AskPanel";
import { NudgeComposer } from "../NudgeComposer";
import { TaskDetail } from "../TaskDetail";
import { useViewer } from "../../data/store";
import { Empty } from "../ui";
import { RouteLoading } from "../RouteLoading";
import { trapTabKey } from "../../lib/focus";
// Ask, task details and reminders stay eager for Today. Auxiliary editors load when opened.
const FundingDetail = lazy(() => import("../../pages/Funding").then(module => ({ default: module.FundingDetail })));
const PartnerDetail = lazy(() => import("../crm/ContactDetail").then(module => ({ default: module.PartnerDetail })));
const OrgDetail = lazy(() => import("../crm/OrgDetail").then(module => ({ default: module.OrgDetail })));
const HandoffRoleDetail = lazy(() => import("../../pages/Handoff").then(module => ({ default: module.HandoffRoleDetail })));
const BoardSettingsPanel = lazy(() => import("../BoardSettings").then(module => ({ default: module.BoardSettingsPanel })));
const EventDetail = lazy(() => import("../EventDetail").then(module => ({ default: module.EventDetail })));
/** Right rail: Ask (the only AI box) and Details (whatever was clicked). */
/**
 * `closing` is true from the moment the panel starts to leave until it is removed: the page underneath is usable again at once.
 * `shown` is false while the panel is arriving (its first painted frame) and while it leaves; the CSS slides between the two.
 */
export function Rail({ closing = false, shown = true }) {
    const rail = useRail();
    const { tab, setTab, detail } = rail;
    const aside = useRef(null);
    // Below 1200px the rail floats over the page (full screen on a phone). Then focus must move into it, stay out of the
    // page underneath (full screen only), come back to the button that opened it, and Escape must close it.
    useEffect(() => {
        const overlay = window.matchMedia?.("(max-width: 1199px)").matches;
        if (!overlay || closing)
            return;
        const a = document.activeElement;
        const opener = a instanceof HTMLElement && a !== document.body && !aside.current?.contains(a) ? a : null;
        if (!aside.current?.contains(document.activeElement))
            aside.current?.focus();
        // Phone (full screen): the whole page, top bar included, is covered. Tablet (861–1199px): the page is covered on the
        // right, so it is switched off too, and a click or tap on it closes the panel instead of doing nothing (Juanxi 2026-10-29).
        const phone = window.matchMedia("(max-width: 860px)").matches;
        const covered = [...document.querySelectorAll(phone ? "header.topbar, nav.sidenav, #main" : "nav.sidenav, #main")];
        covered.forEach(el => el.setAttribute("inert", ""));
        const outside = (e) => {
            const t = e.target;
            if (phone || !t || aside.current?.contains(t) || t.closest("header.topbar, .ask-fab"))
                return;
            rail.setOpen(false);
        };
        document.addEventListener("pointerdown", outside);
        return () => {
            document.removeEventListener("pointerdown", outside);
            covered.forEach(el => el.removeAttribute("inert"));
            // The round Ask button is removed while the panel is open, so after closing, look for whichever opener is on screen.
            setTimeout(() => {
                const shown = [...document.querySelectorAll(".ask-fab, [data-testid=ask-toggle]")].find(el => el.getClientRects().length);
                // Only fall back when nothing else (for example the details' own focus return) has already taken focus.
                const free = !document.activeElement || document.activeElement === document.body;
                if (opener?.isConnected && free)
                    opener.focus();
                else if (free)
                    shown?.focus();
            }, 0);
        };
    }, [closing]);
    const hasDetail = !!detail;
    useEffect(() => {
        if (!window.matchMedia?.("(max-width: 1199px)").matches || closing)
            return;
        const onKey = (e) => {
            if (e.defaultPrevented)
                return;
            if (aside.current)
                trapTabKey(e, aside.current);
            if (e.key === "Escape" && !hasDetail)
                rail.setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [hasDetail, rail, closing]);
    return _jsxs("aside", { className: "rail", "aria-label": "Assistant and details", "data-testid": "rail", "data-state": shown && !closing ? "open" : "closed", ref: aside, tabIndex: -1, children: [_jsxs("div", { className: "rail-tabs", children: [_jsxs("div", { role: "tablist", "aria-label": "Side panel", className: "tab-group", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === "ask", onClick: () => setTab("ask"), "data-testid": "tab-ask", children: "Ask" }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === "details", disabled: !detail, onClick: () => setTab("details"), "data-testid": "tab-details", children: "Details" })] }), _jsx("span", { className: "spacer" }), _jsx("button", { type: "button", className: "btn btn-quiet icon-btn", "aria-label": "Hide side panel", title: "Hide side panel", onClick: () => rail.setOpen(false), children: _jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "M7 4l6 6-6 6", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] }), _jsx("div", { className: "rail-body", hidden: tab !== "ask", children: _jsx(AskPanel, {}) }), detail && _jsx("div", { className: "rail-body", hidden: tab !== "details", children: _jsx(DetailView, {}) })] });
}
function DetailView() {
    const rail = useRail();
    const { state } = useStore();
    const { person } = useViewer();
    const navigate = useNavigate();
    const location = useLocation();
    const d = rail.detail;
    const box = useRef(null);
    // Every kind of detail takes focus when it opens or changes (unless it already put focus inside itself).
    const key = d.kind === "node" || d.kind === "task" || d.kind === "nudge" || d.kind === "partner" || d.kind === "handoff" ? `${d.kind}:${"id" in d ? d.id : d.roleId}` : d.kind === "funding" || d.kind === "event" ? `${d.kind}:${d.eventId}` : d.kind;
    useEffect(() => {
        box.current?.scrollTo?.({ top: 0 });
        if (box.current && !box.current.contains(document.activeElement))
            box.current.focus();
    }, [key]);
    const close = () => {
        if (d.kind === "task" && location.pathname === "/tasks" && location.search.includes("node="))
            navigate("/tasks", { replace: true });
        rail.closeDetail();
    };
    useEffect(() => {
        if (d.kind === "nudge")
            return; // NudgeComposer handles Escape itself
        const onKey = (e) => { if (e.key === "Escape" && !e.defaultPrevented)
            close(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });
    // Reset discards the open editor too, including unsaved local form state.
    useEffect(() => {
        const reset = () => rail.closeDetail();
        window.addEventListener("platypus:reset", reset);
        return () => window.removeEventListener("platypus:reset", reset);
    }, [rail.closeDetail]);
    const region = { role: "region", "aria-label": "Details", tabIndex: -1 };
    const closer = _jsxs("div", { className: "detail-bar", children: [_jsx("span", { className: "spacer" }), _jsx("button", { type: "button", className: "btn btn-quiet icon-btn", "aria-label": "Close details", onClick: close, children: "\u2715" })] });
    let body = null;
    switch (d.kind) {
        case "node": {
            const node = state.nodes.find(n => n.id === d.id);
            body = node ? _jsx(TaskDetail, { node: node, actorId: person.id }, `${node.id}:${state.viewerId}`) : _jsx(Empty, { children: "This task no longer exists." });
            break;
        }
        case "workflow":
            body = rail.workflowDetail ?? _jsx(Empty, { children: "Select a workflow step." });
            break;
        case "nudge": return _jsx("div", { ref: box, className: "detail-scroll", ...region, children: _jsx(NudgeComposer, { nodeId: d.id, onClose: close }, d.id) });
        case "task": {
            const node = state.nodes.find(n => n.id === d.id);
            body = node ? _jsx(TaskDetail, { node: node, actorId: person.id, initialReply: d.reply }, `${node.id}:${state.viewerId}`) : _jsx(Empty, { children: "This task no longer exists." });
            break;
        }
        case "funding":
            body = _jsx(FundingDetail, { eventId: d.eventId });
            break;
        case "event":
            body = _jsx(EventDetail, { eventId: d.eventId });
            break;
        case "partner":
            body = _jsx(PartnerDetail, { id: d.id });
            break;
        case "org":
            body = _jsx(OrgDetail, { id: d.id });
            break;
        case "handoff":
            body = _jsx(HandoffRoleDetail, { roleId: d.roleId });
            break;
        case "board":
            body = _jsx(BoardSettingsPanel, {});
            break;
    }
    return _jsxs("div", { ref: box, className: "detail-scroll", ...region, children: [closer, _jsx(Suspense, { fallback: _jsx(RouteLoading, { label: "Loading details\u2026" }), children: body })] });
}
