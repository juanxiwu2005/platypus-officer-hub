export function orgChart(roles) {
    const ids = new Set(roles.map(r => r.id));
    const bossOf = (r) => r.reportsToId && r.reportsToId !== r.id && ids.has(r.reportsToId) ? r.reportsToId : null;
    const kids = new Map();
    for (const r of roles) {
        const b = bossOf(r);
        if (b)
            kids.set(b, [...(kids.get(b) ?? []), r]);
    }
    const placed = new Map();
    const edges = [];
    let next = 0;
    const place = (r, level, path) => {
        const mine = (kids.get(r.id) ?? []).filter(k => !path.has(k.id) && !placed.has(k.id));
        const below = mine.map(k => { edges.push({ from: r.id, to: k.id }); return place(k, level + 1, new Set([...path, r.id])); });
        const col = below.length ? (below[0].col + below[below.length - 1].col) / 2 : next++;
        const node = { id: r.id, title: r.displayName, level, col, advisor: r.fn === "advisor", vacant: !r.holderId };
        placed.set(r.id, node);
        return node;
    };
    const roots = [...roles.filter(r => !bossOf(r) && r.fn !== "advisor"), ...roles.filter(r => !bossOf(r) && r.fn === "advisor")];
    for (const r of roots)
        if (!placed.has(r.id))
            place(r, 0, new Set());
    // Anything left is part of a loop in the links; show it at the top so nothing disappears.
    for (const r of roles)
        if (!placed.has(r.id))
            place(r, 0, new Set());
    const nodes = roles.map(r => placed.get(r.id)).filter(Boolean);
    // The advisor advises the president: a dashed line beside the chain, not a reporting line.
    const president = roles.find(r => r.fn === "president");
    if (president)
        for (const a of roles.filter(r => r.fn === "advisor" && !bossOf(r)))
            edges.push({ from: president.id, to: a.id, kind: "advisory" });
    return { nodes, edges, levels: Math.max(0, ...nodes.map(n => n.level)) + 1, columns: Math.max(1, next) };
}
