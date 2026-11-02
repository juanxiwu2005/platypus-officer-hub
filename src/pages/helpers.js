export const SEVERITY_TONE = { error: "late", warn: "warn", info: "" };
export const SEVERITY_RANK = { error: 0, warn: 1, info: 2 };
/** The most serious issue on a node, if any (ignores info). */
export function worstIssue(issues) {
    const real = (issues ?? []).filter(i => i.severity !== "info");
    if (!real.length)
        return null;
    return real.reduce((a, b) => (SEVERITY_RANK[b.severity] < SEVERITY_RANK[a.severity] ? b : a));
}
export const firstName = (s, id) => s.people.find(p => p.id === id)?.name.split(" ")[0] ?? "No owner";
export const roleName = (s, roleId) => s.roles.find(r => r.id === roleId)?.displayName ?? "—";
