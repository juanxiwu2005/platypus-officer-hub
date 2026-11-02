import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Icons } from "../icons";
import { PAGES } from "../../routes";
import { useStore } from "../../data/store";
import { prefersReducedMotion } from "../../lib/motion";
export function SideNav() {
    const { state } = useStore();
    const openTaskCount = state.nodes.filter(n => n.status !== "done" && (n.ownerId === state.viewerId || (n.status === "unclaimed" && !n.ownerId))).length;
    // The number gives a small pop each time it changes (not when the page first draws), DX-25.
    const lastCount = useRef(openTaskCount);
    const [pops, setPops] = useState(0);
    useLayoutEffect(() => {
        if (lastCount.current === openTaskCount)
            return;
        lastCount.current = openTaskCount;
        if (!prefersReducedMotion())
            setPops(n => n + 1);
    }, [openTaskCount]);
    return (_jsxs("nav", { className: "sidenav", "aria-label": "Sections", children: [PAGES.filter(p => p.group === "main").map(p => (_jsxs(NavLink, { to: p.path, end: p.path === "/", title: p.question, children: [Icons[p.icon], _jsx("span", { children: p.label }), p.path === "/tasks" && openTaskCount > 0 && _jsxs("span", { className: `count${pops ? " is-pop" : ""}`, "data-testid": "nav-open-tasks", children: [openTaskCount, _jsx("span", { className: "sr-only", children: " open tasks" })] }, pops)] }, p.path))), _jsx("div", { className: "group", children: "Reference" }), PAGES.filter(p => p.group === "footer").map(p => (_jsxs(NavLink, { to: p.path, title: p.question, children: [Icons[p.icon], _jsx("span", { children: p.label })] }, p.path)))] }));
}
