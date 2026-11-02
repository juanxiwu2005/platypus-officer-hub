import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { PageHead } from "../components/Page";
import { useRail } from "../components/rail/RailContext";
import { Empty, Hover } from "../components/ui";
import { POLICY_CATALOG } from "../data/policyCatalog";
const ICON = {
    governance: _jsx("path", { d: "M4 20V9l8-5 8 5v11M9 20v-6h6v6" }),
    venue: _jsx("path", { d: "M4 20V9l8-5 8 5v11M9 20v-6h6v6" }),
    food: _jsx("path", { d: "M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M16 3c-2 0-3 3-3 6s1 4 3 4v8" }),
    funding: _jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "6", width: "18", height: "12", rx: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "2.5" })] }),
    marketing: _jsx("path", { d: "M4 10v4h3l6 4V6L7 10zM16 9a4 4 0 010 6" }),
    safety: _jsx("path", { d: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" }),
    accessibility: _jsx("path", { d: "M12 3a2 2 0 110 4 2 2 0 010-4zM5 10h14M12 7v13M8 20l4-6 4 6" }),
    college: _jsx("path", { d: "M3 8l9-5 9 5-9 5-9-5zM6 10v5c3 2 9 2 12 0v-5M21 8v6" }),
    history: _jsxs(_Fragment, { children: [_jsx("path", { d: "M4 5v6h6M4.5 11A8 8 0 1012 4" }), _jsx("path", { d: "M12 8v5l3 2" })] }),
};
const CATEGORIES = [
    { id: "all", label: "All" },
    { id: "governance", label: "Governance" },
    { id: "venue", label: "Venue" },
    { id: "food", label: "Food" },
    { id: "funding", label: "Funding" },
    { id: "marketing", label: "Marketing" },
    { id: "safety", label: "Safety" },
    { id: "accessibility", label: "Access" },
    { id: "college", label: "College" },
    { id: "history", label: "History" },
];
const ExternalIcon = () => _jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }) });
const ChatIcon = () => _jsx("svg", { viewBox: "0 0 20 20", "aria-hidden": "true", children: _jsx("path", { d: "M4 4.5h12v8H9l-4 3v-3H4z", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round" }) });
/** True on a screen wider than a phone (the app's phone breakpoint is 860px). */
function useWideScreen() {
    const query = "(min-width: 861px)";
    const [wide, setWide] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
    useEffect(() => {
        const mq = window.matchMedia?.(query);
        if (!mq)
            return;
        const on = () => setWide(mq.matches);
        mq.addEventListener("change", on);
        return () => mq.removeEventListener("change", on);
    }, []);
    return wide;
}
/** Human browsing for the policy-source catalog. Detailed text stays server-side for policy search. */
export default function Rules() {
    const [tab, setTab] = useState("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const rail = useRail();
    // A computer screen lists every source at once (there are only 64); a phone browses six at a time.
    const wide = useWideScreen();
    const matches = POLICY_CATALOG.filter(source => (tab === "all" || source.category === tab) && `${source.officialName} ${source.whatItCovers} ${source.recordId}`.toLowerCase().includes(query.trim().toLowerCase()));
    const pageSize = 6;
    const sources = wide ? matches : matches.slice(page * pageSize, (page + 1) * pageSize);
    return _jsxs(_Fragment, { children: [_jsx(PageHead, { path: "/rules", actions: _jsx("div", { className: "seg", role: "group", "aria-label": "Policy category", children: CATEGORIES.map(category => _jsx("button", { type: "button", "aria-pressed": tab === category.id, onClick: () => { setTab(category.id); setPage(0); }, children: category.label }, category.id)) }) }), _jsxs("section", { className: "card", children: [_jsxs("div", { className: "toolbar", children: [_jsxs("label", { className: "field-inline", children: ["Search sources", _jsx("input", { type: "search", value: query, onChange: e => { setQuery(e.target.value); setPage(0); } })] }), wide
                                ? _jsx("span", { className: "small muted", role: "status", children: matches.length === 1 ? "1 source" : `${matches.length} sources` })
                                : _jsxs("nav", { className: "action-row", "aria-label": "Source pages", children: [_jsx("button", { type: "button", className: "btn small", disabled: page === 0, onClick: () => setPage(p => p - 1), children: "Previous" }), _jsx("span", { className: "small muted", role: "status", children: matches.length ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, matches.length)} of ${matches.length}` : "0 sources" }), _jsx("button", { type: "button", className: "btn small", disabled: (page + 1) * pageSize >= matches.length, onClick: () => setPage(p => p + 1), children: "Next" })] })] }), sources.length ? _jsx("ul", { className: "rule-list", "data-testid": `policy-sources-${tab}`, children: sources.map(source => _jsxs("li", { className: "rule-row", "data-policy-id": source.recordId, "data-source-file": source.sourceFileCode, children: [_jsx("svg", { className: "rule-icon", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", children: ICON[source.category] }), _jsx(Hover, { className: "rule-text", card: _jsx("span", { children: source.whatItCovers }), children: _jsx("span", { tabIndex: 0, children: source.officialName }) }), _jsxs("span", { className: "rule-actions", children: [source.sourceUrl
                                            ? _jsx("a", { className: "btn small icon-btn", href: source.sourceUrl, target: "_blank", rel: "noreferrer", "aria-label": `Open source: ${source.officialName}`, title: source.officialName, children: _jsx(ExternalIcon, {}) })
                                            : _jsx("span", { className: "btn small icon-btn muted", role: "img", "aria-label": `No single official URL for ${source.officialName}`, title: source.sourceUrlNote ?? "No single official URL", children: _jsx(ExternalIcon, {}) }), _jsx("button", { type: "button", className: "btn small icon-btn", "aria-label": `Ask Platypus about ${source.officialName} · ${source.recordId}`, title: "Ask Platypus", onClick: () => rail.ask(`What does ${source.officialName} cover, and how could it apply to our event?`, true), children: _jsx(ChatIcon, {}) })] })] }, source.recordId)) }) : _jsxs(Empty, { children: ["No matching source.", (query.trim() !== "" || tab !== "all") && _jsxs(_Fragment, { children: [" ", _jsx("button", { type: "button", className: "link", onClick: () => { setQuery(""); setTab("all"); setPage(0); }, children: "Clear filters" })] })] })] })] });
}
