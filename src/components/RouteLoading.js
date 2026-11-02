import { jsx as _jsx } from "react/jsx-runtime";
/** A persistent content area while route code loads, also announced to screen readers. */
export function RouteLoading({ label = "Loading…", fullPage = false }) {
    const content = _jsx("p", { role: "status", "aria-live": "polite", "aria-atomic": "true", children: label });
    return fullPage
        ? _jsx("main", { className: "route-loading route-loading-page", "aria-label": "Loading workspace", children: content })
        : _jsx("section", { className: "route-loading", "aria-label": "Loading content", children: content });
}
