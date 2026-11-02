import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Info } from "../ui";
const verb = { add: "Added", update: "Changed", remove: "Removed" };
/** What the club's notes and files changed in the standard workflow, one line each, with where it came from and a way back. */
export function WorkflowChanges({ applied, refused, conflicts, summary, steps, roles, onRevert }) {
    const name = (c) => steps.find(s => s.key === c.key)?.title ?? c.title;
    const role = (id) => roles.find(r => r.id === id)?.displayName;
    const detail = (c) => {
        const p = c.patch, bits = [];
        if (c.op === "add") {
            const after = (p.dependsOn ?? []).map(k => steps.find(s => s.key === k)?.title).filter(Boolean);
            if (after.length)
                bits.push(`after ${after.join(", ")}`);
        }
        if (p.estDays !== undefined)
            bits.push(`${p.estDays} day${p.estDays === 1 ? "" : "s"}`);
        if (p.phase)
            bits.push(`in ${p.phase}`);
        if (c.op === "update" && p.dependsOn)
            bits.push("new order");
        if (p.ownerRoleId)
            bits.push(`by ${role(p.ownerRoleId)}`);
        if (p.daysBefore !== undefined && p.daysBefore !== null)
            bits.push(`${p.daysBefore} days before the event`);
        return bits.join(" · ");
    };
    if (!applied.length && !refused.length && !conflicts.length)
        return null;
    return _jsxs("section", { className: "wf-changes", "data-testid": "workflow-changes", "aria-label": "Changes from the standard workflow", children: [_jsxs("h3", { className: "org-h", children: ["From your planning notes and files ", summary && _jsx(Info, { children: summary })] }), _jsxs("ul", { className: "wf-list", children: [applied.map(c => _jsxs("li", { "data-testid": "wf-applied", children: [_jsx("span", { className: "tag-chip step-chip", children: verb[c.op] }), " ", _jsx("b", { children: name(c) }), detail(c) && _jsxs("span", { className: "small muted", children: [" \u00B7 ", detail(c)] }), c.evidence && _jsxs("span", { className: "small muted wf-evidence", children: [" \u201C", c.evidence, "\u201D"] }), " ", _jsx("button", { type: "button", className: "btn small", "aria-label": `Undo: ${verb[c.op]} ${name(c)}`, onClick: () => onRevert(c), children: "Undo" })] }, c.id)), refused.map(r => _jsxs("li", { className: "wf-refused", "data-testid": "wf-refused", children: [_jsx("span", { className: "tag-chip", children: "Not applied" }), " ", _jsx("b", { children: r.change.title }), " ", _jsxs("span", { className: "small", children: ["\u00B7 ", r.reason] })] }, r.change.id)), conflicts.map((c, i) => _jsxs("li", { className: "wf-conflict", "data-testid": "wf-conflict", children: [_jsx("span", { className: "tag-chip", children: "AI noticed" }), " ", _jsxs("span", { className: "small", children: [c.text, c.rules.length ? ` (${c.rules.join(", ")})` : ""] })] }, `c${i}`))] })] });
}
/** The engine's check of the workflow against ASU rules. Red ones must be fixed before setup continues. */
export function WorkflowIssues({ issues }) {
    if (!issues.length)
        return _jsx("p", { className: "small muted", "data-testid": "workflow-ok", children: "No conflict with ASU rules found." });
    return _jsx("section", { className: "wf-issues", "data-testid": "workflow-issues", "aria-label": "Checks against ASU rules", children: _jsx("ul", { className: "wf-list", children: issues.map((i, n) => _jsxs("li", { className: i.level === "blocked" ? "wf-blocked" : "wf-warning", "data-testid": `wf-${i.level}`, children: [_jsx("span", { className: "tag-chip", children: i.level === "blocked" ? "Fix this" : "Check this" }), " ", _jsxs("span", { className: "small", children: [i.text, i.rules?.length ? ` (${i.rules.join(", ")})` : ""] })] }, n)) }) });
}
